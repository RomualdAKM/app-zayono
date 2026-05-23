<template>
  <!-- Trash — open bin with handle bar above + 3 inner vertical
       strokes (lid removed for clarity). "Delete" action icon. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M8 6 v-2 a2 2 0 0 1 2 -2 h4 a2 2 0 0 1 2 2 v2" />
    <path d="M5 6 l1 13 a2 2 0 0 0 2 1.8 h8 a2 2 0 0 0 2 -1.8 l1 -13" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
