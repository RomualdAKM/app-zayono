<template>
  <div class="settings-page">
    <p class="page-subtitle">{{ $t('settingsPage.subtitle') }}</p>

    <div class="settings-container">
      <TabView v-model:activeIndex="activeTab">
        <TabPanel value="informations" :header="$t('settingsPage.tabs.informations')">
          <div class="tab-content">
            <!-- App ID — the active application's UUID, used in
                 `X-Zayono-Application` header, API key scoping, webhook
                 URLs and support tickets. -->
            <div class="section-block">
              <label class="field-label">{{ $t('settingsPage.informations.appIdLabel') }}</label>
              <div class="app-id-row">
                <span class="app-id-value">{{ appId }}</span>
                <Button
                  icon="pi pi-copy"
                  severity="secondary"
                  text
                  size="small"
                  @click="copyAppId"
                  v-tooltip.top="$t('settingsPage.copy.tooltip')"
                />
              </div>
            </div>

            <!-- App Icon -->
            <div class="section-block">
              <label class="field-label">{{ $t('settingsPage.informations.iconLabel') }}</label>
              <div class="icon-upload-row">
                <div class="icon-preview">
                  <img v-if="form.app_icon" :src="form.app_icon" alt="App icon" />
                  <i v-else class="pi pi-image"></i>
                </div>
                <div class="icon-upload-actions">
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="handleFileUpload"
                  />
                  <Button
                    :label="$t('settingsPage.informations.updateIcon')"
                    severity="secondary"
                    outlined
                    size="small"
                    :loading="uploadingIcon"
                    @click="($refs.fileInput as HTMLInputElement)?.click()"
                  />
                </div>
              </div>
            </div>

            <!-- Application name — the brand the customer sees on
                 receipts and the checkout page. Writes back to
                 `applications.name` via the `application_name` field. -->
            <div class="section-block">
              <label class="field-label">{{ $t('settingsPage.informations.nameLabel') }}</label>
              <InputText v-model="form.application_name" class="w-full" :placeholder="$t('settingsPage.informations.namePlaceholder')" />
            </div>

            <!-- Description (optional) -->
            <div class="section-block">
              <label class="field-label">{{ $t('settingsPage.informations.descriptionLabel') }}</label>
              <InputText
                v-model="form.application_description"
                class="w-full"
                :placeholder="$t('settingsPage.informations.descriptionPlaceholder')"
              />
            </div>

            <!-- Website -->
            <div class="section-block">
              <label class="field-label">{{ $t('settingsPage.informations.websiteLabel') }}</label>
              <InputText v-model="form.website" class="w-full" :placeholder="$t('settingsPage.informations.websitePlaceholder')" />
            </div>

            <div class="section-actions">
              <Button :label="$t('settingsPage.informations.submit')" :loading="savingInfo" @click="saveInformations" />
            </div>
          </div>
        </TabPanel>

        <TabPanel value="reglages" :header="$t('settingsPage.tabs.reglages')">
          <div class="tab-content">
            <!-- Toggles -->
            <div class="toggle-section">
              <div class="toggle-item">
                <div class="toggle-info">
                  <span class="toggle-label">{{ $t('settingsPage.reglages.transactionEmailsLabel') }}</span>
                  <span class="toggle-desc">{{ $t('settingsPage.reglages.transactionEmailsDesc') }}</span>
                </div>
                <ToggleSwitch v-model="form.transaction_emails" />
              </div>

              <div class="toggle-item">
                <div class="toggle-info">
                  <span class="toggle-label">{{ $t('settingsPage.reglages.clientReceiptLabel') }}</span>
                  <span class="toggle-desc">{{ $t('settingsPage.reglages.clientReceiptDesc') }}</span>
                </div>
                <ToggleSwitch v-model="form.client_receipt" />
              </div>

              <div class="toggle-item">
                <div class="toggle-info">
                  <span class="toggle-label">{{ $t('settingsPage.reglages.paymentEmailsLabel') }}</span>
                  <span class="toggle-desc">{{ $t('settingsPage.reglages.paymentEmailsDesc') }}</span>
                </div>
                <ToggleSwitch v-model="form.payment_emails" />
              </div>
            </div>

            <div class="separator"></div>

            <!-- Support fields -->
            <div class="section-block">
              <label class="field-label">{{ $t('settingsPage.reglages.supportEmailLabel') }}</label>
              <InputText v-model="form.support_email" class="w-full" :placeholder="$t('settingsPage.reglages.supportEmailPlaceholder')" type="email" />
            </div>

            <div class="section-block">
              <label class="field-label">{{ $t('settingsPage.reglages.supportPhoneLabel') }}</label>
              <InputText v-model="form.support_phone" class="w-full" :placeholder="$t('settingsPage.reglages.supportPhonePlaceholder')" />
            </div>

            <div class="section-actions">
              <Button :label="$t('settingsPage.reglages.submit')" :loading="savingSettings" @click="saveSettings" />
            </div>
          </div>
        </TabPanel>

        <TabPanel value="security" :header="$t('settingsPage.tabs.security')">
          <div class="tab-content">
            <!-- 2FA section. The status sub-component reads from
                 /auth/2fa/status and renders one of three states:
                 disabled (CTA to enable), setup in progress (continue
                 button), enabled (recovery + disable controls). -->
            <SettingsTwoFactor />
          </div>
        </TabPanel>
      </TabView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'

const authStore = useAuthStore()
const appStore = useApplicationStore()
const { apiFetch } = useApi()
const { handleError } = useApiError()
const toast = useToast()
const { t } = useI18n()

const activeTab = ref(0)
const savingInfo = ref(false)
const savingSettings = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// App ID = the currently-active application's UUID.
// Used by the backend's `X-Zayono-Application` header check, the API
// key scoping, the webhook URLs and the support tooling. Pulled from
// the application store rather than the auth store so multi-app users
// always see the right id when they switch apps.
const appId = computed(() => appStore.current?.id || '')

const form = reactive({
  // Application direct columns
  application_name: '',
  application_description: '',
  // Merchant direct column (kept for future "company name" field if we
  // re-add it; not displayed on this screen anymore).
  company_name: '',
  // applications.settings JSON
  website: '',
  app_icon: '',
  transaction_emails: false,
  client_receipt: false,
  payment_emails: false,
  support_email: '',
  support_phone: '',
})

const loadSettings = async () => {
  try {
    const res = await apiFetch<{ success: boolean; data: any }>('/merchant/settings')
    if (res.data) {
      // Application-level direct columns
      form.application_name = res.data.application?.name || ''
      form.application_description = res.data.application?.description || ''
      // Merchant-level
      form.company_name = res.data.merchant?.company_name || ''
      // Per-app settings JSON
      const s = res.data.settings || {}
      form.website = s.website || ''
      form.app_icon = s.app_icon || ''
      form.transaction_emails = s.transaction_emails || false
      form.client_receipt = s.client_receipt || false
      form.payment_emails = s.payment_emails || false
      form.support_email = s.support_email || ''
      form.support_phone = s.support_phone || ''
    }
  } catch (e: any) {
    // Fallback: pre-fill from the local stores so the user sees SOMETHING
    // even if /merchant/settings 401'd or 5xx'd.
    if (appStore.current) {
      form.application_name = appStore.current.name || ''
      form.application_description = appStore.current.description || ''
    }
    if (authStore.merchant) {
      form.company_name = authStore.merchant.company_name || ''
    }
  }
}

const copyAppId = () => {
  navigator.clipboard.writeText(appId.value)
  toast.add({ severity: 'success', summary: t('settingsPage.copy.summary'), detail: t('settingsPage.copy.appIdSuccess'), life: 2000 })
}

const uploadingIcon = ref(false)

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Soft client-side guard — the server is the source of truth (max 2 MB, image only)
  if (file.size > 2 * 1024 * 1024) {
    toast.add({ severity: 'warn', summary: t('settingsPage.icon.tooSheavyTitle'), detail: t('settingsPage.icon.tooHeavyDetail'), life: 4000 })
    target.value = ''
    return
  }

  const formData = new FormData()
  formData.append('icon', file)

  uploadingIcon.value = true
  try {
    const res = await apiFetch<{ success: boolean; data: { app_icon: string } }>(
      '/merchant/settings/icon',
      { method: 'POST', body: formData }
    )
    form.app_icon = res.data?.app_icon || form.app_icon
    toast.add({ severity: 'success', summary: t('settingsPage.icon.updatedSummary'), life: 2500 })
  } catch (e: any) {
    handleError(e, t('settingsPage.icon.errorSummary'))
  } finally {
    uploadingIcon.value = false
    target.value = ''
  }
}

const saveInformations = async () => {
  savingInfo.value = true
  try {
    const res = await apiFetch<{ success: boolean; data: any }>('/merchant/settings', {
      method: 'PUT',
      body: {
        application_name: form.application_name,
        application_description: form.application_description,
        website: form.website,
      },
    })
    // Push the new name into the local store so the sidebar app-switcher
    // and the /apps grid pick it up immediately, no page reload needed.
    const updated = res?.data?.application
    if (updated && appStore.currentId) {
      appStore.list = appStore.list.map(a =>
        a.id === appStore.currentId
          ? { ...a, name: updated.name, description: updated.description }
          : a
      )
    }
    toast.add({ severity: 'success', summary: t('settingsPage.successSummary'), detail: t('settingsPage.informations.saveSuccess'), life: 3000 })
  } catch (e: any) {
    handleError(e, t('settingsPage.informations.errorSummary'))
  } finally {
    savingInfo.value = false
  }
}

const saveSettings = async () => {
  savingSettings.value = true
  try {
    await apiFetch('/merchant/settings', {
      method: 'PUT',
      body: {
        transaction_emails: form.transaction_emails,
        client_receipt: form.client_receipt,
        payment_emails: form.payment_emails,
        support_email: form.support_email,
        support_phone: form.support_phone,
      },
    })
    toast.add({ severity: 'success', summary: t('settingsPage.successSummary'), detail: t('settingsPage.reglages.saveSuccess'), life: 3000 })
  } catch (e: any) {
    handleError(e, t('settingsPage.reglages.errorSummary'))
  } finally {
    savingSettings.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.page-subtitle {
  width: 100%;
  max-width: 720px;
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0 0 20px;
}

.settings-container {
  width: 100%;
  max-width: 720px;
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
}

/* PrimeVue 4 TabView styling — v4 renamed internals (no more
   .p-tabview-nav / .p-highlight). */
.settings-container :deep(.p-tabview-tablist) {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--ze-border);
  background: transparent;
  margin-bottom: 4px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.settings-container :deep(.p-tabview-tablist-item) {
  list-style: none;
  margin: 0;
}

.settings-container :deep(.p-tabview-tab-header) {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--ze-text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 10px 16px;
  margin-bottom: -1px;
  border-radius: 0;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.settings-container :deep(.p-tabview-tab-header:hover) {
  color: var(--ze-brand);
  background: transparent;
}

.settings-container :deep(.p-tabview-tablist-item-active .p-tabview-tab-header) {
  color: var(--ze-brand);
  border-bottom-color: var(--ze-brand);
  background: transparent;
}

.settings-container :deep(.p-tabview-ink-bar) {
  display: none;
}

.settings-container :deep(.p-tabview-panels) {
  padding: 0;
  background: transparent;
}

.settings-container :deep(.p-tabview-panel) {
  outline: none;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-top: 20px;
}

.section-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ze-text-strong);
}

.section-block :deep(.p-inputtext) {
  font-size: 13px;
  padding: 9px 12px;
  border: 1px solid var(--ze-border);
  border-radius: 6px;
}

.section-block :deep(.p-inputtext:focus) {
  border-color: var(--ze-brand);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.app-id-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-radius: 6px;
  padding: 8px 12px;
}

.app-id-value {
  font-size: 13px;
  font-family: monospace;
  color: var(--ze-text-label);
  user-select: all;
  word-break: break-all;
}

.icon-upload-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-preview {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--ze-bg-hover);
  border: 1px solid var(--ze-border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.icon-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.icon-preview i {
  font-size: 24px;
  color: var(--ze-text-disabled);
}

.icon-upload-actions :deep(.p-button.p-button-outlined) {
  color: var(--ze-brand);
  border: 1px solid var(--ze-brand-border);
  background: var(--ze-bg-card);
  border-radius: 999px;
  font-size: 13px;
  padding: 6px 14px;
}

.icon-upload-actions :deep(.p-button.p-button-outlined:hover) {
  background: var(--ze-brand-bg-soft);
  border-color: var(--ze-brand);
}

.toggle-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--ze-bg-hover);
}

.toggle-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ze-text-strong);
}

.toggle-desc {
  font-size: 13px;
  color: var(--ze-text-muted);
}

.separator {
  height: 1px;
  background: var(--ze-border);
}

.section-actions {
  padding-top: 8px;
}

.section-actions :deep(.p-button) {
  background: var(--ze-brand);
  border-color: var(--ze-brand);
  color: #FFFFFF;
  border-radius: 6px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 500;
}

.section-actions :deep(.p-button:hover) {
  background: var(--ze-brand-hover);
  border-color: var(--ze-brand-hover);
}

.w-full {
  width: 100%;
}

@media (max-width: 480px) {
  .toggle-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .icon-upload-row {
    flex-wrap: wrap;
  }
}
</style>
