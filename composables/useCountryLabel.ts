/**
 * ISO-2 → localized country name + emoji flag.
 *
 * Country names use the platform `Intl.DisplayNames` API, so we get
 * localized names for every ISO 3166-1 code in any locale without
 * shipping a translation table. The active locale is read from Nuxt's
 * `useNuxtApp().$i18n` when no locale is passed, so existing callsites
 * (`countryLabel(code)`) localize automatically on language switch
 * without needing to thread `locale` through every prop.
 *
 * Emoji flags use Unicode regional indicator symbols (U+1F1E6..U+1F1FF):
 * generated client-side, no CDN dependency, native rendering on every
 * modern OS.
 *
 * `XX` is the sentinel for "international / no specific country" used
 * by Stripe etc. — handled explicitly so we don't fall back to an empty
 * flag.
 */

/**
 * Return e.g. "🇨🇲 Cameroun" (FR) or "🇨🇲 Cameroon" (EN). Falls back to
 * the raw ISO code when the platform can't resolve it (private-use
 * codes, runtime without `Intl.DisplayNames`).
 *
 * `locale` is optional — when omitted, the current i18n locale is read
 * from the Nuxt app instance. Pass it explicitly only when you need to
 * force a specific language.
 */
export function countryLabel(code: string, locale?: string): string {
  const upper = code.toUpperCase()
  const effective = locale ?? activeLocale()
  if (upper === 'XX') return 'International'

  const name = countryNameFor(upper, effective)
  const flag = isoToFlagEmoji(upper)
  return flag ? `${flag} ${name}` : name
}

/** Just the emoji flag, useful when the caller renders the name separately. */
export function countryFlag(code: string): string {
  return isoToFlagEmoji(code.toUpperCase())
}

/** Just the localized name (no flag). */
export function countryName(code: string, locale?: string): string {
  const upper = code.toUpperCase()
  if (upper === 'XX') return 'International'
  return countryNameFor(upper, locale ?? activeLocale())
}

function isoToFlagEmoji(code: string): string {
  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return ''
  const A = 0x1F1E6
  const base = 0x41 // 'A'
  return String.fromCodePoint(A + (code.charCodeAt(0) - base), A + (code.charCodeAt(1) - base))
}

/**
 * Read the active i18n locale from the Nuxt app. Guarded with try/catch
 * because the function may be called from contexts where `useNuxtApp`
 * isn't available (unit tests, SSR pre-mount, etc.).
 */
function activeLocale(): string {
  try {
    const app = useNuxtApp()
    const i18n: any = (app as any).$i18n
    const loc = i18n?.locale
    // `$i18n.locale` is a ref — `.value` gives the current string.
    if (loc && typeof loc === 'object' && 'value' in loc) return String(loc.value)
    if (typeof loc === 'string') return loc
  } catch {
    /* not in a Nuxt context — fall through */
  }
  return 'fr'
}

/**
 * `Intl.DisplayNames` ships in every modern browser + Node 16+; we
 * cache instances per locale so repeated lookups (the modal lists 11+
 * countries) don't pay the constructor cost each time.
 */
const _displayNamesCache: Record<string, Intl.DisplayNames | null> = {}

function getDisplayNames(locale: string): Intl.DisplayNames | null {
  if (locale in _displayNamesCache) return _displayNamesCache[locale]
  try {
    _displayNamesCache[locale] = new Intl.DisplayNames([locale], { type: 'region' })
  } catch {
    _displayNamesCache[locale] = null
  }
  return _displayNamesCache[locale]
}

function countryNameFor(upper: string, locale: string): string {
  const dn = getDisplayNames(locale)
  if (!dn) return upper
  try {
    return dn.of(upper) || upper
  } catch {
    return upper
  }
}
