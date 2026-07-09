/**
 * Checkout API client + utilities.
 *
 * Phase A/B/C/D refactor — extended interfaces:
 *   - CheckoutSession gains `customer_country_guess` (Cloudflare IP geo)
 *     and operator entries gain `category` + `phone_format`.
 *   - StatusResponse gains `failure_code` (structured), `transaction_public_id`,
 *     `operator_code`, `masked_phone`, `completed_at`.
 *   - ProcessResponse gains `idempotent` (true when the backend replayed
 *     the in-flight transaction rather than starting a new one).
 *   - New endpoints: resendOtp, emailReceipt, downloadReceiptUrl.
 */

export interface PhoneFormat {
  dial_code: string
  name: string
  flag: string
  national_regex: string
  national_length: number | [number, number]
  national_hint: string
  national_example: string
  national_groups: number[]
}

export interface Operator {
  code: string
  name: string
  country: string
  currency: string
  // True when the customer must enter an OTP at checkout (PayDunya Orange CI
  // and Orange BF). Default false; harmless if missing on older sessions.
  otp_required?: boolean
  // False when the operator handles payment on its own hosted page (Stripe
  // card flow) and doesn't need a phone number at our checkout step.
  // Defaults to true if absent — Mobile Money operators always need one.
  phone_required?: boolean
  // True when the aggregator returns its own URL to redirect the customer
  // (Stripe Checkout, Wave hosted, Djamo, PayDunya CnP, KKiaPay widget…).
  redirect_flow?: boolean
  // Phase A: category drives FE grouping (Mobile Money / Cartes /
  // Crypto / Bank / Wallet / USSD / QR).
  category?: 'mobile_money' | 'card' | 'crypto' | 'bank' | 'wallet' | 'ussd' | 'qr'
  // Phase A: phone format used by CheckoutPhoneInput. Null for operators
  // that don't collect a phone number (Stripe card, Coinbase).
  phone_format?: PhoneFormat | null
  // FX-aware checkout — when the operator's native currency differs
  // from the session currency, the backend converts the session amount
  // and ships the result here. The FE renders this on Step 2 so the
  // customer sees the price in their local currency.
  //  - charge_amount: amount to be charged in the operator's currency
  //  - charge_currency: ISO-4217 of charge_amount
  //  - fx_rate: rate applied (1.0 when no conversion needed)
  //  - fx_available: false when the operator is surfaced but disabled
  //    in the UI (no exchange rate, conversion off, or below the crypto
  //    minimum). fx_reason carries WHY so the tile can show a label.
  charge_amount?: number | null
  charge_currency?: string
  fx_rate?: number | null
  fx_available?: boolean
  fx_reason?: 'amount_below_min' | 'conversion_disabled' | 'no_rate' | null
}

export interface CheckoutSession {
  merchant: {
    name: string
    logo_url?: string | null
    website?: string | null
    support_email?: string | null
    support_phone?: string | null
    branding?: {
      primary_color?: string | null
    }
  }
  template?: 'default' | 'abidjan' | 'cotonou'
  amount: number
  currency: string
  description: string | null
  status: string
  environment?: 'sandbox' | 'live'
  customer_phone: string | null
  customer_email: string | null
  operators: Operator[]
  fee_percent_by_operator?: Record<string, number | null>
  expires_at: string
  // Phase A.5: optional country hint from CF-IPCountry. The FE uses it
  // to pre-select the country in the Step 1 picker — never enforced.
  customer_country_guess?: string | null
}

export interface ProcessResponse {
  status: string
  transaction_status: string
  redirect_url: string | null
  // Set when the aggregator hosts its own payment page (Wave, Djamo,
  // KKiaPay widget bridge, etc.). When present, the checkout page must
  // navigate the customer there instead of polling for status.
  aggregator_redirect_url?: string | null
  // Phase A: present on idempotent replays — the backend detected an
  // already-pending transaction and returned its current state without
  // starting a new one.
  idempotent?: boolean
  next_action?: {
    type: 'otp' | 'ussd' | 'redirection' | string
    message?: string
    ussdCode?: string
    url?: string
  } | null
}

export interface StatusResponse {
  session_status: string
  transaction_status?: string
  failure_reason?: string
  // Phase A.1: structured failure code keyed by useFailureCopy().
  failure_code?: string | null
  // Phase A: public transaction id surfaced for support / receipt.
  transaction_public_id?: string | null
  operator_code?: string | null
  masked_phone?: string | null
  completed_at?: string | null
  expires_at: string
  return_url: string
  cancel_url: string | null
}

interface ApiResponse<T> {
  message: string
  data: T
  errors: unknown
}

export const useCheckout = () => {
  const config = useRuntimeConfig()
  const base = config.public.apiBase
  const { locale: activeLocale } = useI18n()

  // Map the i18n locale to a BCP-47 tag for Intl. Re-read on each call so
  // amounts re-format when the customer switches language.
  const intlLocale = () => (activeLocale.value === 'en' ? 'en-US' : 'fr-FR')

  const getSession = async (token: string): Promise<ApiResponse<CheckoutSession>> => {
    return await $fetch<ApiResponse<CheckoutSession>>(`${base}/checkout/${token}`, {
      headers: { Accept: 'application/json' },
    })
  }

  const processPayment = async (
    token: string,
    data: { operator: string; phone: string | null; otp?: string },
  ): Promise<ApiResponse<ProcessResponse>> => {
    return await $fetch<ApiResponse<ProcessResponse>>(`${base}/checkout/${token}/process`, {
      method: 'POST',
      body: data,
      headers: { Accept: 'application/json' },
    })
  }

  const checkStatus = async (token: string): Promise<ApiResponse<StatusResponse>> => {
    return await $fetch<ApiResponse<StatusResponse>>(`${base}/checkout/${token}/status`, {
      headers: { Accept: 'application/json' },
    })
  }

  /**
   * Phase A.4 — UX recovery endpoints.
   */
  const resendOtp = async (token: string): Promise<ApiResponse<{ resent: boolean }>> => {
    return await $fetch<ApiResponse<{ resent: boolean }>>(`${base}/checkout/${token}/resend-otp`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    })
  }

  const emailReceipt = async (
    token: string,
    email?: string,
  ): Promise<ApiResponse<{ sent: boolean; recipient: string }>> => {
    return await $fetch<ApiResponse<{ sent: boolean; recipient: string }>>(
      `${base}/checkout/${token}/email-receipt`,
      {
        method: 'POST',
        body: email ? { email } : {},
        headers: { Accept: 'application/json' },
      },
    )
  }

  const downloadReceiptUrl = (token: string): string =>
    `${base}/checkout/${token}/receipt.pdf`

  /**
   * Locale-aware amount formatting. Defaults to French. The currency
   * symbol is what `Intl.NumberFormat` returns — accept the locale's
   * convention (XOF → "F CFA" or "XOF" depending on browser).
   */
  const formatAmount = (amount: number, currency: string, locale = intlLocale()): string => {
    // ISO 4217 zero-decimal currencies only. KES and MWK are 2-decimal
    // (a KES amount of 100.50 must NOT render as "101", which differs from
    // what the customer is actually debited).
    const zeroDecimal = ['XOF', 'XAF', 'RWF', 'UGX', 'GNF', 'JPY']
    const useZeroDecimal = zeroDecimal.includes(currency.toUpperCase())
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        // R2 audit MED N2: was `useZeroDecimal ? 0 : 0` — both branches
        // identical. For decimal currencies (EUR, USD, GBP, ZAR…)
        // `minimumFractionDigits: 0` rendered `€1` instead of `€1.00`.
        // Fixed to enforce 2 decimals for non-zero-decimal currencies.
        minimumFractionDigits: useZeroDecimal ? 0 : 2,
        maximumFractionDigits: useZeroDecimal ? 0 : 2,
      }).format(amount)
    } catch {
      return `${amount} ${currency}`
    }
  }

  return {
    getSession,
    processPayment,
    checkStatus,
    resendOtp,
    emailReceipt,
    downloadReceiptUrl,
    formatAmount,
  }
}
