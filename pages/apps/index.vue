<template>
  <div class="apps-page">
    <!-- Header bar: logo left, user menu right (matches Moneroo's chrome) -->
    <header class="apps-topbar">
      <NuxtLink to="/apps" class="brand">
        <span class="brand-mark">Z</span>
        <span class="brand-name">zayono</span>
      </NuxtLink>
      <div class="topbar-actions">
        <LayoutLanguageSwitcher compact />
        <button class="user-trigger" :class="{ 'user-trigger--open': userOpen }" @click="userOpen = !userOpen">
          <span class="user-avatar">{{ userInitials }}</span>
          <AppIcon name="chevron-down" class="user-chevron" />
        </button>
        <div v-if="userOpen" class="user-menu" @click.stop>
          <div class="user-menu-head">
            <span class="user-menu-name">{{ auth.merchant?.name }}</span>
            <span class="user-menu-email">{{ auth.merchant?.email }}</span>
          </div>
          <button class="user-menu-item" @click="logout">
            <AppIcon name="sign-out" />
            <span>{{ $t('appsPage.logout') }}</span>
          </button>
        </div>
      </div>
    </header>

    <main class="apps-main">
      <!-- Welcome message — Moneroo style with waving emoji + 2 lines -->
      <section class="apps-welcome">
        <span class="apps-wave" aria-hidden="true">👋</span>
        <div>
          <h1 class="apps-greeting">
            {{ $t('appsPage.greeting', { name: auth.merchant?.name || $t('appsPage.fallbackMerchant') }) }}
          </h1>
          <p class="apps-subtitle">
            {{ $t('appsPage.subtitleLine') }}
          </p>
        </div>
      </section>

      <!-- Loading skeleton -->
      <div v-if="appStore.loading && !appStore.list.length" class="apps-loading">
        <ProgressSpinner style="width: 32px; height: 32px" />
      </div>

      <!-- Grid: applications + create card inline (Moneroo layout) -->
      <div v-else class="apps-grid">
        <button
          v-for="app in appStore.list"
          :key="app.id"
          type="button"
          class="app-card"
          :class="{ 'app-card--inactive': !app.is_active }"
          @click="selectApp(app.id)"
        >
          <div class="app-card-logo">
            <img v-if="app.icon" :src="app.icon" :alt="app.name" />
            <span v-else>{{ initialsFor(app.name) }}</span>
          </div>
          <span class="app-card-name">{{ app.name }}</span>
          <span v-if="!app.is_active" class="app-card-badge">{{ $t('appsPage.inactiveBadge') }}</span>
        </button>

        <!-- "Create new app" card sits in the grid itself, dashed border. -->
        <button type="button" class="app-card app-card--create" @click="openCreate">
          <div class="app-card-create-icon">
            <AppIcon name="plus-circle" />
          </div>
          <span class="app-card-create-text">{{ $t('appsPage.createNew') }}</span>
        </button>
      </div>
    </main>

    <!-- Create app dialog -->
    <Dialog
      v-model:visible="createOpen"
      modal
      :header="$t('appsPage.createModal')"
      :style="{ width: '480px' }"
      :draggable="false"
    >
      <form class="create-form" @submit.prevent="submitCreate">
        <div class="form-field">
          <label for="app-name">{{ $t('appsPage.formNameLabel') }} *</label>
          <InputText
            id="app-name"
            v-model="form.name"
            :placeholder="$t('appsPage.formNamePlaceholder')"
            :class="{ 'p-invalid': errors.name }"
            autofocus
          />
          <small v-if="errors.name" class="field-error">{{ errors.name }}</small>
        </div>
        <div class="form-field">
          <label for="app-desc">{{ $t('appsPage.formDescLabel') }}</label>
          <Textarea
            id="app-desc"
            v-model="form.description"
            rows="3"
            :placeholder="$t('appsPage.formDescPlaceholder')"
          />
        </div>
        <div v-if="globalError" class="form-error">{{ globalError }}</div>
        <div class="form-actions">
          <Button :label="$t('appsPage.cancel')" severity="secondary" text @click="createOpen = false" />
          <Button :label="$t('appsPage.createBtn')" type="submit" :loading="submitting" />
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
// Standalone page — no sidebar, no dashboard chrome. We disable Nuxt
// layouts entirely so the page can render its own topbar full-bleed,
// matching the Moneroo /apps shell.
definePageMeta({ layout: false })

// R2 audit BLOCKING regression: main.css moved out of global `css: []`
// (R1 Perf H1 fix). With `layout: false`, no parent layout imports
// main.css, so the `--ze-*` design tokens this page relies on are
// undefined. Importing here restores the token cascade without
// re-globalising the bundle.
import '~/assets/css/main.css'

// Apply the saved theme on this standalone page too (the layouts handle
// this normally, but with `layout: false` we have to do it ourselves).
useTheme()

const appStore = useApplicationStore()
const auth = useAuthStore()
const { t } = useI18n()

const createOpen = ref(false)
const submitting = ref(false)
const globalError = ref('')
const form = reactive({ name: '', description: '' })
const errors = reactive<Record<string, string>>({})

const userOpen = ref(false)

const userInitials = computed(() => {
  const name = auth.merchant?.name || auth.merchant?.email || '?'
  return name
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

onMounted(async () => {
  if (!appStore.list.length) {
    try {
      await appStore.fetch()
    } catch {
      // Empty state below covers the "couldn't fetch / no apps yet" case.
    }
  }
  document.addEventListener('click', closeUserMenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeUserMenu)
})

function closeUserMenu(e: MouseEvent) {
  if (!userOpen.value) return
  const target = e.target as HTMLElement
  if (target.closest('.topbar-actions')) return
  userOpen.value = false
}

function logout() {
  userOpen.value = false
  auth.logout()
}

const selectApp = (id: string) => {
  appStore.select(id)
  navigateTo('/dashboard')
}

const openCreate = () => {
  form.name = ''
  form.description = ''
  Object.keys(errors).forEach(k => delete errors[k])
  globalError.value = ''
  createOpen.value = true
}

const submitCreate = async () => {
  Object.keys(errors).forEach(k => delete errors[k])
  globalError.value = ''
  submitting.value = true
  try {
    await appStore.create({ name: form.name, description: form.description || undefined })
    createOpen.value = false
    navigateTo('/dashboard')
  } catch (e: any) {
    if (e?.data?.errors) {
      Object.keys(e.data.errors).forEach(key => {
        errors[key] = Array.isArray(e.data.errors[key]) ? e.data.errors[key][0] : e.data.errors[key]
      })
    } else {
      globalError.value = e?.data?.message || t('appsPage.createError')
    }
  } finally {
    submitting.value = false
  }
}

const initialsFor = (name: string): string => {
  return name
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
</script>

<style scoped>
/*
 * Layout mirrors Moneroo's /apps page:
 *   1. Slim white topbar with logo + avatar
 *   2. Centered max-width container
 *   3. Welcome line with hand-wave emoji
 *   4. Horizontal grid of app cards, "create new" inline as the last cell
 *
 * We override the `auth` layout's centered card by stretching this page
 * to full viewport via a single .apps-page wrapper.
 */
.apps-page {
  min-height: 100vh;
  background: var(--ze-bg-page, #f9fafb);
  display: flex;
  flex-direction: column;
}

/* ── Topbar ───────────────────────────────────────────── */
.apps-topbar {
  height: 64px;
  padding: 0 32px;
  background: var(--ze-bg-card, #fff);
  border-bottom: 1px solid var(--ze-border, #e5e7eb);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--ze-text-strong);
}

.brand-mark {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: linear-gradient(135deg, #fbbf24, #2563eb);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: -0.5px;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.topbar-actions {
  position: relative;
}

.user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid var(--ze-border);
  border-radius: 999px;
  padding: 3px 10px 3px 3px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.user-trigger:hover,
.user-trigger--open {
  background: var(--ze-bg-subtle);
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: var(--ze-text-strong);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.user-chevron {
  font-size: 10px;
  color: var(--ze-text-muted);
}

.user-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  padding: 4px;
  z-index: 50;
}

.user-menu-head {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-bottom: 1px solid var(--ze-border);
  margin-bottom: 4px;
}

.user-menu-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ze-text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu-email {
  font-size: 12px;
  color: var(--ze-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  background: none;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  color: var(--ze-text-body);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.user-menu-item:hover {
  background: var(--ze-bg-subtle);
}

.user-menu-item i {
  font-size: 12px;
  color: var(--ze-text-muted);
}

/* ── Main content ─────────────────────────────────────── */
.apps-main {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 32px;
}

.apps-welcome {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 32px;
}

.apps-wave {
  font-size: 22px;
  line-height: 1.3;
}

.apps-greeting {
  font-size: 15px;
  font-weight: 600;
  color: var(--ze-text-strong);
  margin: 0;
  line-height: 1.4;
}

.apps-subtitle {
  font-size: 12.5px;
  color: var(--ze-text-muted);
  margin: 2px 0 0;
  line-height: 1.5;
}

.apps-loading {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

/* ── Grid ─────────────────────────────────────────────── */
.apps-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.app-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
  min-height: 80px;
}

.app-card:hover {
  border-color: var(--ze-text-strong);
}

.app-card:active {
  transform: scale(0.99);
}

.app-card--inactive {
  opacity: 0.55;
}

.app-card-logo {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border-subtle, #f3f4f6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--ze-text-strong);
  overflow: hidden;
  flex-shrink: 0;
}

.app-card-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-card-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--ze-text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-card-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ze-text-muted);
  background: var(--ze-bg-subtle);
  padding: 2px 6px;
  border-radius: 4px;
}

/* "Create new app" card — dashed border, centered content. */
.app-card--create {
  border-style: dashed;
  border-color: var(--ze-border-strong, #d1d5db);
  background: transparent;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  gap: 6px;
  color: var(--ze-text-muted);
}

.app-card--create:hover {
  border-color: var(--ze-text-strong);
  background: var(--ze-bg-card);
  color: var(--ze-text-strong);
}

.app-card-create-icon i {
  font-size: 22px;
  color: var(--ze-text-muted);
}

.app-card--create:hover .app-card-create-icon i {
  color: var(--ze-text-strong);
}

.app-card-create-text {
  font-size: 12.5px;
  font-weight: 500;
}

/* ── Create dialog ────────────────────────────────────── */
.create-form {
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
  color: var(--ze-text-strong);
}

.field-error {
  font-size: 12px;
  color: var(--ze-danger-fg, #dc2626);
}

.form-error {
  font-size: 13px;
  color: var(--ze-text-body);
  background: var(--ze-bg-subtle);
  border: 1px solid var(--ze-border);
  border-left: 3px solid var(--ze-danger-fg, #dc2626);
  border-radius: 4px;
  padding: 10px 14px;
  line-height: 1.5;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

/* ── Responsive ───────────────────────────────────────── */
@media (max-width: 1024px) {
  .apps-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .apps-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .apps-topbar {
    padding: 0 16px;
  }
  .apps-main {
    padding: 24px 16px;
  }
}

@media (max-width: 480px) {
  .apps-grid {
    grid-template-columns: 1fr;
  }
}
</style>
