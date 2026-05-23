<template>
  <!-- Inbox — physical mail tray seen from front: top slot, two
       paper layers visible. Used for empty-state hero icons all
       across the dashboard (no transactions yet, no methods, etc.). -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 14 v3 a2 2 0 0 0 2 2 h14 a2 2 0 0 0 2 -2 v-3" />
    <path d="M3 14 l3 -8 a2 2 0 0 1 2 -1.4 h8 a2 2 0 0 1 2 1.4 l3 8" />
    <path d="M3 14 h5 l1 2 h6 l1 -2 h5" fill="currentColor" fill-opacity="0.18" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
