<template>
  <div class="ck-receipt">
    <div class="ck-receipt__hero">
      <span class="ck-receipt__check-circle" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12l5 5 9-9"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <h2 class="ck-receipt__title">{{ t('checkout.receipt.title') }}</h2>
      <p v-if="merchantName" class="ck-receipt__merchant">
        {{ t('checkout.receipt.paidTo') }} <strong>{{ merchantName }}</strong>
      </p>
      <CheckoutAmountDisplay
        :amount="amount"
        :currency="currency"
        size="large"
      />
    </div>

    <dl class="ck-receipt__details">
      <div v-if="reference" class="ck-receipt__row">
        <dt>{{ t('checkout.receipt.referenceLabel') }}</dt>
        <dd>
          <code>{{ reference }}</code>
          <button
            type="button"
            class="ck-receipt__copy"
            :aria-label="t('checkout.receipt.copyReferenceAriaLabel', { reference })"
            @click="copy(reference)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect
                x="8" y="8" width="12" height="12" rx="2"
                stroke="currentColor" stroke-width="2"
              />
              <path
                d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
                stroke="currentColor" stroke-width="2"
              />
            </svg>
            <span>{{ copied ? t('checkout.receipt.copied') : t('checkout.receipt.copy') }}</span>
          </button>
        </dd>
      </div>
      <div v-if="paidAt" class="ck-receipt__row">
        <dt>{{ t('checkout.receipt.dateLabel') }}</dt>
        <dd>{{ formattedDate }}</dd>
      </div>
      <div v-if="operatorLabel" class="ck-receipt__row">
        <dt>{{ t('checkout.receipt.methodLabel') }}</dt>
        <dd>{{ operatorLabel }}</dd>
      </div>
      <div v-if="maskedPhone" class="ck-receipt__row">
        <dt>{{ t('checkout.receipt.phoneLabel') }}</dt>
        <dd>{{ maskedPhone }}</dd>
      </div>
    </dl>

    <div class="ck-receipt__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Receipt rendered on the terminal success state. Shows:
 *   - Big green check + "Paiement confirmé" + amount
 *   - Merchant name
 *   - Transaction reference (copyable)
 *   - Date / time
 *   - Operator + masked phone (so the customer recognises themselves)
 *   - Slot for action buttons (download PDF, email receipt, return)
 */
const props = defineProps<{
  amount: number
  currency: string
  merchantName?: string | null
  reference?: string | null
  paidAt?: string | null
  operatorLabel?: string | null
  maskedPhone?: string | null
}>()

const { t, locale } = useI18n()
const copied = ref(false)

const formattedDate = computed(() => {
  if (!props.paidAt) return ''
  try {
    const d = new Date(props.paidAt)
    return new Intl.DateTimeFormat(locale.value === 'en' ? 'en-US' : 'fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return props.paidAt
  }
})

async function copy(text: string | null | undefined) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Clipboard API unavailable — silent fallback (the customer can
    // still long-press the <code> element to copy manually on mobile).
  }
}
</script>

<style scoped>
.ck-receipt {
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-6);
}

.ck-receipt__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ck-sp-3);
  text-align: center;
}

.ck-receipt__check-circle {
  width: 64px;
  height: 64px;
  border-radius: var(--ck-r-full);
  background: var(--ck-success-soft);
  color: var(--ck-success);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ck-receipt__title {
  margin: 0;
  font-size: var(--ck-text-lg);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-strong);
}

.ck-receipt__merchant {
  margin: 0;
  font-size: var(--ck-text-base);
  color: var(--ck-text-muted);
}

.ck-receipt__merchant strong {
  color: var(--ck-text-body);
  font-weight: var(--ck-fw-semibold);
}

.ck-receipt__details {
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-2);
  margin: 0;
  padding: var(--ck-sp-4);
  background: var(--ck-surface-sunken);
  border-radius: var(--ck-r-md);
}

.ck-receipt__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--ck-sp-3);
  font-size: var(--ck-text-base);
}

.ck-receipt__row dt {
  color: var(--ck-text-muted);
  flex-shrink: 0;
}

.ck-receipt__row dd {
  margin: 0;
  color: var(--ck-text-body);
  display: inline-flex;
  align-items: center;
  gap: var(--ck-sp-2);
  font-variant-numeric: tabular-nums;
}

.ck-receipt__row dd code {
  font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--ck-text-sm);
  color: var(--ck-text-strong);
}

.ck-receipt__copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: transparent;
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-r-sm);
  font: inherit;
  font-size: var(--ck-text-xs);
  color: var(--ck-text-muted);
  cursor: pointer;
  transition: all var(--ck-duration-quick) var(--ck-easing-fast);
}

.ck-receipt__copy:hover {
  background: var(--ck-surface);
  color: var(--ck-text-body);
}

.ck-receipt__actions {
  display: flex;
  flex-direction: column;
  gap: var(--ck-sp-2);
}
</style>
