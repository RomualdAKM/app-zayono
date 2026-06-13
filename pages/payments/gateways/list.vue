<template>
  <div class="page">
    <div class="page-header-row">
      <div>
        <p class="page-subtitle">{{ $t('gatewaysPage.catalogIntro') }}</p>
      </div>
      <Button :label="$t('common.back')" icon="pi pi-arrow-left" class="outline-pill" @click="router.push('/payments/gateways')" />
    </div>

    <!-- Filters -->
    <div class="card filters-card">
      <div class="filters">
        <span class="search-wrap">
          <AppIcon name="search" />
          <InputText v-model="search" :placeholder="$t('gatewaysPage.filters.searchPlaceholder')" class="search-input" />
        </span>
        <Select
          v-model="countryFilter"
          :options="countryOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="$t('gatewaysPage.filters.country')"
          showClear
          class="filter-dropdown"
        />
        <Select
          v-model="currencyFilter"
          :options="currencyOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="$t('gatewaysPage.filters.currency')"
          showClear
          class="filter-dropdown"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <Skeleton v-for="i in 6" :key="i" height="200px" class="loading-card" />
    </div>

    <!-- Empty filtered state -->
    <div v-else-if="filtered.length === 0" class="card empty-state">
      <AppIcon name="inbox" class="empty-icon" />
      <p class="empty-title">{{ $t('gatewaysPage.noMatch') }}</p>
      <p class="empty-desc">{{ $t('gatewaysPage.noMatchHint') }}</p>
    </div>

    <!-- Grid -->
    <div v-else class="grid">
      <GatewayCard
        v-for="agg in filtered"
        :key="agg.code"
        :aggregator="agg"
        @details="openDetails(agg)"
        @connect="goConnect(agg)"
      />
    </div>

    <!-- Details modal -->
    <GatewayDetailsModal
      v-model="showDetails"
      :aggregator="selectedAgg"
      @connect="confirmConnectFromModal"
    />

  </div>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import type { AvailableAggregator } from '~/composables/useAggregatorConfigs'

const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const { getAvailable } = useAggregatorConfigs('payment')
const { catalog, load: loadOps } = useOperators()

const loading = ref(true)
const aggregators = ref<AvailableAggregator[]>([])
const search = ref('')
const countryFilter = ref<string | null>(null)
const currencyFilter = ref<string | null>(null)
const showDetails = ref(false)
const selectedAgg = ref<AvailableAggregator | null>(null)

const load = async () => {
  loading.value = true
  try {
    const [availableRes] = await Promise.all([getAvailable(), loadOps()])
    aggregators.value = availableRes.data || []
  } catch {
    toast.add({ severity: 'error', summary: t('status.error'), detail: t('gatewaysPage.catalogLoadError'), life: 4000 })
  } finally {
    loading.value = false
  }
}

onMounted(load)

const countryOptions = computed(() =>
  catalog.value.countries.map(c => ({ label: c.name, value: c.code }))
)

const currencyOptions = computed(() =>
  catalog.value.currencies.map(c => ({ label: c, value: c }))
)

const filtered = computed(() => {
  let result = [...aggregators.value]
  const q = search.value.trim().toLowerCase()
  if (q) {
    result = result.filter(
      a =>
        a.name.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
    )
  }
  if (countryFilter.value) {
    result = result.filter(a => a.supported_countries.includes(countryFilter.value!))
  }
  if (currencyFilter.value) {
    result = result.filter(a => a.supported_currencies.includes(currencyFilter.value!))
  }
  return result
})

const openDetails = (agg: AvailableAggregator) => {
  selectedAgg.value = agg
  showDetails.value = true
}

const goConnect = (agg: AvailableAggregator) => {
  router.push(`/payments/gateways/${agg.code}?connect=1`)
}

const confirmConnectFromModal = () => {
  if (!selectedAgg.value) return
  showDetails.value = false
  goConnect(selectedAgg.value)
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

.outline-pill {
  color: var(--ze-brand) !important;
  background: var(--ze-bg-card) !important;
  border: 1px solid var(--ze-brand-border) !important;
  border-radius: 999px !important;
  padding: 6px 14px !important;
}

.card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.filters-card { padding: 16px 20px; }

.filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-wrap {
  position: relative;
  flex: 1;
  min-width: 240px;
  max-width: 360px;
}

.search-wrap i {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ze-text-disabled);
  font-size: 13px;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding-left: 36px;
}

.filter-dropdown {
  min-width: 200px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 24px;
  gap: 6px;
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
  margin: 0;
}

.loading,
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.loading-card {
  border-radius: 10px !important;
}

@media (max-width: 1024px) {
  .loading,
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .loading,
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
