import { and, eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { matches, matchPlayers, users } from '../server/database/schema'
import { recomputeAll } from '../server/utils/recompute'
import { createTestDb, insertMatch, insertUser } from './helpers/db'

type TestDb = ReturnType<typeof createTestDb>

function eloOf(db: TestDb, id: number): number | undefined {
  return db.select({ elo: users.elo }).from(users).where(eq(users.id, id)).get()?.elo
}

describe('recomputeAll', () => {
  let db: TestDb
  let alice: number
  let bob: number
  let carol: number
  let dave: number

  beforeEach(() => {
    db = createTestDb()
    alice = insertUser(db)
    bob = insertUser(db)
    carol = insertUser(db)
    dave = insertUser(db)
  })

  it('met à jour les Elo et écrit eloBefore / eloDelta', () => {
    const matchId = insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 15 })
    recomputeAll(db)
    expect(eloOf(db, alice)).toBe(1016)
    expect(eloOf(db, bob)).toBe(984)
    const row = db
      .select()
      .from(matchPlayers)
      .where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.userId, bob)))
      .get()
    expect(row?.eloBefore).toBe(1000)
    expect(row?.eloDelta).toBe(-16)
  })

  it('le vainqueur peut être le côté B', () => {
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 12, scoreB: 21 })
    recomputeAll(db)
    expect(eloOf(db, alice)).toBe(984)
    expect(eloOf(db, bob)).toBe(1016)
  })

  it('enchaîne les matchs en tenant compte des Elo intermédiaires', () => {
    insertMatch(db, {
      sideA: [alice],
      sideB: [bob],
      scoreA: 21,
      scoreB: 15,
      playedAt: '2026-10-01',
    })
    insertMatch(db, {
      sideA: [carol],
      sideB: [alice],
      scoreA: 21,
      scoreB: 19,
      playedAt: '2026-10-02',
    })
    recomputeAll(db)
    // Carol (1000) bat Alice (1016) : gain = round(32 × (1 − 1/(1+10^(16/400)))) = 17
    expect(eloOf(db, carol)).toBe(1017)
    expect(eloOf(db, alice)).toBe(999)
    expect(eloOf(db, bob)).toBe(984)
  })

  it('un match saisi avec une date passée est rejoué à sa place', () => {
    insertMatch(db, {
      sideA: [alice],
      sideB: [bob],
      scoreA: 21,
      scoreB: 15,
      playedAt: '2026-10-10',
    })
    insertMatch(db, {
      sideA: [carol],
      sideB: [alice],
      scoreA: 21,
      scoreB: 19,
      playedAt: '2026-10-01',
    })
    recomputeAll(db)
    // Ordre réel : Carol bat Alice (1016/984), puis Alice (984) bat Bob (1000) : +17
    expect(eloOf(db, carol)).toBe(1016)
    expect(eloOf(db, alice)).toBe(1001)
    expect(eloOf(db, bob)).toBe(983)
  })

  it('supprimer un match intermédiaire corrige les Elo suivants', () => {
    const first = insertMatch(db, {
      sideA: [alice],
      sideB: [bob],
      scoreA: 21,
      scoreB: 15,
      playedAt: '2026-10-01',
    })
    insertMatch(db, {
      sideA: [carol],
      sideB: [alice],
      scoreA: 21,
      scoreB: 19,
      playedAt: '2026-10-02',
    })
    recomputeAll(db)
    db.delete(matches).where(eq(matches.id, first)).run()
    recomputeAll(db)
    expect(eloOf(db, alice)).toBe(984)
    expect(eloOf(db, bob)).toBe(1000)
    expect(eloOf(db, carol)).toBe(1016)
  })

  it('en double, les deux joueurs reçoivent le même delta', () => {
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 0, playedAt: '2026-10-01' })
    // Équipe Alice (1016) + Carol (1000) = 1008 contre Bob (984) + Dave (1000) = 992
    insertMatch(db, {
      sideA: [alice, carol],
      sideB: [bob, dave],
      scoreA: 21,
      scoreB: 18,
      playedAt: '2026-10-02',
    })
    recomputeAll(db)
    // gain = round(32 × (1 − 1/(1+10^(−16/400)))) = 15
    expect(eloOf(db, alice)).toBe(1031)
    expect(eloOf(db, carol)).toBe(1015)
    expect(eloOf(db, bob)).toBe(969)
    expect(eloOf(db, dave)).toBe(985)
  })

  it('remet à 1000 un joueur dont tous les matchs ont été supprimés', () => {
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 15 })
    recomputeAll(db)
    db.delete(matches).run()
    recomputeAll(db)
    expect(eloOf(db, alice)).toBe(1000)
    expect(eloOf(db, bob)).toBe(1000)
  })
})
