<template>
  <div class="dashboard-page">
    <div class="kpi-row">
      <DashboardKpiCard
        icon="pi-clock"
        tone="blue"
        :label="$t('dashboard.kpi.totalPayments')"
        :value="stats.total_payments"
      />
      <DashboardKpiCard
        icon="pi-send"
        tone="green"
        :label="$t('dashboard.kpi.totalPayouts')"
        :value="stats.total_payouts"
      />
      <DashboardKpiCard
        icon="pi-wallet"
        tone="yellow"
        :label="`${$t('dashboard.kpi.totalRevenue')} (${stats.currency})`"
        :value="formatRevenue(stats.revenue)"
      />
      <DashboardKpiCard
        icon="pi-users"
        tone="neutral"
        :label="$t('dashboard.kpi.totalCustomers')"
        :value="stats.customers_count"
      />
    </div>

    <DashboardRecentTransactions />
  </div>
</template>

<script setup lang="ts">
const { apiFetch } = useApi()
const { locale } = useI18n()

const stats = ref({
  total_payments: 0,
  total_payouts: 0,
  customers_count: 0,
  revenue: 0,
  currency: 'XOF',
  success_rate: 0,
})

const loadStats = async () => {
  try {
    const res = await apiFetch<{ success: boolean; data: any }>('/merchant/stats')
    if (res.data) {
      stats.value = res.data
    }
  } catch (e: any) {
    // silently fail - show zeros
  }
}

const formatRevenue = (amount: number | string) => {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  // Locale-aware formatting — 'fr' → "1 234", 'en' → "1,234"
  return new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-US').format(n || 0)
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1024px) {
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .kpi-row {
    grid-template-columns: 1fr;
  }
}
</style>
