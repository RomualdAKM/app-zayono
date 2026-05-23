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
  }) => {
    return store.register(data)
  }

  const logout = () => store.logout()

  const isAuthenticated = computed(() => store.isAuthenticated)
  const merchant = computed(() => store.merchant)
  const loading = computed(() => store.loading)

  return {
    login,
    register,
    logout,
    isAuthenticated,
    merchant,
    loading,
  }
}
