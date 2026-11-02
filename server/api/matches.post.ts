import { matchInputSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const actor = await requireActiveUser(event)
  const input = await parseBody(event, matchInputSchema)
  const db = useDb()
  const id = runService(() => createMatch(db, input, actor.id))
  return listMatchViews(db, { matchId: id })[0]
})
