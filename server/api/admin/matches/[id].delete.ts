export default defineEventHandler((event) => {
  const id = parseId(event)
  runService(() => deleteMatch(useDb(), id))
  return { ok: true }
})
