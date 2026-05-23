<template>
  <div class="empty-state">
    <i :class="['pi', icon]" class="empty-icon"></i>
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-description">{{ description }}</p>
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  icon?: string
}>()
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  font-size: 40px;
  color: var(--ze-text-disabled);
  margin-bottom: 16px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ze-text-label);
  margin: 0 0 6px;
}

.empty-description {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0;
}
</style>
