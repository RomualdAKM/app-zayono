<template>
  <!-- UserMinus — single figure + small minus. Mirror of UserPlus
       for the "Demote / Remove role" action. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20.5 a6.5 6.5 0 0 1 13 0" />
    <line x1="16" y1="9" x2="22" y2="9" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
