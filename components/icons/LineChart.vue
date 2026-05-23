<template>
  <!-- LineChart — used for the "Statistiques › Paiements" entry.
       Up-and-to-the-right line with three data points; the rightmost
       dot carries the accent fill to suggest "latest measurement". -->
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
    <line x1="3" y1="20" x2="21" y2="20" />
    <path d="M4 16 l5 -5 4 3 7 -8" />
    <circle cx="9" cy="11" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="13" cy="14" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="20" cy="6" r="1.6" fill="currentColor" stroke="currentColor" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
