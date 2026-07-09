<template>
  <!--
    Abidjan template — "Tile Grid" identity.
    Méthodes de paiement présentées en grille horizontale 3 colonnes
    (mobile-first). Coins sharp 4px. Zéro ombre. Header hairline.
    Total typographié en grand, dans un encadré.
  -->
  <div class="abj">
    <header class="abj__header">
      <button
        v-if="step === 2"
        type="button"
        class="abj__back"
        :aria-label="t('checkout.nav.backAriaLabel')"
        @click="$emit('back')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <div class="abj__brand">
        <img
          v-if="session?.merchant?.logo_url && !logoFailed"
          :src="session.merchant.logo_url"
          :alt="session?.merchant?.name || ''"
          class="abj__brand-logo"
          @error="logoFailed = true"
        />
        <span class="abj__brand-name">{{ session?.merchant?.name || t('checkout.header.fallbackMerchantName') }}</span>
      </div>
      <CheckoutLangToggle />
    </header>

    <template v-if="step === 1">
      <div class="abj__intro">
        <h2 class="abj__welcome">
          {{ customerFirstName ? t('checkout.intro.welcomeNamed', { name: customerFirstName }) : t('checkout.intro.welcome') }}
        </h2>
        <p class="abj__subtitle">{{ t('checkout.intro.subtitle') }}</p>
      </div>

      <div class="abj__total-box">
        <span class="abj__total-label">{{ t('checkout.summary.totalToPay') }}</span>
        <span class="abj__total-value">
          {{ formatAmount(session?.amount ?? 0, session?.currency ?? 'XOF') }}<span class="abj__star">*</span>
        </span>
      </div>

      <div v-if="countries.length > 1" class="abj__field">
        <label class="abj__label">{{ t('checkout.form.countryLabel') }}</label>
        <CheckoutCountrySelector
          :countries="countries"
          :model-value="selectedCountry"
          @update:modelValue="(c: string) => $emit('update:country', c)"
        />
      </div>

      <div v-if="!operatorGroups.length" class="abj__empty">
        {{ t('checkout.state.noPaymentMethods') }}
      </div>

      <div v-for="group in operatorGroups" :key="group.key" class="abj__field">
        <label class="abj__label">{{ group.label }}</label>
        <div class="abj__grid">
          <CheckoutMethodTile
            v-for="op in group.operators"
            :key="op.code"
            :name="op.name"
            :subtitle="fxUnavailableLabel(op)"
            :selected="selectedOperator === op.code"
            :disabled="op.fx_available === false"
            :logo-url="resolveOperatorBrand(op.name).url"
            :brand-color="resolveOperatorBrand(op.name).bg"
            @click="onMethodPick(op.code)"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <CheckoutAmountDisplay
        :label="t('checkout.summary.totalLabel')"
        :amount="displayChargeAmount"
        :currency="displayChargeCurrency"
        :source-currency="session?.currency"
        :fx-rate="selectedOperatorObj?.fx_rate ?? null"
        :has-fees="feeAmount > 0 || isForeignCurrencyOp"
        size="large"
      />

      <div class="abj__selected-banner">
        <span
          class="abj__selected-logo"
          :style="{ backgroundColor: resolveOperatorBrand(selectedOperatorName).bg || 'var(--ck-surface-sunken)' }"
          aria-hidden="true"
        >
          <img
            v-if="selectedOperatorBrandUrl"
            :src="selectedOperatorBrandUrl"
            alt=""
          />
          <span v-else class="abj__selected-initials">
            {{ (selectedOperatorName || '?').substring(0, 2).toUpperCase() }}
          </span>
        </span>
        <span class="abj__selected-name">{{ selectedOperatorName }}</span>
      </div>

      <div v-if="feeAmount > 0" class="abj__fees">
        <div class="abj__fees-line">
          <span>{{ t('checkout.fees.subtotal') }}</span>
          <span>{{ formatAmount(session?.amount ?? 0, session?.currency ?? 'XOF') }}</span>
        </div>
        <div class="abj__fees-line">
          <span>{{ t('checkout.fees.operatorFee', { percent: feePct }) }}</span>
          <span>+ {{ formatAmount(feeAmount, session?.currency ?? 'XOF') }}</span>
        </div>
        <div class="abj__fees-line abj__fees-line--total">
          <span>{{ t('checkout.summary.totalToPay') }}</span>
          <span>{{ formatAmount(totalCharged, session?.currency ?? 'XOF') }}</span>
        </div>
      </div>

      <div v-if="phoneRequired" class="abj__field">
        <label class="abj__label" for="phone">{{ t('checkout.form.phoneLabel') }} <span class="abj__required">*</span></label>
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

      <div v-else class="abj__info">
        {{ t('checkout.info.redirectSecurePage') }}
      </div>

      <div v-if="otpRequired" class="abj__field">
        <label class="abj__label" for="otp">{{ t('checkout.form.otpLabel') }}</label>
        <p class="abj__otp-hint" style="font-size:12px;color:#6b7280;margin:4px 0 10px;line-height:1.45;">{{ t('checkout.step2.otpHint') }}</p>
        <input
          id="otp"
          :value="otp"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="8"
          :placeholder="t('checkout.form.otpPlaceholder')"
          class="abj__otp"
          @input="(e: any) => $emit('update:otp', e.target.value)"
        />
      </div>

      <p v-if="formError && !phoneError" class="abj__form-error" role="alert">{{ formError }}</p>

      <CheckoutCTA
        :label="session?.merchant?.branding?.cta_label || t('checkout.cta.payAmount', { amount: formatAmount(displayChargeAmount, displayChargeCurrency) })"
        :loading="submitting"
        :disabled="!canSubmit"
        @click="$emit('submit')"
      />

      <p class="abj__footnote">
        {{ t('checkout.footer.poweredBy') }}
        <a href="https://zayono.com" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;text-underline-offset:2px;">Zayono</a>
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import CheckoutAmountDisplay from './atoms/CheckoutAmountDisplay.vue'
import CheckoutCountrySelector from './atoms/CheckoutCountrySelector.vue'
import CheckoutMethodTile from './atoms/CheckoutMethodTile.vue'
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

// International / hosted methods (crypto, card, any redirect-flow or no-phone
// operator) do NOT depend on the customer's country, so they get their own
// "available worldwide" section — a customer outside the listed countries never
// thinks the checkout is country-locked.
const isInternational = (op: any) =>
  op?.redirect_flow === true || op?.phone_required === false || op?.country === 'XX'

const internationalOperators = computed(() =>
  (props.session?.operators ?? []).filter(isInternational),
)

const momoOperators = computed(() => {
  const ops = (props.session?.operators ?? []).filter((op: any) => !isInternational(op))
  if (countries.value.length <= 1) return ops
  return ops.filter((op: any) => op.country === props.selectedCountry)
})

const operatorGroups = computed<{ key: string; label: string; operators: any[] }[]>(() => {
  const groups: { key: string; label: string; operators: any[] }[] = []
  if (momoOperators.value.length) {
    groups.push({
      key: 'momo',
      label: internationalOperators.value.length
        ? t('checkout.step1.momoLabel')
        : t('checkout.form.paymentMethodLabel'),
      operators: momoOperators.value,
    })
  }
  if (internationalOperators.value.length) {
    groups.push({
      key: 'international',
      label: t('checkout.step1.internationalLabel'),
      operators: internationalOperators.value,
    })
  }
  return groups
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
  if (op?.fx_available === false) return
  emit('update:selectedOperator', code)
  emit('pick-method', code)
}

function fxUnavailableLabel(op: any): string | undefined {
  if (op.fx_available !== false) return undefined
  if (op.fx_reason === 'amount_below_min') return t('checkout.method.fxAmountBelowMin')
  if (op.fx_reason === 'conversion_disabled') return t('checkout.method.fxConversionDisabled')
  return t('checkout.method.fxUnavailable')
}

const formatAmount = props.formatAmount
</script>

<style scoped>
.abj {
  background: var(--ck-surface);
  border: 1px solid var(--ck-border);
  border-radius: 6px;
  padding: var(--ck-sp-5);
  max-width: 520px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-5);
}

@media (min-width: 768px) {
  .abj {
    padding: var(--ck-sp-8);
  }
}

/* ─── Header ─── */
.abj__header {
  display: flex;
  align-items: center;
  gap: var(--ck-sp-2);
  padding-bottom: var(--ck-sp-4);
  border-bottom: 1px solid var(--ck-border);
}

.abj__back {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--ck-border);
  border-radius: 4px;
  color: var(--ck-text-body);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--ck-duration-quick) var(--ck-easing-fast);
}

.abj__back:hover { background: var(--ck-surface-sunken); }
.abj__back:focus-visible { outline: none; box-shadow: var(--ck-shadow-focus); }

.abj__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-sp-2);
  flex: 1;
  min-width: 0;
}

.abj__brand-logo {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  object-fit: contain;
  flex-shrink: 0;
}

.abj__brand-name {
  font-size: var(--ck-text-md);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.abj__lang {
  font-size: var(--ck-text-sm);
  font-weight: var(--ck-fw-medium);
  color: var(--ck-text-muted);
  padding: 3px 8px;
  border: 1px solid var(--ck-border);
  border-radius: 3px;
  flex-shrink: 0;
}

/* ─── Step 1 intro ─── */
.abj__intro {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.abj__welcome {
  margin: 0;
  font-size: var(--ck-text-xl);
  font-weight: var(--ck-fw-bold);
  color: var(--ck-text-strong);
  line-height: var(--ck-lh-tight);
  letter-spacing: -0.01em;
}

.abj__subtitle {
  margin: 0;
  font-size: var(--ck-text-base);
  color: var(--ck-text-muted);
}


.abj__total-box {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: var(--ck-sp-4) var(--ck-sp-5);
  background: var(--ck-surface-sunken);
  border: 1px solid var(--ck-border);
  border-radius: 4px;
}

.abj__total-label {
  font-size: var(--ck-text-sm);
  color: var(--ck-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.abj__total-value {
  font-size: var(--ck-text-2xl);
  font-weight: var(--ck-fw-bold);
  color: var(--ck-text-strong);
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}

.abj__star {
  color: var(--ck-danger);
  font-size: 0.55em;
  vertical-align: super;
  margin-left: 2px;
}

.abj__field {
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-2);
}

.abj__label {
  font-size: var(--ck-text-xs);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-body);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.abj__required { color: var(--ck-danger); }

/* ─── Method grid ─── */
.abj__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--ck-sp-2);
}

@media (min-width: 480px) {
  .abj__grid {
    gap: var(--ck-sp-3);
  }
}

/* ─── Step 2 selected banner ─── */
.abj__selected-banner {
  display: flex;
  align-items: center;
  gap: var(--ck-sp-3);
  padding: var(--ck-sp-3) var(--ck-sp-4);
  background: var(--ck-surface-sunken);
  border: 1px solid var(--ck-border);
  border-radius: 4px;
}

.abj__selected-logo {
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

.abj__selected-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.abj__selected-initials { font-size: 11px; }

.abj__selected-name {
  font-size: var(--ck-text-md);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-strong);
}

/* ─── Fees ─── */
.abj__fees {
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-2);
  padding: var(--ck-sp-3) var(--ck-sp-4);
  border: 1px dashed var(--ck-border);
  border-radius: 4px;
  font-size: var(--ck-text-sm);
}

.abj__fees-line {
  display: flex;
  justify-content: space-between;
  color: var(--ck-text-muted);
  font-variant-numeric: tabular-nums;
}

.abj__fees-line--total {
  border-top: 1px solid var(--ck-border);
  padding-top: var(--ck-sp-2);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-strong);
}

/* ─── Empty / info ─── */
.abj__empty {
  padding: var(--ck-sp-4);
  border: 1px solid var(--ck-warning);
  border-radius: 4px;
  font-size: var(--ck-text-sm);
  color: var(--ck-warning-strong);
  background: var(--ck-warning-soft);
}

.abj__info {
  padding: var(--ck-sp-3) var(--ck-sp-4);
  border: 1px solid var(--ck-border);
  border-left: 3px solid var(--ck-info);
  border-radius: 0 4px 4px 0;
  font-size: var(--ck-text-sm);
  color: var(--ck-info);
}

.abj__otp {
  width: 100%;
  padding: var(--ck-sp-3) var(--ck-sp-4);
  background: var(--ck-surface);
  border: 1px solid var(--ck-border);
  border-radius: 4px;
  font: inherit;
  font-size: 16px;
  letter-spacing: 0.2em;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.abj__otp:focus-visible {
  outline: none;
  border-color: var(--ck-primary);
  box-shadow: var(--ck-shadow-focus);
}

.abj__form-error {
  margin: 0;
  padding: var(--ck-sp-2) var(--ck-sp-3);
  border: 1px solid var(--ck-danger);
  border-radius: 4px;
  background: var(--ck-danger-soft);
  font-size: var(--ck-text-sm);
  color: var(--ck-danger);
}

.abj__footnote {
  margin: 0;
  text-align: center;
  font-size: var(--ck-text-sm);
  color: var(--ck-text-muted);
}
</style>
