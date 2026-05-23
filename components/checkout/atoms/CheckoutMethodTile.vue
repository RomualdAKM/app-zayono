<template>
  <button
    type="button"
    class="ck-tile"
    :class="{
      'ck-tile--selected': selected,
      'ck-tile--disabled': disabled,
    }"
    :disabled="disabled"
    :aria-pressed="selected"
    @click="$emit('click')"
  >
    <span
      class="ck-tile__logo"
      :style="{ backgroundColor: brandColor || 'var(--ck-surface-sunken)' }"
      aria-hidden="true"
    >
      <img
        v-if="logoUrl && !logoFailed"
        :src="logoUrl"
        alt=""
        @error="logoFailed = true"
      />
      <span v-else class="ck-tile__initials">{{ initials }}</span>
    </span>
    <span class="ck-tile__name">{{ name }}</span>
    <span v-if="subtitle" class="ck-tile__subtitle">{{ subtitle }}</span>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  name: string
  subtitle?: string
  logoUrl?: string | null
  brandColor?: string | null
  selected?: boolean
  disabled?: boolean
}>()

defineEmits<{ click: [] }>()

const logoFailed = ref(false)
const initials = computed(() => (props.name || '?').substring(0, 2).toUpperCase())

watch(() => props.logoUrl, () => { logoFailed.value = false })
</script>

<style scoped>
.ck-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  padding: var(--ck-sp-2) 6px;
  background: var(--ck-surface);
  border: 1px solid var(--ck-border);
  border-radius: 4px;
  font: inherit;
  cursor: pointer;
  text-align: center;
  min-height: 78px;
  transition: border-color var(--ck-duration-quick) var(--ck-easing-fast),
              background var(--ck-duration-quick) var(--ck-easing-fast);
}

.ck-tile:hover:not(:disabled) {
  border-color: var(--ck-text-strong);
}

.ck-tile:focus-visible {
  outline: none;
  border-color: var(--ck-primary);
  box-shadow: var(--ck-shadow-focus);
}

.ck-tile--selected {
  border-color: var(--ck-text-strong);
  border-width: 2px;
  padding: calc(var(--ck-sp-2) - 1px) 5px;
  background: var(--ck-surface);
}

.ck-tile--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ck-tile__logo {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
  color: #fff;
  font-weight: var(--ck-fw-bold);
}

.ck-tile__logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.ck-tile__initials {
  font-size: var(--ck-text-sm);
}

.ck-tile__name {
  font-size: var(--ck-text-xs);
  font-weight: var(--ck-fw-semibold);
  color: var(--ck-text-strong);
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.ck-tile__subtitle {
  font-size: 10px;
  color: var(--ck-text-muted);
}
</style>
