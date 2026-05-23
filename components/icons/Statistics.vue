<template>
  <!-- Statistics — three bars rising left-to-right with the tallest
       on the right filled, suggesting "growth trend". The axis line
       grounds the chart so it doesn't float in the icon box. -->
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
    <rect x="5" y="14" width="3.5" height="6" rx="0.6" />
    <rect x="10.25" y="9" width="3.5" height="11" rx="0.6" />
    <rect x="15.5" y="4" width="3.5" height="16" rx="0.6" fill="currentColor" fill-opacity="0.18" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
