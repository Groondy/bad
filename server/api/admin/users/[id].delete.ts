export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = parseId(event)
  runService(() => anonymizeUser(useDb(), actor.id, id))
  return { ok: true }
})
