export default defineNuxtRouteMiddleware(async (to) => {
  // Auth is localStorage-based — skip on server
  if (import.meta.server) return

  const auth = useAuthStore()
  const appStore = useApplicationStore()

  // Public routes — no auth required
  const publicPrefixes = ['/auth', '/checkout', '/status', '/billing/invoices/']
  if (publicPrefixes.some(prefix => to.path.startsWith(prefix))) {
    // If already authenticated, redirect away from auth pages
    if (auth.isAuthenticated && to.path.startsWith('/auth')) {
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
