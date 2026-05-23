<template>
  <!-- Mobile — full phone body with screen + home pill. Distinct from
       the handset (Phone): this represents the device itself, used
       for "Mobile Money" / "SMS code" UI labels. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="6.5" y="2.5" width="11" height="19" rx="2" />
    <line x1="6.5" y1="6" x2="17.5" y2="6" />
    <line x1="6.5" y1="18" x2="17.5" y2="18" />
    <circle cx="12" cy="20" r="0.9" fill="currentColor" stroke="none" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
