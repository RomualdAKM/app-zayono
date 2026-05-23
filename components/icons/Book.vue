<template>
  <!-- Book — half-open volume seen from above (two facing pages
       meeting at a spine). Reads as "documentation / handbook". -->
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
    <!-- Left page -->
    <path d="M3 5.5 a2 2 0 0 1 2 -2 h6 v17 H5 a2 2 0 0 1 -2 -2 Z" />
    <!-- Right page (mirrored, with accent fill so the icon doesn't
         render as a hollow rectangle on busy backgrounds) -->
    <path
      d="M21 5.5 a2 2 0 0 0 -2 -2 h-6 v17 h6 a2 2 0 0 0 2 -2 Z"
      fill="currentColor"
      fill-opacity="0.18"
    />
    <!-- Spine -->
    <line x1="12" y1="3.5" x2="12" y2="20.5" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
