<template>
  <div class="status-shell">
    <header class="status-header">
      <a href="/" class="brand">
        <span class="brand-mark">Zayono</span>
        <span class="brand-sub">{{ $t('statusLayout.subtitle') }}</span>
      </a>
    </header>
    <main class="status-main">
      <slot />
    </main>
    <footer class="status-footer">
      <span>{{ t('statusLayout.footer', { year }) }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const year = new Date().getFullYear()
</script>

<style scoped>
.status-shell {
  min-height: 100vh;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #111827;
}

.status-header {
  padding: 18px 32px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.brand {
  display: inline-flex;
  align-items: baseline;
  gap: 12px;
  text-decoration: none;
  color: #111827;
}

.brand-mark {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.brand-sub {
  font-size: 14px;
  color: #6b7280;
}

.status-main {
  flex: 1;
  max-width: 920px;
  width: 100%;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

.status-footer {
  padding: 20px 32px;
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  border-top: 1px solid #e5e7eb;
}
</style>
