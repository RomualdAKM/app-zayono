<template>
  <!-- Refresh — circular arrow with a single rotation cycle. Used
       for "reload data", "reconcile webhook", "sync now". -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 11 a9 9 0 1 0 -2.5 7" />
    <polyline points="21 4 21 11 14 11" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
