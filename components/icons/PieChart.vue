<template>
  <!-- PieChart — full circle with one quadrant accented. Used for
       "Statistiques › Global" to suggest a high-level distribution
       view, distinct from the trend (LineChart) and category
       breakdown (BarChart) siblings. -->
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
    <circle cx="12" cy="12" r="9" />
    <!-- Accented slice: top → right (quadrant). The fill uses the
         "Move/Line/Arc/Line/Z" shorthand so the stroke renders only
         on the radii (not on the existing circle outline). -->
    <path d="M12 12 L12 3 A9 9 0 0 1 21 12 Z" fill="currentColor" fill-opacity="0.18" />
    <line x1="12" y1="12" x2="12" y2="3" />
    <line x1="12" y1="12" x2="21" y2="12" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
