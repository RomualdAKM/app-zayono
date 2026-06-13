<template>
  <div class="verify-wrap">
    <!-- Verifying — the signed backend URL is being called via fetch -->
    <div v-if="view === 'verifying'" class="verify-block">
      <i class="pi pi-spin pi-spinner verify-spinner" aria-hidden="true"></i>
      <p class="verify-text">{{ $t('auth.verifyEmail.verifying') }}</p>
    </div>

    <!-- Verified (or already verified) -->
    <div v-else-if="view === 'success'" class="verify-block">
      <div class="verify-icon verify-ok"><i class="pi pi-check" aria-hidden="true"></i></div>
      <h2 class="verify-title">{{ $t('auth.verifyEmail.successTitle') }}</h2>
      <p class="verify-text">{{ $t('auth.verifyEmail.successMessage') }}</p>
      <NuxtLink :to="ctaTo" class="verify-cta">{{ $t(ctaLabel) }}</NuxtLink>
    </div>

    <!-- Pending — gated unverified merchant: check inbox + resend -->
    <div v-else-if="view === 'pending'" class="verify-block">
      <div class="verify-icon verify-info"><i class="pi pi-envelope" aria-hidden="true"></i></div>
      <h2 class="verify-title">{{ $t('auth.verifyEmail.checkInboxTitle') }}</h2>
      <p class="verify-text">
        {{ $t('auth.verifyEmail.checkInboxMessage') }}
        <strong v-if="merchant?.email" class="verify-email">{{ merchant.email }}</strong>
      </p>
      <button
        v-if="isAuthenticated"
        type="button"
        class="verify-cta"
        :disabled="resendState === 'sending'"
        @click="onResend"
      >
        {{ resendState === 'sending' ? $t('auth.verifyEmail.resending') : $t('auth.verifyEmail.resendButton') }}
      </button>
      <NuxtLink v-else to="/auth/login" class="verify-cta">{{ $t('auth.verifyEmail.goToLogin') }}</NuxtLink>
      <p v-if="resendState === 'sent'" class="verify-note verify-note-ok">{{ $t('auth.verifyEmail.resendSent') }}</p>
      <p v-if="resendState === 'error'" class="verify-note verify-note-err">{{ $t('auth.verifyEmail.resendError') }}</p>
      <button v-if="isAuthenticated" type="button" class="verify-link" @click="logout">
        {{ $t('auth.verifyEmail.signOut') }}
      </button>
    </div>

    <!-- Invalid / expired link -->
    <div v-else class="verify-block">
      <div class="verify-icon verify-err"><i class="pi pi-times" aria-hidden="true"></i></div>
      <h2 class="verify-title">{{ $t('auth.verifyEmail.errorTitle') }}</h2>
      <p class="verify-text">{{ $t('auth.verifyEmail.errorMessage') }}</p>
      <button
        v-if="isAuthenticated"
        type="button"
        class="verify-cta"
        :disabled="resendState === 'sending'"
        @click="onResend"
      >
        {{ resendState === 'sending' ? $t('auth.verifyEmail.resending') : $t('auth.verifyEmail.resendButton') }}
      </button>
      <NuxtLink v-else to="/auth/login" class="verify-cta">{{ $t('auth.verifyEmail.goToLogin') }}</NuxtLink>
      <p v-if="resendState === 'sent'" class="verify-note verify-note-ok">{{ $t('auth.verifyEmail.resendSent') }}</p>
      <p v-if="resendState === 'error'" class="verify-note verify-note-err">{{ $t('auth.verifyEmail.resendError') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const { isAuthenticated, merchant, resendVerification, refreshUser, logout } = useAuth()

type View = 'verifying' | 'success' | 'pending' | 'error'
const view = ref<View>('pending')
const resendState = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')

// Authenticated merchants go to the dashboard; otherwise to login.
const ctaTo = computed(() => (isAuthenticated.value ? '/dashboard' : '/auth/login'))
const ctaLabel = computed(() =>
  isAuthenticated.value ? 'auth.verifyEmail.goToDashboard' : 'auth.verifyEmail.goToLogin')

const onResend = async () => {
  if (resendState.value === 'sending') return
  resendState.value = 'sending'
  try {
    await resendVerification()
    resendState.value = 'sent'
  } catch {
    resendState.value = 'error'
  }
}

onMounted(async () => {
  // Hydrate the merchant (and their email) for the pending state when the
  // page is opened directly with a live session but a cold store.
  if (isAuthenticated.value && !merchant.value) {
    try { await refreshUser() } catch { /* ignore */ }
  }

  const verifyUrl = route.query.verify ? String(route.query.verify) : ''
  const status = route.query.status ? String(route.query.status) : ''

  // Path A — the email link carries the signed backend URL. We call it via
  // fetch (an XHR, not a top-level navigation), so the backend host never
  // appears in the address bar and a Safe-Browsing flag on it can't block
  // verification.
  if (verifyUrl) {
    view.value = 'verifying'
    try {
      const res = await $fetch<{ status?: string }>(verifyUrl, {
        headers: { Accept: 'application/json' },
      })
      view.value = res?.status === 'success' || res?.status === 'already' ? 'success' : 'error'
    } catch {
      view.value = 'error'
    }
    // Flip the local session to verified so the gate opens immediately.
    if (view.value === 'success' && isAuthenticated.value) {
      try { await refreshUser() } catch { /* ignore */ }
    }
    return
  }

  // Path B — backward compatibility with the old backend redirect (?status=).
  if (status) {
    view.value = status === 'success' || status === 'already' ? 'success' : 'error'
    if (view.value === 'success' && isAuthenticated.value) {
      try { await refreshUser() } catch { /* ignore */ }
    }
    return
  }

  // Path C — no params: the verification gate sent an unverified merchant
  // here. If they are in fact already verified, move them along.
  if (isAuthenticated.value && merchant.value?.email_verified) {
    view.value = 'success'
    return
  }
  view.value = 'pending'
})
</script>

<style scoped>
.verify-wrap {
  text-align: center;
  padding: 16px 0;
}
.verify-block {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.verify-spinner {
  font-size: 28px;
  color: var(--ze-brand);
  margin-bottom: 16px;
}
.verify-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 16px;
}
.verify-ok {
  background: #f0fdf4;
  color: #16a34a;
}
.verify-err {
  background: #fef2f2;
  color: #dc2626;
}
.verify-info {
  background: #eff6ff;
  color: #2563eb;
}
.verify-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0 0 8px;
}
.verify-text {
  font-size: 13px;
  color: var(--ze-text-muted);
  line-height: 1.6;
  margin: 0 0 20px;
}
.verify-email {
  display: block;
  margin-top: 4px;
  color: var(--ze-text-strong);
}
.verify-cta {
  background: var(--ze-brand);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
.verify-cta:hover {
  filter: brightness(1.05);
}
.verify-cta:disabled {
  opacity: 0.6;
  cursor: default;
}
.verify-note {
  font-size: 12px;
  margin: 12px 0 0;
}
.verify-note-ok {
  color: #16a34a;
}
.verify-note-err {
  color: #dc2626;
}
.verify-link {
  background: none;
  border: none;
  color: var(--ze-text-muted);
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
  margin-top: 16px;
}
.verify-link:hover {
  color: var(--ze-text-strong);
}
</style>
