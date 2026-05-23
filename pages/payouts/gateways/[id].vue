<template>
  <div class="page">
    <div class="back-row">
      <Button
        icon="pi pi-arrow-left"
        :label="t('gatewayDetail.back')"
        text
        size="small"
        @click="router.push(connectMode ? '/payouts/gateways/list' : '/payouts/gateways')"
      />
    </div>

    <div v-if="loading" class="loading">
      <Skeleton height="3rem" class="mb-2" />
      <Skeleton height="10rem" class="mb-2" />
    </div>

    <GatewayConnectGatewayForm
      v-else-if="connectMode"
      :aggregator="aggregator"
      :saving="saving"
      :server-error="connectError"
      @submit="handleConnect"
      @back="router.push('/payouts/gateways/list')"
    />

    <template v-else-if="aggregator">
      <div class="gateway-header">
        <div class="gateway-header-left">
          <div class="gateway-avatar">{{ aggregator.name.substring(0, 2).toUpperCase() }}</div>
          <div>
            <h2 class="gateway-title">{{ aggregator.name }}</h2>
            <p v-if="aggregator.description" class="gateway-subtitle">{{ aggregator.description }}</p>
          </div>
        </div>
        <Button :label="t('gatewayDetail.updateInfo')" icon="pi pi-pencil" class="outline-pill" @click="openEdit" />
      </div>

      <div class="section">
        <h3 class="section-title">{{ t('gatewayDetail.section.info') }}</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">{{ t('gatewayDetail.info.gateway') }}</span>
            <span class="info-value">{{ aggregator.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('gatewayDetail.info.code') }}</span>
            <code class="info-code">{{ aggregator.code }}</code>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('gatewayDetail.info.environment') }}</span>
            <Tag :value="envStore.current === 'live' ? t('gatewayDetail.info.production') : t('gatewayDetail.info.sandbox')" :severity="envStore.current === 'live' ? 'success' : 'warn'" />
          </div>
          <div v-if="envConfig" class="info-item">
            <span class="info-label">{{ t('gatewayDetail.info.status') }}</span>
            <Tag :value="envConfig.is_active ? t('gatewayDetail.info.statusActive') : t('gatewayDetail.info.statusInactive')" :severity="envConfig.is_active ? 'success' : 'secondary'" />
          </div>
          <div v-if="envConfig" class="info-item">
            <span class="info-label">{{ t('gatewayDetail.info.configuredOn') }}</span>
            <span class="info-value">{{ formatDate(envConfig.configured_at) }}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">{{ t('gatewayDetail.section.webhook') }}</h3>

        <div v-if="envConfig?.webhook_auto_registered" class="auto-banner">
          <AppIcon name="check-circle" />
          <div>
            <p class="auto-banner-title">{{ t('gatewayDetail.webhook.autoBannerTitle', { name: aggregator.name }) }}</p>
            <p class="auto-banner-body" v-html="t('gatewayDetail.webhook.autoBannerBodyPayout', { name: aggregator.name })" />
          </div>
        </div>

        <p class="section-desc" v-html="t('gatewayDetail.webhook.descPayout', { name: aggregator.name })" />

        <div class="webhook-field">
          <label class="webhook-label">{{ t('gatewayDetail.webhook.urlLabel') }}</label>
          <div class="copy-row">
            <code class="copy-value">{{ webhookUrl }}</code>
            <Button icon="pi pi-copy" rounded text size="small" @click="copy(webhookUrl)" v-tooltip="t('gatewayDetail.webhook.copyTooltip')" />
          </div>
        </div>

        <div class="webhook-field">
          <label class="webhook-label">{{ t('gatewayDetail.webhook.secretLabel') }}</label>
          <div class="copy-row">
            <code class="copy-value">{{ envConfig?.webhook_secret_masked || '—' }}</code>
            <Button
              icon="pi pi-refresh"
              rounded
              text
              size="small"
              severity="secondary"
              @click="confirmRegenerateWebhook = true"
              v-tooltip="t('gatewayDetail.webhook.regenerateTooltip')"
            />
          </div>
          <div class="webhook-info">
            <AppIcon name="info-circle" />
            <div>
              <p class="webhook-info-title">{{ t('gatewayDetail.webhook.infoTitle') }}</p>
              <p class="webhook-info-body" v-html="t('gatewayDetail.webhook.infoBodyPayout')" />
            </div>
          </div>
          <p class="webhook-help">
            {{ t('gatewayDetail.webhook.helpShort') }}
          </p>
        </div>
      </div>

      <div class="section danger">
        <h3 class="section-title danger-title">{{ t('gatewayDetail.section.danger') }}</h3>
        <p class="section-desc">
          {{ t('gatewayDetail.danger.descPayout') }}
        </p>
        <Button :label="t('gatewayDetail.danger.disconnect')" severity="danger" outlined size="small" @click="confirmDisconnect = true" />
      </div>
    </template>

    <Dialog v-model:visible="showEdit" :modal="true" :style="{ width: '480px' }" :header="t('gatewayDetail.editDialog.title')">
      <div v-if="aggregator" class="edit-form">
        <div v-for="field in aggregator.required_fields" :key="field" class="edit-field">
          <label class="edit-label">{{ formatField(field) }} <span class="req">*</span></label>
          <InputText v-model="editCreds[field]" :type="isSecret(field) ? 'password' : 'text'" class="w-full" autocomplete="off" />
        </div>
        <p class="edit-help">{{ t('gatewayDetail.editDialog.helpShort', { envLabel: envStore.current === 'live' ? t('gatewayDetail.editDialog.envLive') : t('gatewayDetail.editDialog.envSandbox') }) }}</p>
      </div>
      <template #footer>
        <Button :label="t('gatewayDetail.editDialog.cancel')" severity="secondary" text @click="showEdit = false" />
        <Button :label="t('gatewayDetail.editDialog.save')" :loading="saving" :disabled="!canSaveEdit" @click="handleEdit" />
      </template>
    </Dialog>

    <Dialog v-model:visible="confirmDisconnect" :modal="true" :style="{ width: '420px' }" :header="t('gatewayDetail.disconnectDialog.title')">
      <p v-html="t('gatewayDetail.disconnectDialog.bodyPayout', { name: aggregator?.name ?? '' })" />
      <template #footer>
        <Button :label="t('gatewayDetail.disconnectDialog.cancel')" severity="secondary" text @click="confirmDisconnect = false" />
        <Button :label="t('gatewayDetail.disconnectDialog.confirm')" severity="danger" :loading="deleting" @click="handleDisconnect" />
      </template>
    </Dialog>

    <!-- Confirm webhook regeneration -->
    <Dialog v-model:visible="confirmRegenerateWebhook" :modal="true" :style="{ width: '440px' }" :header="t('gatewayDetail.regenerateDialog.title')">
      <p class="confirm-text" v-html="t('gatewayDetail.regenerateDialog.bodyPayout', { name: aggregator?.name ?? '' })" />
      <template #footer>
        <Button :label="t('gatewayDetail.regenerateDialog.cancel')" severity="secondary" text @click="confirmRegenerateWebhook = false" />
        <Button :label="t('gatewayDetail.regenerateDialog.confirm')" :loading="rotatingWebhook" @click="handleRegenerateWebhook" />
      </template>
    </Dialog>

    <!-- Show new secret one-shot -->
    <Dialog v-model:visible="showNewSecretDialog" :modal="true" :style="{ width: '540px' }" :closable="false" :header="t('gatewayDetail.newSecretDialog.title')">
      <p class="warning-text">
        {{ t('gatewayDetail.newSecretDialog.warning') }}
        <strong>{{ t('gatewayDetail.newSecretDialog.warningStrong') }}</strong>
      </p>
      <div class="key-block">
        <code class="key-value">{{ newWebhookSecret }}</code>
        <Button icon="pi pi-copy" rounded text @click="copy(newWebhookSecret)" v-tooltip="t('gatewayDetail.webhook.copyTooltip')" />
      </div>
      <div class="webhook-info" style="margin-top: 16px;">
        <AppIcon name="info-circle" />
        <div>
          <p class="webhook-info-title">{{ t('gatewayDetail.newSecretDialog.infoTitle', { name: aggregator?.name ?? '' }) }}</p>
          <p class="webhook-info-body" v-html="t('gatewayDetail.newSecretDialog.infoBodyPayout')" />
        </div>
      </div>
      <template #footer>
        <Button :label="t('gatewayDetail.newSecretDialog.saved')" @click="closeNewSecretDialog" />
      </template>
    </Dialog>

    <Toast position="top-right" />
  </div>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import type { AvailableAggregator, AggregatorEnvironment } from '~/composables/useAggregatorConfigs'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const envStore = useEnvironmentStore()
const config = useRuntimeConfig()
const { getAvailable, getConfig, saveConfig, deleteConfig, regenerateWebhook } = useAggregatorConfigs('payout')

const code = computed(() => String(route.params.id))
const forceConnect = computed(() => route.query.connect === '1')

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const rotatingWebhook = ref(false)
const aggregator = ref<AvailableAggregator | null>(null)
const envConfig = ref<AggregatorEnvironment | null>(null)
const showEdit = ref(false)
const editCreds = ref<Record<string, string>>({})
const confirmDisconnect = ref(false)
const confirmRegenerateWebhook = ref(false)
const showNewSecretDialog = ref(false)
const newWebhookSecret = ref('')
const connectError = ref<string | null>(null)

const connectMode = computed(() => forceConnect.value || !envConfig.value)

const load = async () => {
  loading.value = true
  try {
    const availableRes = await getAvailable()
    aggregator.value = (availableRes.data || []).find(a => a.code === code.value) || null
    if (!aggregator.value) {
      toast.add({ severity: 'error', summary: t('gatewayDetail.errorSummary'), detail: t('gatewayDetail.unknownGateway'), life: 4000 })
      return
    }
    if (aggregator.value.configured_in_active_env) {
      const detailRes = await getConfig(code.value)
      envConfig.value = (detailRes.data?.environments || []).find(e => e.environment === envStore.current) || null
    } else {
      envConfig.value = null
    }
  } catch {
    toast.add({ severity: 'error', summary: t('gatewayDetail.errorSummary'), detail: t('gatewayDetail.loadError'), life: 4000 })
  } finally {
    loading.value = false
  }
}

onMounted(load)

const webhookUrl = computed(() => {
  if (envConfig.value?.webhook_url) return envConfig.value.webhook_url
  const base = config.public.apiBase || 'http://localhost:8000/api'
  return `${base.replace(/\/$/, '')}/webhooks/${code.value}`
})

const handleConnect = async (credentials: Record<string, string>) => {
  if (!aggregator.value) return
  saving.value = true
  connectError.value = null
  try {
    const res = await saveConfig({ aggregator_code: aggregator.value.code, credentials, is_active: true })
    const secret = (res as any)?.data?.webhook_secret
    if (secret) {
      newWebhookSecret.value = secret
      showNewSecretDialog.value = true
    } else {
      toast.add({ severity: 'success', summary: t('gatewayDetail.connectSuccess.summary'), life: 3000 })
    }
    router.replace(`/payouts/gateways/${code.value}`).then(load)
  } catch (e: any) {
    connectError.value = e?.data?.message || t('gatewayDetail.connectError')
    toast.add({ severity: 'error', summary: t('gatewayDetail.errorSummary'), detail: connectError.value, life: 4000 })
  } finally {
    saving.value = false
  }
}

const handleRegenerateWebhook = async () => {
  if (!aggregator.value) return
  rotatingWebhook.value = true
  try {
    const res = await regenerateWebhook(aggregator.value.code)
    newWebhookSecret.value = res.data?.webhook_secret || ''
    confirmRegenerateWebhook.value = false
    showNewSecretDialog.value = true
    await load()
  } catch (e: any) {
    toast.add({ severity: 'error', summary: t('gatewayDetail.errorSummary'), detail: e?.data?.message || t('gatewayDetail.regenerateDialog.error'), life: 4000 })
  } finally {
    rotatingWebhook.value = false
  }
}

const closeNewSecretDialog = () => {
  showNewSecretDialog.value = false
  newWebhookSecret.value = ''
}

const openEdit = () => {
  editCreds.value = {}
  showEdit.value = true
}

const canSaveEdit = computed(() => {
  if (!aggregator.value) return false
  return aggregator.value.required_fields.every(f => editCreds.value[f]?.trim())
})

const handleEdit = async () => {
  if (!aggregator.value || !canSaveEdit.value) return
  saving.value = true
  try {
    await saveConfig({ aggregator_code: aggregator.value.code, credentials: { ...editCreds.value }, is_active: true })
    toast.add({ severity: 'success', summary: t('gatewayDetail.editDialog.updatedSummary'), life: 3000 })
    showEdit.value = false
    await load()
  } catch (e: any) {
    toast.add({ severity: 'error', summary: t('gatewayDetail.errorSummary'), detail: e?.data?.message || t('gatewayDetail.editDialog.updateError'), life: 4000 })
  } finally {
    saving.value = false
  }
}

const handleDisconnect = async () => {
  if (!aggregator.value) return
  deleting.value = true
  try {
    await deleteConfig(aggregator.value.code)
    toast.add({ severity: 'success', summary: t('gatewayDetail.disconnectDialog.successSummary'), life: 3000 })
    router.push('/payouts/gateways')
  } catch (e: any) {
    toast.add({ severity: 'error', summary: t('gatewayDetail.errorSummary'), detail: e?.data?.message || t('gatewayDetail.disconnectDialog.error'), life: 4000 })
  } finally {
    deleting.value = false
    confirmDisconnect.value = false
  }
}

const copy = (text: string) => {
  if (typeof navigator !== 'undefined') {
    navigator.clipboard.writeText(text)
    toast.add({ severity: 'info', summary: t('gatewayDetail.copiedSummary'), life: 1500 })
  }
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatField = (field: string) => field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
const isSecret = (field: string) => /key|secret|token|password/i.test(field)
</script>

<style scoped>
.page { min-height: 100%; }
.back-row { margin-bottom: 16px; }
.loading { padding: 16px 0; }

.gateway-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.gateway-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.gateway-avatar {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: var(--ze-icon-circle-bg);
  color: var(--ze-icon-circle-fg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.gateway-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--ze-text-strong);
  margin: 0;
  line-height: 1.2;
}

.gateway-subtitle {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 4px 0 0;
}

.outline-pill {
  color: var(--ze-brand) !important;
  background: var(--ze-bg-card) !important;
  border: 1px solid var(--ze-brand-border) !important;
  border-radius: 999px !important;
  padding: 6px 14px !important;
}

.section {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0 0 14px;
}

.section-desc {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0 0 14px;
  line-height: 1.6;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--ze-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.info-value {
  font-size: 14px;
  color: var(--ze-text-body);
  font-weight: 500;
}

.info-code {
  font-size: 12px;
  background: var(--ze-bg-subtle);
  color: var(--ze-text-body);
  padding: 2px 8px;
  border-radius: 3px;
  font-family: monospace;
  width: fit-content;
}

.webhook-field {
  margin-top: 14px;
}

.webhook-field:first-child {
  margin-top: 0;
}

.webhook-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--ze-text-label);
  margin-bottom: 6px;
}

.webhook-help {
  font-size: 11px;
  color: var(--ze-text-disabled);
  margin: 6px 0 0;
}

/* Banners — Linear/Stripe style: neutral surface + 3px accent strip */
.webhook-info {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-left: 3px solid var(--ze-brand);
  border-radius: 4px;
  margin-top: 10px;
}

.webhook-info i {
  font-size: 14px;
  line-height: 1.5;
  color: var(--ze-brand);
  flex-shrink: 0;
}

.webhook-info-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ze-brand);
  margin: 0 0 4px;
}

.webhook-info-body {
  font-size: 12px;
  color: var(--ze-text-muted);
  line-height: 1.5;
  margin: 0;
}

.auto-banner {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-left: 3px solid var(--ze-success-fg);
  border-radius: 4px;
  margin-bottom: 14px;
}

.auto-banner i {
  font-size: 16px;
  line-height: 1.5;
  color: var(--ze-success-fg);
  flex-shrink: 0;
}

.auto-banner-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ze-success-fg);
  margin: 0 0 4px;
}

.auto-banner-body {
  font-size: 12px;
  color: var(--ze-text-muted);
  line-height: 1.5;
  margin: 0;
}

.copy-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border-subtle);
  border-radius: 4px;
  padding: 8px 12px;
}

.copy-value {
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--ze-text-label);
  word-break: break-all;
}

.warning-text {
  font-size: 13px;
  color: var(--ze-text-label);
  margin: 0 0 16px;
  line-height: 1.6;
}

.key-block {
  background: var(--ze-bg-subtle);
  padding: 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.key-value {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  word-break: break-all;
  color: var(--ze-text-body);
  flex: 1;
}

.confirm-text {
  font-size: 14px;
  color: var(--ze-text-label);
  line-height: 1.6;
  margin: 0;
}

.danger { border-color: var(--ze-danger-border); }
.danger-title { color: var(--ze-danger-fg); }

.edit-form { display: flex; flex-direction: column; gap: 14px; }
.edit-field { display: flex; flex-direction: column; gap: 6px; }
.edit-label { font-size: 13px; font-weight: 500; color: var(--ze-text-label); }
.req { color: var(--ze-danger-fg); }
.edit-help { font-size: 12px; color: var(--ze-text-muted); margin: 4px 0 0; }
.w-full { width: 100%; }

/* Responsive: stack gateway-header on mobile, allow webhook values to wrap */
@media (max-width: 640px) {
  .gateway-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .webhook-field .copy-row {
    flex-wrap: wrap;
  }
  .webhook-field .copy-row .copy-value {
    word-break: break-all;
    white-space: normal;
  }
}
</style>
