<script setup lang="ts">
definePageMeta({
  layout: 'checkout',
})

const route = useRoute()
const transactionId = route.params.id as string
const { getContext, confirm, loadWidget, openWidget } = useKkiapayCheckout()
// Protocol-validated navigation: a merchant return_url of `javascript:…`
// must never run in the customer's browser. Shared with the main checkout.
const { navigateSafely } = useSafeNavigation()
const { t, locale } = useI18n()

// State
const loading = ref(true)
const context = ref<any>(null)
const errorMessage = ref<string | null>(null)
const pageState = ref<'loading' | 'ready' | 'opening' | 'processing' | 'success' | 'failed' | 'cancelled' | 'expired' | 'error'>('loading')

onMounted(async () => {
  try {
    const res = await getContext(transactionId)
    context.value = res.data

    if (['success'].includes(context.value.status)) {
      pageState.value = 'success'
      return
    }
    if (['failed', 'cancelled'].includes(context.value.status)) {
      pageState.value = context.value.status
      return
    }

    pageState.value = 'ready'
  } catch (e: any) {
    const status = e?.response?.status || e?.status
    if (status === 409) {
      pageState.value = 'success'
      const data = e?.response?._data?.data || e?.data?.data
      context.value = data
    } else if (status === 404) {
      pageState.value = 'expired'
      errorMessage.value = t('checkout.kkiapay.error.notFound')
    } else {
      pageState.value = 'error'
      errorMessage.value = e?.response?._data?.message || e?.data?.message || t('checkout.kkiapay.error.loadPayment')
    }
  } finally {
    loading.value = false
  }
})

const handlePay = async () => {
  if (!context.value) return
  pageState.value = 'opening'
  errorMessage.value = null

  try {
    await loadWidget()
  } catch (e: any) {
    pageState.value = 'error'
    errorMessage.value = t('checkout.kkiapay.error.loadWidget')
    return
  }

  try {
    const { aggregator_transaction_id } = await openWidget(context.value)
    pageState.value = 'processing'
    const res = await confirm(transactionId, aggregator_transaction_id, true)
    const status = res.data.status

    if (status === 'success') {
      pageState.value = 'success'
      setTimeout(() => navigateSafely(context.value?.return_url), 4000)
    } else if (status === 'failed' || status === 'cancelled') {
      pageState.value = status
      errorMessage.value = res.data.failure_reason || null
    } else {
      // Aggregator still processing — poll a few times
      startPolling()
    }
  } catch (e: any) {
    pageState.value = 'failed'
    errorMessage.value = e?.message || t('checkout.kkiapay.error.paymentCancelled')
  }
}

let pollInterval: ReturnType<typeof setInterval> | null = null
let pollAttempts = 0
const startPolling = () => {
  pollInterval = setInterval(async () => {
    pollAttempts++
    try {
      const res = await getContext(transactionId)
      const status = res.data.status
      if (status === 'success') {
        clearInterval(pollInterval!)
        pageState.value = 'success'
        setTimeout(() => navigateSafely(context.value?.return_url), 4000)
      } else if (status === 'failed' || status === 'cancelled') {
        clearInterval(pollInterval!)
        pageState.value = status
      }
    } catch {
      // 409 = settled; treat as success-info
      clearInterval(pollInterval!)
      pageState.value = 'success'
    }
    if (pollAttempts > 30) {
      clearInterval(pollInterval!)
      pageState.value = 'processing'
    }
  }, 3000)
}

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

const handleCancel = () => {
  navigateSafely(context.value?.return_url)
}

const formatAmount = (amount: number, currency: string): string => {
  // Match the rest of the checkout: zero-decimal only for ISO 4217
  // zero-decimal currencies (KES/MWK are 2-decimal).
  const zeroDecimal = ['XOF', 'XAF', 'RWF', 'UGX', 'GNF', 'JPY']
  const z = zeroDecimal.includes(currency.toUpperCase())
  return new Intl.NumberFormat(locale.value === 'en' ? 'en-US' : 'fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: z ? 0 : 2,
    maximumFractionDigits: z ? 0 : 2,
  }).format(amount)
}
</script>

<template>
  <div class="kkp-page">
    <!-- Language selector at page level so it stays available on every
         state (processing / success / failed …), not just the form. -->
    <div class="kkp-lang-page">
      <CheckoutLangToggle />
    </div>

    <div v-if="pageState === 'loading'" class="kkp-card kkp-state-card">
      <i class="pi pi-spin pi-spinner" style="font-size: 28px; color: #4F46E5;"></i>
      <p class="kkp-state-text" style="margin-top: 16px;">{{ t('checkout.kkiapay.loading') }}</p>
    </div>

    <div v-else-if="pageState === 'ready' || pageState === 'opening'" class="kkp-card">
      <div v-if="context?.merchant?.logo_url" class="kkp-merchant-logo">
        <img :src="context.merchant.logo_url" :alt="context.merchant.name" />
      </div>
      <p class="kkp-pay-to">{{ t('checkout.kkiapay.payTo') }}</p>
      <h2 class="kkp-merchant-name">{{ context?.merchant?.name }}</h2>

      <div class="kkp-amount-box">
        <span class="kkp-amount-currency">{{ context?.currency }}</span>
        <span class="kkp-amount-value">{{ formatAmount(context?.amount || 0, context?.currency || 'XOF').replace(context?.currency || '', '').trim() }}</span>
      </div>

      <div class="kkp-info">
        <AppIcon name="info-circle" />
        <p>{{ t('checkout.kkiapay.info.instructions') }}</p>
      </div>

      <Button
        :label="pageState === 'opening' ? t('checkout.kkiapay.button.loading') : t('checkout.kkiapay.button.openWidget')"
        :loading="pageState === 'opening'"
        class="kkp-pay-button"
        @click="handlePay"
      />

      <button v-if="context?.return_url" type="button" class="kkp-cancel-link" @click="handleCancel">
        {{ t('checkout.kkiapay.button.cancelReturn') }}
      </button>

      <div v-if="errorMessage" class="kkp-error">
        <AppIcon name="exclamation-circle" />
        {{ errorMessage }}
      </div>

      <div class="kkp-trust">
        <AppIcon name="lock" />
        <span>{{ t('checkout.kkiapay.trust.securedBy') }}</span>
      </div>
    </div>

    <div v-else-if="pageState === 'processing'" class="kkp-card kkp-state-card">
      <div class="kkp-state-icon kkp-processing"><i class="pi pi-spin pi-spinner"></i></div>
      <h2 class="kkp-state-title">{{ t('checkout.kkiapay.processing.title') }}</h2>
      <p class="kkp-state-text">{{ t('checkout.kkiapay.processing.line1') }}<br />{{ t('checkout.kkiapay.processing.line2') }}</p>
    </div>

    <div v-else-if="pageState === 'success'" class="kkp-card kkp-state-card">
      <div class="kkp-state-icon kkp-success"><AppIcon name="check" /></div>
      <h2 class="kkp-state-title">{{ t('checkout.kkiapay.success.title') }}</h2>
      <p class="kkp-state-text">{{ t('checkout.kkiapay.success.line1') }}<br />{{ t('checkout.kkiapay.success.line2') }}</p>
      <Button v-if="context?.return_url" :label="t('checkout.kkiapay.success.returnButton')" outlined @click="handleCancel" class="kkp-redirect" />
    </div>

    <div v-else-if="pageState === 'failed' || pageState === 'cancelled'" class="kkp-card kkp-state-card">
      <div class="kkp-state-icon kkp-failed"><AppIcon name="times" /></div>
      <h2 class="kkp-state-title">{{ pageState === 'cancelled' ? t('checkout.kkiapay.cancelled.title') : t('checkout.kkiapay.failed.title') }}</h2>
      <p class="kkp-state-text">{{ errorMessage || t('checkout.kkiapay.failed.fallbackText') }}</p>
      <div class="kkp-actions">
        <Button :label="t('checkout.kkiapay.button.retry')" @click="pageState = 'ready'" class="kkp-pay-button" />
        <Button v-if="context?.return_url" :label="t('checkout.kkiapay.button.returnMerchant')" outlined severity="secondary" @click="handleCancel" />
      </div>
    </div>

    <div v-else-if="pageState === 'expired'" class="kkp-card kkp-state-card">
      <div class="kkp-state-icon kkp-expired"><AppIcon name="clock" /></div>
      <h2 class="kkp-state-title">{{ t('checkout.kkiapay.expired.title') }}</h2>
      <p class="kkp-state-text">{{ errorMessage }}</p>
    </div>

    <div v-else-if="pageState === 'error'" class="kkp-card kkp-state-card">
      <div class="kkp-state-icon kkp-failed"><AppIcon name="exclamation-triangle" /></div>
      <h2 class="kkp-state-title">{{ t('checkout.kkiapay.error.title') }}</h2>
      <p class="kkp-state-text">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.kkp-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
}

.kkp-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 32px 28px;
  max-width: 480px;
  width: 100%;
  text-align: center;
}

.kkp-lang-page {
  width: 100%;
  max-width: 480px;
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.kkp-merchant-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.kkp-merchant-logo img {
  height: 48px;
  width: auto;
  max-width: 160px;
  object-fit: contain;
}

.kkp-pay-to {
  font-size: 13px;
  color: #6B7280;
  margin: 0 0 4px;
}

.kkp-merchant-name {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 24px;
}

.kkp-amount-box {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 6px;
  padding: 20px 0;
  border-top: 1px solid #F3F4F6;
  border-bottom: 1px solid #F3F4F6;
  margin-bottom: 24px;
}

.kkp-amount-currency {
  font-size: 14px;
  font-weight: 600;
  color: #6B7280;
}

.kkp-amount-value {
  font-size: 36px;
  font-weight: 700;
  color: #111827;
}

.kkp-info {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: #EFF6FF;
  border: 1px solid #DBEAFE;
  border-radius: 6px;
  padding: 12px 14px;
  margin-bottom: 20px;
  text-align: left;
}

.kkp-info i {
  font-size: 14px;
  color: #2563EB;
  margin-top: 2px;
  flex-shrink: 0;
}

.kkp-info p {
  margin: 0;
  font-size: 13px;
  color: #1E40AF;
  line-height: 1.5;
}

.kkp-pay-button {
  width: 100%;
  background: #4F46E5;
  border-color: #4F46E5;
  font-weight: 600;
  border-radius: 6px;
  padding: 12px;
  font-size: 14px;
}

.kkp-pay-button:hover { background: #4338CA; border-color: #4338CA; }

.kkp-cancel-link {
  display: block;
  margin: 14px auto 0;
  background: none;
  border: none;
  color: #6B7280;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
}

.kkp-cancel-link:hover { color: #374151; }

.kkp-error {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 6px;
  padding: 10px 12px;
  margin-top: 16px;
  font-size: 13px;
  color: #DC2626;
  text-align: left;
}

.kkp-trust {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  gap: 6px;
  align-items: center;
  font-size: 11px;
  color: #9CA3AF;
}

.kkp-state-card {
  padding: 48px 24px;
}

.kkp-state-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 24px;
}

.kkp-processing { background: #EFF6FF; color: #2563EB; }
.kkp-success { background: #F0FDF4; color: #16A34A; }
.kkp-failed { background: #FEF2F2; color: #DC2626; }
.kkp-expired { background: #FEFCE8; color: #CA8A04; }

.kkp-state-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px;
}

.kkp-state-text {
  font-size: 14px;
  color: #6B7280;
  line-height: 1.6;
  margin: 0 0 24px;
}

.kkp-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kkp-redirect {
  margin-top: 8px;
}
</style>
