<template>
  <Dialog
    :visible="modelValue"
    @update:visible="$emit('update:modelValue', $event)"
    :modal="true"
    :closable="true"
    :style="{ width: '640px' }"
    :header="aggregator?.name || t('gatewayDetailsModal.headerFallback')"
  >
    <div v-if="aggregator" class="gd">
      <p v-if="localizedDescriptionLong" class="gd-desc">{{ localizedDescriptionLong }}</p>

      <div v-if="aggregator.capabilities.length" class="gd-section">
        <h4 class="gd-section-title">{{ t('gatewayDetailsModal.capabilities') }}</h4>
        <div class="gd-chips">
          <Tag
            v-for="cap in aggregator.capabilities"
            :key="cap"
            :value="cap === 'payment' ? t('gatewayDetailsModal.capPaymentIn') : t('gatewayDetailsModal.capPayoutOut')"
            severity="info"
            class="gd-chip"
          />
        </div>
      </div>

      <div v-if="aggregator.supported_currencies.length" class="gd-section">
        <h4 class="gd-section-title">{{ t('gatewayDetailsModal.currencies') }}</h4>
        <div class="gd-chips">
          <span v-for="c in aggregator.supported_currencies" :key="c" class="gd-currency-chip">{{ currencyDisplay(c) }}</span>
        </div>
      </div>

      <div v-if="aggregator.supported_methods.length" class="gd-section">
        <h4 class="gd-section-title">
          {{ t('gatewayDetailsModal.methods') }}
          <span class="gd-count">{{ aggregator.supported_methods.length }}</span>
        </h4>
        <div class="gd-method-grid">
          <div v-for="m in aggregator.supported_methods" :key="m.code" class="gd-method-card">
            <MethodLogo :name="m.name" />
            <div class="gd-method-text">
              <span class="gd-method-name">{{ m.name }}</span>
              <span class="gd-method-meta">{{ countryLabel(m.country) }} · {{ currencyDisplay(m.currency) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="aggregator.supported_countries.length" class="gd-section">
        <h4 class="gd-section-title">{{ t('gatewayDetailsModal.countries', { count: aggregator.supported_countries.length }) }}</h4>
        <div class="gd-country-grid">
          <span v-for="c in aggregator.supported_countries" :key="c" class="gd-country-chip">
            {{ countryLabel(c) }}
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <a v-if="aggregator?.website_url" :href="aggregator.website_url" target="_blank" rel="noopener" class="gd-link">
        {{ t('gatewayDetailsModal.visitWebsite') }}
        <AppIcon name="external-link" />
      </a>
      <Button v-if="aggregator" :label="t('gatewayDetailsModal.connect', { name: aggregator.name })" @click="$emit('connect')" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { AvailableAggregator } from '~/composables/useAggregatorConfigs'
import { countryLabel } from '~/composables/useCountryLabel'

const { t, te } = useI18n()

const props = defineProps<{
  modelValue: boolean
  aggregator: AvailableAggregator | null
}>()

/**
 * Prefer the localized i18n description (FR/EN) if the aggregator code has
 * an entry under `aggregators.<code>`, otherwise fall back to the backend's
 * FR-only `description_long` shipped in the catalogue payload. This makes
 * the modal honour the dashboard locale without breaking aggregators that
 * haven't been translated yet.
 */
const localizedDescriptionLong = computed<string>(() => {
  if (!props.aggregator) return ''
  const key = `aggregators.${props.aggregator.code}.descriptionLong`
  return te(key) ? t(key) : (props.aggregator.description_long || '')
})

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'connect'): void
}>()

/**
 * `*` is the wildcard sentinel for operators that accept any currency
 * (Stripe card). Display it as the localized "All currencies" label.
 */
const currencyDisplay = (code: string): string => {
  if (code === '*') return t('gatewayDetailsModal.allCurrencies')
  return code
}
</script>

<style scoped>
.gd {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.gd-desc {
  font-size: 14px;
  color: var(--ze-text-label);
  line-height: 1.6;
  margin: 0;
}

.gd-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ze-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.gd-count {
  background: var(--ze-bg-hover);
  color: var(--ze-text-muted);
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 99px;
  font-weight: 600;
  text-transform: none;
}

.gd-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.gd-chip {
  font-size: 11px !important;
}

.gd-currency-chip {
  font-size: 12px;
  background: var(--ze-brand-bg-soft);
  color: var(--ze-brand);
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: 500;
}

.gd-method-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

@media (max-width: 480px) {
  .gd-method-grid {
    grid-template-columns: 1fr;
  }
}

.gd-method-card {
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border-subtle);
  border-radius: 4px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.gd-method-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.gd-method-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ze-text-body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gd-method-meta {
  font-size: 11px;
  color: var(--ze-text-disabled);
}

.gd-country-grid {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.gd-country-chip {
  font-size: 12px;
  background: var(--ze-bg-hover);
  color: var(--ze-text-label);
  padding: 4px 10px;
  border-radius: 4px;
}

.gd-link {
  font-size: 13px;
  color: var(--ze-brand);
  text-decoration: none;
  margin-right: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.gd-link:hover {
  text-decoration: underline;
}
</style>
