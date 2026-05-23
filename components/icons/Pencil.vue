<template>
  <!-- Pencil — angled writing tool with tip pointing bottom-left.
       Common "Edit" affordance next to rows in tables. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M16.5 3.5 l4 4 -12.5 12.5 -5 1 1 -5 Z" />
    <line x1="14.5" y1="5.5" x2="18.5" y2="9.5" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
