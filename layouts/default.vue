<template>
  <div class="layout-wrapper">
    <LayoutSidebar />
    <div class="layout-content">
      <LayoutHeader />
      <main class="layout-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
// R1 audit Perf H1: import the dashboard CSS bundle (main.css +
// primeicons font) here instead of globally. Keeps the checkout
// bundle slim.
import '~/assets/css/main.css'

// Initialise theme as early as possible — re-applies the saved choice on
// hard refresh so dark-mode users don't see a flash of light surface.
useTheme()
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  min-height: 100vh;
  background: var(--ze-bg-page);
  transition: background-color 0.18s ease;
}

.layout-content {
  flex: 1;
  margin-left: 250px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-width: 0;            /* prevents flex children from forcing horizontal overflow */
  transition: margin-left 0.22s ease;
}

.layout-main {
  flex: 1;
  padding: 24px;
}

/* Tablet — sidebar becomes a drawer (handled in Sidebar.vue), so content
   fills the full width. */
@media (max-width: 1024px) {
  .layout-content {
    margin-left: 0;
  }
}

/* Mobile — tighter page padding. */
@media (max-width: 768px) {
  .layout-main {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .layout-main {
    padding: 12px;
  }
}
</style>
