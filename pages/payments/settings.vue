<template>
  <div class="payment-settings-page">
    <p class="page-subtitle">{{ $t('paymentSettings.subtitle') }}</p>

    <div class="settings-container">
      <TabView v-model:activeIndex="activeTab">
        <TabPanel value="aiguillage" :header="$t('paymentSettings.tabs.orchestration')">
          <div class="tab-content">
            <div class="section-header">
              <h3 class="section-title">{{ $t('paymentSettings.orchestration.title') }}</h3>
              <p class="section-desc">{{ $t('paymentSettings.orchestration.subtitle') }}</p>
            </div>

            <div class="radio-group">
              <div
                class="radio-option"
                :class="{ active: form.routing_strategy === 'custom' }"
                @click="form.routing_strategy = 'custom'"
              >
                <RadioButton v-model="form.routing_strategy" inputId="routing_custom" value="custom" />
                <div class="radio-content">
                  <label for="routing_custom" class="radio-label">{{ $t('paymentSettings.orchestration.customLabel') }}</label>
                  <span class="radio-desc">{{ $t('paymentSettings.orchestration.customDesc') }}</span>
                </div>
              </div>

              <div
                class="radio-option"
                :class="{ active: form.routing_strategy === 'auto' }"
                @click="form.routing_strategy = 'auto'"
              >
                <RadioButton v-model="form.routing_strategy" inputId="routing_auto" value="auto" />
                <div class="radio-content">
                  <label for="routing_auto" class="radio-label">{{ $t('paymentSettings.orchestration.autoLabel') }}</label>
                  <span class="radio-desc">{{ $t('paymentSettings.orchestration.autoDesc') }}</span>
                </div>
              </div>
            </div>

            <div class="section-actions">
              <Button :label="$t('paymentSettings.orchestration.save')" :loading="savingOrchestration" @click="saveOrchestration" />
            </div>
          </div>
        </TabPanel>

        <TabPanel value="conversion" :header="$t('paymentSettings.tabs.conversion')">
          <div class="tab-content">
            <div class="toggle-section">
              <div class="toggle-item">
                <div class="toggle-info">
                  <span class="toggle-label">{{ $t('paymentSettings.conversion.toggleLabel') }}</span>
                  <span class="toggle-desc">{{ $t('paymentSettings.conversion.toggleDesc') }}</span>
                </div>
                <ToggleSwitch v-model="form.currency_conversion" />
              </div>
            </div>

            <div class="section-block" v-if="form.currency_conversion">
              <label class="field-label">{{ $t('paymentSettings.conversion.rateLabel') }}</label>
              <div class="rate-input-row">
                <InputNumber
                  v-model="form.correction_rate"
                  :min="0"
                  :max="100"
                  :minFractionDigits="1"
                  :maxFractionDigits="2"
                  suffix=" %"
                  class="rate-input"
                />
              </div>
              <span class="field-desc">{{ $t('paymentSettings.conversion.rateDesc') }}</span>
            </div>

            <div class="section-actions">
              <Button :label="$t('paymentSettings.conversion.save')" :loading="savingConversion" @click="saveConversion" />
            </div>
          </div>
        </TabPanel>

        <TabPanel value="apparence" :header="$t('paymentSettings.tabs.appearance')">
          <div class="tab-content">
            <div class="section-header">
              <h3 class="section-title">{{ $t('paymentSettings.appearance.title') }}</h3>
              <p class="section-desc" v-html="$t('paymentSettings.appearance.subtitleLong')"></p>
            </div>

            <div class="template-grid">
              <div
                v-for="tpl in templates"
                :key="tpl.value"
                class="template-card"
                :class="{ 'template-card--active': form.checkout_template === tpl.value }"
                @click="form.checkout_template = tpl.value"
              >
                <div class="template-preview" :class="`tpl-${tpl.value}`">
                  <div class="tpl-mock">
                    <div class="tpl-mock-merchant"></div>
                    <div class="tpl-mock-amount"></div>
                    <div class="tpl-mock-methods">
                      <div class="tpl-mock-method"></div>
                      <div class="tpl-mock-method"></div>
                      <div class="tpl-mock-method"></div>
                    </div>
                    <div class="tpl-mock-button"></div>
                  </div>
                </div>
                <div class="template-info">
                  <div class="template-info-head">
                    <h4 class="template-name">{{ tpl.name }}</h4>
                    <Tag v-if="form.checkout_template === tpl.value" :value="$t('paymentSettings.appearance.selected')" severity="success" class="template-tag" />
                  </div>
                  <p class="template-desc">{{ tpl.description }}</p>
                </div>
              </div>
            </div>

            <div class="brand-block">
              <div class="section-header">
                <h3 class="section-title">{{ $t('paymentSettings.appearance.brand.title') }}</h3>
                <p class="section-desc">{{ $t('paymentSettings.appearance.brand.subtitle') }}</p>
              </div>

              <div class="brand-row">
                <div class="brand-controls">
                  <label class="field-label">{{ $t('paymentSettings.appearance.brand.primaryColor') }}</label>
                  <div class="color-cluster">
                    <input
                      type="color"
                      class="color-swatch"
                      :value="form.checkout_primary_color || '#2563EB'"
                      @input="onColorPicked"
                    />
                    <InputText
                      v-model="form.checkout_primary_color"
                      placeholder="#2563EB"
                      class="hex-input"
                      :class="{ 'hex-input--invalid': hexInvalid }"
                      maxlength="7"
                    />
                    <Button
                      :label="$t('paymentSettings.appearance.brand.reset')"
                      text
                      size="small"
                      severity="secondary"
                      @click="form.checkout_primary_color = ''"
                    />
                  </div>
                  <span v-if="hexInvalid" class="hex-error">{{ $t('paymentSettings.appearance.brand.hexError') }}</span>
                  <span v-else-if="contrastWarning" class="contrast-warning">
                    <AppIcon name="exclamation-triangle" /> {{ contrastWarning }}
                  </span>
                </div>

                <div class="brand-preview-wrap">
                  <span class="preview-label">{{ $t('paymentSettings.appearance.brand.previewLabel') }}</span>
                  <div
                    class="brand-preview-button"
                    :style="{ background: previewColor }"
                  >{{ $t('paymentSettings.appearance.brand.previewButton') }}</div>
                </div>
              </div>
            </div>

            <div class="section-actions">
              <Button :label="$t('paymentSettings.appearance.save')" :loading="savingTemplate" :disabled="hexInvalid" @click="saveTemplate" />
            </div>
          </div>
        </TabPanel>
      </TabView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'

const { apiFetch } = useApi()
const { handleError } = useApiError()
const { t } = useI18n()
const toast = useToast()

const activeTab = ref(0)
const savingOrchestration = ref(false)
const savingConversion = ref(false)
const savingTemplate = ref(false)

// Typed as the literal union so `form.checkout_template = tpl.value`
// stays type-safe (the form field is `'default' | 'abidjan' | 'cotonou'`).
const templates = computed<Array<{ value: 'default' | 'abidjan' | 'cotonou'; name: string; description: string }>>(() => [
  {
    value: 'default',
    name: t('paymentSettings.appearance.templates.standardName'),
    description: t('paymentSettings.appearance.templates.standardDesc'),
  },
  {
    value: 'abidjan',
    name: t('paymentSettings.appearance.templates.abidjanName'),
    description: t('paymentSettings.appearance.templates.abidjanDesc'),
  },
  {
    value: 'cotonou',
    name: t('paymentSettings.appearance.templates.cotonouName'),
    description: t('paymentSettings.appearance.templates.cotonouDesc'),
  },
])

const form = reactive({
  routing_strategy: 'custom',
  currency_conversion: false,
  correction_rate: 2,
  checkout_template: 'default' as 'default' | 'abidjan' | 'cotonou',
  // Empty string = use Zayono's default. The backend persists null in that
  // case so /checkout/show falls back to each template's baseline color.
  checkout_primary_color: '' as string,
})

// ─── Color helpers ────────────────────────────────────────────────────
const HEX_RE = /^#[0-9A-Fa-f]{6}$/

const previewColor = computed(() => {
  return HEX_RE.test(form.checkout_primary_color) ? form.checkout_primary_color : '#2563EB'
})

const hexInvalid = computed(() => {
  return form.checkout_primary_color !== '' && !HEX_RE.test(form.checkout_primary_color)
})

/**
 * WCAG relative luminance. Pure RGB → physical light level [0, 1].
 * Used to compute the contrast ratio of the merchant's color against
 * the button's white text.
 */
function relativeLuminance(hex: string): number | null {
  const m = hex.match(/^#?([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$/)
  if (!m) return null
  const channels = [m[1], m[2], m[3]].map((h) => {
    let c = parseInt(h, 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

const contrastWarning = computed(() => {
  if (!HEX_RE.test(form.checkout_primary_color)) return ''
  const lum = relativeLuminance(form.checkout_primary_color)
  if (lum === null) return ''
  // White text: luminance 1. Ratio formula: (L1 + 0.05) / (L2 + 0.05) with
  // L1 = brighter of the two. White is always L1 here unless the picked
  // color is *literally* white (then ratio = 1, totally illegible).
  const ratio = (1 + 0.05) / (lum + 0.05)
  if (ratio < 3) {
    return t('paymentSettings.appearance.brand.contrastVeryLow', { ratio: ratio.toFixed(1) })
  }
  if (ratio < 4.5) {
    return t('paymentSettings.appearance.brand.contrastLow', { ratio: ratio.toFixed(1) })
  }
  return ''
})

function onColorPicked(e: Event) {
  const v = (e.target as HTMLInputElement).value
  // <input type="color"> emits a normalized 7-char hex. Persist uppercase
  // so it matches our backend regex unambiguously.
  form.checkout_primary_color = v.toUpperCase()
}

const loadSettings = async () => {
  try {
    const res = await apiFetch<{ success: boolean; data: any }>('/merchant/settings')
    if (res.data) {
      const s = res.data.settings || {}
      form.routing_strategy = s.routing_strategy || 'custom'
      form.currency_conversion = s.currency_conversion || false
      form.correction_rate = s.correction_rate ?? 2
      form.checkout_template = (s.checkout_template as any) || 'default'
      form.checkout_primary_color = s.checkout_primary_color || ''
    }
  } catch (e: any) {
    // Use defaults
  }
}

const saveTemplate = async () => {
  if (hexInvalid.value) return
  savingTemplate.value = true
  try {
    await apiFetch('/merchant/settings', {
      method: 'PUT',
      body: {
        checkout_template: form.checkout_template,
        // Empty string → null so the merchant can revert to Zayono's default.
        checkout_primary_color: form.checkout_primary_color || null,
      },
    })
    toast.add({ severity: 'success', summary: t('paymentSettings.appearance.saveSuccess'), life: 3000 })
  } catch (e: any) {
    handleError(e, t('paymentSettings.appearance.errorSummary'))
  } finally {
    savingTemplate.value = false
  }
}

const saveOrchestration = async () => {
  savingOrchestration.value = true
  try {
    await apiFetch('/merchant/settings', {
      method: 'PUT',
      body: {
        routing_strategy: form.routing_strategy,
      },
    })
    toast.add({ severity: 'success', summary: t('status.success'), detail: t('paymentSettings.orchestration.saveSuccess'), life: 3000 })
  } catch (e: any) {
    handleError(e, t('paymentSettings.orchestration.errorSummary'))
  } finally {
    savingOrchestration.value = false
  }
}

const saveConversion = async () => {
  savingConversion.value = true
  try {
    await apiFetch('/merchant/settings', {
      method: 'PUT',
      body: {
        currency_conversion: form.currency_conversion,
        correction_rate: form.correction_rate,
      },
    })
    toast.add({ severity: 'success', summary: t('status.success'), detail: t('paymentSettings.conversion.saveSuccess'), life: 3000 })
  } catch (e: any) {
    handleError(e, t('paymentSettings.conversion.errorSummary'))
  } finally {
    savingConversion.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.payment-settings-page {
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

/* PrimeVue 4 TabView styling — v4 renamed all the internals.
   Old: .p-tabview-nav / .p-tabview-nav-link / .p-highlight
   New: .p-tabview-tablist / .p-tabview-tab-header / .p-tabview-tablist-item-active */
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
  margin-bottom: -1px;          /* overlap the tablist border so the active underline merges */
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
  display: none;                /* using border-bottom on the active header instead */
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

.section-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0;
}

.section-desc {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.radio-option:hover {
  border-color: var(--ze-brand-border);
}

.radio-option.active {
  border-color: var(--ze-brand);
  background: var(--ze-brand-bg-soft);
}

.radio-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.radio-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ze-text-strong);
  cursor: pointer;
}

.radio-desc {
  font-size: 13px;
  color: var(--ze-text-muted);
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

.field-desc {
  font-size: 12px;
  color: var(--ze-text-muted);
}

.rate-input-row {
  max-width: 200px;
}

.rate-input {
  width: 100%;
}

.rate-input :deep(.p-inputtext) {
  font-size: 13px;
  padding: 9px 12px;
  border: 1px solid var(--ze-border);
  border-radius: 6px;
}

.rate-input :deep(.p-inputtext:focus) {
  border-color: var(--ze-brand);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
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

/* Template grid */
.template-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.template-card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.template-card:hover {
  border-color: var(--ze-brand-border);
}

.template-card--active {
  border-color: var(--ze-brand);
  background: var(--ze-brand-bg-soft);
}

.template-preview {
  background: var(--ze-bg-hover);
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
}

/* Template previews keep their hardcoded gradient — they are visual mock-ups
   meant to look the same in both modes for predictable preview. */
.tpl-default { background: linear-gradient(135deg, #EEF4FF, #F3F4F6); }
.tpl-abidjan { background: linear-gradient(135deg, #EEF4FF, #DBEAFE); }
.tpl-cotonou { background: linear-gradient(135deg, #F3F4F6, #EEF4FF); }

.tpl-mock {
  background: #FFFFFF;
  border-radius: 6px;
  padding: 10px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tpl-mock-merchant {
  height: 8px;
  width: 40%;
  background: #E5E7EB;
  border-radius: 99px;
}

.tpl-mock-amount {
  height: 14px;
  width: 60%;
  background: var(--ze-brand);
  border-radius: 4px;
}

.tpl-mock-methods {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.tpl-mock-method {
  height: 8px;
  background: #E5E7EB;
  border-radius: 4px;
}

.tpl-mock-button {
  height: 12px;
  background: var(--ze-brand);
  border-radius: 4px;
  margin-top: auto;
}

.tpl-cotonou .tpl-mock {
  flex-direction: row;
  gap: 8px;
}

.tpl-cotonou .tpl-mock-methods {
  flex: 1;
}

.tpl-cotonou .tpl-mock-merchant,
.tpl-cotonou .tpl-mock-amount,
.tpl-cotonou .tpl-mock-button {
  width: 100%;
}

.template-info {
  padding: 12px 14px;
}

.template-info-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.template-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0;
}

.template-tag {
  font-size: 10px !important;
  padding: 2px 6px !important;
  background: var(--ze-brand-bg-soft) !important;
  color: var(--ze-brand) !important;
}

.template-desc {
  font-size: 12px;
  color: var(--ze-text-muted);
  margin: 0;
  line-height: 1.5;
}

/* ─── Brand color customization ───────────────────────────────────── */

.brand-block {
  padding-top: 24px;
  border-top: 1px solid var(--ze-border-subtle);
}

.brand-row {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.brand-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 280px;
}

.color-cluster {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Native <input type="color"> is universally supported and styles round
   the same way across Chromium/Firefox/Safari when shrunken into a square
   chip. Wrapping it would require a third-party color-picker — not worth
   it for one field. */
.color-swatch {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--ze-border);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.hex-input {
  width: 120px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  text-transform: uppercase;
}

.hex-input--invalid :deep(.p-inputtext),
.hex-input--invalid.p-inputtext {
  border-color: var(--ze-danger, #DC2626);
}

.hex-error {
  font-size: 12px;
  color: var(--ze-danger, #DC2626);
}

.contrast-warning {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ze-warning, #B45309);
  background: var(--ze-warning-bg, #FEF3C7);
  padding: 6px 10px;
  border-radius: 4px;
}

.brand-preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
}

.preview-label {
  font-size: 12px;
  color: var(--ze-text-muted);
}

.brand-preview-button {
  padding: 12px 20px;
  border-radius: 8px;
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  transition: background 0.15s;
}

@media (max-width: 768px) {
  .template-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .toggle-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .radio-option {
    align-items: flex-start;
  }
}
</style>
