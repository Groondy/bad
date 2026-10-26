import { accountDeleteSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const actor = await requireActiveUser(event)
  const { password } = await parseBody(event, accountDeleteSchema)
  const db = useDb()
  const hash = getPasswordHash(db, actor.id)
  if (!hash || !(await verifyPassword(hash, password))) {
    const message = 'Mot de passe incorrect'
    throw createError({
      statusCode: 400,
      message,
      data: { fieldErrors: { password: [message] } },
    })
  }
  runService(() => anonymizeAccount(db, actor.id))
  await clearUserSession(event)
  return { ok: true }
})
