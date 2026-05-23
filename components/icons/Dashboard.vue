<template>
  <!--
    Dashboard icon — modular 2x2 tile grid with one accented panel.
    Stroke-based, mirrors the design language used by modern fintech
    dashboards (Linear, Plaid, Stripe). The bottom-right tile carries
    a soft fill so the icon reads as "dashboard with focus" rather
    than a plain grid.
  -->
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
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect
      x="13.5"
      y="13.5"
      width="7.5"
      height="7.5"
      rx="1.5"
      fill="currentColor"
      fill-opacity="0.18"
    />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
