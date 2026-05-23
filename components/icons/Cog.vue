<template>
  <!-- Cog — classic 8-tooth gear used for the *child* "Réglages"
       entries (per-section settings). The parent-level "Réglages"
       uses the slider icon instead so the two levels feel different. -->
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
    <!-- Outer gear: 8 short rectangles around the body. Drawn as a
         single rounded path so the strokes meet cleanly. -->
    <path d="M12 2 v3 M12 19 v3 M2 12 h3 M19 12 h3 M4.9 4.9 l2.1 2.1 M17 17 l2.1 2.1 M4.9 19.1 l2.1 -2.1 M17 7 l2.1 -2.1" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" fill-opacity="0.18" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
