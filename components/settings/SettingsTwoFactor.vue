<template>
  <div class="two-factor">
    <div class="section-header">
      <h3 class="section-title">{{ $t('security.twoFactor.title') }}</h3>
      <p class="section-desc">{{ $t('security.twoFactor.subtitle') }}</p>
    </div>

    <!-- ─── Loading skeleton ─────────────────────────────────────── -->
    <div v-if="initialLoading" class="status-loading">
      <Skeleton width="100%" height="80px" />
    </div>

    <!-- ─── State A: 2FA disabled — show the enable CTA ─────────── -->
    <template v-else-if="status === 'disabled' && stage === 'idle'">
      <div class="status-card status-card--neutral">
        <div class="status-icon"><AppIcon name="shield" /></div>
        <div class="status-body">
          <div class="status-title">{{ $t('security.twoFactor.statusDisabled') }}</div>
          <div class="status-desc">{{ $t('security.twoFactor.statusDisabledDesc') }}</div>
        </div>
        <Button :label="$t('security.twoFactor.enable')" :loading="processing" @click="startSetup" />
      </div>
    </template>

    <!-- ─── State B: Setup → QR shown, awaiting confirmation ─────── -->
    <template v-else-if="stage === 'setup' && setupPayload">
      <div class="setup-grid">
        <div class="setup-step-list">
          <ol>
            <li>{{ $t('security.twoFactor.setupStep1') }}</li>
            <li>{{ $t('security.twoFactor.setupStep2') }}</li>
            <li>{{ $t('security.twoFactor.setupStep3') }}</li>
          </ol>
          <div class="manual-entry">
            <label class="field-label">{{ $t('security.twoFactor.manualEntry') }}</label>
            <div class="secret-row">
              <code class="secret-code">{{ setupPayload.secret }}</code>
              <Button
                icon="pi pi-copy"
                severity="secondary"
                text
                size="small"
                :aria-label="$t('security.twoFactor.copySecret')"
                v-tooltip.top="$t('security.twoFactor.copySecret')"
                @click="copySecret"
              />
            </div>
          </div>
        </div>
        <div class="qr-card">
          <!-- The QR markup comes from BaconQrCode (SVG string). Safe to
               v-html: it's generated server-side from our own secret + a
               fixed label template — no user-supplied content (R2
               integration L5 confirmed SvgImageBackEnd emits only
               svg+rect, no <text>). aria-label gives AT users an
               equivalent of the visual QR (the secret is also displayed
               textually just above). -->
          <div
            class="qr-wrap"
            role="img"
            :aria-label="$t('security.twoFactor.qrAriaLabel')"
            v-html="setupPayload.qr_code_svg"
          ></div>
        </div>
      </div>

      <div class="confirm-row">
        <label class="field-label" for="2fa-confirm-code">{{ $t('security.twoFactor.confirmCodeLabel') }}</label>
        <InputText
          id="2fa-confirm-code"
          v-model="confirmCode"
          maxlength="6"
          inputmode="numeric"
          autocomplete="one-time-code"
          placeholder="000000"
          class="code-input"
          :class="{ 'p-invalid': confirmError }"
        />
        <small v-if="confirmError" class="field-error" role="alert">{{ confirmError }}</small>
      </div>

      <div class="section-actions">
        <Button
          text
          severity="secondary"
          :label="$t('security.twoFactor.cancel')"
          @click="cancelSetup"
        />
        <Button
          :label="$t('security.twoFactor.confirm')"
          :loading="processing"
          :disabled="confirmCode.length !== 6"
          @click="confirmSetup"
        />
      </div>
    </template>

    <!-- ─── State C: Recovery codes shown ONCE after confirmation ── -->
    <template v-else-if="stage === 'codes-shown' && recoveryCodes.length">
      <div class="status-card status-card--success">
        <div class="status-icon"><AppIcon name="check-circle" /></div>
        <div class="status-body">
          <div class="status-title">{{ $t('security.twoFactor.codesShownTitle') }}</div>
          <div class="status-desc">{{ $t('security.twoFactor.codesShownDesc') }}</div>
        </div>
      </div>

      <div class="codes-grid">
        <code v-for="c in recoveryCodes" :key="c" class="recovery-code">{{ c }}</code>
      </div>

      <div class="section-actions">
        <Button
          severity="secondary"
          outlined
          :label="$t('security.twoFactor.copyAll')"
          icon="pi pi-copy"
          @click="copyAllCodes"
        />
        <Button :label="$t('security.twoFactor.codesAcknowledged')" @click="acknowledgeCodes" />
      </div>
    </template>

    <!-- ─── State D: 2FA enabled — recovery + disable controls ──── -->
    <template v-else-if="status === 'enabled' && stage === 'idle'">
      <div class="status-card status-card--success">
        <div class="status-icon"><AppIcon name="check-circle" /></div>
        <div class="status-body">
          <div class="status-title">{{ $t('security.twoFactor.statusEnabled') }}</div>
          <div class="status-desc">
            {{ $t('security.twoFactor.statusEnabledDesc', { count: recoveryCount }) }}
          </div>
        </div>
      </div>

      <div class="action-row">
        <Button
          severity="secondary"
          outlined
          :label="$t('security.twoFactor.regenerateCodes')"
          @click="stage = 'regenerate'"
        />
        <Button
          severity="danger"
          outlined
          :label="$t('security.twoFactor.disable')"
          @click="stage = 'disable'"
        />
      </div>
    </template>

    <!-- ─── Modal: regenerate recovery codes (asks for current TOTP) ── -->
    <Dialog
      v-model:visible="regenerateOpen"
      :header="$t('security.twoFactor.regenerateTitle')"
      :modal="true"
      :closable="!processing"
      :draggable="false"
      :style="{ width: '420px' }"
    >
      <p class="dialog-desc">{{ $t('security.twoFactor.regenerateDesc') }}</p>
      <div class="form-field">
        <label class="field-label" for="2fa-regen-code">{{ $t('security.twoFactor.regenerateCodeLabel') }}</label>
        <InputText
          id="2fa-regen-code"
          v-model="regenerateCode"
          maxlength="6"
          inputmode="numeric"
          autocomplete="one-time-code"
          placeholder="000000"
          class="code-input"
        />
      </div>
      <template #footer>
        <Button text severity="secondary" :label="$t('security.twoFactor.cancel')" @click="stage = 'idle'" />
        <Button
          :label="$t('security.twoFactor.confirm')"
          :loading="processing"
          :disabled="regenerateCode.length !== 6"
          @click="doRegenerate"
        />
      </template>
    </Dialog>

    <!-- ─── Modal: disable 2FA (asks for password + current TOTP) ──── -->
    <Dialog
      v-model:visible="disableOpen"
      :header="$t('security.twoFactor.disableTitle')"
      :modal="true"
      :closable="!processing"
      :draggable="false"
      :style="{ width: '440px' }"
    >
      <p class="dialog-desc">{{ $t('security.twoFactor.disableDesc') }}</p>
      <div class="form-field">
        <label class="field-label" for="2fa-disable-pw">{{ $t('security.twoFactor.disablePasswordLabel') }}</label>
        <Password
          input-id="2fa-disable-pw"
          v-model="disablePassword"
          :feedback="false"
          toggle-mask
          class="w-full"
          input-class="w-full"
        />
      </div>
      <div class="form-field">
        <label class="field-label" for="2fa-disable-code">{{ $t('security.twoFactor.disableCodeLabel') }}</label>
        <InputText
          id="2fa-disable-code"
          v-model="disableCode"
          maxlength="6"
          inputmode="numeric"
          autocomplete="one-time-code"
          placeholder="000000"
          class="code-input"
        />
      </div>
      <template #footer>
        <Button text severity="secondary" :label="$t('security.twoFactor.cancel')" @click="stage = 'idle'" />
        <Button
          severity="danger"
          :label="$t('security.twoFactor.disable')"
          :loading="processing"
          :disabled="!disablePassword || disableCode.length !== 6"
          @click="doDisable"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'

const { apiFetch } = useApi()
const { handleError } = useApiError()
const { t } = useI18n()
const toast = useToast()

type Stage = 'idle' | 'setup' | 'codes-shown' | 'regenerate' | 'disable'

const initialLoading = ref(true)
const processing = ref(false)
const status = ref<'disabled' | 'enabled'>('disabled')
const recoveryCount = ref(0)
const stage = ref<Stage>('idle')
// R2 UX BLOCKING 1: the backend exposes `setup_in_progress` (secret
// staged but not yet confirmed). If a user closes the tab mid-setup and
// returns later, we restore the setup stage automatically — the previous
// version dropped them back on the "Enable" CTA which then rotated the
// staged secret, invalidating any QR the user had already scanned.
const setupInProgress = ref(false)

const setupPayload = ref<{ secret: string; otpauth_url: string; qr_code_svg: string } | null>(null)
const confirmCode = ref('')
const confirmError = ref('')
const recoveryCodes = ref<string[]>([])
const regenerateCode = ref('')
const disablePassword = ref('')
const disableCode = ref('')

// R2 UX HIGH 8: on dialog close (Cancel button OR X icon OR backdrop
// click), reset any sensitive input the user typed. Avoids password +
// TOTP code remaining in memory if the user accidentally opens then
// closes the disable dialog.
const regenerateOpen = computed({
  get: () => stage.value === 'regenerate',
  set: (v: boolean) => {
    if (!v) {
      regenerateCode.value = ''
      stage.value = 'idle'
    }
  },
})
const disableOpen = computed({
  get: () => stage.value === 'disable',
  set: (v: boolean) => {
    if (!v) {
      disablePassword.value = ''
      disableCode.value = ''
      stage.value = 'idle'
    }
  },
})

async function refreshStatus() {
  try {
    const res = await apiFetch<{ success: boolean; data: { enabled: boolean; setup_in_progress: boolean; recovery_codes_remaining: number } }>(
      '/auth/2fa/status',
    )
    status.value = res.data.enabled ? 'enabled' : 'disabled'
    recoveryCount.value = res.data.recovery_codes_remaining
    setupInProgress.value = !!res.data.setup_in_progress
    // R2 UX BLOCKING 1: if the merchant abandoned setup before
    // confirming, resume the setup screen with a fresh QR fetched
    // from /setup. The backend rotates the secret on each /setup call,
    // which is the correct behavior — a half-completed setup is never
    // trusted across browser sessions.
    if (!res.data.enabled && res.data.setup_in_progress && stage.value === 'idle') {
      await startSetup()
    }
  } finally {
    initialLoading.value = false
  }
}

async function startSetup() {
  processing.value = true
  try {
    const res = await apiFetch<{ success: boolean; data: { secret: string; otpauth_url: string; qr_code_svg: string } }>(
      '/auth/2fa/setup',
      { method: 'POST' },
    )
    setupPayload.value = res.data
    confirmCode.value = ''
    confirmError.value = ''
    stage.value = 'setup'
    setupInProgress.value = true
  } catch (e: any) {
    handleError(e, t('security.twoFactor.title'))
  } finally {
    processing.value = false
  }
}

function cancelSetup() {
  setupPayload.value = null
  confirmCode.value = ''
  confirmError.value = ''
  stage.value = 'idle'
  setupInProgress.value = false
}

// R2 UX HIGH 7: clipboard fallback for old browsers / http contexts.
// `navigator.clipboard` is undefined off HTTPS and on legacy browsers;
// without a fallback the "Copy" button silently no-ops. Recovery codes
// are too important for silent failure — fall back to a textarea +
// document.execCommand('copy') trick, and toast on either path.
async function copyText(text: string, successKey: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({ severity: 'success', summary: t(successKey), life: 1800 })
      return
    } catch {
      // Fall through to the legacy path.
    }
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'absolute'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    toast.add({ severity: 'success', summary: t(successKey), life: 1800 })
  } catch {
    toast.add({ severity: 'error', summary: t('security.twoFactor.copyFailed'), life: 3000 })
  }
}

function copySecret() {
  if (setupPayload.value?.secret) {
    copyText(setupPayload.value.secret, 'security.twoFactor.secretCopied')
  }
}

async function confirmSetup() {
  confirmError.value = ''
  processing.value = true
  try {
    const res = await apiFetch<{ success: boolean; data: { recovery_codes: string[] } }>(
      '/auth/2fa/confirm',
      { method: 'POST', body: { code: confirmCode.value.trim() } },
    )
    recoveryCodes.value = res.data.recovery_codes
    stage.value = 'codes-shown'
    await refreshStatus()
  } catch (e: any) {
    const fieldError = e?.data?.errors?.code
    confirmError.value = Array.isArray(fieldError) ? fieldError[0] : fieldError || t('security.twoFactor.invalidCode')
    // R2 UX BLOCKING 3 parity with two-factor.vue: clear the field so
    // the user doesn't have to select-all + retype after a rejection.
    confirmCode.value = ''
  } finally {
    processing.value = false
  }
}

function acknowledgeCodes() {
  recoveryCodes.value = []
  stage.value = 'idle'
}

async function doRegenerate() {
  processing.value = true
  try {
    const res = await apiFetch<{ success: boolean; data: { recovery_codes: string[] } }>(
      '/auth/2fa/recovery-codes',
      { method: 'POST', body: { code: regenerateCode.value.trim() } },
    )
    recoveryCodes.value = res.data.recovery_codes
    regenerateCode.value = ''
    stage.value = 'codes-shown'
    await refreshStatus()
  } catch (e: any) {
    handleError(e, t('security.twoFactor.regenerateTitle'))
  } finally {
    processing.value = false
  }
}

async function doDisable() {
  processing.value = true
  try {
    await apiFetch('/auth/2fa/disable', {
      method: 'POST',
      body: { password: disablePassword.value, code: disableCode.value.trim() },
    })
    disablePassword.value = ''
    disableCode.value = ''
    stage.value = 'idle'
    await refreshStatus()
    toast.add({
      severity: 'success',
      summary: t('security.twoFactor.disableSuccess'),
      life: 3000,
    })
  } catch (e: any) {
    handleError(e, t('security.twoFactor.disableTitle'))
  } finally {
    processing.value = false
  }
}

async function copyAllCodes() {
  await copyText(recoveryCodes.value.join('\n'), 'security.twoFactor.copied')
}

onMounted(refreshStatus)
</script>

<style scoped>
.two-factor {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0;
}

.section-desc {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0;
}

.status-loading {
  width: 100%;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  background: var(--ze-bg-card);
}

.status-card--neutral { border-left: 4px solid var(--ze-text-muted); }
.status-card--success { border-left: 4px solid var(--ze-success, #15803D); background: color-mix(in srgb, var(--ze-success, #15803D) 4%, var(--ze-bg-card)); }

.status-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  color: var(--ze-brand);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.status-card--success .status-icon { color: var(--ze-success, #15803D); }

.status-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.status-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ze-text-strong);
}

.status-desc {
  font-size: 13px;
  color: var(--ze-text-muted);
}

/* ─── Setup grid (QR + manual entry + steps) ─────────────────────── */

.setup-grid {
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 24px;
  align-items: start;
}

.setup-step-list ol {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--ze-text-body);
  line-height: 1.7;
}

.manual-entry {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ze-text-label);
}

.secret-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.secret-code {
  flex: 1;
  display: inline-block;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
  background: var(--ze-bg-subtle);
  padding: 8px 10px;
  border: 1px solid var(--ze-border);
  border-radius: 4px;
  letter-spacing: 0.06em;
  color: var(--ze-text-strong);
  word-break: break-all;
}

.qr-card {
  background: #FFFFFF;
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-wrap :deep(svg) {
  width: 200px;
  height: 200px;
  display: block;
}

.confirm-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 280px;
}

.code-input {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 16px;
  letter-spacing: 0.25em;
  text-align: center;
  font-weight: 600;
}

.field-error {
  font-size: 12px;
  color: var(--ze-danger-fg);
}

.section-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* ─── Recovery code grid ─────────────────────────────────────────── */

.codes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.recovery-code {
  display: block;
  padding: 10px 12px;
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--ze-text-strong);
  text-align: center;
}

.action-row {
  display: flex;
  gap: 10px;
}

.dialog-desc {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0 0 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.w-full { width: 100%; }
:deep(.p-password) { display: block; width: 100%; }
:deep(.p-password .p-inputtext) { width: 100%; }

@media (max-width: 720px) {
  .setup-grid { grid-template-columns: 1fr; }
  .qr-card { justify-self: center; }
  .codes-grid { grid-template-columns: 1fr; }
}
</style>
