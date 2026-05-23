/**
 * Resolve the brand logo + fallback badge for an operator.
 *
 * Wraps `operatorLogo()` + `operatorBadge()` from `useOperatorBadge.ts`
 * (the dashboard's logo resolver) so the checkout and dashboard stay
 * visually IN SYNC. Same image assets, same color rules, same brand
 * matching — a customer sees the exact same MTN/Orange/Wave logo on
 * the checkout that the merchant sees in their dashboard.
 *
 * The previous implementation used a separate per-code-prefix map,
 * which drifted from the dashboard. R3 audit fix.
 */
import { operatorBadge, operatorLogo } from '~/composables/useOperatorBadge'

interface OperatorBrand {
  /** Path to the logo asset under /public/. Empty string when no
   *  brand-specific PNG exists — caller falls back to the initial. */
  url: string
  /** CSS background color for the logo circle. When the logo PNG
   *  loads, this sits behind it (most brand logos have transparent
   *  backgrounds, so the circle takes the brand color). */
  bg: string
}

export function useOperatorLogo() {
  /**
   * Given an operator name (eg "MTN Mobile Money", "M-Pesa Kenya"),
   * return the logo URL + circle background color. Delegates to the
   * dashboard's name-based matcher so additions land in one place.
   */
  function resolveOperatorBrand(operatorName: string): OperatorBrand {
    const url = operatorLogo(operatorName) ?? ''
    const badge = operatorBadge(operatorName)
    return { url, bg: badge.bg }
  }
  return { resolveOperatorBrand }
}
