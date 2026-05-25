<template>
  <div class="transaction-detail">
    <div class="page-header">
      <div class="header-left">
        <Button icon="pi pi-arrow-left" text severity="secondary" @click="$router.push('/admin/transactions')" />
        <div>
          <h1 class="page-title">{{ $t('admin.transactionDetail.title', { id: shortId }) }}</h1>
          <Tag :value="t(`status.${transaction.status}`)" :severity="getStatusSeverity(transaction.status)" />
        </div>
      </div>
    </div>

    <div class="detail-grid">
      <div class="info-card">
        <h3 class="card-title">{{ $t('admin.transactionDetail.details') }}</h3>
        <div class="info-list">
          <div class="info-row"><span class="info-label">{{ $t('admin.transactionDetail.id') }}</span><span class="info-value mono">{{ transaction.id }}</span></div>
          <div class="info-row"><span class="info-label">{{ $t('admin.transactionDetail.merchant') }}</span><span class="info-value">{{ transaction.merchant?.company_name ?? '-' }}</span></div>
          <div class="info-row"><span class="info-label">{{ $t('admin.transactionDetail.amount') }}</span><span class="info-value">{{ transaction.amount }} {{ transaction.currency }}</span></div>
          <div class="info-row"><span class="info-label">{{ $t('admin.transactionDetail.type') }}</span><Tag :value="t(`txType.${transaction.type}`)" :severity="transaction.type === 'payment' ? 'info' : 'warn'" /></div>
          <div class="info-row">
            <span class="info-label">{{ $t('admin.transactionDetail.operator') }}</span>
            <span class="info-value">
              <span v-if="transaction.operator" style="display: inline-flex; align-items: center; gap: 8px;">
                <MethodLogo :name="transaction.operator" />
                <span>{{ transaction.operator }}</span>
              </span>
              <span v-else>-</span>
            </span>
          </div>
          <div class="info-row"><span class="info-label">{{ $t('admin.transactionDetail.aggregator') }}</span><span class="info-value">{{ transaction.aggregator_code ?? '-' }}</span></div>
          <div class="info-row"><span class="info-label">{{ $t('admin.transactionDetail.environment') }}</span><Tag :value="transaction.environment === 'live' ? t('common.live') : t('common.sandbox')" :severity="transaction.environment === 'live' ? 'success' : 'warn'" /></div>
          <div class="info-row"><span class="info-label">{{ $t('admin.transactionDetail.date') }}</span><span class="info-value">{{ formatDateTime(transaction.created_at) }}</span></div>
        </div>
      </div>

      <div class="info-card">
        <h3 class="card-title">{{ $t('admin.transactionDetail.fees') }}</h3>
        <div class="info-list">
          <div class="info-row"><span class="info-label">{{ $t('admin.transactionDetail.feeZayonoPercent') }}</span><span class="info-value">{{ transaction.zayono_fee_percent ?? '-' }}%</span></div>
          <div class="info-row"><span class="info-label">{{ $t('admin.transactionDetail.feeZayonoAmount') }}</span><span class="info-value">{{ transaction.zayono_fee_amount ?? '-' }} {{ transaction.currency }}</span></div>
          <div class="info-row"><span class="info-label">{{ $t('admin.transactionDetail.feeMerchantPercent') }}</span><span class="info-value">{{ transaction.merchant_fee_percent ?? '-' }}%</span></div>
        </div>
      </div>
    </div>

    <div class="section-card">
      <h3 class="card-title">{{ $t('admin.transactionDetail.attempts') }}</h3>
      <DataTable :value="attempts" stripedRows size="small" v-if="attempts.length">
        <Column field="aggregator_code" :header="$t('admin.transactionDetail.attemptsColumns.aggregator')" />
        <Column field="status" :header="$t('admin.transactionDetail.attemptsColumns.status')">
          <template #body="{ data }">
            <Tag :value="t(`status.${data.status}`)" :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>
        <Column field="response_time_ms" :header="$t('admin.transactionDetail.attemptsColumns.time')" />
        <Column :header="$t('admin.transactionDetail.attemptsColumns.date')">
          <template #body="{ data }">
            {{ formatDateTime(data.created_at) }}
          </template>
        </Column>
      </DataTable>
      <p v-else class="empty-text">{{ $t('admin.transactionDetail.noAttempts') }}</p>
    </div>

    <div class="section-card">
      <h3 class="card-title">{{ $t('admin.transactionDetail.webhooks') }}</h3>
      <DataTable :value="webhookLogs" stripedRows size="small" v-if="webhookLogs.length">
        <Column field="url" :header="$t('admin.transactionDetail.webhookColumns.url')" style="min-width: 250px" />
        <Column field="status_code" :header="$t('admin.transactionDetail.webhookColumns.httpCode')" style="width: 100px" />
        <Column :header="$t('admin.transactionDetail.webhookColumns.response')">
          <template #body="{ data }">
            <Tag :value="data.status_code >= 200 && data.status_code < 300 ? $t('admin.transactionDetail.ok') : $t('admin.transactionDetail.error')" :severity="data.status_code >= 200 && data.status_code < 300 ? 'success' : 'danger'" />
          </template>
        </Column>
        <Column :header="$t('admin.transactionDetail.webhookColumns.date')">
          <template #body="{ data }">
            {{ formatDateTime(data.created_at) }}
          </template>
        </Column>
      </DataTable>
      <p v-else class="empty-text">{{ $t('admin.transactionDetail.noWebhook') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const route = useRoute()
const { t, locale } = useI18n()

const transaction = ref<any>({})
const attempts = ref<any[]>([])
const webhookLogs = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  loading.value = true
  try {
    const { fetchTransaction } = useAdmin()
    const res = await fetchTransaction(route.params.id as string)
    transaction.value = res.data
    attempts.value = res.data.attempts ?? []
    webhookLogs.value = res.data.webhook_logs ?? []
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || t('admin.transactionDetail.loadError')
  } finally {
    loading.value = false
  }
})

const shortId = computed(() => {
  const id = route.params.id as string
  return id.length > 14 ? id.slice(0, 14) + '...' : id
})

const formatDateTime = (date: string) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(date).toLocaleString(localeStr, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const getStatusSeverity = (status: string) => {
  const map: Record<string, string> = { success: 'success', failed: 'danger', pending: 'warn', initiated: 'info' }
  return map[status] ?? 'secondary'
}
</script>

<style scoped>
.transaction-detail { max-width: 1200px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0 8px 0 0; display: inline; }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.info-card, .section-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 20px;
}

.section-card { margin-bottom: 16px; }
.card-title { font-size: 14px; font-weight: 600; color: #1a1a2e; margin: 0 0 16px 0; }
.info-list { display: flex; flex-direction: column; gap: 10px; }
.info-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.info-label { font-size: 13px; color: #6b7280; }
.info-value { font-size: 13px; font-weight: 500; color: #1a1a2e; }
.info-value.mono { font-family: monospace; font-size: 11px; }
/*
 * Empty placeholder — previously just floated 13px text on a blank
 * card with no min-height. Now centered in a 96px slot so the empty
 * Webhooks / Attempts cards keep visual parity with the populated
 * DataTable variant.
 */
.empty-text {
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
  margin: 0;
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
