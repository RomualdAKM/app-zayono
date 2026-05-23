/**
 * Trigger a CSV download from a Sanctum-protected admin endpoint.
 *
 * `useApi` is JSON-only, but for CSV exports we need to:
 *  - keep the Authorization header (admin routes require it),
 *  - read the response as a Blob,
 *  - synthesize an `<a download>` click so the browser saves the file with
 *    the Content-Disposition filename from the server.
 *
 * This helper streams the response from the server (controller uses
 * `php://output`) so multi-MB exports don't blow up the browser memory.
 */
export const useCsvExport = () => {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  /**
   * Download a CSV from `path`, optionally with a query string of filters.
   * `defaultFilename` is only used if the server didn't send a
   * Content-Disposition header (defensive fallback).
   */
  const downloadCsv = async (
    path: string,
    params: Record<string, string | number | undefined> = {},
    defaultFilename = 'export.csv',
  ): Promise<void> => {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    const url = `${config.public.apiBase}${path}${query ? `?${query}` : ''}`

    const res = await fetch(url, {
      headers: {
        Accept: 'text/csv',
        Authorization: `Bearer ${auth.token}`,
      },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Export failed with status ${res.status}`)
    }

    // Try to pull the filename from Content-Disposition; Laravel sets it
    // via `streamDownload($name)`. Falls back to the supplied default.
    const disposition = res.headers.get('content-disposition') ?? ''
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
    const filename = match?.[1] ?? defaultFilename

    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()

    // Free the temporary blob URL on the next tick so the click has time
    // to dispatch before the browser drops the data.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 0)
  }

  return { downloadCsv }
}
