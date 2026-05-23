/**
 * Per-failure-code customer-facing copy + CTA recommendations.
 *
 * The backend ships a structured `failure_code` (string, SCREAMING_SNAKE)
 * via the /status and /process endpoints. The frontend keys this map
 * to get a French-language title + body + CTA hints, instead of showing
 * the generic "Une erreur est survenue" used previously.
 *
 * Variables in messages use a Mustache-style `{{name}}` token that the
 * caller resolves via `resolveFailureCopy(code, ctx)`. Available tokens:
 *   - operatorName   — e.g. "MTN MoMo CI"
 *   - currency       — e.g. "F CFA"
 *   - amountFormatted — e.g. "2 500 F CFA"
 *   - reference      — public transaction id
 *   - merchantName   — merchant name from the session
 *   - phoneHint      — operator's expected phone format hint
 *   - attemptsRemaining — for OTP_INVALID
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

export interface FailureCopy {
  title: string
  body: string
  primaryCta?: { label: string; action: 'retry' | 'switch_method' | 'contact_merchant' | 'cancel' | 'request_new_otp' }
  secondaryCta?: { label: string; action: 'retry' | 'switch_method' | 'contact_merchant' | 'cancel' | 'request_new_otp' }
}

/**
 * Raw template strings. Customer-facing, formal French ("vous"),
 * action-oriented.
 */
const TEMPLATES: Record<FailureCode, FailureCopy> = {
  INVALID_PHONE_FORMAT: {
    title: 'Numéro de téléphone invalide',
    body: "Le numéro saisi n'est pas valide pour {{operatorName}}. Format attendu : {{phoneHint}}. Vérifiez votre numéro ou choisissez un autre opérateur.",
    primaryCta: { label: 'Modifier le numéro', action: 'retry' },
    secondaryCta: { label: "Changer d'opérateur", action: 'switch_method' },
  },
  AMOUNT_BELOW_MIN: {
    title: 'Montant trop bas',
    body: "Le montant minimum pour {{operatorName}} n'est pas atteint. Contactez {{merchantName}} pour adapter le montant.",
    primaryCta: { label: 'Contacter le marchand', action: 'contact_merchant' },
    secondaryCta: { label: 'Annuler', action: 'cancel' },
  },
  AMOUNT_ABOVE_MAX: {
    title: 'Montant trop élevé',
    body: "Ce montant dépasse la limite par transaction pour {{operatorName}}. Essayez un paiement par carte bancaire ou contactez votre opérateur pour relever le plafond.",
    primaryCta: { label: "Changer d'opérateur", action: 'switch_method' },
    secondaryCta: { label: 'Annuler', action: 'cancel' },
  },
  CURRENCY_UNSUPPORTED: {
    title: 'Devise non prise en charge',
    body: "{{operatorName}} n'accepte pas les paiements en {{currency}}. Choisissez un autre moyen de paiement.",
    primaryCta: { label: "Changer d'opérateur", action: 'switch_method' },
  },
  OPERATOR_UNAVAILABLE: {
    title: 'Opérateur indisponible',
    body: "Le service {{operatorName}} rencontre des perturbations. Réessayez dans quelques minutes ou choisissez un autre moyen de paiement.",
    primaryCta: { label: "Changer d'opérateur", action: 'switch_method' },
    secondaryCta: { label: 'Réessayer', action: 'retry' },
  },
  INSUFFICIENT_FUNDS: {
    title: 'Solde insuffisant',
    body: 'Le solde de votre compte {{operatorName}} est insuffisant pour ce paiement. Rechargez votre compte puis réessayez, ou essayez un autre moyen.',
    primaryCta: { label: 'Réessayer', action: 'retry' },
    secondaryCta: { label: "Changer d'opérateur", action: 'switch_method' },
  },
  CUSTOMER_TIMEOUT: {
    title: 'Délai dépassé',
    body: "Vous n'avez pas validé le paiement à temps sur votre téléphone. Recommencez et tenez votre téléphone prêt à confirmer.",
    primaryCta: { label: 'Réessayer', action: 'retry' },
    secondaryCta: { label: 'Annuler', action: 'cancel' },
  },
  CUSTOMER_REJECTED: {
    title: 'Paiement refusé sur votre téléphone',
    body: "Vous avez refusé le paiement. Si c'était une erreur, recommencez.",
    primaryCta: { label: 'Réessayer', action: 'retry' },
    secondaryCta: { label: 'Annuler', action: 'cancel' },
  },
  // R1 audit CRITICAL F3: no driver currently implements `resendOtp`
  // (the endpoint always 422s). Until at least one does, route the
  // recovery CTAs to "recommencer le paiement" (switch_method) which
  // restarts the flow fresh — the next /process call mints a new OTP.
  OTP_EXPIRED: {
    title: 'Code expiré',
    body: 'Le code de confirmation a expiré. Recommencez le paiement pour recevoir un nouveau code.',
    primaryCta: { label: 'Recommencer', action: 'switch_method' },
    secondaryCta: { label: 'Annuler', action: 'cancel' },
  },
  OTP_INVALID: {
    title: 'Code incorrect',
    body: 'Le code saisi est incorrect. Vérifiez le SMS et réessayez.',
    primaryCta: { label: 'Réessayer', action: 'retry' },
  },
  OTP_LOCKED: {
    title: 'Trop de tentatives',
    body: "Le code a été saisi incorrectement plusieurs fois. Recommencez le paiement ou changez d'opérateur.",
    primaryCta: { label: 'Recommencer', action: 'switch_method' },
    secondaryCta: { label: "Changer d'opérateur", action: 'switch_method' },
  },
  DUPLICATE_TRANSACTION: {
    title: 'Paiement déjà effectué',
    body: 'Un paiement identique vient d\'être traité. Vérifiez votre historique. Référence : {{reference}}.',
    primaryCta: { label: 'Contacter le marchand', action: 'contact_merchant' },
  },
  NETWORK_TIMEOUT: {
    title: 'Connexion lente',
    body: 'La connexion semble lente. Réessayez ou vérifiez votre accès à Internet.',
    primaryCta: { label: 'Réessayer', action: 'retry' },
    secondaryCta: { label: "Changer d'opérateur", action: 'switch_method' },
  },
  AGGREGATOR_UNREACHABLE: {
    title: 'Service indisponible',
    body: "Le service de paiement {{operatorName}} est temporairement indisponible. Réessayez dans une minute ou choisissez un autre moyen.",
    primaryCta: { label: 'Réessayer', action: 'retry' },
    secondaryCta: { label: "Changer d'opérateur", action: 'switch_method' },
  },
  MERCHANT_NO_OPERATORS: {
    title: 'Aucun moyen de paiement disponible',
    body: "{{merchantName}} n'a configuré aucun moyen de paiement compatible avec votre devise. Contactez le marchand pour qu'il en active un.",
    primaryCta: { label: 'Contacter le marchand', action: 'contact_merchant' },
  },
  UNKNOWN: {
    title: 'Une erreur est survenue',
    body: 'Une erreur inattendue est survenue. Référence : {{reference}}. Réessayez ou contactez le marchand si le problème persiste.',
    primaryCta: { label: 'Réessayer', action: 'retry' },
    secondaryCta: { label: 'Contacter le marchand', action: 'contact_merchant' },
  },
}

/**
 * Resolve the customer-facing copy for a failure code, substituting
 * the context tokens into the template strings.
 */
export function useFailureCopy() {
  function resolveFailureCopy(code: string | null | undefined, ctx: FailureCtx = {}): FailureCopy {
    const normalized = (code || 'UNKNOWN') as FailureCode
    const tpl = TEMPLATES[normalized] ?? TEMPLATES.UNKNOWN
    return {
      ...tpl,
      title: interpolate(tpl.title, ctx),
      body: interpolate(tpl.body, ctx),
    }
  }

  return { resolveFailureCopy }
}

function interpolate(template: string, ctx: FailureCtx): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = (ctx as Record<string, unknown>)[key]
    if (value === undefined || value === null || value === '') {
      // Graceful: drop the unfilled token entirely rather than leaving
      // "{{phoneHint}}" visible. The sentence still parses.
      return ''
    }
    return String(value)
  })
}
