<template>
  <div class="ck-lang" role="group" :aria-label="t('checkout.lang.switch')">
    <button
      v-for="loc in localeList"
      :key="loc.code"
      type="button"
      class="ck-lang-btn"
      :class="{ 'ck-lang-btn--active': locale === loc.code }"
      :aria-pressed="locale === loc.code"
      @click="switchTo(loc.code)"
    >
      {{ loc.code.toUpperCase() }}
    </button>
  </div>
</template>

<script setup lang="ts">
// Real language selector for the customer checkout (FR / EN). Uses the same
// cookie-backed i18n as the rest of the app; lives in the --ck token space
// because the checkout layout does not load the dashboard CSS.
const { locale, locales, setLocale, t } = useI18n()

const localeList = computed(() =>
  (locales.value as Array<{ code: string }>).map((l) => ({ code: l.code })))

async function switchTo(code: string) {
  if (code === locale.value) return
  await setLocale(code as 'fr' | 'en')
}
</script>

<style scoped>
.ck-lang {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  background: var(--ck-surface-sunken, #f3f4f6);
  border: 1px solid var(--ck-border, #e5e7eb);
  border-radius: var(--ck-r-md, 6px);
}

.ck-lang-btn {
  min-width: 30px;
  height: 22px;
  padding: 0 6px;
  border: none;
  background: transparent;
  color: var(--ck-text-muted, #6b7280);
  font-size: var(--ck-text-xs, 11px);
  font-weight: var(--ck-fw-semibold, 600);
  letter-spacing: 0.02em;
  cursor: pointer;
  border-radius: var(--ck-r-sm, 4px);
  transition: background var(--ck-duration-quick, 0.15s), color var(--ck-duration-quick, 0.15s);
}

.ck-lang-btn:hover:not(.ck-lang-btn--active) {
  color: var(--ck-text-strong, #111827);
  background: var(--ck-surface-hover, #f9fafb);
}

.ck-lang-btn--active {
  background: var(--ck-surface, #fff);
  color: var(--ck-text-strong, #111827);
  box-shadow: var(--ck-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.06));
}
</style>
