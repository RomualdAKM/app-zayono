<template>
  <component
    v-if="resolved"
    :is="resolved"
    :size="size"
    :stroke-width="strokeWidth"
    class="app-icon"
  />
  <i v-else :class="['pi', `pi-${name}`, 'app-icon-fallback']" :style="fallbackStyle" />
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import {
  // Sidebar set (already wired in Sidebar.vue, mapped here too so
  // any other page using <AppIcon name="dashboard" /> stays consistent)
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
  IconsBook,
  IconsHelp,
  // Tier-1 + Tier-2 page icons added for the dashboard-wide sweep
  IconsInbox,
  IconsInfo,
  IconsPlus,
  IconsArrowLeft,
  IconsArrowRight,
  IconsError,
  IconsWarning,
  IconsSuccess,
  IconsCheck,
  IconsEye,
  IconsTrash,
  IconsPencil,
  IconsLock,
  IconsPhone,
  IconsMobile,
  IconsDownload,
  IconsEmail,
  IconsSend,
  IconsGlobe,
  IconsRefresh,
  IconsExternalLink,
  IconsDollar,
  IconsBell,
  IconsCalendar,
  IconsClock,
  IconsBan,
  IconsShield,
  IconsUserPlus,
  IconsUserMinus,
  IconsSave,
  IconsSignOut,
  // Header / nav controls + transaction actions added in the P3 sweep
  IconsBars,
  IconsChevronDown,
  IconsCopy,
  IconsArrowSwap,
  IconsTimes,
} from '#components'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
    strokeWidth?: number | string
  }>(),
  {
    size: 16,
    strokeWidth: 1.75,
  },
)

/**
 * Mapping from PrimeIcons-style names to our bespoke SVG components.
 *
 * Keep the keys aligned with the existing `pi-*` names so a global
 * find-replace from `<i class="pi pi-NAME" />` to `<AppIcon name="NAME" />`
 * Just Works. Anything not listed falls through to the PrimeIcons font
 * via the template's fallback branch — no broken icons, no errors.
 */
const ICON_MAP: Record<string, Component> = {
  // Sidebar set
  'dashboard': IconsDashboard,
  'home': IconsDashboard,
  'credit-card': IconsPayments,
  // The Payments / Payouts pair (vault + arrow in vs vault + arrow out)
  // is the right visual semantic anywhere we need to distinguish
  // "incoming money" from "outgoing money" — including the dashboard
  // "Transactions récentes" tabs where the user noticed both reading
  // as a generic `$`.
  'payments': IconsPayments,
  'payouts': IconsPayouts,
  'send': IconsSend,
  'users': IconsCustomers,
  'user': IconsCustomers,
  'chart-bar': IconsStatistics,
  'code': IconsIntegration,
  'wrench': IconsSettings,
  'receipt': IconsTransactions,
  'sitemap': IconsGateways,
  'wallet': IconsWallet,
  'cog': IconsCog,
  'chart-line': IconsLineChart,
  'chart-pie': IconsPieChart,
  'key': IconsKey,
  'book': IconsBook,
  'question-circle': IconsHelp,

  // Status / feedback
  'inbox': IconsInbox,
  'info-circle': IconsInfo,
  'info': IconsInfo,
  'exclamation-circle': IconsError,
  'times-circle': IconsError,
  'exclamation-triangle': IconsWarning,
  'check-circle': IconsSuccess,
  'check': IconsCheck,

  // Actions
  'plus': IconsPlus,
  'plus-circle': IconsPlus,
  'arrow-left': IconsArrowLeft,
  'arrow-right': IconsArrowRight,
  'eye': IconsEye,
  'trash': IconsTrash,
  'pencil': IconsPencil,
  'download': IconsDownload,
  'refresh': IconsRefresh,
  'sync': IconsRefresh,
  'replay': IconsRefresh,
  'external-link': IconsExternalLink,
  'save': IconsSave,
  'sign-out': IconsSignOut,
  'ban': IconsBan,
  'user-plus': IconsUserPlus,
  'user-minus': IconsUserMinus,

  // Form fields / context
  'lock': IconsLock,
  'phone': IconsPhone,
  'mobile': IconsMobile,
  'envelope': IconsEmail,
  'globe': IconsGlobe,
  'calendar': IconsCalendar,
  'clock': IconsClock,
  'dollar': IconsDollar,
  'money-bill': IconsDollar,
  'percentage': IconsDollar,
  'bell': IconsBell,
  'shield': IconsShield,
  'webhook': IconsWebhook,

  // Navigation chrome
  'bars': IconsBars,
  'chevron-down': IconsChevronDown,
  // Generic close — `times-circle` (above) keeps its enclosing ring,
  // `times` is the bare X used in dialog headers / dismissible tags.
  'times': IconsTimes,
  // Two-way swap arrow — used by the environment badge to read as a
  // toggle (sandbox ↔ live), not as a forward navigation.
  'arrow-right-arrow-left': IconsArrowSwap,
  // Copy-to-clipboard glyph used next to IDs, secrets, references
  'copy': IconsCopy,
}

const resolved = computed<Component | undefined>(() => ICON_MAP[props.name])

/**
 * When falling back to a PrimeIcons font glyph, match the SVG sizing
 * convention (size = pixel height) by mapping it to font-size.
 * Stroke width has no PrimeIcons equivalent so it's only honoured on
 * the SVG branch.
 */
const fallbackStyle = computed(() => ({
  fontSize: typeof props.size === 'number' ? `${props.size}px` : props.size,
}))
</script>

<style scoped>
/*
 * Don't constrain SVG dimensions here — Vue 3 scoped styles can't always
 * reach a child component's SVG root (the `data-v-*` attribute placement
 * is inconsistent), so we let each icon's own `:width="size"` /
 * `:height="size"` props carry the dimensions. The `size` prop is already
 * propagated from AppIcon to the child via `:size="size"` in the
 * template above, so the explicit pixel size always wins.
 *
 * Colour inherits from the surrounding text via `stroke="currentColor"`
 * inside each icon component — no need to set `color` here either.
 */
.app-icon {
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}

.app-icon-fallback {
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}
</style>
