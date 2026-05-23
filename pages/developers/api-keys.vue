<template>
  <div class="api-keys-page">
    <div class="page-head">
      <p class="page-subtitle">{{ $t('developersPage.apiKeys.subtitle') }}</p>
      <Button :label="$t('developersPage.apiKeys.create')" icon="pi pi-plus" class="primary-btn" @click="openCreateDialog" />
    </div>

    <div v-if="!loading && apiKeys.length === 0" class="card">
      <CommonEmptyState
        icon="pi-key"
        :title="$t('developersPage.apiKeys.empty')"
        :description="$t('developersPage.apiKeys.emptyHint')"
      >
        <template #action>
          <Button :label="$t('developersPage.apiKeys.createFirst')" icon="pi pi-plus" class="primary-btn" @click="openCreateDialog" />
        </template>
      </CommonEmptyState>
    </div>

    <div v-else class="card card-table">
      <DataTable
        :value="apiKeys" :loading="loading" :paginator="apiKeys.length > 10" :rows="10" class="zayono-table">
      <Column :header="$t('developersPage.apiKeys.columns.number')" style="width: 60px">
        <template #body="{ index }">
          <span class="row-number">{{ index + 1 }}</span>
        </template>
      </Column>
      <Column field="name" :header="$t('developersPage.apiKeys.columns.name')">
        <template #body="{ data }">
          <div class="name-cell">
            <i v-if="data.type === 'secret'" class="pi pi-lock lock-icon"></i>
            <span>{{ data.name }}</span>
          </div>
        </template>
      </Column>
      <Column field="type" :header="$t('developersPage.apiKeys.columns.type')" style="width: 120px">
        <template #body="{ data }">
          <Tag :value="data.type === 'public' ? $t('developersPage.apiKeys.typePublic') : $t('developersPage.apiKeys.typeSecret').split(' ')[0]"
            :class="data.type === 'public' ? 'tag-public' : 'tag-private'" />
        </template>
      </Column>
      <Column field="is_active" :header="$t('developersPage.apiKeys.columns.status')" style="width: 120px">
        <template #body="{ data }">
          <Tag :value="data.is_active ? $t('common.active') : $t('common.inactive')"
            :class="data.is_active ? 'tag-active' : 'tag-inactive'" />
        </template>
      </Column>
      <Column field="last_used_at" :header="$t('developersPage.apiKeys.columns.lastUsed')" style="width: 180px">
        <template #body="{ data }">
          <span class="date-cell">{{ data.last_used_at ? formatDate(data.last_used_at) : $t('developersPage.apiKeys.neverUsed') }}</span>
        </template>
      </Column>
      <Column :header="$t('developersPage.apiKeys.columns.actions')" style="width: 100px">
        <template #body="{ data }">
          <div class="actions-cell">
            <Button icon="pi pi-eye" text rounded size="small" @click="viewKey(data)" v-tooltip.top="$t('common.view')" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDelete(data)" v-tooltip.top="$t('common.delete')" />
          </div>
        </template>
      </Column>
      </DataTable>
    </div>

    <!-- Modal Créer une clé API -->
    <Dialog v-model:visible="showCreateDialog" :header="$t('developersPage.apiKeys.createModal')" :modal="true" :style="{ width: '480px' }" :closable="true">
      <div class="form-grid">
        <div class="form-field">
          <label>{{ $t('developersPage.apiKeys.columns.name') }} <span class="required">*</span></label>
          <InputText v-model="form.name" :placeholder="$t('developersPage.apiKeys.namePlaceholder')" class="w-full" :class="{ 'p-invalid': formErrors.name }" />
          <small v-if="formErrors.name" class="field-error">{{ formErrors.name }}</small>
        </div>
        <div class="form-field">
          <label>{{ $t('developersPage.apiKeys.columns.type') }} <span class="required">*</span></label>
          <Select v-model="form.type" :options="typeOptions" optionLabel="label" optionValue="value" :placeholder="$t('developersPage.apiKeys.typeSelect')" class="w-full" :class="{ 'p-invalid': formErrors.type }" />
          <small v-if="formErrors.type" class="field-error">{{ formErrors.type }}</small>
        </div>
        <div class="form-field">
          <label>{{ $t('common.description') }}</label>
          <Textarea v-model="form.description" :placeholder="$t('developersPage.apiKeys.descriptionPlaceholder')" rows="3" class="w-full" />
        </div>
        <div class="form-field">
          <label>{{ $t('developersPage.apiKeys.expiresAt') }}</label>
          <DatePicker v-model="form.expires_at" :placeholder="$t('developersPage.apiKeys.expiresAtPlaceholder')" class="w-full" dateFormat="dd/mm/yy" :minDate="new Date()" showIcon />
          <small class="field-note">{{ $t('developersPage.apiKeys.expiresAtNote') }}</small>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" text @click="showCreateDialog = false" />
        <Button :label="$t('common.create')" class="primary-btn" :loading="saving" @click="createKey" />
      </template>
    </Dialog>

    <!-- Modal Nouvelle clé générée -->
    <Dialog v-model:visible="showKeyDialog" :header="$t('developersPage.apiKeys.newKeyTitle')" :modal="true" :style="{ width: '520px' }" :closable="false">
      <div class="generated-key-section">
        <p class="warning-text">
          {{ $t('developersPage.apiKeys.newKeyWarning') }}
          <strong>{{ $t('developersPage.apiKeys.newKeyWarningStrong') }}</strong>{{ $t('developersPage.apiKeys.newKeyWarningEnd') }}
        </p>
        <div class="key-block">
          <code class="key-value">{{ generatedKey }}</code>
          <Button icon="pi pi-copy" rounded text @click="copyKey" v-tooltip.top="$t('common.copy')" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('developersPage.apiKeys.doneCopied')" @click="closeKeyDialog" />
      </template>
    </Dialog>

    <!-- Modal Voir détails clé -->
    <Dialog v-model:visible="showViewDialog" :header="$t('developersPage.apiKeys.detailsTitle')" :modal="true" :style="{ width: '480px' }">
      <div v-if="selectedKey" class="key-details">
        <div class="detail-row">
          <span class="detail-label">{{ $t('developersPage.apiKeys.detail.name') }}</span>
          <span class="detail-value">{{ selectedKey.name }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('developersPage.apiKeys.detail.type') }}</span>
          <Tag :value="selectedKey.type === 'public' ? $t('developersPage.apiKeys.typePublic') : $t('developersPage.apiKeys.typeSecret').split(' ')[0]"
            :class="selectedKey.type === 'public' ? 'tag-public' : 'tag-private'" />
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('developersPage.apiKeys.detail.prefix') }}</span>
          <code class="key-prefix">{{ selectedKey.key_prefix }}...</code>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('developersPage.apiKeys.detail.environment') }}</span>
          <span class="detail-value">{{ selectedKey.environment === 'live' ? $t('developersPage.apiKeys.envProduction') : $t('developersPage.apiKeys.envSandbox') }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('developersPage.apiKeys.detail.status') }}</span>
          <Tag :value="selectedKey.is_active ? $t('common.active') : $t('common.inactive')"
            :class="selectedKey.is_active ? 'tag-active' : 'tag-inactive'" />
        </div>
        <div v-if="selectedKey.description" class="detail-row">
          <span class="detail-label">{{ $t('developersPage.apiKeys.detail.description') }}</span>
          <span class="detail-value">{{ selectedKey.description }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('developersPage.apiKeys.detail.createdAt') }}</span>
          <span class="detail-value">{{ formatDate(selectedKey.created_at) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('developersPage.apiKeys.detail.lastUsed') }}</span>
          <span class="detail-value">{{ selectedKey.last_used_at ? formatDate(selectedKey.last_used_at) : $t('developersPage.apiKeys.neverUsed') }}</span>
        </div>
        <div v-if="selectedKey.expires_at" class="detail-row">
          <span class="detail-label">{{ $t('developersPage.apiKeys.detail.expiresAt') }}</span>
          <span class="detail-value">{{ formatDate(selectedKey.expires_at) }}</span>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.close')" severity="secondary" @click="showViewDialog = false" />
        <Button :label="$t('common.delete')" severity="danger" icon="pi pi-trash" @click="confirmDelete(selectedKey!)" />
      </template>
    </Dialog>

    <!-- Confirm Delete -->
    <Dialog v-model:visible="showDeleteDialog" :header="$t('developersPage.apiKeys.confirmDeleteTitle')" :modal="true" :style="{ width: '400px' }">
      <p class="confirm-text">{{ $t('developersPage.apiKeys.confirmDeleteBodyBefore') }} <strong>{{ keyToDelete?.name }}</strong> {{ $t('developersPage.apiKeys.confirmDeleteBodyAfter') }}</p>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" text @click="showDeleteDialog = false" />
        <Button :label="$t('common.delete')" severity="danger" :loading="deleting" @click="deleteKey" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'

const { apiFetch } = useApi()
const { handleError } = useApiError()
const toast = useToast()
const { t, locale } = useI18n()

interface ApiKeyItem {
  id: string | number
  name: string
  key_prefix: string
  type: string
  environment: string
  description?: string
  is_active: boolean
  expires_at?: string
  last_used_at?: string
  created_at: string
}

const apiKeys = ref<ApiKeyItem[]>([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)

const showCreateDialog = ref(false)
const showKeyDialog = ref(false)
const showViewDialog = ref(false)
const showDeleteDialog = ref(false)

const generatedKey = ref('')
const selectedKey = ref<ApiKeyItem | null>(null)
const keyToDelete = ref<ApiKeyItem | null>(null)

const form = reactive({
  name: '',
  type: 'secret',
  description: '',
  expires_at: null as Date | null,
})
const formErrors = reactive<Record<string, string>>({})

const typeOptions = computed(() => [
  { label: t('developersPage.apiKeys.typePublic'), value: 'public' },
  { label: t('developersPage.apiKeys.typeSecret'), value: 'secret' },
])

onMounted(() => {
  fetchKeys()
})

const fetchKeys = async () => {
  loading.value = true
  try {
    const res = await apiFetch<{ data: ApiKeyItem[] }>('/merchant/api-keys')
    apiKeys.value = res.data || []
  } catch {
    apiKeys.value = []
  } finally {
    loading.value = false
  }
}

const formatDate = (dateStr: string) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(dateStr).toLocaleDateString(localeStr, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const openCreateDialog = () => {
  form.name = ''
  form.type = 'secret'
  form.description = ''
  form.expires_at = null
  Object.keys(formErrors).forEach(key => delete formErrors[key])
  showCreateDialog.value = true
}

const createKey = async () => {
  Object.keys(formErrors).forEach(key => delete formErrors[key])

  if (!form.name.trim()) {
    formErrors.name = t('developersPage.apiKeys.nameRequired')
    return
  }
  if (!form.type) {
    formErrors.type = t('developersPage.apiKeys.typeRequired')
    return
  }

  saving.value = true
  try {
    // Environment is set by useApi via the X-Zayono-Environment header
    // (the top-bar toggle). Sending it in the body used to hardcode
    // 'sandbox' and override the merchant's live-mode toggle — keys
    // ended up with a zyn_test_ prefix even in production.
    const body: Record<string, any> = {
      name: form.name,
      type: form.type,
    }
    if (form.description) body.description = form.description
    if (form.expires_at) {
      // Send the end of the picked day so backend's date validation never rejects "today"
      const d = new Date(form.expires_at)
      d.setHours(23, 59, 59, 999)
      body.expires_at = d.toISOString()
    }

    const res = await apiFetch<{ data: { key: string; [k: string]: any } }>('/merchant/api-keys', {
      method: 'POST',
      body,
    })

    generatedKey.value = res.data?.key || ''
    showCreateDialog.value = false
    showKeyDialog.value = true

    // Refresh list
    await fetchKeys()
  } catch (e: any) {
    if (e?.data?.errors) {
      const errors = e.data.errors
      Object.keys(errors).forEach(key => {
        formErrors[key] = Array.isArray(errors[key]) ? errors[key][0] : errors[key]
      })
    } else {
      handleError(e, t('developersPage.apiKeys.errorSummaryCreate'))
    }
  } finally {
    saving.value = false
  }
}

const copyKey = () => {
  navigator.clipboard.writeText(generatedKey.value)
  toast.add({ severity: 'success', summary: t('common.copied'), detail: t('developersPage.apiKeys.copiedDetail'), life: 3000 })
}

const closeKeyDialog = () => {
  showKeyDialog.value = false
  generatedKey.value = ''
}

const viewKey = (key: ApiKeyItem) => {
  selectedKey.value = key
  showViewDialog.value = true
}

const confirmDelete = (key: ApiKeyItem) => {
  keyToDelete.value = key
  showViewDialog.value = false
  showDeleteDialog.value = true
}

const deleteKey = async () => {
  if (!keyToDelete.value) return
  deleting.value = true
  try {
    await apiFetch(`/merchant/api-keys/${keyToDelete.value.id}`, { method: 'DELETE' })
    apiKeys.value = apiKeys.value.filter(k => k.id !== keyToDelete.value!.id)
    showDeleteDialog.value = false
    toast.add({ severity: 'success', summary: t('developersPage.apiKeys.deletedSummary'), detail: t('developersPage.apiKeys.deletedSuccess'), life: 3000 })
  } catch (e: any) {
    handleError(e, t('developersPage.apiKeys.errorSummaryDelete'))
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.api-keys-page {
  background: transparent;
  min-height: 100%;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.page-subtitle {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0;
  max-width: 640px;
}

.primary-btn :deep(.p-button),
.primary-btn {
  background: var(--ze-brand) !important;
  border-color: var(--ze-brand) !important;
  color: #FFFFFF !important;
  border-radius: 6px !important;
}

.primary-btn:hover :deep(.p-button),
.primary-btn:hover {
  background: var(--ze-brand-hover) !important;
  border-color: var(--ze-brand-hover) !important;
}

.card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
}

.card-table {
  padding: 0;
  overflow: hidden;
}

.row-number {
  font-size: 13px;
  color: var(--ze-text-muted);
  font-variant-numeric: tabular-nums;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ze-text-body);
}

.lock-icon {
  font-size: 12px;
  color: var(--ze-text-muted);
}

.date-cell {
  font-size: 13px;
  color: var(--ze-text-muted);
}

.actions-cell {
  display: flex;
  gap: 4px;
}

/* Zayono table styling */
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

/* Tags */
.tag-public {
  background: var(--ze-brand-bg-soft) !important;
  color: var(--ze-brand-hover) !important;
  border: none !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  border-radius: 999px !important;
  padding: 3px 8px !important;
}

.tag-private {
  background: #F3E8FF !important;
  color: #7C3AED !important;
  border: none !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  border-radius: 999px !important;
  padding: 3px 8px !important;
}

.tag-active {
  background: var(--ze-success-bg, #ECFDF5) !important;
  color: var(--ze-success-text, #059669) !important;
  border: none !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  border-radius: 999px !important;
  padding: 3px 8px !important;
}

.tag-inactive {
  background: var(--ze-bg-hover) !important;
  color: var(--ze-text-muted) !important;
  border: none !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  border-radius: 999px !important;
  padding: 3px 8px !important;
}

/* Form */
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ze-text-label);
}

.required {
  color: var(--ze-danger-text, #DC2626);
}

.field-error {
  font-size: 12px;
  color: var(--ze-danger-text, #DC2626);
}

.field-note {
  font-size: 12px;
  color: var(--ze-text-muted);
  font-style: italic;
}

.w-full {
  width: 100%;
}

/* Generated key */
.generated-key-section {
  text-align: center;
}

.warning-text {
  font-size: 13px;
  color: var(--ze-text-label);
  margin-bottom: 20px;
  text-align: left;
  line-height: 1.5;
}

.key-block {
  background: var(--ze-bg-hover);
  padding: 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.key-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  word-break: break-all;
  color: var(--ze-text-body);
  flex: 1;
  text-align: left;
}

/* View details */
.key-details {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--ze-bg-hover);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 13px;
  color: var(--ze-text-muted);
  font-weight: 500;
}

.detail-value {
  font-size: 13px;
  color: var(--ze-text-body);
}

.key-prefix {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  background: var(--ze-bg-hover);
  padding: 3px 6px;
  border-radius: 4px;
}

/* Confirm dialog */
.confirm-text {
  font-size: 14px;
  color: var(--ze-text-label);
  line-height: 1.5;
}

@media (max-width: 480px) {
  .key-block {
    flex-direction: column;
    align-items: stretch;
  }

  .key-value {
    word-break: break-all;
    text-align: left;
  }

  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
