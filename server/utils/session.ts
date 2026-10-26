import type { H3Event } from 'h3'
import type { SessionUser } from '../../shared/models'

/** Relit l'utilisateur en base : un compte supprimé ou rétrogradé ne garde pas ses droits. */
export async function requireActiveUser(event: H3Event): Promise<SessionUser> {
  const session = await getUserSession(event)
  const user = session.user ? getActiveUser(useDb(), session.user.id) : undefined
  if (!user) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, message: 'Connexion requise' })
  }
  return user
}

export async function requireAdmin(event: H3Event): Promise<SessionUser> {
  const user = await requireActiveUser(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: 'Accès réservé aux admins' })
  return user
}
