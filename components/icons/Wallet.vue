<template>
  <!-- Wallet — credit-card silhouette with the magnetic stripe and
       a small chip rectangle. The chip carries the accent fill so
       the icon reads as "method", not just a generic card. -->
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
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" />
    <!-- Magnetic stripe -->
    <line x1="2.5" y1="9.5" x2="21.5" y2="9.5" />
    <!-- Chip -->
    <rect x="6" y="13" width="4" height="2.8" rx="0.5" fill="currentColor" fill-opacity="0.18" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
