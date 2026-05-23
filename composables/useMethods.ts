export type MethodPurpose = 'payment' | 'payout'

export interface MerchantMethod {
  id: string
  environment: 'sandbox' | 'live'
  country: string
  operator: string
  operator_name: string
  currency: string | null
  aggregator_code: string
  fallback_aggregator: string | null
  fee_percent: number | null
  purpose: MethodPurpose
  priority: number
  is_active: boolean
  available_aggregators: string[]
}

/**
 * Wraps the /merchant/methods endpoints. A method is an automatically created
 * routing rule per operator; the merchant only ever toggles them on/off and
 * picks a primary/fallback aggregator.
 */
export const useMethods = (purpose: MethodPurpose) => {
  const { apiFetch } = useApi()

  const list = () =>
    apiFetch<{ data: MerchantMethod[] }>(`/merchant/methods?purpose=${purpose}`)

  const update = (id: string, body: Partial<{
    aggregator_code: string
    fallback_aggregator: string | null
    fee_percent: number | null
    is_active: boolean
  }>) =>
    apiFetch<{ data: MerchantMethod }>(`/merchant/methods/${id}`, {
      method: 'PUT',
      body,
    })

  const toggle = (id: string) =>
    apiFetch<{ data: { id: string; is_active: boolean } }>(`/merchant/methods/${id}/toggle`, {
      method: 'POST',
    })

  return { list, update, toggle }
}
