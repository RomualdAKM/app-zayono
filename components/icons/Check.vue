<template>
  <!-- Check — bare checkmark, no enclosing shape. Inline confirmation
       indicator (e.g. "Email vérifié", "Activé"). Distinct from
       Success which adds the circle. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="4 12 9.5 18 20 6" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
