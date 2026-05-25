<template>
  <!-- Backdrop (mobile only, behind the drawer) -->
  <div
    v-if="open"
    class="sidebar-backdrop"
    @click="closeDrawer"
    aria-hidden="true"
  />

  <aside class="sidebar" :class="{ 'sidebar--open': open }">
    <!-- Logo -->
    <div class="sidebar-logo">
      <NuxtLink to="/dashboard" class="logo-link" @click="closeDrawer">
        <img src="/logo.gif" alt="Zayono" class="logo-image" />
        <span class="beta-badge">Beta</span>
      </NuxtLink>
      <button
        type="button"
        class="sidebar-close-btn"
        :aria-label="$t('sidebarLayout.closeMenu')"
        @click="closeDrawer"
      >
        <i class="pi pi-times" />
      </button>
    </div>

    <!-- Application switcher -->
    <div v-if="appStore.current" class="app-switcher">
      <button
        type="button"
        class="app-switcher-trigger"
        :class="{ 'app-switcher-trigger--open': switcherOpen }"
        @click="switcherOpen = !switcherOpen"
      >
        <span class="app-switcher-icon">
          <img v-if="appStore.current.icon" :src="appStore.current.icon" :alt="appStore.current.name" />
          <span v-else>{{ initialsFor(appStore.current.name) }}</span>
        </span>
        <span class="app-switcher-info">
          <span class="app-switcher-label">{{ $t('sidebarLayout.applicationLabel') }}</span>
          <span class="app-switcher-name">{{ appStore.current.name }}</span>
        </span>
        <i class="pi pi-angle-down app-switcher-chevron" :class="{ rotate: switcherOpen }" />
      </button>
      <div v-if="switcherOpen" class="app-switcher-menu">
        <button
          v-for="app in appStore.list"
          :key="app.id"
          type="button"
          class="app-switcher-item"
          :class="{ 'app-switcher-item--current': app.id === appStore.currentId }"
          @click="switchTo(app.id)"
        >
          <span class="app-switcher-icon app-switcher-icon--sm">
            <img v-if="app.icon" :src="app.icon" :alt="app.name" />
            <span v-else>{{ initialsFor(app.name) }}</span>
          </span>
          <span class="app-switcher-item-name">{{ app.name }}</span>
          <i v-if="app.id === appStore.currentId" class="pi pi-check app-switcher-check" />
        </button>
        <div class="app-switcher-sep" />
        <NuxtLink to="/apps" class="app-switcher-action" @click="switcherOpen = false; closeDrawer()">
          <i class="pi pi-th-large" />
          <span>{{ $t('nav.allApplications') }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <ul class="nav-list">
        <li v-for="item in navItems" :key="item.path || item.label">
          <!-- Flat link -->
          <NuxtLink
            v-if="!item.children"
            :to="item.path"
            class="nav-item"
            active-class="nav-item--active"
          >
            <!-- Custom SVG icon (auto-imported under `Icons*`) takes
                 precedence over the PrimeIcons fallback. Lets us hand
                 -draw a few key entries while keeping the rest on the
                 standard icon font. -->
            <component
              v-if="item.iconComponent"
              :is="item.iconComponent"
              class="nav-svg-icon"
            />
            <i v-else :class="['pi', item.icon]"></i>
            <span>{{ item.label }}</span>
          </NuxtLink>

          <!-- Collapsible group -->
          <template v-else>
            <button
              type="button"
              class="nav-item nav-group"
              :class="{ 'nav-group--open': isOpen(item.label), 'nav-group--active-route': hasActiveChild(item) }"
              @click="toggle(item.label)"
            >
              <component
                v-if="item.iconComponent"
                :is="item.iconComponent"
                class="nav-svg-icon"
              />
              <i v-else :class="['pi', item.icon]"></i>
              <span>{{ item.label }}</span>
              <i class="pi pi-chevron-down nav-chevron" :class="{ 'rotate': isOpen(item.label) }"></i>
            </button>
            <ul v-show="isOpen(item.label)" class="nav-sublist">
              <li v-for="child in item.children" :key="child.path">
                <NuxtLink
                  :to="child.path"
                  class="nav-subitem"
                  active-class="nav-subitem--active"
                >
                  <component
                    v-if="child.iconComponent"
                    :is="child.iconComponent"
                    class="nav-svg-icon nav-svg-icon--sub"
                  />
                  <i v-else :class="['pi', child.icon]"></i>
                  <span>{{ child.label }}</span>
                </NuxtLink>
              </li>
            </ul>
          </template>
        </li>
      </ul>
    </nav>

    <!-- Footer links -->
    <div class="sidebar-footer">
      <a href="https://docs.zayono.io" target="_blank" rel="noopener" class="footer-item">
        <IconsBook class="nav-svg-icon" />
        <span>{{ $t('nav.documentation') }}</span>
      </a>
      <a href="mailto:support@zayono.io" class="footer-item">
        <IconsHelp class="nav-svg-icon" />
        <span>{{ $t('nav.helpCenter') }}</span>
      </a>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
// Pull the SVG icon components in explicitly via `#components`. Nuxt's
// auto-import doesn't kick in when a component is referenced through a
// string in `<component :is>` — passing the actual component object is
// the supported pattern. Every nav entry now uses a bespoke SVG, so
// the imports list mirrors the nav config below 1:1.
import {
  IconsDashboard,
  IconsPayments,
  IconsPayouts,
  IconsCustomers,
  IconsStatistics,
  IconsIntegration,
  IconsSettings,
  IconsTransactions,
  IconsGateways,
  IconsWallet,
  IconsCog,
  IconsLineChart,
  IconsPieChart,
  IconsKey,
  IconsWebhook,
  IconsArrowSwap,
  IconsRefresh,
  IconsBars,
  IconsSend,
  IconsDollar,
} from '#components'

interface NavChild {
  label: string
  path: string
  // PrimeIcons class as fallback; bespoke SVG component takes priority.
  icon?: string
  iconComponent?: Component
}
interface NavItem {
  label: string
  icon?: string
  iconComponent?: Component
  path?: string
  children?: NavChild[]
}

const route = useRoute()
const { open, closeDrawer } = useSidebar()
const appStore = useApplicationStore()

const switcherOpen = ref(false)

// Auto-close the drawer when the route changes (mobile UX)
watch(() => route.path, () => {
  closeDrawer()
  switcherOpen.value = false
})

const initialsFor = (name: string): string => {
  if (!name) return '?'
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const switchTo = (id: string) => {
  if (id === appStore.currentId) {
    switcherOpen.value = false
    return
  }
  appStore.select(id)
  switcherOpen.value = false
  closeDrawer()
  // Soft-reload through Nuxt so every page-level fetch re-runs with the
  // new `X-Zayono-Application` header. `reloadNuxtApp` rebuilds the SPA
  // in-place — quicker and less jarring than a hard `window.location.reload()`
  // while still re-triggering `onMounted` hooks across components.
  reloadNuxtApp({ persistState: false })
}

// Close the switcher when the user clicks anywhere else in the sidebar.
// Using a doc-level listener that ignores clicks on the trigger itself.
const onDocumentClick = (e: MouseEvent) => {
  if (!switcherOpen.value) return
  const target = e.target as HTMLElement
  if (target.closest('.app-switcher')) return
  switcherOpen.value = false
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    document.addEventListener('click', onDocumentClick)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    document.removeEventListener('click', onDocumentClick)
  }
})

// Labels resolved from i18n keys via $t() in the template — see
// `navLabel()` below. The path + icon are stable; only the label is
// translated.
const { t } = useI18n()

const navItems = computed<NavItem[]>(() => [
  { label: t('nav.dashboard'), iconComponent: IconsDashboard, path: '/dashboard' },
  {
    label: t('nav.payments'),
    iconComponent: IconsPayments,
    children: [
      { label: t('nav.transactions'), iconComponent: IconsTransactions, path: '/payments/transactions' },
      { label: t('nav.gateways'), iconComponent: IconsGateways, path: '/payments/gateways' },
      { label: t('nav.methods'), iconComponent: IconsWallet, path: '/payments/methods' },
      { label: t('nav.routingHealth'), iconComponent: IconsArrowSwap, path: '/payments/routing-health' },
      { label: t('nav.settings'), iconComponent: IconsCog, path: '/payments/settings' },
    ],
  },
  {
    label: t('nav.payouts'),
    iconComponent: IconsPayouts,
    children: [
      { label: t('nav.transactions'), iconComponent: IconsTransactions, path: '/payouts/transactions' },
      { label: t('nav.gateways'), iconComponent: IconsGateways, path: '/payouts/gateways' },
      { label: t('nav.methods'), iconComponent: IconsWallet, path: '/payouts/methods' },
    ],
  },
  { label: t('nav.customers'), iconComponent: IconsCustomers, path: '/customers' },
  {
    label: t('nav.statistics'),
    iconComponent: IconsStatistics,
    children: [
      { label: t('nav.payments'), iconComponent: IconsLineChart, path: '/statistics/payments' },
      { label: t('nav.payouts'), iconComponent: IconsStatistics, path: '/statistics/payouts' },
      { label: t('nav.global'), iconComponent: IconsPieChart, path: '/statistics/global' },
    ],
  },
  {
    label: t('nav.integration'),
    iconComponent: IconsIntegration,
    children: [
      { label: t('nav.apiKeys'), iconComponent: IconsKey, path: '/developers/api-keys' },
      { label: t('nav.webhooks'), iconComponent: IconsWebhook, path: '/developers/webhooks' },
      { label: t('nav.webhookDeliveries'), iconComponent: IconsSend, path: '/developers/webhook-logs' },
      { label: t('nav.apiLogs'), iconComponent: IconsBars, path: '/developers/logs' },
    ],
  },
  { label: t('nav.billing'), iconComponent: IconsDollar, path: '/billing' },
  { label: t('nav.settings'), iconComponent: IconsSettings, path: '/settings' },
])

// ─── Collapse state (persisted in localStorage) ─────────────────
const STORAGE_KEY = 'zayono_sidebar_open_groups'

const readStored = (): Record<string, boolean> => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const openGroups = ref<Record<string, boolean>>(readStored())

// Auto-open the group containing the currently visible route
const ensureCurrentGroupOpen = () => {
  for (const item of navItems.value) {
    if (item.children && item.children.some((c: NavChild) => route.path.startsWith(c.path))) {
      openGroups.value[item.label] = true
    }
  }
}

watch(() => route.path, ensureCurrentGroupOpen, { immediate: true })

const persist = () => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(openGroups.value))
  } catch {
    /* ignore */
  }
}

const isOpen = (label: string) => !!openGroups.value[label]

const toggle = (label: string) => {
  openGroups.value[label] = !openGroups.value[label]
  persist()
}

const hasActiveChild = (item: NavItem) =>
  !!item.children?.some(c => route.path.startsWith(c.path))
</script>

<style scoped>
.sidebar-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
  animation: fade-in 0.18s ease;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.sidebar {
  width: 250px;
  /* Lock the box to viewport height — with `min-height: 100vh` the
     sidebar grew with its content and `overflow-y: auto` never fired. */
  height: 100vh;
  background: var(--ze-sidebar-bg);
  border-right: 1px solid var(--ze-sidebar-border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  overflow-y: auto;
  overscroll-behavior: contain;     /* don't bounce the page when scrolling */
  transition: transform 0.22s ease, background-color 0.18s ease,
              border-color 0.18s ease;
}

/* Thinner scrollbar for the sidebar */
.sidebar::-webkit-scrollbar {
  width: 4px;
}
.sidebar::-webkit-scrollbar-thumb {
  background: var(--ze-border);
  border-radius: 2px;
}
.sidebar::-webkit-scrollbar-thumb:hover {
  background: var(--ze-border-strong);
}

.sidebar-logo {
  padding: 20px 20px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-close-btn {
  display: none;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--ze-text-muted);
  cursor: pointer;
  transition: background 0.15s;
}

.sidebar-close-btn:hover {
  background: var(--ze-bg-hover);
  color: var(--ze-text-strong);
}

.sidebar-close-btn .pi {
  font-size: 16px;
}

.logo-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.logo-image {
  height: 28px;
  width: auto;
  display: block;
}

.beta-badge {
  font-size: 9px;
  font-weight: 700;
  background: var(--ze-warning-bg);
  color: var(--ze-warning-fg);
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Application switcher ──────────────────────────── */
.app-switcher {
  position: relative;
  margin: 0 12px 14px;
}

.app-switcher-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  color: var(--ze-sidebar-text);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}

.app-switcher-trigger:hover,
.app-switcher-trigger--open {
  background: var(--ze-sidebar-bg-hover);
  border-color: var(--ze-border-strong);
}

.app-switcher-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--ze-text-strong);
  overflow: hidden;
  flex-shrink: 0;
}

.app-switcher-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-switcher-icon--sm {
  width: 22px;
  height: 22px;
  font-size: 10px;
  border-radius: 4px;
}

.app-switcher-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-switcher-label {
  font-size: 10px;
  color: var(--ze-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.app-switcher-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ze-text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-switcher-chevron {
  font-size: 10px;
  color: var(--ze-text-muted);
  transition: transform 0.15s;
}

.app-switcher-chevron.rotate {
  transform: rotate(180deg);
}

.app-switcher-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--ze-shadow-overlay);
  padding: 4px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.app-switcher-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--ze-text-body);
  font-family: inherit;
  text-align: left;
  font-size: 13px;
}

.app-switcher-item:hover {
  background: var(--ze-bg-hover);
}

.app-switcher-item--current {
  background: var(--ze-bg-subtle);
  color: var(--ze-text-strong);
  font-weight: 500;
}

.app-switcher-item-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-switcher-check {
  font-size: 11px;
  color: var(--ze-text-strong);
}

.app-switcher-sep {
  height: 1px;
  background: var(--ze-border);
  margin: 4px 0;
}

.app-switcher-action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 4px;
  color: var(--ze-text-muted);
  text-decoration: none;
  font-size: 12.5px;
  font-weight: 500;
}

.app-switcher-action:hover {
  background: var(--ze-bg-hover);
  color: var(--ze-text-strong);
}

.app-switcher-action i {
  font-size: 12px;
}

.sidebar-nav {
  padding: 4px 12px 16px;
  flex: 1;
}

.sidebar-footer {
  padding: 12px 12px 18px;
  border-top: 1px solid var(--ze-border-subtle);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 12px;
  border-radius: 6px;
  color: var(--ze-sidebar-text);
  text-decoration: none;
  font-size: 14.5px;
  /* Sora carries more visual weight at the same numeric value than Inter,
     so the previous 700 felt too heavy. 450 sits between regular and
     medium — calm in resting state, lets the active item (still 600)
     stand out by contrast. */
  font-weight: 450;
  letter-spacing: -0.005em;
  transition: background 0.15s, color 0.15s;
}

.footer-item:hover {
  background: var(--ze-sidebar-bg-hover);
  color: var(--ze-sidebar-text-hover);
}

.footer-item i {
  font-size: 17px;
  width: 20px;
  text-align: center;
  font-weight: 500;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-list > li {
  margin-bottom: 2px;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  color: var(--ze-sidebar-text);
  text-decoration: none;
  font-size: 14.5px;
  /* Lighter than before (was 700, too heavy with Sora). 450 keeps the
     items readable without screaming, and gives the active state (600)
     enough room to stand out by contrast. */
  font-weight: 450;
  letter-spacing: -0.005em;
  transition: background 0.15s, color 0.15s;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}

.nav-item:hover {
  background: var(--ze-sidebar-bg-hover);
  color: var(--ze-sidebar-text-hover);
}

/* Active state: pale-blue fill (or its dark-mode equivalent). */
.nav-item--active {
  background: var(--ze-sidebar-bg-active);
  color: var(--ze-sidebar-text-active);
  font-weight: 600;
}

.nav-item--active i {
  color: var(--ze-sidebar-text-active);
}

.nav-group--active-route {
  color: var(--ze-sidebar-text-active);
  font-weight: 600;
}

.nav-item i {
  font-size: 17px;
  width: 20px;
  text-align: center;
  font-weight: 500;
}

/* Custom SVG icons sit in the same slot as the PrimeIcons font.
   Width matches `.nav-item i` (20px) so the labels line up perfectly
   whether the entry uses a font icon or our bespoke SVG. Stroke colour
   inherits from `currentColor`, so active / hover / dark-mode states
   apply automatically without a separate rule per state. */
.nav-svg-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: currentColor;
}

/* Sub-menu variant — slightly smaller to match the existing `.nav-subitem i`
   sizing (18px wide / 14px font) so the parent → child indentation reads
   the same whether the entry uses a font icon or a bespoke SVG. */
.nav-svg-icon--sub {
  width: 18px;
  height: 18px;
}

.nav-chevron {
  margin-left: auto;
  font-size: 10px !important;
  transition: transform 0.15s;
}

.nav-chevron.rotate {
  transform: rotate(180deg);
}

.nav-sublist {
  list-style: none;
  padding: 4px 0 4px 30px;
  margin: 0;
}

.nav-sublist > li {
  margin-bottom: 1px;
}

.nav-subitem {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  color: var(--ze-sidebar-text);
  text-decoration: none;
  font-size: 14px;
  /* Slightly lighter than the parent (450) so the hierarchy reads
     correctly: parent > sub by default, active variants still pop. */
  font-weight: 400;
  letter-spacing: -0.005em;
  transition: background 0.15s, color 0.15s;
}

.nav-subitem i {
  font-size: 14px;
  width: 18px;
  text-align: center;
  font-weight: 400;          /* regular — icônes plus discrètes */
  color: var(--ze-text-muted);
  transition: color 0.15s;
}

.nav-subitem:hover i {
  color: var(--ze-sidebar-text-hover);
}

.nav-subitem--active i {
  color: var(--ze-sidebar-text-active);
}

.nav-subitem:hover {
  background: var(--ze-sidebar-bg-hover);
  color: var(--ze-sidebar-text-hover);
}

.nav-subitem--active {
  background: var(--ze-sidebar-bg-active);
  color: var(--ze-sidebar-text-active);
  font-weight: 600;
}

/* ── Mobile drawer ──────────────────────────────────── */

/* Desktop default: sidebar always visible, no drawer behavior. */

/* Below 1024px: sidebar slides out, becomes a drawer toggled from Header. */
@media (max-width: 1024px) {
  .sidebar {
    transform: translateX(-100%);
    box-shadow: var(--ze-shadow-overlay);
  }

  .sidebar--open {
    transform: translateX(0);
  }

  .sidebar-close-btn {
    display: inline-flex;
  }

  .sidebar-backdrop {
    display: block;
  }
}

/* On mobile, give the drawer a tiny bit more breathing room. */
@media (max-width: 480px) {
  .sidebar {
    width: 80%;
    max-width: 300px;
  }
}
</style>
