export const useAdmin = () => {
  const { apiFetch } = useApi()
  const prefix = '/admin'

  const fetchDashboard = () => apiFetch(`${prefix}/dashboard`)
  const fetchMerchants = (params?: Record<string, any>) => apiFetch(`${prefix}/merchants`, { params })
  const fetchMerchant = (id: string) => apiFetch(`${prefix}/merchants/${id}`)
  const updateMerchant = (id: string, data: Record<string, any>) => apiFetch(`${prefix}/merchants/${id}`, { method: 'PUT', body: data })
  const suspendMerchant = (id: string) => apiFetch(`${prefix}/merchants/${id}/suspend`, { method: 'POST' })
  const activateMerchant = (id: string) => apiFetch(`${prefix}/merchants/${id}/activate`, { method: 'POST' })
  // Live-mode toggle. New accounts are auto-approved for live at signup;
  // these let an admin revoke (compliance) or restore live for a merchant.
  const approveLiveMerchant = (id: string) => apiFetch(`${prefix}/merchants/${id}/approve-live`, { method: 'POST' })
  const revokeLiveMerchant = (id: string) => apiFetch(`${prefix}/merchants/${id}/revoke-live`, { method: 'POST' })
  const fetchMerchantStats = (params?: Record<string, any>) => apiFetch(`${prefix}/merchants/statistics`, { params })

  const fetchTransactions = (params?: Record<string, any>) => apiFetch(`${prefix}/transactions`, { params })
  const fetchTransaction = (id: string) => apiFetch(`${prefix}/transactions/${id}`)
  const fetchTransactionStats = (params?: Record<string, any>) => apiFetch(`${prefix}/transactions/statistics`, { params })

  const fetchAggregators = () => apiFetch(`${prefix}/aggregators`)
  const fetchAggregator = (code: string) => apiFetch(`${prefix}/aggregators/${code}`)
  const fetchAggregatorsHealth = () => apiFetch(`${prefix}/aggregators/health`)

  const fetchAuditLogs = (params?: Record<string, any>) => apiFetch(`${prefix}/audit-logs`, { params })
  const fetchAuditLog = (id: string) => apiFetch(`${prefix}/audit-logs/${id}`)

  const fetchExchangeRates = (params?: Record<string, any>) => apiFetch(`${prefix}/exchange-rates`, { params })
  const updateExchangeRate = (id: string, data: Record<string, any>) => apiFetch(`${prefix}/exchange-rates/${id}`, { method: 'PUT', body: data })
  const createExchangeRate = (data: Record<string, any>) => apiFetch(`${prefix}/exchange-rates`, { method: 'POST', body: data })
  const bulkUpdateRates = (rates: Array<{ id: string; rate: number }>) => apiFetch(`${prefix}/exchange-rates/bulk-update`, { method: 'POST', body: { rates } })

  return {
    fetchDashboard,
    fetchMerchants,
    fetchMerchant,
    updateMerchant,
    suspendMerchant,
    activateMerchant,
    approveLiveMerchant,
    revokeLiveMerchant,
    fetchMerchantStats,
    fetchTransactions,
    fetchTransaction,
    fetchTransactionStats,
    fetchAggregators,
    fetchAggregator,
    fetchAggregatorsHealth,
    fetchAuditLogs,
    fetchAuditLog,
    fetchExchangeRates,
    updateExchangeRate,
    createExchangeRate,
    bulkUpdateRates,
  }
}
