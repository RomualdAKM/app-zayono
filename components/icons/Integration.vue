<template>
  <!-- Integration — code brackets with a slash separator. The classic
       `< / >` developer shorthand, drawn with widened spacing so it
       reads cleanly at small sizes. -->
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
    <path d="M8 7 l-5 5 5 5" />
    <path d="M16 7 l5 5 -5 5" />
    <line x1="13.5" y1="4.5" x2="10.5" y2="19.5" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
