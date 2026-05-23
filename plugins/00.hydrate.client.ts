/**
 * Client-side state hydration plugin.
 *
 * Pinia stores are initialised during SSR where `localStorage` is not
 * available, so `auth.token` / `environment.current` / `application.currentId`
 * come up empty on the server and that empty state is hydrated to the
 * client. Pinia does NOT re-run state factories after hydration, so without
 * this plugin:
 *
 *   - the auth middleware sees `isAuthenticated: false` and redirects to
 *     /auth/login on every hard reload, even when the token is valid
 *   - the environment toggle "loses" its setting because Pinia keeps the
 *     SSR-initialised `'sandbox'` even when `localStorage` says `'live'`
 *   - the application store's `currentId` is empty so the auth middleware
 *     bounces the user to /apps even though they have apps configured
 *
 * Numbered prefix (`00.`) ensures this runs before any other client plugin.
 */
export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return

  const auth = useAuthStore()
  const env = useEnvironmentStore()
  const appStore = useApplicationStore()

  // ─── Re-read persisted auth ──────────────────────────
  const token = window.localStorage.getItem('auth_token')
  if (token && !auth.token) {
    auth.token = token
    // Optimistic — pass the route guard immediately. Real validation
    // happens below; on 401, fetchProfile clears the token + isAuthenticated.
    auth.isAuthenticated = true
    // Validate async — don't block app boot. If the token is stale,
    // fetchProfile will clear it and subsequent navigation will redirect.
    auth.fetchProfile().then(() => {
      // Refresh the applications list now that we know the token is valid.
      // This is what catches "the app you had selected got deleted" and
      // "you signed in as a different merchant since last visit" — the
      // store rejects any cached currentId that doesn't match the owned list.
      if (auth.isAuthenticated) {
        appStore.fetch().catch(() => {})
      }
    }).catch(() => {})
  } else if (auth.token) {
    // Token was already in memory (rare path — e.g. another plugin already
    // set it). Still re-fetch the apps to catch the same staleness cases.
    appStore.fetch().catch(() => {})
  }

  // ─── Re-read persisted environment ───────────────────
  const persistedEnv = window.localStorage.getItem('zayono_environment')
  if (persistedEnv === 'live' || persistedEnv === 'sandbox') {
    env.current = persistedEnv
  }

  // ─── Re-read persisted application id ────────────────
  // The store reads it from localStorage in its initial state, but only
  // on the client — SSR clears it. Re-hydrate explicitly.
  const persistedAppId = window.localStorage.getItem('zayono_application_id')
  if (persistedAppId && !appStore.currentId) {
    appStore.currentId = persistedAppId
  }
})
