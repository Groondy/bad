import { resetPasswordSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const { password } = await parseBody(event, resetPasswordSchema)
  const passwordHash = await hashPassword(password)
  runService(() => setPassword(useDb(), id, passwordHash))
  return { ok: true }
})
