import { passwordChangeSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const actor = await requireActiveUser(event)
  const { currentPassword, newPassword } = await parseBody(event, passwordChangeSchema)
  const db = useDb()
  const hash = getPasswordHash(db, actor.id)
  if (!hash || !(await verifyPassword(hash, currentPassword))) {
    const message = 'Mot de passe actuel incorrect'
    throw createError({ statusCode: 400, message, data: { fieldErrors: { currentPassword: [message] } } })
  }
  const newHash = await hashPassword(newPassword)
  runService(() => setPassword(db, actor.id, newHash))
  return { ok: true }
})
