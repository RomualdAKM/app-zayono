import { defineStore } from 'pinia'

interface AdminMerchant {
  id: string
  name: string
  email: string
  company_name: string
  phone: string | null
  country: string | null
  is_active: boolean
  email_verified_at: string | null
  zayono_fee_percent: string
  transactions_count: number
  created_at: string
}

interface AdminTransaction {
  id: string
  merchant_id: string
  amount: string
  currency: string
  status: string
  operator: string | null
  aggregator_code: string | null
  type: string
  environment: string
  created_at: string
  merchant?: { id: string; name: string; company_name: string }
}

interface AggregatorInfo {
  code: string
  name: string
  total_transactions: number
  successful_transactions: number
  success_rate: number
  total_volume: number
  last_activity: string | null
  status: string
}

interface DashboardData {
  merchants: { total: number; active: number; new_today: number }
  transactions: { today: number; week: number; month: number }
  volume: { today: number }
  revenue: { today: number; week: number; month: number }
  active_aggregators: number
  recent_transactions: AdminTransaction[]
  recent_merchants: AdminMerchant[]
}

interface AuditLogEntry {
  id: string
  merchant_id: string | null
  application_id: string | null
  action: string
  model_type: string
  model_id: string | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  ip_address: string | null
  created_at: string
  merchant?: { id: string; name: string; email: string } | null
  application?: { id: string; name: string; merchant_id: string } | null
}

interface AdminState {
  dashboard: DashboardData | null
  merchants: AdminMerchant[]
  merchantsPagination: { current_page: number; last_page: number; total: number }
  transactions: AdminTransaction[]
  transactionsPagination: { current_page: number; last_page: number; total: number }
  aggregators: AggregatorInfo[]
  auditLogs: AuditLogEntry[]
  auditLogsPagination: { current_page: number; last_page: number; total: number }
  loading: boolean
  error: string | null
}

export const useAdminStore = defineStore('admin', {
  state: (): AdminState => ({
    dashboard: null,
    merchants: [],
    merchantsPagination: { current_page: 1, last_page: 1, total: 0 },
    transactions: [],
    transactionsPagination: { current_page: 1, last_page: 1, total: 0 },
    aggregators: [],
    auditLogs: [],
    auditLogsPagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
    error: null,
  }),

  actions: {
    async fetchDashboard() {
      this.loading = true
      this.error = null
      try {
        const { fetchDashboard } = useAdmin()
        const res = await fetchDashboard()
        this.dashboard = res.data
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || 'Impossible de charger le tableau de bord'
        this.dashboard = null
      } finally {
        this.loading = false
      }
    },

    async fetchMerchants(params?: Record<string, any>) {
      this.loading = true
      this.error = null
      try {
        const { fetchMerchants } = useAdmin()
        const res = await fetchMerchants(params)
        this.merchants = res.data.data
        this.merchantsPagination = { current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total }
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || 'Impossible de charger les marchands'
        this.merchants = []
        this.merchantsPagination = { current_page: 1, last_page: 1, total: 0 }
      } finally {
        this.loading = false
      }
    },

    async fetchTransactions(params?: Record<string, any>) {
      this.loading = true
      this.error = null
      try {
        const { fetchTransactions } = useAdmin()
        const res = await fetchTransactions(params)
        this.transactions = res.data.data
        this.transactionsPagination = { current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total }
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || 'Impossible de charger les transactions'
        this.transactions = []
        this.transactionsPagination = { current_page: 1, last_page: 1, total: 0 }
      } finally {
        this.loading = false
      }
    },

    async fetchAggregators() {
      this.loading = true
      this.error = null
      try {
        const { fetchAggregators } = useAdmin()
        const res = await fetchAggregators()
        this.aggregators = res.data
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || 'Impossible de charger les agrégateurs'
        this.aggregators = []
      } finally {
        this.loading = false
      }
    },

    async fetchAuditLogs(params?: Record<string, any>) {
      this.loading = true
      this.error = null
      try {
        const { fetchAuditLogs } = useAdmin()
        const res = await fetchAuditLogs(params)
        this.auditLogs = res.data.data
        this.auditLogsPagination = { current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total }
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || 'Impossible de charger les logs'
        this.auditLogs = []
        this.auditLogsPagination = { current_page: 1, last_page: 1, total: 0 }
      } finally {
        this.loading = false
      }
    },

    async updateMerchant(id: string, data: Record<string, any>) {
      this.error = null
      try {
        const { updateMerchant } = useAdmin()
        await updateMerchant(id, data)
        const idx = this.merchants.findIndex(m => m.id === id)
        if (idx >= 0) {
          this.merchants[idx] = { ...this.merchants[idx], ...data }
        }
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || 'Impossible de mettre à jour le marchand'
        throw e
      }
    },

    async suspendMerchant(id: string) {
      this.error = null
      try {
        const { suspendMerchant } = useAdmin()
        await suspendMerchant(id)
        const idx = this.merchants.findIndex(m => m.id === id)
        if (idx >= 0) {
          this.merchants[idx].is_active = false
        }
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || 'Impossible de suspendre le marchand'
        throw e
      }
    },

    async activateMerchant(id: string) {
      this.error = null
      try {
        const { activateMerchant } = useAdmin()
        await activateMerchant(id)
        const idx = this.merchants.findIndex(m => m.id === id)
        if (idx >= 0) {
          this.merchants[idx].is_active = true
        }
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || 'Impossible d\'activer le marchand'
        throw e
      }
    },
  },
})
