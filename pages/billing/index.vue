<template>
  <div class="page">
    <p class="page-subtitle">{{ $t('billing.subtitle') }}</p>

    <div v-if="loading" class="loading-grid">
      <Skeleton v-for="i in 4" :key="i" height="110px" />
    </div>

    <template v-else-if="overview">
      <!-- Suspension banner -->
      <div v-if="overview.is_suspended" class="suspension-banner">
        <AppIcon name="warning" class="banner-icon" />
        <div>
          <strong>{{ $t('billing.suspended.title') }}.</strong>
          {{ overview.live_suspension_reason || $t('billing.suspended.body') }}
        </div>
      </div>

      <!-- KPI strip -->
      <div class="kpi-grid">
        <DashboardKpiCard
          tone="blue"
          icon="pi-wallet"
          :label="$t('billing.currentBalance')"
          :value="`$${overview.pending_billing_balance_usd.toFixed(4)}`"
        />
        <DashboardKpiCard
          tone="neutral"
          icon="pi-list"
          :label="$t('billing.accumulatedTx')"
          :value="overview.pending_billing_tx_count"
        />
        <DashboardKpiCard
          tone="green"
          icon="pi-dollar"
          :label="$t('billing.feePerTx')"
          :value="`$${overview.platform_fee_per_tx_usd.toFixed(5)}`"
        />
        <DashboardKpiCard
          tone="yellow"
          icon="pi-clock"
          :label="$t('billing.unpaidInvoices')"
          :value="overview.past_due_count"
        />
      </div>

      <!-- Progress bar -->
      <div class="section">
        <div class="section-head">
          <h3 class="section-title">{{ $t('billing.progressTitle') }}</h3>
          <p class="section-subtitle">{{ $t('billing.progressSubtitle') }}</p>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: overview.progress_to_next_invoice_pct + '%' }" />
          <span class="progress-label">
            ${{ overview.pending_billing_balance_usd.toFixed(4) }} / ${{ overview.invoice_threshold_usd.toFixed(2) }}
            ({{ overview.progress_to_next_invoice_pct }} %)
          </span>
        </div>
      </div>

      <!-- Invoices list -->
      <div class="section">
        <div class="section-head">
          <h3 class="section-title">{{ $t('billing.invoiceHistory') }}</h3>
        </div>
        <div class="filters-row">
          <Select
            v-model="filterStatus"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="$t('common.all')"
            :showClear="true"
            class="status-select"
            @change="loadInvoices"
          />
        </div>
        <div v-if="invoicesLoading" class="loading">
          <Skeleton v-for="i in 3" :key="i" height="48px" />
        </div>
        <div v-else-if="!invoices.length" class="empty-state">
          <AppIcon name="inbox" class="empty-icon" />
          <p class="empty-text">{{ $t('billing.empty') }}</p>
        </div>
        <div v-else class="table-scroll">
        <DataTable :value="invoices" class="zayono-table">
          <Column :header="$t('billing.invoiceNumber')">
            <template #body="{ data }">
              <span class="tabular">{{ data.invoice_number }}</span>
            </template>
          </Column>
          <Column :header="$t('common.amount')" headerStyle="text-align:right">
            <template #body="{ data }">
              <span class="tabular amount">${{ data.amount_usd.toFixed(2) }}</span>
            </template>
          </Column>
          <Column :header="$t('billing.txCount')" headerStyle="text-align:right">
            <template #body="{ data }">
              <span class="tabular muted">{{ data.tx_count }}</span>
            </template>
          </Column>
          <Column :header="$t('common.status')">
            <template #body="{ data }">
              <span class="status-pill" :class="statusTone(data.status, data.is_past_due)">
                {{ statusLabel(data.status, data.is_past_due) }}
              </span>
            </template>
          </Column>
          <Column :header="$t('billing.generated')">
            <template #body="{ data }">
              <span class="muted tabular">{{ formatDate(data.generated_at) }}</span>
            </template>
          </Column>
          <Column :header="$t('billing.dueDate')">
            <template #body="{ data }">
              <span class="muted tabular" :class="data.is_past_due ? 'past-due' : ''">
                {{ formatDate(data.due_at) }}
              </span>
            </template>
          </Column>
          <Column header="">
            <template #body="{ data }">
              <Button
                v-if="data.status === 'pending'"
                :label="$t('billing.pay')"
                size="small"
                severity="primary"
                :loading="payingId === data.id"
                @click="payInvoice(data.id)"
              />
              <span v-else-if="data.paid_at" class="paid-at">
                {{ $t('billing.paidAt', { date: formatDate(data.paid_at) }) }}
              </span>
            </template>
          </Column>
        </DataTable>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { apiFetch } = useApi()
const { handleError } = useApiError()
const toast = useToast?.()

interface BillingOverview {
  merchant_id: string
  platform_fee_per_tx_usd: number
  pending_billing_balance_usd: number
  pending_billing_tx_count: number
  invoice_threshold_usd: number
  progress_to_next_invoice_pct: number
  live_suspended_at: string | null
  live_suspension_reason: string | null
  is_suspended: boolean
  past_due_count: number
  recent_invoices: Invoice[]
}

interface Invoice {
  id: string
  invoice_number: string
  amount_usd: number
  tx_count: number
  status: 'pending' | 'paid' | 'cancelled' | 'written_off' | 'expired'
  checkout_url: string | null
  paid_at: string | null
  due_at: string | null
  generated_at: string | null
  is_past_due: boolean
}

const { t, locale } = useI18n()

useHead({ title: () => t('billing.title') })

const loading = ref(true)
const invoicesLoading = ref(false)
const overview = ref<BillingOverview | null>(null)
const invoices = ref<Invoice[]>([])
const filterStatus = ref<string | null>(null)
const payingId = ref<string | null>(null)

const statusOptions = computed(() => [
  { label: t('billing.invoiceStatus.pending'), value: 'pending' },
  { label: t('billing.invoiceStatus.paid'), value: 'paid' },
  { label: t('billing.invoiceStatus.cancelled'), value: 'cancelled' },
  { label: t('billing.invoiceStatus.writtenOff'), value: 'written_off' },
])

async function load() {
  loading.value = true
  try {
    const res = await apiFetch<{ data: BillingOverview }>('/merchant/billing')
    overview.value = res.data
    await loadInvoices()
  } catch (e: any) {
    handleError(e)
  } finally {
    loading.value = false
  }
}

async function loadInvoices() {
  invoicesLoading.value = true
  try {
    const qs = new URLSearchParams({ per_page: '50' })
    if (filterStatus.value) qs.set('status', filterStatus.value)
    const res = await apiFetch<{ data: Invoice[] }>(`/merchant/billing/invoices?${qs.toString()}`)
    invoices.value = res.data || []
  } catch (e: any) {
    handleError(e)
  } finally {
    invoicesLoading.value = false
  }
}

async function payInvoice(id: string) {
  payingId.value = id
  try {
    const res = await apiFetch<{ data: { checkout_url: string } }>(
      `/merchant/billing/invoices/${id}/pay`,
      { method: 'POST' },
    )
    if (res.data?.checkout_url) {
      window.location.href = res.data.checkout_url
    } else {
      toast?.add?.({ severity: 'error', summary: t('status.error'), detail: t('toasts.genericError') })
    }
  } catch (e: any) {
    handleError(e)
  } finally {
    payingId.value = null
  }
}

function statusTone(status: string, isPastDue: boolean): string {
  if (status === 'paid') return 'pill--green'
  if (status === 'pending' && isPastDue) return 'pill--red'
  if (status === 'pending') return 'pill--yellow'
  if (status === 'cancelled' || status === 'written_off') return 'pill--neutral'
  return 'pill--neutral'
}

function statusLabel(status: string, isPastDue: boolean): string {
  if (status === 'paid') return t('billing.invoiceStatus.paid')
  if (status === 'pending' && isPastDue) return t('billing.invoiceStatus.late')
  if (status === 'pending') return t('billing.invoiceStatus.pending')
  if (status === 'cancelled') return t('billing.invoiceStatus.cancelled')
  if (status === 'written_off') return t('billing.invoiceStatus.writtenOff')
  if (status === 'expired') return t('billing.invoiceStatus.expired')
  return status
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return iso.substring(0, 10) }
}

onMounted(load)
</script>

<style scoped>
/* Let the invoice table scroll horizontally on narrow screens instead of
   forcing the whole page to overflow (7 columns don't fit on mobile). */
.table-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.page-subtitle {
  color: var(--ze-text-muted);
  margin: 0 0 var(--ze-sp-4) 0;
  font-size: 14px;
  max-width: 720px;
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--ze-sp-3);
}

.suspension-banner {
  display: flex;
  align-items: flex-start;
  gap: var(--ze-sp-3);
  padding: var(--ze-sp-4);
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-left: 4px solid #dc2626;
  border-radius: 4px;
  color: #991b1b;
  font-size: 14px;
  margin-bottom: var(--ze-sp-5);
}

.banner-icon { width: 24px; height: 24px; flex-shrink: 0; color: #dc2626; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--ze-sp-3);
  margin-bottom: var(--ze-sp-6);
}

.section {
  background: var(--ze-surface);
  border: 1px solid var(--ze-border);
  border-radius: 6px;
  padding: var(--ze-sp-5);
  margin-bottom: var(--ze-sp-6);
}

.section-head { margin-bottom: var(--ze-sp-3); }
.section-title { margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: var(--ze-text-strong); }
.section-subtitle { margin: 0; font-size: 13px; color: var(--ze-text-muted); }

.progress-bar {
  position: relative;
  width: 100%;
  height: 28px;
  background: var(--ze-surface-sunken);
  border: 1px solid var(--ze-border);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%);
  transition: width 0.3s ease;
}

.progress-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--ze-text-strong);
  font-variant-numeric: tabular-nums;
  mix-blend-mode: difference;
  color: #ffffff;
}

.filters-row {
  display: flex;
  gap: var(--ze-sp-2);
  margin-bottom: var(--ze-sp-3);
}

.status-select { width: 200px; }

.loading { display: flex; flex-direction: column; gap: var(--ze-sp-2); }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--ze-sp-8) var(--ze-sp-4);
  text-align: center;
}
.empty-icon { width: 48px; height: 48px; color: var(--ze-text-muted); margin-bottom: var(--ze-sp-2); }
.empty-text { color: var(--ze-text-muted); margin: 0; max-width: 480px; }

.tabular { font-variant-numeric: tabular-nums; font-family: ui-monospace, "JetBrains Mono", monospace; }
.muted { color: var(--ze-text-muted); }
.amount { font-weight: 600; color: var(--ze-text-strong); }
.past-due { color: #dc2626; font-weight: 600; }

.status-pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}
.pill--green { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.pill--yellow { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
.pill--red { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
.pill--neutral { background: var(--ze-surface-sunken); color: var(--ze-text-muted); border: 1px solid var(--ze-border); }

.paid-at { font-size: 12px; color: var(--ze-text-muted); }
</style>
