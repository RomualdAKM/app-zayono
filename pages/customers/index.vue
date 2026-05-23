<template>
  <div class="customers-page">
    <!-- Search row -->
    <div class="page-toolbar">
      <div class="search-wrapper">
        <AppIcon name="search" class="search-icon" />
        <InputText
          v-model="search"
          :placeholder="$t('customersPage.searchPlaceholder')"
          class="search-input"
          @keyup.enter="loadCustomers"
        />
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-container">
      <Skeleton height="3rem" class="mb-2" />
      <Skeleton height="2.5rem" v-for="i in 6" :key="i" class="mb-1" />
    </div>

    <!-- Error state -->
    <Message v-else-if="error" severity="error" :closable="false">
      {{ error }}
    </Message>

    <!-- Empty state -->
    <div v-else-if="customers.length === 0" class="empty-card">
      <CommonEmptyState
        :title="$t('customersPage.emptyTitle')"
        :description="$t('customersPage.emptyDescription')"
        icon="pi-users"
      />
    </div>

    <!-- Data table -->
    <template v-else>
      <div class="table-card">
        <DataTable :value="customers" :rows="perPage" rowHover>
          <Column :header="$t('customersPage.columns.client')" style="min-width: 260px;">
            <template #body="{ data }">
              <div class="client-cell">
                <div class="client-avatar">
                  {{ getInitials(data.first_name, data.last_name) }}
                </div>
                <div class="client-info">
                  <span class="client-name">{{ data.first_name }} {{ data.last_name }}</span>
                </div>
              </div>
            </template>
          </Column>

          <Column :header="$t('customersPage.columns.email')">
            <template #body="{ data }">
              <span class="muted">{{ data.email || '—' }}</span>
            </template>
          </Column>

          <Column :header="$t('customersPage.columns.phone')">
            <template #body="{ data }">
              <span class="muted">{{ data.phone || '—' }}</span>
            </template>
          </Column>

          <Column :header="$t('customersPage.columns.transactions')">
            <template #body="{ data }">
              <span class="num">{{ data.transactions_count ?? 0 }}</span>
            </template>
          </Column>

          <Column :header="$t('customersPage.columns.totalSpent')">
            <template #body="{ data }">
              <span class="num strong">{{ formatAmount(data.total_spent, data.currency) }}</span>
            </template>
          </Column>

          <Column :header="$t('customersPage.columns.addedOn')">
            <template #body="{ data }">
              <span class="muted">{{ formatDate(data.created_at) }}</span>
            </template>
          </Column>

          <Column header="" style="width: 60px; text-align: center;">
            <template #body="{ data }">
              <Button
                icon="pi pi-arrow-right"
                text
                rounded
                size="small"
                @click="goToCustomer(data.id)"
              />
            </template>
          </Column>
        </DataTable>
      </div>

      <Paginator
        :rows="perPage"
        :totalRecords="totalRecords"
        :first="(currentPage - 1) * perPage"
        @page="onPageChange"
        :rowsPerPageOptions="[10, 15, 25, 50]"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const { apiFetch } = useApi()
const { handleError } = useApiError()
const { t, locale } = useI18n()

const search = ref('')
const customers = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const currentPage = ref(1)
const perPage = ref(15)
const totalRecords = ref(0)

const loadCustomers = async () => {
  loading.value = true
  error.value = null
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      per_page: perPage.value,
    }
    if (search.value) params.search = search.value

    const res = await apiFetch<{ success: boolean; data: any }>('/merchant/customers', { params })
    customers.value = res.data.data
    totalRecords.value = res.data.total
    currentPage.value = res.data.current_page
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || t('customersPage.loadError')
    handleError(e, t('customersPage.errorSummary'))
    customers.value = []
  } finally {
    loading.value = false
  }
}

const onPageChange = (event: any) => {
  currentPage.value = event.page + 1
  perPage.value = event.rows
  loadCustomers()
}

const getInitials = (first: string, last: string) => {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase()
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—'
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(dateStr).toLocaleDateString(localeStr, { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatAmount = (amount: number | string | null, currency?: string) => {
  if (amount === null || amount === undefined || amount === '') return '—'
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr, {
    style: 'currency',
    currency: currency || 'XOF',
    minimumFractionDigits: 0,
  }).format(Number(amount))
}

const goToCustomer = (id: string) => {
  router.push(`/customers/${id}`)
}

onMounted(() => {
  loadCustomers()
})
</script>

<style scoped>
.customers-page {
  min-height: 100%;
}

.page-toolbar {
  display: flex;
  margin-bottom: 16px;
}

.search-wrapper {
  position: relative;
  width: 50%;
  max-width: 420px;
}

.search-wrapper i {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ze-text-disabled);
  font-size: 13px;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding-left: 36px;
  font-size: 13px;
  height: 38px;
  border: 1px solid var(--ze-border);
  border-radius: 6px;
  background: var(--ze-bg-input);
}

.loading-container {
  padding: 16px 0;
}

/* Table card */
.table-card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  overflow: hidden;
  overflow-x: auto;
}

.empty-card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
}

.table-card :deep(.p-datatable-thead > tr > th) {
  background: var(--ze-bg-subtle);
  color: var(--ze-text-muted);
  font-size: 12px;
  font-weight: 500;
  text-transform: none;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ze-border);
}

.table-card :deep(.p-datatable-tbody > tr > td) {
  padding: 14px;
  font-size: 13px;
  color: var(--ze-text-body);
  border-bottom: 1px solid var(--ze-border-subtle);
}

.table-card :deep(.p-datatable-tbody > tr:last-child > td) {
  border-bottom: none;
}

/* Cells */
.client-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.client-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--ze-icon-circle-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--ze-icon-circle-fg);
  flex-shrink: 0;
}

.client-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.client-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--ze-text-strong);
}

.muted {
  color: var(--ze-text-muted);
  font-size: 13px;
}

.num {
  font-variant-numeric: tabular-nums;
  color: var(--ze-text-body);
  font-size: 13px;
}

.num.strong {
  font-weight: 600;
  color: var(--ze-text-strong);
}

@media (max-width: 640px) {
  .search-wrapper {
    width: 100%;
    max-width: 100%;
  }
  .client-cell {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
