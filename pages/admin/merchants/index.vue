<template>
  <div class="admin-merchants">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ $t('admin.merchants.title') }}</h1>
        <p class="page-subtitle">{{ $t('admin.merchants.subtitle') }}</p>
      </div>
      <Button :label="$t('common.exportCsv')" icon="pi pi-download" severity="secondary" outlined :loading="exporting" @click="exportCsv" />
    </div>

    <div class="filters-bar">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" :placeholder="$t('admin.merchants.searchPlaceholder')" @input="onSearch" />
      </IconField>
      <Select v-model="statusFilter" :options="statusOptions" optionLabel="label" optionValue="value" :placeholder="$t('admin.merchants.allStatuses')" showClear @change="loadMerchants" />
    </div>

    <div class="table-card">
      <DataTable
        :value="merchants"
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
        <Column field="name" :header="$t('admin.merchants.columns.name')" style="min-width: 140px" />
        <Column field="email" :header="$t('admin.merchants.columns.email')" style="min-width: 200px" />
        <Column field="company_name" :header="$t('admin.merchants.columns.company')" style="min-width: 140px" />
        <Column :header="$t('admin.merchants.columns.status')" style="width: 100px">
          <template #body="{ data }">
            <Tag :value="data.is_active ? t('admin.merchants.active') : t('admin.merchants.suspended')" :severity="data.is_active ? 'success' : 'danger'" />
          </template>
        </Column>
        <Column :header="$t('admin.merchants.columns.feePercent')" style="width: 80px">
          <template #body="{ data }">
            {{ data.zayono_fee_percent }}%
          </template>
        </Column>
        <Column :header="$t('admin.merchants.columns.transactions')" style="width: 110px">
          <template #body="{ data }">
            {{ data.transactions_count }}
          </template>
        </Column>
        <Column :header="$t('admin.merchants.columns.revenue')" style="width: 140px">
          <template #body="{ data }">
            <span class="revenue-cell">{{ formatRevenue(data.zayono_revenue_all_time) }}</span>
          </template>
        </Column>
        <Column :header="$t('admin.merchants.columns.verified')" style="width: 80px">
          <template #body="{ data }">
            <i :class="['pi', data.email_verified_at ? 'pi-check-circle' : 'pi-times-circle']" :style="{ color: data.email_verified_at ? '#10b981' : '#9ca3af' }"></i>
          </template>
        </Column>
        <Column :header="$t('admin.merchants.columns.registeredOn')" style="width: 120px">
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
const router = useRouter()
const { downloadCsv } = useCsvExport()
const { t, locale } = useI18n()

const exporting = ref(false)

const search = ref('')
const statusFilter = ref<string | null>(null)
const currentPage = ref(1)
const perPage = ref(15)

const statusOptions = computed(() => [
  { label: t('admin.merchants.active'), value: 'active' },
  { label: t('admin.merchants.suspended'), value: 'suspended' },
])

const merchants = computed(() => adminStore.merchants)
const loading = computed(() => adminStore.loading)
const pagination = computed(() => adminStore.merchantsPagination)

onMounted(() => {
  loadMerchants()
})

let searchTimeout: ReturnType<typeof setTimeout>
const onSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadMerchants()
  }, 300)
}

const onPageChange = (event: any) => {
  currentPage.value = event.page + 1
  perPage.value = event.rows
  loadMerchants()
}

const loadMerchants = () => {
  const params: Record<string, any> = {
    page: currentPage.value,
    per_page: perPage.value,
  }
  if (search.value) params.search = search.value
  if (statusFilter.value) params.status = statusFilter.value
  adminStore.fetchMerchants(params)
}

const onRowClick = (event: any) => {
  router.push(`/admin/merchants/${event.data.id}`)
}

const exportCsv = async () => {
  exporting.value = true
  try {
    await downloadCsv('/admin/exports/merchants.csv', {
      search: search.value || undefined,
      status: statusFilter.value || undefined,
    }, 'merchants.csv')
  } catch (e: any) {
    alert(e?.message ?? t('common.exportImpossible'))
  } finally {
    exporting.value = false
  }
}

const formatDate = (date: string) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(date).toLocaleDateString(localeStr, { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatRevenue = (amount: number | string | null) => {
  const value = Number(amount ?? 0)
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr, {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(value)
}
</script>

<style scoped>
.admin-merchants { max-width: 1400px; }
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
}

.table-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.clickable-table :deep(tr) {
  cursor: pointer;
}

.revenue-cell {
  font-weight: 600;
  color: #047857;
}
</style>
