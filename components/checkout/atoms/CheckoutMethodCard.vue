<template>
  <button
    type="button"
    class="ck-method"
    :class="{
      'ck-method--selected': selected,
      'ck-method--disabled': disabled,
      'ck-method--loading': loading,
    }"
    :disabled="disabled || loading"
    :aria-pressed="selected"
    @click="$emit('click')"
  >
    <span class="ck-method__logo" :style="logoStyle" aria-hidden="true">
      <img
        v-if="logoUrl && !logoFailed"
        :src="logoUrl"
        alt=""
        @error="logoFailed = true"
      />
      <span v-else class="ck-method__initials">{{ initials }}</span>
    </span>

    <span class="ck-method__body">
      <span class="ck-method__name">{{ name }}</span>
      <span v-if="subtitle" class="ck-method__subtitle">{{ subtitle }}</span>
    </span>

    <span v-if="loading" class="ck-method__spinner" :aria-label="t('checkout.methodCard.loadingAriaLabel')">
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
    <svg
      v-else-if="selected"
      class="ck-method__check"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12l5 5 9-9"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <svg
      v-else
      class="ck-method__chevron"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
/**
 * Method card for the Step 1 list. 56px high, brand-coloured logo
 * circle, name + optional subtitle (e.g. country), chevron / check.
 *
 * `brandColor` is OPTIONAL — when provided, used as the background
 * of the logo circle (eg yellow for MTN, orange for Moov, blue for
 * Celtiis). When missing, falls back to the surface-sunken neutral.
 */
const props = defineProps<{
  name: string
  subtitle?: string
  logoUrl?: string | null
  brandColor?: string | null
  selected?: boolean
  disabled?: boolean
  loading?: boolean
}>()

defineEmits<{ click: [] }>()

const { t } = useI18n()
const logoFailed = ref(false)

const initials = computed(() =>
  (props.name || '?').substring(0, 2).toUpperCase(),
)

const logoStyle = computed(() => ({
  backgroundColor: props.brandColor || 'var(--ck-surface-sunken)',
  color: props.brandColor ? '#ffffff' : 'var(--ck-text-body)',
}))

watch(() => props.logoUrl, () => { logoFailed.value = false })
</script>

<style scoped>
.ck-method {
  display: flex;
  align-items: center;
  gap: var(--ck-sp-3);
  width: 100%;
  min-height: 60px;
  padding: var(--ck-sp-3) var(--ck-sp-4);
  background: var(--ck-surface);
  border: 1px solid var(--ck-border);
  border-radius: 4px;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--ck-duration-quick) var(--ck-easing-fast),
              background var(--ck-duration-quick) var(--ck-easing-fast),
              transform var(--ck-duration-quick) var(--ck-easing-fast);
}

.ck-method:hover:not(:disabled) {
  border-color: var(--ck-text-strong);
  background: var(--ck-surface-sunken);
}

.ck-method:active:not(:disabled) {
  transform: scale(0.98);
}

.ck-method:focus-visible {
  outline: none;
  border-color: var(--ck-primary);
  box-shadow: var(--ck-shadow-focus);
}

.ck-method--selected {
  border-color: var(--ck-primary);
  border-width: 2px;
  background: var(--ck-primary-soft);
  color: var(--ck-primary);
  /* compensate the 2px border so the card height stays consistent
     vs unselected siblings (avoids vertical jitter on selection). */
  padding: calc(var(--ck-sp-3) - 1px) calc(var(--ck-sp-4) - 1px);
}

.ck-method--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ck-method--loading {
  cursor: progress;
}

.ck-method__logo {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: var(--ck-text-sm);
  font-weight: var(--ck-fw-bold);
  letter-spacing: -0.02em;
  overflow: hidden;
}

.ck-method__logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.ck-method__initials {
  font-size: var(--ck-text-sm);
}

.ck-method__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.ck-method__name {
  font-size: var(--ck-text-md);
  font-weight: var(--ck-fw-medium);
  color: var(--ck-text-strong);
  line-height: var(--ck-lh-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ck-method--selected .ck-method__name {
  color: var(--ck-primary);
}

.ck-method__subtitle {
  font-size: var(--ck-text-sm);
  color: var(--ck-text-muted);
}

.ck-method__chevron {
  color: var(--ck-text-disabled);
  flex-shrink: 0;
}

.ck-method__check {
  color: var(--ck-primary);
  flex-shrink: 0;
}

.ck-method__spinner {
  color: var(--ck-primary);
  flex-shrink: 0;
  animation: ck-spin 0.9s linear infinite;
}

@keyframes ck-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .ck-method__spinner {
    animation-duration: 4s;
  }
}
</style>
