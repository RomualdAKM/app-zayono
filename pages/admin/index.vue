<template>
  <div class="admin-dashboard">
    <div class="page-header">
      <h1 class="page-title">{{ $t('admin.dashboard.title') }}</h1>
      <p class="page-subtitle">{{ $t('admin.dashboard.subtitle') }}</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon"><AppIcon name="users" /></div>
        <div class="kpi-content">
          <span class="kpi-value">{{ dashboard?.merchants.total ?? 0 }}</span>
          <span class="kpi-label">{{ $t('admin.dashboard.kpi.merchants') }}</span>
        </div>
        <Tag :value="t('admin.dashboard.kpi.newToday', { n: dashboard?.merchants.new_today ?? 0 })" severity="info" />
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><AppIcon name="credit-card" /></div>
        <div class="kpi-content">
          <span class="kpi-value">{{ dashboard?.transactions.today ?? 0 }}</span>
          <span class="kpi-label">{{ $t('admin.dashboard.kpi.txToday') }}</span>
        </div>
        <Tag :value="t('admin.dashboard.kpi.weekTx', { n: dashboard?.transactions.week ?? 0 })" severity="secondary" />
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><AppIcon name="wallet" /></div>
        <div class="kpi-content">
          <span class="kpi-value">{{ formatVolumeXof(dashboard?.volume.today ?? 0) }}</span>
          <span class="kpi-label">{{ $t('admin.dashboard.kpi.volumeToday') }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><AppIcon name="chart-line" /></div>
        <div class="kpi-content">
          <!--
            Zayono platform revenue is USD-denominated (platform_billing
            business model — $0.005/tx flat accrual). Volume above stays
            XOF (transaction native currency).
          -->
          <span class="kpi-value">{{ formatRevenueUsd(dashboard?.revenue.today ?? 0) }}</span>
          <span class="kpi-label">{{ $t('admin.dashboard.kpi.revenueZayono') }}</span>
        </div>
        <Tag :value="t('admin.dashboard.kpi.perMonth', { amount: formatRevenueUsd(dashboard?.revenue.month ?? 0) })" severity="success" />
      </div>
    </div>

    <div class="section-card revenue-chart-card">
      <div class="section-header">
        <div>
          <h3>{{ $t('admin.dashboard.revenueChart') }}</h3>
          <p class="section-subtitle">
            {{ $t('admin.dashboard.revenueChartSubtitle') }}
          </p>
        </div>
        <div class="revenue-totals">
          <div class="revenue-total">
            <span class="revenue-total-label">{{ $t('admin.dashboard.totalPeriod') }}</span>
            <span class="revenue-total-value">{{ formatRevenueUsd(revenueMonthly?.total_revenue ?? 0) }}</span>
          </div>
          <div class="revenue-total">
            <span class="revenue-total-label">{{ $t('admin.dashboard.volumeProcessed') }}</span>
            <span class="revenue-total-value muted">{{ formatVolumeXof(revenueMonthly?.total_volume ?? 0) }}</span>
          </div>
        </div>
      </div>
      <div class="revenue-chart-wrapper">
        <Chart v-if="revenueMonthly" type="bar" :data="revenueChartData" :options="revenueChartOptions" />
        <div v-else class="chart-loading">
          <ProgressSpinner style="width: 28px; height: 28px" />
        </div>
      </div>
    </div>

    <div class="section-grid">
      <div class="section-card">
        <div class="section-header">
          <h3>{{ $t('admin.dashboard.recentTransactions') }}</h3>
          <NuxtLink to="/admin/transactions" class="section-link">{{ $t('admin.dashboard.viewAll') }}</NuxtLink>
        </div>
        <DataTable :value="dashboard?.recent_transactions ?? []" :rows="5" stripedRows size="small">
          <Column field="id" :header="$t('admin.dashboard.columns.id')">
            <template #body="{ data }">
              <span class="mono-text">{{ data.id.slice(0, 12) }}...</span>
            </template>
          </Column>
          <Column :header="$t('admin.dashboard.columns.merchant')">
            <template #body="{ data }">
              {{ data.merchant?.company_name ?? '-' }}
            </template>
          </Column>
          <Column field="amount" :header="$t('admin.dashboard.columns.amount')">
            <template #body="{ data }">
              {{ formatVolumeXof(parseFloat(data.amount)) }} {{ data.currency }}
            </template>
          </Column>
          <Column field="status" :header="$t('admin.dashboard.columns.status')">
            <template #body="{ data }">
              <Tag :value="te(`status.${data.status}`) ? t(`status.${data.status}`) : data.status" :severity="getStatusSeverity(data.status)" />
            </template>
          </Column>
          <Column field="operator" :header="$t('admin.dashboard.columns.operator')">
            <template #body="{ data }">
              {{ data.operator ?? '-' }}
            </template>
          </Column>
        </DataTable>
      </div>

      <div class="section-card">
        <div class="section-header">
          <h3>{{ $t('admin.dashboard.aggregators') }}</h3>
          <NuxtLink to="/admin/aggregators" class="section-link">{{ $t('admin.dashboard.viewAll') }}</NuxtLink>
        </div>
        <div class="aggregator-list">
          <div v-for="agg in aggregators" :key="agg.code" class="aggregator-item">
            <div class="aggregator-status">
              <span :class="['status-dot', agg.status]"></span>
              <span class="aggregator-name">{{ agg.name }}</span>
            </div>
            <div class="aggregator-stats">
              <span class="agg-stat">{{ agg.success_rate }}%</span>
              <span class="agg-label">{{ $t('admin.dashboard.successRate') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="section-card" style="margin-top: 16px;">
      <div class="section-header">
        <h3>{{ $t('admin.dashboard.newMerchants') }}</h3>
        <NuxtLink to="/admin/merchants" class="section-link">{{ $t('admin.dashboard.viewAll') }}</NuxtLink>
      </div>
      <DataTable :value="dashboard?.recent_merchants ?? []" :rows="5" stripedRows size="small">
        <Column field="name" :header="$t('admin.dashboard.columns.name')" />
        <Column field="email" :header="$t('admin.dashboard.columns.email')" />
        <Column field="company_name" :header="$t('admin.dashboard.columns.company')" />
        <Column :header="$t('admin.dashboard.columns.status')">
          <template #body="{ data }">
            <Tag :value="data.is_active ? t('admin.merchants.active') : t('admin.merchants.suspended')" :severity="data.is_active ? 'success' : 'danger'" />
          </template>
        </Column>
        <Column :header="$t('admin.dashboard.registeredOn')">
          <template #body="{ data }">
            {{ formatDate(data.created_at) }}
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const adminStore = useAdminStore()
const { apiFetch } = useApi()
const { t, te, locale } = useI18n()

const revenueMonthly = ref<{
  series: Array<{ month: string; label: string; revenue: number; transaction_count: number; volume: number }>
  total_revenue: number
  total_volume: number
  total_transactions: number
} | null>(null)

onMounted(() => {
  adminStore.fetchDashboard()
  adminStore.fetchAggregators()
  loadRevenueMonthly()
})

const loadRevenueMonthly = async () => {
  try {
    const res = await apiFetch<{ success: boolean; data: typeof revenueMonthly['value'] }>(
      '/admin/dashboard/revenue-monthly?months=12',
    )
    revenueMonthly.value = res.data
  } catch {
    revenueMonthly.value = { series: [], total_revenue: 0, total_volume: 0, total_transactions: 0 }
  }
}

const revenueChartData = computed(() => {
  const series = revenueMonthly.value?.series ?? []
  return {
    labels: series.map(p => p.label),
    datasets: [
      {
        label: t('admin.dashboard.kpi.revenueZayono'),
        data: series.map(p => p.revenue),
        backgroundColor: '#047857',
        borderRadius: 4,
      },
    ],
  }
})

const revenueChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        // Revenue chart is platform revenue → USD (not XOF).
        label: (ctx: any) => `${formatRevenueUsd(ctx.parsed.y)}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: '#f3f4f6' },
      ticks: { callback: (value: any) => formatRevenueUsd(Number(value)) },
    },
    x: { grid: { display: false } },
  },
}

const dashboard = computed(() => adminStore.dashboard)
const aggregators = computed(() => adminStore.aggregators)

// Two formatters — one per currency. Platform revenue is USD
// (platform_billing model), tx volume is XOF (native currency).
// Mixing them under a single XOF helper was producing "Revenu Zayono:
// 2 F CFA" instead of "$0.01".
const formatRevenueUsd = (amount: number) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

const formatVolumeXof = (amount: number) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr, {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount || 0)
}

const formatDate = (date: string) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(date).toLocaleDateString(localeStr, { day: '2-digit', month: 'short', year: 'numeric' })
}

const getStatusSeverity = (status: string) => {
  const map: Record<string, string> = { success: 'success', failed: 'danger', pending: 'warn', initiated: 'info' }
  return map[status] ?? 'secondary'
}
</script>

<style scoped>
.admin-dashboard { max-width: 1400px; }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0; }
.page-subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
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
.kpi-value { font-size: 20px; font-weight: 700; color: #1a1a2e; }
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
.section-link { font-size: 12px; color: #6366f1; text-decoration: none; font-weight: 500; }
.section-link:hover { text-decoration: underline; }

.mono-text { font-family: monospace; font-size: 12px; color: #6b7280; }

.aggregator-list { display: flex; flex-direction: column; gap: 10px; }
.aggregator-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
.aggregator-item:last-child { border-bottom: none; }
.aggregator-status { display: flex; align-items: center; gap: 8px; }
.aggregator-name { font-size: 13px; font-weight: 500; color: #374151; }
.aggregator-stats { text-align: right; }
.agg-stat { font-size: 14px; font-weight: 600; color: #1a1a2e; }
.agg-label { font-size: 11px; color: #9ca3af; margin-left: 4px; }

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.status-dot.healthy { background: #10b981; }
.status-dot.degraded { background: #f59e0b; }
.status-dot.down { background: #ef4444; }
.status-dot.unknown { background: #9ca3af; }

.revenue-chart-card {
  margin-bottom: 16px;
}

.revenue-chart-card .section-header {
  align-items: flex-start;
}

.section-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin: 4px 0 0 0;
}

.revenue-totals {
  display: flex;
  gap: 24px;
  align-items: center;
}

.revenue-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.revenue-total-label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.revenue-total-value {
  font-size: 16px;
  font-weight: 700;
  color: #047857;
}

.revenue-total-value.muted {
  color: #1a1a2e;
}

.revenue-chart-wrapper {
  height: 260px;
  position: relative;
}

.chart-loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .section-grid { grid-template-columns: 1fr; }
  .revenue-chart-card .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .revenue-totals {
    justify-content: flex-start;
  }
  .revenue-total {
    align-items: flex-start;
  }
}
</style>
