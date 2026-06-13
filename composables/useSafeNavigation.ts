/**
 * Safe navigation to merchant-controlled URLs (return_url / cancel_url).
 *
 * A hostile or careless merchant can store `javascript:fetch(...)` as their
 * return_url: the backend Laravel `|url` validator accepts `javascript:`
 * URLs, so we MUST re-validate the protocol client-side before assigning to
 * `window.location.href`, otherwise it executes in the customer's context on
 * the success/cancel screen.
 *
 * Shared by the main checkout ([token].vue) and the KKiaPay flow so the
 * guard can never drift between the two entry points.
 */
export function useSafeNavigation() {
  function navigateSafely(url: string | null | undefined): boolean {
    if (!url) return false
    try {
      const u = new URL(url)
      if (!['http:', 'https:'].includes(u.protocol)) return false
      window.location.href = u.href
      return true
    } catch {
      return false
    }
  }

  return { navigateSafely }
}
