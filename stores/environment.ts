import { defineStore } from 'pinia'

type Env = 'sandbox' | 'live'

const STORAGE_KEY = 'zayono_environment'

const readInitial = (): Env => {
  if (typeof window === 'undefined') return 'sandbox'
  const stored = window.localStorage?.getItem(STORAGE_KEY)
  return stored === 'live' ? 'live' : 'sandbox'
}

export const useEnvironmentStore = defineStore('environment', {
  state: () => ({
    current: readInitial() as Env,
  }),
  actions: {
    toggle() {
      this.set(this.current === 'sandbox' ? 'live' : 'sandbox')
    },
    set(env: Env) {
      this.current = env
      if (typeof window !== 'undefined') {
        window.localStorage?.setItem(STORAGE_KEY, env)
      }
    },
  },
})
