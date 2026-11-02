export default defineEventHandler(async (event) => {
  await requireActiveUser(event)
  return listActivePlayers(useDb())
})
