<template>
  <div class="admin-rates">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ $t('admin.rates.title') }}</h1>
        <p class="page-subtitle">{{ $t('admin.rates.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <Button :label="$t('common.add')" icon="pi pi-plus" @click="showAddDialog = true" />
      </div>
    </div>

    <div class="table-card">
      <DataTable :value="rates" :loading="loading" stripedRows size="small" :rows="25" paginator editMode="cell" @cell-edit-complete="onCellEdit">
        <Column field="currency_from" :header="$t('admin.rates.from')" style="width: 100px" />
        <Column field="currency_to" :header="$t('admin.rates.to')" style="width: 100px" />
        <Column field="rate" :header="$t('admin.rates.rate')" style="width: 150px">
          <template #body="{ data }">
            {{ data.rate }}
          </template>
          <template #editor="{ data, field }">
            <InputNumber v-model="data[field]" :minFractionDigits="2" :maxFractionDigits="6" />
          </template>
        </Column>
        <Column field="source" :header="$t('admin.rates.source')" style="width: 120px">
          <template #body="{ data }">
            <Tag :value="t(`rateSource.${data.source}`)" :severity="data.source === 'manual' ? 'warn' : 'info'" />
          </template>
        </Column>
        <Column :header="$t('admin.rates.active')" style="width: 80px">
          <template #body="{ data }">
            <ToggleSwitch v-model="data.is_active" @change="onToggleActive(data)" />
          </template>
        </Column>
        <Column :header="$t('admin.rates.updatedAt')" style="width: 140px">
          <template #body="{ data }">
            {{ formatDate(data.updated_at) }}
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="showAddDialog" :header="$t('admin.rates.addRate')" :modal="true" :style="{ width: '400px' }">
      <div class="dialog-form">
        <div class="form-group">
          <label class="form-label">{{ $t('admin.rates.fromCurrency') }}</label>
          <InputText v-model="newRate.currency_from" placeholder="XOF" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('admin.rates.toCurrency') }}</label>
          <InputText v-model="newRate.currency_to" placeholder="EUR" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('admin.rates.rate') }}</label>
          <InputNumber v-model="newRate.rate" :minFractionDigits="2" :maxFractionDigits="6" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text severity="secondary" @click="showAddDialog = false" />
        <Button :label="$t('common.add')" icon="pi pi-check" @click="handleAddRate" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const loading = ref(false)
const showAddDialog = ref(false)
const { t, locale } = useI18n()

const newRate = ref({
  currency_from: '',
  currency_to: '',
  rate: 0,
})

// Rates data
const rates = ref<any[]>([])

onMounted(async () => {
  loading.value = true
  try {
    const { fetchExchangeRates } = useAdmin()
    const res = await fetchExchangeRates()
    if (res?.data?.data) {
      rates.value = res.data.data
    } else if (res?.data) {
      rates.value = res.data
    }
  } catch (e: any) {
    // Show empty state on error
    rates.value = []
  } finally {
    loading.value = false
  }
})

const onCellEdit = async (event: any) => {
  const { data, newValue, field } = event
  if (field === 'rate' && newValue !== data.rate) {
    data.rate = newValue
    try {
      const { updateExchangeRate } = useAdmin()
      await updateExchangeRate(data.id, { rate: newValue })
    } catch {
      // silent fail
    }
  }
}

const onToggleActive = async (data: any) => {
  try {
    const { updateExchangeRate } = useAdmin()
    await updateExchangeRate(data.id, { is_active: data.is_active })
  } catch {
    // silent fail
  }
}

const handleAddRate = async () => {
  if (!newRate.value.currency_from || !newRate.value.currency_to || !newRate.value.rate) return
  try {
    const { createExchangeRate } = useAdmin()
    const res = await createExchangeRate({
      currency_from: newRate.value.currency_from.toUpperCase(),
      currency_to: newRate.value.currency_to.toUpperCase(),
      rate: newRate.value.rate,
    })
    if (res?.data) {
      rates.value.push(res.data)
    }
  } catch {
    // Error handled by API layer
  }
  showAddDialog.value = false
  newRate.value = { currency_from: '', currency_to: '', rate: 0 }
}

const formatDate = (date: string) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(date).toLocaleDateString(localeStr, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.admin-rates { max-width: 1200px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.header-left { flex: 1; }
.page-title { font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0; }
.page-subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }

.table-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.dialog-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 12px; font-weight: 500; color: #6b7280; }
</style>
