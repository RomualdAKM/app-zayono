<template>
  <button
    type="button"
    class="ck-cta"
    :class="{
      'ck-cta--sticky': sticky,
      'ck-cta--loading': loading,
    }"
    :disabled="disabled || loading"
    @click="$emit('click')"
  >
    <span v-if="loading" class="ck-cta__spinner" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" stroke-opacity="0.25" />
        <path
          d="M21 12a9 9 0 0 1-9 9"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </span>
    <span class="ck-cta__label">{{ loading ? loadingLabel : label }}</span>
  </button>
</template>

<script setup lang="ts">
/**
 * Primary checkout CTA. The label embeds the amount per Moneroo /
 * Stripe convention ("Payer 2 500 F CFA") so the customer's last
 * cognitive checkpoint is the amount itself.
 *
 * `sticky` pins the CTA to the bottom of the viewport with safe-area
 * padding for iOS — used on Step 2 when the form is taller than the
 * viewport and we don't want the customer to lose the CTA on scroll.
 */
const props = defineProps<{
  label: string
  loading?: boolean
  disabled?: boolean
  sticky?: boolean
  loadingLabel?: string
}>()

defineEmits<{ click: [] }>()

const { t } = useI18n()
const loadingLabel = computed(() => props.loadingLabel ?? t('checkout.cta.loadingLabel'))
</script>

<style scoped>
.ck-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ck-sp-2);
  width: 100%;
  min-height: var(--ck-cta-height-mobile);
  padding: 0 var(--ck-sp-4);
  background: var(--ck-primary);
  color: var(--ck-text-on-primary);
  border: none;
  border-radius: var(--ck-r-lg);
  font: inherit;
  font-size: var(--ck-text-md);
  font-weight: var(--ck-fw-semibold);
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background var(--ck-duration-quick) var(--ck-easing-fast),
              transform var(--ck-duration-quick) var(--ck-easing-fast);
}

/* Intentionally no :hover colour change: the CTA keeps its brand fill so the
   button colour stays constant on hover. Press feedback is the :active scale. */

.ck-cta:active:not(:disabled) {
  transform: scale(0.99);
}

.ck-cta:focus-visible {
  outline: none;
  box-shadow: var(--ck-shadow-focus);
}

.ck-cta:disabled {
  background: var(--ck-text-disabled);
  cursor: not-allowed;
  opacity: 0.7;
}

.ck-cta--loading {
  cursor: progress;
}

.ck-cta--sticky {
  position: sticky;
  bottom: 0;
  /* iOS safe area for devices with a home indicator. Falls back to
     the regular padding on browsers that don't support env(). */
  padding-bottom: env(safe-area-inset-bottom, 0);
  /* Ensure the sticky CTA sits above whatever scrolls under it. */
  z-index: 10;
  /* Add a subtle top fade so content underneath doesn't visually
     collide with the CTA edge. */
  background: linear-gradient(
    to top,
    var(--ck-primary) 0%,
    var(--ck-primary) calc(100% - 4px),
    var(--ck-primary) 100%
  );
  box-shadow: 0 -8px 16px -8px rgba(16, 24, 40, 0.08);
}

.ck-cta__spinner {
  display: inline-flex;
  animation: ck-cta-spin 0.9s linear infinite;
}

@keyframes ck-cta-spin {
  to { transform: rotate(360deg); }
}

@media (min-width: 768px) {
  .ck-cta {
    min-height: var(--ck-cta-height-desktop);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ck-cta__spinner {
    animation-duration: 4s;
  }
}
</style>
