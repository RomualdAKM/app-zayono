<template>
  <span class="status-pill" :class="`status-pill--${kind}`">
    <span class="status-pill-dot"></span>
    <span class="status-pill-label">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
/**
 * Unified status pill — dot + label + tinted background + light border.
 * The colored dot is the scannable cue when the eye sweeps a column of
 * 20 rows. Same pattern as Stripe Dashboard and Linear.
 *
 * Vocabulary unified: Réussi / En cours / Échoué / Annulé / Initié.
 */
const props = defineProps<{
  status: string
}>()

const { t } = useI18n()

type StatusKind = 'success' | 'pending' | 'failed' | 'cancelled' | 'initiated' | 'refunded'

// Only the `kind` is static; the label is resolved through i18n so the
// badge re-renders when the user toggles language at runtime.
const KIND_MAP: Record<string, StatusKind> = {
  success: 'success',
  pending: 'pending',
  initiated: 'initiated',
  failed: 'failed',
  cancelled: 'cancelled',
  // `refunded` is a positive merchant-initiated outcome — distinct from
  // `cancelled` (customer abandoned). Render with its own teal palette
  // so it scans differently from both `cancelled` (grey) and `success` (green).
  refunded: 'refunded',
}

const kind = computed<StatusKind>(() => KIND_MAP[props.status] || 'initiated')

const label = computed(() => {
  const mapped = KIND_MAP[props.status]
  if (mapped) return t(`txStatusBadge.${mapped}`)
  return props.status
})
</script>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px 3px 7px;
  border-radius: var(--radius-full);
  border: 1px solid;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
  white-space: nowrap;
}

.status-pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-pill--success {
  background: var(--success-50);
  color: var(--success-700);
  border-color: var(--success-300);
}
.status-pill--success .status-pill-dot { background: var(--success-500); }

.status-pill--pending {
  background: var(--warning-50);
  color: var(--warning-700);
  border-color: var(--warning-300);
}
.status-pill--pending .status-pill-dot { background: var(--warning-500); }

.status-pill--initiated {
  background: var(--info-50);
  color: var(--info-700);
  border-color: var(--info-300);
}
.status-pill--initiated .status-pill-dot { background: var(--info-500); }

.status-pill--failed {
  background: var(--danger-50);
  color: var(--danger-700);
  border-color: var(--danger-300);
}
.status-pill--failed .status-pill-dot { background: var(--danger-500); }

.status-pill--cancelled {
  background: var(--neutral-100);
  color: var(--neutral-700);
  border-color: var(--neutral-200);
}
.status-pill--cancelled .status-pill-dot { background: var(--neutral-400); }

/* Refunded — teal palette: positive merchant action, but clearly different
   from `success` (green) so the merchant can tell at a glance whether the
   money flowed in or was returned. */
.status-pill--refunded {
  background: #CCFBF1;
  color: #115E59;
  border-color: #5EEAD4;
}
.status-pill--refunded .status-pill-dot { background: #0D9488; }
</style>
