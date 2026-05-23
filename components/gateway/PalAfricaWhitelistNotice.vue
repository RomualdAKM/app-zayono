<template>
  <div class="pal-notice">
    <div class="pal-notice-head">
      <span class="pal-notice-icon">
        <AppIcon name="exclamation-triangle" />
      </span>
      <div>
        <h4 class="pal-notice-title">{{ t('palAfricaNotice.title') }}</h4>
        <p class="pal-notice-sub">
          {{ t('palAfricaNotice.subtitle') }}
        </p>
      </div>
    </div>

    <ol class="pal-notice-steps">
      <li>
        <strong>{{ t('palAfricaNotice.step1Prefix') }}</strong> {{ t('palAfricaNotice.step1Body') }}
        <strong>{{ envLabel }}</strong> :
      </li>
      <li>
        <div class="pal-notice-ipbox">
          <code>{{ outboundIp }}</code>
          <button type="button" class="pal-notice-copy" @click="copy(outboundIp)" :title="t('palAfricaNotice.copyTooltip')">
            <AppIcon name="copy" />
            <span>{{ copied ? t('palAfricaNotice.copied') : t('palAfricaNotice.copyTooltip') }}</span>
          </button>
        </div>
      </li>
      <li>
        {{ t('palAfricaNotice.step3') }}
      </li>
    </ol>

    <details class="pal-notice-template">
      <summary>{{ t('palAfricaNotice.templateSummary') }}</summary>
      <pre>{{ emailTemplate }}</pre>
      <button type="button" class="pal-notice-copy" @click="copy(emailTemplate)" :title="t('palAfricaNotice.copyEmailTooltip')">
        <AppIcon name="copy" />
        <span>{{ emailCopied ? t('palAfricaNotice.copied') : t('palAfricaNotice.copyTemplate') }}</span>
      </button>
    </details>
  </div>
</template>

<script setup lang="ts">
/**
 * PAL Africa-specific connection notice.
 *
 * Surfaces the IP-whitelisting requirement that PAL imposes on every
 * merchant integration (confirmed by PAL support email 2026-05-21).
 * Without this step, every PAL API call returns 404 — a misleading
 * failure mode that costs hours of debugging.
 *
 * The displayed IP is Zayono's BACKEND outbound IP (the server that
 * makes the API calls to PAL, not the merchant's PC). It's sourced
 * from `useRuntimeConfig().public.zayonoOutboundIp*` so a deployment
 * change doesn't require a frontend rebuild.
 */

const props = defineProps<{
  /** Active environment — `'live'` shows the live IP, anything else the sandbox IP. */
  environment: 'live' | 'sandbox' | 'test'
}>()

const { t } = useI18n()
const config = useRuntimeConfig()
const envLabel = computed(() => (props.environment === 'live' ? t('palAfricaNotice.envProduction') : t('palAfricaNotice.envSandbox')))

const outboundIp = computed(() =>
  props.environment === 'live'
    ? (config.public.zayonoOutboundIpLive as string)
    : (config.public.zayonoOutboundIpSandbox as string),
)

const emailTemplate = computed(() =>
  t('palAfricaNotice.emailTemplate', {
    envLabel: envLabel.value,
    outboundIp: outboundIp.value,
  }),
)

const copied = ref(false)
const emailCopied = ref(false)

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    if (text === outboundIp.value) {
      copied.value = true
      setTimeout(() => { copied.value = false }, 2000)
    } else {
      emailCopied.value = true
      setTimeout(() => { emailCopied.value = false }, 2000)
    }
  } catch {
    // Clipboard API unavailable (older browsers, insecure context).
    // Fall back silently — the merchant can select + Ctrl+C the visible
    // text in the <code> or <pre> blocks themselves.
  }
}
</script>

<style scoped>
.pal-notice {
  background: var(--ze-warning-bg);
  border: 1px solid var(--ze-warning-border);
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pal-notice-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.pal-notice-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--ze-warning-fg);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.pal-notice-title {
  margin: 0 0 2px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ze-warning-fg);
}

.pal-notice-sub {
  margin: 0;
  font-size: 13px;
  color: var(--ze-text-body);
  line-height: 1.5;
}

.pal-notice-steps {
  margin: 0;
  padding-left: 22px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: var(--ze-text-body);
  line-height: 1.5;
}

.pal-notice-steps li {
  padding-left: 4px;
}

.pal-notice-ipbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-warning-border);
  border-radius: 6px;
  padding: 6px 10px;
  margin-top: 4px;
}

.pal-notice-ipbox code {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--ze-text-strong);
  letter-spacing: 0.02em;
}

.pal-notice-copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--ze-warning-fg);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.12s;
}

.pal-notice-copy:hover {
  background: rgba(0, 0, 0, 0.05);
}

.pal-notice-template {
  margin-top: 4px;
  border-top: 1px dashed var(--ze-warning-border);
  padding-top: 10px;
}

.pal-notice-template summary {
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--ze-warning-fg);
  user-select: none;
}

.pal-notice-template summary:hover {
  text-decoration: underline;
}

.pal-notice-template pre {
  margin: 10px 0 6px;
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-warning-border);
  border-radius: 6px;
  padding: 10px 12px;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 12px;
  color: var(--ze-text-body);
  white-space: pre-wrap;
  line-height: 1.5;
}
</style>
