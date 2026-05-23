<template>
  <div class="page">
    <p class="page-subtitle">
      {{ $t('developersPage.apiLogs.subtitle') }}
    </p>

    <div class="filters-row">
      <Select
        v-model="filterStatusClass"
        :options="statusClassOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="$t('developersPage.apiLogs.filters.statusPlaceholder')"
        :showClear="true"
        class="filter-select"
      />
      <Select
        v-model="filterMethod"
        :options="methodOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="$t('developersPage.apiLogs.filters.methodPlaceholder')"
        :showClear="true"
        class="filter-select"
      />
      <Select
        v-model="filterResource"
        :options="resourceOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="$t('developersPage.apiLogs.filters.resourcePlaceholder')"
        :showClear="true"
        class="filter-select"
      />
      <InputText v-model="filterPath" :placeholder="$t('developersPage.apiLogs.filters.pathPlaceholder')" class="path-input" />
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
      <Skeleton v-for="i in 6" :key="i" height="48px" class="loading-row" />
    </div>

    <div v-else-if="!rows.length" class="empty-state">
      <AppIcon name="bars" class="empty-icon" />
      <p class="empty-text">
        {{ $t('developersPage.apiLogs.empty') }}
      </p>
    </div>

    <!-- R1 A11Y — pair row-click with selectionMode+row-select so
         keyboard users can open the drawer with Enter/Space. -->
    <DataTable
      v-else
      :value="rows"
      class="zayono-table compact"
      responsiveLayout="scroll"
      selectionMode="single"
      @row-click="(e) => openDetail(e.data)"
      @row-select="(e) => openDetail(e.data)"
    >
      <Column :header="$t('developersPage.apiLogs.columns.time')">
        <template #body="{ data }">
          <span class="tabular muted">{{ formatDate(data.created_at) }}</span>
        </template>
      </Column>
      <Column :header="$t('developersPage.apiLogs.columns.method')">
        <template #body="{ data }">
          <span class="method-pill" :class="`method--${data.method.toLowerCase()}`">{{ data.method }}</span>
        </template>
      </Column>
      <Column :header="$t('developersPage.apiLogs.columns.path')">
        <template #body="{ data }">
          <span class="path-cell">{{ data.path }}</span>
        </template>
      </Column>
      <Column :header="$t('developersPage.apiLogs.columns.status')">
        <template #body="{ data }">
          <span class="status-pill" :class="statusTone(data.status_code)">{{ data.status_code }}</span>
        </template>
      </Column>
      <Column :header="$t('developersPage.apiLogs.columns.duration')" headerStyle="text-align:right">
        <template #body="{ data }">
          <span class="tabular" :class="durationTone(data.duration_ms)">{{ data.duration_ms }} ms</span>
        </template>
      </Column>
      <Column :header="$t('developersPage.apiLogs.columns.resource')">
        <template #body="{ data }">
          <span v-if="data.resource_id" class="tabular muted">{{ data.resource_id.substring(0, 16) }}…</span>
          <span v-else-if="data.error_code" class="error-tag">{{ data.error_code }}</span>
          <span v-else class="muted">—</span>
        </template>
      </Column>
    </DataTable>

    <div v-if="meta.last_page > 1" class="pagination">
      <Button icon="pi pi-chevron-left" severity="secondary" outlined :disabled="page === 1" @click="page--; load()" />
      <span class="page-info">{{ $t('developersPage.apiLogs.page') }} {{ meta.current_page }} / {{ meta.last_page }} ({{ meta.total }} {{ $t('developersPage.apiLogs.entries') }})</span>
      <Button icon="pi pi-chevron-right" severity="secondary" outlined :disabled="page >= meta.last_page" @click="page++; load()" />
    </div>

    <Drawer v-model:visible="drawerOpen" position="right" :style="{ width: '720px' }">
      <template #header>
        <div class="drawer-header">
          <div>
            <div class="drawer-eyebrow">
              <span class="method-pill" :class="active ? `method--${active.method.toLowerCase()}` : ''">{{ active?.method }}</span>
              <span class="status-pill" :class="active ? statusTone(active.status_code) : ''">{{ active?.status_code }}</span>
              <span class="tabular muted">{{ active?.duration_ms }} ms</span>
            </div>
            <div class="drawer-title">{{ active?.path }}</div>
          </div>
          <Button
            :label="$t('developersPage.apiLogs.copyCurl')"
            icon="pi pi-copy"
            size="small"
            severity="secondary"
            outlined
            :disabled="!active"
            @click="copyAsCurl"
          />
        </div>
      </template>

      <div v-if="active" class="drawer-body">
        <div v-if="active.body_truncated" class="warning-banner">
          <AppIcon name="warning" class="banner-icon" />
          {{ $t('developersPage.apiLogs.truncatedBody') }}
        </div>

        <dl class="meta-grid">
          <dt>{{ $t('developersPage.apiLogs.meta.id') }}</dt><dd class="tabular">{{ active.id }}</dd>
          <dt>{{ $t('developersPage.apiLogs.meta.when') }}</dt><dd>{{ formatDateLong(active.created_at) }}</dd>
          <dt>{{ $t('developersPage.apiLogs.meta.environment') }}</dt><dd>{{ active.environment }}</dd>
          <dt v-if="active.api_key_prefix">{{ $t('developersPage.apiLogs.meta.apiKey') }}</dt>
          <dd v-if="active.api_key_prefix" class="tabular">{{ active.api_key_prefix }}…</dd>
          <dt v-if="active.idempotency_key">{{ $t('developersPage.apiLogs.meta.idempotencyKey') }}</dt>
          <dd v-if="active.idempotency_key" class="tabular">{{ active.idempotency_key }}</dd>
          <dt v-if="active.ip_address">{{ $t('developersPage.apiLogs.meta.sourceIp') }}</dt>
          <dd v-if="active.ip_address" class="tabular">{{ active.ip_address }}</dd>
          <dt v-if="active.error_code">{{ $t('developersPage.apiLogs.meta.errorCode') }}</dt>
          <dd v-if="active.error_code"><span class="error-tag">{{ active.error_code }}</span></dd>
        </dl>

        <section v-if="active.request_body" class="drawer-section">
          <h4 class="section-title">{{ $t('developersPage.apiLogs.requestBody') }}</h4>
          <pre class="json-block">{{ formatJson(active.request_body) }}</pre>
        </section>

        <section v-if="active.response_body" class="drawer-section">
          <h4 class="section-title">{{ $t('developersPage.apiLogs.responseBody') }}</h4>
          <pre class="json-block">{{ formatJson(active.response_body) }}</pre>
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

useHead({ title: () => t('developersPage.apiLogs.pageTitle') })

interface ApiLogRow {
  id: string
  method: string
  path: string
  status_code: number
  duration_ms: number
  resource_type: string | null
  resource_id: string | null
  error_code: string | null
  idempotency_key: string | null
  api_key_prefix: string | null
  environment: string
  created_at: string
}

interface ApiLogDetail extends ApiLogRow {
  request_headers: Record<string, unknown> | null
  request_body: Record<string, unknown> | null
  response_body: unknown
  ip_address: string | null
  user_agent: string | null
  body_truncated: boolean
}

const loading = ref(true)
const rows = ref<ApiLogRow[]>([])
const meta = ref({ current_page: 1, last_page: 1, per_page: 25, total: 0 })
const page = ref(1)

const filterStatusClass = ref<string | null>(null)
const filterMethod = ref<string | null>(null)
const filterResource = ref<string | null>(null)
const filterPath = ref('')

const drawerOpen = ref(false)
const active = ref<ApiLogDetail | null>(null)

const statusClassOptions = computed(() => [
  { label: t('developersPage.apiLogs.statusClass.success'), value: '2xx' },
  { label: t('developersPage.apiLogs.statusClass.redirect'), value: '3xx' },
  { label: t('developersPage.apiLogs.statusClass.clientError'), value: '4xx' },
  { label: t('developersPage.apiLogs.statusClass.serverError'), value: '5xx' },
])
const methodOptions = [
  { label: 'GET', value: 'GET' }, { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' }, { label: 'DELETE', value: 'DELETE' },
]
const resourceOptions = computed(() => [
  { label: t('developersPage.apiLogs.resource.payment'), value: 'payment' },
  { label: t('developersPage.apiLogs.resource.payout'), value: 'payout' },
  { label: t('developersPage.apiLogs.resource.refund'), value: 'refund' },
  { label: t('developersPage.apiLogs.resource.checkoutSession'), value: 'checkout_session' },
  { label: t('developersPage.apiLogs.resource.webhook'), value: 'webhook' },
  { label: t('developersPage.apiLogs.resource.aggregatorConfig'), value: 'aggregator_config' },
  { label: t('developersPage.apiLogs.resource.routingRule'), value: 'routing_rule' },
  { label: t('developersPage.apiLogs.resource.customer'), value: 'customer' },
])

let reqId = 0

async function load() {
  loading.value = true
  const myId = ++reqId
  try {
    const qs = new URLSearchParams({ per_page: '25', page: String(page.value) })
    if (filterStatusClass.value) qs.set('status_class', filterStatusClass.value)
    if (filterMethod.value) qs.set('method', filterMethod.value)
    if (filterResource.value) qs.set('resource_type', filterResource.value)
    if (filterPath.value.trim()) qs.set('path', filterPath.value.trim())

    const res = await apiFetch<{ data: ApiLogRow[]; meta: typeof meta.value }>(
      `/merchant/api-logs?${qs.toString()}`,
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
watch([filterStatusClass, filterMethod, filterResource, filterPath], () => {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => { page.value = 1; load() }, 250)
})

onMounted(load)

async function openDetail(row: ApiLogRow) {
  drawerOpen.value = true
  active.value = null
  try {
    const res = await apiFetch<{ data: ApiLogDetail }>(`/merchant/api-logs/${row.id}`)
    active.value = res.data
  } catch (e: any) {
    handleError(e)
    drawerOpen.value = false
  }
}

async function copyAsCurl() {
  if (!active.value) return
  // R1 FRONTEND G1 — use runtime config instead of hardcoded port swap
  // (which only worked in dev). Same pattern used by the public status
  // page (status/index.vue). In prod the frontend lives on a different
  // origin from the API, so the swap was broken anyway.
  const runtime = useRuntimeConfig()
  const apiBase = (runtime.public?.apiBase as string || '/api').replace(/\/$/, '')
  const url = apiBase + active.value.path.replace(/^\/api/, '')

  const lines: string[] = []
  // R1 FRONTEND G2 — flag the redacted body up front so the dev knows
  // to fill in real values before running the command.
  const hasRedacted = JSON.stringify(active.value.request_body || {}).includes('***REDACTED***')
  if (hasRedacted) {
    lines.push(t('developersPage.apiLogs.curl.redactedNote'))
    lines.push(t('developersPage.apiLogs.curl.redactedNoteReplace'))
  }
  lines.push(`curl -X ${active.value.method} "${url}" \\`)
  lines.push(`  -H "Authorization: Bearer ${active.value.api_key_prefix || 'YOUR_KEY'}..." \\`)
  lines.push(`  -H "Content-Type: application/json"`)
  if (active.value.idempotency_key) {
    lines[lines.length - 1] += ' \\'
    lines.push(`  -H "X-Idempotency-Key: ${active.value.idempotency_key}"`)
  }
  if (active.value.request_body && Object.keys(active.value.request_body).length > 0) {
    lines[lines.length - 1] += ' \\'
    const body = JSON.stringify(active.value.request_body, null, 2)
    lines.push(`  -d '${body}'`)
  }
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    toast?.add?.({
      severity: 'success',
      summary: t('developersPage.apiLogs.curl.copiedSummary'),
      detail: hasRedacted
        ? t('developersPage.apiLogs.curl.copiedRedacted')
        : t('developersPage.apiLogs.curl.copiedOk'),
      life: 3500,
    })
  } catch {
    toast?.add?.({ severity: 'warn', summary: t('developersPage.apiLogs.curl.copyFailedSummary'), detail: t('developersPage.apiLogs.curl.copyFailed') })
  }
}

function statusTone(code: number): string {
  if (code >= 500) return 'pill--red'
  if (code >= 400) return 'pill--yellow'
  if (code >= 300) return 'pill--neutral'
  return 'pill--green'
}

function durationTone(ms: number): string {
  if (ms >= 4000) return 'lat-bad'
  if (ms >= 1500) return 'lat-meh'
  return 'lat-good'
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return t('developersPage.apiLogs.relativeNow')
  if (mins < 60) return t('developersPage.apiLogs.relativeMin', { n: mins })
  if (mins < 1440) return t('developersPage.apiLogs.relativeHour', { n: Math.floor(mins / 60) })
  try {
    const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
    return d.toLocaleString(localeStr, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return iso.substring(0, 16) }
}

function formatDateLong(iso: string): string {
  try {
    const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
    return new Date(iso).toLocaleString(localeStr, {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return iso }
}

function formatJson(obj: unknown): string {
  try { return JSON.stringify(obj, null, 2) } catch { return String(obj) }
}
</script>

<style scoped>
.page-subtitle { color: var(--ze-text-muted); margin: 0 0 var(--ze-sp-4) 0; font-size: 14px; }

.filters-row {
  display: flex;
  gap: var(--ze-sp-2);
  margin-bottom: var(--ze-sp-4);
  align-items: center;
  flex-wrap: wrap;
}

.filter-select { width: 180px; }
.path-input { flex: 1; min-width: 240px; max-width: 320px; }

.loading { display: flex; flex-direction: column; gap: var(--ze-sp-2); }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: var(--ze-sp-10) var(--ze-sp-4); text-align: center; }
.empty-icon { width: 48px; height: 48px; color: var(--ze-text-muted); margin-bottom: var(--ze-sp-2); }
.empty-text { color: var(--ze-text-muted); margin: 0; max-width: 420px; }

.tabular { font-variant-numeric: tabular-nums; font-family: ui-monospace, "JetBrains Mono", monospace; }
.muted { color: var(--ze-text-muted); }

.method-pill {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  font-family: ui-monospace, monospace;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.method--get { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.method--post { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.method--put, .method--patch { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
.method--delete { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }

.path-cell {
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
  font-variant-numeric: tabular-nums;
}
.pill--green { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.pill--red { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
.pill--yellow { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
.pill--neutral { background: var(--ze-surface-sunken); color: var(--ze-text-muted); border: 1px solid var(--ze-border); }

.lat-good { color: #15803d; }
.lat-meh { color: #a16207; }
.lat-bad { color: #dc2626; font-weight: 600; }

.error-tag {
  display: inline-block;
  padding: 1px 6px;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 3px;
  font-size: 10px;
  font-family: ui-monospace, monospace;
  font-weight: 600;
}

.pagination {
  display: flex; align-items: center; justify-content: center; gap: var(--ze-sp-3); margin-top: var(--ze-sp-4);
}
.page-info { font-size: 13px; color: var(--ze-text-muted); }

/* Drawer */
.drawer-header { display: flex; align-items: flex-start; justify-content: space-between; width: 100%; gap: var(--ze-sp-3); }
.drawer-eyebrow { display: flex; align-items: center; gap: var(--ze-sp-2); margin-bottom: 4px; }
.drawer-title { font-size: 14px; font-family: ui-monospace, monospace; color: var(--ze-text-strong); word-break: break-all; }

.drawer-body { display: flex; flex-direction: column; gap: var(--ze-sp-4); }

.warning-banner {
  display: flex; align-items: center; gap: var(--ze-sp-2);
  padding: var(--ze-sp-3); background: #fefce8; border: 1px solid #fde68a;
  border-radius: 4px; color: #92400e; font-size: 13px;
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
.section-title { margin: 0; font-size: 13px; font-weight: 600; color: var(--ze-text-strong); text-transform: uppercase; letter-spacing: 0.05em; }

.json-block {
  margin: 0; padding: var(--ze-sp-3);
  background: var(--ze-surface-sunken);
  border: 1px solid var(--ze-border);
  border-radius: 4px;
  font-family: ui-monospace, monospace;
  font-size: 12px; line-height: 1.5;
  color: var(--ze-text-body);
  max-height: 360px; overflow: auto;
  white-space: pre-wrap; word-break: break-word;
}
</style>
