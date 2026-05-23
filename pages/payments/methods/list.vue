<template>
  <div class="page">
    <p class="page-subtitle">{{ $t('methodsPage.subtitleCatalog') }}</p>

    <div class="card">
    <div class="card-head">
      <h2 class="card-title">{{ $t('methodsPage.catalogTitle') }}</h2>
      <Button class="outline-btn" :label="$t('common.back')" icon="pi pi-arrow-left" @click="router.push('/payments/methods')" />
    </div>

    <!-- Filters -->
    <div class="filters">
      <Select
        v-model="countryFilter"
        :options="countryOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="$t('methodsPage.filters.country2')"
        showClear
        class="filter-dropdown"
      />
      <Select
        v-model="currencyFilter"
        :options="currencyOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="$t('methodsPage.filters.currency')"
        showClear
        class="filter-dropdown"
      />
      <span class="search-wrap">
        <AppIcon name="search" />
        <InputText v-model="search" :placeholder="$t('methodsPage.filters.searchPlaceholder')" class="search-input" />
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <Skeleton v-for="i in 6" :key="i" height="140px" class="loading-card" />
    </div>

    <!-- Grid -->
    <div v-else class="grid">
      <div v-for="op in filtered" :key="op.code" class="m-card">
        <div class="m-card-head">
          <MethodLogo :name="op.name" />
          <div>
            <h3 class="m-card-name">{{ op.name }}</h3>
            <span class="m-card-meta">{{ countryLabel(op.country) }} · {{ op.currency }}</span>
          </div>
        </div>
        <p class="m-card-desc">
          {{ op.available_aggregators.length > 1
            ? $t('methodsPage.card.availableAtPlural', { count: op.available_aggregators.length })
            : $t('methodsPage.card.availableAt', { count: op.available_aggregators.length }) }}
        </p>
        <div class="m-card-foot">
          <Tag v-if="isAlreadyAvailable(op.code)" :value="$t('methodsPage.card.availableTag')" severity="success" class="status-tag" />
          <Button
            :class="isAlreadyAvailable(op.code) ? 'outline-btn' : 'primary-btn'"
            :label="isAlreadyAvailable(op.code) ? $t('methodsPage.card.manage') : $t('methodsPage.card.connect')"
            size="small"
            @click="connectMethod(op)"
          />
        </div>
      </div>
    </div>
    </div>

    <!-- No compatible gateway dialog -->
    <Dialog v-model:visible="showNoGwDialog" :modal="true" :style="{ width: '440px' }" :header="$t('methodsPage.noGatewayDialog.title')">
      <div class="warning-box">
        <AppIcon name="exclamation-triangle" />
        <p>{{ $t('methodsPage.noGatewayDialog.body', { name: selectedMethod?.name }) }}</p>
      </div>
      <template #footer>
        <Button :label="$t('methodsPage.noGatewayDialog.close')" severity="secondary" text @click="showNoGwDialog = false" />
        <Button :label="$t('gatewaysPage.viewAvailable')" @click="goToGatewaysList" />
      </template>
    </Dialog>

    <Toast position="top-right" />
  </div>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import type { BackendOperator } from '~/composables/useOperators'

const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const { list } = useMethods('payment')
const { getConfigs } = useAggregatorConfigs('payment')
const { catalog, load: loadOps } = useOperators()

const loading = ref(true)
const search = ref('')
const countryFilter = ref<string | null>(null)
const currencyFilter = ref<string | null>(null)
const configuredCodes = ref<string[]>([])
const enabledOperatorCodes = ref<Set<string>>(new Set())
const showNoGwDialog = ref(false)
const selectedMethod = ref<BackendOperator | null>(null)

const load = async () => {
  loading.value = true
  try {
    await loadOps()
    const [methodsRes, configsRes] = await Promise.all([list(), getConfigs()])
    configuredCodes.value = (configsRes.data || []).map(c => c.aggregator_code)
    enabledOperatorCodes.value = new Set(
      (methodsRes.data || []).map(m => m.operator)
    )
  } catch {
    toast.add({ severity: 'error', summary: t('status.error'), detail: t('methodsPage.catalogLoadError'), life: 4000 })
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
  let result = [...catalog.value.operators]
  const q = search.value.trim().toLowerCase()
  if (q) {
    result = result.filter(o => o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q))
  }
  if (countryFilter.value) result = result.filter(o => o.country === countryFilter.value)
  if (currencyFilter.value) result = result.filter(o => o.currency === currencyFilter.value)
  return result
})

const isAlreadyAvailable = (operatorCode: string) => enabledOperatorCodes.value.has(operatorCode)

const connectMethod = (op: BackendOperator) => {
  // Already auto-created via the gateway? Send the user to /methods so they can toggle on.
  if (enabledOperatorCodes.value.has(op.code)) {
    router.push('/payments/methods')
    return
  }
  // No compatible gateway connected for this operator
  const compatibles = op.available_aggregators.filter(a => configuredCodes.value.includes(a))
  if (compatibles.length === 0) {
    selectedMethod.value = op
    showNoGwDialog.value = true
    return
  }
  // Edge case: gateway connected but auto-creation didn't run; nudge user to the methods table.
  router.push('/payments/methods')
}

const goToGatewaysList = () => {
  showNoGwDialog.value = false
  router.push('/payments/gateways/list')
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

.outline-btn {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-brand-border);
  color: var(--ze-brand);
  border-radius: 999px;
  font-weight: 500;
}

.outline-btn:hover {
  background: var(--ze-brand-bg-soft) !important;
  border-color: var(--ze-brand-border) !important;
  color: var(--ze-brand-hover) !important;
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

.loading,
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.loading-card {
  border-radius: 8px !important;
}

.m-card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.m-card-head {
  display: flex;
  gap: 10px;
  align-items: center;
}

.m-card-icon {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: var(--ze-icon-circle-bg);
  color: var(--ze-icon-circle-fg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.m-card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0;
}

.m-card-meta {
  font-size: 12px;
  color: var(--ze-text-muted);
}

.m-card-desc {
  font-size: 12px;
  color: var(--ze-text-muted);
  margin: 0;
  line-height: 1.5;
}

.m-card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--ze-border-subtle);
  padding-top: 12px;
  margin-top: auto;
}

.status-tag {
  font-size: 11px !important;
}

/* Banner — Linear/Stripe style: neutral surface + 3px accent strip */
.warning-box {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 14px;
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-left: 3px solid var(--ze-danger-fg);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ze-text-body);
}

.warning-box i {
  font-size: 14px;
  /* Match the text's `line-height: 1.5`. With both icon and text having
     the same line-box height (and flex-start), their glyphs sit on the
     same visual baseline — no more triangle-floating-above-text. */
  line-height: 1.5;
  color: var(--ze-danger-fg);
  flex-shrink: 0;
}

.warning-box strong {
  color: var(--ze-text-strong);
  font-weight: 600;
}

@media (max-width: 1024px) {
  .loading, .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .loading, .grid { grid-template-columns: 1fr; }
}
</style>
