/** Resynchronise le cookie de session avec la base à chaque lecture de /api/_auth/session. */
export default defineNitroPlugin(() => {
  sessionHooks.hook('fetch', async (session, event) => {
    if (!session.user) return
    const fresh = getActiveUser(useDb(), session.user.id)
    if (!fresh) {
      await clearUserSession(event)
      delete session.user
      return
    }
    const { user } = session
    if (
      user.role !== fresh.role ||
      user.groupId !== fresh.groupId ||
      user.firstName !== fresh.firstName ||
      user.lastName !== fresh.lastName
    ) {
      await replaceUserSession(event, { ...session, user: fresh })
      session.user = fresh
    }
  })
})
