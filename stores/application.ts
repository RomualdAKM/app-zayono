import { defineStore } from 'pinia'

export interface Application {
  id: string
  name: string
  description: string | null
  is_active: boolean
  icon: string | null
  created_at: string | null
}

interface ApplicationState {
  list: Application[]
  currentId: string | null
  loading: boolean
}

const CURRENT_ID_KEY = 'zayono_application_id'

const readInitialId = (): string | null => {
  if (typeof window === 'undefined') return null
  return window.localStorage?.getItem(CURRENT_ID_KEY) || null
}

export const useApplicationStore = defineStore('application', {
  state: (): ApplicationState => ({
    list: [],
    currentId: readInitialId(),
    loading: false,
  }),

  getters: {
    current(state): Application | null {
      if (!state.currentId) return null
      return state.list.find(a => a.id === state.currentId) || null
    },
    hasApps(state): boolean {
      return state.list.length > 0
    },
  },

  actions: {
    setList(apps: Application[]) {
      this.list = apps

      // If the stored currentId no longer matches any owned app
      // (deleted elsewhere, signed in as a different merchant…),
      // fall back to the first one or clear the selection.
      if (this.currentId && !apps.some(a => a.id === this.currentId)) {
        this.currentId = null
        this.persistCurrent()
      }

      // Auto-select when there's only one app — the most common case for
      // a freshly-signed-up merchant after the default app is created.
      if (!this.currentId && apps.length === 1) {
        this.select(apps[0].id)
      }
    },

    select(id: string) {
      this.currentId = id
      this.persistCurrent()
    },

    clear() {
      this.currentId = null
      this.list = []
      this.persistCurrent()
    },

    async fetch() {
      this.loading = true
      try {
        const { apiFetch } = useApi()
        const response = await apiFetch<{ success: boolean; data: Application[] }>('/merchant/applications')
        this.setList(response.data || [])
        return response.data
      } finally {
        this.loading = false
      }
    },

    async create(payload: { name: string; description?: string }) {
      const { apiFetch } = useApi()
      const response = await apiFetch<{ success: boolean; data: Application }>('/merchant/applications', {
        method: 'POST',
        body: payload,
      })
      const app = response.data
      this.list = [...this.list, app]
      this.select(app.id)
      return app
    },

    async update(id: string, payload: { name?: string; description?: string; is_active?: boolean }) {
      const { apiFetch } = useApi()
      const response = await apiFetch<{ success: boolean; data: Application }>(`/merchant/applications/${id}`, {
        method: 'PUT',
        body: payload,
      })
      const updated = response.data
      this.list = this.list.map(a => (a.id === id ? updated : a))
      return updated
    },

    async destroy(id: string) {
      const { apiFetch } = useApi()
      await apiFetch(`/merchant/applications/${id}`, { method: 'DELETE' })
      this.list = this.list.filter(a => a.id !== id)
      if (this.currentId === id) {
        this.currentId = this.list[0]?.id ?? null
        this.persistCurrent()
      }
    },

    persistCurrent() {
      if (typeof window === 'undefined') return
      if (this.currentId) {
        window.localStorage?.setItem(CURRENT_ID_KEY, this.currentId)
      } else {
        window.localStorage?.removeItem(CURRENT_ID_KEY)
      }
    },
  },
})
