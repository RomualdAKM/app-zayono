<template>
  <Dialog
    :visible="modelValue"
    @update:visible="$emit('update:modelValue', $event)"
    :modal="true"
    :closable="true"
    :style="{ width: '480px' }"
    :header="dialogTitle"
  >
    <div v-if="method" class="ma">
      <div class="ma-method-summary">
        <MethodLogo :name="method.operator_name" />
        <div>
          <p class="ma-method-name">{{ method.operator_name }}</p>
          <p class="ma-method-meta">{{ countryLabel(method.country) }} · {{ method.currency }}</p>
        </div>
      </div>

      <div class="ma-field">
        <label class="ma-label">{{ t('methodAssignDialog.primaryLabel') }} <span class="required">*</span></label>
        <Select
          v-model="form.aggregator_code"
          :options="primaryOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="t('methodAssignDialog.primaryPlaceholder')"
          class="w-full"
        />
      </div>

      <div v-if="purpose === 'payment'" class="ma-info">
        <AppIcon name="info-circle" />
        <span>
          {{ t('methodAssignDialog.fallbackInfo') }}
        </span>
      </div>

      <div v-if="purpose === 'payment'" class="ma-field">
        <label class="ma-label">{{ t('methodAssignDialog.fallbackLabel') }}</label>
        <Select
          v-model="form.fallback_aggregator"
          :options="fallbackOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="t('methodAssignDialog.fallbackPlaceholder')"
          showClear
          class="w-full"
        />
      </div>

      <div class="ma-field">
        <label class="ma-label">{{ t('methodAssignDialog.feeLabel') }}</label>
        <InputNumber
          v-model="form.fee_percent"
          :min="0"
          :max="50"
          :minFractionDigits="0"
          :maxFractionDigits="2"
          suffix=" %"
          placeholder="0"
          class="w-full"
        />
        <p v-if="purpose === 'payment'" class="ma-help" v-html="t('methodAssignDialog.feeHelpPayment')" />
        <p v-else class="ma-help" v-html="t('methodAssignDialog.feeHelpPayout')" />
      </div>
    </div>

    <template #footer>
      <Button :label="t('methodAssignDialog.cancel')" severity="secondary" text @click="$emit('update:modelValue', false)" />
      <Button :label="t('methodAssignDialog.save')" :loading="saving" :disabled="!form.aggregator_code" @click="submit" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { MerchantMethod } from '~/composables/useMethods'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  method: MerchantMethod | null
  /** When 'payout', no fallback dropdown is shown — providers don't fail over for transfers. */
  purpose: 'payment' | 'payout'
  /** All connected aggregator codes the merchant currently has, used to filter to those they actually own. */
  configuredAggregatorCodes: string[]
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', payload: { aggregator_code: string; fallback_aggregator: string | null; fee_percent: number | null }): void
}>()

const form = ref<{
  aggregator_code: string
  fallback_aggregator: string | null
  fee_percent: number | null
}>({
  aggregator_code: '',
  fallback_aggregator: null,
  fee_percent: null,
})

watch(
  () => [props.method?.id, props.modelValue] as const,
  ([, visible]) => {
    if (visible && props.method) {
      form.value = {
        aggregator_code: props.method.aggregator_code,
        fallback_aggregator: props.method.fallback_aggregator,
        fee_percent: props.method.fee_percent,
      }
    }
  },
  { immediate: true }
)

// Aggregator labels come from the live catalogue (`useAggregatorCatalog`)
// so adding a new driver — PAL Africa, Hub2 country variants, anything
// future — requires zero edit here. `labelFor` falls back to the raw
// code when the catalogue hasn't loaded yet (first paint) or the code
// is unknown.
const { load: loadAggregatorCatalog, labelFor } = useAggregatorCatalog()
onMounted(() => loadAggregatorCatalog())

/** Intersection of "operator supports it" AND "merchant has connected this aggregator". */
const usableCodes = computed(() => {
  if (!props.method) return []
  return props.method.available_aggregators.filter(c =>
    props.configuredAggregatorCodes.includes(c)
  )
})

const primaryOptions = computed(() =>
  usableCodes.value.map(code => ({
    label: labelFor(code),
    value: code,
  }))
)

const fallbackOptions = computed(() =>
  usableCodes.value
    .filter(code => code !== form.value.aggregator_code)
    .map(code => ({
      label: labelFor(code),
      value: code,
    }))
)

const dialogTitle = computed(() =>
  props.purpose === 'payment'
    ? t('methodAssignDialog.titlePayment')
    : t('methodAssignDialog.titlePayout')
)

const submit = () => {
  if (!form.value.aggregator_code) return
  emit('submit', {
    aggregator_code: form.value.aggregator_code,
    // Fallback aggregator stays payment-only: aggregators don't fail over
    // for payouts (the merchant's wallet float depends on a specific
    // provider, so we can't transparently switch).
    fallback_aggregator: props.purpose === 'payout' ? null : form.value.fallback_aggregator,
    // fee_percent is editable for BOTH payment and payout — the semantics
    // differ (added to customer charge vs. retained from merchant wallet)
    // but the field is configured per-method regardless of direction.
    fee_percent: form.value.fee_percent,
  })
}
</script>

<style scoped>
.ma {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ma-method-summary {
  display: flex;
  gap: 12px;
  align-items: center;
  background: #F9FAFB;
  border: 1px solid #F3F4F6;
  border-radius: 6px;
  padding: 10px 14px;
}

.ma-method-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #EEF2FF;
  color: #4F46E5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.ma-method-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.ma-method-meta {
  font-size: 12px;
  color: #6B7280;
  margin: 0;
}

.ma-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ma-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.required {
  color: #DC2626;
}

.ma-info {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 12px;
  background: #EFF6FF;
  border: 1px solid #DBEAFE;
  border-radius: 4px;
  font-size: 12px;
  color: #1E40AF;
  line-height: 1.5;
}

.ma-help {
  font-size: 11px;
  color: #6B7280;
  line-height: 1.5;
  margin: 4px 0 0;
}

.ma-info i {
  margin-top: 1px;
  font-size: 13px;
  flex-shrink: 0;
}

.w-full {
  width: 100%;
}
</style>
