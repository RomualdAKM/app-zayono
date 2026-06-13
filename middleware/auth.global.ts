export default defineNuxtRouteMiddleware(async (to) => {
  // Auth is localStorage-based — skip on server
  if (import.meta.server) return

  const auth = useAuthStore()
  const appStore = useApplicationStore()

  // Public routes — no auth required
  const publicPrefixes = ['/auth', '/checkout', '/status', '/billing/invoices/']
  if (publicPrefixes.some(prefix => to.path.startsWith(prefix))) {
    // If already authenticated, redirect away from auth pages — EXCEPT the
    // verify-email page, which an authenticated-but-unverified merchant must
    // be able to reach (it's where the verification gate sends them, and
    // where the email link lands). Bouncing them to /dashboard would loop
    // against the email-verification gate below.
    if (auth.isAuthenticated && to.path.startsWith('/auth') && to.path !== '/auth/verify-email') {
      return navigateTo('/dashboard')
    }
    return
  }

  // Protected routes — must be authenticated
  if (!auth.isAuthenticated) {
    return navigateTo('/auth/login')
  }

  // BUG FIX 2026-05-22 — when the user reloads a page or enters a
  // URL manually, Pinia re-initialises with `isAuthenticated` derived
  // from the localStorage token (true) but `merchant` is null. The
  // middleware MUST await `init()` to hydrate the profile before
  // deciding whether to bounce to /apps — otherwise the next check
  // (`appStore.currentId`) operates on an empty store.
  if (auth.isAuthenticated && !auth.merchant) {
    await auth.init()
    // If init() failed (expired token), isAuthenticated flips false.
    if (!auth.isAuthenticated) {
      return navigateTo('/auth/login')
    }
  }

  // Email-verification gate — a merchant must verify their email before
  // reaching ANY protected route. `email_verified` comes from /auth/me
  // (hydrated by init() just above) and from the login/register payloads.
  // We gate on an explicit `=== false` so a payload that somehow omits the
  // field fails open (the API still independently gates live mode), never
  // locking a user out on a missing flag. The verify-email page itself is
  // under /auth (handled above), so there's no redirect loop.
  if (auth.merchant && auth.merchant.email_verified === false) {
    return navigateTo('/auth/verify-email')
  }

  // Application-scoped routes — must have an active app selected.
  // The /apps space is exempt because it's how the user picks (or creates)
  // their first app. Admin routes don't depend on a per-app context.
  const appExempt = ['/apps', '/admin']
  if (appExempt.some(prefix => to.path.startsWith(prefix))) {
    return
  }

  if (!appStore.currentId) {
    return navigateTo('/apps')
  }
})
