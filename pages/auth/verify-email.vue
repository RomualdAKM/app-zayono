<template>
  <div class="verify-wrap">
    <div v-if="state === 'success'" class="verify-block">
      <div class="verify-icon verify-ok"><i class="pi pi-check" aria-hidden="true"></i></div>
      <h2 class="verify-title">{{ $t('auth.verifyEmail.successTitle') }}</h2>
      <p class="verify-text">{{ $t('auth.verifyEmail.successMessage') }}</p>
      <NuxtLink :to="ctaTo" class="verify-cta">{{ $t(ctaLabel) }}</NuxtLink>
    </div>

    <div v-else class="verify-block">
      <div class="verify-icon verify-err"><i class="pi pi-times" aria-hidden="true"></i></div>
      <h2 class="verify-title">{{ $t('auth.verifyEmail.errorTitle') }}</h2>
      <p class="verify-text">{{ $t('auth.verifyEmail.errorMessage') }}</p>
      <NuxtLink to="/auth/login" class="verify-cta">{{ $t('auth.verifyEmail.goToLogin') }}</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const { isAuthenticated } = useAuth()

// The backend (after validating the signed link) redirects here with
// ?status=success|already|error. This page is purely a status display —
// the verification itself happened server-side on the signed GET.
const status = computed(() => String(route.query.status || 'error'))
const state = computed<'success' | 'error'>(() =>
  status.value === 'success' || status.value === 'already' ? 'success' : 'error')

// Authenticated merchants go to the dashboard; otherwise to login.
const ctaTo = computed(() => (isAuthenticated.value ? '/dashboard' : '/auth/login'))
const ctaLabel = computed(() =>
  isAuthenticated.value ? 'auth.verifyEmail.goToDashboard' : 'auth.verifyEmail.goToLogin')
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
.verify-cta {
  background: var(--ze-brand);
  color: #fff;
  border-radius: 6px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}
.verify-cta:hover {
  filter: brightness(1.05);
}
</style>
