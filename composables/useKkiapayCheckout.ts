/**
 * KKiaPay-hosted widget composable.
 *
 * KKiaPay has no server-side collect API — payments go through their JS
 * widget loaded from `cdn.kkiapay.me/k.js`. This composable handles:
 *  - Loading the widget script once (idempotent across navigations).
 *  - Fetching the transaction context (amount/currency/country/public_key)
 *    from Zayono's bridge endpoint.
 *  - Opening the widget with the right params.
 *  - Wiring success/failure listeners and confirming with Zayono.
 */

interface KkiapayContext {
  transaction_id: string
  amount: number
  currency: string
  country: string | null
  phone: string | null
  customer: { name: string | null; email: string | null }
  merchant: { name: string; logo_url: string | null }
  kkiapay: {
    public_key: string
    sandbox: boolean
    countries: string[]
    payment_methods: string[]
  }
  status: 'initiated' | 'pending' | 'success' | 'failed' | 'cancelled'
  return_url: string | null
}

interface ConfirmResponse {
  status: string
  aggregator_status?: string | null
  failure_reason?: string | null
  return_url: string | null
}

interface ApiResponse<T> {
  message: string
  data: T
  errors: unknown
}

const KKIAPAY_SCRIPT_URL = 'https://cdn.kkiapay.me/k.js'

declare global {
  interface Window {
    openKkiapayWidget?: (params: Record<string, unknown>) => void
    addSuccessListener?: (cb: (response: { transactionId: string; [k: string]: unknown }) => void) => void
    addFailedListener?: (cb: (error: { code?: string; message?: string; [k: string]: unknown }) => void) => void
    addKkiapayCloseListener?: (cb: () => void) => void
  }
}

export const useKkiapayCheckout = () => {
  const config = useRuntimeConfig()
  const base = (config.public.apiBase as string).replace(/\/$/, '')

  const getContext = (transactionId: string) =>
    $fetch<ApiResponse<KkiapayContext>>(`${base}/checkout/kkiapay/${transactionId}`, {
      headers: { Accept: 'application/json' },
    })

  const confirm = (transactionId: string, aggregatorTransactionId: string, succeeded: boolean) =>
    $fetch<ApiResponse<ConfirmResponse>>(`${base}/checkout/kkiapay/${transactionId}/confirm`, {
      method: 'POST',
      body: {
        aggregator_transaction_id: aggregatorTransactionId,
        succeeded,
      },
      headers: { Accept: 'application/json' },
    })

  /**
   * Inject `k.js` exactly once. Resolves when the widget global is ready.
   * Rejects after 15 s if the CDN never responds (poor network).
   */
  const loadWidget = (): Promise<void> => {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('KKiaPay widget can only load in the browser.'))
    }

    if (typeof window.openKkiapayWidget === 'function') {
      return Promise.resolve()
    }

    const existing = document.querySelector(`script[src="${KKIAPAY_SCRIPT_URL}"]`)
    if (existing) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('KKiaPay widget load timeout')), 15000)
        const check = () => {
          if (typeof window.openKkiapayWidget === 'function') {
            clearTimeout(timeout)
            resolve()
          } else {
            setTimeout(check, 100)
          }
        }
        check()
      })
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = KKIAPAY_SCRIPT_URL
      script.async = true
      script.onload = () => {
        // The widget exposes its globals asynchronously after parse — poll
        // briefly to make sure `openKkiapayWidget` is callable.
        let attempts = 0
        const check = () => {
          if (typeof window.openKkiapayWidget === 'function') {
            resolve()
          } else if (++attempts > 50) {
            reject(new Error('KKiaPay widget loaded but global is missing.'))
          } else {
            setTimeout(check, 100)
          }
        }
        check()
      }
      script.onerror = () => reject(new Error('Failed to load KKiaPay widget script.'))
      document.body.appendChild(script)
    })
  }

  /**
   * Open the widget with the merchant's KKiaPay params drawn from the
   * Zayono context. Returns a promise that resolves with the aggregator
   * transaction id on success, or rejects on failure / close-without-pay.
   */
  const openWidget = (ctx: KkiapayContext): Promise<{ aggregator_transaction_id: string }> => {
    return new Promise((resolve, reject) => {
      if (typeof window.openKkiapayWidget !== 'function'
        || typeof window.addSuccessListener !== 'function'
        || typeof window.addFailedListener !== 'function') {
        reject(new Error('KKiaPay widget globals are not ready.'))
        return
      }

      let settled = false

      window.addSuccessListener((response) => {
        if (settled) return
        settled = true
        resolve({ aggregator_transaction_id: response.transactionId })
      })

      window.addFailedListener((error) => {
        if (settled) return
        settled = true
        reject(new Error(error?.message || 'Le paiement KKiaPay a échoué.'))
      })

      window.openKkiapayWidget({
        amount: ctx.amount,
        key: ctx.kkiapay.public_key,
        sandbox: ctx.kkiapay.sandbox,
        phone: ctx.phone || undefined,
        email: ctx.customer.email || undefined,
        name: ctx.customer.name || undefined,
        countries: ctx.kkiapay.countries,
        paymentmethod: ctx.kkiapay.payment_methods,
        partnerId: ctx.transaction_id,
      })
    })
  }

  return { getContext, confirm, loadWidget, openWidget }
}
