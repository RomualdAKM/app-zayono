<template>
  <div class="payments-page">
    <!-- Filters card -->
    <div class="filters-card">
      <p class="page-subtitle">{{ $t('paymentsPage.subtitle') }}</p>
      <div class="filters-bar">
        <div class="search-wrapper">
          <AppIcon name="search" class="search-icon" />
          <InputText v-model="filters.search" :placeholder="$t('paymentsPage.searchPlaceholder')" class="search-input" @keyup.enter="loadPayments" />
        </div>
        <Select v-model="filters.status" :options="statusOptions" optionLabel="label" optionValue="value" :placeholder="$t('paymentsPage.filters.status')" showClear @change="resetAndLoad" class="filter-control" />
        <Select v-model="filters.currency" :options="currencyOptions" optionLabel="label" optionValue="value" :placeholder="$t('paymentsPage.filters.currency')" showClear @change="resetAndLoad" class="filter-control" />
        <Select v-model="filters.operator" :options="methodOptions" optionLabel="label" optionValue="value" :placeholder="$t('paymentsPage.filters.method')" showClear @change="resetAndLoad" class="filter-control" />
        <Select v-model="filters.aggregator" :options="gatewayOptions" optionLabel="label" optionValue="value" :placeholder="$t('paymentsPage.filters.gateway')" showClear @change="resetAndLoad" class="filter-control" />
        <DatePicker v-model="dateRange" :placeholder="$t('paymentsPage.filters.date')" selectionMode="range" dateFormat="dd/mm/yy" showIcon :manualInput="false" @date-select="onDateSelect" showButtonBar @clear-click="clearDate" class="filter-control filter-date" />
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-container">
      <Skeleton height="3rem" class="mb-2" />
      <Skeleton height="2.5rem" v-for="i in 8" :key="i" class="mb-1" />
    </div>

    <!-- Error state -->
    <Message v-else-if="error" severity="error" :closable="false">
      {{ error }}
    </Message>

    <!-- Empty state -->
    <div v-else-if="transactions.length === 0" class="table-card">
      <div class="empty-state">
        <AppIcon name="inbox" />
        <p>{{ $t('paymentsPage.empty') }}</p>
        <span class="empty-state-hint">{{ $t('paymentsPage.emptyHint') }}</span>
        <button class="outline-pilule" @click="router.push('/payments/methods')">
          <span>{{ $t('paymentsPage.viewMethods') }}</span>
          <AppIcon name="arrow-right" />
        </button>
      </div>
    </div>

    <!-- Data table -->
    <template v-else>
      <div class="table-card">
        <DataTable
          :value="transactions"
          class="transactions-table"
          rowHover
        >
          <Column field="amount" :header="$t('paymentsPage.columns.amount')" headerClass="col-amount" bodyClass="col-amount">
            <template #body="{ data }">
              <span class="amount-cell tabular">
                {{ formatAmount(data.amount, data.currency).replace(data.currency, '').trim() }}
                <span class="amount-currency">{{ data.currency }}</span>
              </span>
            </template>
          </Column>
          <Column field="status" :header="$t('paymentsPage.columns.status')">
            <template #body="{ data }">
              <TransactionsStatusBadge :status="data.status" />
            </template>
          </Column>
          <Column field="operator" :header="$t('paymentsPage.columns.method')">
            <template #body="{ data }">
              <div v-if="data.operator" class="method-cell">
                <MethodLogo :name="data.operator" />
                <span class="method-cell-name">{{ operatorName(data.operator) }}</span>
              </div>
              <span v-else class="text-muted">—</span>
            </template>
          </Column>
          <Column field="aggregator_code" :header="$t('paymentsPage.columns.gateway')">
            <template #body="{ data }">
              <span v-if="data.aggregator_code" class="gateway-badge">{{ aggregatorName(data.aggregator_code) }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </Column>
          <Column field="customer" :header="$t('paymentsPage.columns.customer')">
            <template #body="{ data }">
              <div class="customer-cell" v-if="data.customer">
                <span class="customer-name">{{ data.customer.first_name }} {{ data.customer.last_name }}</span>
                <span class="customer-email">{{ data.customer.email }}</span>
              </div>
              <span v-else class="text-muted">—</span>
            </template>
          </Column>
          <Column field="id" :header="$t('paymentsPage.columns.reference')">
            <template #body="{ data }">
              <div class="ref-cell">
                <code class="ref-code">{{ data.id?.substring(0, 12) }}</code>
                <button class="copy-btn" @click.stop="copyToClipboard(data.id)" :title="$t('paymentsPage.tooltips.copy')">
                  <AppIcon name="copy" />
                </button>
              </div>
            </template>
          </Column>
          <Column field="created_at" :header="$t('paymentsPage.columns.date')">
            <template #body="{ data }">
              <span class="date-cell">{{ formatDate(data.created_at) }}</span>
            </template>
          </Column>
          <Column :header="$t('paymentsPage.columns.details')" class="col-detail">
            <template #body="{ data }">
              <button class="detail-btn" @click="goToDetail(data.id)" :title="$t('paymentsPage.tooltips.viewDetails')">
                <AppIcon name="eye" />
              </button>
            </template>
          </Column>
        </DataTable>

        <Paginator
          :rows="perPage"
          :totalRecords="totalRecords"
          :first="(currentPage - 1) * perPage"
          @page="onPageChange"
          :rowsPerPageOptions="[10, 15, 25, 50]"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const { apiFetch } = useApi()
const { handleError } = useApiError()
const { catalog, load: loadOperators } = useOperators()
const { t, locale } = useI18n()

const filters = ref({
  search: '',
  status: null as string | null,
  currency: null as string | null,
  operator: null as string | null,
  aggregator: null as string | null,
})

const dateRange = ref<Date[] | null>(null)

const transactions = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const currentPage = ref(1)
const perPage = ref(15)
const totalRecords = ref(0)

const statusOptions = computed(() => [
  { label: t('paymentsPage.statusOptions.initiated'), value: 'initiated' },
  { label: t('paymentsPage.statusOptions.pending'), value: 'pending' },
  { label: t('paymentsPage.statusOptions.success'), value: 'success' },
  { label: t('paymentsPage.statusOptions.failed'), value: 'failed' },
  { label: t('paymentsPage.statusOptions.cancelled'), value: 'cancelled' },
])

const currencyOptions = computed(() =>
  catalog.value.currencies.map(c => ({ label: c, value: c }))
)

const methodOptions = computed(() =>
  catalog.value.operators.map(o => ({
    label: `${o.name} (${o.country_name})`,
    value: o.code,
  }))
)

/**
 * Resolve a Zayono operator code (`mtn_ci`) to its human display
 * label (`MTN Mobile Money CI`) via the cached catalogue. Falls back
 * to the raw code when the catalogue hasn't loaded yet or the
 * operator is missing (legacy/removed code on a historical tx).
 */
const operatorName = (code: string): string =>
  catalog.value.operators.find(o => o.code === code)?.name || code

// Catalogue-driven filter (purpose=payment so payout-only future drivers
// don't pollute the dropdown).
const { load: loadAggregatorCatalog, asSelectOptions, labelFor: aggregatorLabelFor } = useAggregatorCatalog()
onMounted(() => loadAggregatorCatalog())
const gatewayOptions = computed(() => asSelectOptions({ purpose: 'payment' }))

/**
 * Resolve an aggregator code (`fedapay`) to its human label
 * (`FedaPay`) via the catalogue. Falls back to the raw code so a
 * historical row with a code the catalogue no longer carries still
 * renders something instead of `undefined`.
 */
const aggregatorName = (code: string): string => aggregatorLabelFor(code)

const loadPayments = async () => {
  loading.value = true
  error.value = null
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      per_page: perPage.value,
    }
    if (filters.value.search) params.search = filters.value.search
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.currency) params.currency = filters.value.currency
    if (filters.value.operator) params.operator = filters.value.operator
    if (filters.value.aggregator) params.aggregator = filters.value.aggregator
    if (dateRange.value && dateRange.value[0]) params.from = formatDateParam(dateRange.value[0])
    if (dateRange.value && dateRange.value[1]) params.to = formatDateParam(dateRange.value[1])

    const res = await apiFetch<{ success: boolean; data: any }>('/merchant/payments', { params })
    transactions.value = res.data.data
    totalRecords.value = res.data.total
    currentPage.value = res.data.current_page
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || t('paymentsPage.loadError')
    handleError(e, t('paymentsPage.errorSummary'))
    transactions.value = []
  } finally {
    loading.value = false
  }
}

const resetAndLoad = () => {
  currentPage.value = 1
  loadPayments()
}

const onDateSelect = () => {
  if (dateRange.value && dateRange.value[1]) {
    resetAndLoad()
  }
}

const clearDate = () => {
  dateRange.value = null
  resetAndLoad()
}

const formatDateParam = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const onPageChange = (event: any) => {
  currentPage.value = event.page + 1
  perPage.value = event.rows
  loadPayments()
}

const formatAmount = (amount: number | string, currency: string) => {
  return new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: currency || 'XOF', minimumFractionDigits: 0 }).format(Number(amount))
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const goToDetail = (id: string) => {
  router.push(`/payments/${id}`)
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
}

onMounted(async () => {
  await loadOperators()
  loadPayments()
})
</script>

<style scoped>
.payments-page {
  min-height: 100%;
}

.page-subtitle {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0 0 16px;
}

.filters-card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
}

.filters-bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

/* All filter controls share the same 38px height so they align on one row. */
.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 240px;
  max-width: 320px;
  height: 38px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ze-text-disabled);
  font-size: 13px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 38px;
  padding-left: 36px;
}

/* PrimeVue v4 class names: Select uses .p-select, DatePicker wrapper
   uses .p-datepicker (input-wrapper, not the panel). All filter controls
   share a 38px height so they sit on the same row. */
:deep(.filter-control.p-select),
:deep(.filter-control.p-datepicker),
:deep(.filter-control .p-inputtext) {
  height: 38px;
}

:deep(.filter-control.p-select .p-select-label) {
  display: flex;
  align-items: center;
  padding-top: 0;
  padding-bottom: 0;
}

:deep(.filter-date .p-datepicker-dropdown) {
  height: 38px;
}

.loading-container {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
}

.table-card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
  overflow-x: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
}

.empty-state .pi-inbox {
  font-size: 2rem;
  color: var(--ze-text-disabled);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ze-text-body);
}

.empty-state-hint {
  font-size: 13px;
  color: var(--ze-text-muted);
  text-align: center;
  max-width: 380px;
  margin-bottom: 8px;
}

.outline-pilule {
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

.outline-pilule:hover {
  background: var(--ze-brand-bg-soft);
  border-color: var(--ze-brand);
}

.amount-cell {
  font-weight: 600;
  font-size: 13px;
  color: var(--ze-text-body);
  font-variant-numeric: tabular-nums;
}

.amount-currency {
  font-weight: 500;
  color: var(--ze-text-muted);
  margin-left: 4px;
}

.method-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ze-text-label);
}

.method-cell-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

/* Aggregator label pill — matches the brand-info treatment on the
   detail page so a single transaction reads consistently across the
   list and the drill-down. */
.gateway-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ze-text-label);
}

.customer-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.customer-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ze-text-body);
}

.customer-email {
  font-size: 11px;
  color: var(--ze-text-disabled);
}

.text-muted {
  color: var(--ze-text-disabled);
  font-size: 13px;
}

.ref-cell {
  display: flex;
  align-items: center;
  gap: 6px;
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

.date-cell {
  font-size: 12px;
  color: var(--ze-text-muted);
  font-variant-numeric: tabular-nums;
}

.col-detail {
  width: 70px;
  text-align: center;
}

.detail-btn {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--ze-brand);
  cursor: pointer;
  transition: background 0.15s;
}

.detail-btn:hover {
  background: var(--ze-brand-bg-soft);
}

.detail-btn .pi {
  font-size: 14px;
}

:deep(.transactions-table .p-datatable-thead > tr > th) {
  background: var(--ze-bg-subtle);
  color: var(--ze-text-muted);
  font-size: 12px;
  font-weight: 500;
  text-transform: none;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ze-border);
}

:deep(.transactions-table .p-datatable-tbody > tr > td) {
  padding: 14px;
  font-size: 13px;
  color: var(--ze-text-body);
  border-bottom: 1px solid var(--ze-border-subtle);
}

:deep(.transactions-table .p-datatable-tbody > tr:last-child > td) {
  border-bottom: none;
}

:deep(.p-paginator) {
  background: transparent;
  padding: 16px 0 0;
  border: none;
}

@media (max-width: 640px) {
  .filters-card,
  .table-card,
  .loading-container {
    padding: 16px;
  }
  .search-wrapper {
    flex-basis: 100%;
    max-width: 100%;
  }
  .customer-cell,
  .ref-cell {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
