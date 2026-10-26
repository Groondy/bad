export default defineEventHandler(async (event) => {
  if (event.path.startsWith('/api/admin')) await requireAdmin(event)
})
