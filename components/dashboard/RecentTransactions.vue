<template>
  <div class="recent-transactions">
    <div class="section-header">
      <div>
        <h3 class="section-title">{{ $t('dashboard.recentTransactions') }}</h3>
        <p class="section-subtitle">{{ $t('dashboard.recentTransactionsSubtitle') }}</p>
      </div>
    </div>

    <TabView v-model:activeIndex="activeTab" @tab-change="onTabChange" class="tx-tabs">
      <TabPanel value="payments">
        <template #header>
          <span class="tab-head">
            <span class="tab-icon tab-icon--blue"><AppIcon name="payments" /></span>
            <span>{{ $t('dashboard.tabPayments') }}</span>
          </span>
        </template>
        <div class="tab-action-row">
          <NuxtLink to="/payments/transactions" class="view-all-btn">
            {{ $t('dashboard.viewAllTransactions') }}
          </NuxtLink>
        </div>

        <div v-if="loadingPayments" class="loading-container">
          <Skeleton height="2.5rem" v-for="i in 5" :key="i" class="mb-1" />
        </div>
        <div v-else-if="payments.length === 0" class="empty-state">
          <AppIcon name="inbox" />
          <p>{{ $t('dashboard.empty') }}</p>
        </div>
        <DataTable v-else :value="payments" :rows="5" class="recent-table">
          <Column field="amount" :header="$t('dashboard.columns.amount')">
            <template #body="{ data }">
              <span class="amount">{{ data.currency || 'FCFA' }} {{ formatNumber(data.amount) }}</span>
            </template>
          </Column>
          <Column field="status" :header="$t('dashboard.columns.status')">
            <template #body="{ data }">
              <TransactionsStatusBadge :status="data.status" />
            </template>
          </Column>
          <Column field="operator" :header="$t('dashboard.columns.method')">
            <template #body="{ data }">
              <span>{{ data.operator || '—' }}</span>
            </template>
          </Column>
          <Column field="customer" :header="$t('dashboard.columns.customer')">
            <template #body="{ data }">
              <span class="client-cell">{{ getCustomerEmail(data) }}</span>
            </template>
          </Column>
          <Column field="id" :header="$t('dashboard.columns.reference')">
            <template #body="{ data }">
              <span class="reference-cell">{{ shortRef(data.id) }}</span>
            </template>
          </Column>
          <Column field="created_at" :header="$t('dashboard.columns.date')">
            <template #body="{ data }">
              <span class="date-cell">{{ formatDate(data.created_at) }}</span>
            </template>
          </Column>
          <Column :header="$t('dashboard.columns.details')" class="col-detail">
            <template #body="{ data }">
              <NuxtLink :to="`/payments/transactions/${data.id}`" class="detail-link">
                <AppIcon name="search" />
              </NuxtLink>
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <TabPanel value="payouts">
        <template #header>
          <span class="tab-head">
            <span class="tab-icon tab-icon--neutral"><AppIcon name="payouts" /></span>
            <span>{{ $t('dashboard.tabPayouts') }}</span>
          </span>
        </template>
        <div class="tab-action-row">
          <NuxtLink to="/payouts/transactions" class="view-all-btn">
            {{ $t('dashboard.viewAllTransactions') }}
          </NuxtLink>
        </div>

        <div v-if="loadingPayouts" class="loading-container">
          <Skeleton height="2.5rem" v-for="i in 5" :key="i" class="mb-1" />
        </div>
        <div v-else-if="payouts.length === 0" class="empty-state">
          <AppIcon name="inbox" />
          <p>{{ $t('dashboard.empty') }}</p>
        </div>
        <DataTable v-else :value="payouts" :rows="5" class="recent-table">
          <Column field="amount" :header="$t('dashboard.columns.amount')">
            <template #body="{ data }">
              <span class="amount">{{ data.currency || 'FCFA' }} {{ formatNumber(data.amount) }}</span>
            </template>
          </Column>
          <Column field="status" :header="$t('dashboard.columns.status')">
            <template #body="{ data }">
              <TransactionsStatusBadge :status="data.status" />
            </template>
          </Column>
          <Column field="operator" :header="$t('dashboard.columns.method')">
            <template #body="{ data }">
              <span>{{ data.operator || '—' }}</span>
            </template>
          </Column>
          <Column field="customer" :header="$t('dashboard.columns.customer')">
            <template #body="{ data }">
              <span class="client-cell">{{ getCustomerEmail(data) }}</span>
            </template>
          </Column>
          <Column field="id" :header="$t('dashboard.columns.reference')">
            <template #body="{ data }">
              <span class="reference-cell">{{ shortRef(data.id) }}</span>
            </template>
          </Column>
          <Column field="created_at" :header="$t('dashboard.columns.date')">
            <template #body="{ data }">
              <span class="date-cell">{{ formatDate(data.created_at) }}</span>
            </template>
          </Column>
          <Column :header="$t('dashboard.columns.details')" class="col-detail">
            <template #body="{ data }">
              <NuxtLink :to="`/payouts/transactions/${data.id}`" class="detail-link">
                <AppIcon name="search" />
              </NuxtLink>
            </template>
          </Column>
        </DataTable>
      </TabPanel>
    </TabView>
  </div>
</template>

<script setup lang="ts">
const { apiFetch } = useApi()
const { locale } = useI18n()

const activeTab = ref(0)
const payments = ref<any[]>([])
const payouts = ref<any[]>([])
const loadingPayments = ref(false)
const loadingPayouts = ref(false)

const loadPayments = async () => {
  loadingPayments.value = true
  try {
    const res = await apiFetch<{ success: boolean; data: any }>('/merchant/payments', {
      params: { per_page: 5, page: 1 },
    })
    payments.value = res.data.data || []
  } catch (e: any) {
    payments.value = []
  } finally {
    loadingPayments.value = false
  }
}

const loadPayouts = async () => {
  loadingPayouts.value = true
  try {
    const res = await apiFetch<{ success: boolean; data: any }>('/merchant/payouts', {
      params: { per_page: 5, page: 1 },
    })
    payouts.value = res.data.data || []
  } catch (e: any) {
    payouts.value = []
  } finally {
    loadingPayouts.value = false
  }
}

const onTabChange = (event: any) => {
  if (event.index === 1 && payouts.value.length === 0 && !loadingPayouts.value) {
    loadPayouts()
  }
}

onMounted(() => {
  loadPayments()
})

const formatNumber = (amount: number) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr).format(amount)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  const d = new Date(dateStr)
  return d.toLocaleDateString(localeStr, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', '')
}

const getCustomerEmail = (data: any) => {
  if (data.customer && typeof data.customer === 'object') {
    return data.customer.email || data.customer.phone || '—'
  }
  return data.phone_number || '—'
}

const shortRef = (id: string) => {
  if (!id) return '—'
  return id.length > 14 ? id.substring(0, 14) + '...' : id
}
</script>

<style scoped>
.recent-transactions {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
  overflow-x: auto;
}

.section-header {
  margin-bottom: 8px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--ze-text-body);
  margin: 0;
}

.section-subtitle {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 4px 0 0;
}

.tab-action-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.tab-head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.tab-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.tab-icon .pi { font-size: 12px; }
.tab-icon--blue {
  background: var(--ze-brand-bg-soft);
  color: var(--ze-brand);
}
.tab-icon--neutral {
  background: var(--ze-bg-hover);
  color: var(--ze-text-muted);
}

.view-all-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  background: var(--ze-brand);
  color: var(--ze-brand-fg);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s;
}

.view-all-btn:hover {
  background: var(--ze-brand-hover);
}

.amount {
  font-weight: 600;
  font-size: 13px;
  color: var(--ze-text-body);
  font-variant-numeric: tabular-nums;
}

.client-cell {
  font-size: 13px;
  color: var(--ze-text-label);
}

.reference-cell {
  font-size: 12px;
  color: var(--ze-text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.date-cell {
  font-size: 12px;
  color: var(--ze-text-muted);
}

.col-detail {
  width: 60px;
  text-align: center;
}

.detail-link {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--ze-brand);
  transition: background 0.15s;
}

.detail-link:hover {
  background: var(--ze-brand-bg-soft);
}

.detail-link .pi {
  font-size: 14px;
}

.loading-container {
  padding: 8px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--ze-text-muted);
  font-size: 13px;
}

.empty-state .pi {
  font-size: 2rem;
  color: var(--ze-text-disabled);
}

:deep(.recent-table .p-datatable-thead > tr > th) {
  background: var(--ze-bg-subtle);
  color: var(--ze-text-muted);
  font-size: 12px;
  font-weight: 500;
  text-transform: none;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ze-border);
}

:deep(.recent-table .p-datatable-tbody > tr > td) {
  padding: 14px;
  font-size: 13px;
  color: var(--ze-text-body);
  border-bottom: 1px solid var(--ze-border-subtle);
}

:deep(.recent-table .p-datatable-tbody > tr:last-child > td) {
  border-bottom: none;
}

@media (max-width: 640px) {
  .recent-transactions {
    padding: 16px;
  }
}
</style>
