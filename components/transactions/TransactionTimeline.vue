<template>
  <div class="transaction-timeline">
    <div v-for="(event, index) in events" :key="index" class="timeline-item">
      <div class="timeline-marker" :class="event.status"></div>
      <div class="timeline-content">
        <span class="timeline-status">{{ event.label }}</span>
        <span class="timeline-date">{{ formatDate(event.date) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  events: Array<{ status: string; label: string; date: string }>
}>()

const { locale } = useI18n()

const formatDate = (dateStr: string) => {
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(dateStr).toLocaleString(localeStr, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<style scoped>
.transaction-timeline {
  position: relative;
  padding-left: 20px;
}

.timeline-item {
  position: relative;
  padding-bottom: 20px;
  padding-left: 16px;
  border-left: 2px solid #e5e7eb;
}

.timeline-item:last-child {
  border-left-color: transparent;
  padding-bottom: 0;
}

.timeline-marker {
  position: absolute;
  left: -7px;
  top: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  background: #fff;
}

.timeline-marker.success { border-color: #059669; background: #d1fae5; }
.timeline-marker.pending { border-color: #d97706; background: #fef3c7; }
.timeline-marker.initiated { border-color: #2563eb; background: #dbeafe; }
.timeline-marker.failed { border-color: #dc2626; background: #fee2e2; }

.timeline-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-status {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.timeline-date {
  font-size: 12px;
  color: #9ca3af;
}
</style>
