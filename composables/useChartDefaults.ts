/**
 * Applies the brand font to Chart.js, lazily.
 *
 * chart.js used to be imported by a GLOBAL client plugin, which pulled it
 * into the entry bundle so it downloaded on EVERY route (login included).
 * Only 3 pages actually render charts (statistics/global, admin/index,
 * admin/finances). Those pages call this composable, which dynamically
 * imports chart.js (the same chunk PrimeVue's <Chart> already loads on
 * those pages) and sets the defaults once. Awaiting it before the chart's
 * data is fetched guarantees the font is applied before the first render.
 */
let applied: Promise<void> | null = null

export function useChartDefaults(): Promise<void> {
  if (!applied) {
    applied = import('chart.js').then(({ Chart }) => {
      Chart.defaults.font.family =
        "'Sora Variable', 'Sora', " +
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      Chart.defaults.font.size = 12
    })
  }
  return applied
}
