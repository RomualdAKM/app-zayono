<template>
  <div class="merchant-detail">
    <div class="page-header">
      <div class="header-left">
        <Button icon="pi pi-arrow-left" text severity="secondary" @click="$router.push('/admin/merchants')" />
        <div>
          <h1 class="page-title">{{ merchant?.name ?? $t('admin.merchantDetail.fallbackName') }}</h1>
          <p class="page-subtitle">{{ merchant?.company_name }}</p>
        </div>
      </div>
      <div class="header-actions">
        <Button
          v-if="isSuperAdmin"
          :label="$t('admin.merchantDetail.demote')"
          icon="pi pi-user-minus"
          severity="warn"
          outlined
          :loading="roleSaving"
          @click="handleDemote"
        />
        <Button
          v-else
          :label="$t('admin.merchantDetail.promote')"
          icon="pi pi-user-plus"
          severity="info"
          outlined
          :loading="roleSaving"
          @click="handlePromote"
        />
        <!-- Live toggle is hidden for the platform merchant: disabling its
             live mode would halt all invoice collection (guarded server-side
             too). -->
        <Button
          v-if="merchant && !merchant.is_platform && merchant.live_approved_at"
          :label="$t('admin.merchantDetail.revokeLive')"
          icon="pi pi-lock"
          severity="warn"
          outlined
          :loading="liveSaving"
          @click="handleRevokeLive"
        />
        <Button
          v-else-if="merchant && !merchant.is_platform"
          :label="$t('admin.merchantDetail.approveLive')"
          icon="pi pi-lock-open"
          severity="success"
          outlined
          :loading="liveSaving"
          @click="handleApproveLive"
        />
        <Button v-if="merchant?.is_active" :label="$t('admin.merchantDetail.suspend')" icon="pi pi-ban" severity="danger" outlined @click="handleSuspend" />
        <Button v-else :label="$t('admin.merchantDetail.activate')" icon="pi pi-check" severity="success" outlined @click="handleActivate" />
      </div>
    </div>

    <div class="detail-grid">
      <div class="info-card">
        <h3 class="card-title">{{ $t('admin.merchantDetail.information') }}</h3>
        <div class="info-list">
          <div class="info-row"><span class="info-label">{{ $t('admin.merchantDetail.fields.name') }}</span><span class="info-value">{{ merchant?.name }}</span></div>
          <div class="info-row"><span class="info-label">{{ $t('admin.merchantDetail.fields.email') }}</span><span class="info-value">{{ merchant?.email }}</span></div>
          <div class="info-row"><span class="info-label">{{ $t('admin.merchantDetail.fields.company') }}</span><span class="info-value">{{ merchant?.company_name }}</span></div>
          <div class="info-row"><span class="info-label">{{ $t('admin.merchantDetail.fields.phone') }}</span><span class="info-value">{{ merchant?.phone ?? '-' }}</span></div>
          <div class="info-row"><span class="info-label">{{ $t('admin.merchantDetail.fields.country') }}</span><span class="info-value">{{ merchant?.country ?? '-' }}</span></div>
          <div class="info-row">
            <span class="info-label">{{ $t('admin.merchantDetail.fields.status') }}</span>
            <Tag :value="merchant?.is_active ? $t('admin.merchantDetail.active') : $t('admin.merchantDetail.suspended')" :severity="merchant?.is_active ? 'success' : 'danger'" />
          </div>
          <div class="info-row">
            <span class="info-label">{{ $t('admin.merchantDetail.fields.verified') }}</span>
            <span class="info-value">{{ merchant?.email_verified_at ? $t('admin.merchantDetail.yes') : $t('admin.merchantDetail.no') }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ $t('admin.merchantDetail.fields.liveMode') }}</span>
            <Tag
              :value="merchant?.live_approved_at ? $t('admin.merchantDetail.liveEnabled') : $t('admin.merchantDetail.liveDisabled')"
              :severity="merchant?.live_approved_at ? 'success' : 'warn'"
            />
          </div>
        </div>
      </div>

      <div class="edit-card">
        <h3 class="card-title">{{ $t('admin.merchantDetail.settings') }}</h3>
        <div class="form-group">
          <label class="form-label">{{ $t('admin.merchantDetail.zayonoFee') }}</label>
          <InputNumber v-model="editFee" :min="0" :max="10" :minFractionDigits="1" :maxFractionDigits="3" suffix="%" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('admin.merchantDetail.statusLabel') }}</label>
          <Select v-model="editStatus" :options="statusOptions" optionLabel="label" optionValue="value" />
        </div>
        <Button :label="$t('admin.merchantDetail.save')" icon="pi pi-save" @click="handleSave" :loading="saving" />
      </div>

      <div class="stats-card">
        <h3 class="card-title">{{ $t('admin.merchantDetail.statistics') }}</h3>
        <div class="stat-grid">
          <div class="stat-item">
            <span class="stat-value">{{ stats.transaction_count }}</span>
            <span class="stat-label">{{ $t('admin.merchantDetail.stats.transactions') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.success_rate }}%</span>
            <span class="stat-label">{{ $t('admin.merchantDetail.stats.successRate') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ formatVolumeXof(stats.transaction_volume) }}</span>
            <span class="stat-label">{{ $t('admin.merchantDetail.stats.totalVolume') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.last_activity ? formatDate(stats.last_activity) : '-' }}</span>
            <span class="stat-label">{{ $t('admin.merchantDetail.stats.lastActivity') }}</span>
          </div>
        </div>
      </div>

      <div class="revenue-card">
        <h3 class="card-title">{{ $t('admin.merchantDetail.revenueTitle') }}</h3>
        <p class="card-subtitle" v-html="$t('admin.merchantDetail.revenueSubtitle', { percent: (stats.zayono_fee_percent ?? 0).toFixed(3) })" />
        <div class="stat-grid">
          <div class="stat-item revenue-stat">
            <span class="stat-value revenue-value">{{ formatRevenueUsd(stats.zayono_revenue_all_time ?? 0) }}</span>
            <span class="stat-label">{{ $t('admin.merchantDetail.revenue.allTime') }}</span>
          </div>
          <div class="stat-item revenue-stat">
            <span class="stat-value revenue-value">{{ formatRevenueUsd(stats.zayono_revenue_last_30d ?? 0) }}</span>
            <span class="stat-label">{{ $t('admin.merchantDetail.revenue.last30d') }}</span>
          </div>
          <div class="stat-item revenue-stat">
            <span class="stat-value">{{ (stats.zayono_fee_percent ?? 0).toFixed(3) }}%</span>
            <span class="stat-label">{{ $t('admin.merchantDetail.revenue.activeCommission') }}</span>
          </div>
          <div class="stat-item revenue-stat">
            <span class="stat-value">{{ stats.applications_count ?? 0 }}</span>
            <span class="stat-label">{{ $t('admin.merchantDetail.revenue.applications') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const route = useRoute()
const adminStore = useAdminStore()
const { fetchMerchant, updateMerchant, suspendMerchant, activateMerchant, approveLiveMerchant, revokeLiveMerchant } = useAdmin()
const { apiFetch } = useApi()
const { t, locale } = useI18n()

const merchant = ref<any>(null)
const stats = ref({
  transaction_count: 0,
  success_rate: 0,
  transaction_volume: 0,
  last_activity: null as string | null,
  applications_count: 0,
  zayono_revenue_all_time: 0,
  zayono_revenue_last_30d: 0,
  zayono_fee_percent: 0,
})
const editFee = ref<number>(0.1)
const editStatus = ref('active')
const saving = ref(false)
const roleSaving = ref(false)
const liveSaving = ref(false)

const isSuperAdmin = computed(() => {
  const roles = merchant.value?.roles ?? []
  return roles.some((r: any) => (r?.name ?? r) === 'super_admin')
})

const statusOptions = computed(() => [
  { label: t('admin.merchantDetail.active'), value: 'active' },
  { label: t('admin.merchantDetail.suspended'), value: 'suspended' },
])

onMounted(async () => {
  await loadMerchant()
})

const loadMerchant = async () => {
  try {
    const res = await fetchMerchant(route.params.id as string)
    merchant.value = res.data.merchant
    stats.value = res.data.stats
    editFee.value = parseFloat(merchant.value.zayono_fee_percent)
    editStatus.value = merchant.value.is_active ? 'active' : 'suspended'
  } catch (e: any) {
    // Show error - no mock fallback
    merchant.value = null
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    await updateMerchant(route.params.id as string, {
      zayono_fee_percent: editFee.value,
      is_active: editStatus.value === 'active',
    })
    if (merchant.value) {
      merchant.value.zayono_fee_percent = editFee.value.toFixed(3)
      merchant.value.is_active = editStatus.value === 'active'
    }
  } catch {
    // Error handled by API layer
  } finally {
    saving.value = false
  }
}

const handleSuspend = async () => {
  try { await suspendMerchant(route.params.id as string) } catch {}
  if (merchant.value) merchant.value.is_active = false
  editStatus.value = 'suspended'
}

const handleActivate = async () => {
  try { await activateMerchant(route.params.id as string) } catch {}
  if (merchant.value) merchant.value.is_active = true
  editStatus.value = 'active'
}

const handleApproveLive = async () => {
  liveSaving.value = true
  try {
    const res = await approveLiveMerchant(route.params.id as string) as any
    if (merchant.value) merchant.value.live_approved_at = res?.data?.live_approved_at ?? new Date().toISOString()
  } catch {
    // Error surfaced by the API layer
  } finally {
    liveSaving.value = false
  }
}

const handleRevokeLive = async () => {
  liveSaving.value = true
  try {
    await revokeLiveMerchant(route.params.id as string)
    if (merchant.value) merchant.value.live_approved_at = null
  } catch {
    // Error surfaced by the API layer
  } finally {
    liveSaving.value = false
  }
}

const handlePromote = async () => {
  roleSaving.value = true
  try {
    const res = await apiFetch<{ success: boolean; data: any }>(
      `/admin/merchants/${route.params.id}/promote`,
      { method: 'POST' },
    )
    merchant.value = res.data
  } catch (e: any) {
    // Surface server-side messages (e.g. "already a super admin") inline
    console.warn('Promote failed', e?.data?.message ?? e?.message)
  } finally {
    roleSaving.value = false
  }
}

const handleDemote = async () => {
  roleSaving.value = true
  try {
    const res = await apiFetch<{ success: boolean; data: any }>(
      `/admin/merchants/${route.params.id}/demote`,
      { method: 'POST' },
    )
    merchant.value = res.data
  } catch (e: any) {
    // Server enforces "no demoting yourself" + "no demoting last admin".
    // Display the reason so the operator understands the refusal.
    alert(e?.data?.message ?? t('admin.merchantDetail.demoteError'))
  } finally {
    roleSaving.value = false
  }
}

// Tx volume is XOF, platform revenue (zayono_revenue_*) is USD —
// two helpers to keep the units honest on the merchant detail page.
const formatVolumeXof = (amount: number) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr, {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount || 0)
}

const formatRevenueUsd = (amount: number) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

const formatDate = (date: string) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(date).toLocaleDateString(localeStr, { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.merchant-detail { max-width: 1200px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }
.page-subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }
.header-actions { display: flex; gap: 8px; }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-card, .edit-card, .stats-card, .revenue-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 20px;
}

.stats-card,
.revenue-card { grid-column: 1 / -1; }
.card-title { font-size: 14px; font-weight: 600; color: #1a1a2e; margin: 0 0 16px 0; }
.card-subtitle { font-size: 12px; color: #6b7280; margin: -8px 0 16px 0; line-height: 1.6; }

.revenue-stat .revenue-value { color: #047857; }

.info-list { display: flex; flex-direction: column; gap: 10px; }
.info-row { display: flex; justify-content: space-between; align-items: center; }
.info-label { font-size: 13px; color: #6b7280; }
.info-value { font-size: 13px; font-weight: 500; color: #1a1a2e; }

.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 6px; }

.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-item { text-align: center; }
.stat-value { display: block; font-size: 20px; font-weight: 700; color: #1a1a2e; }
.stat-label { display: block; font-size: 12px; color: #6b7280; margin-top: 4px; }
</style>
