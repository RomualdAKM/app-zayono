<template>
  <!-- Shield — used for the "super admin" badge / security context. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 2 l8 3.5 v6 c0 5 -3.5 8.5 -8 10 c-4.5 -1.5 -8 -5 -8 -10 v-6 Z" />
    <path d="M9 12 l2 2 4 -5" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
