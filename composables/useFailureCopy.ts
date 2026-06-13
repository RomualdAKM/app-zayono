/**
 * Per-failure-code customer-facing copy + CTA recommendations.
 *
 * The backend ships a structured `failure_code` (string, SCREAMING_SNAKE)
 * via the /status and /process endpoints. The frontend maps each code to
 * an i18n key set (title + body + CTA labels) under `checkout.failure.*`,
 * so the copy is localized (FR/EN) like the rest of the checkout.
 *
 * Body messages use vue-i18n named params resolved from the ctx:
 *   - operatorName    — e.g. "MTN MoMo CI"
 *   - currency        — e.g. "F CFA"
 *   - reference       — public transaction id
 *   - merchantName    — merchant name from the session
 *   - phoneHint       — operator's expected phone format hint
 */

export type FailureCode =
  | 'INVALID_PHONE_FORMAT'
  | 'AMOUNT_BELOW_MIN'
  | 'AMOUNT_ABOVE_MAX'
  | 'CURRENCY_UNSUPPORTED'
  | 'OPERATOR_UNAVAILABLE'
  | 'INSUFFICIENT_FUNDS'
  | 'CUSTOMER_TIMEOUT'
  | 'CUSTOMER_REJECTED'
  | 'OTP_EXPIRED'
  | 'OTP_INVALID'
  | 'OTP_LOCKED'
  | 'DUPLICATE_TRANSACTION'
  | 'NETWORK_TIMEOUT'
  | 'AGGREGATOR_UNREACHABLE'
  | 'MERCHANT_NO_OPERATORS'
  | 'UNKNOWN'

export interface FailureCtx {
  operatorName?: string
  currency?: string
  amountFormatted?: string
  reference?: string
  merchantName?: string
  phoneHint?: string
  attemptsRemaining?: number
}

type CtaAction = 'retry' | 'switch_method' | 'contact_merchant' | 'cancel' | 'request_new_otp'

export interface FailureCopy {
  title: string
  body: string
  primaryCta?: { label: string; action: CtaAction }
  secondaryCta?: { label: string; action: CtaAction }
}

interface FailureKey {
  /** i18n key suffix under `checkout.failure.` for title + body. */
  name: string
  primaryCta?: { labelKey: string; action: CtaAction }
  secondaryCta?: { labelKey: string; action: CtaAction }
}

const CTA = {
  switchOperator: 'checkout.failure.cta.switchOperator',
  restart: 'checkout.failure.cta.restart',
  contactMerchant: 'checkout.failure.cta.contactMerchant',
  cancel: 'checkout.failure.cta.cancel',
  retry: 'checkout.failure.cta.retry',
} as const

const FAILURES: Record<FailureCode, FailureKey> = {
  INVALID_PHONE_FORMAT: {
    name: 'invalidPhoneFormat',
    primaryCta: { labelKey: 'checkout.failure.invalidPhoneFormat.primaryCta', action: 'retry' },
    secondaryCta: { labelKey: CTA.switchOperator, action: 'switch_method' },
  },
  AMOUNT_BELOW_MIN: {
    name: 'amountBelowMin',
    primaryCta: { labelKey: CTA.contactMerchant, action: 'contact_merchant' },
    secondaryCta: { labelKey: CTA.cancel, action: 'cancel' },
  },
  AMOUNT_ABOVE_MAX: {
    name: 'amountAboveMax',
    primaryCta: { labelKey: CTA.switchOperator, action: 'switch_method' },
    secondaryCta: { labelKey: CTA.cancel, action: 'cancel' },
  },
  CURRENCY_UNSUPPORTED: {
    name: 'currencyUnsupported',
    primaryCta: { labelKey: CTA.switchOperator, action: 'switch_method' },
  },
  OPERATOR_UNAVAILABLE: {
    name: 'operatorUnavailable',
    primaryCta: { labelKey: CTA.switchOperator, action: 'switch_method' },
    secondaryCta: { labelKey: CTA.retry, action: 'retry' },
  },
  INSUFFICIENT_FUNDS: {
    name: 'insufficientFunds',
    primaryCta: { labelKey: CTA.retry, action: 'retry' },
    secondaryCta: { labelKey: CTA.switchOperator, action: 'switch_method' },
  },
  CUSTOMER_TIMEOUT: {
    name: 'customerTimeout',
    primaryCta: { labelKey: CTA.retry, action: 'retry' },
    secondaryCta: { labelKey: CTA.cancel, action: 'cancel' },
  },
  CUSTOMER_REJECTED: {
    name: 'customerRejected',
    primaryCta: { labelKey: CTA.retry, action: 'retry' },
    secondaryCta: { labelKey: CTA.cancel, action: 'cancel' },
  },
  // R1 audit CRITICAL F3: no driver implements `resendOtp` (the endpoint
  // always 422s). Recovery CTAs route to "recommencer" (switch_method),
  // which restarts the flow fresh — the next /process call mints a new OTP.
  OTP_EXPIRED: {
    name: 'otpExpired',
    primaryCta: { labelKey: CTA.restart, action: 'switch_method' },
    secondaryCta: { labelKey: CTA.cancel, action: 'cancel' },
  },
  OTP_INVALID: {
    name: 'otpInvalid',
    primaryCta: { labelKey: CTA.retry, action: 'retry' },
  },
  OTP_LOCKED: {
    name: 'otpLocked',
    primaryCta: { labelKey: CTA.restart, action: 'switch_method' },
    secondaryCta: { labelKey: CTA.switchOperator, action: 'switch_method' },
  },
  DUPLICATE_TRANSACTION: {
    name: 'duplicateTransaction',
    primaryCta: { labelKey: CTA.contactMerchant, action: 'contact_merchant' },
  },
  NETWORK_TIMEOUT: {
    name: 'networkTimeout',
    primaryCta: { labelKey: CTA.retry, action: 'retry' },
    secondaryCta: { labelKey: CTA.switchOperator, action: 'switch_method' },
  },
  AGGREGATOR_UNREACHABLE: {
    name: 'aggregatorUnreachable',
    primaryCta: { labelKey: CTA.retry, action: 'retry' },
    secondaryCta: { labelKey: CTA.switchOperator, action: 'switch_method' },
  },
  MERCHANT_NO_OPERATORS: {
    name: 'merchantNoOperators',
    primaryCta: { labelKey: CTA.contactMerchant, action: 'contact_merchant' },
  },
  UNKNOWN: {
    name: 'unknown',
    primaryCta: { labelKey: CTA.retry, action: 'retry' },
    secondaryCta: { labelKey: CTA.contactMerchant, action: 'contact_merchant' },
  },
}

/**
 * Resolve the localized customer-facing copy for a failure code.
 */
export function useFailureCopy() {
  const { t } = useI18n()

  function resolveFailureCopy(code: string | null | undefined, ctx: FailureCtx = {}): FailureCopy {
    const normalized = (code || 'UNKNOWN') as FailureCode
    const def = FAILURES[normalized] ?? FAILURES.UNKNOWN

    // vue-i18n renders missing named params as empty, matching the old
    // graceful "drop the unfilled token" behaviour.
    const params = ctx as Record<string, unknown>

    return {
      title: t(`checkout.failure.${def.name}.title`),
      body: t(`checkout.failure.${def.name}.body`, params),
      primaryCta: def.primaryCta
        ? { label: t(def.primaryCta.labelKey), action: def.primaryCta.action }
        : undefined,
      secondaryCta: def.secondaryCta
        ? { label: t(def.secondaryCta.labelKey), action: def.secondaryCta.action }
        : undefined,
    }
  }

  return { resolveFailureCopy }
}
