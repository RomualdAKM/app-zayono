<template>
  <div class="cgf">
    <!-- Header -->
    <div class="cgf-header" v-if="aggregator">
      <div class="cgf-logo">
        <img v-if="aggregator.logo && !logoFailed" :src="`/aggregator-logos/${aggregator.logo}`" :alt="aggregator.name" @error="logoFailed = true" />
        <span v-else class="cgf-logo-fallback">{{ aggregator.name.substring(0, 2).toUpperCase() }}</span>
      </div>
      <h2 class="cgf-title">{{ t('connectGatewayForm.connectTitle', { name: aggregator.name }) }}</h2>
      <p class="cgf-subtitle">
        {{ t('connectGatewayForm.subtitle', { envLabel }) }}
      </p>
    </div>

    <!-- Doc banner -->
    <a v-if="aggregator?.website_url" :href="aggregator.website_url" target="_blank" rel="noopener" class="cgf-doc-banner">
      <AppIcon name="info-circle" />
      <span>{{ t('connectGatewayForm.docBanner', { name: aggregator.name }) }}</span>
      <span class="cgf-doc-cta">{{ t('connectGatewayForm.docBannerCta') }}</span>
      <AppIcon name="external-link" />
    </a>

    <!-- PAL Africa-specific notice: PAL requires the merchant to email
         their support with the Zayono outbound IP for whitelisting.
         Without it every API call returns 404 (PAL drops unknown source
         IPs before reaching the route layer). Surfaced upfront so the
         merchant doesn't waste time pasting keys + retrying. -->
    <PalAfricaWhitelistNotice
      v-if="aggregator?.code === 'pal_africa'"
      :environment="envStore.current"
    />

    <!-- Form -->
    <div class="cgf-form" v-if="aggregator">
      <div v-for="field in aggregator.required_fields" :key="field" class="cgf-field">
        <label class="cgf-label">
          {{ formatFieldLabel(field) }}
          <span class="required">*</span>
        </label>
        <InputText
          v-model="credentials[field]"
          :type="isSecretField(field) ? 'password' : 'text'"
          :placeholder="formatFieldLabel(field)"
          class="cgf-input"
          autocomplete="off"
        />
      </div>

      <!-- Optional fields (eg. webhook signing secrets) — collapsed by
           default so the merchant isn't overwhelmed with the rare cases. -->
      <template v-if="aggregator.optional_fields?.length">
        <button type="button" class="cgf-optional-toggle" @click="showOptional = !showOptional">
          <i :class="['pi', showOptional ? 'pi-chevron-down' : 'pi-chevron-right']"></i>
          {{ t('connectGatewayForm.optionalToggle', { count: aggregator.optional_fields.length }) }}
        </button>
        <div v-if="showOptional" class="cgf-optional">
          <div v-for="field in aggregator.optional_fields" :key="field" class="cgf-field">
            <label class="cgf-label">
              {{ formatFieldLabel(field) }}
              <span class="cgf-optional-hint">{{ t('connectGatewayForm.optional') }}</span>
            </label>
            <InputText
              v-model="credentials[field]"
              :type="isSecretField(field) ? 'password' : 'text'"
              :placeholder="formatFieldLabel(field)"
              class="cgf-input"
              autocomplete="off"
            />
            <p class="cgf-optional-help">{{ optionalFieldHelp(field) }}</p>
          </div>
        </div>
      </template>

      <div class="cgf-env-info">
        <AppIcon name="shield" />
        <span>
          {{ t('connectGatewayForm.envInfo') }} <strong>{{ envLabel }}</strong>.
        </span>
      </div>

      <!-- Test result banner (success or failure of the dry-run probe) -->
      <div v-if="testResult === 'ok'" class="cgf-test-banner cgf-test-banner--ok">
        <AppIcon name="check-circle" />
        <span>{{ t('connectGatewayForm.testOk', { name: aggregator?.name ?? '' }) }}</span>
      </div>
      <div v-else-if="testResult === 'ko'" class="cgf-test-banner cgf-test-banner--ko">
        <AppIcon name="times-circle" />
        <span>{{ testError || t('connectGatewayForm.testKo') }}</span>
      </div>

      <!-- Server-side validation error after Connect attempt -->
      <div v-if="serverError" class="cgf-test-banner cgf-test-banner--ko">
        <AppIcon name="exclamation-circle" />
        <span>{{ serverError }}</span>
      </div>
    </div>

    <div class="cgf-actions">
      <Button :label="t('connectGatewayForm.cancel')" severity="secondary" text @click="$emit('back')" />
      <Button
        :label="t('connectGatewayForm.test')"
        severity="secondary"
        outlined
        :disabled="!canSubmit"
        :loading="testing"
        @click="handleTest"
      />
      <Button
        :label="t('connectGatewayForm.connect', { name: aggregator?.name ?? '' })"
        :disabled="!canSubmit"
        :loading="saving"
        @click="handleSubmit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AvailableAggregator } from '~/composables/useAggregatorConfigs'
// Explicit import: Nuxt's auto-import prefixes components in subdirs
// with the subdir name when the component name doesn't already start
// with it (eg `gateway/PalAfricaWhitelistNotice.vue` becomes
// `<GatewayPalAfricaWhitelistNotice>`). Importing explicitly keeps the
// template tag short.
import PalAfricaWhitelistNotice from '~/components/gateway/PalAfricaWhitelistNotice.vue'

const props = defineProps<{
  aggregator: AvailableAggregator | null
  saving?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', credentials: Record<string, string>): void
  (e: 'back'): void
}>()

const { t } = useI18n()
const envStore = useEnvironmentStore()
const credentials = ref<Record<string, string>>({})
const logoFailed = ref(false)
const showOptional = ref(false)

const optionalFieldHelp = (field: string): string => {
  // Known fields have dedicated help text under connectGatewayForm.optionalHelp.*.
  // Fallback to the generic default for any unknown optional field code.
  const known = ['webhook_signing_secret', 'webhook_secret_hash']
  if (known.includes(field)) {
    return t(`connectGatewayForm.optionalHelp.${field}`)
  }
  return t('connectGatewayForm.optionalHelp.default')
}

// Inline dry-run test state
const testing = ref(false)
const testResult = ref<'ok' | 'ko' | null>(null)
const testError = ref<string>('')

watch(
  () => props.aggregator?.code,
  () => {
    credentials.value = {}
    logoFailed.value = false
    testResult.value = null
    testError.value = ''
    showOptional.value = false
  }
)

// Reset the test result as soon as the merchant edits any field — the
// previous result no longer applies.
watch(credentials, () => {
  testResult.value = null
  testError.value = ''
}, { deep: true })

const { verifyCredentials } = useAggregatorConfigs()

const handleTest = async () => {
  if (!canSubmit.value || !props.aggregator) return
  testing.value = true
  testResult.value = null
  testError.value = ''
  try {
    await verifyCredentials({
      aggregator_code: props.aggregator.code,
      credentials: { ...credentials.value },
    })
    testResult.value = 'ok'
  } catch (e: any) {
    testResult.value = 'ko'
    testError.value = e?.data?.message || t('connectGatewayForm.verifyError')
  } finally {
    testing.value = false
  }
}

const envLabel = computed(() => (envStore.current === 'live' ? t('connectGatewayForm.envLive') : t('connectGatewayForm.envSandbox')))

const canSubmit = computed(() => {
  if (!props.aggregator) return false
  return props.aggregator.required_fields.every(f => credentials.value[f]?.trim())
})

const handleSubmit = () => {
  if (!canSubmit.value) return
  // Strip empty optional fields so we don't send `""` for unset secrets.
  const payload: Record<string, string> = {}
  for (const [key, value] of Object.entries(credentials.value)) {
    const v = (value ?? '').trim()
    if (v !== '') payload[key] = v
  }
  emit('submit', payload)
}

const formatFieldLabel = (field: string): string => {
  return field
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const isSecretField = (field: string): boolean => {
  return /key|secret|token|password/i.test(field)
}
</script>

<style scoped>
.cgf {
  max-width: 520px;
  margin: 0 auto;
}

.cgf-back {
  margin-bottom: 16px;
}

.cgf-header {
  text-align: center;
  margin-bottom: 28px;
}

.cgf-logo {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: var(--ze-brand-bg-soft);
  color: var(--ze-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  overflow: hidden;
}

.cgf-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 6px;
}

.cgf-logo-fallback {
  font-size: 18px;
  font-weight: 700;
}

.cgf-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0 0 6px;
}

.cgf-subtitle {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0;
}

.cgf-doc-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-radius: 6px;
  text-decoration: none;
  color: var(--ze-text-label);
  font-size: 13px;
  margin-bottom: 24px;
}

.cgf-doc-banner i {
  font-size: 14px;
  color: var(--ze-text-muted);
}

.cgf-doc-cta {
  margin-left: auto;
  color: var(--ze-brand);
  font-weight: 600;
}

.cgf-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.cgf-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cgf-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ze-text-label);
}

.required {
  color: var(--ze-danger-fg);
}

.cgf-input {
  width: 100%;
}

.cgf-optional-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 8px 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--ze-brand);
  cursor: pointer;
  align-self: flex-start;
}

.cgf-optional-toggle i {
  font-size: 11px;
}

.cgf-optional {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-left: 4px;
  border-left: 2px solid var(--ze-border);
  margin-left: 6px;
}

.cgf-optional-hint {
  color: var(--ze-text-disabled);
  font-weight: 400;
  font-size: 11px;
}

.cgf-optional-help {
  font-size: 11px;
  color: var(--ze-text-muted);
  margin: 4px 0 0;
  line-height: 1.5;
}

/* ── Banners — Linear/Stripe style ─────────────────────
   No translucent pastels. Neutral surface + 3px vertical
   accent strip on the left + coloured icon. */
.cgf-env-info,
.cgf-test-banner {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 14px;
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-left-width: 3px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ze-text-body);
  margin-top: 8px;
}

.cgf-env-info i,
.cgf-test-banner i {
  font-size: 14px;
  /* Match the text's `line-height: 1.5` so the icon's line-box height
     equals the text's first-line height, putting their glyphs on the
     same visual baseline. */
  line-height: 1.5;
  flex-shrink: 0;
}

.cgf-env-info strong {
  color: var(--ze-text-strong);
  font-weight: 600;
}

/* Neutral info — vertical accent in brand blue */
.cgf-env-info {
  border-left-color: var(--ze-brand);
}
.cgf-env-info i {
  color: var(--ze-brand);
}

/* Success — accent + icon in success green */
.cgf-test-banner--ok {
  border-left-color: var(--ze-success-fg);
}
.cgf-test-banner--ok i {
  color: var(--ze-success-fg);
}

/* Error — accent + icon in danger red */
.cgf-test-banner--ko {
  border-left-color: var(--ze-danger-fg);
}
.cgf-test-banner--ko i {
  color: var(--ze-danger-fg);
}

.cgf-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
