export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value) return navigateTo({ path: '/connexion', query: { redirect: to.fullPath } })
  if (user.value?.role !== 'admin') return navigateTo('/')
})
