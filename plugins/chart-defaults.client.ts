import { Chart as ChartJS } from 'chart.js'

/**
 * Chart.js carries its own default font (Helvetica-ish) and DOES NOT
 * inherit from the surrounding CSS. Without overriding it, charts on
 * /admin and /statistics would render in a different typeface than the
 * rest of the dashboard.
 *
 * We force Sora here so every chart axis label, tooltip and legend uses
 * the brand font. Falls back to the system stack — same chain as `body`
 * in main.css so charts stay readable even if the Sora variable file
 * hasn't loaded yet (perf phase 0: Inter dropped from the fallback,
 * system stack is indistinguishable on chart labels).
 */
export default defineNuxtPlugin(() => {
  ChartJS.defaults.font.family =
    "'Sora Variable', 'Sora', " +
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  // Match the body font-size (14px) for axis labels — visually consistent
  // with the surrounding tables.
  ChartJS.defaults.font.size = 12
})
