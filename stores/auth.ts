import { defineStore } from 'pinia'
import type { Application } from './application'

interface Merchant {
  id: string
  name: string
  email: string
  company_name: string
  phone: string | null
  country: string | null
  is_active: boolean
  zayono_fee_percent: string
  // Whether the merchant has verified their email. Present on the
  // login / register / /auth/me payloads. The route middleware gates the
  // dashboard on this (unverified → /auth/verify-email).
  email_verified?: boolean
}

interface AuthState {
  merchant: Merchant | null
  token: string | null
  roles: string[]
  isAuthenticated: boolean
  loading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => {
    // BUG FIX 2026-05-22 — `isAuthenticated` used to start `false`
    // on every Pinia re-init (page reload, manual URL entry, hard
    // refresh). The token was correctly read from localStorage, but
    // the middleware checked `isAuthenticated` and bounced the user
    // to /auth/login. Derive the boolean from the token's presence
    // so a returning visitor stays "authenticated" until /auth/me
    // proves otherwise.
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return {
      merchant: null,
      token,
      roles: [],
      isAuthenticated: !!token,
      loading: false,
    };
  },

  actions: {
    async login(email: string, password: string) {
      this.loading = true
      try {
        const config = useRuntimeConfig()
        const data = await $fetch<
          // Two possible response shapes from /auth/login: either the
          // standard success (token + merchant + apps) OR a 2FA challenge
          // payload (requires_2fa + signed token). The frontend branches
          // on `requires_2fa` to decide where to navigate.
          | { token: string; merchant: Merchant; applications: Application[] }
          | { requires_2fa: true; two_factor_token: string; partial_merchant: { name: string } }
        >(
          '/auth/login',
          {
            baseURL: config.public.apiBase,
            method: 'POST',
            body: { email, password },
          },
        )

        if ('requires_2fa' in data && data.requires_2fa) {
          // Stash the challenge token in sessionStorage (cleared on tab
          // close; safer than localStorage for a 5-min single-use token).
          // The challenge page reads it and POSTs to /auth/2fa/challenge.
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('two_factor_token', data.two_factor_token)
            sessionStorage.setItem('two_factor_name', data.partial_merchant?.name || '')
          }
          // Keep `isAuthenticated` false — the merchant doesn't have a
          // token yet. The login page handles navigation to /auth/two-factor.
          this.isAuthenticated = false
          return data
        }

        // Standard path — token issued, finalize the session. The `'token'
        // in data` guard narrows the login-response union to the
        // non-2FA branch for these property accesses.
        if ('token' in data) {
          this.token = data.token
          this.merchant = data.merchant
          this.isAuthenticated = true
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', data.token)
          }
          const appStore = useApplicationStore()
          appStore.setList(data.applications || [])
        }
        return data
      } catch (error: any) {
        this.isAuthenticated = false
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Second step when 2FA is enabled. Called from /auth/two-factor.
     * Exchanges (challenge token + code) for a real Sanctum token using
     * the same response shape as a normal login.
     */
    async verifyTwoFactor(code: string) {
      this.loading = true
      try {
        const config = useRuntimeConfig()
        const token =
          typeof window !== 'undefined' ? sessionStorage.getItem('two_factor_token') : null
        if (!token) {
          throw new Error('Missing challenge token. Please log in again.')
        }
        const data = await $fetch<{ token: string; merchant: Merchant; applications: Application[] }>(
          '/auth/2fa/challenge',
          {
            baseURL: config.public.apiBase,
            method: 'POST',
            body: { two_factor_token: token, code },
          },
        )
        this.token = data.token
        this.merchant = data.merchant
        this.isAuthenticated = true
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', data.token)
          sessionStorage.removeItem('two_factor_token')
          sessionStorage.removeItem('two_factor_name')
        }
        const appStore = useApplicationStore()
        appStore.setList(data.applications || [])
        return data
      } finally {
        this.loading = false
      }
    },

    async register(payload: {
      name: string
      email: string
      password: string
      password_confirmation: string
      company_name?: string
      phone?: string
      country?: string
      terms_accepted: boolean
    }) {
      this.loading = true
      try {
        const config = useRuntimeConfig()
        const data = await $fetch<{ token: string; merchant: Merchant; applications: Application[] }>(
          '/auth/register',
          {
            baseURL: config.public.apiBase,
            method: 'POST',
            body: payload,
          },
        )
        this.token = data.token
        this.merchant = data.merchant
        this.isAuthenticated = true
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', data.token)
        }
        // A fresh merchant always has one default application — auto-select
        // it so the welcome flow lands on a usable dashboard.
        const appStore = useApplicationStore()
        appStore.setList(data.applications || [])
        return data
      } catch (error: any) {
        throw error
      } finally {
        this.loading = false
      }
    },

    async logout() {
      // Best-effort server-side revoke; never let it block the client-side cleanup
      if (this.token) {
        try {
          const config = useRuntimeConfig()
          await $fetch('/auth/logout', {
            baseURL: config.public.apiBase,
            method: 'POST',
            headers: { Authorization: `Bearer ${this.token}` },
          })
        } catch {
          // Token may already be invalid; ignore
        }
      }
      this.token = null
      this.merchant = null
      this.roles = []
      this.isAuthenticated = false
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
      }
      // Wipe the cached application context too — the next signed-in user
      // would otherwise inherit our stale id.
      const appStore = useApplicationStore()
      appStore.clear()
      navigateTo('/auth/login')
    },

    async fetchProfile() {
      if (!this.token) return
      try {
        const config = useRuntimeConfig()
        const response = await $fetch<{ success: boolean; data: { merchant: Merchant; roles: string[] } }>('/auth/me', {
          baseURL: config.public.apiBase,
          headers: { Authorization: `Bearer ${this.token}` },
        })
        this.merchant = response.data.merchant
        this.roles = response.data.roles || []
        this.isAuthenticated = true
      } catch {
        this.token = null
        this.merchant = null
        this.roles = []
        this.isAuthenticated = false
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
        }
      }
    },

    async init() {
      if (this.token) {
        await this.fetchProfile()
        // Reload the application list on every cold start — the cached
        // currentId may point at a deleted app, and the list itself may
        // have changed since the last session.
        if (this.isAuthenticated) {
          try {
            const appStore = useApplicationStore()
            await appStore.fetch()
          } catch {
            // If the apps endpoint fails the user will be bounced to /apps
            // by the route middleware below.
          }
        }
      }
    },
  },
})
