<template>
  <!-- Eye — almond outer shape with a circular pupil. Used for
       "view detail" / "preview" actions and password-reveal toggles. -->
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M2 12 c2.5 -5 6 -7.5 10 -7.5 c4 0 7.5 2.5 10 7.5 c-2.5 5 -6 7.5 -10 7.5 c-4 0 -7.5 -2.5 -10 -7.5 Z" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
</template>
<script setup lang="ts">
defineProps({ size: { type: [Number, String], default: 17 }, strokeWidth: { type: [Number, String], default: 1.75 } })
</script>
