<template>
  <!-- Warning — equilateral triangle with rounded corners + exclamation
       mark. Used for non-fatal warnings ("pending approval", "expires
       soon"), distinct from Error which is a circle. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M10.3 3.7 L2.6 17 a2 2 0 0 0 1.7 3 h15.4 a2 2 0 0 0 1.7 -3 L13.7 3.7 a2 2 0 0 0 -3.4 0 Z" />
    <line x1="12" y1="9" x2="12" y2="13.5" />
    <circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
