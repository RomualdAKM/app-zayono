<template>
  <div class="admin-super-admins">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ $t('admin.superAdmins.title') }}</h1>
        <p class="page-subtitle">{{ $t('admin.superAdmins.subtitle') }}</p>
      </div>
    </div>

    <div class="alert">
      <AppIcon name="info-circle" />
      <p>{{ $t('admin.superAdmins.alert') }}</p>
    </div>

    <div class="table-card">
      <DataTable
        :value="admins"
        :loading="loading"
        stripedRows
        size="small"
        rowHover
        class="clickable-table"
        @row-click="openMerchant"
      >
        <Column field="name" :header="$t('admin.superAdmins.columns.name')" style="min-width: 160px" />
        <Column field="email" :header="$t('admin.superAdmins.columns.email')" style="min-width: 220px" />
        <Column field="company_name" :header="$t('admin.superAdmins.columns.company')" style="min-width: 160px" />
        <Column :header="$t('admin.superAdmins.columns.account')">
          <template #body="{ data }">
            <Tag :value="data.is_active ? t('admin.merchants.active') : t('admin.merchants.suspended')" :severity="data.is_active ? 'success' : 'danger'" />
          </template>
        </Column>
        <Column :header="$t('admin.superAdmins.columns.emailVerified')">
          <template #body="{ data }">
            <i
              :class="['pi', data.email_verified_at ? 'pi-check-circle' : 'pi-times-circle']"
              :style="{ color: data.email_verified_at ? '#10b981' : '#9ca3af' }"
            />
          </template>
        </Column>
        <Column :header="$t('admin.superAdmins.becameAdmin')">
          <template #body="{ data }">
            {{ formatDate(data.created_at) }}
          </template>
        </Column>
        <Column :header="$t('common.actions')" style="width: 200px">
          <template #body="{ data }">
            <Button
              :label="$t('admin.superAdmins.removeRole')"
              icon="pi pi-user-minus"
              severity="warn"
              text
              size="small"
              :loading="demoting === data.id"
              @click.stop="demote(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const router = useRouter()
const { apiFetch } = useApi()
const { t, locale } = useI18n()

interface SuperAdmin {
  id: string
  name: string
  email: string
  company_name: string | null
  is_active: boolean
  email_verified_at: string | null
  created_at: string
}

const admins = ref<SuperAdmin[]>([])
const loading = ref(false)
const demoting = ref<string | null>(null)

onMounted(loadAdmins)

async function loadAdmins() {
  loading.value = true
  try {
    const res = await apiFetch<{ success: boolean; data: SuperAdmin[] }>('/admin/merchants/admins')
    admins.value = res.data ?? []
  } finally {
    loading.value = false
  }
}

async function demote(admin: SuperAdmin) {
  if (!window.confirm(t('admin.superAdmins.confirmRemove', { name: admin.name }))) return
  demoting.value = admin.id
  try {
    await apiFetch(`/admin/merchants/${admin.id}/demote`, { method: 'POST' })
    await loadAdmins()
  } catch (e: any) {
    alert(e?.data?.message ?? t('admin.superAdmins.removeError'))
  } finally {
    demoting.value = null
  }
}

function openMerchant(event: any) {
  router.push(`/admin/merchants/${event.data.id}`)
}

function formatDate(date: string) {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(date).toLocaleDateString(localeStr, { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.admin-super-admins { max-width: 1200px; }
.page-header { margin-bottom: 20px; }
.page-title { font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0; }
.page-subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; max-width: 720px; line-height: 1.5; }

.alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-left: 3px solid #2563eb;
  border-radius: 4px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.alert i {
  color: #2563eb;
  font-size: 16px;
  margin-top: 1px;
}

.alert p {
  font-size: 13px;
  color: #1e3a8a;
  margin: 0;
  line-height: 1.5;
}

.table-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.clickable-table :deep(tr) {
  cursor: pointer;
}
</style>
