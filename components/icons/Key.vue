<template>
  <!-- Key — bow circle + diagonal shaft with two teeth at the tip.
       The classic "API credential" iconography. Drawn at 45° so the
       shaft fills the icon box symmetrically. -->
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
    <!-- Bow (the round end held in your hand) -->
    <circle cx="7" cy="17" r="3.5" />
    <!-- Eye accent inside the bow -->
    <circle cx="7" cy="17" r="1" fill="currentColor" stroke="none" />
    <!-- Shaft -->
    <line x1="9.5" y1="14.5" x2="20" y2="4" />
    <!-- Two teeth -->
    <line x1="15" y1="9" x2="17.5" y2="11.5" />
    <line x1="17.5" y1="6.5" x2="20" y2="9" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
