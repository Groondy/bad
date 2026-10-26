import { groupRenameSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const { name } = await parseBody(event, groupRenameSchema)
  return runService(() => renameGroup(useDb(), id, name))
})
