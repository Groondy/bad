export default defineEventHandler((event) => {
  const profile = getPlayerProfile(useDb(), parseId(event))
  if (!profile) throw createError({ statusCode: 404, message: 'Joueur introuvable' })
  return profile
})
