<template>
  <div>
    <!-- Overall banner -->
    <div class="overall-banner" :class="`banner--${summary?.overall || 'operational'}`">
      <span class="banner-dot" />
      <div class="banner-text">
        <h1 class="banner-title">{{ overallLabel }}</h1>
        <p v-if="summary?.computed_at" class="banner-meta">
          {{ $t('statusPage.lastCheck', { time: formatRelative(summary.computed_at) }) }}
        </p>
      </div>
    </div>

    <!-- Aggregator grid -->
    <section class="section">
      <h2 class="section-title">{{ $t('statusPage.aggregators') }}</h2>
      <div v-if="!summary" class="loading-grid">
        <div v-for="i in 8" :key="i" class="card card--skeleton" />
      </div>
      <div v-else class="card-grid">
        <article
          v-for="agg in summary.aggregators"
          :key="agg.aggregator_code"
          class="card"
          :class="`card--${agg.status}`"
        >
          <div class="card-head">
            <span class="card-dot" />
            <span class="card-name">{{ agg.name }}</span>
          </div>
          <div class="card-status">{{ statusLabel(agg.status) }}</div>
          <div class="card-meta">
            <span class="meta-row">
              <span class="meta-label">{{ $t('statusPage.success') }}</span>
              <span class="meta-value">{{ bucketLabel(agg.success_bucket, 'success') }}</span>
            </span>
            <span class="meta-row">
              <span class="meta-label">{{ $t('statusPage.latency') }}</span>
              <span class="meta-value">{{ bucketLabel(agg.latency_bucket, 'latency') }}</span>
            </span>
          </div>
        </article>
      </div>
    </section>

    <!-- Active incidents -->
    <section v-if="activeIncidents.length" class="section">
      <h2 class="section-title">{{ $t('statusPage.activeIncidents') }}</h2>
      <ul class="incident-list">
        <li v-for="i in activeIncidents" :key="i.id" class="incident incident--active" :class="`severity--${i.severity}`">
          <div class="incident-head">
            <span class="severity-tag">{{ severityLabel(i.severity) }}</span>
            <h3 class="incident-title">{{ i.title }}</h3>
          </div>
          <p v-if="i.description" class="incident-desc">{{ i.description }}</p>
          <p class="incident-meta">
            {{ $t('statusPage.started', { time: formatRelative(i.started_at) }) }} ·
            <span v-if="i.auto_detected">{{ $t('statusPage.autoDetected') }}</span>
            <span v-else>{{ $t('statusPage.manualDeclared') }}</span>
            · {{ $t('statusPage.incidentStatus') }} {{ incidentStatusLabel(i.status) }}
          </p>
        </li>
      </ul>
    </section>

    <!-- Past incidents -->
    <section v-if="resolvedIncidents.length" class="section">
      <h2 class="section-title">{{ $t('statusPage.pastIncidents') }}</h2>
      <ul class="incident-list">
        <li v-for="i in resolvedIncidents.slice(0, 20)" :key="i.id" class="incident incident--resolved">
          <div class="incident-head">
            <span class="severity-tag severity-tag--muted">{{ severityLabel(i.severity) }}</span>
            <h3 class="incident-title">{{ i.title }}</h3>
          </div>
          <p v-if="i.description" class="incident-desc">{{ i.description }}</p>
          <p class="incident-meta">
            {{ formatDate(i.started_at) }} · {{ $t('statusPage.resolvedIn', { duration: resolutionDuration(i) }) }}
          </p>
        </li>
      </ul>
    </section>

    <!-- Subscribe -->
    <section class="section subscribe">
      <h2 class="section-title">{{ $t('statusPage.subscribeTitle') }}</h2>
      <p class="subscribe-desc">{{ $t('statusPage.subscribeDesc') }}</p>
      <form class="subscribe-form" @submit.prevent="subscribe">
        <input
          v-model="emailInput"
          type="email"
          required
          :placeholder="$t('statusPage.emailPlaceholder')"
          class="subscribe-input"
          :disabled="subscribing"
        />
        <button type="submit" class="subscribe-btn" :disabled="subscribing">
          {{ subscribing ? $t('statusPage.sending') : $t('statusPage.subscribeBtn') }}
        </button>
      </form>
      <p v-if="subscribeMessage" class="subscribe-message">{{ subscribeMessage }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'status' })

const { t, locale } = useI18n()

useHead({
  title: () => t('statusPage.pageTitle'),
  meta: [
    { name: 'description', content: () => t('statusPage.pageDescription') },
    { name: 'robots', content: 'index, follow' },
  ],
})

interface AggregatorCard {
  aggregator_code: string
  name: string
  status: 'operational' | 'degraded' | 'outage'
  success_bucket: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'
  latency_bucket: 'fast' | 'moderate' | 'slow' | 'unknown'
  last_check: string | null
}

interface Summary {
  overall: 'operational' | 'degraded' | 'outage'
  aggregators: AggregatorCard[]
  computed_at: string
}

interface Incident {
  id: string
  aggregator_code: string | null
  aggregator_name: string | null
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  severity: 'minor' | 'major' | 'critical'
  title: string
  description: string | null
  started_at: string
  resolved_at: string | null
  auto_detected: boolean
}

const config = useRuntimeConfig()
const apiBase = (config.public?.apiBase as string) || '/api'

// SSR-friendly fetches — useFetch caches the result through hydration.
const { data: summary } = await useFetch<Summary>(`${apiBase}/status/summary`, {
  key: 'status-summary',
  default: () => null as any,
})
const { data: incidentsResp } = await useFetch<{ data: Incident[] }>(`${apiBase}/status/incidents`, {
  key: 'status-incidents',
  default: () => ({ data: [] }) as any,
})

const activeIncidents = computed(() => (incidentsResp.value?.data || []).filter(i => !i.resolved_at))
const resolvedIncidents = computed(() => (incidentsResp.value?.data || []).filter(i => i.resolved_at))

const overallLabel = computed(() => {
  const s = summary.value?.overall || 'operational'
  if (s === 'outage') return t('statusPage.overall.outage')
  if (s === 'degraded') return t('statusPage.overall.degraded')
  return t('statusPage.overall.operational')
})

const emailInput = ref('')
const subscribing = ref(false)
const subscribeMessage = ref('')

async function subscribe() {
  if (!emailInput.value || subscribing.value) return
  subscribing.value = true
  try {
    await $fetch(`${apiBase}/status/subscribe`, {
      method: 'POST',
      body: { email: emailInput.value },
    })
    subscribeMessage.value = t('statusPage.subscribeOk')
    emailInput.value = ''
  } catch {
    subscribeMessage.value = t('statusPage.subscribeError')
  } finally {
    subscribing.value = false
  }
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    operational: t('statusPage.aggregatorStatus.operational'),
    degraded: t('statusPage.aggregatorStatus.degraded'),
    outage: t('statusPage.aggregatorStatus.outage'),
  }
  return map[s] || s
}

function bucketLabel(bucket: string, kind: 'success' | 'latency'): string {
  if (kind === 'success') {
    const map: Record<string, string> = {
      excellent: t('statusPage.successBucket.excellent'),
      good: t('statusPage.successBucket.good'),
      fair: t('statusPage.successBucket.fair'),
      poor: t('statusPage.successBucket.poor'),
      unknown: '—',
    }
    return map[bucket] || '—'
  }
  const map: Record<string, string> = {
    fast: t('statusPage.latencyBucket.fast'),
    moderate: t('statusPage.latencyBucket.moderate'),
    slow: t('statusPage.latencyBucket.slow'),
    unknown: '—',
  }
  return map[bucket] || '—'
}

function severityLabel(s: string): string {
  const map: Record<string, string> = {
    minor: t('statusPage.severity.minor'),
    major: t('statusPage.severity.major'),
    critical: t('statusPage.severity.critical'),
  }
  return map[s] || s
}

function incidentStatusLabel(s: string): string {
  const map: Record<string, string> = {
    investigating: t('statusPage.incidentStateLabel.investigating'),
    identified: t('statusPage.incidentStateLabel.identified'),
    monitoring: t('statusPage.incidentStateLabel.monitoring'),
    resolved: t('statusPage.incidentStateLabel.resolved'),
  }
  return map[s] || s
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000)
  if (mins < 1) return t('statusPage.relativeNow')
  if (mins < 60) return t('statusPage.relativeMin', { n: mins })
  if (mins < 1440) return t('statusPage.relativeHour', { n: Math.floor(mins / 60) })
  return t('statusPage.relativeDay', { n: Math.floor(mins / 1440) })
}

function formatDate(iso: string): string {
  try {
    const localeStr = locale.value === 'fr' ? 'fr-FR' : 'en-US'
    return new Date(iso).toLocaleDateString(localeStr, { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso.substring(0, 10) }
}

function resolutionDuration(i: Incident): string {
  if (!i.resolved_at) return ''
  const ms = new Date(i.resolved_at).getTime() - new Date(i.started_at).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)} h ${mins % 60} min`
}
</script>

<style scoped>
.overall-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 28px;
  border-radius: 8px;
  margin-bottom: 32px;
  border: 1px solid;
}

.banner--operational { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
.banner--degraded { background: #fefce8; border-color: #fde68a; color: #a16207; }
.banner--outage { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }

.banner-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.banner-title { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
/* R1 A11Y — remove opacity: 0.8 which dropped 13px text contrast below
   WCAG 2.1 AA on the outage variant (~3.6:1). Full color is ~4.5-5.5:1. */
.banner-meta { margin: 4px 0 0 0; font-size: 13px; }

.section { margin-bottom: 40px; }

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 16px 0;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.card {
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card--skeleton { min-height: 110px; background: #f3f4f6; }

.card--degraded { border-color: #fde68a; background: #fefce8; }
.card--outage { border-color: #fca5a5; background: #fef2f2; }

.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #15803d;
  flex-shrink: 0;
}

.card--degraded .card-dot { background: #a16207; }
.card--outage .card-dot { background: #dc2626; }

.card-name { font-size: 14px; font-weight: 600; color: #111827; }

.card-status {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #15803d;
}

.card--degraded .card-status { color: #a16207; }
.card--outage .card-status { color: #dc2626; }

.card-meta { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }

.meta-row { display: flex; justify-content: space-between; font-size: 12px; }
.meta-label { color: #6b7280; }
.meta-value { color: #374151; font-weight: 500; }

/* Incidents */
.incident-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }

.incident {
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  border-left: 3px solid #9ca3af;
}

.incident--active.severity--major { border-left-color: #dc2626; }
.incident--active.severity--critical { border-left-color: #991b1b; }
.incident--active.severity--minor { border-left-color: #a16207; }

.incident-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }

.severity-tag {
  display: inline-block;
  padding: 2px 8px;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.severity-tag--muted {
  background: #f3f4f6;
  color: #6b7280;
  border-color: #d1d5db;
}

.incident-title { margin: 0; font-size: 15px; font-weight: 600; color: #111827; }
.incident-desc { margin: 4px 0 8px 0; font-size: 13px; color: #4b5563; line-height: 1.5; }
.incident-meta { margin: 0; font-size: 12px; color: #6b7280; }

/* Subscribe */
.subscribe-desc { margin: 0 0 12px 0; font-size: 13px; color: #6b7280; }

.subscribe-form { display: flex; gap: 8px; max-width: 480px; }

.subscribe-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font: inherit;
  font-size: 14px;
}

.subscribe-input:focus-visible { outline: 2px solid #2563eb; outline-offset: 1px; border-color: #2563eb; }

.subscribe-btn {
  padding: 8px 16px;
  background: #111827;
  color: #ffffff;
  border: 1px solid #111827;
  border-radius: 4px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.subscribe-btn:hover:not(:disabled) { background: #1f2937; }
.subscribe-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.subscribe-message { margin: 8px 0 0 0; font-size: 13px; color: #15803d; }
</style>
