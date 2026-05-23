<template>
  <div class="layout-wrapper">
    <aside class="sidebar">
      <div class="sidebar-header">
        <NuxtLink to="/admin" class="sidebar-logo">
          <span class="logo-text">Zayono</span>
          <span class="logo-badge">Admin</span>
        </NuxtLink>
      </div>

      <nav class="sidebar-nav">
        <ul class="nav-list">
          <li v-for="item in mainItems" :key="item.path">
            <NuxtLink :to="item.path" class="nav-item" active-class="nav-item--active">
              <i :class="['pi', item.icon]"></i>
              <span>{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>

        <div class="nav-separator"></div>
        <span class="nav-section-title">{{ $t('adminLayout.management') }}</span>

        <ul class="nav-list">
          <li v-for="item in managementItems" :key="item.path">
            <NuxtLink :to="item.path" class="nav-item" active-class="nav-item--active">
              <i :class="['pi', item.icon]"></i>
              <span>{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>

        <div class="nav-separator"></div>
        <span class="nav-section-title">{{ $t('adminLayout.system') }}</span>

        <ul class="nav-list">
          <li v-for="item in systemItems" :key="item.path">
            <NuxtLink :to="item.path" class="nav-item" active-class="nav-item--active">
              <i :class="['pi', item.icon]"></i>
              <span>{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </aside>

    <div class="layout-content">
      <header class="admin-header">
        <div class="header-left">
          <Breadcrumb :model="breadcrumbs" class="header-breadcrumb" />
        </div>
        <div class="header-right">
          <LayoutAdminNotificationBell />
          <LayoutLanguageSwitcher />
          <span class="admin-badge">{{ $t('admin.badge') }}</span>
          <Button icon="pi pi-sign-out" text severity="secondary" :aria-label="$t('auth.logout')" @click="logout" />
        </div>
      </header>
      <main class="layout-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
// R1 audit Perf H1: dashboard CSS bundle loaded here, not globally.
import '~/assets/css/main.css'

const route = useRoute()
const { logout } = useAuth()

const { t } = useI18n()

const mainItems = computed(() => [
  { label: t('admin.nav.dashboard'), icon: 'pi-home', path: '/admin' },
  { label: t('admin.nav.finances'), icon: 'pi-wallet', path: '/admin/finances' },
  { label: t('admin.nav.platformBilling'), icon: 'pi-dollar', path: '/admin/platform-billing' },
  { label: t('admin.nav.merchants'), icon: 'pi-users', path: '/admin/merchants' },
  { label: t('admin.nav.transactions'), icon: 'pi-credit-card', path: '/admin/transactions' },
])

const managementItems = computed(() => [
  { label: t('admin.nav.aggregators'), icon: 'pi-server', path: '/admin/aggregators' },
  { label: t('admin.nav.exchangeRates'), icon: 'pi-sync', path: '/admin/rates' },
])

const systemItems = computed(() => [
  { label: t('admin.nav.superAdmins'), icon: 'pi-shield', path: '/admin/super-admins' },
  { label: t('admin.nav.auditLogs'), icon: 'pi-list', path: '/admin/audit' },
])

// Map URL segments (kebab-case) to i18n nav keys so admin breadcrumbs
// localize properly. Fallback humanizes the raw segment for unknown paths.
const SEGMENT_LABEL_KEYS: Record<string, string> = {
  admin: 'admin.nav.dashboard',
  dashboard: 'admin.nav.dashboard',
  finances: 'admin.nav.finances',
  'platform-billing': 'admin.nav.platformBilling',
  merchants: 'admin.nav.merchants',
  transactions: 'admin.nav.transactions',
  aggregators: 'admin.nav.aggregators',
  rates: 'admin.nav.exchangeRates',
  'super-admins': 'admin.nav.superAdmins',
  audit: 'admin.nav.auditLogs',
}

const breadcrumbs = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  return parts.map((part, index) => ({
    label: SEGMENT_LABEL_KEYS[part]
      ? t(SEGMENT_LABEL_KEYS[part])
      : part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
    to: '/' + parts.slice(0, index + 1).join('/'),
  }))
})
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  min-height: 100vh;
  background: #f9fafb;
}

.sidebar {
  width: 250px;
  min-height: 100vh;
  background: #fafafa;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  overflow-y: auto;
}

.sidebar-header {
  padding: 20px 16px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar-logo {
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
  letter-spacing: -0.5px;
}

.logo-badge {
  font-size: 10px;
  font-weight: 600;
  background: #1a1a2e;
  color: #fff;
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.sidebar-nav {
  padding: 12px 8px;
  flex: 1;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 4px;
  color: #4b5563;
  text-decoration: none;
  font-size: 13px;
  font-weight: 450;
  transition: background 0.15s, color 0.15s;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #1a1a2e;
}

.nav-item--active {
  background: #f0f0f5;
  color: #1a1a2e;
  font-weight: 600;
  border-left-color: #1a1a2e;
}

.nav-item i {
  font-size: 15px;
  width: 18px;
  text-align: center;
}

.nav-separator {
  height: 1px;
  background: #e5e7eb;
  margin: 12px 8px;
}

.nav-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 12px;
  margin-bottom: 4px;
  display: block;
}

.layout-content {
  flex: 1;
  margin-left: 250px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.admin-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-breadcrumb {
  background: none;
  padding: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 3px;
  background: #ede9fe;
  color: #5b21b6;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.layout-main {
  flex: 1;
  padding: 24px;
}
</style>
