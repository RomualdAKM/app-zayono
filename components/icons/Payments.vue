<template>
  <!--
    Payments icon — a downward arrow descending into a rounded vault.
    The arrow reads as money flowing IN, the vault as the merchant's
    balance. Designed as the mirror twin of the Payouts icon so the
    two navigation entries form a visual pair.
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
    <!-- Inward arrow descending from above. The 12,3 → 12,11 shaft + the
         two diagonals form a chevron pointing INTO the vault below. -->
    <path d="M12 3 v8" />
    <path d="M8 7.5 l4 4 4 -4" />

    <!-- Vault / wallet base — a rounded rectangle anchored at the bottom
         of the icon. The slight inset (x=3) keeps weight away from the
         left edge so the icon sits balanced next to the nav label. -->
    <path
      d="M3 14 h18 v5 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 Z"
    />

    <!-- Subtle coin slot detail — a single dot accents the vault and
         signals "money landed inside" without adding visual noise. -->
    <circle cx="17" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 17 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})
</script>
