<template>
  <!-- Email — envelope with the "fold" triangle visible inside.
       Used for support email links and email input fields. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <polyline points="3 7 12 13 21 7" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
