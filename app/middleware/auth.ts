export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) return navigateTo({ path: '/connexion', query: { redirect: to.fullPath } })
})
