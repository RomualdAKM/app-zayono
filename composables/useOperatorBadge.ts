/**
 * Map an operator name to either a real brand logo (scraped from
 * Wikipedia / favicon services into `frontend/public/operator-logos/`)
 * OR a colored brand badge fallback (single letter + brand color).
 *
 * Detection is fuzzy — operator names come from config/operators.php
 * and follow no fixed convention. We match against substrings of the
 * lowercased name, ranking specific brands first (M-Pesa before MTN,
 * AirtelTigo before Airtel, …).
 *
 * Logo coverage today: MTN, Orange, Moov, Wave, Airtel, M-Pesa,
 * Vodafone/Vodacom, Halotel, TNM, Zamtel, Wizall, Djamo, iPay.
 * The remaining brands (AirtelTigo, Telecel, Tigo, Expresso,
 * Movitel, Onatel, Celtiis, Free Money, T-Money, ZamaniCash…) fall
 * back to a colored badge — still visually consistent.
 */

export interface OperatorBadge {
  initial: string
  bg: string
  fg: string
}

/**
 * Real-logo path resolved from the operator name (scraped image at
 * `/operator-logos/<brand>.png`). Returns `null` when no logo is
 * available — caller renders the `operatorBadge()` fallback.
 *
 * Mapping is brand-level: all `mtn_*` operators resolve to the same
 * `mtn.png`. Same for Orange, Airtel, etc.
 */
export function operatorLogo(name: string): string | null {
  const lower = (name || '').toLowerCase()

  // First-match-wins. Specific mobile-money sub-brands BEFORE the
  // corporate carrier (eg `Mpamba` before `TNM`, `Halopesa` before
  // `Halotel`, `MoMo from MTN` is already covered by `mtn` because
  // we save the MoMo image as mtn.png).
  if (lower.includes('m-pesa') || lower.includes('mpesa')) return '/operator-logos/mpesa.png'
  if (lower.includes('vodacom')) return '/operator-logos/vodacom.png'
  if (lower.includes('telecel') || lower.includes('vodafone')) return '/operator-logos/telecel.png'
  if (lower.includes('airteltigo')) return '/operator-logos/airteltigo.png'
  if (lower.includes('airtel')) return '/operator-logos/airtel.png'
  if (lower.includes('mtn')) return '/operator-logos/mtn.png'
  if (lower.includes('orange')) return '/operator-logos/orange.png'
  if (lower.includes('wave')) return '/operator-logos/wave.png'
  if (lower.includes('moov')) return '/operator-logos/moov.png'
  // Mpamba (TNM Malawi mobile money) BEFORE the generic `tnm` so
  // operators named "TNM Mpamba Malawi" resolve to the dedicated
  // mascot logo rather than the corporate TNM mark.
  if (lower.includes('mpamba')) return '/operator-logos/mpamba.png'
  if (lower.includes('tnm')) return '/operator-logos/tnm.png'
  // Halopesa BEFORE Halotel — same rationale (consumer mobile money
  // brand vs corporate carrier).
  if (lower.includes('halopesa') || lower.includes('halotel')) return '/operator-logos/halopesa.png'
  if (lower.includes('zamtel')) return '/operator-logos/zamtel.png'
  if (lower.includes('wizall')) return '/operator-logos/wizall.png'
  if (lower.includes('djamo')) return '/operator-logos/djamo.png'
  if (lower.includes('movitel')) return '/operator-logos/movitel.png'
  if (lower.includes('ethio')) return '/operator-logos/ethio_telecom.png'
  if (lower.includes('ipay')) return '/operator-logos/ipay.png'

  // T-Money / Mixx by Yas (Togo). Togocel rebranded to Yas in 2024,
  // and T-Money was renamed Mixx by Yas — official `Mixx_Logo_RGB`
  // file installed from PawaPay's CDN as `tmoney.png`.
  if (
    lower.includes('t-money')
    || lower.includes('tmoney')
    || lower.includes('mixx')
    || lower.includes('togocel')
    || lower.includes('yas')
  ) {
    return '/operator-logos/tmoney.png'
  }

  // Celtiis (Bénin) — sourced from celtiis.bj's favicon directly.
  if (lower.includes('celtiis')) {
    return '/operator-logos/celtiis.png'
  }

  // Free Money (Sénégal). Logo sourced from Saga Africa Holdings, the
  // parent company — the two share corporate identity. If a future
  // press kit publishes a distinct Free Money mark, replace
  // `/operator-logos/free_money.png` rather than tweaking this match.
  if (lower.includes('free money') || lower.startsWith('free ')) {
    return '/operator-logos/free_money.png'
  }

  // Generic crypto methods (Coinbase Commerce per-currency operators
  // + Cryptomus). Same logo for all — Moneroo's UX precedent: one
  // unified blockchain mark rather than per-asset icons (BTC/ETH/
  // USDC). The official Bitcoin glyph is the most universally
  // recognised crypto symbol.
  if (lower.includes('crypto') || lower.includes('btc') || lower.includes('bitcoin')) {
    return '/operator-logos/crypto.svg'
  }

  return null
}

const NEUTRAL_BADGE: OperatorBadge = {
  initial: '?',
  bg: '#E5E7EB',
  fg: '#4B5563',
}

interface BrandRule {
  test: (name: string) => boolean
  badge: OperatorBadge
}

const RULES: BrandRule[] = [
  // Ordering matters — pattern matches are first-wins. Put more
  // specific markers (Telecel/Vodafone rebrand, M-Pesa carriers)
  // before generic ones (MTN, Orange).
  { test: n => n.includes('m-pesa') || n.includes('mpesa') || n.includes('vodacom'), badge: { initial: 'M', bg: '#0AB07A', fg: '#FFFFFF' } },
  { test: n => n.includes('telecel') || n.includes('vodafone'),                       badge: { initial: 'T', bg: '#E40000', fg: '#FFFFFF' } },
  { test: n => n.includes('airteltigo'),                                              badge: { initial: 'A', bg: '#E60000', fg: '#FFFFFF' } },
  { test: n => n.includes('airtel'),                                                  badge: { initial: 'A', bg: '#E60000', fg: '#FFFFFF' } },
  { test: n => n.includes('mtn'),                                                     badge: { initial: 'M', bg: '#FFCB05', fg: '#0F172A' } },
  { test: n => n.includes('orange'),                                                  badge: { initial: 'O', bg: '#FF7900', fg: '#FFFFFF' } },
  { test: n => n.includes('wave'),                                                    badge: { initial: 'W', bg: '#1ABCFE', fg: '#FFFFFF' } },
  { test: n => n.includes('moov'),                                                    badge: { initial: 'M', bg: '#005FAB', fg: '#FFFFFF' } },
  { test: n => n.includes('free money') || n.startsWith('free '),                     badge: { initial: 'F', bg: '#00A99D', fg: '#FFFFFF' } },
  { test: n => n.includes('tigo'),                                                    badge: { initial: 'T', bg: '#005CAB', fg: '#FFFFFF' } },
  { test: n => n.includes('celtiis'),                                                 badge: { initial: 'C', bg: '#6B21A8', fg: '#FFFFFF' } },
  { test: n => n.includes('t-money') || n.includes('mixx') || n.includes('togocel'),  badge: { initial: 'T', bg: '#FF6B00', fg: '#FFFFFF' } },
  { test: n => n.includes('zamani'),                                                  badge: { initial: 'Z', bg: '#1F2937', fg: '#FFFFFF' } },
  { test: n => n.includes('expresso'),                                                badge: { initial: 'E', bg: '#7C3AED', fg: '#FFFFFF' } },
  { test: n => n.includes('wizall'),                                                  badge: { initial: 'W', bg: '#16A34A', fg: '#FFFFFF' } },
  { test: n => n.includes('e-money') || n.includes('emoney'),                         badge: { initial: 'E', bg: '#0EA5E9', fg: '#FFFFFF' } },
  { test: n => n.includes('djamo'),                                                   badge: { initial: 'D', bg: '#7C3AED', fg: '#FFFFFF' } },
  { test: n => n.includes('halotel'),                                                 badge: { initial: 'H', bg: '#15803D', fg: '#FFFFFF' } },
  { test: n => n.includes('zamtel'),                                                  badge: { initial: 'Z', bg: '#15803D', fg: '#FFFFFF' } },
  { test: n => n.includes('movitel'),                                                 badge: { initial: 'M', bg: '#7C3AED', fg: '#FFFFFF' } },
  { test: n => n.includes('onatel'),                                                  badge: { initial: 'O', bg: '#005FAB', fg: '#FFFFFF' } },
  { test: n => n.includes('tnm'),                                                     badge: { initial: 'T', bg: '#15803D', fg: '#FFFFFF' } },
  // Card + bank rails — fold under a generic CB / Bank tile.
  { test: n => n.includes('carte bancaire') || n.includes('card'),                    badge: { initial: 'CB', bg: '#1E293B', fg: '#FFFFFF' } },
  { test: n => n.includes('bank') || n.includes('virement') || n.includes('eft'),     badge: { initial: '🏦', bg: '#0F172A', fg: '#FFFFFF' } },
  { test: n => n.includes('crypto') || n.includes('btc'),                             badge: { initial: '₿', bg: '#F59E0B', fg: '#FFFFFF' } },
  { test: n => n.includes('ussd'),                                                    badge: { initial: '#', bg: '#475569', fg: '#FFFFFF' } },
  { test: n => n.includes('qr'),                                                      badge: { initial: 'QR', bg: '#475569', fg: '#FFFFFF' } },
]

export function operatorBadge(name: string): OperatorBadge {
  const lower = (name || '').toLowerCase()
  for (const rule of RULES) {
    if (rule.test(lower)) return rule.badge
  }
  const trimmed = (name || '').trim()
  if (trimmed === '') return NEUTRAL_BADGE
  return {
    initial: trimmed.charAt(0).toUpperCase(),
    bg: '#E5E7EB',
    fg: '#374151',
  }
}
