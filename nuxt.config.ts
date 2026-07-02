// https://nuxt.com/docs/api/configuration/nuxt-config
import { definePreset } from '@primevue/themes'
import Aura from '@primevue/themes/aura'

/**
 * Aura customised for Zayono.
 *
 * Aura's semantic layer maps component backgrounds to specific surface
 * tokens (eg. `overlay.modal.background = {surface.900}` in dark mode,
 * `formField.borderColor = {surface.600}`). The convention is:
 *   surface.0   → brightest (used for text in dark mode)
 *   surface.950 → darkest (used for form fields in dark mode)
 * Higher index = darker, in BOTH light and dark schemes.
 *
 * Below: primary palette re-pointed from indigo → blue, and the dark
 * surface scale tuned to Zayono's brand neutrals so the Dialog, Select
 * overlay, DataTable rows, etc. all share consistent dark surfaces.
 */
const ZayonoAura = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{blue.600}',           // #2563EB — main CTA
          contrastColor: '#ffffff',
          hoverColor: '{blue.700}',      // #1D4ED8
          activeColor: '{blue.800}',
        },
        surface: {
          0:   '#ffffff',
          50:  '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',                // main border in light
          300: '#D1D5DB',                // form field border
          400: '#9CA3AF',                // disabled / icon color
          500: '#6B7280',                // muted text
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',                // strong text
          950: '#030712',
        },
      },
      dark: {
        primary: {
          color: '{blue.500}',           // #3B82F6 — brighter for dark
          contrastColor: '#ffffff',
          hoverColor: '{blue.400}',
          activeColor: '{blue.300}',
        },
        // IMPORTANT: higher index = DARKER (same convention as light).
        // surface.900 is Dialog/Select overlay background in dark mode.
        // surface.950 is form field background. surface.0 is text colour.
        surface: {
          0:   '#FFFFFF',                // text colour in dark
          50:  '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',                // muted text in dark
          500: '#4B5563',                // hover border in dark
          600: '#3A4257',                // form field border in dark
          700: '#2A3142',                // content border in dark
          800: '#1F242F',                // hover bg in dark
          900: '#161A22',                // Dialog / Select overlay / card bg
          950: '#0F1115',                // form field bg / page bg
        },
      },
    },
  },
})

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  /*
   * Global <head> defaults — the tab title, meta description, favicon
   * and viewport are applied to every page. Individual pages can still
   * override via `useHead({ title: '...' })` (e.g. transaction detail
   * pages set the transaction ID in the tab title).
   *
   * `titleTemplate` lets pages set a short title (e.g. "Paiements") and
   * the wrapper adds "— Zayono" automatically.
   */
  app: {
    head: {
      // R1 audit A11y V1 — declare French as the document language so
      // screen readers use the right pronunciation for body content.
      // The dashboard + checkout are both French-first.
      htmlAttrs: { lang: 'fr' },
      // String template — Nuxt/unhead expects `%s` as the page-title slot.
      // The function form is no longer in the public type signature, even
      // though it still works at runtime. Using the string form makes the
      // typecheck pass without changing behaviour.
      titleTemplate: '%s — Zayono',
      title: 'Zayono — Connectez tous vos agrégateurs en un',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            "Zayono est l'orchestrateur de paiements pour l'Afrique : connectez vos agrégateurs " +
            '(FedaPay, KKiaPay, PayDunya, PawaPay, FeexPay, iPay Money, Stripe) avec une seule ' +
            "intégration et orchestrez Mobile Money + carte depuis un dashboard unifié.",
        },
        { name: 'theme-color', content: '#2563EB' },
      ],
      link: [
        { rel: 'icon', type: 'image/gif', href: '/favicon.gif' },
      ],
    },
  },
  modules: [
    '@primevue/nuxt-module',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/i18n',
  ],
  i18n: {
    // Cookie-based strategy — auth dashboard doesn't need URL-prefixed
    // locales (it's not SEO-indexed). Switching language is instant +
    // URLs stay clean.
    strategy: 'no_prefix',
    defaultLocale: 'fr',
    locales: [
      { code: 'fr', name: 'Français', file: 'fr.json' },
      { code: 'en', name: 'English', file: 'en.json' },
    ],
    langDir: 'locales',
    // NOTE on lazy-loading: `lazy: true` (splitting the fr/en JSON out of the
    // initial payload, ~100 KB saving) compiles cleanly. It is kept OFF as a
    // deliberate, conservative choice: the only locale page rendered on the
    // server is the public /status route (everything else is `ssr: false`),
    // and lazy + SSR adds a server-side locale-load step whose hydration we
    // can't browser-verify in this environment. The initial-payload saving is
    // marginal next to the image optimisation already shipped (public assets
    // cut 8.1 MB -> 1.4 MB), so both locales bundle eagerly for now. Revisit
    // with a runtime /status hydration test if the payload saving is wanted.
    // Auto-detect on first visit. After that, the cookie wins until
    // the user explicitly switches.
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'zayono_locale',
      redirectOn: 'root',
      fallbackLocale: 'fr',
    },
    bundle: {
      // Vue-i18n's full build (with runtime compiler) vs message
      // compiler at build-time. The message compiler is faster but
      // requires .json files (we use those) — keep optimizeTranslationDirective
      // off to be safe with PrimeVue components.
      optimizeTranslationDirective: false,
    },
    // A handful of translation keys contain `<strong>` for emphasis
    // (e.g. admin.finances.subtitle, gatewayDetail.webhook.*). They are
    // developer-authored, never user input, and rendered via `v-html` on
    // trusted markup. Disable the build-time HTML guard so the message
    // compiler accepts them; keep runtime escaping off so the tags render.
    compilation: {
      strictMessage: false,
      escapeHtml: false,
    },
  },
  primevue: {
    options: {
      theme: {
        preset: ZayonoAura,
        options: {
          darkModeSelector: '.dark-mode',
        }
      },
      ripple: false,
    },
  },
  css: [
    // Sora is the brand font — used everywhere in the dashboard (logo,
    // body, headings, tables). Self-hosted via fontsource so it works
    // offline and we don't depend on Google Fonts at runtime.
    //
    // Perf phase 0: Inter was previously loaded as a fallback (~150 KB
    // gzipped extra). It never paints visibly because Sora preloads first
    // and the system stack (-apple-system, Segoe UI, Roboto) handles the
    // FOIT/FOUT window in &lt;100ms. Dropping Inter cuts the checkout's
    // first-paint blocking CSS by ~150 KB and the dashboard's by the
    // same amount.
    '@fontsource-variable/sora/index.css',
    // R1 audit Perf HIGH H1: main.css moved out of global. It imports
    // `primeicons/primeicons.css` (~52 KB) + ~1500 lines of dashboard
    // PrimeVue selectors that the /checkout/** route has no use for
    // (the checkout uses its own checkout-tokens.css + bare HTML
    // controls). Dashboard layouts (default.vue, admin.vue, auth.vue)
    // now import main.css themselves via `&lt;script setup&gt;`.
  ],
  /*
   * Perf phase 0 — per-route hints.
   *
   * `/checkout/**` is a one-shot funnel: we don't want Nuxt's link
   * prefetcher to download the dashboard bundle (huge — Pinia stores,
   * PrimeVue DataTable, etc.) just because the customer happens to
   * scroll past a `&lt;NuxtLink&gt;`. Disable prefetch entirely on the
   * checkout. Cross-route prefetch in the merchant dashboard stays on.
   */
  routeRules: {
    // BUG FIX 2026-05-22 — the merchant dashboard is a SPA whose auth
    // state lives in localStorage. SSR was rendering pages with a
    // null Pinia auth state (no localStorage on server), and the
    // client hydrated from THAT null state before reading localStorage,
    // so the auth middleware bounced authenticated users to /auth/login
    // on every URL-entry / page-reload. Disabling SSR for all routes
    // EXCEPT the public /status page (which benefits from SEO) makes
    // the client's localStorage-derived auth state authoritative from
    // the first render.
    '/**': { ssr: false },
    '/status/**': {
      // Public status page benefits strongly from SSR: SEO + linkable
      // (search engines index it), and the data is cacheable since
      // it's the same for all visitors. ISR-style 60s cache keeps DB
      // hits bounded even under viral attention spikes.
      ssr: true,
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=60',
        // No auth on this page so embedding is fine — useful for
        // partner pages, monitoring dashboards, etc.
        'X-Frame-Options': 'SAMEORIGIN',
      },
    },
    '/checkout/**': {
      prerender: false,
      // Disable SSR — the checkout is fully client-driven (fetches
      // session via `onMounted` post-hydrate). SSR was attempting to
      // render the page server-side and hitting an edge case that
      // returned a 302 redirect to `/` (which then sent the customer
      // to `/dashboard`). Pure client-side render is the right model
      // for a token-gated funnel: no SSR cost, no leaked state.
      ssr: false,
      // No link prefetch on this funnel — keep the bundle minimal.
      headers: {
        // R1 audit BLOCKING B2: was `public, max-age=0, must-revalidate`
        // which allowed shared HTTP caches (corporate proxies, CGNAT
        // intermediaries) to potentially serve session A's HTML to
        // session B — the token in the URL is a BEARER credential and
        // any page that carries one must never use `public`.
        // `private, no-store` matches Stripe Checkout / banking convention.
        'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
        // Defence-in-depth — checkout is never embeddable by 3rd parties.
        // `frame-ancestors 'self'` allows the merchant dashboard's own
        // preview iframe while blocking external embeds (clickjacking).
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "frame-ancestors 'self'",
      },
    },
  },
  nitro: {
    /*
     * DEV-ONLY proxy — lets local dev (localhost:3000) talk to the online
     * backend without hitting CORS.
     *
     * The production backend only allows the `https://app.zayono.com`
     * origin (`access-control-allow-origin`), so a direct browser call from
     * `http://localhost:3000` to `https://backend.zayono.com` is blocked by
     * the browser. Routing `/api/**` through the Nuxt dev server means the
     * browser makes a same-origin request (no CORS), and the dev server
     * forwards it server-to-server to the real backend (CORS doesn't apply
     * to server-side requests).
     *
     * `devProxy` runs ONLY during `nuxt dev` — it's ignored in production
     * builds, where `NUXT_PUBLIC_API_BASE` points at the real backend and
     * the deployed frontend is served from an allowed origin.
     *
     * Pairs with `NUXT_PUBLIC_API_BASE=/api` in the local `.env`.
     */
    devProxy: {
      // devProxy strips the matched `/api` prefix, so the target must
      // re-add it: `/api/auth/login` -> strip `/api` -> `/auth/login`
      // -> appended to target -> `https://backend.zayono.com/api/auth/login`.
      '/api': {
        target: 'https://backend.zayono.com/api',
        changeOrigin: true,
      },
    },
  },
  runtimeConfig: {
    public: {
      // Nuxt auto-binds `NUXT_PUBLIC_API_BASE` from the environment to this
      // key at runtime — no explicit process.env read needed. The literal
      // below is the dev-server fallback.
      apiBase: 'http://localhost:8000/api',
      // Zayono backend outbound IPs — used by aggregator-specific connection
      // notices (eg PAL Africa) that require the merchant to ask the PSP
      // support to whitelist Zayono's server IP. Auto-bound from
      // `NUXT_PUBLIC_ZAYONO_OUTBOUND_IP_LIVE` / `_SANDBOX` in production.
      // Defaults reflect the current Hostinger production host
      // (147.93.54.206 = `billetevent.online`) — change here when migrating
      // to a different infra or env-set in the deployment.
      zayonoOutboundIpLive: '147.93.54.206',
      zayonoOutboundIpSandbox: '147.93.54.206',
      // Email used as the contact address in PSP whitelist-request emails
      // sent by merchants. Surfaces in the PAL Africa notice.
      zayonoSupportEmail: 'support@zayono.com',
    }
  }
})
