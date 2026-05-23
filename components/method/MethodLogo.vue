<template>
  <span class="ml" :title="name">
    <img
      v-if="logoSrc && !failed"
      :src="logoSrc"
      :alt="name"
      class="ml-img"
      @error="failed = true"
    />
    <span
      v-else
      class="ml-badge"
      :style="{ background: badge.bg, color: badge.fg }"
    >{{ badge.initial }}</span>
  </span>
</template>

<script setup lang="ts">
import { operatorBadge, operatorLogo } from '~/composables/useOperatorBadge'

const props = defineProps<{ name: string }>()

const failed = ref(false)

/**
 * Resolve once per name change. Reset the failure flag when the name
 * itself changes so the new candidate gets its own load attempt.
 */
const logoSrc = computed(() => operatorLogo(props.name))
const badge = computed(() => operatorBadge(props.name))

watch(logoSrc, () => {
  failed.value = false
})
</script>

<style scoped>
.ml {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border-subtle);
}

.ml-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 3px;
}

.ml-badge {
  width: 100%;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.02em;
  border-radius: 6px;
}
</style>
