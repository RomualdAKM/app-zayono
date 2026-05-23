<template>
  <p class="ck-disclaimer">
    <span v-if="asterisk" class="ck-disclaimer__star">*</span>
    <slot>Des frais supplémentaires peuvent s'appliquer</slot>
  </p>
</template>

<script setup lang="ts">
/**
 * Small italic disclaimer above the CTA. Slot-driven so each template
 * can customise the copy if needed; default text matches Moneroo's
 * convention.
 */
defineProps<{
  asterisk?: boolean
}>()
</script>

<style scoped>
.ck-disclaimer {
  margin: 0;
  text-align: center;
  font-size: var(--ck-text-sm);
  font-style: italic;
  color: var(--ck-text-muted);
  line-height: var(--ck-lh-normal);
}

.ck-disclaimer__star {
  color: var(--ck-danger);
  font-style: normal;
  font-weight: var(--ck-fw-semibold);
  margin-right: 2px;
}
</style>
