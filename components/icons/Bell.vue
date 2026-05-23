<template>
  <!-- Bell — classic notification bell with clapper. Used by the
       header notification dropdown (distinct from Webhook which is
       a 3-node graph). -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M6 17 V11 a6 6 0 0 1 12 0 v6 l1.5 2 h-15 Z" />
    <path d="M10 19 a2 2 0 0 0 4 0" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
