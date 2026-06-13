<template>
  <div>
    <div class="auth-top">
      <h2 class="auth-title">{{ $t('auth.login.title') }}</h2>
      <LayoutLanguageSwitcher compact />
    </div>
    <form @submit.prevent="handleLogin" class="auth-form">
      <div class="form-field">
        <label for="email">{{ $t('auth.login.emailLabel') }}</label>
        <InputText id="email" v-model="email" type="email" :placeholder="$t('auth.login.emailPlaceholder')" class="w-full" :class="{ 'p-invalid': fieldErrors.email }" />
        <small v-if="fieldErrors.email" class="field-error" role="alert">{{ fieldErrors.email }}</small>
      </div>
      <div class="form-field">
        <label for="password">{{ $t('auth.login.passwordLabel') }}</label>
        <Password id="password" v-model="password" :feedback="false" toggle-mask placeholder="••••••••" class="w-full auth-password" input-class="w-full" :class="{ 'p-invalid': fieldErrors.password }" />
        <small v-if="fieldErrors.password" class="field-error" role="alert">{{ fieldErrors.password }}</small>
        <NuxtLink to="/auth/forgot-password" class="forgot-link">{{ $t('auth.login.forgotPassword') }}</NuxtLink>
      </div>
      <div v-if="globalError" class="form-error" role="alert">{{ globalError }}</div>
      <Button type="submit" :label="$t('auth.login.submitButton')" :loading="loading" class="w-full" />
    </form>
    <p class="auth-footer">
      {{ $t('auth.login.noAccount') }} <NuxtLink to="/auth/register">{{ $t('auth.login.signUp') }}</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const { login, loading } = useAuth()
const email = ref('')
const password = ref('')
const globalError = ref('')
const fieldErrors = reactive<Record<string, string>>({})

const clearErrors = () => {
  globalError.value = ''
  Object.keys(fieldErrors).forEach(key => delete fieldErrors[key])
}

const handleLogin = async () => {
  clearErrors()
  try {
    const result = await login(email.value, password.value)
    // The auth store returns the raw response. If the server sent back a
    // 2FA challenge instead of a token, route to the challenge screen
    // and let the user enter their code there. The challenge token is
    // already stashed in sessionStorage by the store.
    if ((result as any)?.requires_2fa) {
      navigateTo('/auth/two-factor')
      return
    }
    // Decide where to send the user based on how many apps they own.
    // - 0 apps  → /apps (forces "create your first app" CTA)
    // - 1 app   → auto-select happened in the auth store → /dashboard
    // - 2+ apps → /apps grid (Moneroo-style picker)
    const appStore = useApplicationStore()
    if (appStore.list.length === 0) {
      navigateTo('/apps')
    } else if (appStore.currentId) {
      navigateTo('/dashboard')
    } else {
      navigateTo('/apps')
    }
  } catch (e: any) {
    if (e?.data?.errors) {
      const errors = e.data.errors
      Object.keys(errors).forEach(key => {
        fieldErrors[key] = Array.isArray(errors[key]) ? errors[key][0] : errors[key]
      })
    } else {
      globalError.value = e?.data?.message || t('auth.login.invalidCredentials')
    }
  }
}
</script>

<style scoped>
/*
 * All colours below use CSS variables (`--ze-*`) so they swap automatically
 * under `.dark-mode`. The previous hardcoded values (#111827, #1a1a2e,
 * #374151, #6b7280) rendered as near-black on the dark surface, making
 * the title and the "S'inscrire" link invisible.
 */
.auth-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 24px;
}

.auth-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ze-text-label);
}

.field-error {
  font-size: 12px;
  color: var(--ze-danger-fg);
}

.forgot-link {
  align-self: flex-end;
  font-size: 12px;
  color: var(--ze-brand);
  text-decoration: none;
  margin-top: 2px;
}

.forgot-link:hover {
  text-decoration: underline;
}

.form-error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: var(--ze-text-body);
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-left: 3px solid var(--ze-danger-fg);
  border-radius: 4px;
  padding: 10px 14px;
  line-height: 1.5;
}

.auth-footer {
  text-align: center;
  font-size: 13px;
  color: var(--ze-text-muted);
  margin-top: 20px;
}

.auth-footer a {
  color: var(--ze-brand);
  font-weight: 500;
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}

.w-full {
  width: 100%;
}

/* Same fix as register.vue: PrimeVue <Password> wrapper defaults to
   inline-flex, which makes the field shrink-to-fit. Force block + 100%. */
:deep(.p-password) {
  display: block;
  width: 100%;
}
:deep(.p-password > input),
:deep(.p-password .p-password-input),
:deep(.p-password .p-inputtext) {
  width: 100%;
}
</style>
