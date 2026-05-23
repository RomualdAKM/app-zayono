export const useApi = () => {
  const config = useRuntimeConfig()
  const auth = useAuthStore()
  const envStore = useEnvironmentStore()
  const appStore = useApplicationStore()

  const apiFetch = <T = any>(url: string, options: any = {}): Promise<T> => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Zayono-Environment': envStore.current,
      ...(options.headers || {}),
    }
    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`
    }
    // Every app-scoped endpoint expects the active application id. Set it
    // unconditionally when one is selected — endpoints that don't need it
    // (/auth/*, /merchant/applications) ignore the header.
    if (appStore.currentId && !headers['X-Zayono-Application']) {
      headers['X-Zayono-Application'] = appStore.currentId
    }
    return $fetch<T>(url, {
      baseURL: config.public.apiBase,
      ...options,
      headers,
    })
  }

  return { apiFetch }
}
