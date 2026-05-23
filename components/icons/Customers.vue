<template>
  <!-- Customers — two overlapping figures (group of clients). The
       smaller silhouette sits slightly behind to suggest "more than
       one", which reads instantly in nav size. -->
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
    <!-- Front person -->
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20.5 a6.5 6.5 0 0 1 13 0" />
    <!-- Back person (smaller, offset right) -->
    <circle cx="17" cy="9.5" r="2.5" />
    <path d="M16.5 20.5 a4.5 4.5 0 0 1 5 -4.5" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
