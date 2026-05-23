<template>
  <!-- UserPlus — single figure + small plus on top-right. "Promote
       to super admin", "Add team member" action icon. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20.5 a6.5 6.5 0 0 1 13 0" />
    <line x1="19" y1="6" x2="19" y2="12" />
    <line x1="16" y1="9" x2="22" y2="9" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
