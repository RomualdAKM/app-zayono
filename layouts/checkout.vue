<template>
  <!--
    Checkout layout — INTENTIONALLY EMPTY.
    Moneroo / Stripe / Paystack convention: zero chrome around the
    checkout card. No top bar, no footer. The card lives in the
    centre of a neutral grey background; trust signals (merchant
    identity, security mention) live INSIDE the card, not outside.
  -->
  <div class="checkout-shell">
    <main class="checkout-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * Checkout layout — minimal viewport shell.
 *
 * - No top-bar, no footer. Trust + branding live inside the card.
 * - Imports checkout design tokens (--ck-*), separate namespace
 *   from the dashboard (--ze-*).
 * - Does NOT import main.css — the checkout bundle stays tiny.
 */
import '~/assets/css/checkout-tokens.css'
</script>

<style scoped>
.checkout-shell {
  min-height: 100vh;
  background: var(--ck-bg-page, #f3f4f6);
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.checkout-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ck-sp-6) var(--ck-sp-4);
}

/* On large viewports the card stays vertically centred. On mobile the
   padding tightens so the card uses the full width. */
@media (max-width: 480px) {
  .checkout-main {
    padding: var(--ck-sp-4) var(--ck-sp-3);
    align-items: flex-start;
  }
}
</style>
