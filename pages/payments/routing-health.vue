<template>
  <div class="page">
    <p class="page-subtitle">
      {{ $t('routingHealth.pageSubtitle') }}
    </p>

    <div class="filters-row">
      <Select
        v-model="selectedDays"
        :options="windowOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="$t('routingHealth.filters.window')"
        class="window-select"
      />
      <Select
        v-model="selectedOperator"
        :options="operatorOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="$t('routingHealth.filters.allOperators')"
        :showClear="true"
        class="operator-select"
      />
      <Button
        icon="pi pi-refresh"
        severity="secondary"
        outlined
        :loading="loading"
        :aria-label="$t('routingHealth.filters.refresh')"
        @click="load"
      />
    </div>

    <div v-if="loading" class="loading">
      <Skeleton v-for="i in 4" :key="i" height="64px" class="loading-row" />
    </div>

    <template v-else>
      <!-- Aggregate KPI strip -->
      <div class="kpi-grid">
        <DashboardKpiCard
          tone="blue"
          icon="pi-bolt"
          :label="$t('routingHealth.kpi.attempts')"
          :value="totals.total"
        />
        <DashboardKpiCard
          tone="green"
          icon="pi-check-circle"
          :label="$t('routingHealth.kpi.successful')"
          :value="totals.success"
        />
        <DashboardKpiCard
          tone="yellow"
          icon="pi-replay"
          :label="$t('routingHealth.kpi.fallbacks')"
          :value="totals.fallback"
        />
        <DashboardKpiCard
          tone="neutral"
          icon="pi-percentage"
          :label="$t('routingHealth.kpi.globalRate')"
          :value="`${totals.rate}%`"
        />
      </div>

      <!-- Per-pair table -->
      <div class="section">
        <div class="section-head">
          <h3 class="section-title">{{ $t('routingHealth.pairs.title') }}</h3>
          <p class="section-subtitle">
            {{ $t('routingHealth.pairs.subtitle') }}
          </p>
        </div>

        <div v-if="!rows.length" class="empty-state">
          <AppIcon name="inbox" class="empty-icon" />
          <p class="empty-text">
            {{ $t('routingHealth.pairs.empty', { days: selectedDays }) }}
          </p>
        </div>
        <DataTable v-else :value="rows" class="zayono-table" responsiveLayout="scroll">
          <Column :header="$t('routingHealth.columns.operator')">
            <template #body="{ data }">
              <div class="operator-cell">
                <span class="operator-name">{{ data.operator_name }}</span>
                <span class="operator-code">{{ data.operator }}</span>
              </div>
            </template>
          </Column>
          <Column :header="$t('routingHealth.columns.gateway')">
            <template #body="{ data }">
              <span class="agg-badge">{{ data.aggregator_name }}</span>
            </template>
          </Column>
          <Column :header="$t('routingHealth.columns.attempts')" headerStyle="text-align:right">
            <template #body="{ data }">
              <span class="tabular">{{ data.total_attempts }}</span>
            </template>
          </Column>
          <Column :header="$t('routingHealth.columns.successRate')" headerStyle="text-align:right">
            <template #body="{ data }">
              <span class="rate-pill" :class="rateTone(data.success_rate)">
                {{ data.success_rate === null ? '—' : `${data.success_rate.toFixed(1)} %` }}
              </span>
            </template>
          </Column>
          <Column :header="$t('routingHealth.columns.avgLatency')" headerStyle="text-align:right">
            <template #body="{ data }">
              <span class="tabular" :class="latencyTone(data.avg_latency_ms)">
                {{ formatLatency(data.avg_latency_ms) }}
              </span>
            </template>
          </Column>
          <Column :header="$t('routingHealth.columns.p95Latency')" headerStyle="text-align:right">
            <template #body="{ data }">
              <span class="tabular muted">{{ formatLatency(data.p95_latency_ms) }}</span>
            </template>
          </Column>
          <Column :header="$t('routingHealth.columns.fallback')">
            <template #body="{ data }">
              <span v-if="data.fallback_attempts > 0" class="fallback-pill">
                {{ data.fallback_attempts }}
              </span>
              <span v-else class="muted">—</span>
            </template>
          </Column>
          <Column :header="$t('routingHealth.columns.lastFailure')">
            <template #body="{ data }">
              <span v-if="data.last_failure_at" class="muted tabular">
                {{ formatRelative(data.last_failure_at) }}
              </span>
              <span v-else class="muted">—</span>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Hint when no operator is selected — surfaces the scoring panel -->
      <p v-if="!selectedOperator && rows.length" class="scoring-hint">
        <AppIcon name="info" class="hint-icon" />
        {{ $t('routingHealth.scoringHint') }}
      </p>

      <!-- Scoring transparency panel -->
      <div v-if="selectedOperator" class="section">
        <div class="section-head">
          <h3 class="section-title">{{ $t('routingHealth.scoring.title') }}</h3>
          <p class="section-subtitle">
            {{ $t('routingHealth.scoring.subtitle') }}
            {{ $t('routingHealth.scoring.weighting') }}&nbsp;:
            <strong>{{ Math.round((scoreMeta.weights?.success_rate ?? 0) * 100) }} %</strong> {{ $t('routingHealth.scoring.success') }},
            <strong>{{ Math.round((scoreMeta.weights?.latency ?? 0) * 100) }} %</strong> {{ $t('routingHealth.scoring.latency') }},
            <strong>{{ Math.round((scoreMeta.weights?.cost ?? 0) * 100) }} %</strong> {{ $t('routingHealth.scoring.cost') }}.
          </p>
        </div>

        <div v-if="!scoreRows.length" class="empty-state">
          <p class="empty-text">{{ $t('routingHealth.scoring.empty') }}</p>
        </div>
        <DataTable v-else :value="scoreRows" class="zayono-table">
          <Column header="#" headerStyle="width:48px">
            <template #body="{ data }">
              <span class="rank-pill" :class="data.rank === 1 ? 'rank-pill--gold' : ''">
                {{ data.rank }}
              </span>
            </template>
          </Column>
          <Column field="aggregator_name" :header="$t('routingHealth.columns.gateway')">
            <template #body="{ data }">
              <span class="agg-badge">{{ data.aggregator_name }}</span>
            </template>
          </Column>
          <Column :header="$t('routingHealth.scoring.score')" headerStyle="text-align:right">
            <template #body="{ data }">
              <span class="tabular">{{ data.score.toFixed(4) }}</span>
            </template>
          </Column>
          <Column :header="$t('routingHealth.scoring.selection')" headerStyle="text-align:right">
            <template #body="{ data, index }">
              <span v-if="index === 0" class="selected-tag selected-tag--primary">{{ $t('routingHealth.scoring.primary') }}</span>
              <span v-else-if="index === 1" class="selected-tag selected-tag--fallback">{{ $t('routingHealth.scoring.fallback') }}</span>
              <span v-else class="muted">—</span>
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { apiFetch } = useApi()
const { handleError } = useApiError()
const { t, locale } = useI18n()

useHead({ title: () => t('routingHealth.pageTitle') })

interface HealthRow {
  operator: string
  operator_name: string
  country: string | null
  aggregator_code: string
  aggregator_name: string
  total_attempts: number
  successful_attempts: number
  failed_attempts: number
  fallback_attempts: number
  success_rate: number | null
  avg_latency_ms: number | null
  p95_latency_ms: number | null
  last_success_at: string | null
  last_failure_at: string | null
}

interface ScoreRow {
  rank: number
  aggregator_code: string
  aggregator_name: string
  score: number
}

// R1 FRONTEND M7 — type the score metadata so backend renames break
// at type-check time instead of silently rendering 0 %.
interface ScoreMeta {
  operator?: string
  operator_name?: string
  environment?: string
  history_days?: number
  cache_ttl_seconds?: number
  weights?: {
    success_rate: number
    latency: number
    cost: number
  }
}

const loading = ref(true)
const rows = ref<HealthRow[]>([])
const scoreRows = ref<ScoreRow[]>([])
const scoreMeta = ref<ScoreMeta>({})
const selectedDays = ref(7)
const selectedOperator = ref<string | null>(null)

// R1 FRONTEND H1 — request-id guard prevents stale responses from
// clobbering newer state when filters change rapidly (slow first
// request lands after a faster second one).
let requestId = 0

const windowOptions = computed(() => [
  { label: t('routingHealth.windowOptions.hours24'), value: 1 },
  { label: t('routingHealth.windowOptions.days7'), value: 7 },
  { label: t('routingHealth.windowOptions.days30'), value: 30 },
  { label: t('routingHealth.windowOptions.days90'), value: 90 },
])

const operatorOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const r of rows.value) {
    if (!seen.has(r.operator)) {
      seen.set(r.operator, r.operator_name)
    }
  }
  return Array.from(seen.entries()).map(([value, label]) => ({ value, label }))
})

const totals = computed(() => {
  const t = rows.value.reduce(
    (acc, r) => {
      acc.total += r.total_attempts
      acc.success += r.successful_attempts
      acc.fallback += r.fallback_attempts
      return acc
    },
    { total: 0, success: 0, fallback: 0 },
  )
  return {
    ...t,
    rate: t.total > 0 ? Math.round((t.success / t.total) * 100 * 10) / 10 : 0,
  }
})

async function load() {
  loading.value = true
  const myId = ++requestId

  try {
    const qs = new URLSearchParams({ days: String(selectedDays.value) })
    if (selectedOperator.value) qs.set('operator', selectedOperator.value)

    // R1 FRONTEND H9 — issue both requests in parallel. The scores
    // endpoint is independent of the health endpoint; sequential
    // awaits doubled perceived latency on operator selection.
    const healthPromise = apiFetch<{ data: HealthRow[]; meta: unknown }>(
      `/merchant/routing-health?${qs.toString()}`,
    )
    const scoresPromise = selectedOperator.value
      ? apiFetch<{ data: ScoreRow[]; meta: ScoreMeta }>(
          `/merchant/routing-health/scores/${encodeURIComponent(selectedOperator.value)}`,
        ).catch(() => ({ data: [] as ScoreRow[], meta: {} as ScoreMeta }))
      : Promise.resolve({ data: [] as ScoreRow[], meta: {} as ScoreMeta })

    const [health, scores] = await Promise.all([healthPromise, scoresPromise])

    // Drop stale responses — a slower earlier request must not overwrite
    // newer state set by a fresher request.
    if (myId !== requestId) return

    rows.value = health.data || []
    scoreRows.value = scores.data || []
    scoreMeta.value = scores.meta || {}
  } catch (e: any) {
    if (myId === requestId) handleError(e)
  } finally {
    if (myId === requestId) loading.value = false
  }
}

watch([selectedDays, selectedOperator], () => { load() })

onMounted(load)

function rateTone(r: number | null): string {
  if (r === null) return 'rate-pill--neutral'
  if (r >= 95) return 'rate-pill--green'
  if (r >= 85) return 'rate-pill--yellow'
  return 'rate-pill--red'
}

function latencyTone(ms: number | null): string {
  if (ms === null) return ''
  if (ms < 1500) return 'lat-good'
  if (ms < 4000) return 'lat-meh'
  return 'lat-bad'
}

function formatLatency(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return t('routingHealth.relative.justNow')
  if (minutes < 60) return t('routingHealth.relative.minAgo', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('routingHealth.relative.hourAgo', { n: hours })
  const days = Math.floor(hours / 24)
  // R1 FRONTEND L1 — cap at 30 j to avoid stale "il y a 412 j" output.
  // Beyond that the customer cares about the date, not the delta.
  if (days <= 30) return t('routingHealth.relative.dayAgo', { n: days })
  try {
    return date.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso.substring(0, 10)
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

.window-select { width: 220px; }
.operator-select { width: 240px; }

.loading {
  display: flex;
  flex-direction: column;
  gap: var(--ze-sp-2);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--ze-sp-3);
  margin-bottom: var(--ze-sp-6);
}

.section {
  background: var(--ze-surface);
  border: 1px solid var(--ze-border);
  border-radius: var(--ze-r-md);
  padding: var(--ze-sp-5);
  margin-bottom: var(--ze-sp-6);
}

.section-head { margin-bottom: var(--ze-sp-3); }

.section-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ze-text-strong);
}

.section-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--ze-text-muted);
}

.operator-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.operator-name {
  font-weight: 500;
  color: var(--ze-text-strong);
}

.operator-code {
  font-size: 11px;
  color: var(--ze-text-muted);
  font-family: ui-monospace, "JetBrains Mono", monospace;
}

.agg-badge {
  display: inline-block;
  padding: 3px 10px;
  background: var(--ze-surface-sunken);
  border: 1px solid var(--ze-border);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ze-text-body);
}

.tabular {
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, "JetBrains Mono", monospace;
}

.rate-pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.rate-pill--green {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.rate-pill--yellow {
  background: #fefce8;
  color: #a16207;
  border: 1px solid #fde68a;
}

.rate-pill--red {
  background: #fef2f2;
  color: #dc2626;
  /* R1 FRONTEND M10 — bumped from #fecaca (1.3:1) to #fca5a5 (~3:1) to
     meet WCAG 1.4.11 non-text contrast on the pill border. */
  border: 1px solid #fca5a5;
}

.rate-pill--neutral {
  background: var(--ze-surface-sunken);
  color: var(--ze-text-muted);
  border: 1px solid var(--ze-border);
}

.lat-good { color: #15803d; }
.lat-meh { color: #a16207; }
.lat-bad { color: #dc2626; font-weight: 600; }

.fallback-pill {
  display: inline-block;
  padding: 2px 8px;
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.muted { color: var(--ze-text-muted); }

.rank-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--ze-surface-sunken);
  font-size: 12px;
  font-weight: 600;
  color: var(--ze-text-body);
}

.rank-pill--gold {
  background: #fef3c7;
  color: #92400e;
}

.selected-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.selected-tag--primary {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.selected-tag--fallback {
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
}

.scoring-hint {
  display: flex;
  align-items: center;
  gap: var(--ze-sp-2);
  padding: var(--ze-sp-3) var(--ze-sp-4);
  background: var(--ze-info-soft, #eff6ff);
  border: 1px solid var(--ze-info-border, #bfdbfe);
  border-radius: var(--ze-r-md);
  font-size: 13px;
  color: var(--ze-info, #1d4ed8);
  margin-bottom: var(--ze-sp-6);
}

.hint-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--ze-sp-8) var(--ze-sp-4);
  text-align: center;
}

.empty-icon {
  width: 40px;
  height: 40px;
  color: var(--ze-text-muted);
  margin-bottom: var(--ze-sp-2);
}

.empty-text {
  color: var(--ze-text-muted);
  margin: 0;
  max-width: 400px;
}

.loading-row {
  border-radius: var(--ze-r-md);
}
</style>
