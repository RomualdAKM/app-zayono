<template>
  <!--
    Post-payment return / cancel landing page for platform invoices.
    Reached after the merchant pays a Zayono billing invoice via the
    hosted checkout. The backend builds this URL as `return_url` and
    `cancel_url` when creating the CheckoutSession (see
    Merchant\BillingController::payInvoice).

    URL contract:
      /billing/invoices/{id}?status=success
      /billing/invoices/{id}?status=cancelled
      /billing/invoices/{id}?status=failed
      /billing/invoices/{id}           → fallback redirect to /billing

    The middleware (auth.global.ts) lists `/billing/invoices/` as a
    public prefix so an expired session during checkout doesn't bounce
    the customer to /auth/login on return.
  -->
  <div class="invoice-status-page">
    <div class="status-card" :class="`status-card--${tone}`">
      <div class="status-icon" :class="`icon--${tone}`">
        <i :class="iconClass" />
      </div>

      <h1 class="status-title">{{ title }}</h1>

      <p class="status-body" v-if="body">{{ body }}</p>

      <div v-if="invoiceNumber" class="invoice-meta">
        <span class="meta-label">{{ $t('billing.invoiceNumber') }}</span>
        <code class="meta-value">{{ invoiceNumber }}</code>
      </div>

      <div class="actions">
        <NuxtLink to="/billing" class="btn btn-primary">
          <i class="pi pi-arrow-left" />
          {{ $t('billingInvoiceStatus.backToBilling') }}
        </NuxtLink>

        <button
          v-if="status === 'cancelled' || status === 'failed'"
          class="btn btn-secondary"
          :disabled="retrying"
          @click="retryPayment"
        >
          <i :class="['pi', retrying ? 'pi-spin pi-spinner' : 'pi-refresh']" />
          {{ retrying ? $t('common.loading') : $t('billingInvoiceStatus.retry') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  // Reuse the auth layout — minimal chrome (logo + card), no sidebar.
  // The default layout's sidebar requires a populated auth state which
  // we can't guarantee here (publicPrefix in auth.global.ts).
  layout: 'auth',
})

const route = useRoute()
const router = useRouter()
const { apiFetch } = useApi()
const { t } = useI18n()

const id = computed(() => String(route.params.id ?? ''))
const status = computed(() => {
  const raw = String(route.query.status ?? '').toLowerCase()
  // Allow only known statuses — anything else falls through to redirect.
  if (raw === 'success' || raw === 'paid') return 'success'
  if (raw === 'cancelled' || raw === 'canceled') return 'cancelled'
  if (raw === 'failed' || raw === 'error') return 'failed'
  return ''
})

useHead({ title: () => t('billingInvoiceStatus.pageTitle') })

const invoiceNumber = ref<string | null>(null)
const retrying = ref(false)

// Fetch the invoice number (and confirm the status) for a richer message.
// Best-effort — failure is silent because the page must work even when
// the user's session has just expired (publicPrefix exit from checkout).
onMounted(async () => {
  if (!status.value) {
    // Unknown query — bounce to the main billing page.
    router.replace('/billing')
    return
  }
  if (!id.value) return
  try {
    const res = await apiFetch<{ data: { invoice_number: string } }>(
      `/merchant/billing/invoices/${id.value}`,
    )
    invoiceNumber.value = res?.data?.invoice_number ?? null
  } catch {
    // Silent — unauthenticated user or 404. We still show the page
    // with a generic message; the merchant can click back to billing.
    invoiceNumber.value = null
  }
})

const tone = computed(() => {
  if (status.value === 'success') return 'success'
  if (status.value === 'cancelled') return 'warning'
  if (status.value === 'failed') return 'danger'
  return 'neutral'
})

const iconClass = computed(() => {
  if (status.value === 'success') return 'pi pi-check-circle'
  if (status.value === 'cancelled') return 'pi pi-times-circle'
  if (status.value === 'failed') return 'pi pi-exclamation-triangle'
  return 'pi pi-info-circle'
})

const title = computed(() => {
  if (status.value === 'success') {
    return invoiceNumber.value
      ? t('billingInvoiceStatus.paidTitleWithNumber', { number: invoiceNumber.value })
      : t('billingInvoiceStatus.paidTitle')
  }
  if (status.value === 'cancelled') return t('billingInvoiceStatus.cancelledTitle')
  if (status.value === 'failed') return t('billingInvoiceStatus.failedTitle')
  return ''
})

const body = computed(() => {
  if (status.value === 'success') return t('billingInvoiceStatus.paidBody')
  if (status.value === 'cancelled') return t('billingInvoiceStatus.cancelledBody')
  if (status.value === 'failed') return t('billingInvoiceStatus.failedBody')
  return ''
})

async function retryPayment() {
  if (!id.value) return
  retrying.value = true
  try {
    const res = await apiFetch<{ data: { checkout_url: string } }>(
      `/merchant/billing/invoices/${id.value}/pay`,
      { method: 'POST' },
    )
    if (res?.data?.checkout_url) {
      window.location.href = res.data.checkout_url
      return
    }
    router.push('/billing')
  } catch {
    // Likely unauthenticated — send them through the billing page,
    // which is auth-protected and will route them via /auth/login.
    router.push('/billing')
  } finally {
    retrying.value = false
  }
}
</script>

<style scoped>
.invoice-status-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.status-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 40px 32px;
  max-width: 520px;
  width: 100%;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.status-card--success { border-top: 4px solid #10b981; }
.status-card--warning { border-top: 4px solid #f59e0b; }
.status-card--danger { border-top: 4px solid #ef4444; }

.status-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 32px;
}

.icon--success { background: #d1fae5; color: #059669; }
.icon--warning { background: #fef3c7; color: #d97706; }
.icon--danger { background: #fee2e2; color: #dc2626; }

.status-title {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 12px;
  line-height: 1.3;
}

.status-body {
  font-size: 14px;
  color: #4b5563;
  margin: 0 0 20px;
  line-height: 1.6;
}

.invoice-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 24px;
  font-size: 13px;
}

.meta-label {
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 11px;
  font-weight: 600;
}

.meta-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 600;
  color: #111827;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 0.15s, border-color 0.15s;
}

.btn-primary {
  background: #1d4ed8;
  color: #ffffff;
}
.btn-primary:hover { background: #1e40af; }

.btn-secondary {
  background: #ffffff;
  color: #374151;
  border-color: #d1d5db;
}
.btn-secondary:hover:not(:disabled) { background: #f9fafb; }
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
