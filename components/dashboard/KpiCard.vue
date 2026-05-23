<template>
  <div class="kpi-card" :class="`kpi-card--${tone}`">
    <div class="kpi-icon">
      <i :class="['pi', icon]"></i>
    </div>
    <div class="kpi-label">{{ label }}</div>
    <div class="kpi-value">{{ formattedValue }}</div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  value: number | string
  icon: string
  /** Background tone of the card */
  tone?: 'blue' | 'green' | 'yellow' | 'neutral'
}>()

const { locale } = useI18n()

const tone = computed(() => props.tone || 'neutral')

const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.NumberFormat(localeStr).format(props.value)
})
</script>

<style scoped>
.kpi-card {
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 22px 22px 24px;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Pastel tints stay hardcoded — they're intentionally identical in light
   and dark mode, otherwise the four-card "rainbow" identity collapses
   into a monochrome grey block. The black icon disc + white glyph keeps
   enough contrast on each pastel in both themes. */
.kpi-card--blue    { background: #EEF4FF; }
.kpi-card--green   { background: #ECFDF5; }
.kpi-card--yellow  { background: #FEFCE8; }
.kpi-card--neutral { background: #F3F4F6; }

.kpi-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #0f172a;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.kpi-icon .pi {
  font-size: 16px;
}

.kpi-label {
  font-size: 13px;
  font-weight: 500;
  /* Pastel background stays the same in both themes, so the label
     reads against the same surface — use the high-contrast label
     token from --ze-* which is dark in light mode (still legible
     on pastel) and switches to a lighter neutral in dark mode. */
  color: var(--ze-text-label);
  line-height: 1.4;
}

.kpi-value {
  font-size: 30px;
  font-weight: 800;
  color: var(--ze-text-strong);
  line-height: 1.05;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  margin-top: -8px;
}
</style>
