import { registerSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const { password, ...input } = await parseBody(event, registerSchema)
  const passwordHash = await hashPassword(password)
  const user = runService(() => registerUser(useDb(), input, passwordHash, process.env.ADMIN_EMAIL))
  await setUserSession(event, { user })
  return user
})
