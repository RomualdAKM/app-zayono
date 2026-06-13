<template>
  <div class="page">
    <div class="page-header-row">
      <p class="page-subtitle">{{ $t('payoutsPage.list.subtitleIndex') }}</p>
      <Button :label="$t('gatewaysPage.connectGateway')" icon="pi pi-plus" class="primary-cta" @click="goToCatalog" />
    </div>

    <div v-if="loading" class="card loading">
      <Skeleton height="3rem" class="mb-2" />
      <Skeleton v-for="i in 4" :key="i" height="2.5rem" class="mb-1" />
    </div>

    <div v-else-if="rows.length === 0" class="card empty-state">
      <AppIcon name="inbox" class="empty-icon" />
      <p class="empty-title">{{ $t('payoutsPage.list.emptyTitle') }}</p>
      <p class="empty-desc">{{ $t('payoutsPage.list.emptyDesc') }}</p>
      <Button :label="$t('gatewaysPage.viewAvailable')" icon="pi pi-plus" class="primary-cta" @click="goToCatalog" />
    </div>

    <div v-else class="card table-card">
      <DataTable :value="rows" class="gw-table" rowHover>
        <Column :header="$t('gatewaysPage.columns.number')" style="width: 60px;">
          <template #body="{ index }">
            <span class="row-num">{{ index + 1 }}</span>
          </template>
        </Column>
        <Column :header="$t('gatewaysPage.columns.gateway')">
          <template #body="{ data }">
            <div class="gw-cell">
              <GatewayLogo :code="data.aggregator_code" :name="data.name" />
              <div>
                <span class="gw-cell-name">{{ data.name }}</span>
                <span class="gw-cell-desc">{{ data.description || '' }}</span>
              </div>
            </div>
          </template>
        </Column>
        <Column :header="$t('gatewaysPage.columns.addedOn')">
          <template #body="{ data }">
            <span class="date-cell">{{ formatDate(data.configured_at) }}</span>
          </template>
        </Column>
        <Column :header="$t('gatewaysPage.columns.actions')" style="width: 100px; text-align: center;">
          <template #body="{ data }">
            <Button icon="pi pi-eye" text rounded size="small" @click="goToDetail(data.aggregator_code)" />
          </template>
        </Column>
      </DataTable>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const router = useRouter()
const { getConfigs, getAvailable } = useAggregatorConfigs('payout')
const { t, locale } = useI18n()

interface Row {
  id: string
  aggregator_code: string
  name: string
  description: string | null
  configured_at: string
}

const loading = ref(true)
const rows = ref<Row[]>([])

const initials = (name: string) => name.substring(0, 2).toUpperCase()

const load = async () => {
  loading.value = true
  try {
    const [configsRes, availableRes] = await Promise.all([getConfigs(), getAvailable()])
    const meta: Record<string, { name: string; description: string | null }> = {}
    for (const a of availableRes.data || []) {
      meta[a.code] = { name: a.name, description: a.description }
    }

    rows.value = (configsRes.data || []).flatMap(group =>
      group.environments.map(env => ({
        id: env.id,
        aggregator_code: group.aggregator_code,
        name: meta[group.aggregator_code]?.name || group.aggregator_code,
        description: meta[group.aggregator_code]?.description || null,
        configured_at: env.configured_at || '',
      }))
    )
  } catch {
    toast.add({ severity: 'error', summary: t('gatewaysPage.errorSummary'), detail: t('gatewaysPage.loadError'), life: 4000 })
  } finally {
    loading.value = false
  }
}

onMounted(load)

const goToCatalog = () => router.push('/payouts/gateways/list')
const goToDetail = (code: string) => router.push(`/payouts/gateways/${code}`)

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—'
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(dateStr).toLocaleDateString(localeStr, { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.page { min-height: 100%; }

.page-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.page-subtitle {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0;
}

.primary-cta {
  background: var(--ze-brand);
  border-color: var(--ze-brand);
  border-radius: 6px;
}
.primary-cta:hover { background: var(--ze-brand-hover) !important; border-color: var(--ze-brand-hover) !important; }

.card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
}

.table-card { padding: 0; overflow: hidden; overflow-x: auto; }
.loading { padding: 24px; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 24px;
  gap: 8px;
}

.empty-icon {
  font-size: 2rem;
  color: var(--ze-text-disabled);
  margin-bottom: 8px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0;
}

.empty-desc {
  font-size: 13px;
  color: var(--ze-text-muted);
  max-width: 420px;
  margin: 0 0 12px;
  line-height: 1.5;
}

.gw-table {
  background: var(--ze-bg-card);
  border: none;
}

.gw-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gw-cell-logo {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: var(--ze-icon-circle-bg);
  color: var(--ze-icon-circle-fg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.gw-cell-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--ze-text-body);
}

.gw-cell-desc {
  display: block;
  font-size: 12px;
  color: var(--ze-text-muted);
  margin-top: 2px;
}

.row-num {
  font-size: 12px;
  color: var(--ze-text-disabled);
  font-variant-numeric: tabular-nums;
}

.date-cell {
  font-size: 13px;
  color: var(--ze-text-muted);
  font-variant-numeric: tabular-nums;
}

:deep(.p-datatable-thead > tr > th) {
  background: var(--ze-bg-subtle);
  color: var(--ze-text-muted);
  font-size: 12px;
  font-weight: 500;
  text-transform: none;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ze-border);
}
:deep(.p-datatable-tbody > tr > td) {
  padding: 14px;
  font-size: 13px;
  color: var(--ze-text-body);
  border-bottom: 1px solid var(--ze-border-subtle);
}
:deep(.p-datatable-tbody > tr:last-child > td) {
  border-bottom: none;
}
</style>
