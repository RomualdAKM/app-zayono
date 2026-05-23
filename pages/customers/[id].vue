<template>
  <div class="customer-detail-page">
    <!-- Back link -->
    <div class="detail-header">
      <div class="detail-header-left" @click="$router.push('/customers')">
        <AppIcon name="arrow-left" class="back-icon" />
        <span class="back-text">{{ $t('customersPage.detail.back') }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <Skeleton width="200px" height="28px" class="mb-2" />
      <Skeleton width="250px" height="16px" class="mb-4" />
      <Skeleton height="300px" />
    </div>

    <!-- Error -->
    <Message v-else-if="error" severity="error" :closable="false">{{ error }}</Message>

    <!-- Content -->
    <template v-else-if="customer">
      <!-- Identity card -->
      <div class="identity-card">
        <div class="customer-avatar-big">
          {{ getInitials(customer.first_name, customer.last_name) }}
        </div>
        <div class="identity-info">
          <h1 class="customer-name">{{ customer.first_name }} {{ customer.last_name }}</h1>
          <div class="identity-meta">
            <span v-if="customer.email" class="meta-item"><AppIcon name="envelope" />{{ customer.email }}</span>
            <span v-if="customer.phone" class="meta-item"><AppIcon name="phone" />{{ customer.phone }}</span>
            <span v-if="customer.country" class="meta-item">{{ countryLabel(customer.country) }}</span>
          </div>
        </div>
      </div>

      <!-- KPI row -->
      <div class="kpi-row">
        <DashboardKpiCard
          tone="blue"
          icon="pi-wallet"
          :label="$t('customersPage.detail.totalSpent')"
          :value="formatAmount(customer.total_spent, customer.currency)"
        />
        <DashboardKpiCard
          tone="green"
          icon="pi-credit-card"
          :label="$t('customersPage.detail.transactionsKpi')"
          :value="customer.transactions_count ?? 0"
        />
        <DashboardKpiCard
          tone="neutral"
          icon="pi-clock"
          :label="$t('customersPage.detail.lastActivity')"
          :value="formatDate(customer.last_activity_at || customer.updated_at || customer.created_at)"
        />
      </div>

      <!-- Tabs -->
      <Tabs :value="activeTab" @update:value="onTabChange" class="customer-tabs">
        <TabList>
          <Tab value="info">{{ $t('customersPage.detail.tabs.info') }}</Tab>
          <Tab value="payments">{{ $t('customersPage.detail.tabs.payments') }}</Tab>
          <Tab value="payouts">{{ $t('customersPage.detail.tabs.payouts') }}</Tab>
        </TabList>

        <TabPanels>
          <!-- Tab: Informations -->
          <TabPanel value="info">
            <div class="info-card">
              <div class="info-grid">
                <div class="info-column">
                  <div class="info-item">
                    <span class="info-label">{{ $t('customersPage.detail.info.firstName') }}</span>
                    <span class="info-value">{{ customer.first_name || '—' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('customersPage.detail.info.lastName') }}</span>
                    <span class="info-value">{{ customer.last_name || '—' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('customersPage.detail.info.email') }}</span>
                    <span class="info-value">{{ customer.email || '—' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('customersPage.detail.info.phone') }}</span>
                    <span class="info-value">{{ customer.phone || '—' }}</span>
                  </div>
                </div>
                <div class="info-column">
                  <div class="info-item">
                    <span class="info-label">{{ $t('customersPage.detail.info.country') }}</span>
                    <span class="info-value">{{ customer.country || '—' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('customersPage.detail.info.city') }}</span>
                    <span class="info-value">{{ customer.city || '—' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('customersPage.detail.info.createdAt') }}</span>
                    <span class="info-value">{{ formatDate(customer.created_at) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('customersPage.detail.info.totalTransactions') }}</span>
                    <span class="info-value">{{ customer.transactions_count ?? 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- Tab: Paiements -->
          <TabPanel value="payments">
            <div class="tab-content-card">
              <div v-if="paymentsLoading" class="tab-loading">
                <Skeleton height="2.5rem" v-for="i in 4" :key="i" class="mb-1" />
              </div>

              <CommonEmptyState
                v-else-if="payments.length === 0"
                :title="$t('customersPage.detail.noPaymentTitle')"
                :description="$t('customersPage.detail.noPaymentDescription')"
                icon="pi-credit-card"
              />

              <template v-else>
                <DataTable :value="payments" :rows="paymentsPerPage" rowHover>
                  <Column :header="$t('customersPage.detail.txColumns.amount')">
                    <template #body="{ data }">
                      <span class="amount-cell">{{ formatAmount(data.amount, data.currency) }}</span>
                    </template>
                  </Column>
                  <Column :header="$t('customersPage.detail.txColumns.status')">
                    <template #body="{ data }">
                      <TransactionsStatusBadge :status="data.status" />
                    </template>
                  </Column>
                  <Column :header="$t('customersPage.detail.txColumns.method')">
                    <template #body="{ data }">
                      <span v-if="data.operator" class="customer-method-cell">
                        <MethodLogo :name="data.operator" />
                        <span>{{ data.operator }}</span>
                      </span>
                      <span v-else class="muted">—</span>
                    </template>
                  </Column>
                  <Column :header="$t('customersPage.detail.txColumns.reference')">
                    <template #body="{ data }">
                      <code class="ref-code">{{ data.id?.substring(0, 12) }}...</code>
                    </template>
                  </Column>
                  <Column :header="$t('customersPage.detail.txColumns.date')">
                    <template #body="{ data }">
                      <span class="muted">{{ formatDate(data.created_at) }}</span>
                    </template>
                  </Column>
                </DataTable>

                <Paginator
                  :rows="paymentsPerPage"
                  :totalRecords="paymentsTotalRecords"
                  :first="(paymentsPage - 1) * paymentsPerPage"
                  @page="onPaymentsPageChange"
                  :rowsPerPageOptions="[10, 15, 25]"
                />
              </template>
            </div>
          </TabPanel>

          <!-- Tab: Transferts -->
          <TabPanel value="payouts">
            <div class="tab-content-card">
              <div v-if="payoutsLoading" class="tab-loading">
                <Skeleton height="2.5rem" v-for="i in 4" :key="i" class="mb-1" />
              </div>

              <CommonEmptyState
                v-else-if="payouts.length === 0"
                :title="$t('customersPage.detail.noPayoutTitle')"
                :description="$t('customersPage.detail.noPayoutDescription')"
                icon="pi-send"
              />

              <template v-else>
                <DataTable :value="payouts" :rows="payoutsPerPage" rowHover>
                  <Column :header="$t('customersPage.detail.txColumns.amount')">
                    <template #body="{ data }">
                      <span class="amount-cell">{{ formatAmount(data.amount, data.currency) }}</span>
                    </template>
                  </Column>
                  <Column :header="$t('customersPage.detail.txColumns.status')">
                    <template #body="{ data }">
                      <TransactionsStatusBadge :status="data.status" />
                    </template>
                  </Column>
                  <Column :header="$t('customersPage.detail.txColumns.method')">
                    <template #body="{ data }">
                      <span v-if="data.operator" class="customer-method-cell">
                        <MethodLogo :name="data.operator" />
                        <span>{{ data.operator }}</span>
                      </span>
                      <span v-else class="muted">—</span>
                    </template>
                  </Column>
                  <Column :header="$t('customersPage.detail.txColumns.reference')">
                    <template #body="{ data }">
                      <code class="ref-code">{{ data.id?.substring(0, 12) }}...</code>
                    </template>
                  </Column>
                  <Column :header="$t('customersPage.detail.txColumns.date')">
                    <template #body="{ data }">
                      <span class="muted">{{ formatDate(data.created_at) }}</span>
                    </template>
                  </Column>
                </DataTable>

                <Paginator
                  :rows="payoutsPerPage"
                  :totalRecords="payoutsTotalRecords"
                  :first="(payoutsPage - 1) * payoutsPerPage"
                  @page="onPayoutsPageChange"
                  :rowsPerPageOptions="[10, 15, 25]"
                />
              </template>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { apiFetch } = useApi()
const { handleError } = useApiError()
const { t, locale } = useI18n()

const customerId = route.params.id as string

const activeTab = ref('info')

// PrimeVue Tabs emits `string | number` (the tab's `value` prop type); we
// only ever set string values on the tabs, so coerce at the boundary
// rather than widen the rest of the function.
const onTabChange = (value: string | number) => {
  const v = String(value)
  activeTab.value = v
  if (v === 'payments' && payments.value.length === 0 && !paymentsLoading.value) {
    loadPayments()
  }
  if (v === 'payouts' && payouts.value.length === 0 && !payoutsLoading.value) {
    loadPayouts()
  }
}

const customer = ref<any>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const payments = ref<any[]>([])
const paymentsLoading = ref(false)
const paymentsPage = ref(1)
const paymentsPerPage = ref(15)
const paymentsTotalRecords = ref(0)

const payouts = ref<any[]>([])
const payoutsLoading = ref(false)
const payoutsPage = ref(1)
const payoutsPerPage = ref(15)
const payoutsTotalRecords = ref(0)

const loadCustomer = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await apiFetch<{ success: boolean; data: any }>(`/merchant/customers/${customerId}`)
    customer.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || t('customersPage.detail.loadError')
    handleError(e, t('customersPage.detail.errorSummary'))
  } finally {
    loading.value = false
  }
}

const loadPayments = async () => {
  paymentsLoading.value = true
  try {
    const params = { page: paymentsPage.value, per_page: paymentsPerPage.value }
    const res = await apiFetch<{ success: boolean; data: any }>(`/merchant/customers/${customerId}/payments`, { params })
    payments.value = res.data.data
    paymentsTotalRecords.value = res.data.total
    paymentsPage.value = res.data.current_page
  } catch (e: any) {
    handleError(e, t('customersPage.detail.paymentsErrorSummary'))
    payments.value = []
  } finally {
    paymentsLoading.value = false
  }
}

const loadPayouts = async () => {
  payoutsLoading.value = true
  try {
    const params = { page: payoutsPage.value, per_page: payoutsPerPage.value }
    const res = await apiFetch<{ success: boolean; data: any }>(`/merchant/customers/${customerId}/payouts`, { params })
    payouts.value = res.data.data
    payoutsTotalRecords.value = res.data.total
    payoutsPage.value = res.data.current_page
  } catch (e: any) {
    handleError(e, t('customersPage.detail.payoutsErrorSummary'))
    payouts.value = []
  } finally {
    payoutsLoading.value = false
  }
}

const onPaymentsPageChange = (event: any) => {
  paymentsPage.value = event.page + 1
  paymentsPerPage.value = event.rows
  loadPayments()
}

const onPayoutsPageChange = (event: any) => {
  payoutsPage.value = event.page + 1
  payoutsPerPage.value = event.rows
  loadPayouts()
}

const getInitials = (first: string, last: string) => {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase()
}

const formatAmount = (amount: number | string | null | undefined, currency?: string) => {
  if (amount === null || amount === undefined || amount === '') return '—'
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr, { style: 'currency', currency: currency || 'XOF', minimumFractionDigits: 0 }).format(Number(amount))
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—'
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(dateStr).toLocaleDateString(localeStr, { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(() => {
  loadCustomer()
  loadPayments()
})
</script>

<style scoped>
.customer-detail-page {
  min-height: 100%;
}

/* Back link */
.detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.detail-header-left {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--ze-text-muted);
  transition: color 0.15s;
}

.detail-header-left:hover {
  color: var(--ze-brand);
}

.back-icon {
  font-size: 12px;
}

.back-text {
  font-size: 13px;
  font-weight: 500;
}

.loading-container {
  padding: 16px 0;
}

/* Identity card */
.identity-card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 16px;
}

.customer-avatar-big {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--ze-icon-circle-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: var(--ze-icon-circle-fg);
  flex-shrink: 0;
}

.identity-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.customer-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--ze-text-strong);
  margin: 0;
  line-height: 1.2;
}

.identity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: var(--ze-text-muted);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.meta-item .pi {
  font-size: 12px;
  color: var(--ze-text-disabled);
}

/* KPI row */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

/* Tabs */
.customer-tabs :deep(.p-tabs-nav) {
  border-bottom: 1px solid var(--ze-border);
  background: transparent;
}

.customer-tabs :deep(.p-tablist) {
  background: transparent;
}

.customer-tabs :deep(.p-tab) {
  font-size: 13px;
  font-weight: 500;
  color: var(--ze-text-muted);
  border: none;
  border-bottom: 2px solid transparent;
  padding: 10px 16px;
  background: transparent;
  border-radius: 0;
  transition: color 0.15s, border-color 0.15s;
}

.customer-tabs :deep(.p-tab:hover) {
  color: var(--ze-brand);
  background: transparent;
}

.customer-tabs :deep(.p-tab-active) {
  color: var(--ze-brand);
  border-bottom-color: var(--ze-brand);
  background: transparent;
}

.customer-tabs :deep(.p-tabpanels) {
  background: transparent;
  padding: 20px 0 0;
}

.customer-tabs :deep(.p-tabpanel) {
  padding: 0;
}

.customer-tabs :deep(.p-tablist-active-bar) {
  display: none;
}

/* Info card */
.info-card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.info-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ze-text-label);
}

.info-value {
  font-size: 14px;
  color: var(--ze-text-body);
  font-weight: 400;
}

/* Tab table card */
.tab-content-card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  overflow: hidden;
  overflow-x: auto;
}

.tab-content-card :deep(.p-datatable-thead > tr > th) {
  background: var(--ze-bg-subtle);
  color: var(--ze-text-muted);
  font-size: 12px;
  font-weight: 500;
  text-transform: none;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ze-border);
}

.tab-content-card :deep(.p-datatable-tbody > tr > td) {
  padding: 14px;
  font-size: 13px;
  color: var(--ze-text-body);
  border-bottom: 1px solid var(--ze-border-subtle);
}

.tab-content-card :deep(.p-datatable-tbody > tr:last-child > td) {
  border-bottom: none;
}

.tab-loading {
  padding: 20px;
}

.amount-cell {
  font-weight: 600;
  font-size: 13px;
  color: var(--ze-text-strong);
  font-variant-numeric: tabular-nums;
}

.muted {
  color: var(--ze-text-muted);
  font-size: 13px;
}

.ref-code {
  font-size: 11px;
  background: var(--ze-bg-subtle);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--ze-text-label);
  font-family: monospace;
}

@media (max-width: 1024px) {
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .kpi-row {
    grid-template-columns: 1fr;
  }
  .identity-card,
  .info-card,
  .tab-content-card {
    padding: 16px;
  }
  .identity-card {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
}

.customer-method-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--ze-text-body);
}
</style>
