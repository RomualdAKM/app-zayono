import { useToast } from 'primevue/usetoast'

export const useApiError = () => {
  const toast = useToast()
  const { t } = useI18n()

  const handleError = (error: any, context?: string) => {
    const status = error?.status ?? error?.statusCode ?? error?.response?.status
    const message = error?.data?.message || error?.message || t('apiError.genericMessage')

    // 401 on a Sanctum-authenticated dashboard means the session is gone.
    // All non-public dashboard endpoints use Sanctum, so this is always correct.
    if (status === 401) {
      const auth = useAuthStore()
      auth.logout()
      return
    }

    if (status === 403) {
      toast.add({
        severity: 'error',
        summary: context || t('apiError.accessDenied'),
        detail: message,
        life: 5000,
      })
      return
    }

    if (status === 429) {
      toast.add({
        severity: 'warn',
        summary: context || t('apiError.tooManyRequests'),
        detail: message || t('apiError.retryShortly'),
        life: 5000,
      })
      return
    }

    // For 422 validation errors, show a summary
    if (status === 422 && error?.data?.errors) {
      const errors = error.data.errors
      const firstError = Object.values(errors).flat()[0] as string
      toast.add({
        severity: 'error',
        summary: context || t('apiError.validationError'),
        detail: firstError || message,
        life: 5000,
      })
      return
    }

    toast.add({
      severity: 'error',
      summary: context || t('apiError.errorSummary'),
      detail: message,
      life: 5000,
    })
  }

  /**
   * Extract per-field validation errors from a 422 response
   */
  const extractFieldErrors = (error: any): Record<string, string> => {
    const fieldErrors: Record<string, string> = {}
    if (error?.data?.errors) {
      const errors = error.data.errors
      Object.keys(errors).forEach(key => {
        fieldErrors[key] = Array.isArray(errors[key]) ? errors[key][0] : errors[key]
      })
    }
    return fieldErrors
  }

  return { handleError, extractFieldErrors }
}
