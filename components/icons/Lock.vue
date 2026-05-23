<template>
  <!-- Lock — padlock with closed shackle. Security / credentials /
       encrypted-field indicator. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4.5" y="11" width="15" height="10" rx="2" />
    <path d="M8 11 v-3 a4 4 0 0 1 8 0 v3" />
    <circle cx="12" cy="16" r="1.4" fill="currentColor" fill-opacity="0.18" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
