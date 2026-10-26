import { matchInputSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const input = await parseBody(event, matchInputSchema)
  const db = useDb()
  runService(() => updateMatch(db, id, input))
  return listMatchViews(db, { matchId: id })[0]
})
