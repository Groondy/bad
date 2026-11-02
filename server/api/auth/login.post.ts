import { loginSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const { email, password } = await parseBody(event, loginSchema)
  const account = findLoginAccount(useDb(), email)
  if (!account || !(await verifyPassword(account.passwordHash, password))) {
    throw createError({ statusCode: 401, message: 'Email ou mot de passe incorrect' })
  }
  await setUserSession(event, { user: account.user })
  return account.user
})
