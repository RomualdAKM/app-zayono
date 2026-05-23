<template>
  <!-- Help — life-ring / preserver, more distinctive than the
       generic question-mark-in-circle. The four outer ticks suggest
       "support reaching out from all sides". -->
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
    <!-- Outer ring -->
    <circle cx="12" cy="12" r="9" />
    <!-- Inner hub -->
    <circle cx="12" cy="12" r="3.2" fill="currentColor" fill-opacity="0.18" />
    <!-- Four spokes connecting hub to rim -->
    <line x1="12" y1="3" x2="12" y2="8.8" />
    <line x1="12" y1="15.2" x2="12" y2="21" />
    <line x1="3" y1="12" x2="8.8" y2="12" />
    <line x1="15.2" y1="12" x2="21" y2="12" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
