<script setup lang="ts">
definePageMeta({
  layout: 'checkout',
})

const route = useRoute()
const transactionId = route.params.id as string
const { getContext, confirm, loadWidget, openWidget } = useKkiapayCheckout()

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
      errorMessage.value = 'Cette transaction est introuvable ou a expiré.'
    } else {
      pageState.value = 'error'
      errorMessage.value = e?.response?._data?.message || e?.data?.message || 'Impossible de charger le paiement KKiaPay.'
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
    errorMessage.value = 'Impossible de charger le widget KKiaPay. Vérifiez votre connexion.'
    return
  }

  try {
    const { aggregator_transaction_id } = await openWidget(context.value)
    pageState.value = 'processing'
    const res = await confirm(transactionId, aggregator_transaction_id, true)
    const status = res.data.status

    if (status === 'success') {
      pageState.value = 'success'
      setTimeout(() => {
        if (context.value.return_url) window.location.href = context.value.return_url
      }, 4000)
    } else if (status === 'failed' || status === 'cancelled') {
      pageState.value = status
      errorMessage.value = res.data.failure_reason || null
    } else {
      // Aggregator still processing — poll a few times
      startPolling()
    }
  } catch (e: any) {
    pageState.value = 'failed'
    errorMessage.value = e?.message || 'Le paiement KKiaPay a été annulé.'
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
        setTimeout(() => {
          if (context.value.return_url) window.location.href = context.value.return_url
        }, 4000)
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
  if (context.value?.return_url) window.location.href = context.value.return_url
}

const formatAmount = (amount: number, currency: string): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
</script>

<template>
  <div class="kkp-page">
    <div v-if="pageState === 'loading'" class="kkp-card kkp-state-card">
      <i class="pi pi-spin pi-spinner" style="font-size: 28px; color: #4F46E5;"></i>
      <p class="kkp-state-text" style="margin-top: 16px;">Chargement…</p>
    </div>

    <div v-else-if="pageState === 'ready' || pageState === 'opening'" class="kkp-card">
      <div v-if="context?.merchant?.logo_url" class="kkp-merchant-logo">
        <img :src="context.merchant.logo_url" :alt="context.merchant.name" />
      </div>
      <p class="kkp-pay-to">Vous payez</p>
      <h2 class="kkp-merchant-name">{{ context?.merchant?.name }}</h2>

      <div class="kkp-amount-box">
        <span class="kkp-amount-currency">{{ context?.currency }}</span>
        <span class="kkp-amount-value">{{ formatAmount(context?.amount || 0, context?.currency || 'XOF').replace(context?.currency || '', '').trim() }}</span>
      </div>

      <div class="kkp-info">
        <AppIcon name="info-circle" />
        <p>
          Le paiement se fait via le widget KKiaPay sécurisé. Cliquez sur
          <strong>« Ouvrir le widget »</strong> pour démarrer&nbsp;:
          KKiaPay vous demandera de choisir votre opérateur, votre numéro et de confirmer.
        </p>
      </div>

      <Button
        :label="pageState === 'opening' ? 'Chargement…' : 'Ouvrir le widget KKiaPay'"
        :loading="pageState === 'opening'"
        class="kkp-pay-button"
        @click="handlePay"
      />

      <button v-if="context?.return_url" type="button" class="kkp-cancel-link" @click="handleCancel">
        Annuler et revenir au marchand
      </button>

      <div v-if="errorMessage" class="kkp-error">
        <AppIcon name="exclamation-circle" />
        {{ errorMessage }}
      </div>

      <div class="kkp-trust">
        <AppIcon name="lock" />
        <span>Paiement sécurisé · Zayono via KKiaPay</span>
      </div>
    </div>

    <div v-else-if="pageState === 'processing'" class="kkp-card kkp-state-card">
      <div class="kkp-state-icon kkp-processing"><i class="pi pi-spin pi-spinner"></i></div>
      <h2 class="kkp-state-title">Traitement en cours…</h2>
      <p class="kkp-state-text">Confirmez le paiement sur votre téléphone si demandé.<br />Ne fermez pas cette page.</p>
    </div>

    <div v-else-if="pageState === 'success'" class="kkp-card kkp-state-card">
      <div class="kkp-state-icon kkp-success"><AppIcon name="check" /></div>
      <h2 class="kkp-state-title">Paiement réussi</h2>
      <p class="kkp-state-text">Votre paiement a été traité avec succès.<br />Redirection en cours…</p>
      <Button v-if="context?.return_url" label="Retourner au marchand" outlined @click="handleCancel" class="kkp-redirect" />
    </div>

    <div v-else-if="pageState === 'failed' || pageState === 'cancelled'" class="kkp-card kkp-state-card">
      <div class="kkp-state-icon kkp-failed"><AppIcon name="times" /></div>
      <h2 class="kkp-state-title">{{ pageState === 'cancelled' ? 'Paiement annulé' : 'Paiement échoué' }}</h2>
      <p class="kkp-state-text">{{ errorMessage || 'Le paiement n\'a pas pu être effectué.' }}</p>
      <div class="kkp-actions">
        <Button label="Réessayer" @click="pageState = 'ready'" class="kkp-pay-button" />
        <Button v-if="context?.return_url" label="Revenir au marchand" outlined severity="secondary" @click="handleCancel" />
      </div>
    </div>

    <div v-else-if="pageState === 'expired'" class="kkp-card kkp-state-card">
      <div class="kkp-state-icon kkp-expired"><AppIcon name="clock" /></div>
      <h2 class="kkp-state-title">Transaction introuvable</h2>
      <p class="kkp-state-text">{{ errorMessage }}</p>
    </div>

    <div v-else-if="pageState === 'error'" class="kkp-card kkp-state-card">
      <div class="kkp-state-icon kkp-failed"><AppIcon name="exclamation-triangle" /></div>
      <h2 class="kkp-state-title">Erreur</h2>
      <p class="kkp-state-text">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.kkp-page {
  display: flex;
  justify-content: center;
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
