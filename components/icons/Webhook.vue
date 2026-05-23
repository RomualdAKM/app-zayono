<template>
  <!-- Webhook — three nodes in a triangle linked by curves, the
       universally-recognised "webhook.org" mark adapted to stroke
       style. Each node is a different size to suggest the inbound /
       branch / fan-out flow of a real webhook chain. -->
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
    <!-- Connection paths first (drawn beneath the nodes) -->
    <path d="M12 7 v3 a4.5 4.5 0 0 1 -4.5 4.5" />
    <path d="M14.5 8 l3 5" />
    <!-- Three nodes -->
    <circle cx="12" cy="5" r="2.2" />
    <circle cx="6.5" cy="17.5" r="2.2" />
    <circle cx="18" cy="15" r="2.2" fill="currentColor" fill-opacity="0.18" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
