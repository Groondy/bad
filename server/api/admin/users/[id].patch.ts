import { adminUserUpdateSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = parseId(event)
  const input = await parseBody(event, adminUserUpdateSchema)
  return runService(() => updateUserAdmin(useDb(), actor.id, id, input))
})
