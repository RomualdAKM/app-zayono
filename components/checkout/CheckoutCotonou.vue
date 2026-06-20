<template>
  <!--
    Cotonou template — "Receipt" identity.
    Style ticket de caisse : séparateurs hairline / pointillés, chiffres
    tabulaires, deux zones distinctes (Récapitulatif gauche / Paiement
    droite sur desktop ; empilé sur mobile). Coins 4px. Zéro ombre.
  -->
  <div class="cot">
    <aside class="cot__summary">
      <div class="cot__summary-head">
        <span class="cot__summary-eyebrow">{{ t('checkout.summary.eyebrow') }}</span>
      </div>

      <div class="cot__merchant">
        <img
          v-if="session?.merchant?.logo_url && !logoFailed"
          :src="session.merchant.logo_url"
          :alt="session?.merchant?.name || ''"
          class="cot__merchant-logo"
          @error="logoFailed = true"
        />
        <div class="cot__merchant-text">
          <span class="cot__merchant-name">{{ session?.merchant?.name || t('checkout.merchant.fallbackName') }}</span>
          <span v-if="session?.description" class="cot__merchant-desc">{{ session.description }}</span>
        </div>
      </div>

      <div class="cot__lines">
        <div class="cot__line">
          <span class="cot__line-label">{{ t('checkout.summary.amountLabel') }}</span>
          <span class="cot__line-dots" aria-hidden="true"></span>
          <span class="cot__line-value">{{ formatAmount(session?.amount ?? 0, session?.currency ?? 'XOF') }}</span>
        </div>
        <div v-if="feeAmount > 0" class="cot__line">
          <span class="cot__line-label">{{ t('checkout.summary.operatorFeeLabel', { percent: feePct }) }}</span>
          <span class="cot__line-dots" aria-hidden="true"></span>
          <span class="cot__line-value">+ {{ formatAmount(feeAmount, session?.currency ?? 'XOF') }}</span>
        </div>
        <div v-if="isForeignCurrencyOp && step === 2" class="cot__line cot__line--muted">
          <span class="cot__line-label">{{ t('checkout.summary.chargeCurrencyLabel') }}</span>
          <span class="cot__line-dots" aria-hidden="true"></span>
          <span class="cot__line-value">{{ displayChargeCurrency }}</span>
        </div>
      </div>

      <div class="cot__total">
        <span class="cot__total-label">{{ t('checkout.summary.totalLabel') }}</span>
        <span class="cot__total-value">
          {{ formatAmount(displayChargeAmount, displayChargeCurrency) }}<span v-if="anyOperatorHasFees || feeAmount > 0" class="cot__total-star">*</span>
        </span>
      </div>

      <div v-if="step === 2 && isForeignCurrencyOp && selectedOperatorObj?.fx_rate" class="cot__fx">
        1 {{ currencyShort(session?.currency) }} ≈ {{ formatRate(selectedOperatorObj.fx_rate) }} {{ currencyShort(displayChargeCurrency) }}
      </div>

      <div v-if="session?.merchant?.support_email" class="cot__support">
        <span class="cot__support-label">{{ t('checkout.support.label') }}</span>
        <a :href="`mailto:${session.merchant.support_email}`">{{ session.merchant.support_email }}</a>
      </div>
    </aside>

    <section class="cot__form">
      <header class="cot__form-head">
        <button
          v-if="step === 2"
          type="button"
          class="cot__back"
          :aria-label="t('checkout.form.backAriaLabel')"
          @click="$emit('back')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ t('checkout.form.backButton') }}
        </button>
        <div class="cot__form-titles">
          <span class="cot__form-eyebrow">{{ t('checkout.form.eyebrow') }}</span>
          <h2 class="cot__form-welcome">
            {{ customerFirstName ? t('checkout.intro.welcomeNamed', { name: customerFirstName }) : t('checkout.intro.welcome') }}
          </h2>
        </div>
        <CheckoutLangToggle />
      </header>

      <template v-if="step === 1">
        <div v-if="countries.length > 1" class="cot__field">
          <label class="cot__label">{{ t('checkout.field.countryLabel') }}</label>
          <CheckoutCountrySelector
            :countries="countries"
            :model-value="selectedCountry"
            @update:modelValue="(c: string) => $emit('update:country', c)"
          />
        </div>

        <div v-if="!filteredOperators.length" class="cot__empty">
          {{ t('checkout.empty.noMethods') }}
        </div>

        <div v-else class="cot__field">
          <label class="cot__label">{{ t('checkout.field.methodLabel') }}</label>
          <ul class="cot__methods">
            <li
              v-for="op in filteredOperators"
              :key="op.code"
              class="cot__method"
              :class="{
                'cot__method--selected': selectedOperator === op.code,
                'cot__method--disabled': op.fx_available === false,
              }"
            >
              <button
                type="button"
                class="cot__method-btn"
                :disabled="op.fx_available === false"
                :aria-pressed="selectedOperator === op.code"
                @click="onMethodPick(op.code)"
              >
                <span
                  class="cot__method-logo"
                  :style="{ backgroundColor: resolveOperatorBrand(op.name).bg || 'var(--ck-surface-sunken)' }"
                  aria-hidden="true"
                >
                  <img
                    v-if="resolveOperatorBrand(op.name).url"
                    :src="resolveOperatorBrand(op.name).url"
                    alt=""
                  />
                  <span v-else>{{ op.name.substring(0, 2).toUpperCase() }}</span>
                </span>
                <span class="cot__method-body">
                  <span class="cot__method-name">{{ op.name }}</span>
                  <span class="cot__method-subtitle">
                    {{ fxUnavailableLabel(op) ?? countryLabel(op.country) }}
                  </span>
                </span>
                <span v-if="selectedOperator === op.code" class="cot__method-tick" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5 9-9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </button>
            </li>
          </ul>
        </div>
      </template>

      <template v-else>
        <div class="cot__selected">
          <span
            class="cot__selected-logo"
            :style="{ backgroundColor: resolveOperatorBrand(selectedOperatorName).bg || 'var(--ck-surface-sunken)' }"
            aria-hidden="true"
          >
            <img v-if="selectedOperatorBrandUrl" :src="selectedOperatorBrandUrl" alt="" />
            <span v-else>{{ (selectedOperatorName || '?').substring(0, 2).toUpperCase() }}</span>
          </span>
          <div class="cot__selected-text">
            <span class="cot__selected-eyebrow">{{ t('checkout.selected.eyebrow') }}</span>
            <strong class="cot__selected-name">{{ selectedOperatorName }}</strong>
          </div>
        </div>

        <div v-if="phoneRequired" class="cot__field">
          <label class="cot__label" for="phone">{{ t('checkout.field.phoneLabel') }} <span class="cot__required">*</span></label>
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

        <div v-else class="cot__info">
          {{ t('checkout.info.redirectSecurePage') }}
        </div>

        <div v-if="otpRequired" class="cot__field">
          <label class="cot__label" for="otp">{{ t('checkout.field.otpLabel') }}</label>
          <p class="cot__otp-hint" style="font-size:12px;color:#6b7280;margin:4px 0 10px;line-height:1.45;">{{ t('checkout.step2.otpHint') }}</p>
          <input
            id="otp"
            :value="otp"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="8"
            :placeholder="t('checkout.field.otpPlaceholder')"
            class="cot__otp"
            @input="(e: any) => $emit('update:otp', e.target.value)"
          />
        </div>

        <p v-if="formError && !phoneError" class="cot__form-error" role="alert">{{ formError }}</p>

        <CheckoutCTA
          :label="session?.merchant?.branding?.cta_label || t('checkout.cta.payAmount', { amount: formatAmount(displayChargeAmount, displayChargeCurrency) })"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="$emit('submit')"
        />

        <p class="cot__footnote">
          {{ t('checkout.footer.poweredBy') }}
          <a href="https://zayono.com" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;text-underline-offset:2px;">Zayono</a>
        </p>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import CheckoutCountrySelector from './atoms/CheckoutCountrySelector.vue'
import CheckoutPhoneInput from './atoms/CheckoutPhoneInput.vue'
import CheckoutCTA from './atoms/CheckoutCTA.vue'
import type { CheckoutCountry } from './atoms/CheckoutCountrySelector.vue'
import { useOperatorLogo } from '~/composables/useOperatorLogo'

const { resolveOperatorBrand } = useOperatorLogo()
const { t } = useI18n()

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
const anyOperatorHasFees = computed(() =>
  Object.values(feeMap.value).some((v: any) => v && Number(v) > 0),
)

const isForeignCurrencyOp = computed(() => {
  const op = selectedOperatorObj.value
  if (!op) return false
  return op.charge_currency && op.charge_currency !== props.session?.currency
})
const displayChargeAmount = computed(() => {
  const op = selectedOperatorObj.value
  if (op && op.charge_amount != null && props.step === 2) return op.charge_amount + feeAmount.value
  return totalCharged.value
})
const displayChargeCurrency = computed(() => {
  const op = selectedOperatorObj.value
  if (op && props.step === 2) return op.charge_currency || props.session?.currency || 'XOF'
  return props.session?.currency || 'XOF'
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

function countryLabel(iso: string): string {
  const c = countries.value.find(x => x.code === iso)
  return c?.name ?? iso
}

function fxUnavailableLabel(op: any): string | null {
  if (op.fx_available !== false) return null
  if (op.fx_reason === 'conversion_disabled') return t('checkout.fx.conversionDisabled')
  return t('checkout.fx.unavailableCurrency')
}

function currencyShort(code: string | null | undefined): string {
  if (!code) return ''
  const map: Record<string, string> = {
    XOF: 'F CFA', XAF: 'FCFA', GNF: 'FG', KES: 'KES', GHS: 'GH₵',
    NGN: '₦', ZAR: 'R', UGX: 'USh', RWF: 'FRw', TZS: 'TSh',
    USD: 'USD', EUR: 'EUR', GBP: 'GBP',
  }
  return map[code.toUpperCase()] ?? code.toUpperCase()
}

function formatRate(rate: number): string {
  if (rate >= 100) return rate.toFixed(0)
  if (rate >= 1) return rate.toFixed(2)
  return rate.toPrecision(2)
}

const formatAmount = props.formatAmount
</script>

<style scoped>
.cot {
  display: grid;
  grid-template-columns: 1fr;
  width: 100%;
  max-width: 940px;
  margin: 0 auto;
  background: var(--ck-surface);
  border: 1px solid var(--ck-border);
  border-radius: 4px;
}

@media (min-width: 880px) {
  .cot {
    grid-template-columns: 340px 1fr;
  }
}

/* ─── Summary (left on desktop / top on mobile) ─── */
.cot__summary {
  padding: var(--ck-sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-4);
  background: var(--ck-surface-sunken);
  border-bottom: 1px solid var(--ck-border);
}

@media (min-width: 880px) {
  .cot__summary {
    border-bottom: none;
    border-right: 1px solid var(--ck-border);
    padding: var(--ck-sp-8);
  }
}

.cot__summary-eyebrow {
  font-size: var(--ck-text-xs);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.cot__merchant {
  display: flex;
  align-items: center;
  gap: var(--ck-sp-3);
}

.cot__merchant-logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  border: 1px solid var(--ck-border);
  border-radius: 4px;
  background: var(--ck-surface);
  padding: 3px;
  flex-shrink: 0;
}

.cot__merchant-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cot__merchant-name {
  font-size: var(--ck-text-md);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-strong);
  line-height: var(--ck-lh-tight);
}

.cot__merchant-desc {
  font-size: var(--ck-text-sm);
  color: var(--ck-text-muted);
  line-height: var(--ck-lh-normal);
  margin-top: 2px;
}

/* ─── Receipt lines ─── */
.cot__lines {
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-2);
  padding-top: var(--ck-sp-3);
  border-top: 1px solid var(--ck-border);
}

.cot__line {
  display: flex;
  align-items: baseline;
  gap: var(--ck-sp-2);
  font-size: var(--ck-text-sm);
  color: var(--ck-text-body);
  font-variant-numeric: tabular-nums;
}

.cot__line--muted { color: var(--ck-text-muted); }

.cot__line-label { flex-shrink: 0; }

.cot__line-dots {
  flex: 1;
  height: 1px;
  border-bottom: 1px dotted var(--ck-border-strong);
  align-self: center;
  transform: translateY(-2px);
}

.cot__line-value {
  flex-shrink: 0;
  font-weight: var(--ck-fw-medium);
  color: var(--ck-text-strong);
}

/* ─── Total ─── */
.cot__total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-top: var(--ck-sp-3);
  border-top: 2px solid var(--ck-text-strong);
}

.cot__total-label {
  font-size: var(--ck-text-xs);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-strong);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.cot__total-value {
  font-size: var(--ck-text-xl);
  font-weight: var(--ck-fw-bold);
  color: var(--ck-text-strong);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.cot__total-star {
  color: var(--ck-danger);
  font-size: 0.55em;
  vertical-align: super;
  margin-left: 2px;
}

.cot__fx {
  font-size: var(--ck-text-xs);
  color: var(--ck-text-muted);
  font-variant-numeric: tabular-nums;
  margin-top: -8px;
  text-align: right;
}

.cot__support {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--ck-text-sm);
  padding-top: var(--ck-sp-3);
  border-top: 1px dashed var(--ck-border);
}

.cot__support-label {
  font-size: var(--ck-text-xs);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.cot__support a {
  color: var(--ck-primary);
  text-decoration: none;
}

.cot__support a:hover { text-decoration: underline; }

/* ─── Form (right on desktop / bottom on mobile) ─── */
.cot__form {
  padding: var(--ck-sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-5);
}

@media (min-width: 880px) {
  .cot__form { padding: var(--ck-sp-8); }
}

.cot__form-head {
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-3);
}

.cot__back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--ck-border);
  border-radius: 4px;
  font: inherit;
  font-size: var(--ck-text-sm);
  font-weight: var(--ck-fw-medium);
  color: var(--ck-text-body);
  cursor: pointer;
  transition: background var(--ck-duration-quick) var(--ck-easing-fast);
}

.cot__back:hover { background: var(--ck-surface-sunken); }
.cot__back:focus-visible { outline: none; box-shadow: var(--ck-shadow-focus); }

.cot__form-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cot__form-eyebrow {
  font-size: var(--ck-text-xs);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.cot__form-welcome {
  margin: 0;
  font-size: var(--ck-text-xl);
  font-weight: var(--ck-fw-bold);
  color: var(--ck-text-strong);
  line-height: var(--ck-lh-tight);
  letter-spacing: -0.01em;
}

/* ─── Form fields ─── */
.cot__field {
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-2);
}

.cot__label {
  font-size: var(--ck-text-xs);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-body);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.cot__required { color: var(--ck-danger); }

/* ─── Methods list (receipt-row style) ─── */
.cot__methods {
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid var(--ck-border);
  border-radius: 4px;
  overflow: hidden;
}

.cot__method {
  border-bottom: 1px dashed var(--ck-border);
}

.cot__method:last-child { border-bottom: none; }

.cot__method--selected { background: var(--ck-surface-sunken); }

.cot__method--disabled { opacity: 0.5; }

.cot__method-btn {
  display: flex;
  align-items: center;
  gap: var(--ck-sp-3);
  width: 100%;
  padding: var(--ck-sp-3) var(--ck-sp-4);
  background: transparent;
  border: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.cot__method-btn:disabled { cursor: not-allowed; }

.cot__method-btn:focus-visible {
  outline: 2px solid var(--ck-primary);
  outline-offset: -2px;
}

.cot__method-logo {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  color: #fff;
  font-size: 11px;
  font-weight: var(--ck-fw-bold);
}

.cot__method-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.cot__method-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.cot__method-name {
  font-size: var(--ck-text-md);
  font-weight: var(--ck-fw-medium);
  color: var(--ck-text-strong);
}

.cot__method--selected .cot__method-name { color: var(--ck-text-strong); font-weight: var(--ck-fw-semibold); }

.cot__method-subtitle {
  font-size: var(--ck-text-xs);
  color: var(--ck-text-muted);
}

.cot__method-tick {
  color: var(--ck-text-strong);
  flex-shrink: 0;
}

/* ─── Step 2 selected ─── */
.cot__selected {
  display: flex;
  align-items: center;
  gap: var(--ck-sp-3);
  padding: var(--ck-sp-3) var(--ck-sp-4);
  border: 1px solid var(--ck-border);
  border-radius: 4px;
}

.cot__selected-logo {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  color: #fff;
  font-size: 11px;
  font-weight: var(--ck-fw-bold);
}

.cot__selected-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.cot__selected-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cot__selected-eyebrow {
  font-size: var(--ck-text-xs);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.cot__selected-name {
  font-size: var(--ck-text-md);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-strong);
}

/* ─── Empty / info / OTP / error ─── */
.cot__empty {
  padding: var(--ck-sp-4);
  border: 1px solid var(--ck-warning);
  border-radius: 4px;
  font-size: var(--ck-text-sm);
  color: var(--ck-warning-strong);
  background: var(--ck-warning-soft);
}

.cot__info {
  padding: var(--ck-sp-3) var(--ck-sp-4);
  border: 1px solid var(--ck-border);
  border-left: 3px solid var(--ck-info);
  border-radius: 0 4px 4px 0;
  font-size: var(--ck-text-sm);
  color: var(--ck-info);
}

.cot__otp {
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

.cot__otp:focus-visible {
  outline: none;
  border-color: var(--ck-primary);
  box-shadow: var(--ck-shadow-focus);
}

.cot__form-error {
  margin: 0;
  padding: var(--ck-sp-2) var(--ck-sp-3);
  border: 1px solid var(--ck-danger);
  border-radius: 4px;
  background: var(--ck-danger-soft);
  font-size: var(--ck-text-sm);
  color: var(--ck-danger);
}

.cot__footnote {
  margin: 0;
  text-align: center;
  font-size: var(--ck-text-sm);
  color: var(--ck-text-muted);
}
</style>
