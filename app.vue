<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// Keep the `<html lang>` attribute in sync with the active i18n locale.
// nuxt.config.ts sets `htmlAttrs.lang: 'fr'` statically — this overrides
// that at runtime so screen readers + browser auto-translate respect the
// user's chosen language.
const { locale } = useI18n()
useHead({
  htmlAttrs: { lang: () => locale.value },
})
</script>
