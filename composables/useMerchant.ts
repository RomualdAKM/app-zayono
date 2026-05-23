export const useMerchant = () => {
  const store = useMerchantStore()
  const { locale } = useI18n()

  const stats = computed(() => store.stats)
  const environment = computed(() => store.environment)
  const loading = computed(() => store.loading)

  const fetchStats = () => store.fetchStats()
  const toggleEnvironment = () => store.toggleEnvironment()

  const formatCurrency = (amount: number, currency: string = 'XOF') => {
    const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
    return new Intl.NumberFormat(localeStr, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return {
    stats,
    environment,
    loading,
    fetchStats,
    toggleEnvironment,
    formatCurrency,
  }
}
