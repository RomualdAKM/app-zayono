<template>
  <div class="notification-bell" @click.stop>
    <button
      type="button"
      class="bell-trigger"
      :class="{ 'bell-trigger--open': open }"
      @click="toggleOpen"
      :aria-label="$t('notification.title')"
    >
      <AppIcon name="bell" />
      <span v-if="unreadCount > 0" class="bell-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <div v-if="open" class="bell-dropdown">
      <div class="bell-dropdown-head">
        <span class="bell-dropdown-title">{{ $t('notification.title') }}</span>
        <button
          v-if="unreadCount > 0"
          class="bell-mark-all"
          type="button"
          @click="markAllRead"
        >
          {{ $t('notification.markAllRead') }}
        </button>
      </div>

      <div v-if="loading && notifications.length === 0" class="bell-loading">
        <ProgressSpinner style="width: 22px; height: 22px" />
      </div>

      <div v-else-if="notifications.length === 0" class="bell-empty">
        <AppIcon name="inbox" />
        <p>{{ $t('notification.empty') }}</p>
      </div>

      <ul v-else class="bell-list">
        <li
          v-for="n in notifications"
          :key="n.id"
          class="bell-item"
          :class="{ 'bell-item--unread': !n.read_at }"
          @click="open_(n)"
        >
          <div class="bell-item-icon">
            <i :class="['pi', n.icon || 'pi-bell']" />
          </div>
          <div class="bell-item-body">
            <span class="bell-item-title">{{ n.title || $t('notification.fallbackTitle') }}</span>
            <span class="bell-item-message">{{ n.message }}</span>
            <span class="bell-item-time">{{ formatTime(n.created_at) }}</span>
          </div>
          <span v-if="!n.read_at" class="bell-item-dot" />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
const { apiFetch } = useApi()
const router = useRouter()
const { t, locale } = useI18n()

interface AdminNotification {
  id: string
  type: string
  title: string | null
  message: string | null
  icon: string
  action_url: string | null
  data: Record<string, any>
  read_at: string | null
  created_at: string
}

const open = ref(false)
const loading = ref(false)
const notifications = ref<AdminNotification[]>([])
const unreadCount = ref(0)

// Poll quietly in the background so the badge updates without forcing the
// admin to refresh. 30s is a reasonable cadence — fast enough for "new
// merchant signed up just now" without hammering the API.
let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  loadNotifications()
  pollTimer = setInterval(loadNotifications, 30_000)
  document.addEventListener('click', onDocClick)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('click', onDocClick)
})

function onDocClick(e: MouseEvent) {
  if (!open.value) return
  const target = e.target as HTMLElement
  if (target.closest('.notification-bell')) return
  open.value = false
}

function toggleOpen() {
  open.value = !open.value
  if (open.value) loadNotifications()
}

async function loadNotifications() {
  if (loading.value) return
  loading.value = true
  try {
    const res = await apiFetch<{
      success: boolean
      data: { notifications: AdminNotification[]; unread_count: number }
    }>('/admin/notifications')
    notifications.value = res.data.notifications ?? []
    unreadCount.value = res.data.unread_count ?? 0
  } catch {
    // 401 happens when the token expires — the auth middleware will redirect
    // on the next route change, so we silently drop the polling error here.
  } finally {
    loading.value = false
  }
}

async function markRead(notification: AdminNotification) {
  if (notification.read_at) return
  try {
    await apiFetch(`/admin/notifications/${notification.id}/read`, { method: 'POST' })
    notification.read_at = new Date().toISOString()
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch {
    // best-effort
  }
}

async function markAllRead() {
  try {
    await apiFetch('/admin/notifications/read-all', { method: 'POST' })
    notifications.value.forEach(n => {
      if (!n.read_at) n.read_at = new Date().toISOString()
    })
    unreadCount.value = 0
  } catch {
    // best-effort
  }
}

async function open_(notification: AdminNotification) {
  await markRead(notification)
  if (notification.action_url) {
    open.value = false
    router.push(notification.action_url)
  }
}

function formatTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return t('notification.justNow')
  if (diffMin < 60) return t('notification.minAgo', { n: diffMin })
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return t('notification.hourAgo', { n: diffH })
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return t('notification.dayAgo', { n: diffD })
  const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return date.toLocaleDateString(localeStr, { day: '2-digit', month: 'short' })
}
</script>

<style scoped>
.notification-bell {
  position: relative;
}

.bell-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--ze-text-muted);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.bell-trigger:hover,
.bell-trigger--open {
  background: var(--ze-bg-hover);
  border-color: var(--ze-border);
  color: var(--ze-text-strong);
}

.bell-trigger .pi-bell {
  font-size: 16px;
}

.bell-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  /* Red badge — deliberately fixed across themes; an unread count must
     pop with the same urgency in both modes. */
  background: #dc2626;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.bell-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 360px;
  max-height: 480px;
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  z-index: 200;
}

.bell-dropdown-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--ze-border);
}

.bell-dropdown-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ze-text-strong);
}

.bell-mark-all {
  background: none;
  border: none;
  font-size: 12px;
  color: var(--ze-brand);
  cursor: pointer;
  font-family: inherit;
}

.bell-mark-all:hover {
  text-decoration: underline;
}

.bell-loading,
.bell-empty {
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--ze-text-muted);
}

.bell-empty i {
  font-size: 20px;
}

.bell-empty p {
  font-size: 13px;
  margin: 0;
}

.bell-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.bell-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--ze-border-subtle);
  position: relative;
  transition: background 0.15s;
}

.bell-item:last-child {
  border-bottom: none;
}

.bell-item:hover {
  background: var(--ze-bg-hover);
}

.bell-item--unread {
  background: var(--ze-brand-bg-soft);
}

.bell-item-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--ze-bg-hover);
  color: var(--ze-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.bell-item-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.bell-item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ze-text-strong);
}

.bell-item-message {
  font-size: 12px;
  color: var(--ze-text-muted);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bell-item-time {
  font-size: 11px;
  color: var(--ze-text-disabled);
  margin-top: 2px;
}

.bell-item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ze-brand);
  flex-shrink: 0;
  margin-top: 8px;
}
</style>
