export const useAuth = () => {
  const store = useAuthStore()

  const login = async (email: string, password: string) => {
    return store.login(email, password)
  }

  const register = async (data: {
    name: string
    email: string
    password: string
    password_confirmation: string
    // Optional at signup — collected later from account settings.
    company_name?: string
    phone?: string
    country?: string
    terms_accepted: boolean
  }) => {
    return store.register(data)
  }

  const logout = () => store.logout()

  // ─── Public (unauthenticated) auth flows ─────────────────────────────
  const apiBase = () => useRuntimeConfig().public.apiBase

  const forgotPassword = (email: string) =>
    $fetch('/auth/forgot-password', {
      baseURL: apiBase(),
      method: 'POST',
      body: { email },
    })

  const resetPassword = (payload: {
    token: string
    email: string
    password: string
    password_confirmation: string
  }) =>
    $fetch('/auth/reset-password', {
      baseURL: apiBase(),
      method: 'POST',
      body: payload,
    })

  // Resend the email-verification link. Requires an authenticated session
  // (a freshly-registered merchant has a token), so we send the bearer.
  const resendVerification = () =>
    $fetch('/auth/email/resend', {
      baseURL: apiBase(),
      method: 'POST',
      headers: store.token ? { Authorization: `Bearer ${store.token}` } : undefined,
    })

  // Re-fetch the profile from /auth/me — used after a successful email
  // verification so `email_verified` flips true and the gate opens.
  const refreshUser = () => store.fetchProfile()

  const isAuthenticated = computed(() => store.isAuthenticated)
  const merchant = computed(() => store.merchant)
  const emailVerified = computed(() => store.merchant?.email_verified === true)
  const loading = computed(() => store.loading)

  return {
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    resendVerification,
    refreshUser,
    isAuthenticated,
    merchant,
    emailVerified,
    loading,
  }
}
