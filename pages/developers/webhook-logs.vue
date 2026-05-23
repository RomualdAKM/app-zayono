<template>
  <div class="page">
    <p class="page-subtitle">
      {{ $t('developersPage.webhookLogs.subtitle') }}
    </p>

    <div class="filters-row">
      <Select
        v-model="filterStatus"
        :options="statusOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="$t('developersPage.webhookLogs.filters.statusPlaceholder')"
        :showClear="true"
        class="status-select"
      />
      <InputText
        v-model="filterEvent"
        :placeholder="$t('developersPage.webhookLogs.filters.eventPlaceholder')"
        class="event-input"
      />
      <Button
        icon="pi pi-refresh"
        severity="secondary"
        outlined
        :loading="loading"
        :aria-label="$t('common.refresh')"
        @click="load"
      />
    </div>

    <div v-if="loading && !rows.length" class="loading">
      <Skeleton v-for="i in 5" :key="i" height="56px" class="loading-row" />
    </div>

    <div v-else-if="!rows.length" class="empty-state">
      <AppIcon name="webhook" class="empty-icon" />
      <p class="empty-text">
        {{ $t('developersPage.webhookLogs.empty') }}
      </p>
    </div>

    <!-- R1 A11Y — `@row-click` doesn't fire on keyboard Enter, so we
         pair it with `selectionMode="single"` + `@row-select` which
         DOES fire on Enter/Space. Same data, two pathways. -->
    <DataTable
      v-else
      :value="rows"
      class="zayono-table"
      responsiveLayout="scroll"
      selectionMode="single"
      @row-click="(e) => openDrawer(e.data)"
      @row-select="(e) => openDrawer(e.data)"
    >
      <Column :header="$t('developersPage.webhookLogs.columns.time')">
        <template #body="{ data }">
          <span class="tabular muted">{{ formatDate(data.created_at) }}</span>
        </template>
      </Column>
      <Column :header="$t('developersPage.webhookLogs.columns.event')">
        <template #body="{ data }">
          <span class="event-badge">{{ data.event }}</span>
          <span v-if="data.is_replay" class="replay-badge">{{ $t('developersPage.webhookLogs.replayBadge') }}</span>
        </template>
      </Column>
      <Column :header="$t('developersPage.webhookLogs.columns.url')">
        <template #body="{ data }">
          <span class="url-cell">{{ truncateUrl(data.target_url) }}</span>
        </template>
      </Column>
      <Column :header="$t('developersPage.webhookLogs.columns.attempts')" headerStyle="text-align:right">
        <template #body="{ data }">
          <span class="tabular">{{ data.attempt_number }}/{{ data.max_attempts }}</span>
        </template>
      </Column>
      <Column :header="$t('developersPage.webhookLogs.columns.status')">
        <template #body="{ data }">
          <span class="status-pill" :class="statusTone(data.delivery_status, data.response_code)">
            {{ statusLabel(data) }}
          </span>
        </template>
      </Column>
      <Column header="">
        <template #body="{ data }">
          <Button
            v-if="canReplay(data)"
            :label="$t('developersPage.webhookLogs.replay')"
            size="small"
            severity="secondary"
            :loading="replayingId === data.id"
            @click.stop="replay(data)"
          />
        </template>
      </Column>
    </DataTable>

    <div v-if="meta.last_page > 1" class="pagination">
      <Button
        icon="pi pi-chevron-left"
        severity="secondary"
        outlined
        :disabled="page === 1"
        @click="page--; load()"
      />
      <span class="page-info">{{ $t('developersPage.webhookLogs.page') }} {{ meta.current_page }} / {{ meta.last_page }}</span>
      <Button
        icon="pi pi-chevron-right"
        severity="secondary"
        outlined
        :disabled="page >= meta.last_page"
        @click="page++; load()"
      />
    </div>

    <!-- Drawer with full delivery detail -->
    <Drawer v-model:visible="drawerOpen" position="right" class="webhook-drawer" :style="{ width: '640px' }">
      <template #header>
        <div class="drawer-header">
          <span class="drawer-title">{{ $t('developersPage.webhookLogs.detailTitle') }}</span>
          <span v-if="active?.delivery_status" class="status-pill" :class="statusTone(active.delivery_status, active.response_code)">
            {{ statusLabel(active) }}
          </span>
        </div>
      </template>

      <div v-if="active" class="drawer-body">
        <div v-if="active.is_replay" class="warning-banner">
          <AppIcon name="warning" class="banner-icon" />
          <div>
            {{ $t('developersPage.webhookLogs.replayOfPrefix') }} <strong>{{ $t('developersPage.webhookLogs.replayOfStrong') }}</strong> {{ $t('developersPage.webhookLogs.replayOfBy') }}
            <button class="link-btn" @click="openById(active.replay_of?.id)">
              {{ active.replay_of?.id?.substring(0, 8) }}…
            </button>
          </div>
        </div>

        <dl class="meta-grid">
          <dt>{{ $t('developersPage.webhookLogs.meta.id') }}</dt><dd class="tabular">{{ active.id }}</dd>
          <dt>{{ $t('developersPage.webhookLogs.meta.event') }}</dt><dd>{{ active.event }}</dd>
          <dt>{{ $t('developersPage.webhookLogs.meta.targetUrl') }}</dt><dd class="url-cell">{{ active.target_url || active.webhook_url }}</dd>
          <dt>{{ $t('developersPage.webhookLogs.meta.created') }}</dt><dd>{{ formatDateLong(active.created_at) }}</dd>
          <dt>{{ $t('developersPage.webhookLogs.meta.attempts') }}</dt><dd>{{ active.attempt_number }}/{{ active.max_attempts }}</dd>
          <dt v-if="active.response_code">{{ $t('developersPage.webhookLogs.meta.httpCode') }}</dt>
          <dd v-if="active.response_code" class="tabular">{{ active.response_code }}</dd>
          <dt v-if="active.next_retry_at">{{ $t('developersPage.webhookLogs.meta.nextRetry') }}</dt>
          <dd v-if="active.next_retry_at">{{ formatDateLong(active.next_retry_at) }}</dd>
        </dl>

        <section class="drawer-section">
          <h4 class="section-title">{{ $t('developersPage.webhookLogs.payloadSent') }}</h4>
          <pre class="json-block">{{ formatJson(active.payload) }}</pre>
        </section>

        <section v-if="active.response_body" class="drawer-section">
          <h4 class="section-title">{{ $t('developersPage.webhookLogs.responseReceived') }}</h4>
          <pre class="json-block">{{ active.response_body }}</pre>
        </section>

        <section v-if="active.replays?.length" class="drawer-section">
          <h4 class="section-title">{{ $t('developersPage.webhookLogs.replaysTriggered', { count: active.replays.length }) }}</h4>
          <ul class="replay-list">
            <li v-for="r in active.replays" :key="r.id">
              <button class="link-btn" @click="openById(r.id)">{{ r.id.substring(0, 8) }}…</button>
              <span class="tabular muted">{{ formatDate(r.created_at) }}</span>
              <span class="status-pill" :class="statusTone(r.delivery_status, r.response_code)">
                {{ r.delivery_status }} {{ r.response_code ?? '' }}
              </span>
            </li>
          </ul>
        </section>

        <section class="drawer-section replay-cta">
          <p v-if="canReplay(active)" class="hint-text">
            {{ $t('developersPage.webhookLogs.replayHint') }}
          </p>
          <Button
            v-if="canReplay(active)"
            :label="$t('developersPage.webhookLogs.replayNow')"
            icon="pi pi-replay"
            severity="primary"
            :loading="replayingId === active.id"
            @click="replay(active)"
          />
        </section>
      </div>
    </Drawer>
  </div>
</template>

<script setup lang="ts">
const { apiFetch } = useApi()
const { handleError } = useApiError()
const toast = useToast?.()
const { t, locale } = useI18n()

useHead({ title: () => t('developersPage.webhookLogs.pageTitle') })

interface WebhookLogRow {
  id: string
  event: string
  delivery_status: 'pending' | 'delivered' | 'failed'
  response_code: number | null
  attempt_number: number
  max_attempts: number
  next_retry_at: string | null
  target_url: string | null
  is_replay: boolean
  replay_of_id: string | null
  created_at: string
  updated_at: string
}

interface WebhookLogDetail extends WebhookLogRow {
  payload: unknown
  response_body: string | null
  webhook_url: string | null
  replay_of: { id: string; delivery_status: string; response_code: number | null; created_at: string } | null
  replays: { id: string; delivery_status: string; response_code: number | null; attempt_number: number; created_at: string }[]
}

const loading = ref(true)
const replayingId = ref<string | null>(null)
const rows = ref<WebhookLogRow[]>([])
const meta = ref<{ current_page: number; last_page: number; per_page: number; total: number }>({
  current_page: 1, last_page: 1, per_page: 25, total: 0,
})
const page = ref(1)
const filterStatus = ref<string | null>(null)
const filterEvent = ref<string>('')

const drawerOpen = ref(false)
const active = ref<WebhookLogDetail | null>(null)

const statusOptions = computed(() => [
  { label: t('developersPage.webhookLogs.deliveryStatus.delivered'), value: 'delivered' },
  { label: t('developersPage.webhookLogs.deliveryStatus.pending'), value: 'pending' },
  { label: t('developersPage.webhookLogs.deliveryStatus.failed'), value: 'failed' },
])

let reqId = 0

async function load() {
  loading.value = true
  const myId = ++reqId
  try {
    const qs = new URLSearchParams({ per_page: '25', page: String(page.value) })
    if (filterStatus.value) qs.set('status', filterStatus.value)
    if (filterEvent.value.trim()) qs.set('event', filterEvent.value.trim())

    const res = await apiFetch<{ data: WebhookLogRow[]; meta: typeof meta.value }>(
      `/merchant/webhook-logs?${qs.toString()}`,
    )
    if (myId !== reqId) return
    rows.value = res.data || []
    meta.value = res.meta || meta.value
  } catch (e: any) {
    if (myId === reqId) handleError(e)
  } finally {
    if (myId === reqId) loading.value = false
  }
}

let filterTimer: ReturnType<typeof setTimeout> | null = null
watch([filterStatus, filterEvent], () => {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => { page.value = 1; load() }, 250)
})

onMounted(load)

async function openDrawer(row: WebhookLogRow) {
  drawerOpen.value = true
  active.value = null
  try {
    const res = await apiFetch<{ data: WebhookLogDetail }>(`/merchant/webhook-logs/${row.id}`)
    active.value = res.data
  } catch (e: any) {
    handleError(e)
    drawerOpen.value = false
  }
}

async function openById(id?: string) {
  if (!id) return
  await openDrawer({ id } as WebhookLogRow)
}

async function replay(row: WebhookLogRow | WebhookLogDetail) {
  if (!confirm(t('developersPage.webhookLogs.confirmReplay', { id: row.id.substring(0, 8) }))) return
  replayingId.value = row.id
  try {
    await apiFetch(`/merchant/webhook-logs/${row.id}/replay`, { method: 'POST' })
    toast?.add?.({ severity: 'success', summary: t('developersPage.webhookLogs.replayingTriggered'), detail: t('developersPage.webhookLogs.replayQueued'), life: 3000 })
    page.value = 1
    await load()
  } catch (e: any) {
    handleError(e)
  } finally {
    replayingId.value = null
  }
}

function canReplay(row: WebhookLogRow | null): boolean {
  if (!row) return false
  // Replay only makes sense for finalized deliveries (delivered or failed).
  // Pending deliveries will retry automatically — don't add a manual third axis.
  return row.delivery_status === 'failed' || row.delivery_status === 'delivered'
}

function statusTone(status: string, _code: number | null): string {
  if (status === 'delivered') return 'pill--green'
  if (status === 'failed') return 'pill--red'
  if (status === 'pending') return 'pill--yellow'
  return 'pill--neutral'
}

function statusLabel(row: { delivery_status: string; response_code: number | null }): string {
  const codes: Record<string, string> = {
    delivered: t('developersPage.webhookLogs.deliveryStatus.delivered'),
    failed: t('developersPage.webhookLogs.deliveryStatus.failed'),
    pending: t('developersPage.webhookLogs.deliveryStatus.pending'),
  }
  const base = codes[row.delivery_status] ?? row.delivery_status
  return row.response_code ? `${base} · ${row.response_code}` : base
}

function truncateUrl(url: string | null): string {
  if (!url) return '—'
  return url.length > 50 ? url.substring(0, 47) + '…' : url
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return t('developersPage.webhookLogs.relativeNow')
  if (mins < 60) return t('developersPage.webhookLogs.relativeMin', { n: mins })
  if (mins < 1440) return t('developersPage.webhookLogs.relativeHour', { n: Math.floor(mins / 60) })
  try {
    const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
    return d.toLocaleString(localeStr, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso.substring(0, 16)
  }
}

function formatDateLong(iso: string): string {
  try {
    const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
    return new Date(iso).toLocaleString(localeStr, {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatJson(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}
</script>

<style scoped>
.page-subtitle {
  color: var(--ze-text-muted);
  margin: 0 0 var(--ze-sp-4) 0;
  font-size: 14px;
}

.filters-row {
  display: flex;
  gap: var(--ze-sp-2);
  margin-bottom: var(--ze-sp-4);
  align-items: center;
}

.status-select { width: 180px; }
.event-input { flex: 1; max-width: 320px; }

.loading { display: flex; flex-direction: column; gap: var(--ze-sp-2); }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--ze-sp-10) var(--ze-sp-4);
  text-align: center;
}

.empty-icon { width: 48px; height: 48px; color: var(--ze-text-muted); margin-bottom: var(--ze-sp-2); }
.empty-text { color: var(--ze-text-muted); margin: 0; max-width: 420px; }

.tabular {
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, "JetBrains Mono", monospace;
}

.muted { color: var(--ze-text-muted); }

.event-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--ze-surface-sunken);
  border: 1px solid var(--ze-border);
  border-radius: 3px;
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: var(--ze-text-body);
}

.replay-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.url-cell {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: var(--ze-text-body);
}

.status-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
}

.pill--green { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.pill--red { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
.pill--yellow { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
.pill--neutral { background: var(--ze-surface-sunken); color: var(--ze-text-muted); border: 1px solid var(--ze-border); }

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ze-sp-3);
  margin-top: var(--ze-sp-4);
}

.page-info {
  font-size: 13px;
  color: var(--ze-text-muted);
  min-width: 90px;
  text-align: center;
}

/* ─── Drawer styles ─────────────────────────────────────────── */

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--ze-sp-3);
}

.drawer-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ze-text-strong);
}

.drawer-body {
  display: flex;
  flex-direction: column;
  gap: var(--ze-sp-4);
}

.warning-banner {
  display: flex;
  align-items: flex-start;
  gap: var(--ze-sp-2);
  padding: var(--ze-sp-3);
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 4px;
  color: #92400e;
  font-size: 13px;
}

.banner-icon { width: 18px; height: 18px; flex-shrink: 0; }

.meta-grid {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 6px var(--ze-sp-3);
  margin: 0;
  font-size: 13px;
}

.meta-grid dt { color: var(--ze-text-muted); font-weight: 500; }
.meta-grid dd { margin: 0; color: var(--ze-text-strong); word-break: break-all; }

.drawer-section { display: flex; flex-direction: column; gap: var(--ze-sp-2); }

.section-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ze-text-strong);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.json-block {
  margin: 0;
  padding: var(--ze-sp-3);
  background: var(--ze-surface-sunken);
  border: 1px solid var(--ze-border);
  border-radius: 4px;
  font-family: ui-monospace, "JetBrains Mono", monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ze-text-body);
  max-height: 320px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.replay-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ze-sp-2);
}

.replay-list li {
  display: flex;
  align-items: center;
  gap: var(--ze-sp-3);
  padding: var(--ze-sp-2);
  border: 1px solid var(--ze-border);
  border-radius: 3px;
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--ze-primary, #2563eb);
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  text-decoration: underline;
}

.link-btn:hover { color: var(--ze-primary-hover, #1d4ed8); }

.replay-cta {
  padding: var(--ze-sp-3);
  border: 1px dashed var(--ze-border);
  border-radius: 4px;
}

.hint-text {
  margin: 0 0 var(--ze-sp-2) 0;
  font-size: 12px;
  color: var(--ze-text-muted);
}
</style>
