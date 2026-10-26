export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = parseId(event)
  runService(() => deleteMatch(useDb(), id))
  return { ok: true }
})
