<template>
  <!-- Download — downward arrow landing on a horizontal tray (the
       "saved file" base). Used for CSV exports and report downloads. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="12" y1="3" x2="12" y2="15" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="4" y1="20" x2="20" y2="20" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
