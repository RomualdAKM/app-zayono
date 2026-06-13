<template>
  <div class="ck-phone" :class="{ 'ck-phone--error': hasError }">
    <div class="ck-phone__field">
      <span class="ck-phone__prefix" :title="phoneFormat?.name">
        <span class="ck-phone__flag" aria-hidden="true">{{ phoneFormat?.flag || '🌐' }}</span>
        <span v-if="phoneFormat?.dial_code" class="ck-phone__dial">+{{ phoneFormat.dial_code }}</span>
      </span>
      <input
        :id="inputId"
        ref="inputEl"
        :value="displayValue"
        :placeholder="placeholder"
        :aria-label="ariaLabel || (phoneFormat?.dial_code ? t('checkout.phoneInput.ariaLabelWithCode', { dialCode: phoneFormat.dial_code }) : t('checkout.phoneInput.ariaLabel'))"
        :aria-invalid="hasError ? 'true' : 'false'"
        :aria-describedby="hasError ? errorId : hintId"
        :aria-required="required ? 'true' : undefined"
        :required="required"
        type="tel"
        inputmode="tel"
        autocomplete="tel-national"
        enterkeyhint="send"
        class="ck-phone__input"
        @input="onInput"
        @blur="$emit('blur')"
      />
    </div>
    <p v-if="hasError" :id="errorId" class="ck-phone__error" role="alert">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="hintId" class="ck-phone__hint">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Phone-number input with locked dial-code prefix and per-country
 * format hint.
 *
 * The component is purely visual: validation against the country's
 * regex is delegated to the parent (the orchestrator validates the
 * full E.164 form right before submit). We do auto-formatting via
 * `phoneFormat.national_groups` so the input looks like
 * `07 12 34 56 78` instead of `0712345678`, which is the convention
 * for francophone Africa.
 */
interface PhoneFormat {
  dial_code: string
  name: string
  flag: string
  national_regex: string
  national_length: number | [number, number]
  national_hint: string
  national_example: string
  national_groups: number[]
}

const props = defineProps<{
  modelValue: string
  phoneFormat: PhoneFormat | null
  error?: string | null
  hint?: string | null
  ariaLabel?: string
  /**
   * Optional `id` to forward to the inner `&lt;input&gt;` so a parent
   * `&lt;label for="..."&gt;` actually associates. R1 audit A11y V2.
   */
  id?: string
  /**
   * Whether the field is required — toggles `required` + `aria-required`.
   * Drives the accessible-name "requis" hint as well. R1 audit V16.
   */
  required?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const { t } = useI18n()
const inputEl = ref<HTMLInputElement | null>(null)
// Stable, namespaced ids derived from useId() so two instances of the
// component on the same page never collide. The `inputId` defaults to
// a generated one when the parent doesn't pass an explicit `id`.
const generatedId = useId()
const inputId = computed(() => props.id ?? `ck-phone-${generatedId}`)
const errorId = `ck-phone-error-${generatedId}`
const hintId = `ck-phone-hint-${generatedId}`

const hasError = computed(() => Boolean(props.error))

const placeholder = computed(() =>
  props.phoneFormat?.national_example ?? '',
)

/**
 * Display value = the raw digits formatted according to
 * `national_groups`. Example: groups = [2, 2, 2, 2, 2], raw =
 * `0712345678` → `07 12 34 56 78`.
 */
const displayValue = computed(() => {
  const groups = props.phoneFormat?.national_groups
  const raw = props.modelValue || ''
  if (!groups || groups.length === 0) return raw
  const parts: string[] = []
  let cursor = 0
  for (const size of groups) {
    if (cursor >= raw.length) break
    parts.push(raw.slice(cursor, cursor + size))
    cursor += size
  }
  if (cursor < raw.length) parts.push(raw.slice(cursor))
  return parts.join(' ')
})

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  // Strip non-digits — the prefix (+229 etc.) is the locked side.
  const raw = (target.value || '').replace(/\D+/g, '')
  // Clamp to the maximum length for this country (avoid pasted +33...
  // numbers stuffing the input past the format).
  const max = maxLength(props.phoneFormat)
  const clamped = max ? raw.slice(0, max) : raw
  emit('update:modelValue', clamped)
}

function maxLength(fmt: PhoneFormat | null): number {
  if (!fmt) return 15
  const len = fmt.national_length
  if (typeof len === 'number') return len
  return Array.isArray(len) ? len[1] ?? len[0] ?? 15 : 15
}

/**
 * Compose the full E.164 form (+229 0712345678 → +2290712345678).
 * Exposed via the parent reading `modelValue` + `phoneFormat.dial_code`.
 * The component itself doesn't emit E.164 — the orchestrator
 * concatenates at submit time.
 */
</script>

<style scoped>
.ck-phone {
  width: 100%;
}

.ck-phone__field {
  display: flex;
  align-items: stretch;
  background: var(--ck-surface);
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-r-md);
  overflow: hidden;
  transition: border-color var(--ck-duration-quick) var(--ck-easing-fast),
              box-shadow var(--ck-duration-quick) var(--ck-easing-fast);
}

.ck-phone__field:focus-within {
  border-color: var(--ck-primary);
  box-shadow: var(--ck-shadow-focus);
}

.ck-phone--error .ck-phone__field {
  border-color: var(--ck-danger);
}

.ck-phone--error .ck-phone__field:focus-within {
  border-color: var(--ck-danger);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.25);
}

.ck-phone__prefix {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-sp-1);
  padding: 0 var(--ck-sp-3);
  background: var(--ck-surface-sunken);
  border-right: 1px solid var(--ck-border);
  font-size: var(--ck-text-md);
  font-weight: var(--ck-fw-medium);
  color: var(--ck-text-body);
  user-select: none;
  flex-shrink: 0;
}

.ck-phone__flag {
  font-size: 18px;
  line-height: 1;
}

.ck-phone__dial {
  font-variant-numeric: tabular-nums;
}

.ck-phone__input {
  flex: 1;
  min-width: 0;
  padding: var(--ck-sp-3) var(--ck-sp-3);
  background: transparent;
  border: none;
  outline: none;
  font: inherit;
  font-size: 16px; /* prevents iOS auto-zoom on focus — must be ≥16px */
  color: var(--ck-text-strong);
  letter-spacing: 0.02em;
}

.ck-phone__input::placeholder {
  color: var(--ck-text-disabled);
}

.ck-phone__error {
  margin: var(--ck-sp-2) 0 0;
  font-size: var(--ck-text-sm);
  color: var(--ck-danger);
  line-height: var(--ck-lh-normal);
}

.ck-phone__hint {
  margin: var(--ck-sp-2) 0 0;
  font-size: var(--ck-text-sm);
  color: var(--ck-text-muted);
  line-height: var(--ck-lh-normal);
}
</style>
