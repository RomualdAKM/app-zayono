<template>
  <!--
    Moneroo-style checkout — one card, two steps, zero chrome.
    Step 1: merchant identity + greeting + total + country + methods
    Step 2: back button + merchant identity + total (with FX) + operator badge + phone + sticky CTA
  -->
  <div class="ck-card">
    <!-- Header inside the card (back button, merchant logo+name, lang) -->
    <div class="ck-card__header">
      <button
        v-if="step === 2"
        type="button"
        class="ck-card__back"
        :aria-label="t('checkout.header.backAriaLabel')"
        @click="$emit('back')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <div class="ck-card__brand">
        <img
          v-if="session?.merchant?.logo_url && !logoFailed"
          :src="session.merchant.logo_url"
          :alt="session?.merchant?.name || ''"
          class="ck-card__brand-logo"
          @error="logoFailed = true"
        />
        <span class="ck-card__brand-name">{{ session?.merchant?.name || t('checkout.header.merchantFallback') }}</span>
      </div>

      <CheckoutLangToggle />
    </div>

    <!-- ─── Step 1: greeting + total + country + methods ─── -->
    <template v-if="step === 1">
      <div class="ck-card__greeting">
        <h2 class="ck-card__welcome">
          {{ customerFirstName ? t('checkout.intro.welcomeNamed', { name: customerFirstName }) : t('checkout.intro.welcome') }}
        </h2>
        <p class="ck-card__subtitle">{{ t('checkout.step1.subtitle') }}</p>
      </div>

      <div class="ck-card__total">
        <span class="ck-card__total-label">{{ t('checkout.amount.totalLabel') }}</span>
        <span class="ck-card__total-value">
          {{ formatAmount(session?.amount ?? 0, session?.currency ?? 'XOF') }}<span class="ck-card__total-star">*</span>
        </span>
      </div>

      <!-- Country picker (only when >1 country, otherwise hidden) -->
      <div v-if="countries.length > 1" class="ck-section">
        <label class="ck-label">{{ t('checkout.step1.countryLabel') }}</label>
        <CheckoutCountrySelector
          :countries="countries"
          :model-value="selectedCountry"
          @update:modelValue="(c: string) => $emit('update:country', c)"
        />
      </div>

      <div v-if="!filteredOperators.length" class="ck-empty">
        {{ t('checkout.step1.noMethods') }}
      </div>

      <div v-else class="ck-section">
        <label class="ck-label">{{ t('checkout.step1.methodLabel') }}</label>
        <div class="ck-methods">
          <CheckoutMethodCard
            v-for="op in filteredOperators"
            :key="op.code"
            :name="op.name"
            :subtitle="fxUnavailableLabel(op) ?? countryLabel(op.country)"
            :selected="selectedOperator === op.code"
            :disabled="op.fx_available === false"
            :logo-url="resolveOperatorBrand(op.name).url"
            :brand-color="resolveOperatorBrand(op.name).bg"
            @click="onMethodPick(op.code)"
          />
        </div>
      </div>
    </template>

    <!-- ─── Step 2: total (with FX) + operator + phone + CTA ─── -->
    <template v-else>
      <CheckoutAmountDisplay
        :label="t('checkout.amount.totalLabel')"
        :amount="displayChargeAmount"
        :currency="displayChargeCurrency"
        :source-currency="session?.currency"
        :fx-rate="selectedOperatorObj?.fx_rate ?? null"
        :has-fees="feeAmount > 0 || isForeignCurrencyOp"
        size="large"
      />

      <!-- Operator badge — logo circle + name, centered, sits between
           total and phone input. -->
      <div class="ck-card__operator">
        <span
          class="ck-card__operator-logo"
          :style="{ backgroundColor: resolveOperatorBrand(selectedOperatorName).bg || 'var(--ck-surface-sunken)' }"
          aria-hidden="true"
        >
          <img
            v-if="selectedOperatorBrandUrl"
            :src="selectedOperatorBrandUrl"
            alt=""
          />
          <span v-else class="ck-card__operator-initials">
            {{ (selectedOperatorName || '?').substring(0, 2).toUpperCase() }}
          </span>
        </span>
        <span class="ck-card__operator-name">{{ selectedOperatorName }}</span>
      </div>

      <!-- Fee breakdown — only when the operator has a fee_percent > 0 -->
      <div v-if="feeAmount > 0" class="ck-fees">
        <div class="ck-fees__line">
          <span>{{ t('checkout.fees.subtotal') }}</span>
          <span>{{ formatAmount(session?.amount ?? 0, session?.currency ?? 'XOF') }}</span>
        </div>
        <div class="ck-fees__line">
          <span>{{ t('checkout.fees.operatorFee', { percent: feePct }) }}</span>
          <span>+ {{ formatAmount(feeAmount, session?.currency ?? 'XOF') }}</span>
        </div>
        <div class="ck-fees__line ck-fees__line--total">
          <span>{{ t('checkout.fees.totalToPay') }}</span>
          <span>{{ formatAmount(totalCharged, session?.currency ?? 'XOF') }}</span>
        </div>
      </div>

      <!-- Phone collected only for Mobile Money operators (push-to-pay). -->
      <div v-if="phoneRequired" class="ck-section">
        <label class="ck-label" for="phone">
          {{ t('checkout.step2.phoneLabel') }} <span class="ck-required">*</span>
        </label>
        <CheckoutPhoneInput
          id="phone"
          required
          :model-value="phone"
          :phone-format="selectedPhoneFormat"
          :error="phoneError"
          :hint="!phoneError && selectedPhoneFormat ? selectedPhoneFormat.national_hint : ''"
          @update:modelValue="(v: string) => $emit('update:phone', v)"
        />
      </div>

      <div v-else class="ck-info">
        {{ t('checkout.step2.redirectInfo') }}
      </div>

      <div v-if="otpRequired" class="ck-section">
        <label class="ck-label" for="otp">{{ t('checkout.step2.otpLabel') }}</label>
        <input
          id="otp"
          :value="otp"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="8"
          :placeholder="t('checkout.step2.otpPlaceholder')"
          class="ck-otp"
          :class="{ 'ck-otp--error': formError && otpRequired && !otp }"
          @input="(e: any) => $emit('update:otp', e.target.value)"
        />
      </div>

      <p v-if="formError && !phoneError" class="ck-form-error" role="alert">{{ formError }}</p>

      <CheckoutCTA
        :label="session?.merchant?.branding?.cta_label || t('checkout.cta.payAmount', { amount: formatAmount(displayChargeAmount, displayChargeCurrency) })"
        :loading="submitting"
        :disabled="!canSubmit"
        @click="$emit('submit')"
      />

      <p class="ck-footnote">
        {{ t('checkout.footer.poweredBy') }}
        <a href="https://zayono.com" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;text-underline-offset:2px;">Zayono</a>
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import CheckoutAmountDisplay from './atoms/CheckoutAmountDisplay.vue'
import CheckoutCountrySelector from './atoms/CheckoutCountrySelector.vue'
import CheckoutMethodCard from './atoms/CheckoutMethodCard.vue'
import CheckoutPhoneInput from './atoms/CheckoutPhoneInput.vue'
import CheckoutCTA from './atoms/CheckoutCTA.vue'
import type { CheckoutCountry } from './atoms/CheckoutCountrySelector.vue'
import { useOperatorLogo } from '~/composables/useOperatorLogo'

const props = defineProps<{
  session: any
  step: 1 | 2
  selectedOperator: string
  selectedCountry: string
  phone: string
  otp: string
  otpRequired: boolean
  phoneRequired: boolean
  submitting: boolean
  formError: string
  phoneError?: string
  formatAmount: (amount: number, currency: string) => string
}>()

const emit = defineEmits<{
  'update:selectedOperator': [code: string]
  'update:country': [country: string]
  'update:phone': [phone: string]
  'update:otp': [otp: string]
  'pick-method': [code: string]
  back: []
  submit: []
}>()

const { resolveOperatorBrand } = useOperatorLogo()
const { t } = useI18n()
const logoFailed = ref(false)

const customerFirstName = computed(() => {
  const email = props.session?.customer_email
  if (!email) return ''
  // Take the localpart before @, strip dots/digits, capitalize.
  const local = email.split('@')[0] || ''
  const cleaned = local.replace(/[\d._-]+/g, ' ').trim().split(/\s+/)[0] || ''
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() : ''
})

const countries = computed<CheckoutCountry[]>(() => {
  const seen = new Map<string, CheckoutCountry>()
  for (const op of props.session?.operators ?? []) {
    const fmt = op.phone_format
    if (!fmt || !op.country || op.country === 'XX') continue
    if (!seen.has(op.country)) {
      seen.set(op.country, {
        code: op.country,
        name: fmt.name,
        flag: fmt.flag,
        dial_code: fmt.dial_code,
      })
    }
  }
  return Array.from(seen.values())
})

const filteredOperators = computed(() => {
  const ops = props.session?.operators ?? []
  if (countries.value.length <= 1) return ops
  return ops.filter((op: any) => op.country === props.selectedCountry || op.country === 'XX')
})

const selectedOperatorObj = computed(() =>
  (props.session?.operators ?? []).find((o: any) => o.code === props.selectedOperator),
)

const selectedOperatorName = computed(() => selectedOperatorObj.value?.name ?? '')
const selectedPhoneFormat = computed(() => selectedOperatorObj.value?.phone_format ?? null)
const selectedOperatorBrandUrl = computed(() =>
  selectedOperatorName.value ? resolveOperatorBrand(selectedOperatorName.value).url : '',
)

const feeMap = computed(() => props.session?.fee_percent_by_operator ?? {})
const feePct = computed(() => {
  const v = feeMap.value[props.selectedOperator]
  return v ? Number(v) : 0
})
const feeAmount = computed(() => {
  const pct = feePct.value
  const base = props.session?.amount ?? 0
  return pct > 0 ? Math.round(base * (pct / 100)) : 0
})
const totalCharged = computed(() => (props.session?.amount ?? 0) + feeAmount.value)

// FX-aware display — convert when the operator's native currency
// differs from the session currency. Customer sees prices in their
// local currency on Step 2.
const isForeignCurrencyOp = computed(() => {
  const op = selectedOperatorObj.value
  if (!op) return false
  return op.charge_currency && op.charge_currency !== props.session?.currency
})
const displayChargeAmount = computed(() => {
  const op = selectedOperatorObj.value
  if (op && op.charge_amount != null) return op.charge_amount + feeAmount.value
  return totalCharged.value
})
const displayChargeCurrency = computed(() => {
  const op = selectedOperatorObj.value
  return op?.charge_currency || props.session?.currency || 'XOF'
})

const canSubmit = computed(() => {
  if (props.submitting) return false
  if (!props.selectedOperator) return false
  if (props.phoneRequired && (!props.phone || props.phone.length < 6)) return false
  if (props.otpRequired && (!props.otp || props.otp.trim().length < 4)) return false
  const op = selectedOperatorObj.value
  if (op && op.fx_available === false) return false
  return true
})

function onMethodPick(code: string) {
  const op = (props.session?.operators ?? []).find((o: any) => o.code === code)
  if (op?.fx_available === false) return  // can't select disabled ops
  emit('update:selectedOperator', code)
  emit('pick-method', code)
}

function countryLabel(iso: string): string {
  const c = countries.value.find(x => x.code === iso)
  return c?.name ?? iso
}

function fxUnavailableLabel(op: any): string | null {
  if (op.fx_available !== false) return null
  if (op.fx_reason === 'conversion_disabled') return t('checkout.fx.conversionDisabled')
  return t('checkout.fx.unavailableCurrency')
}

const formatAmount = props.formatAmount
</script>

<style scoped>
.ck-card {
  background: var(--ck-surface);
  border: 1px solid var(--ck-border);
  border-radius: 6px;
  padding: var(--ck-sp-6) var(--ck-sp-5);
  max-width: 460px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-5);
}

@media (min-width: 768px) {
  .ck-card {
    padding: var(--ck-sp-8) var(--ck-sp-6);
  }
}

/* ─── Card header (merchant identity + back + language) ─── */

.ck-card__header {
  display: flex;
  align-items: center;
  gap: var(--ck-sp-2);
}

.ck-card__back {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ck-surface);
  border: 1px solid var(--ck-border);
  border-radius: 4px;
  color: var(--ck-text-body);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--ck-duration-quick) var(--ck-easing-fast);
}

.ck-card__back:hover {
  background: var(--ck-surface-hover);
}

.ck-card__back:focus-visible {
  outline: none;
  box-shadow: var(--ck-shadow-focus);
}

.ck-card__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-sp-2);
  flex: 1;
  min-width: 0;
}

.ck-card__brand-logo {
  width: 22px;
  height: 22px;
  border-radius: var(--ck-r-sm);
  object-fit: contain;
  flex-shrink: 0;
}

.ck-card__brand-name {
  font-size: var(--ck-text-md);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ck-card__lang {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: var(--ck-surface);
  border: 1px solid var(--ck-border);
  border-radius: 3px;
  font-size: var(--ck-text-sm);
  font-weight: var(--ck-fw-medium);
  color: var(--ck-text-body);
  flex-shrink: 0;
}

/* ─── Step 1 greeting + total ─── */

.ck-card__greeting {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ck-card__welcome {
  margin: 0;
  font-size: var(--ck-text-xl);
  font-weight: var(--ck-fw-bold);
  color: var(--ck-text-strong);
  line-height: var(--ck-lh-tight);
}

.ck-card__subtitle {
  margin: 0;
  font-size: var(--ck-text-base);
  color: var(--ck-text-muted);
}

.ck-card__total {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.ck-card__total-label {
  font-size: var(--ck-text-sm);
  color: var(--ck-text-muted);
}

.ck-card__total-value {
  font-size: var(--ck-text-3xl);
  font-weight: var(--ck-fw-bold);
  color: var(--ck-primary);
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}

.ck-card__total-star {
  color: var(--ck-danger);
  font-size: 0.55em;
  vertical-align: super;
  margin-left: 2px;
  font-weight: var(--ck-fw-semibold);
}

/* ─── Step 2 operator badge ─── */

.ck-card__operator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ck-sp-2);
}

.ck-card__operator-logo {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  color: #fff;
  font-size: 12px;
  font-weight: var(--ck-fw-bold);
}

.ck-card__operator-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.ck-card__operator-name {
  font-size: var(--ck-text-md);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-strong);
}

/* ─── Shared form atoms ─── */

.ck-section {
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-2);
}

.ck-label {
  font-size: var(--ck-text-base);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-strong);
}

.ck-required {
  color: var(--ck-danger);
  font-weight: var(--ck-fw-semibold);
}

.ck-methods {
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-2);
}

.ck-empty {
  padding: var(--ck-sp-4);
  background: var(--ck-warning-soft);
  border-radius: var(--ck-r-md);
  font-size: var(--ck-text-sm);
  color: var(--ck-warning-strong);
  text-align: center;
}

.ck-info {
  padding: var(--ck-sp-3) var(--ck-sp-4);
  background: var(--ck-info-soft);
  border-radius: var(--ck-r-md);
  font-size: var(--ck-text-sm);
  color: var(--ck-info);
  text-align: center;
}

.ck-otp {
  width: 100%;
  padding: var(--ck-sp-3) var(--ck-sp-4);
  background: var(--ck-surface);
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-r-md);
  font: inherit;
  font-size: 16px;
  letter-spacing: 0.2em;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.ck-otp:focus-visible {
  outline: none;
  border-color: var(--ck-primary);
  box-shadow: var(--ck-shadow-focus);
}

.ck-otp--error {
  border-color: var(--ck-danger);
}

.ck-form-error {
  margin: 0;
  padding: var(--ck-sp-2) var(--ck-sp-3);
  background: var(--ck-danger-soft);
  border-radius: var(--ck-r-md);
  font-size: var(--ck-text-sm);
  color: var(--ck-danger);
}

.ck-fees {
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-2);
  padding: var(--ck-sp-3) var(--ck-sp-4);
  background: var(--ck-surface-sunken);
  border-radius: var(--ck-r-md);
  font-size: var(--ck-text-sm);
}

.ck-fees__line {
  display: flex;
  justify-content: space-between;
  color: var(--ck-text-muted);
}

.ck-fees__line--total {
  border-top: 1px solid var(--ck-border);
  padding-top: var(--ck-sp-2);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-strong);
}

.ck-footnote {
  margin: 0;
  text-align: center;
  font-size: var(--ck-text-sm);
  color: var(--ck-text-muted);
  line-height: var(--ck-lh-normal);
}
</style>
