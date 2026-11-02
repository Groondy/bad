import { matches, matchPlayers, users } from '../../server/database/schema'
import { createDb, migrateDb, seedGroups } from '../../server/utils/db'

export function createTestDb() {
  const db = createDb(':memory:')
  migrateDb(db)
  seedGroups(db)
  return db
}

type TestDb = ReturnType<typeof createTestDb>

let counter = 0

export function insertUser(db: TestDb, overrides: Partial<typeof users.$inferInsert> = {}): number {
  counter += 1
  return db
    .insert(users)
    .values({
      email: `joueur${counter}@ecole.fr`,
      firstName: `Prénom${counter}`,
      lastName: `Nom${counter}`,
      passwordHash: 'hash',
      groupId: 1,
      ...overrides,
    })
    .returning({ id: users.id })
    .get().id
}

export function insertMatch(
  db: TestDb,
  match: { sideA: number[]; sideB: number[]; scoreA: number; scoreB: number; playedAt?: string },
): number {
  const [creator] = match.sideA
  if (creator === undefined) throw new Error('sideA vide')
  const id = db
    .insert(matches)
    .values({
      type: match.sideA.length === 1 ? 'single' : 'double',
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      playedAt: match.playedAt ?? '2026-10-01',
      createdBy: creator,
    })
    .returning({ id: matches.id })
    .get().id
  db.insert(matchPlayers)
    .values([
      ...match.sideA.map((userId) => ({ matchId: id, userId, side: 'A' as const })),
      ...match.sideB.map((userId) => ({ matchId: id, userId, side: 'B' as const })),
    ])
    .run()
  return id
}
