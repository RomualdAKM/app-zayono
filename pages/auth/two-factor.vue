<template>
  <div>
    <div class="auth-top">
      <h2 class="auth-title">{{ $t('auth.twoFactor.title') }}</h2>
      <LayoutLanguageSwitcher compact />
    </div>

    <p class="auth-intro">
      <template v-if="welcomeName">
        {{ $t('auth.twoFactor.welcomeNamed', { name: welcomeName }) }}
      </template>
      <template v-else>
        {{ $t('auth.twoFactor.welcomeGeneric') }}
      </template>
    </p>

    <form @submit.prevent="handleChallenge" class="auth-form">
      <div class="form-field">
        <label for="code">
          {{ usingRecovery ? $t('auth.twoFactor.recoveryLabel') : $t('auth.twoFactor.codeLabel') }}
        </label>
        <!-- R2 BLOCKING B1: dynamic inputmode/autocomplete. Recovery
             codes contain letters — a hardcoded `inputmode="numeric"`
             made them unenterable on mobile. -->
        <InputText
          id="code"
          ref="codeInput"
          v-model="code"
          :placeholder="usingRecovery ? 'xxxxxxxxxx' : '000000'"
          :maxlength="usingRecovery ? 10 : 6"
          :autocomplete="usingRecovery ? 'off' : 'one-time-code'"
          :inputmode="usingRecovery ? 'text' : 'numeric'"
          class="w-full code-input"
          :class="{ 'p-invalid': fieldErrors.code, 'code-input--recovery': usingRecovery }"
          autofocus
        />
        <!-- R2 UX BLOCKING 2: `role="alert"` so screen readers announce
             rejection. Without this, the user re-types into the same
             field with no signal anything failed. -->
        <small v-if="fieldErrors.code" class="field-error" role="alert">{{ fieldErrors.code }}</small>
      </div>

      <div v-if="globalError" class="form-error" role="alert">{{ globalError }}</div>

      <Button
        type="submit"
        :label="$t('auth.twoFactor.submitButton')"
        :loading="loading"
        :disabled="!isCodeReady"
        class="w-full"
      />
    </form>

    <div class="auth-meta">
      <button type="button" class="link-btn" @click="toggleRecovery">
        {{ usingRecovery ? $t('auth.twoFactor.useTotp') : $t('auth.twoFactor.useRecovery') }}
      </button>
      <NuxtLink to="/auth/login" class="link-btn">{{ $t('auth.twoFactor.backToLogin') }}</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const store = useAuthStore()
const loading = computed(() => store.loading)

const code = ref('')
const usingRecovery = ref(false)
const globalError = ref('')
const fieldErrors = reactive<Record<string, string>>({})
const welcomeName = ref('')
// `codeInput` is the PrimeVue InputText component. We focus its underlying
// <input> after toggling recovery mode and after a failed challenge so
// keyboard + AT users land back on the field without manual tabbing.
const codeInput = ref<any>(null)

onMounted(() => {
  // The challenge token is set by the auth store after a 2FA-protected
  // /auth/login. If the user lands here directly without one, bounce
  // them back so they don't see a half-broken form.
  if (typeof window === 'undefined') return
  const token = sessionStorage.getItem('two_factor_token')
  if (!token) {
    navigateTo('/auth/login')
    return
  }
  // R2 UX #4: defensively trim — the backend should not send leading
  // whitespace but a misconfigured proxy could.
  welcomeName.value = (sessionStorage.getItem('two_factor_name') || '').trim()
})

function focusCode() {
  // PrimeVue InputText exposes the native input via $el or .input — handle
  // both APIs (v3 vs v4 had different shapes).
  const el = codeInput.value?.$el?.querySelector?.('input')
    || codeInput.value?.input
    || document.getElementById('code')
  if (el && typeof el.focus === 'function') el.focus()
}

const isCodeReady = computed(() => {
  const trimmed = code.value.trim()
  return usingRecovery.value ? trimmed.length === 10 : trimmed.length === 6
})

const toggleRecovery = async () => {
  usingRecovery.value = !usingRecovery.value
  code.value = ''
  globalError.value = ''
  Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k])
  // R2 UX HIGH 5: refocus the field after the toggle so keyboard / SR
  // users land back on the input with the new semantics (alphanumeric
  // recovery vs numeric TOTP). nextTick lets the maxlength / inputmode
  // attributes update first.
  await nextTick()
  focusCode()
}

const handleChallenge = async () => {
  globalError.value = ''
  Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k])
  try {
    await store.verifyTwoFactor(code.value.trim())
    // Same post-login routing as the standard login flow.
    const appStore = useApplicationStore()
    if (appStore.list.length === 0) {
      navigateTo('/apps')
    } else if (appStore.currentId) {
      navigateTo('/dashboard')
    } else {
      navigateTo('/apps')
    }
  } catch (e: any) {
    if (e?.data?.errors) {
      const errors = e.data.errors
      Object.keys(errors).forEach((key) => {
        // The backend returns `two_factor_token` errors when the challenge
        // expired or was replayed — surface that as a global error since
        // the field input isn't the actual cause.
        if (key === 'two_factor_token') {
          globalError.value = Array.isArray(errors[key]) ? errors[key][0] : errors[key]
        } else {
          fieldErrors[key] = Array.isArray(errors[key]) ? errors[key][0] : errors[key]
        }
      })
    } else {
      globalError.value = e?.data?.message || e?.message || t('auth.twoFactor.invalidCode')
    }
    // R2 UX BLOCKING 3: clear the input + refocus so the user doesn't
    // need to select-all and retype. Combined with role=alert above,
    // failures now have a clear "what to do next" signal.
    code.value = ''
    await nextTick()
    focusCode()
  }
}
</script>

<style scoped>
.auth-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 12px;
}

.auth-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0;
}

.auth-intro {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0 0 22px;
  line-height: 1.5;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ze-text-label);
}

.code-input :deep(input),
.code-input.p-inputtext {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.25em;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
}

.code-input--recovery :deep(input),
.code-input--recovery.p-inputtext {
  letter-spacing: 0.12em;
  font-size: 15px;
  text-transform: lowercase;
}

.field-error {
  font-size: 12px;
  color: var(--ze-danger-fg);
}

.form-error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: var(--ze-text-body);
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-left: 3px solid var(--ze-danger-fg);
  border-radius: 4px;
  padding: 10px 14px;
  line-height: 1.5;
}

.auth-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  margin-top: 22px;
  gap: 12px;
  /* R2 UX 17: wrap on narrow viewports — the two French link labels
     overflow a 320px screen otherwise. */
  flex-wrap: wrap;
}

.link-btn {
  color: var(--ze-brand);
  background: none;
  border: none;
  cursor: pointer;
  /* R2 UX HIGH 9: WCAG 2.5.5 AA wants ≥24×24px touch targets. Adding
     vertical padding brings the link to ~32px tall without breaking
     the inline-link visual. */
  padding: 6px 2px;
  min-height: 32px;
  font: inherit;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.link-btn:hover {
  text-decoration: underline;
}

.w-full {
  width: 100%;
}
</style>
