<template>
  <!-- Send — paper airplane angled up-right. Used for "send test
       webhook" / "send payout" actions. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 3 L3 11 l7 2 2 7 9 -17 Z" />
    <line x1="10" y1="13" x2="21" y2="3" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
