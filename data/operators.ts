/**
 * @deprecated Operator data lives in the backend now (config/operators.php).
 * Use `useOperators()` composable instead — it fetches the catalog from
 * GET /merchant/operators and caches it. See composables/useOperators.ts.
 *
 * This file is kept only to fail loudly if something still imports it.
 */
export const operators = (): never => {
  throw new Error(
    '[operators] Hard-coded operator data was removed. Use useOperators() composable.'
  )
}
export const countries = operators
export const currencies = operators
