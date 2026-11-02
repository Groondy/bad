import { profileSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const actor = await requireActiveUser(event)
  const input = await parseBody(event, profileSchema)
  const user = runService(() => updateProfile(useDb(), actor.id, input))
  await replaceUserSession(event, { user })
  return user
})
