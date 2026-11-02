export default defineEventHandler(async (event) => {
  const actor = await requireActiveUser(event)
  const id = parseId(event)
  const db = useDb()
  runService(() => {
    assertCanEditMatch(db, id, actor)
    deleteMatch(db, id)
  })
  return { ok: true }
})
