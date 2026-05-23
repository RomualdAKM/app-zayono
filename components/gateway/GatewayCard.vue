<template>
  <div class="gw-card">
    <div class="gw-card-head">
      <div class="gw-logo">
        <img v-if="aggregator.logo && !logoFailed" :src="logoUrl" :alt="aggregator.name" @error="onLogoError" />
        <span v-else class="gw-logo-fallback">{{ initials }}</span>
      </div>
      <div class="gw-title-wrap">
        <h3 class="gw-title">{{ aggregator.name }}</h3>
        <div class="gw-badges">
          <Tag v-if="isConfigured" :value="t('gatewayCard.configured')" severity="success" class="gw-tag" />
          <Tag v-for="cap in aggregator.capabilities" :key="cap" :value="capLabel(cap)" class="gw-tag gw-cap-tag" />
        </div>
      </div>
    </div>

    <p class="gw-desc">{{ localizedDescription || t('gatewayCard.noDescription') }}</p>

    <div class="gw-meta">
      <span v-if="aggregator.supported_countries.length" class="gw-meta-item">
        <AppIcon name="globe" />
        {{ t('gatewayCard.countries', { count: aggregator.supported_countries.length }) }}
      </span>
      <span v-if="aggregator.supported_currencies.length" class="gw-meta-item">
        <AppIcon name="money-bill" />
        {{ supportedCurrenciesLabel }}
      </span>
    </div>

    <div class="gw-actions">
      <Button :label="t('gatewayCard.details')" severity="secondary" text size="small" @click="$emit('details')" />
      <Button
        :label="isConfigured ? t('gatewayCard.manage') : t('gatewayCard.connectName', { name: aggregator.name })"
        size="small"
        :severity="isConfigured ? 'secondary' : undefined"
        :outlined="isConfigured"
        @click="$emit('connect')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AvailableAggregator } from '~/composables/useAggregatorConfigs'

const { t, te } = useI18n()
const props = defineProps<{ aggregator: AvailableAggregator }>()
defineEmits<{ (e: 'connect'): void; (e: 'details'): void }>()

/**
 * Localized one-liner: prefer `aggregators.<code>.description` from the
 * i18n bundle so the card honours the dashboard locale, falling back to
 * the FR-only `description` shipped by the backend if no translation
 * exists yet for this aggregator.
 */
const localizedDescription = computed<string>(() => {
  const key = `aggregators.${props.aggregator.code}.description`
  return te(key) ? t(key) : (props.aggregator.description || '')
})

const logoFailed = ref(false)

const logoUrl = computed(() => {
  if (!props.aggregator.logo || logoFailed.value) return ''
  return `/aggregator-logos/${props.aggregator.logo}`
})

const onLogoError = () => {
  logoFailed.value = true
}

const isConfigured = computed(() => props.aggregator.configured_in_active_env)

const initials = computed(() =>
  props.aggregator.name.substring(0, 2).toUpperCase()
)

const capLabel = (cap: string) => {
  if (cap === 'payment') return t('gatewayCard.capPayment')
  if (cap === 'payout') return t('gatewayCard.capPayout')
  return cap
}

/**
 * Map the supported-currencies array to a display label. The `*` sentinel
 * (Stripe card, accepts any currency) is rendered as "All currencies"
 * instead of leaking the asterisk into the UI.
 */
const supportedCurrenciesLabel = computed<string>(() => {
  const list = props.aggregator.supported_currencies || []
  if (list.length === 1 && list[0] === '*') return t('gatewayCard.allCurrencies')
  return list.filter(c => c !== '*').join(', ') || t('gatewayCard.allCurrencies')
})
</script>

<style scoped>
.gw-card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color 0.15s, box-shadow 0.15s, background-color 0.18s;
}

.gw-card:hover {
  border-color: var(--ze-brand-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.gw-card-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.gw-logo {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: var(--ze-brand-bg-soft);
  color: var(--ze-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.gw-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.gw-logo-fallback {
  font-size: 14px;
  font-weight: 700;
}

.gw-title-wrap {
  flex: 1;
  min-width: 0;
}

.gw-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0 0 6px;
}

.gw-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.gw-tag {
  font-size: 10px !important;
  padding: 2px 6px !important;
}

.gw-cap-tag {
  background: var(--ze-bg-hover) !important;
  color: var(--ze-text-label) !important;
}

.gw-desc {
  font-size: 13px;
  color: var(--ze-text-muted);
  line-height: 1.5;
  margin: 0;
  min-height: 40px;
}

.gw-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.gw-meta-item {
  font-size: 12px;
  color: var(--ze-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.gw-meta-item i {
  font-size: 11px;
  color: var(--ze-text-disabled);
}

.gw-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--ze-border-subtle);
  padding-top: 12px;
  margin-top: auto;
}
</style>
