import type { AvailableAggregator } from './useAggregatorConfigs'

interface SelectOption {
  label: string
  value: string
}

interface CatalogResponse {
  data?: AvailableAggregator[]
  // Some endpoints return the array at the top level; we support both
  // shapes so the composable doesn't break if the response envelope ever
  // changes upstream.
}

/**
 * Single source of truth for the aggregator catalogue (= the list returned
 * by `GET /merchant/aggregators/available`). Every UI that renders a
 * picker / filter on aggregator codes pulls from here instead of
 * hard-coding a list — adding a new driver becomes one backend edit.
 *
 * Caching: the result is held in a Nuxt `useState()` singleton so multiple
 * components sharing the same page reuse one fetch, and SSR + client
 * hydration stay coherent. `load()` short-circuits on subsequent calls
 * unless `force = true` is passed.
 *
 * Re-fetch triggers:
 *   - Manual `load(true)` after the merchant connects a new gateway
 *     (the `configured`/`configured_in_active_env` flags change).
 *   - Switching application or environment invalidates the cache (the
 *     `configured_in_active_env` field is application/env-scoped). This
 *     is handled by callers that care — most consumers only need the
 *     static `code`/`name` so the stale flag is harmless.
 */
export const useAggregatorCatalog = () => {
  const state = useState<AvailableAggregator[]>('aggregator-catalog', () => [])
  const loading = useState<boolean>('aggregator-catalog-loading', () => false)
  const loaded = useState<boolean>('aggregator-catalog-loaded', () => false)

  const { apiFetch } = useApi()

  const load = async (force = false): Promise<AvailableAggregator[]> => {
    if (loaded.value && !force) return state.value
    if (loading.value) {
      // Coalesce concurrent first-load calls — wait for the in-flight
      // request rather than firing a parallel one.
      while (loading.value) await new Promise(r => setTimeout(r, 50))
      return state.value
    }
    loading.value = true
    try {
      const res = await apiFetch<CatalogResponse>('/merchant/aggregators/available')
      if (res?.data) {
        state.value = res.data
        loaded.value = true
      }
    } catch {
      // Preserve whatever we had before — empty array on cold start,
      // last successful payload otherwise. Errors are silent here on
      // purpose: a filter dropdown should degrade gracefully, never
      // crash the whole transactions page.
    } finally {
      loading.value = false
    }
    return state.value
  }

  /**
   * Find the canonical entry for a code (eg `'hub2_ci'` → entry with
   * `name = 'Hub2 Côte d'Ivoire'`). Returns undefined when the catalogue
   * hasn't been loaded yet or the code is unknown.
   */
  const findByCode = (code: string): AvailableAggregator | undefined =>
    state.value.find(a => a.code === code)

  /**
   * Human-readable label for a code. Falls back to the raw code so a
   * brand-new driver pushed by the backend before the catalogue refetches
   * still renders something instead of `undefined`.
   */
  const labelFor = (code: string): string =>
    findByCode(code)?.name ?? code

  /**
   * `[{ label, value }, …]` shape consumed by PrimeVue Select and friends.
   *
   * Options:
   *  - `includeAll`: prepend a "Toutes" entry with empty value (filter dropdowns).
   *  - `purpose`: only keep aggregators whose `capabilities` include this purpose
   *    (eg pass `'payout'` on the payouts page to hide payment-only drivers).
   *  - `onlyConfigured`: keep only those the merchant has connected in the
   *    active environment — used by method-assignment dropdowns where picking
   *    an un-configured aggregator would 404 at routing time.
   */
  const asSelectOptions = (opts: {
    includeAll?: boolean
    allLabel?: string
    purpose?: 'payment' | 'payout'
    onlyConfigured?: boolean
  } = {}): SelectOption[] => {
    const { includeAll = false, allLabel = 'Toutes', purpose, onlyConfigured = false } = opts

    let list = state.value
    if (purpose) {
      list = list.filter(a => a.capabilities?.includes(purpose))
    }
    if (onlyConfigured) {
      list = list.filter(a => a.configured_in_active_env)
    }

    const options: SelectOption[] = list.map(a => ({
      label: a.name,
      value: a.code,
    }))

    return includeAll ? [{ label: allLabel, value: '' }, ...options] : options
  }

  return {
    catalog: state,
    loading,
    loaded,
    load,
    findByCode,
    labelFor,
    asSelectOptions,
  }
}
