<template>
  <!-- Transactions — receipt with the classic zigzag bottom edge.
       Two horizontal lines inside hint at "line items" without
       making the icon noisy at 20px. -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M5 3 h14 v18 l-2.5 -1.5 -2.5 1.5 -2.5 -1.5 -2.5 1.5 -2.5 -1.5 -1.5 1.5 V3 Z" />
    <line x1="8.5" y1="8" x2="15.5" y2="8" />
    <line x1="8.5" y1="12" x2="13.5" y2="12" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
