<template>
  <div>
    <div class="auth-top">
      <h2 class="auth-title">{{ $t('auth.register.title') }}</h2>
      <LayoutLanguageSwitcher compact />
    </div>

    <form @submit.prevent="handleRegister" class="auth-form">
      <div class="form-field">
        <label for="name">{{ $t('auth.register.nameLabel') }}</label>
        <InputText
          id="name"
          v-model="form.name"
          :placeholder="$t('auth.register.nameLabel')"
          class="w-full"
          :class="{ 'p-invalid': fieldErrors.name }"
        />
        <small class="field-hint">{{ $t('auth.register.nameHint') }}</small>
        <small v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name }}</small>
      </div>

      <div class="form-field">
        <label for="email">{{ $t('auth.register.emailLabel') }}</label>
        <InputText
          id="email"
          v-model="form.email"
          type="email"
          :placeholder="$t('auth.login.emailPlaceholder')"
          class="w-full"
          :class="{ 'p-invalid': fieldErrors.email }"
        />
        <small v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</small>
      </div>

      <div class="form-field">
        <label for="password">{{ $t('auth.register.passwordLabel') }}</label>
        <Password
          id="password"
          v-model="form.password"
          :feedback="true"
          toggle-mask
          placeholder="••••••••"
          class="w-full auth-password"
          input-class="w-full"
          :class="{ 'p-invalid': fieldErrors.password }"
        />
        <small class="field-hint">{{ $t('auth.register.passwordHint') }}</small>
        <small v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</small>
      </div>

      <div class="form-field">
        <label for="password_confirmation">{{ $t('auth.register.passwordConfirmLabel') }}</label>
        <Password
          id="password_confirmation"
          v-model="form.password_confirmation"
          :feedback="false"
          toggle-mask
          placeholder="••••••••"
          class="w-full auth-password"
          input-class="w-full"
          :class="{ 'p-invalid': fieldErrors.password_confirmation }"
        />
        <small v-if="fieldErrors.password_confirmation" class="field-error">{{ fieldErrors.password_confirmation }}</small>
      </div>

      <div class="form-field terms-field">
        <label class="terms-label">
          <input type="checkbox" v-model="form.terms_accepted" class="terms-checkbox" />
          <span>
            {{ $t('auth.register.termsPrefix') }}
            <a href="https://zayono.com/cgu" target="_blank" rel="noopener">{{ $t('auth.register.termsLink') }}</a>
            {{ $t('auth.register.termsAnd') }}
            <a href="https://zayono.com/confidentialite" target="_blank" rel="noopener">{{ $t('auth.register.privacyLink') }}</a>.
          </span>
        </label>
        <small v-if="fieldErrors.terms_accepted" class="field-error">{{ fieldErrors.terms_accepted }}</small>
      </div>

      <div v-if="globalError" class="form-error">{{ globalError }}</div>

      <Button type="submit" :label="$t('auth.register.submitButton')" :loading="loading" class="w-full" />
    </form>

    <p class="auth-footer">
      {{ $t('auth.register.hasAccount') }} <NuxtLink to="/auth/login">{{ $t('auth.register.signIn') }}</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const { register, loading } = useAuth()
const globalError = ref('')
const fieldErrors = reactive<Record<string, string>>({})

const form = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  terms_accepted: false,
})

const clearErrors = () => {
  globalError.value = ''
  Object.keys(fieldErrors).forEach(key => delete fieldErrors[key])
}

const handleRegister = async () => {
  clearErrors()
  // Client-side guard so the user gets immediate feedback before the
  // server's `accepted` validation kicks in.
  if (!form.terms_accepted) {
    fieldErrors.terms_accepted = t('auth.register.termsRequired')
    return
  }
  try {
    await register(form)
    // Fresh accounts always get one default application created server-side,
    // so the application store will have exactly one entry and currentId
    // will be auto-selected. Dashboard is the right landing.
    const appStore = useApplicationStore()
    if (appStore.currentId) {
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
      globalError.value = e?.data?.message || t('auth.register.genericError')
    }
  }
}
</script>

<style scoped>
/*
 * Same dark-mode fix as login.vue — switch every colour to the
 * mode-aware `--ze-*` token family. The previous `--neutral-*` and
 * `--primary-*` tokens come from PrimeVue's Aura preset and only swap
 * partially under `.dark-mode`, leaving the title and the "Se connecter"
 * link near-invisible against the dark surface.
 */
.auth-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 24px;
}

.auth-title {
  font-size: 20px;
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

.field-hint {
  font-size: 11px;
  color: var(--ze-text-muted);
  line-height: 1.4;
}

.field-error {
  font-size: 12px;
  color: var(--ze-danger-fg);
}

.terms-field {
  gap: 4px;
}

.terms-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  font-weight: 400;
  color: var(--ze-text-muted);
  line-height: 1.5;
  cursor: pointer;
}

.terms-checkbox {
  margin-top: 2px;
  flex-shrink: 0;
  cursor: pointer;
}

.terms-label a {
  color: var(--ze-brand);
  text-decoration: none;
}

.terms-label a:hover {
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

/* Force the PrimeVue <Password> wrapper to span full width — by default
   `.p-password` is `display: inline-flex` so .w-full on the outer node has
   no effect and the field appears narrower than InputText. */
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
