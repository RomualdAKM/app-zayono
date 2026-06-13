<template>
  <header class="ck-header" :class="{ 'ck-header--with-back': showBack }">
    <button
      v-if="showBack"
      type="button"
      class="ck-header__back"
      :aria-label="backLabel"
      @click="$emit('back')"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M15 18l-6-6 6-6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div class="ck-header__brand">
      <img
        v-if="logoUrl && !logoFailed"
        :src="logoUrl"
        :alt="merchantName"
        class="ck-header__logo"
        @error="logoFailed = true"
      />
      <span class="ck-header__name">{{ merchantName }}</span>
    </div>

    <!-- Right slot reserved for the (future) language pill / status badge. -->
    <div class="ck-header__right">
      <slot name="right" />
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * Checkout header — merchant logo + name + optional back button.
 * Used on every step of every template.
 *
 * `back` event is emitted when the user clicks the back button in
 * Step 2. The parent template decides what "back" means (step 1, or
 * close, or browser history).
 */
const props = defineProps<{
  merchantName: string
  logoUrl?: string | null
  showBack?: boolean
  backLabel?: string
}>()

defineEmits<{ back: [] }>()

const { t } = useI18n()
const logoFailed = ref(false)
const backLabel = computed(() => props.backLabel || t('checkout.header.backAriaLabel'))

// Reset failed flag when logoUrl changes (merchant edited their logo).
watch(() => props.logoUrl, () => { logoFailed.value = false })
</script>

<style scoped>
.ck-header {
  display: flex;
  align-items: center;
  gap: var(--ck-sp-3);
  padding: var(--ck-sp-4) var(--ck-sp-4);
  background: var(--ck-surface);
  border-bottom: 1px solid var(--ck-border);
  min-height: 56px;
}

.ck-header__back {
  width: var(--ck-touch-target);
  height: var(--ck-touch-target);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--ck-r-full);
  color: var(--ck-text-body);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--ck-duration-quick) var(--ck-easing-fast);
}

.ck-header__back:hover {
  background: var(--ck-surface-hover);
}

.ck-header__back:focus-visible {
  outline: none;
  box-shadow: var(--ck-shadow-focus);
}

.ck-header__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-sp-2);
  flex: 1;
  min-width: 0;
}

.ck-header__logo {
  height: 28px;
  width: auto;
  max-width: 100px;
  object-fit: contain;
  flex-shrink: 0;
}

.ck-header__name {
  font-size: var(--ck-text-md);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ck-header__right {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-sp-2);
  flex-shrink: 0;
}
</style>
