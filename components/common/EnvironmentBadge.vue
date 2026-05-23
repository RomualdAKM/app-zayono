<template>
  <button class="env-pill" :class="envStore.current" @click="openConfirm" :title="$t('envBadge.modeTitle', { label: labelFull })">
    <span class="env-dot"></span>
    <span class="env-label">{{ labelFull }}</span>
    <AppIcon name="arrow-right-arrow-left" class="env-swap-icon" />
  </button>

  <Dialog v-model:visible="showConfirm" :modal="true" :closable="true" :style="{ width: '420px' }" :header="$t('envBadge.dialogTitle')">
    <p class="confirm-text">
      {{ $t('envBadge.switching') }} <strong>{{ targetLabel }}</strong>.
    </p>
    <p class="confirm-help" v-if="envStore.current === 'sandbox'">
      {{ $t('envBadge.modeLive') }} <strong>{{ $t('envBadge.live') }}</strong> {{ $t('envBadge.liveHelp') }}
    </p>
    <p class="confirm-help" v-else>
      {{ $t('envBadge.modeSandbox') }} <strong>{{ $t('envBadge.sandbox') }}</strong> {{ $t('envBadge.sandboxHelp') }}
    </p>
    <template #footer>
      <Button :label="$t('common.cancel')" severity="secondary" text @click="showConfirm = false" />
      <Button :label="$t('envBadge.switchTo', { label: targetLabel })" @click="confirm" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { useEnvironmentStore } from '~/stores/environment'

const envStore = useEnvironmentStore()
const { t } = useI18n()
const showConfirm = ref(false)

const labelFull = computed(() => (envStore.current === 'live' ? t('envBadge.live') : t('envBadge.sandbox')))
const targetLabel = computed(() => (envStore.current === 'live' ? t('envBadge.sandbox') : t('envBadge.live')))

const openConfirm = () => {
  showConfirm.value = true
}

const confirm = () => {
  envStore.toggle()
  showConfirm.value = false
  // Hard reload so every onMounted `apiFetch(...)` call re-runs with the
  // new `X-Zayono-Environment` header. The `00.hydrate.client.ts` plugin
  // re-reads localStorage on boot so the auth token + env persist
  // across this reload (otherwise SSR resets them).
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}
</script>

<style scoped>
.env-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  transition: background 0.15s, border-color 0.15s;
}

.env-pill.sandbox {
  background: #FEF3C7;
  color: #92400E;
  border-color: #FDE68A;
}

.env-pill.sandbox:hover {
  background: #FDE68A;
}

.env-pill.live {
  background: #D1FAE5;
  color: #065F46;
  border-color: #A7F3D0;
}

.env-pill.live:hover {
  background: #A7F3D0;
}

.env-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.env-swap-icon {
  font-size: 9px;
  opacity: 0.6;
}

.confirm-text {
  font-size: 14px;
  color: #111827;
  margin: 0 0 12px;
}

.confirm-help {
  font-size: 12px;
  color: #6B7280;
  line-height: 1.6;
}
</style>
