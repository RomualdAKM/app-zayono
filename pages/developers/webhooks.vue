<template>
  <div class="webhooks-page">
    <div class="page-head">
      <p class="page-subtitle">{{ $t('developersPage.webhooks.subtitle') }}</p>
      <Button :label="$t('developersPage.webhooks.add')" icon="pi pi-plus" class="primary-btn" @click="openCreateDialog" />
    </div>

    <div v-if="!loading && webhooks.length === 0" class="card">
      <CommonEmptyState
        icon="pi-bell"
        :title="$t('developersPage.webhooks.empty')"
        :description="$t('developersPage.webhooks.emptyHint')"
      >
        <template #action>
          <Button :label="$t('developersPage.webhooks.addFirst')" icon="pi pi-plus" class="primary-btn" @click="openCreateDialog" />
        </template>
      </CommonEmptyState>
    </div>

    <div v-else class="card card-table">
      <DataTable
        :value="webhooks" :loading="loading" :paginator="webhooks.length > 10" :rows="10" class="zayono-table">
      <Column :header="$t('developersPage.webhooks.columns.number')" style="width: 60px">
        <template #body="{ index }">
          <span class="row-number">{{ index + 1 }}</span>
        </template>
      </Column>
      <Column field="url" :header="$t('developersPage.webhooks.columns.url')">
        <template #body="{ data }">
          <code class="url-display">{{ data.url }}</code>
        </template>
      </Column>
      <Column field="events" :header="$t('developersPage.webhooks.columns.events')">
        <template #body="{ data }">
          <div class="events-list">
            <Tag v-for="event in (data.events || []).slice(0, 3)" :key="event" :value="formatEventLabel(event)" class="event-tag" />
            <Tag v-if="(data.events || []).length > 3" :value="'+' + ((data.events || []).length - 3)" class="event-tag-more" />
          </div>
        </template>
      </Column>
      <Column field="is_active" :header="$t('developersPage.webhooks.columns.status')" style="width: 100px">
        <template #body="{ data }">
          <Tag :value="data.is_active ? $t('common.active') : $t('common.inactive')"
            :class="data.is_active ? 'tag-active' : 'tag-inactive'" />
        </template>
      </Column>
      <Column :header="$t('developersPage.webhooks.columns.actions')" style="width: 100px">
        <template #body="{ data }">
          <div class="actions-cell">
            <Button icon="pi pi-eye" text rounded size="small" @click="viewWebhook(data)" v-tooltip.top="$t('common.view')" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDelete(data)" v-tooltip.top="$t('common.delete')" />
          </div>
        </template>
      </Column>
      </DataTable>
    </div>

    <!-- Modal Ajouter un webhook -->
    <Dialog v-model:visible="showCreateDialog" :header="$t('developersPage.webhooks.addModal')" :modal="true" :style="{ width: '520px' }" :closable="true">
      <div class="form-grid">
        <div class="form-field">
          <label>{{ $t('developersPage.webhooks.url') }} <span class="required">*</span></label>
          <InputText v-model="form.url" :placeholder="$t('developersPage.webhooks.urlPlaceholder')" class="w-full" :class="{ 'p-invalid': formErrors.url }" />
          <small v-if="formErrors.url" class="field-error">{{ formErrors.url }}</small>
        </div>
        <div class="form-field">
          <label>{{ $t('developersPage.webhooks.events') }} <span class="required">*</span></label>
          <MultiSelect v-model="form.events" :options="availableEvents" optionLabel="label" optionValue="value"
            :placeholder="$t('developersPage.webhooks.eventsPlaceholder')" class="w-full" display="chip" :class="{ 'p-invalid': formErrors.events }" />
          <small v-if="formErrors.events" class="field-error">{{ formErrors.events }}</small>
        </div>
        <p class="field-note">{{ $t('developersPage.webhooks.secretAutoNote') }}</p>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" text @click="showCreateDialog = false" />
        <Button :label="$t('common.add')" class="primary-btn" :loading="saving" @click="createWebhook" />
      </template>
    </Dialog>

    <!-- Modal Secret généré (one-shot, à la création) -->
    <Dialog v-model:visible="showSecretDialog" :header="$t('developersPage.webhooks.secretGeneratedTitle')" :modal="true" :style="{ width: '520px' }" :closable="false">
      <div class="generated-key-section">
        <p class="warning-text">
          {{ $t('developersPage.webhooks.secretGeneratedWarning') }}
          <strong>{{ $t('developersPage.webhooks.secretGeneratedWarningStrong') }}</strong>{{ $t('developersPage.webhooks.secretGeneratedWarningEnd') }}
        </p>
        <div class="key-block">
          <code class="key-value">{{ generatedSecret }}</code>
          <Button icon="pi pi-copy" rounded text @click="copySecret" v-tooltip.top="$t('common.copy')" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('developersPage.webhooks.secretSaved')" class="primary-btn" @click="closeSecretDialog" />
      </template>
    </Dialog>

    <!-- Modal Détails webhook -->
    <Dialog v-model:visible="showViewDialog" :header="$t('developersPage.webhooks.detailsTitle')" :modal="true" :style="{ width: '540px' }">
      <div v-if="selectedWebhook" class="webhook-details">
        <div class="detail-row">
          <span class="detail-label">{{ $t('developersPage.webhooks.detail.url') }}</span>
          <code class="detail-url">{{ selectedWebhook.url }}</code>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('developersPage.webhooks.detail.secret') }}</span>
          <code class="secret-value">{{ selectedWebhook.secret }}</code>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('developersPage.webhooks.detail.status') }}</span>
          <Tag :value="selectedWebhook.is_active ? $t('common.active') : $t('common.inactive')"
            :class="selectedWebhook.is_active ? 'tag-active' : 'tag-inactive'" />
        </div>
        <div class="detail-row full-width">
          <span class="detail-label">{{ $t('developersPage.webhooks.detail.events') }}</span>
          <div class="events-detail-list">
            <Tag v-for="event in selectedWebhook.events" :key="event" :value="event" class="event-tag" />
          </div>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('developersPage.webhooks.detail.createdAt') }}</span>
          <span class="detail-value">{{ formatDate(selectedWebhook.created_at) }}</span>
        </div>
        <p class="field-note">{{ $t('developersPage.webhooks.secretMaskedNote') }}</p>
      </div>
      <template #footer>
        <Button :label="$t('common.close')" severity="secondary" @click="showViewDialog = false" />
        <Button :label="$t('common.delete')" severity="danger" icon="pi pi-trash" @click="confirmDelete(selectedWebhook!)" />
      </template>
    </Dialog>

    <!-- Confirm Delete -->
    <Dialog v-model:visible="showDeleteDialog" :header="$t('developersPage.webhooks.confirmDeleteTitle')" :modal="true" :style="{ width: '400px' }">
      <p class="confirm-text">{{ $t('developersPage.webhooks.confirmDeleteBody') }}</p>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" text @click="showDeleteDialog = false" />
        <Button :label="$t('common.delete')" severity="danger" :loading="deleting" @click="deleteWebhook" />
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

interface WebhookItem {
  id: string | number
  url: string
  events: string[]
  secret: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

const webhooks = ref<WebhookItem[]>([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)

const showCreateDialog = ref(false)
const showSecretDialog = ref(false)
const showViewDialog = ref(false)
const showDeleteDialog = ref(false)

const selectedWebhook = ref<WebhookItem | null>(null)
const webhookToDelete = ref<WebhookItem | null>(null)
const generatedSecret = ref('')

const form = reactive({
  url: '',
  events: [] as string[],
})
const formErrors = reactive<Record<string, string>>({})

// Must mirror StoreWebhookEndpointRequest::AVAILABLE_EVENTS on the backend.
const availableEvents = [
  { label: 'payment.initialized', value: 'payment.initialized' },
  { label: 'payment.successful', value: 'payment.successful' },
  { label: 'payment.failed', value: 'payment.failed' },
  { label: 'payout.initialized', value: 'payout.initialized' },
  { label: 'payout.successful', value: 'payout.successful' },
  { label: 'payout.failed', value: 'payout.failed' },
]

onMounted(() => {
  fetchWebhooks()
})

const fetchWebhooks = async () => {
  loading.value = true
  try {
    const res = await apiFetch<{ data: WebhookItem[] }>('/merchant/webhook-endpoints')
    webhooks.value = res.data || []
  } catch {
    webhooks.value = []
  } finally {
    loading.value = false
  }
}

const formatDate = (dateStr: string) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(dateStr).toLocaleDateString(localeStr, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatEventLabel = (event: string) => {
  return event.split('.').pop() || event
}

const openCreateDialog = () => {
  form.url = ''
  form.events = []
  Object.keys(formErrors).forEach(key => delete formErrors[key])
  showCreateDialog.value = true
}

const createWebhook = async () => {
  Object.keys(formErrors).forEach(key => delete formErrors[key])

  if (!form.url.trim()) {
    formErrors.url = t('developersPage.webhooks.urlRequired')
    return
  }
  if (form.events.length === 0) {
    formErrors.events = t('developersPage.webhooks.eventsRequired')
    return
  }

  saving.value = true
  try {
    const res = await apiFetch<{ data: WebhookItem & { secret: string } }>('/merchant/webhook-endpoints', {
      method: 'POST',
      body: { url: form.url, events: form.events },
    })

    showCreateDialog.value = false

    // The backend returns the secret in clear ONLY at creation. Surface it once.
    if (res.data?.secret) {
      generatedSecret.value = res.data.secret
      showSecretDialog.value = true
    } else {
      toast.add({ severity: 'success', summary: t('developersPage.webhooks.createdSummary'), detail: t('developersPage.webhooks.createdSuccess'), life: 3000 })
    }

    await fetchWebhooks()
  } catch (e: any) {
    if (e?.data?.errors) {
      const errors = e.data.errors
      Object.keys(errors).forEach(key => {
        formErrors[key] = Array.isArray(errors[key]) ? errors[key][0] : errors[key]
      })
    } else {
      handleError(e, t('developersPage.webhooks.errorSummaryCreate'))
    }
  } finally {
    saving.value = false
  }
}

const copySecret = () => {
  navigator.clipboard.writeText(generatedSecret.value)
  toast.add({ severity: 'success', summary: t('common.copied'), detail: t('developersPage.webhooks.copiedDetail'), life: 2500 })
}

const closeSecretDialog = () => {
  showSecretDialog.value = false
  generatedSecret.value = ''
}

const viewWebhook = (webhook: WebhookItem) => {
  selectedWebhook.value = webhook
  showViewDialog.value = true
}

const confirmDelete = (webhook: WebhookItem) => {
  webhookToDelete.value = webhook
  showViewDialog.value = false
  showDeleteDialog.value = true
}

const deleteWebhook = async () => {
  if (!webhookToDelete.value) return
  deleting.value = true
  try {
    await apiFetch(`/merchant/webhook-endpoints/${webhookToDelete.value.id}`, { method: 'DELETE' })
    webhooks.value = webhooks.value.filter(w => w.id !== webhookToDelete.value!.id)
    showDeleteDialog.value = false
    toast.add({ severity: 'success', summary: t('developersPage.webhooks.deletedSummary'), detail: t('developersPage.webhooks.deletedSuccess'), life: 3000 })
  } catch (e: any) {
    handleError(e, t('developersPage.webhooks.errorSummaryDelete'))
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.webhooks-page {
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

.row-number {
  font-size: 13px;
  color: var(--ze-text-muted);
  font-variant-numeric: tabular-nums;
}

.url-display {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  background: var(--ze-bg-hover);
  padding: 3px 6px;
  border-radius: 4px;
  color: var(--ze-text-body);
  word-break: break-all;
}

.events-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.event-tag {
  background: var(--ze-brand-bg-soft) !important;
  color: var(--ze-brand-hover) !important;
  border: none !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  border-radius: 999px !important;
  padding: 3px 8px !important;
}

.event-tag-more {
  background: var(--ze-bg-hover) !important;
  color: var(--ze-text-muted) !important;
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

.actions-cell {
  display: flex;
  gap: 4px;
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

/* Webhook details */
.webhook-details {
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

.detail-row.full-width {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
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

.detail-url {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  background: var(--ze-bg-hover);
  padding: 3px 6px;
  border-radius: 4px;
  word-break: break-all;
  max-width: 320px;
  color: var(--ze-text-body);
}

.secret-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  background: var(--ze-bg-hover);
  padding: 3px 6px;
  border-radius: 4px;
  color: var(--ze-text-body);
  word-break: break-all;
}

/* One-shot secret reveal */
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

.events-detail-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
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

  .detail-url {
    max-width: 100%;
  }
}
</style>
