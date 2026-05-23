<template>
  <div class="admin-aggregators">
    <div class="page-header">
      <h1 class="page-title">{{ $t('admin.aggregators.title') }}</h1>
      <p class="page-subtitle">{{ $t('admin.aggregators.subtitle') }}</p>
    </div>

    <div class="aggregator-grid">
      <div v-for="agg in aggregators" :key="agg.code" class="aggregator-card">
        <div class="card-header">
          <div class="card-title-row">
            <span :class="['status-dot', agg.status]"></span>
            <h3 class="agg-name">{{ agg.name }}</h3>
          </div>
          <Tag :value="getStatusLabel(agg.status)" :severity="getStatusTagSeverity(agg.status)" />
        </div>

        <div class="card-stats">
          <div class="stat-row">
            <span class="stat-label">{{ $t('admin.aggregators.transactions') }}</span>
            <span class="stat-value">{{ agg.total_transactions.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US') }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">{{ $t('admin.aggregators.successRate') }}</span>
            <span class="stat-value" :style="{ color: agg.success_rate >= 90 ? '#10b981' : agg.success_rate >= 80 ? '#f59e0b' : '#ef4444' }">{{ agg.success_rate }}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">{{ $t('admin.aggregators.totalVolume') }}</span>
            <span class="stat-value">{{ formatCurrency(agg.total_volume) }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">{{ $t('admin.aggregators.lastActivity') }}</span>
            <span class="stat-value">{{ agg.last_activity ? formatRelative(agg.last_activity) : $t('common.neverActivity') }}</span>
          </div>
        </div>

        <div class="card-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: agg.success_rate + '%', background: agg.success_rate >= 90 ? '#10b981' : agg.success_rate >= 80 ? '#f59e0b' : '#ef4444' }"></div>
          </div>
          <span class="progress-label">{{ t('admin.aggregators.successfulOf', { success: agg.successful_transactions, total: agg.total_transactions }) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const adminStore = useAdminStore()
const { t, locale } = useI18n()

onMounted(() => {
  adminStore.fetchAggregators()
})

const aggregators = computed(() => adminStore.aggregators)

const formatCurrency = (amount: number) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr, { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount)
}

const formatRelative = (date: string) => {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return t('common.minAgo', { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('common.hourAgo', { n: hours })
  return t('common.dayAgo', { n: Math.floor(hours / 24) })
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    healthy: t('status.operational'),
    degraded: t('status.degraded'),
    down: t('status.down'),
    unknown: t('status.unknown'),
  }
  return map[status] ?? status
}

const getStatusTagSeverity = (status: string) => {
  const map: Record<string, string> = { healthy: 'success', degraded: 'warn', down: 'danger', unknown: 'secondary' }
  return map[status] ?? 'secondary'
}
</script>

<style scoped>
.admin-aggregators { max-width: 1400px; }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0; }
.page-subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }

.aggregator-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.aggregator-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agg-name { font-size: 16px; font-weight: 600; color: #1a1a2e; margin: 0; }

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.status-dot.healthy { background: #10b981; }
.status-dot.degraded { background: #f59e0b; }
.status-dot.down { background: #ef4444; }
.status-dot.unknown { background: #9ca3af; }

.card-stats { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.stat-row { display: flex; justify-content: space-between; align-items: center; }
.stat-label { font-size: 13px; color: #6b7280; }
.stat-value { font-size: 13px; font-weight: 600; color: #1a1a2e; }

.card-progress { border-top: 1px solid #f3f4f6; padding-top: 12px; }
.progress-bar { height: 6px; background: #f3f4f6; border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
.progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
.progress-label { font-size: 11px; color: #9ca3af; }
</style>
