<template>
  <div>
    <div class="auth-top">
      <h2 class="auth-title">{{ $t('auth.forgotPassword.title') }}</h2>
      <LayoutLanguageSwitcher compact />
    </div>

    <p class="auth-subtitle">{{ $t('auth.forgotPassword.subtitle') }}</p>

    <div v-if="sent" class="auth-success" role="status">
      {{ $t('auth.forgotPassword.sent') }}
    </div>

    <form v-else @submit.prevent="handleSubmit" class="auth-form">
      <div class="form-field">
        <label for="email">{{ $t('auth.forgotPassword.emailLabel') }}</label>
        <InputText id="email" v-model="email" type="email" :placeholder="$t('auth.login.emailPlaceholder')" class="w-full" :class="{ 'p-invalid': fieldError }" />
        <small v-if="fieldError" class="field-error" role="alert">{{ fieldError }}</small>
      </div>
      <Button type="submit" :label="$t('auth.forgotPassword.submit')" :loading="loading" class="w-full" />
    </form>

    <p class="auth-footer">
      <NuxtLink to="/auth/login">{{ $t('auth.forgotPassword.backToLogin') }}</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { forgotPassword } = useAuth()
const email = ref('')
const loading = ref(false)
const sent = ref(false)
const fieldError = ref('')

const handleSubmit = async () => {
  fieldError.value = ''
  loading.value = true
  try {
    await forgotPassword(email.value)
    // The backend always returns the same generic 200 (no account
    // enumeration), so success here just means "request accepted".
    sent.value = true
  } catch (e: any) {
    fieldError.value = e?.data?.errors?.email?.[0]
      ?? e?.data?.message
      ?? 'Une erreur est survenue. Réessayez.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 12px;
}
.auth-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0;
}
.auth-subtitle {
  font-size: 13px;
  color: var(--ze-text-muted);
  line-height: 1.5;
  margin: 0 0 20px;
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
.auth-success {
  font-size: 13px;
  color: var(--ze-text-body);
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-left: 3px solid var(--ze-success-fg, #16a34a);
  border-radius: 4px;
  padding: 12px 14px;
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
</style>
