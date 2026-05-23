<template>
  <!-- Single-country: render as a read-only badge. No selector to tap. -->
  <div v-if="countries.length === 1" class="ck-country ck-country--locked">
    <span class="ck-country__flag" aria-hidden="true">{{ countries[0].flag }}</span>
    <span class="ck-country__name">{{ countries[0].name }}</span>
  </div>

  <!-- Multi-country: button-driven dropdown (native <select> styles
       poorly on Android, so we render a sheet). -->
  <div v-else class="ck-country">
    <button
      type="button"
      class="ck-country__button"
      :aria-label="`Pays sélectionné : ${selectedCountry?.name}`"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="ck-country__flag" aria-hidden="true">{{ selectedCountry?.flag }}</span>
      <span class="ck-country__name">{{ selectedCountry?.name }}</span>
      <svg
        class="ck-country__chevron"
        :class="{ 'ck-country__chevron--up': open }"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <ul v-if="open" class="ck-country__list" role="listbox">
      <li
        v-for="country in countries"
        :key="country.code"
        class="ck-country__item"
        :class="{ 'ck-country__item--active': country.code === modelValue }"
        role="option"
        :aria-selected="country.code === modelValue"
        @click="select(country.code)"
      >
        <span class="ck-country__flag" aria-hidden="true">{{ country.flag }}</span>
        <span class="ck-country__name">{{ country.name }}</span>
        <span class="ck-country__dial">+{{ country.dial_code }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/**
 * Country selector for Step 1 of the checkout.
 *
 * Single-country merchants don't see a dropdown at all — the country
 * is rendered as a flat read-only badge. Multi-country merchants get
 * a button-driven dropdown (we deliberately avoid `<select>` because
 * native styling is unusable on low-end Android).
 */
export interface CheckoutCountry {
  code: string
  name: string
  flag: string
  dial_code: string
}

const props = defineProps<{
  countries: CheckoutCountry[]
  modelValue: string
}>()

const emit = defineEmits<{ 'update:modelValue': [code: string] }>()

const open = ref(false)

const selectedCountry = computed(() =>
  props.countries.find(c => c.code === props.modelValue) ?? props.countries[0],
)

function select(code: string) {
  emit('update:modelValue', code)
  open.value = false
}
</script>

<style scoped>
.ck-country {
  position: relative;
  width: 100%;
}

.ck-country--locked {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-sp-2);
  padding: var(--ck-sp-2) var(--ck-sp-3);
  background: var(--ck-surface-sunken);
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-r-md);
  font-size: var(--ck-text-base);
  color: var(--ck-text-body);
  width: fit-content;
}

.ck-country__button {
  display: inline-flex;
  align-items: center;
  gap: var(--ck-sp-2);
  width: 100%;
  min-height: var(--ck-touch-target);
  padding: var(--ck-sp-3) var(--ck-sp-4);
  background: var(--ck-surface);
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-r-md);
  font-size: var(--ck-text-md);
  font-weight: var(--ck-fw-medium);
  color: var(--ck-text-strong);
  cursor: pointer;
  text-align: left;
  transition: border-color var(--ck-duration-quick) var(--ck-easing-fast);
}

.ck-country__button:hover {
  border-color: var(--ck-border-strong);
}

.ck-country__button:focus-visible {
  outline: none;
  border-color: var(--ck-primary);
  box-shadow: var(--ck-shadow-focus);
}

.ck-country__flag {
  font-size: 22px;
  line-height: 1;
}

.ck-country__name {
  flex: 1;
}

.ck-country__chevron {
  color: var(--ck-text-muted);
  transition: transform var(--ck-duration-quick) var(--ck-easing-fast);
}

.ck-country__chevron--up {
  transform: rotate(180deg);
}

.ck-country__list {
  position: absolute;
  top: calc(100% + var(--ck-sp-1));
  left: 0;
  right: 0;
  list-style: none;
  margin: 0;
  padding: var(--ck-sp-1);
  background: var(--ck-surface);
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-r-md);
  box-shadow: var(--ck-shadow-lg);
  max-height: 320px;
  overflow-y: auto;
  z-index: 20;
}

.ck-country__item {
  display: flex;
  align-items: center;
  gap: var(--ck-sp-2);
  padding: var(--ck-sp-3);
  border-radius: var(--ck-r-sm);
  cursor: pointer;
  font-size: var(--ck-text-base);
  color: var(--ck-text-body);
  transition: background var(--ck-duration-quick) var(--ck-easing-fast);
}

.ck-country__item:hover {
  background: var(--ck-surface-hover);
}

.ck-country__item--active {
  background: var(--ck-primary-soft);
  color: var(--ck-primary);
  font-weight: var(--ck-fw-medium);
}

.ck-country__dial {
  margin-left: auto;
  font-size: var(--ck-text-sm);
  color: var(--ck-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
