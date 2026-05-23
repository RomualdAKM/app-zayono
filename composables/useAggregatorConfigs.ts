export interface SupportedMethodInfo {
  code: string
  name: string
  country: string
  currency: string
}

export interface AvailableAggregator {
  code: string
  name: string
  description: string | null
  description_long: string | null
  logo: string | null
  website_url: string | null
  capabilities: string[]
  supported_countries: string[]
  supported_currencies: string[]
  supported_methods: SupportedMethodInfo[]
  required_fields: string[]
  // Optional credential fields (eg. FedaPay webhook_signing_secret, iPay
  // webhook_secret_hash). The merchant can leave them blank; signature
  // verification stays in fallback "accept-then-revalidate" mode until set.
  optional_fields?: string[]
  configured: boolean
  configured_environments: string[]
  configured_in_active_env: boolean
}

export interface AggregatorEnvironment {
  id: string
  environment: 'sandbox' | 'live'
  is_active: boolean
  credentials: Record<string, string>
  configured_at: string | null
  updated_at: string | null
  webhook_url?: string
  webhook_secret_masked?: string | null
  // True when Zayono successfully POSTed the URL on the aggregator
  // dashboard (FedaPay). UI still shows the manual URL/secret box so
  // the merchant can configure another endpoint themselves if needed.
  webhook_auto_registered?: boolean
}

export interface AggregatorConfigGroup {
  aggregator_code: string
  environments: AggregatorEnvironment[]
}

/**
 * @param purpose Optional filter. When set, the catalogue and configs lists
 * are restricted to aggregators whose driver supports that purpose.
 */
export const useAggregatorConfigs = (purpose?: 'payment' | 'payout') => {
  const { apiFetch } = useApi()
  const qs = purpose ? `?purpose=${purpose}` : ''

  const getAvailable = () =>
    apiFetch<{ data: AvailableAggregator[] }>(`/merchant/aggregators/available${qs}`)

  const getConfigs = () =>
    apiFetch<{ data: AggregatorConfigGroup[] }>(`/merchant/aggregator-configs${qs}`)

  const getConfig = (code: string) =>
    apiFetch<{ data: AggregatorConfigGroup }>(`/merchant/aggregator-configs/${code}`)

  // `environment` is now resolved by the X-Zayono-Environment header
  // sent automatically by useApi — the frontend never asks the user for it.
  const saveConfig = (data: {
    aggregator_code: string
    credentials: Record<string, string>
    is_active?: boolean
  }) =>
    apiFetch('/merchant/aggregator-configs', { method: 'POST', body: data })

  const deleteConfig = (code: string) =>
    apiFetch(`/merchant/aggregator-configs/${code}`, { method: 'DELETE' })

  const testConfig = (code: string) =>
    apiFetch(`/merchant/aggregator-configs/${code}/test`, { method: 'POST' })

  // Rotate the inbound webhook token + secret for the active environment.
  // The clear-text secret is returned once and must be surfaced immediately.
  const regenerateWebhook = (code: string) =>
    apiFetch<{ data: { webhook_url: string; webhook_secret: string } }>(
      `/merchant/aggregator-configs/${code}/regenerate-webhook`,
      { method: 'POST' }
    )

  // Dry-run: probe the aggregator with the supplied credentials WITHOUT
  // persisting. Lets the merchant click "Tester" before "Connecter".
  const verifyCredentials = (data: {
    aggregator_code: string
    credentials: Record<string, string>
  }) =>
    apiFetch<{ data: { valid: boolean; aggregator_code: string; environment: string } }>(
      '/merchant/aggregator-configs/verify',
      { method: 'POST', body: data }
    )

  return { getAvailable, getConfigs, getConfig, saveConfig, deleteConfig, testConfig, regenerateWebhook, verifyCredentials }
}
