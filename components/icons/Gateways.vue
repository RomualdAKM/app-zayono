<template>
  <!-- Gateways — central hub with three branches. Reads as a routing
       fan-out, which is exactly what a payment gateway is: one
       application talking to multiple aggregators. -->
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
    <!-- Connection lines first so the node circles draw on top -->
    <line x1="12" y1="11" x2="5" y2="6" />
    <line x1="12" y1="11" x2="19" y2="6" />
    <line x1="12" y1="14" x2="12" y2="19" />
    <!-- Central hub (filled accent) -->
    <circle cx="12" cy="12" r="2.5" fill="currentColor" fill-opacity="0.18" />
    <!-- Three peripheral nodes -->
    <circle cx="5" cy="5" r="1.9" />
    <circle cx="19" cy="5" r="1.9" />
    <circle cx="12" cy="20" r="1.9" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
