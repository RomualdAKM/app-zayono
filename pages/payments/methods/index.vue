<template>
  <div class="page">
    <p class="page-subtitle">{{ $t('methodsPage.subtitleIndex') }}</p>

    <div class="card">
    <div class="card-head">
      <div>
        <h2 class="card-title">{{ $t('methodsPage.title') }}</h2>
      </div>
      <Button class="primary-btn" :label="$t('methodsPage.addMethod')" icon="pi pi-plus" @click="router.push('/payments/methods/list')" />
    </div>

    <!-- Filters -->
    <div class="filters">
      <span class="search-wrap">
        <AppIcon name="search" />
        <InputText v-model="search" :placeholder="$t('methodsPage.filters.searchPlaceholder')" class="search-input" />
      </span>
      <Select
        v-model="statusFilter"
        :options="statusOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="$t('methodsPage.filters.status')"
        showClear
        class="filter-dropdown"
      />
      <Select
        v-model="gatewayFilter"
        :options="gatewayOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="$t('methodsPage.filters.gateway')"
        showClear
        class="filter-dropdown"
      />
      <Select
        v-model="countryFilter"
        :options="countryOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="$t('methodsPage.filters.country')"
        showClear
        class="filter-dropdown"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <Skeleton v-for="i in 6" :key="i" height="2.5rem" class="mb-1" />
    </div>

    <!-- Empty: no gateway at all -->
    <div v-else-if="methods.length === 0" class="empty-state">
      <AppIcon name="inbox" class="empty-icon" />
      <h3 class="empty-title">{{ $t('methodsPage.emptyActive') }}</h3>
      <p class="empty-desc">{{ $t('methodsPage.emptyActiveHint') }}</p>
      <Button class="primary-btn" :label="$t('gatewaysPage.viewAvailable')" icon="pi pi-plus" @click="router.push('/payments/gateways/list')" />
    </div>

    <!-- Filtered empty -->
    <div v-else-if="filtered.length === 0" class="empty-state">
      <AppIcon name="inbox" class="empty-icon" />
      <h3 class="empty-title">{{ $t('methodsPage.noMatchFilters') }}</h3>
    </div>

    <!-- Methods table -->
    <DataTable v-else :value="filtered" class="m-table" stripedRows rowHover>
      <Column :header="$t('methodsPage.columns.number')" style="width: 60px;">
        <template #body="{ index }">
          <span class="row-num">{{ index + 1 }}</span>
        </template>
      </Column>
      <Column :header="$t('methodsPage.columns.name')">
        <template #body="{ data }">
          <div class="m-cell">
            <MethodLogo :name="data.operator_name" />
            <div>
              <span class="m-name">{{ data.operator_name }}</span>
              <span class="m-meta">{{ countryLabel(data.country) }} · {{ currencyDisplay(data.currency) }}</span>
            </div>
          </div>
        </template>
      </Column>
      <Column :header="$t('methodsPage.columns.primaryGateway')">
        <template #body="{ data }">
          <span class="gw-badge">{{ aggregatorLabel(data.aggregator_code) }}</span>
        </template>
      </Column>
      <Column :header="$t('methodsPage.columns.fallbackGateway')">
        <template #body="{ data }">
          <span v-if="data.fallback_aggregator" class="gw-badge fallback">{{ aggregatorLabel(data.fallback_aggregator) }}</span>
          <span v-else class="muted">—</span>
        </template>
      </Column>
      <Column :header="$t('methodsPage.columns.fee')" style="width: 90px;">
        <template #body="{ data }">
          <span v-if="data.fee_percent && data.fee_percent > 0" class="fee-badge">{{ formatFee(data.fee_percent) }}</span>
          <span v-else class="muted">—</span>
        </template>
      </Column>
      <Column :header="$t('methodsPage.columns.status')" style="width: 120px;">
        <template #body="{ data }">
          <ToggleSwitch
            :modelValue="data.is_active"
            @update:modelValue="onToggle(data)"
          />
        </template>
      </Column>
      <Column header="" style="width: 80px; text-align: center;">
        <template #body="{ data }">
          <Button icon="pi pi-pencil" text size="small" @click="openEdit(data)" />
        </template>
      </Column>
    </DataTable>
    </div>

    <MethodAssignDialog
      v-model="showEdit"
      :method="editingMethod"
      purpose="payment"
      :configured-aggregator-codes="configuredCodes"
      :saving="savingEdit"
      @submit="handleAssign"
    />

    <Toast position="top-right" />
  </div>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import type { MerchantMethod } from '~/composables/useMethods'

const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const { list, update, toggle } = useMethods('payment')
const { getConfigs, getAvailable } = useAggregatorConfigs('payment')
const { catalog, load: loadOps } = useOperators()

const loading = ref(true)
const savingEdit = ref(false)
const methods = ref<MerchantMethod[]>([])
const configuredCodes = ref<string[]>([])
const availableAggregators = ref<Record<string, string>>({})

const search = ref('')
const statusFilter = ref<string | null>(null)
const gatewayFilter = ref<string | null>(null)
const countryFilter = ref<string | null>(null)

const showEdit = ref(false)
const editingMethod = ref<MerchantMethod | null>(null)

const statusOptions = computed(() => [
  { label: t('methodsPage.statusOptions.active'), value: 'active' },
  { label: t('methodsPage.statusOptions.inactive'), value: 'inactive' },
])

const load = async () => {
  loading.value = true
  try {
    const [methodsRes, configsRes, availRes] = await Promise.all([
      list(),
      getConfigs(),
      getAvailable(),
      loadOps(),
    ])
    methods.value = methodsRes.data || []
    configuredCodes.value = (configsRes.data || []).map(c => c.aggregator_code)
    for (const a of availRes.data || []) {
      availableAggregators.value[a.code] = a.name
    }
  } catch (e: any) {
    toast.add({ severity: 'error', summary: t('methodsPage.loadErrorSummary'), detail: e?.data?.message || t('methodsPage.loadError'), life: 4000 })
  } finally {
    loading.value = false
  }
}

onMounted(load)

const gatewayOptions = computed(() =>
  Object.entries(availableAggregators.value).map(([code, name]) => ({ label: name, value: code }))
)

const countryOptions = computed(() =>
  catalog.value.countries.map(c => ({ label: c.name, value: c.code }))
)

const aggregatorLabel = (code: string) => availableAggregators.value[code] || code
const countryLabel = (code: string) => {
  // `XX` is the synthetic international sentinel (Stripe card).
  if (code === 'XX') return t('methodsPage.international')
  return catalog.value.countries.find(c => c.code === code)?.name || code
}
const currencyDisplay = (code: string) => code === '*' ? t('methodsPage.allCurrencies') : code

const filtered = computed(() => {
  let result = [...methods.value]
  const q = search.value.trim().toLowerCase()
  if (q) {
    result = result.filter(m => m.operator_name.toLowerCase().includes(q) || m.operator.toLowerCase().includes(q))
  }
  if (statusFilter.value === 'active') result = result.filter(m => m.is_active)
  if (statusFilter.value === 'inactive') result = result.filter(m => !m.is_active)
  if (gatewayFilter.value) result = result.filter(m => m.aggregator_code === gatewayFilter.value)
  if (countryFilter.value) result = result.filter(m => m.country === countryFilter.value)
  return result
})

const onToggle = async (method: MerchantMethod) => {
  // Optimistic flip
  method.is_active = !method.is_active
  try {
    await toggle(method.id)
  } catch (e: any) {
    method.is_active = !method.is_active // rollback
    toast.add({ severity: 'error', summary: t('status.error'), detail: e?.data?.message || t('methodsPage.toggleError'), life: 4000 })
  }
}

const openEdit = (method: MerchantMethod) => {
  editingMethod.value = method
  showEdit.value = true
}

const handleAssign = async (payload: { aggregator_code: string; fallback_aggregator: string | null; fee_percent: number | null }) => {
  if (!editingMethod.value) return
  savingEdit.value = true
  try {
    const res = await update(editingMethod.value.id, payload)
    const idx = methods.value.findIndex(m => m.id === editingMethod.value!.id)
    if (idx >= 0) methods.value[idx] = res.data
    toast.add({ severity: 'success', summary: t('methodsPage.updateSuccess'), life: 3000 })
    showEdit.value = false
  } catch (e: any) {
    toast.add({ severity: 'error', summary: t('status.error'), detail: e?.data?.message || t('methodsPage.updateError'), life: 4000 })
  } finally {
    savingEdit.value = false
  }
}

const formatFee = (pct: number) => {
  const formatted = pct.toFixed(pct % 1 === 0 ? 0 : 2)
  return `${formatted} %`
}
</script>

<style scoped>
.page { background: transparent; min-height: 100%; }

.page-subtitle {
  font-size: 13px;
  font-weight: 400;
  color: var(--ze-text-muted);
  margin: 0 0 16px 0;
}

.card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0;
}

.primary-btn {
  background: var(--ze-brand);
  border: 1px solid var(--ze-brand);
  color: var(--ze-brand-fg);
  border-radius: 6px;
  font-weight: 500;
}

.primary-btn:hover {
  background: var(--ze-brand-hover) !important;
  border-color: var(--ze-brand-hover) !important;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-wrap {
  position: relative;
  flex: 1;
  min-width: 240px;
  max-width: 320px;
}

.search-wrap i {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ze-text-disabled);
  font-size: 13px;
}

.search-input {
  width: 100%;
  padding-left: 36px;
}

.filter-dropdown {
  min-width: 180px;
}

.loading {
  padding: 16px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  text-align: center;
  gap: 8px;
}

.empty-icon {
  font-size: 2rem;
  color: var(--ze-text-disabled);
  margin-bottom: 4px;
}

.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0;
}

.empty-desc {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0 0 8px 0;
  max-width: 440px;
}

.m-table {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  overflow: hidden;
  overflow-x: auto;
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
  font-variant-numeric: tabular-nums;
}

:deep(.p-datatable-tbody > tr:last-child > td) {
  border-bottom: none;
}

.row-num {
  font-size: 12px;
  color: var(--ze-text-disabled);
}

.m-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.m-icon {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: var(--ze-icon-circle-bg);
  color: var(--ze-icon-circle-fg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.m-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--ze-text-body);
}

.m-meta {
  display: block;
  font-size: 12px;
  color: var(--ze-text-muted);
}

.gw-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: var(--ze-brand-bg-soft);
  color: var(--ze-brand);
}

.gw-badge.fallback {
  background: var(--ze-bg-hover);
  color: var(--ze-text-label);
}

.fee-badge {
  display: inline-block;
  padding: 3px 8px;
  background: var(--ze-warning-bg);
  color: var(--ze-warning-fg);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.muted {
  color: var(--ze-text-disabled);
}
</style>
