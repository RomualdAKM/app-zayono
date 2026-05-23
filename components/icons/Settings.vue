<template>
  <!-- Settings — three horizontal "mixer" sliders with knobs at
       different positions. Reads as "tune your platform" rather
       than the more generic gear, which we keep for the child
       "Réglages" entry to differentiate the two semantic levels. -->
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
    <!-- Slider 1: knob to the LEFT -->
    <line x1="3" y1="6" x2="21" y2="6" />
    <circle cx="8" cy="6" r="2.4" fill="currentColor" fill-opacity="0.18" />
    <!-- Slider 2: knob to the RIGHT -->
    <line x1="3" y1="12" x2="21" y2="12" />
    <circle cx="16" cy="12" r="2.4" fill="currentColor" fill-opacity="0.18" />
    <!-- Slider 3: knob CENTERED -->
    <line x1="3" y1="18" x2="21" y2="18" />
    <circle cx="12" cy="18" r="2.4" fill="currentColor" fill-opacity="0.18" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
