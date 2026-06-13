<template>
  <div>
    <div class="auth-top">
      <h2 class="auth-title">{{ $t('auth.resetPassword.title') }}</h2>
      <LayoutLanguageSwitcher compact />
    </div>

    <div v-if="done" class="auth-success" role="status">
      {{ $t('auth.resetPassword.success') }}
      <NuxtLink to="/auth/login" class="inline-link">{{ $t('auth.resetPassword.backToLogin') }}</NuxtLink>
    </div>

    <template v-else>
      <p class="auth-subtitle">{{ $t('auth.resetPassword.subtitle') }}</p>
      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-field">
          <label for="password">{{ $t('auth.resetPassword.passwordLabel') }}</label>
          <Password id="password" v-model="password" :feedback="true" toggle-mask placeholder="••••••••" class="w-full" input-class="w-full" :class="{ 'p-invalid': fieldErrors.password }" />
          <small class="field-hint">{{ $t('auth.resetPassword.passwordHint') }}</small>
          <small v-if="fieldErrors.password" class="field-error" role="alert">{{ fieldErrors.password }}</small>
        </div>
        <div class="form-field">
          <label for="password_confirmation">{{ $t('auth.resetPassword.confirmLabel') }}</label>
          <Password id="password_confirmation" v-model="passwordConfirmation" :feedback="false" toggle-mask placeholder="••••••••" class="w-full" input-class="w-full" />
        </div>
        <div v-if="globalError" class="form-error" role="alert">{{ globalError }}</div>
        <Button type="submit" :label="$t('auth.resetPassword.submit')" :loading="loading" class="w-full" />
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const route = useRoute()
const { resetPassword } = useAuth()

// The reset link carries the Laravel token + email as query params.
const token = (route.query.token as string) || ''
const email = (route.query.email as string) || ''

const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const done = ref(false)
const globalError = ref('')
const fieldErrors = reactive<Record<string, string>>({})

const handleSubmit = async () => {
  globalError.value = ''
  Object.keys(fieldErrors).forEach(k => delete fieldErrors[k])
  loading.value = true
  try {
    await resetPassword({
      token,
      email,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })
    done.value = true
  } catch (e: any) {
    if (e?.data?.errors) {
      Object.keys(e.data.errors).forEach(key => {
        fieldErrors[key] = Array.isArray(e.data.errors[key]) ? e.data.errors[key][0] : e.data.errors[key]
      })
    } else {
      globalError.value = e?.data?.message || t('auth.resetPassword.invalidLink')
    }
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
.field-hint {
  font-size: 11px;
  color: var(--ze-text-muted);
  line-height: 1.4;
}
.field-error {
  font-size: 12px;
  color: var(--ze-danger-fg);
}
.form-error {
  font-size: 13px;
  color: var(--ze-text-body);
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-left: 3px solid var(--ze-danger-fg);
  border-radius: 4px;
  padding: 10px 14px;
  line-height: 1.5;
}
.auth-success {
  font-size: 13px;
  color: var(--ze-text-body);
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-left: 3px solid var(--ze-success-fg, #16a34a);
  border-radius: 4px;
  padding: 12px 14px;
  line-height: 1.6;
}
.inline-link {
  display: inline-block;
  margin-top: 8px;
  color: var(--ze-brand);
  font-weight: 500;
  text-decoration: none;
}
.inline-link:hover {
  text-decoration: underline;
}
.w-full {
  width: 100%;
}
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
