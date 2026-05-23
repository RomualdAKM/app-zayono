<template>
  <div class="ck-amount" :class="{ 'ck-amount--large': size === 'large' }">
    <span v-if="label" class="ck-amount__label">{{ label }}</span>
    <span class="ck-amount__value">
      {{ formatted }}<span v-if="hasFees" class="ck-amount__asterisk" :title="feeTooltip">*</span>
    </span>
    <!-- FX rate sub-text (Moneroo convention: `1 F CFA ≈ 0.24 KES`).
         Only rendered when both source and target currencies are
         supplied and they differ. The FE composes the display string
         and the atom just renders. -->
    <span v-if="fxRateLine" class="ck-amount__fx">{{ fxRateLine }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * Amount display — the centered, prominent amount the customer is
 * about to pay.
 *
 * Two FX modes:
 *  - same-currency: show only `{amount} {currency}`
 *  - cross-currency: show `{converted} {target}` big, then
 *    `1 {source} ≈ {rate} {target}` in small muted text. Matches
 *    Moneroo's checkout convention.
 *
 * Asterisk handling: when `hasFees` is true, append a red `*` to the
 * amount and surface the fee tooltip on hover. The disclaimer below
 * the CTA explains.
 */
const props = defineProps<{
  amount: number
  currency: string
  label?: string
  hasFees?: boolean
  size?: 'normal' | 'large'
  feeTooltip?: string
  /** Source currency for FX disclosure (typically session.currency). */
  sourceCurrency?: string | null
  /** Rate used to convert from source to currency. 1.0 → no display. */
  fxRate?: number | null
}>()

const formatted = computed(() => {
  const zeroDecimal = ['XOF', 'XAF', 'RWF', 'UGX', 'GNF', 'MWK', 'KES', 'JPY']
  const useZeroDecimal = zeroDecimal.includes(props.currency.toUpperCase())
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: props.currency,
      // R2 audit MED N2 — enforce 2 decimals for non-zero-decimal
      // currencies so EUR/USD render as €1.00 not €1.
      minimumFractionDigits: useZeroDecimal ? 0 : 2,
      maximumFractionDigits: useZeroDecimal ? 0 : 2,
    }).format(props.amount)
  } catch {
    return `${props.amount} ${props.currency}`
  }
})

/**
 * Compose the FX disclosure line. Returns null when no conversion is
 * happening (same currency, no rate provided, or rate of 1.0). Format
 * matches Moneroo: "1 {source} ≈ {rate} {target}".
 */
const fxRateLine = computed<string | null>(() => {
  const src = props.sourceCurrency
  const dst = props.currency
  const rate = props.fxRate
  if (!src || !dst || src === dst) return null
  if (rate == null) return null
  if (Math.abs(rate - 1) < 0.0001) {
    // 1:1 (XOF↔XAF peg): show as `1 X ≈ 1 Y` per Moneroo convention
    return `1 ${currencyShortLabel(src)} ≈ 1 ${currencyShortLabel(dst)}`
  }
  const formattedRate = rate >= 100
    ? rate.toFixed(0)
    : rate >= 1
      ? rate.toFixed(2)
      : rate.toPrecision(2)
  return `1 ${currencyShortLabel(src)} ≈ ${formattedRate} ${currencyShortLabel(dst)}`
})

/**
 * Short, human-friendly currency label used in the FX line. Maps the
 * African MoMo currencies to their on-the-ground display ("F CFA" for
 * XOF, "FCFA" for XAF — matching Moneroo's typography even though
 * both technically mean "franc CFA").
 */
function currencyShortLabel(code: string): string {
  const map: Record<string, string> = {
    XOF: 'F CFA',
    XAF: 'FCFA',
    GNF: 'FG',
    KES: 'KES',
    GHS: 'GH₵',
    NGN: '₦',
    ZAR: 'R',
    UGX: 'USh',
    RWF: 'FRw',
    TZS: 'TSh',
    ZMW: 'K',
    MWK: 'MK',
    ETB: 'Br',
    EGP: 'E£',
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP',
  }
  return map[code.toUpperCase()] ?? code.toUpperCase()
}
</script>

<style scoped>
.ck-amount {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ck-sp-1);
  text-align: center;
}

.ck-amount__label {
  font-size: var(--ck-text-xs);
  font-weight: var(--ck-fw-medium);
  color: var(--ck-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.ck-amount__value {
  font-size: var(--ck-text-2xl);
  font-weight: var(--ck-fw-bold);
  color: var(--ck-primary);
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  line-height: var(--ck-lh-tight);
}

.ck-amount--large .ck-amount__value {
  font-size: var(--ck-text-3xl);
}

.ck-amount__asterisk {
  color: var(--ck-danger);
  margin-left: 2px;
  font-weight: var(--ck-fw-semibold);
  cursor: help;
  /* Small superscript for the red `*` — matches Moneroo's style. */
  font-size: 0.6em;
  vertical-align: super;
}

.ck-amount__fx {
  font-size: var(--ck-text-sm);
  color: var(--ck-text-muted);
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}
</style>
