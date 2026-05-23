<template>
  <span class="gl" :title="name || code">
    <img
      v-if="logoFile && !failed"
      :src="logoSrc"
      :alt="name || code"
      class="gl-img"
      @error="failed = true"
    />
    <span v-else class="gl-fallback">{{ fallback }}</span>
  </span>
</template>

<script setup lang="ts">
/**
 * Display the logo of a PSP (aggregator). Two input modes:
 *  - `code`   — Zayono aggregator code (`paystack`, `pawapay`, …). The
 *               filename is resolved as `/aggregator-logos/<code>.png`.
 *               Falls back to the first two letters of `name` (or `code`)
 *               on a 404.
 *  - `logoFile` — when an explicit filename is provided (eg from the
 *               backend's `available_aggregators` catalogue), use it
 *               verbatim — same `/aggregator-logos/` prefix.
 *
 * Either one (or both) is required. `name` is optional and only used
 * for the alt text + the initials fallback.
 */
const props = defineProps<{
  code?: string
  name?: string
  logoFile?: string | null
}>()

const failed = ref(false)

const logoFile = computed(() => {
  if (props.logoFile) return props.logoFile
  if (props.code) return `${props.code}.png`
  return null
})

const logoSrc = computed(() => `/aggregator-logos/${logoFile.value}`)

const fallback = computed(() => {
  const source = props.name || props.code || ''
  return source.substring(0, 2).toUpperCase()
})

watch(logoFile, () => { failed.value = false })
</script>

<style scoped>
.gl {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--ze-brand-bg-soft);
  border: 1px solid var(--ze-border-subtle);
}

.gl-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 3px;
}

.gl-fallback {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ze-brand);
}
</style>
