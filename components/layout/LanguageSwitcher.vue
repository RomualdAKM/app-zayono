<template>
  <div class="lang-switcher" :class="{ 'lang-switcher--compact': compact }">
    <button
      v-for="loc in locales"
      :key="loc.code"
      type="button"
      class="lang-btn"
      :class="{ 'lang-btn--active': locale === loc.code }"
      :aria-pressed="locale === loc.code"
      :aria-label="`${$t('language.switcher')}: ${loc.name}`"
      @click="switchLocale(loc.code)"
    >
      <span class="lang-code">{{ loc.code.toUpperCase() }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const { locale, locales, setLocale } = useI18n()

async function switchLocale(code: string) {
  if (code === locale.value) return
  await setLocale(code as any)
}
</script>

<style scoped>
.lang-switcher {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  /* Use the existing semantic tokens — `--ze-surface-*` were typos that
     fell back to hardcoded light colors in dark mode, leaving the
     inactive "FR" button invisible. */
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-radius: 6px;
}

.lang-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 24px;
  padding: 0 6px;
  border: none;
  background: transparent;
  color: var(--ze-text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

.lang-btn:hover:not(.lang-btn--active) {
  color: var(--ze-text-strong);
  background: var(--ze-bg-hover);
}

.lang-btn--active {
  background: var(--ze-bg-card);
  color: var(--ze-text-strong);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.lang-btn:focus-visible {
  outline: 2px solid var(--ze-brand);
  outline-offset: 1px;
}

.lang-switcher--compact .lang-btn {
  min-width: 28px;
  height: 22px;
  font-size: 10px;
}
</style>
