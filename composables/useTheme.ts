/**
 * Theme toggle composable.
 *
 * Toggles the `.dark-mode` class on <html> and persists the choice
 * in localStorage. PrimeVue Aura is configured with
 * `darkModeSelector: '.dark-mode'` (see nuxt.config.ts) so its
 * components follow along automatically.
 *
 * Usage:
 *   const { theme, isDark, toggle, setTheme } = useTheme()
 */

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'zayono_theme'
const DARK_CLASS = 'dark-mode'

const _theme = ref<ThemeMode>('light')
let _initialised = false

function apply(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle(DARK_CLASS, mode === 'dark')
}

function readStored(): ThemeMode | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw === 'dark' || raw === 'light' ? raw : null
  } catch {
    return null
  }
}

function persist(mode: ThemeMode) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}

function detectInitial(): ThemeMode {
  // Light is the product default. We honour ONLY an explicit user choice
  // (persisted via the toggle) and deliberately do NOT follow the OS
  // prefers-color-scheme, so the dashboard + auth pages open in light mode
  // for everyone who hasn't opted into dark.
  return readStored() ?? 'light'
}

function ensureInit() {
  if (_initialised) return
  _initialised = true
  _theme.value = detectInitial()
  apply(_theme.value)
}

export const useTheme = () => {
  ensureInit()

  const setTheme = (mode: ThemeMode) => {
    _theme.value = mode
    apply(mode)
    persist(mode)
  }

  const toggle = () => {
    setTheme(_theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: readonly(_theme),
    isDark: computed(() => _theme.value === 'dark'),
    setTheme,
    toggle,
  }
}
