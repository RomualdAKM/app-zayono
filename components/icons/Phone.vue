<template>
  <!-- Phone — classic handset silhouette tilted 30° so it doesn't
       look like a generic capsule. Used for customer phone fields. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5 4 a2 2 0 0 1 2 -2 h2 l2 5 -2.5 1.5 a11 11 0 0 0 5 5 l1.5 -2.5 5 2 v2 a2 2 0 0 1 -2 2 h-1 a16 16 0 0 1 -14 -14 Z" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
