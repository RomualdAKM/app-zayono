<template>
  <header class="app-header">
    <div class="header-left">
      <button
        type="button"
        class="hamburger-btn"
        :aria-label="$t('header.openMenu')"
        @click="toggleSidebar"
      >
        <AppIcon name="bars" />
      </button>
      <h1 class="page-title">{{ pageTitle }}</h1>
    </div>
    <div class="header-right">
      <a
        href="https://cal.com/zayono/intro"
        target="_blank"
        rel="noopener"
        class="book-call-btn"
      >
        <AppIcon name="phone" />
        <span class="book-call-text">{{ $t('header.bookCall') }}</span>
      </a>
      <LayoutLanguageSwitcher />
      <button
        type="button"
        class="theme-toggle-btn"
        :aria-label="isDark ? $t('header.lightMode') : $t('header.darkMode')"
        @click="toggle"
      >
        <i :class="['pi', isDark ? 'pi-sun' : 'pi-moon']" />
      </button>
      <CommonEnvironmentBadge />
      <div class="header-user-wrap">
        <button class="avatar-btn" @click="toggleMenu" :aria-label="merchantName">
          <Avatar :label="userInitial" shape="circle" size="normal" />
        </button>
        <button class="chevron-btn" @click="toggleMenu" :aria-label="$t('header.userMenu')">
          <AppIcon name="chevron-down" />
        </button>
        <Menu ref="menu" :model="userMenuItems" :popup="true" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const route = useRoute()
const { merchant, logout } = useAuth()
const { toggle: toggleSidebar } = useSidebar()
const { isDark, toggle } = useTheme()

const menu = ref()
const toggleMenu = (event: Event) => {
  menu.value.toggle(event)
}

const { t } = useI18n()

const merchantName = computed(() => merchant.value?.name || t('common.merchant', 'Marchand'))
const userInitial = computed(() => (merchant.value?.name?.[0] || 'M').toUpperCase())

const userMenuItems = computed(() => [
  { label: t('nav.profile'), icon: 'pi pi-user', command: () => navigateTo('/settings') },
  { label: t('nav.settings'), icon: 'pi pi-cog', command: () => navigateTo('/settings') },
  { separator: true },
  { label: t('nav.logout'), icon: 'pi pi-sign-out', command: () => logout() },
])

// Page-title resolution stays path-driven, but each label is now an
// i18n key. Keeping the keys here avoids polluting fr.json with every
// route — the title is JUST what the header bar shows.
const TITLE_KEYS: Record<string, string> = {
  '/dashboard': 'pageTitles.dashboard',
  '/payments/transactions': 'pageTitles.paymentsTransactions',
  '/payments/gateways': 'pageTitles.gateways',
  '/payments/gateways/list': 'pageTitles.gatewayCatalog',
  '/payments/methods': 'pageTitles.methods',
  '/payments/methods/list': 'pageTitles.methodsCatalog',
  '/payments/settings': 'pageTitles.paymentSettings',
  '/payouts/transactions': 'pageTitles.payoutsTransactions',
  '/payouts/gateways': 'pageTitles.payoutGateways',
  '/payouts/gateways/list': 'pageTitles.gatewayCatalog',
  '/payouts/methods': 'pageTitles.payoutMethods',
  '/payouts/methods/list': 'pageTitles.methodsCatalog',
  '/customers': 'pageTitles.customers',
  '/statistics/payments': 'pageTitles.statsPayments',
  '/statistics/payouts': 'pageTitles.statsPayouts',
  '/statistics/global': 'pageTitles.statsGlobal',
  '/developers/api-keys': 'pageTitles.apiKeys',
  '/developers/webhooks': 'pageTitles.webhooks',
  '/developers/webhook-logs': 'pageTitles.webhookDeliveries',
  '/developers/logs': 'pageTitles.apiLogs',
  '/payments/routing-health': 'pageTitles.routingHealth',
  '/billing': 'pageTitles.billing',
  '/team': 'pageTitles.team',
  '/settings': 'pageTitles.settings',
}

const DYNAMIC_TITLE_KEYS: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /^\/payments\/transactions\/[^/]+$/, key: 'pageTitles.paymentDetail' },
  { pattern: /^\/payouts\/transactions\/[^/]+$/, key: 'pageTitles.payoutDetail' },
  { pattern: /^\/payments\/[^/]+$/, key: 'pageTitles.paymentDetail' },
  { pattern: /^\/payouts\/[^/]+$/, key: 'pageTitles.payoutDetail' },
  { pattern: /^\/payments\/gateways\/[^/]+$/, key: 'pageTitles.gateway' },
  { pattern: /^\/payouts\/gateways\/[^/]+$/, key: 'pageTitles.gateway' },
  { pattern: /^\/customers\/[^/]+$/, key: 'pageTitles.customerDetail' },
]

const pageTitle = computed(() => {
  if (TITLE_KEYS[route.path]) return t(TITLE_KEYS[route.path])
  const dynamic = DYNAMIC_TITLE_KEYS.find(d => d.pattern.test(route.path))
  if (dynamic) return t(dynamic.key)
  const match = Object.keys(TITLE_KEYS).find(p => route.path.startsWith(p + '/'))
  if (match) return t(TITLE_KEYS[match])
  const last = route.path.split('/').filter(Boolean).pop() || ''
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ')
})
</script>

<style scoped>
.app-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  border-bottom: 1px solid var(--ze-border);
  background: var(--ze-bg-card);
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.hamburger-btn {
  display: none;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ze-border);
  border-radius: 6px;
  background: var(--ze-bg-card);
  color: var(--ze-text-body);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.hamburger-btn:hover {
  background: var(--ze-bg-hover);
}

.hamburger-btn .pi {
  font-size: 16px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ze-text-strong);
  margin: 0;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.book-call-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--ze-brand-border);
  border-radius: 999px;
  background: var(--ze-bg-card);
  color: var(--ze-brand);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.book-call-btn:hover {
  background: var(--ze-brand-bg-soft);
  border-color: var(--ze-brand);
}

.book-call-btn .pi {
  font-size: 13px;
}

.theme-toggle-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ze-border);
  border-radius: 999px;
  /* `--ze-bg-subtle` is one shade off the header so the button doesn't
     disappear into the topbar in either theme. */
  background: var(--ze-bg-subtle);
  color: var(--ze-text-strong);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.theme-toggle-btn:hover {
  background: var(--ze-bg-hover);
  color: var(--ze-brand);
  border-color: var(--ze-brand-border);
}

.theme-toggle-btn .pi {
  font-size: 15px;
}

.header-user-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.avatar-btn,
.chevron-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.chevron-btn {
  color: var(--ze-text-muted);
  padding: 4px 6px;
  border-radius: 6px;
  transition: background 0.15s;
}

.chevron-btn:hover {
  background: var(--ze-bg-hover);
}

.chevron-btn .pi {
  font-size: 11px;
}

/* ── Responsive breakpoints ─────────────────────────── */

/* Tablet (1024 → 768) */
@media (max-width: 1024px) {
  .hamburger-btn {
    display: inline-flex;
  }
}

/* Mobile (< 768) */
@media (max-width: 768px) {
  .app-header {
    padding: 0 16px;
    height: 56px;
  }
  .page-title {
    font-size: 18px;
  }
  .book-call-text {
    display: none;             /* keep just the phone icon on mobile */
  }
  .book-call-btn {
    width: 36px;
    padding: 0;
    justify-content: center;
  }
  .header-right {
    gap: 8px;
  }
}

/* Very small (< 480) */
@media (max-width: 480px) {
  .book-call-btn {
    display: none;
  }
}
</style>
