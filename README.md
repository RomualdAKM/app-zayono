# Zayono — Frontend

Dashboard Nuxt 3 + PrimeVue de **Zayono**, l'orchestrateur de paiements
qui vous permet de **connecter tous vos agrégateurs en un** : FedaPay,
KKiaPay, PayDunya, PawaPay, FeexPay, iPay Money et Stripe — une seule
intégration, un seul dashboard, des règles de routage par opérateur.

## Stack

- **Nuxt 3** (SSR + client-side hydration)
- **PrimeVue 4** avec preset Aura customisé (`primary` = blue 600)
- **Pinia** pour l'état (auth, application active, environnement)
- **Sora** (variable) auto-hébergée via `@fontsource-variable`
- **Chart.js** pour les graphiques de statistiques
- API REST consommée via le composable `useApi` (`X-Zayono-Application`
  + `X-Zayono-Environment` injectés automatiquement)

## Setup

```bash
npm install
```

Pour lancer le dev server :

```bash
npm run dev   # http://localhost:3000
```

Le backend doit tourner en parallèle sur `http://localhost:8000`
(configurable via `NUXT_PUBLIC_API_BASE`).

## Build production

```bash
npm run build
npm run preview
```

## Structure clé

| Dossier | Contenu |
|---|---|
| `pages/` | Routes Nuxt (file-based). `pages/admin/*` = super admin, `pages/auth/*` = login/register, `pages/apps/` = picker multi-app. |
| `components/icons/` | 47 icônes SVG sur-mesure (stroke-based, viewBox 24×24). Wrappées par `<AppIcon name="…">`. |
| `components/layout/` | Sidebar, Header, AdminNotificationBell. |
| `stores/` | `auth`, `application` (multi-app), `environment` (sandbox/live), `admin`, `merchant`. |
| `composables/` | `useApi` (fetch wrapper), `useApplicationStore`, `useCsvExport`, etc. |
| `layouts/` | `default` (sidebar + header), `admin` (super-admin chrome), `auth` (login/register). |
| `plugins/` | `00.hydrate.client.ts` (resume session au boot), `chart-defaults.client.ts` (Sora dans Chart.js). |
| `middleware/auth.global.ts` | Garde de route — redirige `/auth` si pas connecté, `/apps` si pas d'app sélectionnée. |

## Conventions

- **Icônes** : utiliser `<AppIcon name="x" />` qui résout vers SVG custom ou fallback PrimeIcons. Voir la map dans `components/AppIcon.vue`.
- **Couleurs** : variables CSS `--ze-*` (mode-aware light/dark). Voir `assets/css/main.css`.
- **Multi-app** : tout fetch côté merchant passe par `useApi()` qui injecte `X-Zayono-Application` depuis `useApplicationStore`.
- **Tests** : pas de suite Jest/Vitest pour l'instant — la validation passe par `npm run dev` + flow manuel.

## Voir aussi

- [`backend/README.md`](../backend/README.md) — API Laravel
- [`docs/`](../docs/) — documentation produit + intégration agrégateurs
- [`demo/`](../demo/) — boutique factice qui consomme l'API en sandbox
