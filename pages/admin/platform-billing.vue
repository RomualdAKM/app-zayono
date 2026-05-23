<template>
  <div class="page">
    <h1 class="page-title">{{ $t('platformBilling.title') }}</h1>
    <p class="page-subtitle">{{ $t('platformBilling.subtitle') }}</p>

    <div v-if="loading" class="loading-grid">
      <Skeleton v-for="i in 4" :key="i" height="110px" />
    </div>

    <template v-else>
      <!-- KPI strip -->
      <div class="kpi-grid">
        <DashboardKpiCard
          tone="blue"
          icon="pi-wallet"
          :label="$t('platformBilling.kpi.pendingBalance')"
          :value="`$${formatNumber(overview.pending_balance_total_usd)}`"
        />
        <DashboardKpiCard
          tone="yellow"
          icon="pi-clock"
          :label="$t('platformBilling.kpi.unpaidInvoices')"
          :value="`$${formatNumber(overview.unpaid_invoices_total_usd)}`"
        />
        <DashboardKpiCard
          tone="green"
          icon="pi-dollar"
          :label="$t('platformBilling.kpi.paidLast30d')"
          :value="`$${formatNumber(overview.paid_last_30d_usd)}`"
        />
        <DashboardKpiCard
          tone="neutral"
          icon="pi-chart-line"
          :label="$t('platformBilling.kpi.paidAllTime')"
          :value="`$${formatNumber(overview.paid_all_time_usd)}`"
        />
      </div>

      <div class="alerts-row">
        <div v-if="overview.suspended_merchants_count > 0" class="alert alert--warn">
          <i class="pi pi-pause-circle"></i>
          <span>{{ $t('platformBilling.alerts.suspended', { count: overview.suspended_merchants_count }) }}</span>
        </div>
        <div v-if="overview.past_due_invoice_count > 0" class="alert alert--info">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ $t('platformBilling.alerts.pastDue', { count: overview.past_due_invoice_count }) }}</span>
        </div>
      </div>

      <!-- Tabs -->
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="merchants">{{ $t('platformBilling.tabs.merchants') }}</Tab>
          <Tab value="invoices">{{ $t('platformBilling.tabs.invoices') }}</Tab>
        </TabList>
        <TabPanels>
        <TabPanel value="merchants" :header="$t('platformBilling.tabs.merchants')">
          <div class="filters-row">
            <ToggleSwitch v-model="filters.suspended_only" />
            <label class="filter-label">{{ $t('platformBilling.filters.suspendedOnly') }}</label>
            <ToggleSwitch v-model="filters.has_pending" class="ml-3" />
            <label class="filter-label">{{ $t('platformBilling.filters.withPending') }}</label>
            <Button icon="pi pi-refresh" severity="secondary" outlined :loading="merchantsLoading" @click="loadMerchants" />
          </div>

          <div v-if="merchantsLoading" class="loading"><Skeleton v-for="i in 5" :key="i" height="48px" /></div>
          <DataTable v-else :value="merchants" class="zayono-table" responsiveLayout="scroll">
            <Column :header="$t('platformBilling.table.merchant')">
              <template #body="{ data }">
                <div class="merchant-cell">
                  <div class="merchant-name">{{ data.name }}</div>
                  <div class="merchant-email">{{ data.email }}</div>
                </div>
              </template>
            </Column>
            <Column :header="$t('common.status')">
              <template #body="{ data }">
                <span v-if="data.is_platform" class="status-pill pill--violet">{{ $t('platformBilling.table.platformBadge') }}</span>
                <span v-else-if="data.live_suspended_at" class="status-pill pill--red">{{ $t('billing.invoiceStatus.late') }}</span>
                <span v-else-if="!data.is_active" class="status-pill pill--neutral">{{ $t('common.inactive') }}</span>
                <span v-else class="status-pill pill--green">{{ $t('common.active') }}</span>
              </template>
            </Column>
            <Column :header="$t('platformBilling.table.fee')" headerStyle="text-align:right">
              <template #body="{ data }">
                <span class="tabular">${{ Number(data.platform_fee_per_tx_usd).toFixed(5) }}</span>
              </template>
            </Column>
            <Column :header="$t('platformBilling.table.pendingBalance')" headerStyle="text-align:right">
              <template #body="{ data }">
                <span class="tabular amount" :class="data.pending_billing_balance_usd > 0.5 ? 'highlight' : ''">
                  ${{ Number(data.pending_billing_balance_usd).toFixed(5) }}
                </span>
              </template>
            </Column>
            <Column :header="$t('platformBilling.table.pendingTx')" headerStyle="text-align:right">
              <template #body="{ data }">
                <span class="tabular muted">{{ data.pending_billing_tx_count }}</span>
              </template>
            </Column>
            <Column :header="$t('platformBilling.table.invoices')">
              <template #body="{ data }">
                <span class="invoice-counts">
                  <span class="cnt cnt--paid">{{ data.invoices_paid_count }}</span>
                  <span class="cnt cnt--pending">{{ data.invoices_pending_count }}</span>
                  <span v-if="data.invoices_past_due_count > 0" class="cnt cnt--late">{{ data.invoices_past_due_count }}</span>
                </span>
              </template>
            </Column>
            <Column header="">
              <template #body="{ data }">
                <Button v-if="!data.is_platform" :label="$t('platformBilling.table.manage')" size="small" severity="secondary" outlined @click="openMerchantDetail(data.id)" />
              </template>
            </Column>
          </DataTable>
        </TabPanel>

        <TabPanel value="invoices" :header="$t('platformBilling.tabs.invoices')">
          <div class="filters-row">
            <Select
              v-model="invoiceFilters.status"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="$t('common.all')"
              :showClear="true"
              class="status-select"
            />
            <ToggleSwitch v-model="invoiceFilters.past_due" />
            <label class="filter-label">{{ $t('platformBilling.filters.lateOnly') }}</label>
            <Button icon="pi pi-refresh" severity="secondary" outlined :loading="invoicesLoading" @click="loadInvoices" />
          </div>

          <div v-if="invoicesLoading" class="loading"><Skeleton v-for="i in 5" :key="i" height="48px" /></div>
          <DataTable v-else :value="invoices" class="zayono-table" responsiveLayout="scroll">
            <Column :header="$t('billing.invoiceNumber')">
              <template #body="{ data }">
                <span class="tabular invoice-num">{{ data.invoice_number }}</span>
              </template>
            </Column>
            <Column :header="$t('platformBilling.table.merchant')">
              <template #body="{ data }">
                <div>
                  <div class="merchant-name">{{ data.merchant_name }}</div>
                  <div class="merchant-email">{{ data.merchant_email }}</div>
                </div>
              </template>
            </Column>
            <Column :header="$t('common.amount')" headerStyle="text-align:right">
              <template #body="{ data }">
                <span class="tabular amount">${{ Number(data.amount_usd).toFixed(2) }}</span>
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
                  :label="$t('platformBilling.table.markPaid')"
                  size="small"
                  severity="success"
                  outlined
                  @click="openMarkPaidModal(data)"
                />
                <Button
                  v-if="data.status === 'pending'"
                  :label="$t('platformBilling.table.cancel')"
                  size="small"
                  severity="secondary"
                  text
                  @click="openCancelModal(data)"
                />
              </template>
            </Column>
          </DataTable>
        </TabPanel>
        </TabPanels>
      </Tabs>
    </template>

    <!-- Merchant detail modal -->
    <Dialog v-model:visible="merchantModalOpen" :modal="true" :style="{ width: '720px' }" :header="$t('platformBilling.modals.merchantDetail')">
      <div v-if="activeMerchant" class="modal-body">
        <h3>{{ activeMerchant.merchant.name }}</h3>
        <p class="muted">{{ activeMerchant.merchant.email }}</p>

        <div class="kpi-grid mb-4">
          <DashboardKpiCard tone="blue" icon="pi-wallet" :label="$t('platformBilling.table.pendingBalance')" :value="`$${Number(activeMerchant.merchant.pending_billing_balance_usd).toFixed(5)}`" />
          <DashboardKpiCard tone="neutral" icon="pi-list" :label="$t('platformBilling.table.pendingTx')" :value="activeMerchant.merchant.pending_billing_tx_count" />
        </div>

        <div class="form-row">
          <label>{{ $t('platformBilling.modals.feeUnitLabel') }}</label>
          <InputNumber v-model="feeOverride" :minFractionDigits="5" :maxFractionDigits="5" :min="0" :max="999.99999" class="fee-input" />
          <Button :label="$t('platformBilling.modals.updateFee')" severity="primary" size="small" :loading="updatingFee" @click="updateFee" />
        </div>

        <h4 class="section-title">{{ $t('platformBilling.modals.invoiceHistory') }}</h4>
        <DataTable :value="activeMerchant.invoices" class="zayono-table compact">
          <Column field="invoice_number" :header="$t('billing.invoiceNumber')" />
          <Column :header="$t('common.amount')"><template #body="{ data }">${{ Number(data.amount_usd).toFixed(2) }}</template></Column>
          <Column field="tx_count" :header="$t('billing.txCount')" />
          <Column :header="$t('common.status')">
            <template #body="{ data }">
              <span class="status-pill" :class="statusTone(data.status, data.is_past_due)">
                {{ statusLabel(data.status, data.is_past_due) }}
              </span>
            </template>
          </Column>
          <Column :header="$t('common.date')"><template #body="{ data }">{{ formatDate(data.generated_at) }}</template></Column>
        </DataTable>

        <div class="modal-actions mt-4">
          <Button :label="$t('platformBilling.modals.createManual')" severity="secondary" outlined @click="openCreateManualModal" />
        </div>
      </div>
    </Dialog>

    <!-- Mark paid modal -->
    <Dialog v-model:visible="markPaidModalOpen" :modal="true" :style="{ width: '480px' }" :header="$t('platformBilling.modals.markPaid.title')">
      <div class="modal-body">
        <p>
          {{ $t('platformBilling.modals.markPaid.body', {
            number: activeInvoice?.invoice_number,
            amount: Number(activeInvoice?.amount_usd ?? 0).toFixed(2),
          }) }}
        </p>
        <label class="form-label">{{ $t('platformBilling.modals.markPaid.noteLabel') }}</label>
        <Textarea v-model="markPaidNote" rows="3" class="full-w" :placeholder="$t('platformBilling.modals.markPaid.notePlaceholder')" />
        <div class="modal-actions">
          <Button :label="$t('common.cancel')" severity="secondary" text @click="markPaidModalOpen = false" />
          <Button :label="$t('platformBilling.modals.markPaid.confirm')" severity="success" :loading="markingPaid" :disabled="!markPaidNote.trim()" @click="markPaid" />
        </div>
      </div>
    </Dialog>

    <!-- Cancel modal -->
    <Dialog v-model:visible="cancelModalOpen" :modal="true" :style="{ width: '480px' }" :header="$t('platformBilling.modals.cancel.title')">
      <div class="modal-body">
        <p>{{ $t('platformBilling.modals.cancel.body', { number: activeInvoice?.invoice_number }) }}</p>
        <label class="form-label">{{ $t('platformBilling.modals.cancel.reasonLabel') }}</label>
        <Textarea v-model="cancelNote" rows="3" class="full-w" :placeholder="$t('platformBilling.modals.cancel.reasonPlaceholder')" />
        <div class="modal-actions">
          <Button :label="$t('common.back')" severity="secondary" text @click="cancelModalOpen = false" />
          <Button :label="$t('platformBilling.modals.cancel.confirm')" severity="danger" :loading="cancelling" :disabled="!cancelNote.trim()" @click="cancelInvoice" />
        </div>
      </div>
    </Dialog>

    <!-- Manual invoice modal -->
    <Dialog v-model:visible="manualModalOpen" :modal="true" :style="{ width: '520px' }" :header="$t('platformBilling.modals.manual.title')">
      <div class="modal-body">
        <label class="form-label">{{ $t('platformBilling.modals.manual.amountLabel') }}</label>
        <InputNumber v-model="manualAmount" :minFractionDigits="2" :maxFractionDigits="2" :min="0.01" :max="10000" class="full-w" />
        <label class="form-label">{{ $t('platformBilling.modals.manual.dueLabel') }}</label>
        <DatePicker v-model="manualDueAt" dateFormat="dd/mm/yy" showIcon class="full-w" />
        <label class="form-label">{{ $t('platformBilling.modals.manual.noteLabel') }}</label>
        <Textarea v-model="manualNote" rows="3" class="full-w" :placeholder="$t('platformBilling.modals.manual.notePlaceholder')" />
        <div class="modal-actions">
          <Button :label="$t('common.cancel')" severity="secondary" text @click="manualModalOpen = false" />
          <Button :label="$t('platformBilling.modals.manual.confirm')" severity="primary" :loading="creatingManual" :disabled="!manualAmount || !manualNote.trim()" @click="createManual" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

const { apiFetch } = useApi()
const { handleError } = useApiError()
const toast = useToast?.()
const { t, locale } = useI18n()

useHead({ title: () => `${t('platformBilling.title')} · Admin Zayono` })

interface OverviewKpis {
  pending_balance_total_usd: number
  unpaid_invoices_total_usd: number
  paid_last_30d_usd: number
  paid_all_time_usd: number
  suspended_merchants_count: number
  past_due_invoice_count: number
  default_fee_per_tx_usd: number
  invoice_threshold_usd: number
}

interface MerchantRow {
  id: string
  name: string
  email: string
  is_platform: boolean
  is_active: boolean
  platform_fee_per_tx_usd: number
  pending_billing_balance_usd: number
  pending_billing_tx_count: number
  live_suspended_at: string | null
  live_suspension_reason: string | null
  invoices_pending_count: number
  invoices_paid_count: number
  invoices_past_due_count: number
}

interface Invoice {
  id: string
  invoice_number: string
  merchant_id: string
  merchant_name: string | null
  merchant_email: string | null
  amount_usd: number
  tx_count: number
  status: string
  due_at: string | null
  paid_at: string | null
  generated_at: string | null
  is_past_due: boolean
  admin_notes: string | null
}

const loading = ref(true)
const overview = ref<OverviewKpis>({} as OverviewKpis)
const activeTab = ref<string>('merchants')

const merchantsLoading = ref(false)
const merchants = ref<MerchantRow[]>([])
const filters = ref({ suspended_only: false, has_pending: false })

const invoicesLoading = ref(false)
const invoices = ref<Invoice[]>([])
const invoiceFilters = ref<{ status: string | null; past_due: boolean }>({ status: null, past_due: false })

const statusOptions = computed(() => [
  { label: t('billing.invoiceStatus.pending'), value: 'pending' },
  { label: t('billing.invoiceStatus.paid'), value: 'paid' },
  { label: t('billing.invoiceStatus.cancelled'), value: 'cancelled' },
  { label: t('billing.invoiceStatus.writtenOff'), value: 'written_off' },
])

const merchantModalOpen = ref(false)
const activeMerchant = ref<{ merchant: MerchantRow; invoices: Invoice[] } | null>(null)
const feeOverride = ref<number>(0)
const updatingFee = ref(false)

const markPaidModalOpen = ref(false)
const cancelModalOpen = ref(false)
const activeInvoice = ref<Invoice | null>(null)
const markPaidNote = ref('')
const cancelNote = ref('')
const markingPaid = ref(false)
const cancelling = ref(false)

const manualModalOpen = ref(false)
const manualAmount = ref<number | null>(null)
const manualNote = ref('')
const manualDueAt = ref<Date | null>(null)
const creatingManual = ref(false)

async function loadOverview() {
  loading.value = true
  try {
    const res = await apiFetch<{ data: OverviewKpis }>('/admin/platform-billing/overview')
    overview.value = res.data
    await loadMerchants()
    await loadInvoices()
  } catch (e: any) {
    handleError(e)
  } finally {
    loading.value = false
  }
}

async function loadMerchants() {
  merchantsLoading.value = true
  try {
    const qs = new URLSearchParams({ per_page: '50' })
    if (filters.value.suspended_only) qs.set('suspended_only', '1')
    if (filters.value.has_pending) qs.set('has_pending', '1')
    const res = await apiFetch<{ data: MerchantRow[] }>(`/admin/platform-billing/merchants?${qs.toString()}`)
    merchants.value = res.data || []
  } catch (e: any) { handleError(e) }
  finally { merchantsLoading.value = false }
}

async function loadInvoices() {
  invoicesLoading.value = true
  try {
    const qs = new URLSearchParams({ per_page: '50' })
    if (invoiceFilters.value.status) qs.set('status', invoiceFilters.value.status)
    if (invoiceFilters.value.past_due) qs.set('past_due', '1')
    const res = await apiFetch<{ data: Invoice[] }>(`/admin/platform-billing/invoices?${qs.toString()}`)
    invoices.value = res.data || []
  } catch (e: any) { handleError(e) }
  finally { invoicesLoading.value = false }
}

watch(filters, loadMerchants, { deep: true })
watch(invoiceFilters, loadInvoices, { deep: true })

async function openMerchantDetail(id: string) {
  try {
    const res = await apiFetch<{ data: { merchant: MerchantRow; invoices: Invoice[] } }>(`/admin/platform-billing/merchants/${id}`)
    activeMerchant.value = res.data
    feeOverride.value = Number(res.data.merchant.platform_fee_per_tx_usd)
    merchantModalOpen.value = true
  } catch (e: any) { handleError(e) }
}

async function updateFee() {
  if (!activeMerchant.value) return
  updatingFee.value = true
  try {
    await apiFetch(`/admin/platform-billing/merchants/${activeMerchant.value.merchant.id}/fee`, {
      method: 'PUT',
      body: { platform_fee_per_tx_usd: feeOverride.value },
    })
    toast?.add?.({ severity: 'success', summary: t('platformBilling.toasts.feeUpdated'), life: 2000 })
    await loadMerchants()
    await openMerchantDetail(activeMerchant.value.merchant.id)
  } catch (e: any) { handleError(e) }
  finally { updatingFee.value = false }
}

function openMarkPaidModal(invoice: Invoice) {
  activeInvoice.value = invoice
  markPaidNote.value = ''
  markPaidModalOpen.value = true
}

async function markPaid() {
  if (!activeInvoice.value) return
  markingPaid.value = true
  try {
    await apiFetch(`/admin/platform-billing/invoices/${activeInvoice.value.id}/mark-paid`, {
      method: 'POST',
      body: { admin_notes: markPaidNote.value },
    })
    toast?.add?.({ severity: 'success', summary: t('platformBilling.toasts.invoiceMarkedPaid'), life: 2500 })
    markPaidModalOpen.value = false
    await loadInvoices()
    await loadOverview()
  } catch (e: any) { handleError(e) }
  finally { markingPaid.value = false }
}

function openCancelModal(invoice: Invoice) {
  activeInvoice.value = invoice
  cancelNote.value = ''
  cancelModalOpen.value = true
}

async function cancelInvoice() {
  if (!activeInvoice.value) return
  cancelling.value = true
  try {
    await apiFetch(`/admin/platform-billing/invoices/${activeInvoice.value.id}/transition`, {
      method: 'POST',
      body: { status: 'cancelled', admin_notes: cancelNote.value },
    })
    toast?.add?.({ severity: 'success', summary: t('platformBilling.toasts.invoiceCancelled'), life: 2500 })
    cancelModalOpen.value = false
    await loadInvoices()
  } catch (e: any) { handleError(e) }
  finally { cancelling.value = false }
}

function openCreateManualModal() {
  manualAmount.value = null
  manualNote.value = ''
  manualDueAt.value = null
  manualModalOpen.value = true
}

async function createManual() {
  if (!activeMerchant.value || !manualAmount.value || !manualNote.value.trim()) return
  creatingManual.value = true
  try {
    const body: any = {
      amount_usd: manualAmount.value,
      admin_notes: manualNote.value,
    }
    if (manualDueAt.value) {
      body.due_at = manualDueAt.value.toISOString()
    }
    await apiFetch(`/admin/platform-billing/merchants/${activeMerchant.value.merchant.id}/manual-invoice`, {
      method: 'POST',
      body,
    })
    toast?.add?.({ severity: 'success', summary: t('platformBilling.toasts.invoiceCreated'), life: 2500 })
    manualModalOpen.value = false
    await openMerchantDetail(activeMerchant.value.merchant.id)
    await loadInvoices()
    await loadOverview()
  } catch (e: any) { handleError(e) }
  finally { creatingManual.value = false }
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

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0.00'
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

onMounted(loadOverview)
</script>

<style scoped>
.page-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; color: #111827; }
.page-subtitle { color: #6b7280; margin: 0 0 24px; font-size: 14px; max-width: 720px; }

.loading-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
.mb-4 { margin-bottom: 16px; }
.mt-4 { margin-top: 16px; }
.ml-3 { margin-left: 12px; }

.alerts-row { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.alert { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 4px; font-size: 13px; flex: 1; min-width: 280px; }
.alert--warn { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; }
.alert--info { background: #fefce8; border: 1px solid #fde68a; color: #92400e; }

.filters-row { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.filter-label { font-size: 13px; color: #4b5563; cursor: pointer; }
.status-select { width: 180px; }

.loading { display: flex; flex-direction: column; gap: 6px; }

.merchant-cell { display: flex; flex-direction: column; }
.merchant-name { font-weight: 500; color: #111827; font-size: 13px; }
.merchant-email { color: #6b7280; font-size: 12px; font-family: ui-monospace, monospace; }

.tabular { font-variant-numeric: tabular-nums; font-family: ui-monospace, "JetBrains Mono", monospace; }
.muted { color: #6b7280; }
.amount { font-weight: 600; color: #111827; }
.amount.highlight { color: #1d4ed8; }
.past-due { color: #dc2626; font-weight: 600; }
.invoice-num { font-weight: 600; color: #111827; }

.status-pill { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.pill--green { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.pill--yellow { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
.pill--red { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
.pill--violet { background: #ede9fe; color: #5b21b6; border: 1px solid #c4b5fd; }
.pill--neutral { background: #f3f4f6; color: #6b7280; border: 1px solid #d1d5db; }

.invoice-counts { display: inline-flex; gap: 4px; }
.cnt { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; }
.cnt--paid { background: #f0fdf4; color: #15803d; }
.cnt--pending { background: #fefce8; color: #a16207; }
.cnt--late { background: #fef2f2; color: #dc2626; }

.modal-body { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
.section-title { font-size: 14px; font-weight: 600; margin: 16px 0 8px; color: #111827; }
.form-row { display: flex; gap: 8px; align-items: center; margin: 12px 0; }
.form-row label { font-size: 13px; color: #4b5563; min-width: 160px; }
.fee-input { width: 160px; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.form-label { font-size: 13px; color: #4b5563; font-weight: 500; margin-top: 8px; }
.full-w { width: 100%; }
</style>
