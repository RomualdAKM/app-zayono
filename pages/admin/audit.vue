<template>
  <div class="admin-audit">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ $t('admin.audit.title') }}</h1>
        <p class="page-subtitle">{{ $t('admin.audit.subtitle') }}</p>
      </div>
      <Button :label="$t('common.exportCsv')" icon="pi pi-download" severity="secondary" outlined :loading="exporting" @click="exportCsv" />
    </div>

    <div class="filters-bar">
      <Select v-model="actionFilter" :options="actionOptions" optionLabel="label" optionValue="value" :placeholder="$t('admin.audit.filters.action')" showClear @change="resetAndLoad" />
      <Select v-model="modelFilter" :options="modelOptions" optionLabel="label" optionValue="value" :placeholder="$t('admin.audit.filters.model')" showClear @change="resetAndLoad" />
      <InputText v-model="applicationFilter" :placeholder="$t('admin.audit.filters.appIdPlaceholder')" class="filter-input" @keyup.enter="resetAndLoad" />
      <Button v-if="applicationFilter" icon="pi pi-times" text severity="secondary" @click="applicationFilter = ''; resetAndLoad()" />
    </div>

    <div class="table-card">
      <DataTable
        :value="auditLogs"
        :loading="loading"
        stripedRows
        size="small"
        :rows="perPage"
        paginator
        lazy
        :first="(pagination.current_page - 1) * perPage"
        :totalRecords="pagination.total"
        @page="onPageChange"
        :expandedRows="expandedRows"
        @row-toggle="onRowToggle"
        dataKey="id"
      >
        <Column :expander="true" style="width: 40px" />
        <Column :header="$t('admin.audit.columns.date')" style="width: 160px">
          <template #body="{ data }">
            {{ formatDateTime(data.created_at) }}
          </template>
        </Column>
        <Column :header="$t('admin.audit.columns.user')" style="min-width: 150px">
          <template #body="{ data }">
            {{ data.merchant?.name ?? t('admin.audit.system') }}
          </template>
        </Column>
        <Column :header="$t('admin.audit.columns.application')" style="min-width: 140px">
          <template #body="{ data }">
            <span v-if="data.application" class="app-cell">
              {{ data.application.name }}
            </span>
            <span v-else class="muted">—</span>
          </template>
        </Column>
        <Column field="action" :header="$t('admin.audit.columns.action')" style="width: 120px">
          <template #body="{ data }">
            <Tag :value="te(`auditAction.${data.action}`) ? t(`auditAction.${data.action}`) : data.action" :severity="getActionSeverity(data.action)" />
          </template>
        </Column>
        <Column field="model_type" :header="$t('admin.audit.columns.model')" style="width: 140px">
          <template #body="{ data }">
            {{ data.model_type?.split('\\').pop() ?? '-' }}
          </template>
        </Column>
        <Column :header="$t('admin.audit.columns.ip')" style="width: 130px">
          <template #body="{ data }">
            <span class="mono-text">{{ data.ip_address ?? '-' }}</span>
          </template>
        </Column>

        <template #expansion="{ data }">
          <div class="expansion-content">
            <div class="diff-grid" v-if="data.old_values || data.new_values">
              <div class="diff-col" v-if="data.old_values">
                <h4 class="diff-title">{{ $t('admin.audit.expansion.oldValues') }}</h4>
                <pre class="diff-pre">{{ JSON.stringify(data.old_values, null, 2) }}</pre>
              </div>
              <div class="diff-col" v-if="data.new_values">
                <h4 class="diff-title">{{ $t('admin.audit.expansion.newValues') }}</h4>
                <pre class="diff-pre">{{ JSON.stringify(data.new_values, null, 2) }}</pre>
              </div>
            </div>
            <p v-else class="empty-text">{{ $t('admin.audit.expansion.noDetails') }}</p>
          </div>
        </template>
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
const { downloadCsv } = useCsvExport()
const { t, te, locale } = useI18n()

const actionFilter = ref<string | null>(null)
const modelFilter = ref<string | null>(null)
const applicationFilter = ref('')
const expandedRows = ref<any[]>([])
const currentPage = ref(1)
const perPage = ref(20)
const exporting = ref(false)

const actionOptions = computed(() => [
  { label: t('admin.audit.actions.created'), value: 'created' },
  { label: t('admin.audit.actions.updated'), value: 'updated' },
  { label: t('admin.audit.actions.deleted'), value: 'deleted' },
  { label: t('admin.audit.actions.login'), value: 'login' },
  { label: t('admin.audit.actions.loginFailed'), value: 'login_failed' },
  { label: t('admin.audit.actions.logout'), value: 'logout' },
  { label: t('admin.audit.actions.register'), value: 'register' },
  { label: t('admin.audit.actions.emailVerified'), value: 'email_verified' },
  { label: t('admin.audit.actions.passwordResetRequested'), value: 'password_reset_requested' },
  { label: t('admin.audit.actions.passwordReset'), value: 'password_reset' },
  { label: t('admin.audit.actions.apiKeyCreated'), value: 'api_key_created' },
  { label: t('admin.audit.actions.apiKeyRevoked'), value: 'api_key_revoked' },
])

// Backend stores FQCN (App\\Models\\Merchant). The controller now matches by suffix.
const modelOptions = [
  { label: 'Merchant', value: 'Merchant' },
  { label: 'Transaction', value: 'Transaction' },
  { label: 'ExchangeRate', value: 'ExchangeRate' },
  { label: 'ApiKey', value: 'ApiKey' },
  { label: 'AggregatorConfig', value: 'AggregatorConfig' },
  { label: 'RoutingRule', value: 'RoutingRule' },
  { label: 'Webhook', value: 'Webhook' },
]

const auditLogs = computed(() => adminStore.auditLogs)
const loading = computed(() => adminStore.loading)
const pagination = computed(() => adminStore.auditLogsPagination)

onMounted(() => {
  loadLogs()
})

const onPageChange = (event: any) => {
  currentPage.value = event.page + 1
  perPage.value = event.rows
  loadLogs()
}

const resetAndLoad = () => {
  currentPage.value = 1
  loadLogs()
}

const loadLogs = () => {
  const params: Record<string, any> = {
    page: currentPage.value,
    per_page: perPage.value,
  }
  if (actionFilter.value) params.action = actionFilter.value
  if (modelFilter.value) params.model_type = modelFilter.value
  if (applicationFilter.value.trim()) params.application_id = applicationFilter.value.trim()
  adminStore.fetchAuditLogs(params)
}

const onRowToggle = (event: any) => {
  expandedRows.value = event.data
}

const exportCsv = async () => {
  exporting.value = true
  try {
    await downloadCsv('/admin/exports/audit-logs.csv', {
      action: actionFilter.value || undefined,
      model_type: modelFilter.value || undefined,
      application_id: applicationFilter.value.trim() || undefined,
    }, 'audit-logs.csv')
  } catch (e: any) {
    alert(e?.message ?? t('common.exportImpossible'))
  } finally {
    exporting.value = false
  }
}

const formatDateTime = (date: string) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(date).toLocaleString(localeStr, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const getActionSeverity = (action: string) => {
  const map: Record<string, string> = {
    created: 'success',
    updated: 'info',
    deleted: 'danger',
    login: 'success',
    login_failed: 'danger',
    logout: 'secondary',
    register: 'success',
    email_verified: 'success',
    api_key_created: 'info',
    api_key_revoked: 'warn',
  }
  return map[action] ?? 'secondary'
}
</script>

<style scoped>
.admin-audit { max-width: 1400px; }
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

.mono-text { font-family: monospace; font-size: 12px; color: #6b7280; }
.filter-input { min-width: 240px; }
.app-cell { font-size: 13px; color: #1a1a2e; }
.muted { color: #9ca3af; font-size: 13px; }

.expansion-content { padding: 16px 24px; background: #fafafa; }
.diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.diff-col { overflow: hidden; }
.diff-title { font-size: 12px; font-weight: 600; color: #6b7280; margin: 0 0 8px 0; }
.diff-pre {
  font-size: 11px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 10px;
  overflow-x: auto;
  margin: 0;
  white-space: pre-wrap;
}
.empty-text { font-size: 13px; color: #9ca3af; text-align: center; }
</style>
