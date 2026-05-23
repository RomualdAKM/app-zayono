import { defineStore } from 'pinia'

interface MerchantStats {
  total_payments: number
  total_payouts: number
  customers_count: number
  revenue: number
  currency: string
  success_rate: number
}

interface MerchantState {
  stats: MerchantStats | null
  environment: 'sandbox' | 'live'
  loading: boolean
  error: string | null
}

export const useMerchantStore = defineStore('merchant', {
  state: (): MerchantState => ({
    stats: null,
    environment: 'sandbox',
    loading: false,
    error: null,
  }),

  actions: {
    toggleEnvironment() {
      this.environment = this.environment === 'sandbox' ? 'live' : 'sandbox'
    },

    async fetchStats() {
      this.loading = true
      this.error = null
      try {
        // useApi attaches the active application + environment headers so
        // /merchant/stats is correctly scoped after the multi-app refactor.
        const { apiFetch } = useApi()
        const res = await apiFetch<{ success: boolean; data: MerchantStats }>('/merchant/stats')
        this.stats = res.data
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || 'Impossible de charger les statistiques'
        this.stats = null
      } finally {
        this.loading = false
      }
    },
  },
})
