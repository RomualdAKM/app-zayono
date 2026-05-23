export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    return navigateTo('/auth/login')
  }

  // Check super_admin role
  if (!auth.roles?.includes('super_admin') && !auth.roles?.includes('super-admin')) {
    return navigateTo('/dashboard')
  }
})
