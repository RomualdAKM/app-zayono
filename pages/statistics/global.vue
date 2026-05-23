<template>
  <div class="statistics-page">
    <p class="page-subtitle">{{ $t('statisticsPage.subtitle.global') }}</p>

    <!-- Filters row -->
    <div class="filters-row">
      <DatePicker v-model="dateRange" selectionMode="range" :manualInput="false" :placeholder="$t('statisticsPage.periodPlaceholder')" dateFormat="dd/mm/yy" showIcon class="filter-item" />
      <Select v-model="selectedCurrency" :options="currencyOptions" optionLabel="label" optionValue="value" :placeholder="$t('statisticsPage.filters.currency')" class="filter-item" />
      <Select v-model="selectedGateway" :options="gatewayOptions" optionLabel="label" optionValue="value" :placeholder="$t('statisticsPage.filters.gateway')" class="filter-item" />
      <Select v-model="selectedMethod" :options="methodOptions" optionLabel="label" optionValue="value" :placeholder="$t('statisticsPage.filters.method')" class="filter-item" />
      <button class="filter-btn" @click="applyFilters">
        <AppIcon name="search" /> {{ $t('statisticsPage.filterBtn') }}
      </button>
    </div>

    <!-- Tabs -->
    <Tabs :value="activeTab" @update:value="(v: string | number) => activeTab = String(v)">
      <TabList>
        <Tab value="overview">{{ $t('statisticsPage.tabs.overview') }}</Tab>
        <Tab value="revenus">{{ $t('statisticsPage.tabs.revenue') }}</Tab>
        <Tab value="methodes">{{ $t('statisticsPage.tabs.methods') }}</Tab>
        <Tab value="passerelles">{{ $t('statisticsPage.tabs.gateways') }}</Tab>
        <Tab value="transactions">{{ $t('statisticsPage.tabs.transactions') }}</Tab>
      </TabList>

      <!-- Tab: Overview -->
      <TabPanels>
        <TabPanel value="overview">
          <div class="tab-content">
            <!-- KPI Cards -->
            <div class="kpi-grid">
              <DashboardKpiCard
                tone="blue"
                icon="pi-list"
                :label="$t('statisticsPage.overview.totalTransactions')"
                :value="overview.total || 0"
              />
              <DashboardKpiCard
                tone="green"
                icon="pi-check-circle"
                :label="$t('statisticsPage.overview.successful')"
                :value="overview.success || 0"
              />
              <DashboardKpiCard
                tone="yellow"
                icon="pi-times-circle"
                :label="$t('statisticsPage.overview.failed')"
                :value="overview.failed || 0"
              />
              <DashboardKpiCard
                tone="neutral"
                icon="pi-percentage"
                :label="$t('statisticsPage.overview.successRate')"
                :value="`${overview.rate || 0}%`"
              />
            </div>

            <!-- Chart + Table row -->
            <div class="overview-grid">
              <!-- Pie Chart -->
              <div class="stat-card">
                <div class="stat-card-head">
                  <h3 class="stat-card-title">{{ $t('statisticsPage.overview.statusDistribution') }}</h3>
                  <p class="stat-card-subtitle">{{ $t('statisticsPage.overview.statusDistributionHint') }}</p>
                </div>
                <div v-if="hasStatusData" class="chart-container">
                  <Chart type="pie" :data="statusChartData" :options="pieOptions" />
                </div>
                <div v-else class="empty-state">
                  <AppIcon name="inbox" class="empty-icon" />
                  <p class="empty-text">{{ $t('statisticsPage.overview.chartComing') }}</p>
                </div>
                <div v-if="hasStatusData" class="chart-legend">
                  <span class="legend-item"><span class="legend-dot" style="background:#22C55E"></span> {{ $t('statisticsPage.legend.success') }}</span>
                  <span class="legend-item"><span class="legend-dot" style="background:#EF4444"></span> {{ $t('statisticsPage.legend.failed') }}</span>
                  <span class="legend-item"><span class="legend-dot" style="background:#F59E0B"></span> {{ $t('statisticsPage.legend.pending') }}</span>
                  <span class="legend-item"><span class="legend-dot" style="background:#6B7280"></span> {{ $t('statisticsPage.legend.cancelled') }}</span>
                </div>
              </div>

              <!-- Revenue by currency table -->
              <div class="stat-card">
                <div class="stat-card-head">
                  <h3 class="stat-card-title">{{ $t('statisticsPage.revenueByCurrency') }}</h3>
                  <p class="stat-card-subtitle">{{ $t('statisticsPage.overview.revenueByCurrencyHint') }}</p>
                </div>
                <div v-if="!overview.by_currency || !overview.by_currency.length" class="empty-state">
                  <AppIcon name="inbox" class="empty-icon" />
                  <p class="empty-text">{{ $t('statisticsPage.noDataPeriod') }}</p>
                </div>
                <DataTable v-else :value="overview.by_currency" class="zayono-table">
                  <Column field="currency" :header="$t('statisticsPage.columns.currency')" />
                  <Column field="total_amount" :header="$t('statisticsPage.columns.totalAmount')">
                    <template #body="{ data }"><span class="num-cell">{{ formatCurrency(data.total_amount, data.currency) }}</span></template>
                  </Column>
                  <Column field="count" :header="$t('statisticsPage.columns.transactions')">
                    <template #body="{ data }"><span class="num-cell">{{ formatNumber(data.count) }}</span></template>
                  </Column>
                  <Column field="success_rate" :header="$t('statisticsPage.columns.successRate')">
                    <template #body="{ data }">
                      <Tag :severity="data.success_rate >= 80 ? 'success' : data.success_rate >= 50 ? 'warn' : 'danger'" :value="`${data.success_rate}%`" />
                    </template>
                  </Column>
                </DataTable>
              </div>
            </div>
          </div>
        </TabPanel>

        <!-- Tab: Revenus -->
        <TabPanel value="revenus">
          <div class="tab-content">
            <div class="kpi-grid kpi-grid-3">
              <DashboardKpiCard
                tone="blue"
                icon="pi-wallet"
                :label="$t('statisticsPage.kpi.totalRevenue')"
                :value="formatCurrency(revenueData.total_revenue)"
              />
              <DashboardKpiCard
                tone="green"
                icon="pi-calendar"
                :label="$t('statisticsPage.kpi.todayRevenue')"
                :value="formatCurrency(revenueData.today_revenue)"
              />
              <DashboardKpiCard
                tone="yellow"
                icon="pi-chart-line"
                :label="$t('statisticsPage.kpi.monthRevenue')"
                :value="formatCurrency(revenueData.month_revenue)"
              />
            </div>

            <div class="stat-card">
              <div class="stat-card-head">
                <h3 class="stat-card-title">{{ $t('statisticsPage.revenue.title') }}</h3>
                <p class="stat-card-subtitle">{{ $t('statisticsPage.revenue.subtitle') }}</p>
              </div>
              <div v-if="hasDailyRevenue" class="chart-container chart-wide">
                <Chart type="bar" :data="revenueChartData" :options="barOptions" />
              </div>
              <div v-else class="empty-state">
                <AppIcon name="inbox" class="empty-icon" />
                <p class="empty-text">{{ $t('statisticsPage.overview.chartComing') }}</p>
              </div>
            </div>
          </div>
        </TabPanel>

        <!-- Tab: Méthodes -->
        <TabPanel value="methodes">
          <div class="tab-content">
            <div class="stat-card">
              <div class="stat-card-head">
                <h3 class="stat-card-title">{{ $t('statisticsPage.methodsTab.title') }}</h3>
                <p class="stat-card-subtitle">{{ $t('statisticsPage.methodsTab.subtitle') }}</p>
              </div>
              <div v-if="!methodsData.length" class="empty-state">
                <AppIcon name="inbox" class="empty-icon" />
                <p class="empty-text">{{ $t('statisticsPage.noDataPeriod') }}</p>
              </div>
              <DataTable v-else :value="methodsData" class="zayono-table">
                <Column field="method" :header="$t('statisticsPage.columns.method')" />
                <Column field="count" :header="$t('statisticsPage.columns.transactions')" sortable>
                  <template #body="{ data }"><span class="num-cell">{{ formatNumber(data.count) }}</span></template>
                </Column>
                <Column field="amount" :header="$t('statisticsPage.columns.totalAmount')">
                  <template #body="{ data }"><span class="num-cell">{{ formatCurrency(data.amount) }}</span></template>
                </Column>
                <Column field="rate" :header="$t('statisticsPage.columns.successRate')">
                  <template #body="{ data }">
                    <Tag :severity="data.rate >= 80 ? 'success' : data.rate >= 50 ? 'warn' : 'danger'" :value="`${data.rate}%`" />
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>
        </TabPanel>

        <!-- Tab: Passerelles -->
        <TabPanel value="passerelles">
          <div class="tab-content">
            <div class="stat-card">
              <div class="stat-card-head">
                <h3 class="stat-card-title">{{ $t('statisticsPage.gatewaysTab.title') }}</h3>
                <p class="stat-card-subtitle">{{ $t('statisticsPage.gatewaysTab.subtitle') }}</p>
              </div>
              <div v-if="!gatewaysData.length" class="empty-state">
                <AppIcon name="inbox" class="empty-icon" />
                <p class="empty-text">{{ $t('statisticsPage.noDataPeriod') }}</p>
              </div>
              <DataTable v-else :value="gatewaysData" class="zayono-table">
                <Column field="gateway" :header="$t('statisticsPage.columns.gateway')" />
                <Column field="count" :header="$t('statisticsPage.columns.transactions')" sortable>
                  <template #body="{ data }"><span class="num-cell">{{ formatNumber(data.count) }}</span></template>
                </Column>
                <Column field="amount" :header="$t('statisticsPage.columns.totalAmount')">
                  <template #body="{ data }"><span class="num-cell">{{ formatCurrency(data.amount) }}</span></template>
                </Column>
                <Column field="rate" :header="$t('statisticsPage.columns.successRate')">
                  <template #body="{ data }">
                    <Tag :severity="data.rate >= 80 ? 'success' : data.rate >= 50 ? 'warn' : 'danger'" :value="`${data.rate}%`" />
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>
        </TabPanel>

        <!-- Tab: Transactions -->
        <TabPanel value="transactions">
          <div class="tab-content">
            <div class="stat-card">
              <div class="stat-card-head">
                <h3 class="stat-card-title">{{ $t('statisticsPage.transactionsTab.title') }}</h3>
                <p class="stat-card-subtitle">{{ $t('statisticsPage.transactionsTab.subtitle') }}</p>
              </div>
              <div v-if="!transactionsData.length" class="empty-state">
                <AppIcon name="inbox" class="empty-icon" />
                <p class="empty-text">{{ $t('statisticsPage.noTransactionPeriod') }}</p>
              </div>
              <DataTable v-else :value="transactionsData" paginator :rows="20" class="zayono-table">
                <Column field="created_at" :header="$t('statisticsPage.columns.date')">
                  <template #body="{ data }">{{ formatDate(data.created_at) }}</template>
                </Column>
                <Column field="amount" :header="$t('statisticsPage.columns.amount')">
                  <template #body="{ data }"><span class="num-cell">{{ formatCurrency(data.amount, data.currency) }}</span></template>
                </Column>
                <Column field="status" :header="$t('statisticsPage.columns.status')">
                  <template #body="{ data }">
                    <Tag :severity="statusSeverity(data.status)" :value="statusLabel(data.status)" />
                  </template>
                </Column>
                <Column field="operator" :header="$t('statisticsPage.columns.method')" />
                <Column field="aggregator_code" :header="$t('statisticsPage.columns.gateway')" />
              </DataTable>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
// All fetches go through useApi so the X-Zayono-Application header is
// applied automatically — using $fetch directly here used to send stats
// scoped to a non-existent app context after the multi-app refactor.
const { apiFetch } = useApi()
const { t, locale } = useI18n()

const activeTab = ref('overview')
const dateRange = ref<Date[] | null>(null)
const selectedCurrency = ref('')
const selectedGateway = ref('')
const selectedMethod = ref('')

const currencyOptions = computed(() => [
  { label: t('statisticsPage.filters.allCurrencies'), value: '' },
  { label: 'XOF', value: 'XOF' },
  { label: 'XAF', value: 'XAF' },
  { label: 'GNF', value: 'GNF' },
  { label: 'KES', value: 'KES' },
  { label: 'GHS', value: 'GHS' },
])

// Gateway picker is fed by the live aggregator catalogue rather than a
// hardcoded list — keeps PAL Africa, Hub2 country variants and any
// future driver in sync without touching this file.
const { load: loadAggregatorCatalog, asSelectOptions } = useAggregatorCatalog()
onMounted(() => loadAggregatorCatalog())
const gatewayOptions = computed(() => asSelectOptions({ includeAll: true }))

const methodOptions = computed(() => [
  { label: t('statisticsPage.filters.allCurrencies'), value: '' },
  { label: 'MTN MoMo', value: 'MTN MoMo' },
  { label: 'Orange Money', value: 'Orange Money' },
  { label: 'Moov Money', value: 'Moov Money' },
  { label: 'Wave', value: 'Wave' },
  { label: 'Airtel Money', value: 'Airtel Money' },
  { label: 'Free Money', value: 'Free Money' },
])

// State
const overview = ref<any>({ total: 0, success: 0, failed: 0, pending: 0, cancelled: 0, rate: 0, by_status: [], by_currency: [] })
const revenueData = ref<any>({ total_revenue: 0, today_revenue: 0, month_revenue: 0, daily: [] })
const methodsData = ref<any[]>([])
const gatewaysData = ref<any[]>([])
const transactionsData = ref<any[]>([])

// Build query params
function buildParams() {
  const params: Record<string, string> = {}
  if (selectedCurrency.value) params.currency = selectedCurrency.value
  if (selectedGateway.value) params.aggregator = selectedGateway.value
  if (selectedMethod.value) params.operator = selectedMethod.value
  if (dateRange.value && dateRange.value[0]) {
    params.from = dateRange.value[0].toISOString().split('T')[0]
  }
  if (dateRange.value && dateRange.value[1]) {
    params.to = dateRange.value[1].toISOString().split('T')[0]
  }
  return params
}

function queryString(params: Record<string, string>) {
  const entries = Object.entries(params).filter(([, v]) => v)
  if (!entries.length) return ''
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
}

// Fetch functions
async function fetchOverview() {
  try {
    const res = await apiFetch<any>(`/merchant/statistics/overview${queryString(buildParams())}`)
    overview.value = res.data
  } catch (e) {
    console.error('Failed to fetch overview', e)
  }
}

async function fetchRevenue() {
  try {
    const res = await apiFetch<any>(`/merchant/statistics/revenue${queryString(buildParams())}`)
    revenueData.value = res.data
  } catch (e) {
    console.error('Failed to fetch revenue', e)
  }
}

async function fetchMethods() {
  try {
    const res = await apiFetch<any>(`/merchant/statistics/methods${queryString(buildParams())}`)
    methodsData.value = res.data
  } catch (e) {
    console.error('Failed to fetch methods', e)
  }
}

async function fetchGateways() {
  try {
    const res = await apiFetch<any>(`/merchant/statistics/gateways${queryString(buildParams())}`)
    gatewaysData.value = res.data
  } catch (e) {
    console.error('Failed to fetch gateways', e)
  }
}

async function fetchTransactions() {
  try {
    const res = await apiFetch<any>(`/merchant/statistics/transactions${queryString(buildParams())}`)
    transactionsData.value = res.data?.data || res.data || []
  } catch (e) {
    console.error('Failed to fetch transactions', e)
  }
}

function applyFilters() {
  fetchAll()
}

function fetchAll() {
  fetchOverview()
  fetchRevenue()
  fetchMethods()
  fetchGateways()
  fetchTransactions()
}

onMounted(() => {
  fetchAll()
})

// Charts
const hasStatusData = computed(() =>
  (overview.value.success || 0) + (overview.value.failed || 0) + (overview.value.pending || 0) + (overview.value.cancelled || 0) > 0
)

const hasDailyRevenue = computed(() => (revenueData.value.daily || []).length > 0)

const statusChartData = computed(() => ({
  labels: [t('statisticsPage.legend.success'), t('statisticsPage.legend.failed'), t('statisticsPage.legend.pending'), t('statisticsPage.legend.cancelled')],
  datasets: [{
    data: [overview.value.success, overview.value.failed, overview.value.pending, overview.value.cancelled],
    backgroundColor: ['#22C55E', '#EF4444', '#F59E0B', '#6B7280'],
    borderWidth: 0,
  }],
}))

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
}

const revenueChartData = computed(() => {
  const daily = revenueData.value.daily || []
  return {
    labels: daily.map((d: any) => d.date),
    datasets: [{
      label: t('statisticsPage.revenue.dataset'),
      data: daily.map((d: any) => d.total),
      backgroundColor: '#2563EB',
      borderRadius: 4,
    }],
  }
})

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
    x: { grid: { display: false } },
  },
}

// Helpers
function formatNumber(val: number) {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr).format(val || 0)
}

function formatCurrency(amount: number, currency: string = 'XOF') {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr, {
    style: 'currency',
    currency: currency || 'XOF',
    minimumFractionDigits: 0,
  }).format(amount || 0)
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(dateStr).toLocaleDateString(localeStr, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusSeverity(status: string) {
  const map: Record<string, string> = {
    success: 'success',
    failed: 'danger',
    pending: 'warn',
    initiated: 'warn',
    cancelled: 'secondary',
  }
  return map[status] || 'secondary'
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    success: t('statisticsPage.statusLabel.success'),
    failed: t('statisticsPage.statusLabel.failed'),
    pending: t('statisticsPage.statusLabel.pending'),
    initiated: t('statisticsPage.statusLabel.initiated'),
    cancelled: t('statisticsPage.statusLabel.cancelled'),
  }
  return map[status] || status
}
</script>

<style scoped>
.statistics-page {
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
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-item {
  min-width: 160px;
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--ze-brand);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.filter-btn:hover { background: var(--ze-brand-hover); }

.tab-content { padding-top: 24px; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 16px;
}

.stat-card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
}

.stat-card-head {
  margin-bottom: 16px;
}

.stat-card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--ze-text-strong);
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}

.stat-card-subtitle {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0;
}

.chart-container {
  height: 260px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-container :deep(canvas) {
  max-width: 100%;
}

.chart-wide { height: 300px; }

.chart-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  padding-top: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--ze-text-label);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.num-cell {
  font-variant-numeric: tabular-nums;
}

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
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .kpi-grid-3 { grid-template-columns: 1fr; }
  .overview-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .filters-row { flex-direction: column; align-items: stretch; }
  .filter-item { min-width: 100%; }
}

@media (max-width: 480px) {
  .statistics-page :deep(.p-tablist),
  .statistics-page :deep([role="tablist"]) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
