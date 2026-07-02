<template>
  <div class="empty-state">
    <i :class="['pi', icon]" class="empty-icon"></i>
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-description">{{ description }}</p>
    <div v-if="$slots.action" class="empty-action">
      <slot name="action" />
    </div>
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
  margin: 0 0 8px;
}

.empty-description {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0;
  max-width: 420px;
  line-height: 1.5;
}

/* Breathing room before the CTA — without this the action button sits
   flush against the description text (looked cramped / unprofessional). */
.empty-action {
  margin-top: 20px;
}
</style>
