<template>
  <div class="admin-transactions">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ $t('admin.transactionsList.title') }}</h1>
        <p class="page-subtitle">{{ $t('admin.transactionsList.subtitle') }}</p>
      </div>
      <Button :label="$t('common.exportCsv')" icon="pi pi-download" severity="secondary" outlined :loading="exporting" @click="exportCsv" />
    </div>

    <div class="filters-bar">
      <Select v-model="statusFilter" :options="statusOptions" optionLabel="label" optionValue="value" :placeholder="$t('admin.transactionsList.filters.status')" showClear @change="resetAndLoad" />
      <Select v-model="aggregatorFilter" :options="aggregatorOptions" optionLabel="label" optionValue="value" :placeholder="$t('admin.transactionsList.filters.aggregator')" showClear @change="resetAndLoad" />
      <Select v-model="environmentFilter" :options="envOptions" optionLabel="label" optionValue="value" :placeholder="$t('admin.transactionsList.filters.environment')" showClear @change="resetAndLoad" />
    </div>

    <div class="table-card">
      <DataTable
        :value="transactions"
        :loading="loading"
        stripedRows
        size="small"
        :rows="perPage"
        paginator
        lazy
        :first="(pagination.current_page - 1) * perPage"
        :totalRecords="pagination.total"
        @page="onPageChange"
        @row-click="onRowClick"
        rowHover
        class="clickable-table"
      >
        <Column :header="$t('admin.transactionsList.columns.id')" style="width: 130px">
          <template #body="{ data }">
            <span class="mono-text">{{ data.id.slice(0, 14) }}</span>
          </template>
        </Column>
        <Column :header="$t('admin.transactionsList.columns.merchant')" style="min-width: 150px">
          <template #body="{ data }">
            {{ data.merchant?.company_name ?? '-' }}
          </template>
        </Column>
        <Column :header="$t('admin.transactionsList.columns.amount')" style="width: 130px">
          <template #body="{ data }">
            {{ formatCurrency(parseFloat(data.amount)) }} {{ data.currency }}
          </template>
        </Column>
        <Column :header="$t('admin.transactionsList.columns.status')" style="width: 100px">
          <template #body="{ data }">
            <Tag :value="t(`status.${data.status}`)" :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>
        <Column field="type" :header="$t('admin.transactionsList.columns.type')" style="width: 90px">
          <template #body="{ data }">
            <Tag :value="t(`txType.${data.type}`)" :severity="data.type === 'payment' ? 'info' : 'warn'" />
          </template>
        </Column>
        <Column field="operator" :header="$t('admin.transactionsList.columns.operator')" style="width: 150px">
          <template #body="{ data }">
            <div v-if="data.operator" class="method-cell">
              <MethodLogo :name="data.operator" />
              <span class="method-cell-name">{{ data.operator }}</span>
            </div>
            <span v-else>-</span>
          </template>
        </Column>
        <Column field="aggregator_code" :header="$t('admin.transactionsList.columns.aggregator')" style="width: 110px">
          <template #body="{ data }">
            {{ data.aggregator_code ?? '-' }}
          </template>
        </Column>
        <Column field="environment" :header="$t('admin.transactionsList.columns.env')" style="width: 80px">
          <template #body="{ data }">
            <Tag :value="data.environment === 'live' ? t('common.live') : t('common.sandbox')" :severity="data.environment === 'live' ? 'success' : 'warn'" />
          </template>
        </Column>
        <Column :header="$t('admin.transactionsList.columns.date')" style="width: 140px">
          <template #body="{ data }">
            {{ formatDateTime(data.created_at) }}
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
const router = useRouter()
const { downloadCsv } = useCsvExport()
const { t, locale } = useI18n()

const exporting = ref(false)

const statusFilter = ref<string | null>(null)
const aggregatorFilter = ref<string | null>(null)
const environmentFilter = ref<string | null>(null)
const currentPage = ref(1)
const perPage = ref(20)

const statusOptions = computed(() => [
  { label: t('status.success'), value: 'success' },
  { label: t('status.failed'), value: 'failed' },
  { label: t('status.pending'), value: 'pending' },
  { label: t('status.initiated'), value: 'initiated' },
  { label: t('status.cancelled'), value: 'cancelled' },
])

// Aggregator filter pulled from the live catalogue. Even on the admin
// page we hit `/merchant/aggregators/available` — the endpoint exposes
// the static catalogue regardless of application scope. If the admin has
// no application context (rare), the dropdown is empty and filtering
// falls back to status/environment which are sufficient for triage.
const { load: loadAggregatorCatalog, asSelectOptions } = useAggregatorCatalog()
onMounted(() => loadAggregatorCatalog())
const aggregatorOptions = computed(() => asSelectOptions())

const envOptions = computed(() => [
  { label: t('common.live'), value: 'live' },
  { label: t('common.sandbox'), value: 'sandbox' },
])

const transactions = computed(() => adminStore.transactions)
const loading = computed(() => adminStore.loading)
const pagination = computed(() => adminStore.transactionsPagination)

onMounted(() => {
  loadTransactions()
})

const onPageChange = (event: any) => {
  currentPage.value = event.page + 1
  perPage.value = event.rows
  loadTransactions()
}

const resetAndLoad = () => {
  currentPage.value = 1
  loadTransactions()
}

const loadTransactions = () => {
  const params: Record<string, any> = {
    page: currentPage.value,
    per_page: perPage.value,
  }
  if (statusFilter.value) params.status = statusFilter.value
  if (aggregatorFilter.value) params.aggregator = aggregatorFilter.value
  if (environmentFilter.value) params.environment = environmentFilter.value
  adminStore.fetchTransactions(params)
}

const onRowClick = (event: any) => {
  router.push(`/admin/transactions/${event.data.id}`)
}

const exportCsv = async () => {
  exporting.value = true
  try {
    await downloadCsv('/admin/exports/transactions.csv', {
      status: statusFilter.value || undefined,
      aggregator: aggregatorFilter.value || undefined,
      environment: environmentFilter.value || undefined,
    }, 'transactions.csv')
  } catch (e: any) {
    alert(e?.message ?? t('common.exportImpossible'))
  } finally {
    exporting.value = false
  }
}

const formatCurrency = (amount: number) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr, { minimumFractionDigits: 0 }).format(amount)
}

const formatDateTime = (date: string) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(date).toLocaleString(localeStr, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const getStatusSeverity = (status: string) => {
  const map: Record<string, string> = { success: 'success', failed: 'danger', pending: 'warn', initiated: 'info' }
  return map[status] ?? 'secondary'
}
</script>

<style scoped>
.admin-transactions { max-width: 1400px; }
.page-header {
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.page-title { font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0; }
.page-subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }

.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.table-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.clickable-table :deep(tr) { cursor: pointer; }
.mono-text { font-family: monospace; font-size: 12px; color: #6b7280; }

.method-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.method-cell-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 130px;
  font-size: 13px;
}
</style>
