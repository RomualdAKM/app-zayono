<template>
  <div class="err-page">
    <div class="err-card">
      <img src="/logo.gif" alt="Zayono" class="err-logo" />
      <p class="err-code">{{ error?.statusCode || 500 }}</p>
      <h1 class="err-title">{{ title }}</h1>
      <p class="err-message">{{ message }}</p>
      <button type="button" class="err-cta" @click="goHome">
        {{ t('errorPage.cta') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()

const isNotFound = computed(() => props.error?.statusCode === 404)
const title = computed(() =>
  isNotFound.value ? t('errorPage.notFoundTitle') : t('errorPage.genericTitle'))
const message = computed(() =>
  isNotFound.value ? t('errorPage.notFoundMessage') : t('errorPage.genericMessage'))

// clearError tears down the error state then navigates. Send merchants back
// to the dashboard, anonymous visitors to login.
function goHome() {
  clearError({ redirect: '/dashboard' })
}
</script>

<style scoped>
.err-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  padding: 24px;
}

.err-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 40px 32px;
  max-width: 420px;
  width: 100%;
  text-align: center;
}

.err-logo {
  height: 32px;
  width: auto;
  margin-bottom: 24px;
}

.err-code {
  font-size: 48px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
  line-height: 1;
}

.err-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 16px 0 8px;
}

.err-message {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
  margin: 0 0 24px;
}

.err-cta {
  background: #1a1a2e;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 11px 22px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.err-cta:hover {
  background: #2d2d4a;
}
</style>
