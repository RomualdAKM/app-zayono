<template>
  <div class="auth-layout">
    <div class="auth-container">
      <div class="auth-header">
        <h1 class="auth-logo">Zayono</h1>
        <p class="auth-subtitle">{{ $t('authLayout.subtitle') }}</p>
      </div>
      <div class="auth-card">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// R1 audit Perf H1: dashboard CSS bundle loaded here, not globally.
// (The auth screens use the same `.auth-layout` / `.auth-card` styles
// declared in main.css.)
import '~/assets/css/main.css'

// Honour the saved theme on auth screens too (login, register, etc.)
useTheme()
</script>

<!--
  Styles for `.auth-layout`, `.auth-container`, `.auth-header`,
  `.auth-logo`, `.auth-subtitle`, and `.auth-card` live in
  `assets/css/main.css` (search for "Auth layout"). They were moved out
  of this scoped block because scoped layout CSS ships as an async chunk
  in Vite/Nuxt, and the brief window before that chunk loaded made the
  card flicker at top-left on first paint. Global main.css is bundled
  with critical CSS and blocks render, eliminating the FOUC.
-->
