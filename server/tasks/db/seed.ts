import { like } from 'drizzle-orm'
import { matches, matchPlayers, users } from '../../database/schema'

const DOMAIN = 'demo.local'
const PASSWORD = 'motdepasse'

const PLAYERS: [firstName: string, lastName: string, groupId: number][] = [
  ['Léa', 'Martin', 1],
  ['Hugo', 'Bernard', 1],
  ['Chloé', 'Dubois', 1],
  ['Lucas', 'Thomas', 1],
  ['Emma', 'Robert', 1],
  ['Nathan', 'Richard', 1],
  ['Manon', 'Petit', 1],
  ['Théo', 'Durand', 1],
  ['Inès', 'Leroy', 2],
  ['Louis', 'Moreau', 2],
  ['Jade', 'Simon', 2],
  ['Gabriel', 'Laurent', 2],
  ['Camille', 'Lefebvre', 2],
  ['Arthur', 'Michel', 2],
  ['Sarah', 'Garcia', 2],
  ['Jules', 'David', 2],
]

const MATCH_COUNT = 80
const DAYS_BACK = 60

/** Générateur pseudo-aléatoire à graine fixe : la base de démo est toujours la même. */
function random(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31
    return seed / 2 ** 31
  }
}

export default defineTask({
  meta: {
    name: 'db:seed',
    description: `Ajoute des joueurs (@${DOMAIN}, mot de passe « ${PASSWORD} ») et des matchs de démo`,
  },
  async run() {
    const db = useDb()
    const existing = db
      .select({ id: users.id })
      .from(users)
      .where(like(users.email, `%@${DOMAIN}`))
      .get()
    if (existing) return { result: 'Données de démo déjà présentes, rien à faire' }

    const passwordHash = await hashPassword(PASSWORD)
    const rand = random(42)
    const pick = <T>(list: T[]): T => list[Math.floor(rand() * list.length)]!

    db.transaction((tx) => {
      const admin = tx
        .insert(users)
        .values({
          email: `admin@${DOMAIN}`,
          firstName: 'Alice',
          lastName: 'Admin',
          groupId: 1,
          role: 'admin',
          passwordHash,
        })
        .returning({ id: users.id, groupId: users.groupId })
        .get()
      const players = [
        admin,
        ...PLAYERS.map(([firstName, lastName, groupId]) =>
          tx
            .insert(users)
            .values({
              email: `${firstName}.${lastName}@${DOMAIN}`
                .toLowerCase()
                .normalize('NFD')
                .replace(/\p{Diacritic}/gu, ''),
              firstName,
              lastName,
              groupId,
              passwordHash,
            })
            .returning({ id: users.id, groupId: users.groupId })
            .get(),
        ),
      ]

      for (let i = 0; i < MATCH_COUNT; i++) {
        const groupId = pick([1, 2])
        const pool = players.filter((p) => p.groupId === groupId).map((p) => p.id)
        const type = rand() < 0.6 ? 'single' : 'double'
        const chosen: number[] = []
        while (chosen.length < (type === 'single' ? 2 : 4)) {
          const id = pick(pool)
          if (!chosen.includes(id)) chosen.push(id)
        }
        const half = chosen.length / 2
        const sideA = chosen.slice(0, half)
        const sideB = chosen.slice(half)
        const loserScore = 5 + Math.floor(rand() * 15)
        const aWins = rand() < 0.5
        const date = new Date()
        date.setDate(date.getDate() - 1 - Math.floor(rand() * DAYS_BACK))

        const { id } = tx
          .insert(matches)
          .values({
            type,
            scoreA: aWins ? 21 : loserScore,
            scoreB: aWins ? loserScore : 21,
            playedAt: date.toISOString().slice(0, 10),
            createdBy: sideA[0]!,
          })
          .returning({ id: matches.id })
          .get()
        tx.insert(matchPlayers)
          .values([
            ...sideA.map((userId) => ({ matchId: id, userId, side: 'A' as const })),
            ...sideB.map((userId) => ({ matchId: id, userId, side: 'B' as const })),
          ])
          .run()
      }

      recomputeAll(tx)
    })

    return { result: `${PLAYERS.length + 1} joueurs et ${MATCH_COUNT} matchs créés` }
  },
})
