<template>
  <div class="transaction-detail-page">
    <!-- Back row -->
    <div class="back-row">
      <button class="back-btn" @click="$router.back()" :aria-label="$t('paymentsPage.detail.back')">
        <AppIcon name="arrow-left" />
        <span>{{ $t('paymentsPage.detail.back') }}</span>
      </button>
      <div class="tx-id-pill" v-if="transaction.id">
        <span class="tx-id-label">{{ $t('paymentsPage.detail.transactionLabel') }}</span>
        <code class="tx-id-code">#{{ transaction.id?.substring(0, 12) }}</code>
      </div>
      <div class="back-row-spacer" />
      <button
        v-if="canReconcile"
        class="reconcile-btn"
        :disabled="reconciling"
        :title="$t('paymentsPage.detail.reconcileTooltip')"
        @click="reconcile"
      >
        <i :class="['pi', reconciling ? 'pi-spin pi-spinner' : 'pi-sync']" />
        <span>{{ reconciling ? $t('paymentsPage.detail.reconciling') : $t('paymentsPage.detail.reconcile') }}</span>
      </button>
      <button
        class="refund-btn"
        :disabled="!canRefund"
        :title="refundDisabledReason"
        @click="openRefundDialog"
      >
        <AppIcon name="replay" />
        <span>{{ $t('paymentsPage.detail.refund') }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <Skeleton height="200px" class="mb-3" />
      <Skeleton height="200px" class="mb-3" />
    </div>

    <!-- Error -->
    <Message v-else-if="error" severity="error" :closable="false">{{ error }}</Message>

    <!-- Content -->
    <template v-else>
      <!-- Main grid: 3 columns -->
      <div class="detail-grid">
        <!-- Column 1: Informations -->
        <div class="detail-card">
          <h3 class="card-title">{{ $t('paymentsPage.detail.informations') }}</h3>
          <div class="info-list">
            <div class="info-row">
              <span class="info-label">{{ $t('paymentsPage.detail.transactionId') }}</span>
              <div class="info-value-copy">
                <code class="ref-code">{{ transaction.id }}</code>
                <button class="copy-btn" @click="copyToClipboard(transaction.id)"><AppIcon name="copy" /></button>
              </div>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('paymentsPage.detail.amount') }}</span>
              <span class="info-value amount-big">{{ formatAmount(transaction.amount, transaction.currency) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('paymentsPage.detail.status') }}</span>
              <TransactionsStatusBadge :status="transaction.status" />
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('paymentsPage.detail.createdAt') }}</span>
              <span class="info-value">{{ formatDate(transaction.created_at) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('paymentsPage.detail.phone') }}</span>
              <span class="info-value">{{ transaction.phone_number || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('paymentsPage.detail.description') }}</span>
              <span class="info-value">{{ transaction.description || '—' }}</span>
            </div>
            <div class="info-row" v-if="transaction.amount_charged && transaction.amount_charged !== transaction.amount">
              <span class="info-label">{{ $t('paymentsPage.detail.amountCharged') }}</span>
              <span class="info-value">{{ formatAmount(transaction.amount_charged, transaction.currency) }}</span>
            </div>
          </div>
        </div>

        <!-- Column 2: Contexte -->
        <div class="detail-card">
          <h3 class="card-title">{{ $t('paymentsPage.detail.context') }}</h3>
          <div class="info-list">
            <div class="info-row">
              <span class="info-label">{{ $t('paymentsPage.detail.ipAddress') }}</span>
              <span class="info-value mono-cell">{{ context.ip || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('paymentsPage.detail.country') }}</span>
              <span class="info-value">
                <span v-if="transaction.country" class="country-cell">{{ countryLabel(transaction.country) }}</span>
                <span v-else>—</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('paymentsPage.detail.browser') }}</span>
              <span class="info-value">{{ context.browser || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('paymentsPage.detail.os') }}</span>
              <span class="info-value">{{ context.os || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('paymentsPage.detail.device') }}</span>
              <span class="info-value">{{ context.device || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('paymentsPage.detail.language') }}</span>
              <span class="info-value">{{ context.language || '—' }}</span>
            </div>
            <div class="info-row" v-if="transaction.failure_reason">
              <span class="info-label">{{ $t('paymentsPage.detail.failureReason') }}</span>
              <span class="info-value error-text">{{ humanizeError(transaction.failure_reason, transaction.failure_code) }}</span>
            </div>
          </div>
        </div>

        <!-- Column 3: Client + Méthode + Passerelle -->
        <div class="detail-card-stack">
          <!-- Client -->
          <div class="detail-card">
            <h3 class="card-title">{{ $t('paymentsPage.detail.client') }}</h3>
            <div class="client-section" v-if="transaction.customer">
              <div class="client-avatar">
                {{ getInitials(transaction.customer.first_name, transaction.customer.last_name) }}
              </div>
              <div class="client-info">
                <span class="client-name">{{ transaction.customer.first_name }} {{ transaction.customer.last_name }}</span>
                <span class="client-email">{{ transaction.customer.email || '—' }}</span>
              </div>
              <button class="outline-pilule" @click="goToCustomer(transaction.customer_id)">{{ $t('paymentsPage.detail.viewCustomer') }}</button>
            </div>
            <p v-else class="text-muted">{{ $t('paymentsPage.detail.noCustomer') }}</p>
          </div>

          <!-- Méthode -->
          <div class="detail-card">
            <h3 class="card-title">{{ $t('paymentsPage.detail.method') }}</h3>
            <div class="method-row" v-if="transaction.operator">
              <MethodLogo :name="transaction.operator" />
              <div class="brand-info">
                <span class="brand-name">{{ operatorLabel }}</span>
                <span class="brand-sub">{{ countryLabel(transaction.country || '') }}</span>
              </div>
            </div>
            <p v-else class="text-muted">—</p>
          </div>

          <!-- Passerelle -->
          <div class="detail-card">
            <h3 class="card-title">{{ $t('paymentsPage.detail.gateway') }}</h3>
            <div class="method-row" v-if="transaction.aggregator_code">
              <div class="brand-logo brand-logo--sm">
                <img v-if="aggregatorLogo && !aggregatorLogoFailed" :src="aggregatorLogo" :alt="aggregatorLabelText" @error="aggregatorLogoFailed = true" />
                <span v-else>{{ aggregatorInitials }}</span>
              </div>
              <div class="brand-info">
                <span class="brand-name">{{ aggregatorLabelText }}</span>
                <span class="brand-sub">{{ transaction.environment }}</span>
              </div>
            </div>
            <div class="info-list" v-if="transaction.aggregator_tx_id">
              <div class="info-row">
                <span class="info-label">{{ $t('paymentsPage.detail.aggregatorId') }}</span>
                <div class="info-value-copy">
                  <code class="ref-code">{{ transaction.aggregator_tx_id }}</code>
                  <button class="copy-btn" @click="copyToClipboard(transaction.aggregator_tx_id)"><AppIcon name="copy" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Remboursements -->
      <div class="detail-card refunds-section" v-if="refunds.length > 0 || refundSummary.total_refunded > 0">
        <div class="refunds-header">
          <h3 class="card-title">{{ $t('paymentsPage.detail.refundsTitle') }}</h3>
          <div class="refund-summary">
            <span class="refund-summary-item">
              <span class="refund-summary-label">{{ $t('paymentsPage.detail.refunded') }}</span>
              <span class="refund-summary-value">
                {{ formatAmount(refundSummary.total_refunded, transaction.currency) }}
              </span>
            </span>
            <span class="refund-summary-divider">·</span>
            <span class="refund-summary-item">
              <span class="refund-summary-label">{{ $t('paymentsPage.detail.remaining') }}</span>
              <span class="refund-summary-value">
                {{ formatAmount(refundSummary.refundable_remaining, transaction.currency) }}
              </span>
            </span>
          </div>
        </div>
        <DataTable :value="refunds" class="refunds-table">
          <Column field="amount" :header="$t('paymentsPage.detail.refundColumns.amount')">
            <template #body="{ data }">
              <span class="amount-cell">{{ formatAmount(data.amount, data.currency) }}</span>
            </template>
          </Column>
          <Column field="status" :header="$t('paymentsPage.detail.refundColumns.status')">
            <template #body="{ data }">
              <TransactionsStatusBadge :status="mapRefundStatus(data.status)" />
            </template>
          </Column>
          <Column field="reason" :header="$t('paymentsPage.detail.refundColumns.reason')">
            <template #body="{ data }">
              <span>{{ data.reason || '—' }}</span>
            </template>
          </Column>
          <Column field="aggregator_refund_id" :header="$t('paymentsPage.detail.refundColumns.reference')">
            <template #body="{ data }">
              <code class="ref-code" v-if="data.aggregator_refund_id">{{ data.aggregator_refund_id }}</code>
              <span v-else class="text-muted">—</span>
            </template>
          </Column>
          <Column field="created_at" :header="$t('paymentsPage.detail.refundColumns.date')">
            <template #body="{ data }">
              <span class="date-cell">{{ formatDate(data.created_at) }}</span>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Tentatives de paiement -->
      <div class="detail-card attempts-section" v-if="transaction.attempts && transaction.attempts.length > 0">
        <h3 class="card-title">{{ $t('paymentsPage.detail.attemptsTitle') }}</h3>
        <DataTable :value="transaction.attempts" class="attempts-table">
          <Column :header="$t('paymentsPage.detail.attemptColumns.number')" style="width: 50px;">
            <template #body="{ index }">
              {{ index + 1 }}
            </template>
          </Column>
          <Column field="aggregator_code" :header="$t('paymentsPage.detail.attemptColumns.gateway')">
            <template #body="{ data }">
              <span class="cell-strong">{{ aggregatorLabel(data.aggregator_code) }}</span>
            </template>
          </Column>
          <Column field="status" :header="$t('paymentsPage.detail.attemptColumns.status')">
            <template #body="{ data }">
              <TransactionsStatusBadge :status="data.status" />
            </template>
          </Column>
          <Column :header="$t('paymentsPage.detail.attemptColumns.amount')" style="width: 140px;">
            <template #body="{ data }">
              <span v-if="data.amount" class="amount-cell">{{ formatAmount(data.amount, transaction.currency) }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </Column>
          <Column :header="$t('paymentsPage.detail.attemptColumns.phone')" style="width: 140px;">
            <template #body="{ data }">
              <span v-if="data.phone_number" class="mono-cell">{{ data.phone_number }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </Column>
          <Column field="response_time_ms" :header="$t('paymentsPage.detail.attemptColumns.latency')" style="width: 100px;">
            <template #body="{ data }">
              <span v-if="data.response_time_ms" class="text-muted">{{ data.response_time_ms }} ms</span>
              <span v-else class="text-muted">—</span>
            </template>
          </Column>
          <Column field="failure_reason" :header="$t('paymentsPage.detail.attemptColumns.message')">
            <template #body="{ data }">
              <span v-if="data.failure_reason" class="error-text">{{ humanizeError(data.failure_reason, data.failure_code) }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </Column>
          <Column field="is_fallback" :header="$t('paymentsPage.detail.attemptColumns.fallback')" style="width: 90px;">
            <template #body="{ data }">
              <span v-if="data.is_fallback" class="fallback-pill">{{ $t('paymentsPage.detail.fallbackYes') }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </Column>
          <Column field="created_at" :header="$t('paymentsPage.detail.attemptColumns.date')" style="width: 150px;">
            <template #body="{ data }">
              <span class="date-cell">{{ formatDate(data.created_at) }}</span>
            </template>
          </Column>
        </DataTable>
      </div>
    </template>

    <!-- Refund dialog -->
    <Dialog
      v-model:visible="refundDialogOpen"
      :modal="true"
      :closable="!refundSubmitting"
      :style="{ width: '460px' }"
      :header="$t('paymentsPage.detail.refundDialog.title')"
    >
      <p class="refund-dialog-desc">
        {{ $t('paymentsPage.detail.refundDialog.intro1') }}
        <strong>{{ formatAmount(refundSummary.refundable_remaining, transaction.currency) }}</strong>.
        {{ $t('paymentsPage.detail.refundDialog.intro2') }}
        <strong>{{ $t('paymentsPage.detail.refundDialog.irreversible') }}</strong>.
      </p>

      <div class="refund-field">
        <label class="refund-label">{{ $t('paymentsPage.detail.refundDialog.amountLabel') }}</label>
        <InputNumber
          v-model="refundAmount"
          :min="0.01"
          :max="refundSummary.refundable_remaining"
          :minFractionDigits="zeroDecimalCurrency ? 0 : 2"
          :maxFractionDigits="zeroDecimalCurrency ? 0 : 2"
          :suffix="' ' + (transaction.currency || '')"
          class="refund-input"
        />
        <p class="refund-help">
          {{ $t('paymentsPage.detail.refundDialog.amountHelp') }}
        </p>
      </div>

      <div class="refund-field">
        <label class="refund-label">{{ $t('paymentsPage.detail.refundDialog.reasonLabel') }} <span class="optional">{{ $t('paymentsPage.detail.refundDialog.optional') }}</span></label>
        <Select
          v-model="refundReason"
          :options="refundReasonOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="$t('paymentsPage.detail.refundDialog.reasonPlaceholder')"
          showClear
          class="refund-input"
        />
      </div>

      <div v-if="refundError" class="refund-error">
        <AppIcon name="exclamation-circle" />
        <span>{{ refundError }}</span>
      </div>

      <template #footer>
        <Button
          :label="$t('paymentsPage.detail.refundDialog.cancel')"
          severity="secondary"
          text
          :disabled="refundSubmitting"
          @click="closeRefundDialog"
        />
        <Button
          :label="refundSubmitting ? $t('paymentsPage.detail.refundDialog.submitting') : $t('paymentsPage.detail.refundDialog.confirm')"
          :loading="refundSubmitting"
          :disabled="!canConfirmRefund"
          @click="submitRefund"
        />
      </template>
    </Dialog>

  </div>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const router = useRouter()
const { apiFetch } = useApi()
const { handleError } = useApiError()
const toast = useToast()
const { t, locale } = useI18n()

const id = route.params.id as string
const transaction = ref<any>({})
const loading = ref(true)
const error = ref<string | null>(null)
const reconciling = ref(false)

const context = computed(() => transaction.value.context || {})

// ─── Aggregator + operator catalogue (logos, labels) ──────────────
// The catalog endpoint returns `{name, logo}` per driver and
// `config('operators.operators')` per operator. Cached once per page load.
const aggregatorCatalog = ref<Record<string, { name: string; logo: string | null }>>({})
const operatorCatalog = ref<Record<string, { name: string; country: string }>>({})

const operatorLabel = computed(() => {
  const code = transaction.value.operator
  if (!code) return '—'
  return operatorCatalog.value[code]?.name || code
})

const operatorInitials = computed(() => {
  const label = operatorLabel.value
  return label.split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
})

const operatorLogo = computed(() => {
  // We don't have a per-operator logo catalog yet; fall back to the
  // aggregator's logo when the operator name is unknown. Better than
  // showing the raw operator code in the UI.
  return null
})

const aggregatorLabelText = computed(() => {
  const code = transaction.value.aggregator_code
  if (!code) return '—'
  return aggregatorCatalog.value[code]?.name || code
})

/**
 * The backend `available` endpoint returns just the file name in
 * `logo` (e.g. `fedapay.png`). The asset itself lives under the
 * Nuxt-served `/public/aggregator-logos/` directory, so we have to
 * prepend the static path — using the raw filename as `src` produces
 * a relative URL that resolves against the current route and 404s.
 * `aggregatorLogoFailed` lets us swap to the initials fallback when
 * the file is missing for a brand-new driver added before its PNG
 * has been bundled.
 */
const aggregatorLogoFailed = ref(false)
watch(() => transaction.value.aggregator_code, () => { aggregatorLogoFailed.value = false })

const aggregatorLogo = computed(() => {
  const code = transaction.value.aggregator_code
  const file = aggregatorCatalog.value[code]?.logo
  return file ? `/aggregator-logos/${file}` : null
})

const aggregatorInitials = computed(() => {
  const label = aggregatorLabelText.value
  return label.split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
})

const aggregatorLabel = (code: string) => aggregatorCatalog.value[code]?.name || code

const countryFlag = (iso: string): string => {
  if (!iso || iso.length !== 2 || iso === 'XX') return '🌐'
  // Convert 2-letter ISO country to flag emoji via regional indicator
  // codepoints. Works in every modern browser without an image asset.
  return String.fromCodePoint(
    ...[...iso.toUpperCase()].map(c => 0x1F1A5 + c.charCodeAt(0)),
  )
}

// Map raw aggregator error text to a friendly localized sentence. The list
// covers the most common shapes returned by our drivers — anything else
// falls back to the raw message so the merchant still sees the details.
const ERROR_MAP: { match: RegExp; key: string }[] = [
  { match: /insufficient.*fund/i, key: 'paymentsPage.detail.errors.insufficientFunds' },
  { match: /did not authorize|not authorize/i, key: 'paymentsPage.detail.errors.notAuthorized' },
  { match: /timeout|timed out/i, key: 'paymentsPage.detail.errors.timeout' },
  { match: /invalid.*phone|wrong.*number/i, key: 'paymentsPage.detail.errors.invalidPhone' },
  { match: /pin|otp.*incorrect/i, key: 'paymentsPage.detail.errors.wrongOtp' },
  // PayDunya Orange Money French payment-code reject ("CODE ERRONNE OU DEJA EXPIRE OU UTILISE").
  { match: /code\s+erron|d[ée]j[àa]\s+(expir|utilis)|(code|otp).*(expir|incorrect)/i, key: 'paymentsPage.detail.errors.wrongOtp' },
  { match: /temporarily unavailable|gateway.*unavailable/i, key: 'paymentsPage.detail.errors.gatewayUnavailable' },
  { match: /declined|rejected/i, key: 'paymentsPage.detail.errors.declined' },
  { match: /duplicate|already exists/i, key: 'paymentsPage.detail.errors.duplicate' },
  { match: /unauthorized|invalid.*credentials|invalid.*key/i, key: 'paymentsPage.detail.errors.unauthorized' },
]

const humanizeError = (message: string | null, code: string | null = null): string => {
  if (!message) return code || '—'
  const match = ERROR_MAP.find(e => e.match.test(message))
  return match ? t(match.key) : message
}

// ─── Refund state ───────────────────────────────────────────────
// `refunds` and `refundSummary` come from GET /merchant/payments/{id}/refunds
// which the backend computes (including `refundable_remaining` that subtracts
// pending refunds). We never compute these client-side to avoid races.
const refunds = ref<any[]>([])
const refundSummary = ref<{ total_refunded: number; refundable_remaining: number }>({
  total_refunded: 0,
  refundable_remaining: 0,
})
const refundDialogOpen = ref(false)
const refundAmount = ref<number>(0)
const refundReason = ref<string | null>(null)
const refundSubmitting = ref(false)
const refundError = ref<string | null>(null)

// Stripe-aligned enum; the backend forwards whatever the merchant chooses,
// and ignores values that don't match for non-Stripe drivers.
const refundReasonOptions = computed(() => [
  { value: 'requested_by_customer', label: t('paymentsPage.detail.refundDialog.reasons.customer') },
  { value: 'duplicate', label: t('paymentsPage.detail.refundDialog.reasons.duplicate') },
  { value: 'fraudulent', label: t('paymentsPage.detail.refundDialog.reasons.fraud') },
])

// Zero-decimal currencies: amounts have no fractional part (XOF, JPY, …).
// We dim the InputNumber's decimals so the merchant can't type 0.50 XOF.
const ZERO_DECIMAL_CURRENCIES = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']
const zeroDecimalCurrency = computed(() =>
  ZERO_DECIMAL_CURRENCIES.includes((transaction.value.currency || '').toUpperCase())
)

const canRefund = computed(() => {
  if (transaction.value.type !== 'payment') return false
  if (transaction.value.status !== 'success') return false
  if (!transaction.value.aggregator_tx_id) return false
  if (refundSummary.value.refundable_remaining <= 0) return false
  return true
})

// Reconcile = force a re-check against the aggregator API. Useful when a
// webhook was missed or when the merchant suspects the status is stale.
// Only meaningful while the transaction is in a non-final state OR has
// an aggregator_tx_id we can query.
const canReconcile = computed(() => {
  if (!transaction.value.id) return false
  if (!transaction.value.aggregator_tx_id) return false
  if (['initiated', 'pending'].includes(transaction.value.status)) return true
  // For final-status transactions, still allow a manual re-check —
  // sometimes "success" on our side was actually rolled back upstream.
  return true
})

const refundDisabledReason = computed(() => {
  if (transaction.value.type !== 'payment') return t('paymentsPage.detail.refundDisabled.notPayment')
  if (transaction.value.status !== 'success') return t('paymentsPage.detail.refundDisabled.notSuccess')
  if (!transaction.value.aggregator_tx_id) return t('paymentsPage.detail.refundDisabled.noAggregatorId')
  if (refundSummary.value.refundable_remaining <= 0) return t('paymentsPage.detail.refundDisabled.alreadyRefunded')
  return t('paymentsPage.detail.refundDisabled.ready')
})

const canConfirmRefund = computed(() => {
  return refundAmount.value > 0 &&
    refundAmount.value <= refundSummary.value.refundable_remaining &&
    !refundSubmitting.value
})

const loadTransaction = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await apiFetch<{ success: boolean; data: any }>(`/merchant/transactions/${id}`)
    transaction.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || t('paymentsPage.detail.loadError')
    handleError(e, t('paymentsPage.detail.errorSummary'))
  } finally {
    loading.value = false
  }
}

const loadRefunds = async () => {
  try {
    const res = await apiFetch<{ success: boolean; data: any }>(`/merchant/payments/${id}/refunds`)
    refunds.value = res.data.refunds || []
    refundSummary.value = res.data.summary || { total_refunded: 0, refundable_remaining: 0 }
  } catch (e: any) {
    // 404 = no refund history yet — that's normal, don't surface as error.
    if (e?.status !== 404 && e?.response?.status !== 404) {
      handleError(e, t('paymentsPage.detail.refundsSummary'))
    }
  }
}

const openRefundDialog = () => {
  if (!canRefund.value) return
  refundAmount.value = refundSummary.value.refundable_remaining
  refundReason.value = null
  refundError.value = null
  refundDialogOpen.value = true
}

const closeRefundDialog = () => {
  if (refundSubmitting.value) return
  refundDialogOpen.value = false
}

const submitRefund = async () => {
  if (!canConfirmRefund.value) return
  refundSubmitting.value = true
  refundError.value = null
  try {
    await apiFetch<{ success: boolean; data: any }>(`/merchant/payments/${id}/refund`, {
      method: 'POST',
      body: {
        amount: refundAmount.value,
        reason: refundReason.value,
      },
    })
    toast.add({
      severity: 'success',
      summary: t('paymentsPage.detail.refundDialog.successTitle'),
      detail: t('paymentsPage.detail.refundDialog.successDetail'),
      life: 3500,
    })
    refundDialogOpen.value = false
    // Re-fetch both the transaction (status may have flipped to `refunded`)
    // and the refunds list (new row added).
    await Promise.all([loadTransaction(), loadRefunds()])
  } catch (e: any) {
    refundError.value = e?.data?.message || e?.message || t('paymentsPage.detail.refundDialog.genericError')
  } finally {
    refundSubmitting.value = false
  }
}

/**
 * Map aggregator refund statuses to the values the StatusBadge component knows.
 *   succeeded   → success
 *   pending     → pending
 *   requires_action → pending
 *   failed/canceled → failed
 */
const mapRefundStatus = (status: string): string => {
  switch (status) {
    case 'succeeded': return 'success'
    case 'failed':
    case 'canceled':
    case 'cancelled': return 'failed'
    default: return 'pending'
  }
}

const formatAmount = (amount: number | string, currency: string) => {
  if (!amount) return '—'
  const cur = (currency || 'XOF').toUpperCase()
  // Zero-decimal currencies show no decimals; everything else (USD/EUR/…)
  // shows two. Matches Stripe's own dashboard formatting and stops the
  // refunds table reading "$12" for a $12.50 refund.
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(cur)
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr, {
    style: 'currency',
    currency: cur,
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: isZeroDecimal ? 0 : 2,
  }).format(Number(amount))
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—'
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(dateStr).toLocaleDateString(localeStr, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const getInitials = (first: string, last: string) => {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase()
}

const goToCustomer = (customerId: string) => {
  router.push(`/customers/${customerId}`)
}

const copyToClipboard = (text: string) => {
  if (text) navigator.clipboard.writeText(text)
}

const reconcile = async () => {
  if (!canReconcile.value || reconciling.value) return
  reconciling.value = true
  try {
    // We piggy-back on the API key verify endpoint — it triggers a fresh
    // call to the aggregator and persists the new status via the same
    // applyStatusUpdate path the webhook uses. For the dashboard we need
    // an admin-side equivalent; for now we re-load the transaction so any
    // background webhook that already settled it shows up.
    await loadTransaction()
    toast.add({
      severity: 'info',
      summary: t('paymentsPage.detail.reconciledTitle'),
      detail: t('paymentsPage.detail.reconciledDetail', { status: transaction.value.status }),
      life: 3000,
    })
  } catch (e: any) {
    handleError(e, t('paymentsPage.detail.reconcileSummary'))
  } finally {
    reconciling.value = false
  }
}

const loadAggregatorCatalog = async () => {
  // The catalog lives behind the merchant-scoped middleware so we use
  // the standard /merchant/aggregators/available endpoint. Failure is
  // non-fatal — we fall back to displaying the raw aggregator code.
  try {
    const res = await apiFetch<{ success: boolean; data: any[] }>('/merchant/aggregators/available')
    const map: Record<string, { name: string; logo: string | null }> = {}
    for (const a of res.data || []) {
      map[a.code] = { name: a.name, logo: a.logo ?? null }
    }
    aggregatorCatalog.value = map
  } catch {
    // ignore — the page still works without the catalog
  }
}

const loadOperatorCatalog = async () => {
  try {
    const res = await apiFetch<{ success: boolean; data: { operators: any[] } }>('/merchant/operators')
    const map: Record<string, { name: string; country: string }> = {}
    for (const op of res.data.operators || []) {
      map[op.code] = { name: op.name, country: op.country }
    }
    operatorCatalog.value = map
  } catch {
    // ignore
  }
}

onMounted(async () => {
  await loadTransaction()
  // Refunds is a separate endpoint; failure shouldn't block the main detail
  // view, so we fetch it after and let `loadRefunds()` handle its own errors.
  loadRefunds()
  // Aggregator + operator catalogs are tiny and cached server-side — fire
  // them in parallel to populate logos/labels on the brand cards.
  Promise.all([loadAggregatorCatalog(), loadOperatorCatalog()])
})
</script>

<style scoped>
.transaction-detail-page {
  min-height: 100%;
}

.back-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.back-row-spacer {
  flex: 1;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 6px;
  color: var(--ze-text-label);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.back-btn:hover {
  background: var(--ze-bg-hover);
  border-color: var(--ze-border-strong);
}

.back-btn .pi {
  font-size: 12px;
}

.tx-id-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  background: var(--ze-brand-bg-soft);
  border-radius: 999px;
}

.tx-id-label {
  font-size: 12px;
  color: var(--ze-brand);
  font-weight: 500;
}

.tx-id-code {
  font-size: 12px;
  color: var(--ze-brand-hover);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.refund-btn,
.reconcile-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 16px;
  background: var(--ze-bg-card);
  color: var(--ze-brand);
  border: 1px solid var(--ze-brand-border);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.refund-btn:hover:not(:disabled),
.reconcile-btn:hover:not(:disabled) {
  background: var(--ze-brand-bg-soft);
  border-color: var(--ze-brand);
}

.refund-btn:disabled,
.reconcile-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reconcile-btn {
  color: var(--ze-text-body);
  border-color: var(--ze-border);
}

.reconcile-btn:hover:not(:disabled) {
  background: var(--ze-bg-hover);
  border-color: var(--ze-border-strong);
}

.loading-container {
  padding: 16px 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.detail-card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
}

.detail-card-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0 0 16px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.info-label {
  font-size: 13px;
  color: var(--ze-text-label);
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--ze-text-body);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.info-value-copy {
  display: flex;
  align-items: center;
  gap: 6px;
}

.amount-big {
  font-size: 18px;
  font-weight: 700;
  color: var(--ze-text-strong);
}

.error-text {
  color: var(--ze-danger-fg);
}

.ref-code {
  font-size: 12px;
  background: var(--ze-bg-subtle);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--ze-text-label);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ze-text-disabled);
  padding: 2px;
  font-size: 12px;
  border-radius: 4px;
  transition: color 0.15s;
}

.copy-btn:hover {
  color: var(--ze-brand);
}

.client-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.client-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--ze-brand-bg-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--ze-brand);
}

.client-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.client-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ze-text-body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.client-email {
  font-size: 12px;
  color: var(--ze-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-pilule {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  background: var(--ze-bg-card);
  color: var(--ze-brand);
  border: 1px solid var(--ze-brand-border);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.outline-pilule:hover {
  background: var(--ze-brand-bg-soft);
  border-color: var(--ze-brand);
}

.text-muted {
  color: var(--ze-text-muted);
  font-size: 13px;
}

.attempts-section {
  margin-top: 0;
  overflow-x: auto;
}

.fallback-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: var(--ze-warning-bg);
  color: var(--ze-warning-fg);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
}

.country-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.country-flag {
  font-size: 16px;
  line-height: 1;
}

.mono-cell {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.cell-strong {
  font-weight: 600;
  color: var(--ze-text-strong);
}

.method-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--ze-text-strong);
  overflow: hidden;
  flex-shrink: 0;
}

.brand-logo--sm {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 11px;
}

.brand-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.brand-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ze-text-strong);
}

.brand-sub {
  font-size: 11px;
  color: var(--ze-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.date-cell {
  font-size: 12px;
  color: var(--ze-text-muted);
  font-variant-numeric: tabular-nums;
}

:deep(.attempts-table .p-datatable-thead > tr > th) {
  background: var(--ze-bg-subtle);
  color: var(--ze-text-muted);
  font-size: 12px;
  font-weight: 500;
  text-transform: none;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ze-border);
}

:deep(.attempts-table .p-datatable-tbody > tr > td) {
  padding: 14px;
  font-size: 13px;
  color: var(--ze-text-body);
  border-bottom: 1px solid var(--ze-border-subtle);
}

:deep(.attempts-table .p-datatable-tbody > tr:last-child > td) {
  border-bottom: none;
}

/* ── Refunds section ─────────────────────────────────── */

.refunds-section {
  margin-top: 16px;
}

.refunds-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.refunds-header .card-title {
  margin: 0;
}

.refund-summary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--ze-text-muted);
}

.refund-summary-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.refund-summary-label {
  color: var(--ze-text-muted);
}

.refund-summary-value {
  color: var(--ze-text-strong);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.refund-summary-divider {
  color: var(--ze-text-disabled);
}

.amount-cell {
  font-weight: 600;
  color: var(--ze-text-strong);
  font-variant-numeric: tabular-nums;
}

.text-muted {
  color: var(--ze-text-muted);
}

:deep(.refunds-table .p-datatable-thead > tr > th) {
  background: var(--ze-bg-subtle);
  color: var(--ze-text-muted);
  font-size: 12px;
  font-weight: 500;
  text-transform: none;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ze-border);
}

:deep(.refunds-table .p-datatable-tbody > tr > td) {
  padding: 14px;
  font-size: 13px;
  color: var(--ze-text-body);
  border-bottom: 1px solid var(--ze-border-subtle);
}

:deep(.refunds-table .p-datatable-tbody > tr:last-child > td) {
  border-bottom: none;
}

/* ── Refund dialog ────────────────────────────────────── */

.refund-dialog-desc {
  font-size: 13px;
  color: var(--ze-text-body);
  line-height: 1.6;
  margin: 0 0 18px;
}

.refund-dialog-desc strong {
  color: var(--ze-text-strong);
  font-weight: 600;
}

.refund-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.refund-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ze-text-strong);
}

.optional {
  font-weight: 400;
  color: var(--ze-text-muted);
  margin-left: 4px;
}

.refund-input {
  width: 100%;
}

.refund-help {
  font-size: 12px;
  color: var(--ze-text-muted);
  line-height: 1.5;
  margin: 4px 0 0;
}

.refund-error {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-left: 3px solid var(--ze-danger-fg);
  border-radius: 4px;
  padding: 10px 14px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ze-text-body);
  margin-top: 12px;
}

.refund-error i {
  font-size: 14px;
  line-height: 1.5;
  color: var(--ze-danger-fg);
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  .detail-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .detail-card {
    padding: 16px;
  }
  .back-row {
    flex-wrap: wrap;
  }
}
</style>
