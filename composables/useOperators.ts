export interface BackendOperator {
  code: string
  name: string
  country: string
  country_name: string
  currency: string
  available_aggregators: string[]
}

export interface BackendCountry {
  code: string
  name: string
}

interface OperatorsCatalog {
  operators: BackendOperator[]
  countries: BackendCountry[]
  currencies: string[]
}

interface CatalogResponse {
  success: boolean
  data: OperatorsCatalog
}

/**
 * Operator catalog from the backend (config/operators.php).
 * Single source of truth — frontend never hard-codes operator codes anymore.
 */
export const useOperators = () => {
  const state = useState<OperatorsCatalog>('operators-catalog', () => ({
    operators: [],
    countries: [],
    currencies: [],
  }))
  const loading = useState<boolean>('operators-catalog-loading', () => false)
  const loaded = useState<boolean>('operators-catalog-loaded', () => false)

  const { apiFetch } = useApi()

  const load = async (force = false): Promise<OperatorsCatalog> => {
    if (loaded.value && !force) return state.value
    if (loading.value) {
      // wait for in-flight call to finish
      while (loading.value) await new Promise(r => setTimeout(r, 50))
      return state.value
    }
    loading.value = true
    try {
      const res = await apiFetch<CatalogResponse>('/merchant/operators')
      if (res?.data) {
        state.value = res.data
        loaded.value = true
      }
    } catch {
      // Keep previous state on failure (likely empty arrays)
    } finally {
      loading.value = false
    }
    return state.value
  }

  const findOperator = (code: string): BackendOperator | undefined => {
    return state.value.operators.find(o => o.code === code)
  }

  const operatorsByCountry = (countryCode: string | null | undefined) => {
    if (!countryCode) return state.value.operators
    return state.value.operators.filter(o => o.country === countryCode)
  }

  return {
    catalog: state,
    loading,
    loaded,
    load,
    findOperator,
    operatorsByCountry,
  }
}
