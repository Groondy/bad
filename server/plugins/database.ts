export default defineNitroPlugin(() => {
  const db = useDb()
  migrateDb(db)
  seedGroups(db)
})
