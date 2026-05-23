<template>
  <div class="page">
    <p class="page-subtitle">{{ $t('statisticsPage.subtitle.payments') }}</p>

    <div class="filters-row">
      <DatePicker
        v-model="dateRange"
        selectionMode="range"
        :manualInput="false"
        :placeholder="$t('statisticsPage.periodPlaceholder')"
        dateFormat="dd/mm/yy"
        showIcon
        @date-select="onDateSelect"
      />
    </div>

    <div v-if="loading" class="loading">
      <Skeleton v-for="i in 4" :key="i" height="110px" class="loading-card" />
    </div>

    <template v-else>
      <!-- KPI cards -->
      <div class="kpi-grid">
        <DashboardKpiCard
          tone="blue"
          icon="pi-list"
          :label="$t('statisticsPage.kpi.totalPayments')"
          :value="overview.total || 0"
        />
        <DashboardKpiCard
          tone="green"
          icon="pi-check-circle"
          :label="$t('statisticsPage.kpi.successful')"
          :value="overview.success || 0"
        />
        <DashboardKpiCard
          tone="yellow"
          icon="pi-times-circle"
          :label="$t('statisticsPage.kpi.failed')"
          :value="overview.failed || 0"
        />
        <DashboardKpiCard
          tone="neutral"
          icon="pi-percentage"
          :label="$t('statisticsPage.kpi.successPercent')"
          :value="`${overview.success_rate || 0}%`"
        />
      </div>

      <!-- Revenue by currency -->
      <div class="section">
        <div class="section-head">
          <h3 class="section-title">{{ $t('statisticsPage.revenueByCurrency') }}</h3>
          <p class="section-subtitle">{{ $t('statisticsPage.revenueByCurrencyHint') }}</p>
        </div>

        <div v-if="!revenue.length" class="empty-state">
          <AppIcon name="inbox" class="empty-icon" />
          <p class="empty-text">{{ $t('statisticsPage.noRevenuePeriod') }}</p>
        </div>
        <DataTable v-else :value="revenue" class="zayono-table">
          <Column field="currency" :header="$t('statisticsPage.columns.currency')">
            <template #body="{ data }">
              <span class="currency-cell">{{ data.currency }}</span>
            </template>
          </Column>
          <Column field="total" :header="$t('statisticsPage.columns.totalAmount')">
            <template #body="{ data }">
              <span class="amount-cell">{{ formatAmount(data.total, data.currency) }}</span>
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { apiFetch } = useApi()
const { handleError } = useApiError()
const { t, locale } = useI18n()

const loading = ref(true)
const dateRange = ref<Date[] | null>(null)
const overview = ref({ total: 0, success: 0, failed: 0, success_rate: 0 })
const revenue = ref<{ currency: string; total: number }[]>([])

const queryParams = () => {
  const params: Record<string, any> = { type: 'payment' }
  if (dateRange.value?.[0]) params.from = formatDate(dateRange.value[0])
  if (dateRange.value?.[1]) params.to = formatDate(dateRange.value[1])
  return params
}

const buildQuery = (params: Record<string, any>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v != null && search.set(k, String(v)))
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const load = async () => {
  loading.value = true
  try {
    const params = queryParams()
    const [overviewRes, revenueRes] = await Promise.all([
      apiFetch<{ data: any }>(`/merchant/statistics/overview${buildQuery(params)}`),
      apiFetch<{ data: any }>(`/merchant/statistics/revenue${buildQuery(params)}`),
    ])
    overview.value = overviewRes.data || overview.value
    revenue.value = revenueRes.data?.by_currency || revenueRes.data || []
  } catch (e: any) {
    handleError(e, t('statisticsPage.errorSummary'))
  } finally {
    loading.value = false
  }
}

onMounted(load)

const onDateSelect = () => {
  if (dateRange.value && dateRange.value[1]) load()
}

const formatAmount = (amount: number, currency: string) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr, { style: 'currency', currency: currency || 'XOF', minimumFractionDigits: 0 }).format(amount || 0)
}
</script>

<style scoped>
.page {
  background: transparent;
  min-height: 100%;
}

.page-subtitle {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0 0 20px;
}

.filters-row {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.loading {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.loading-card {
  border-radius: 10px !important;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.section {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
}

.section-head {
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--ze-text-strong);
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}

.section-subtitle {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0;
}

.currency-cell {
  font-weight: 600;
  color: var(--ze-text-strong);
  font-feature-settings: "tnum";
}

.amount-cell {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--ze-text-body);
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 24px;
  text-align: center;
}

.empty-icon {
  font-size: 2rem;
  color: var(--ze-text-disabled);
  margin-bottom: 12px;
}

.empty-text {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0;
}

/* Zayono DataTable styling */
.zayono-table :deep(.p-datatable-thead > tr > th) {
  background: var(--ze-bg-subtle);
  color: var(--ze-text-muted);
  font-size: 12px;
  font-weight: 500;
  text-transform: none;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ze-border);
}

.zayono-table :deep(.p-datatable-tbody > tr > td) {
  padding: 14px;
  font-size: 13px;
  color: var(--ze-text-body);
  border-bottom: 1px solid var(--ze-bg-hover);
}

.zayono-table :deep(.p-datatable-tbody > tr:last-child > td) {
  border-bottom: none;
}

@media (max-width: 1024px) {
  .kpi-grid, .loading { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .kpi-grid, .loading { grid-template-columns: 1fr; }
}
</style>
