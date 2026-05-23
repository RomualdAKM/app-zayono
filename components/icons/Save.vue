<template>
  <!-- Save — floppy-disk silhouette. Generic save action, retained
       because it's the universal "persist" iconography even on devices
       that haven't seen a real floppy in 25 years. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5 3 h12 l4 4 v12 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 V5 a2 2 0 0 1 2 -2 Z" />
    <path d="M8 3 v6 h8 V3" />
    <path d="M8 13 h8 v8 H8 Z" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
