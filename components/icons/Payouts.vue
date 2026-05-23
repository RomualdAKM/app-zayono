<template>
  <!--
    Payouts icon — the mirror of Payments: an upward arrow rising OUT
    of the same vault base. Keeping the vault identical between
    Payments and Payouts is intentional; the arrow direction is the
    sole semantic difference, which makes the pair instantly readable
    in the navigation rail.
  -->
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
    <!-- Outward arrow rising upward. Inverted of the Payments icon. -->
    <path d="M12 11 v-8" />
    <path d="M8 6.5 l4 -4 4 4" />

    <!-- Same vault base as Payments — visual continuity matters more
         than uniqueness here, the arrow does the heavy lifting. -->
    <path
      d="M3 14 h18 v5 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 Z"
    />

    <!-- Coin slot accent — placed mirrored on the LEFT this time so a
         user side-by-side comparing the two icons can spot the
         direction at a glance even when arrows are clipped. -->
    <circle cx="7" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
