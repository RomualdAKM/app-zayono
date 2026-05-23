<template>
  <div class="transaction-detail-page">
    <!-- Back row -->
    <div class="back-row">
      <button class="back-btn" @click="$router.back()" :aria-label="$t('payoutsPage.detail.back')">
        <AppIcon name="arrow-left" />
        <span>{{ $t('payoutsPage.detail.back') }}</span>
      </button>
      <div class="tx-id-pill" v-if="transaction.id">
        <span class="tx-id-label">{{ $t('payoutsPage.detail.transferLabel') }}</span>
        <code class="tx-id-code">#{{ transaction.id?.substring(0, 12) }}</code>
      </div>
      <div class="back-row-spacer" />
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
          <h3 class="card-title">{{ $t('payoutsPage.detail.informations') }}</h3>
          <div class="info-list">
            <div class="info-row">
              <span class="info-label">{{ $t('payoutsPage.detail.transactionId') }}</span>
              <div class="info-value-copy">
                <code class="ref-code">{{ transaction.id }}</code>
                <button class="copy-btn" @click="copyToClipboard(transaction.id)"><AppIcon name="copy" /></button>
              </div>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('payoutsPage.detail.amount') }}</span>
              <span class="info-value amount-big">{{ formatAmount(transaction.amount, transaction.currency) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('payoutsPage.detail.status') }}</span>
              <TransactionsStatusBadge :status="transaction.status" />
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('payoutsPage.detail.createdAt') }}</span>
              <span class="info-value">{{ formatDate(transaction.created_at) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('payoutsPage.detail.phone') }}</span>
              <span class="info-value">{{ transaction.phone_number || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('payoutsPage.detail.description') }}</span>
              <span class="info-value">{{ transaction.description || '—' }}</span>
            </div>
            <div class="info-row" v-if="transaction.amount_charged && transaction.amount_charged !== transaction.amount">
              <span class="info-label">{{ $t('payoutsPage.detail.amountCharged') }}</span>
              <span class="info-value">{{ formatAmount(transaction.amount_charged, transaction.currency) }}</span>
            </div>
          </div>
        </div>

        <!-- Column 2: Contexte -->
        <div class="detail-card">
          <h3 class="card-title">{{ $t('payoutsPage.detail.context') }}</h3>
          <div class="info-list">
            <div class="info-row">
              <span class="info-label">{{ $t('payoutsPage.detail.ipAddress') }}</span>
              <span class="info-value">{{ context.ip || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('payoutsPage.detail.country') }}</span>
              <span class="info-value">
                <span v-if="transaction.country || context.country">{{ countryLabel(transaction.country || context.country) }}</span>
                <span v-else>—</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('payoutsPage.detail.browser') }}</span>
              <span class="info-value">{{ context.browser || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('payoutsPage.detail.device') }}</span>
              <span class="info-value">{{ context.device || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('payoutsPage.detail.language') }}</span>
              <span class="info-value">{{ context.language || '—' }}</span>
            </div>
            <div class="info-row" v-if="transaction.failure_reason">
              <span class="info-label">{{ $t('payoutsPage.detail.failureReason') }}</span>
              <span class="info-value error-text">{{ transaction.failure_reason }}</span>
            </div>
          </div>
        </div>

        <!-- Column 3: Bénéficiaire + Méthode + Passerelle -->
        <div class="detail-card-stack">
          <!-- Bénéficiaire -->
          <div class="detail-card">
            <h3 class="card-title">{{ $t('payoutsPage.detail.beneficiary') }}</h3>
            <div class="client-section" v-if="transaction.customer">
              <div class="client-avatar">
                {{ getInitials(transaction.customer.first_name, transaction.customer.last_name) }}
              </div>
              <div class="client-info">
                <span class="client-name">{{ transaction.customer.first_name }} {{ transaction.customer.last_name }}</span>
                <span class="client-email">{{ transaction.customer.email || '—' }}</span>
              </div>
              <button class="outline-pilule" @click="goToCustomer(transaction.customer_id)">{{ $t('payoutsPage.detail.viewCustomer') }}</button>
            </div>
            <p v-else class="text-muted">{{ $t('payoutsPage.detail.noBeneficiary') }}</p>
          </div>

          <!-- Méthode -->
          <div class="detail-card">
            <h3 class="card-title">{{ $t('payoutsPage.detail.method') }}</h3>
            <div class="method-row" v-if="transaction.operator">
              <MethodLogo :name="transaction.operator" />
              <div class="brand-info">
                <span class="brand-name">{{ transaction.operator }}</span>
                <span class="brand-sub">{{ countryLabel(transaction.country || context.country || '') }}</span>
              </div>
            </div>
            <p v-else class="text-muted">—</p>
          </div>

          <!-- Passerelle -->
          <div class="detail-card">
            <h3 class="card-title">{{ $t('payoutsPage.detail.gateway') }}</h3>
            <div class="info-list">
              <div class="info-row">
                <span class="info-label">{{ $t('payoutsPage.detail.aggregator') }}</span>
                <span class="info-value">{{ transaction.aggregator_code || '—' }}</span>
              </div>
              <div class="info-row" v-if="transaction.aggregator_tx_id">
                <span class="info-label">{{ $t('payoutsPage.detail.aggregatorId') }}</span>
                <code class="ref-code">{{ transaction.aggregator_tx_id }}</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tentatives -->
      <div class="detail-card attempts-section" v-if="transaction.attempts && transaction.attempts.length > 0">
        <h3 class="card-title">{{ $t('payoutsPage.detail.attemptsTitle') }}</h3>
        <DataTable :value="transaction.attempts" class="attempts-table">
          <Column :header="$t('payoutsPage.detail.columns.number')" style="width: 50px;">
            <template #body="{ index }">
              {{ index + 1 }}
            </template>
          </Column>
          <Column field="aggregator_code" :header="$t('payoutsPage.detail.columns.aggregator')" />
          <Column field="status" :header="$t('payoutsPage.detail.columns.status')">
            <template #body="{ data }">
              <TransactionsStatusBadge :status="data.status" />
            </template>
          </Column>
          <Column field="failure_reason" :header="$t('payoutsPage.detail.columns.message')">
            <template #body="{ data }">
              <span>{{ data.failure_reason || '—' }}</span>
            </template>
          </Column>
          <Column field="is_fallback" :header="$t('payoutsPage.detail.columns.fallback')">
            <template #body="{ data }">
              <span v-if="data.is_fallback" class="fallback-pill">{{ $t('payoutsPage.detail.fallbackYes') }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </Column>
          <Column field="created_at" :header="$t('payoutsPage.detail.columns.date')">
            <template #body="{ data }">
              <span class="date-cell">{{ formatDate(data.created_at) }}</span>
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { apiFetch } = useApi()
const { handleError } = useApiError()
const { t, locale } = useI18n()

const id = route.params.id as string
const transaction = ref<any>({})
const loading = ref(true)
const error = ref<string | null>(null)

const context = computed(() => transaction.value.context || {})

const loadTransaction = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await apiFetch<{ success: boolean; data: any }>(`/merchant/transactions/${id}`)
    transaction.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || t('payoutsPage.detail.loadError')
    handleError(e, t('payoutsPage.detail.errorSummary'))
  } finally {
    loading.value = false
  }
}

const formatAmount = (amount: number | string, currency: string) => {
  if (!amount) return '—'
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr, { style: 'currency', currency: currency || 'XOF', minimumFractionDigits: 0 }).format(Number(amount))
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

onMounted(() => {
  loadTransaction()
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
