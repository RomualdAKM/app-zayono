<template>
  <!-- Dollar — vertical bar with two S-shaped tails forming a "$".
       Used for revenue / amount KPI tiles. Currency-agnostic (the
       glyph is universally read as "money"). -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="12" y1="2" x2="12" y2="22" />
    <path d="M17 6 H9.5 a3 3 0 0 0 0 6 h5 a3 3 0 0 1 0 6 H7" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
