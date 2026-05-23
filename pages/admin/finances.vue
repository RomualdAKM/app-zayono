<template>
  <div class="admin-finances">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ $t('admin.finances.title') }}</h1>
        <p class="page-subtitle" v-html="$t('admin.finances.subtitle')"></p>
      </div>
      <div class="period-selector">
        <label class="period-label">{{ $t('admin.finances.period') }}</label>
        <SelectButton
          v-model="period"
          :options="periodOptions"
          optionLabel="label"
          optionValue="value"
          @change="onPeriodChange"
        />
      </div>
    </div>

    <!-- KPI row -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon"><AppIcon name="wallet" /></div>
        <div class="kpi-content">
          <span class="kpi-value">{{ formatCurrency(stats?.total_revenue ?? 0) }}</span>
          <span class="kpi-label">{{ $t('admin.finances.kpi.platformRevenue') }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><AppIcon name="chart-line" /></div>
        <div class="kpi-content">
          <span class="kpi-value">{{ formatCurrency(stats?.total_volume ?? 0) }}</span>
          <span class="kpi-label">{{ $t('admin.finances.kpi.txVolume') }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><AppIcon name="credit-card" /></div>
        <div class="kpi-content">
          <span class="kpi-value">{{ stats?.total_transactions ?? 0 }}</span>
          <span class="kpi-label">{{ $t('admin.finances.kpi.successfulTx') }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><AppIcon name="percentage" /></div>
        <div class="kpi-content">
          <span class="kpi-value">{{ effectiveRate.toFixed(3) }}%</span>
          <span class="kpi-label">{{ $t('admin.finances.kpi.effectiveRate') }}</span>
        </div>
      </div>
    </div>

    <!-- Chart + top merchants -->
    <div class="section-grid">
      <div class="section-card chart-card">
        <div class="section-header">
          <h3>{{ t('admin.finances.monthlyEvolution', { months: monthsLabel }) }}</h3>
        </div>
        <div class="chart-wrapper">
          <Chart v-if="monthly" type="bar" :data="monthlyChartData" :options="monthlyChartOptions" />
          <div v-else class="chart-loading">
            <ProgressSpinner style="width: 28px; height: 28px" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <h3>{{ $t('admin.finances.topMerchants') }}</h3>
          <span class="period-hint">{{ topPeriodLabel }}</span>
        </div>
        <div v-if="topMerchants.length === 0 && !topLoading" class="empty-state">
          <AppIcon name="info-circle" />
          <p>{{ $t('admin.finances.noTxPeriod') }}</p>
        </div>
        <ul v-else class="merchant-list">
          <li v-for="(m, idx) in topMerchants" :key="m.id" class="merchant-item" @click="openMerchant(m.id)">
            <span class="merchant-rank">#{{ idx + 1 }}</span>
            <div class="merchant-info">
              <span class="merchant-name">{{ m.company_name || m.name }}</span>
              <span class="merchant-meta">{{ m.success_count }} {{ $t('admin.finances.txCount') }} · {{ m.zayono_fee_percent.toFixed(3) }}%</span>
            </div>
            <span class="merchant-revenue">{{ formatCurrency(m.revenue) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const router = useRouter()
const { apiFetch } = useApi()
const { t, locale } = useI18n()

const period = ref<number>(30) // days; 0 = all-time
const periodOptions = computed(() => [
  { label: t('admin.finances.periodOptions.days7'), value: 7 },
  { label: t('admin.finances.periodOptions.days30'), value: 30 },
  { label: t('admin.finances.periodOptions.days90'), value: 90 },
  { label: t('admin.finances.periodOptions.all'), value: 0 },
])

interface PlatformStats {
  total_revenue: number
  total_volume: number
  total_transactions: number
  total_merchants: number
  active_merchants: number
  period_days: number
}

interface MonthlyPoint {
  month: string
  label: string
  revenue: number
  transaction_count: number
  volume: number
}

interface TopMerchant {
  id: string
  name: string
  company_name: string | null
  email: string
  zayono_fee_percent: number
  revenue: number
  success_count: number
  is_active: boolean
}

const stats = ref<PlatformStats | null>(null)
const monthly = ref<{ series: MonthlyPoint[]; total_revenue: number; total_volume: number; total_transactions: number } | null>(null)
const topMerchants = ref<TopMerchant[]>([])
const topLoading = ref(false)

const monthsLabel = computed(() => t('admin.finances.monthsCount', { n: monthly.value?.series.length ?? 12 }))
const topPeriodLabel = computed(() => {
  const opt = periodOptions.value.find(p => p.value === period.value)
  return opt?.label ?? t('admin.finances.periodOptions.days30')
})

// Effective realised rate = revenue / volume. Tells the admin whether the
// per-merchant fee config is actually generating the expected 0.1%, or if
// custom higher fees are pulling the average up.
const effectiveRate = computed(() => {
  const r = stats.value?.total_revenue ?? 0
  const v = stats.value?.total_volume ?? 0
  return v > 0 ? (r / v) * 100 : 0
})

const monthlyChartData = computed(() => {
  const series = monthly.value?.series ?? []
  return {
    labels: series.map(p => p.label),
    datasets: [
      {
        label: t('admin.finances.revenueLabel'),
        data: series.map(p => p.revenue),
        backgroundColor: '#047857',
        borderRadius: 4,
      },
    ],
  }
})

const monthlyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => formatCurrency(ctx.parsed.y),
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: '#f3f4f6' },
      ticks: { callback: (v: any) => formatCurrency(Number(v)) },
    },
    x: { grid: { display: false } },
  },
}

onMounted(async () => {
  await Promise.all([loadStats(), loadMonthly(), loadTop()])
})

async function loadStats() {
  // Backend expects `period` in days. 0 means all-time on our side; we
  // pass a very large window in that case.
  const params = period.value > 0 ? `?period=${period.value}` : '?period=3650'
  try {
    const res = await apiFetch<{ success: boolean; data: PlatformStats }>(`/admin/merchants/statistics${params}`)
    stats.value = res.data
  } catch {
    stats.value = null
  }
}

async function loadMonthly() {
  // Show 12 months on the chart regardless of the KPI period — admins like
  // to see the yearly trend even when zooming in on a short window above.
  try {
    const res = await apiFetch<{ success: boolean; data: any }>('/admin/dashboard/revenue-monthly?months=12')
    monthly.value = res.data
  } catch {
    monthly.value = { series: [], total_revenue: 0, total_volume: 0, total_transactions: 0 }
  }
}

async function loadTop() {
  topLoading.value = true
  try {
    const res = await apiFetch<{ success: boolean; data: { merchants: TopMerchant[] } }>(
      `/admin/merchants/top?limit=10&days=${period.value}`,
    )
    topMerchants.value = res.data.merchants ?? []
  } catch {
    topMerchants.value = []
  } finally {
    topLoading.value = false
  }
}

function onPeriodChange() {
  // KPIs + top list both follow the period selector. The monthly chart
  // stays on a 12-month rolling window because that's the natural unit
  // for "year-over-year trend".
  loadStats()
  loadTop()
}

function openMerchant(id: string) {
  router.push(`/admin/merchants/${id}`)
}

function formatCurrency(amount: number) {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr, { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount || 0)
}
</script>

<style scoped>
.admin-finances { max-width: 1400px; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.page-title { font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0; }
.page-subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; max-width: 640px; line-height: 1.5; }

.period-selector { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.period-label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.kpi-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.kpi-icon {
  width: 36px;
  height: 36px;
  background: #f3f4f6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4b5563;
  font-size: 16px;
}

.kpi-content { flex: 1; display: flex; flex-direction: column; }
.kpi-value { font-size: 18px; font-weight: 700; color: #1a1a2e; }
.kpi-label { font-size: 12px; color: #6b7280; margin-top: 2px; }

.section-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

.section-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 { font-size: 14px; font-weight: 600; color: #1a1a2e; margin: 0; }
.period-hint { font-size: 11px; color: #6b7280; }

.chart-wrapper { height: 280px; position: relative; }
.chart-loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.merchant-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.merchant-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.merchant-item:hover { background: #f9fafb; }

.merchant-rank {
  font-size: 12px;
  font-weight: 700;
  color: #9ca3af;
  min-width: 24px;
}

.merchant-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.merchant-name {
  font-size: 13px;
  font-weight: 500;
  color: #1a1a2e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.merchant-meta { font-size: 11px; color: #6b7280; }

.merchant-revenue {
  font-size: 13px;
  font-weight: 600;
  color: #047857;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 16px;
  color: #9ca3af;
}
.empty-state i { font-size: 18px; }
.empty-state p { font-size: 13px; margin: 0; }

@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .section-grid { grid-template-columns: 1fr; }
}
</style>
