<template>
  <div
    class="ck-state"
    :class="`ck-state--${variant}`"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <div class="ck-state__icon">
      <!-- Inline SVGs per variant — no PrimeIcons dependency. -->
      <component :is="iconComponent" />
    </div>
    <h2 class="ck-state__title">{{ title }}</h2>
    <!-- Plain text only — no v-html. The redirecting state previously
         used <strong> highlighting via v-html, but that was an XSS
         vector (merchant.name and other server-controlled strings
         could land here unescaped). Callers needing highlight now use
         the default slot below. R1 audit BLOCKING fix. -->
    <p v-if="message" class="ck-state__message">{{ message }}</p>
    <p v-if="reference" class="ck-state__reference">
      Référence : <code>{{ reference }}</code>
    </p>
    <div v-if="$slots.actions" class="ck-state__actions">
      <slot name="actions" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Shared shell for the non-form checkout states: loading, processing,
 * awaiting_ussd, awaiting_otp, success, failed, expired, timeout,
 * aggregator_down, merchant_cancelled, session_unknown, error,
 * polling_stale, redirecting, validating.
 *
 * Each variant carries its own colour + icon. Title + message are
 * required, reference (a public transaction id) is optional.
 *
 * The component uses `role="status"` + `aria-live="polite"` so screen
 * readers announce state changes (success / failure / timeout) without
 * interrupting whatever the user was doing.
 */
const props = defineProps<{
  variant:
    | 'loading'
    | 'processing'
    | 'redirecting'
    | 'awaiting_ussd'
    | 'awaiting_otp'
    | 'polling_stale'
    | 'success'
    | 'failed'
    | 'expired'
    | 'timeout'
    | 'aggregator_down'
    | 'merchant_cancelled'
    | 'session_unknown'
    | 'error'
  title: string
  message?: string
  reference?: string | null
}>()

const Spinner = {
  name: 'CkSpinner',
  setup() {
    return () => h('svg', {
      width: 32,
      height: 32,
      viewBox: '0 0 24 24',
      fill: 'none',
      class: 'ck-state__spin',
    }, [
      h('circle', {
        cx: 12, cy: 12, r: 9,
        stroke: 'currentColor', 'stroke-width': 2, 'stroke-opacity': 0.25,
      }),
      h('path', {
        d: 'M21 12a9 9 0 0 1-9 9',
        stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round',
      }),
    ])
  },
}

const Check = {
  setup: () => () => h('svg', {
    width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none',
  }, h('path', {
    d: 'M5 12l5 5 9-9',
    stroke: 'currentColor', 'stroke-width': 2.5,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  })),
}

const Cross = {
  setup: () => () => h('svg', {
    width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none',
  }, h('path', {
    d: 'M6 6l12 12M18 6L6 18',
    stroke: 'currentColor', 'stroke-width': 2.5,
    'stroke-linecap': 'round',
  })),
}

const Clock = {
  setup: () => () => h('svg', {
    width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none',
  }, [
    h('circle', { cx: 12, cy: 12, r: 9, stroke: 'currentColor', 'stroke-width': 2 }),
    h('path', {
      d: 'M12 7v5l3 2',
      stroke: 'currentColor', 'stroke-width': 2,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }),
  ]),
}

const Warning = {
  setup: () => () => h('svg', {
    width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none',
  }, [
    h('path', {
      d: 'M12 3 2 21h20L12 3Z',
      stroke: 'currentColor', 'stroke-width': 2,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }),
    h('path', { d: 'M12 10v5', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' }),
    h('circle', { cx: 12, cy: 18, r: 0.5, stroke: 'currentColor', 'stroke-width': 2 }),
  ]),
}

const Phone = {
  setup: () => () => h('svg', {
    width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none',
  }, [
    h('rect', {
      x: 7, y: 3, width: 10, height: 18, rx: 2,
      stroke: 'currentColor', 'stroke-width': 2,
    }),
    h('path', { d: 'M11 18h2', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' }),
  ]),
}

const iconComponent = computed(() => {
  switch (props.variant) {
    case 'loading':
    case 'redirecting':
    case 'validating' as any:
      return Spinner
    case 'processing':
    case 'awaiting_ussd':
    case 'awaiting_otp':
      return Phone
    case 'polling_stale':
    case 'expired':
    case 'timeout':
      return Clock
    case 'success':
      return Check
    case 'aggregator_down':
    case 'merchant_cancelled':
    case 'session_unknown':
    case 'failed':
      return Cross
    case 'error':
    default:
      return Warning
  }
})
</script>

<style scoped>
.ck-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--ck-sp-12) var(--ck-sp-6);
}

.ck-state__icon {
  width: 64px;
  height: 64px;
  border-radius: var(--ck-r-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--ck-sp-5);
}

.ck-state__title {
  margin: 0 0 var(--ck-sp-2);
  font-size: var(--ck-text-lg);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-strong);
  line-height: var(--ck-lh-tight);
}

.ck-state__message {
  margin: 0 0 var(--ck-sp-4);
  font-size: var(--ck-text-base);
  color: var(--ck-text-muted);
  line-height: var(--ck-lh-relaxed);
  max-width: 360px;
}

.ck-state__reference {
  margin: 0 0 var(--ck-sp-4);
  font-size: var(--ck-text-sm);
  color: var(--ck-text-muted);
}

.ck-state__reference code {
  background: var(--ck-surface-sunken);
  padding: 2px 6px;
  border-radius: var(--ck-r-sm);
  font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--ck-text-strong);
}

.ck-state__actions {
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-3);
  width: 100%;
  max-width: 320px;
  margin-top: var(--ck-sp-2);
}

/* Per-variant colour ↓ */

.ck-state--loading .ck-state__icon,
.ck-state--redirecting .ck-state__icon,
.ck-state--processing .ck-state__icon,
.ck-state--awaiting_ussd .ck-state__icon,
.ck-state--awaiting_otp .ck-state__icon {
  background: var(--ck-info-soft);
  color: var(--ck-info);
}

.ck-state--success .ck-state__icon {
  background: var(--ck-success-soft);
  color: var(--ck-success);
}

.ck-state--failed .ck-state__icon,
.ck-state--aggregator_down .ck-state__icon,
.ck-state--merchant_cancelled .ck-state__icon,
.ck-state--session_unknown .ck-state__icon,
.ck-state--error .ck-state__icon {
  background: var(--ck-danger-soft);
  color: var(--ck-danger);
}

.ck-state--polling_stale .ck-state__icon,
.ck-state--expired .ck-state__icon,
.ck-state--timeout .ck-state__icon {
  background: var(--ck-warning-soft);
  color: var(--ck-warning);
}

.ck-state__spin {
  animation: ck-state-spin 0.9s linear infinite;
}

@keyframes ck-state-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .ck-state__spin {
    animation-duration: 4s;
  }
}
</style>
