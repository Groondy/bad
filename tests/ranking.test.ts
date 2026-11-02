import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { users } from '../server/database/schema'
import { getPlayerProfile, getRanking } from '../server/utils/ranking'
import { recomputeAll } from '../server/utils/recompute'
import { createTestDb, insertMatch, insertUser } from './helpers/db'

type TestDb = ReturnType<typeof createTestDb>

describe('classement', () => {
  let db: TestDb
  let alice: number
  let bob: number
  let carol: number
  let dave: number
  let eve: number

  beforeEach(() => {
    db = createTestDb()
    alice = insertUser(db, { lastName: 'Arnaud', groupId: 1 })
    bob = insertUser(db, { lastName: 'Blanc', groupId: 1 })
    carol = insertUser(db, { lastName: 'Caron', groupId: 2 })
    dave = insertUser(db, { lastName: 'Durand', groupId: 2 })
    eve = insertUser(db, { lastName: 'Evrard', groupId: 1 })
  })

  it('exclut les joueurs sans match et les comptes supprimés', () => {
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 15 })
    recomputeAll(db)
    db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, bob)).run()
    expect(getRanking(db).map((r) => r.id)).toEqual([alice])
    expect(getRanking(db).map((r) => r.id)).not.toContain(eve)
  })

  it('compte victoires et défaites et trie par Elo', () => {
    insertMatch(db, {
      sideA: [alice],
      sideB: [bob],
      scoreA: 21,
      scoreB: 15,
      playedAt: '2026-10-01',
    })
    insertMatch(db, {
      sideA: [alice],
      sideB: [bob],
      scoreA: 18,
      scoreB: 21,
      playedAt: '2026-10-02',
    })
    insertMatch(db, {
      sideA: [alice],
      sideB: [carol],
      scoreA: 21,
      scoreB: 3,
      playedAt: '2026-10-03',
    })
    recomputeAll(db)
    const ranking = getRanking(db)
    expect(ranking[0]).toMatchObject({
      id: alice,
      matches: 3,
      wins: 2,
      losses: 1,
      groupName: 'Groupe 1',
    })
    expect(ranking.map((r) => r.elo)).toEqual([...ranking.map((r) => r.elo)].sort((a, b) => b - a))
  })

  it('filtre par groupe', () => {
    insertMatch(db, { sideA: [alice], sideB: [carol], scoreA: 21, scoreB: 15 })
    insertMatch(db, { sideA: [carol], sideB: [dave], scoreA: 21, scoreB: 15 })
    recomputeAll(db)
    expect(
      getRanking(db, 2)
        .map((r) => r.id)
        .sort(),
    ).toEqual([carol, dave].sort())
  })

  it('donne le même rang aux Elo égaux', () => {
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 15 })
    insertMatch(db, { sideA: [carol], sideB: [dave], scoreA: 21, scoreB: 15 })
    recomputeAll(db)
    expect(getRanking(db).map((r) => r.rank)).toEqual([1, 1, 3, 3])
  })
})

describe('profil public', () => {
  it("renvoie l'Elo, le groupe et l'historique", () => {
    const db = createTestDb()
    const alice = insertUser(db)
    const bob = insertUser(db)
    insertMatch(db, {
      sideA: [alice],
      sideB: [bob],
      scoreA: 21,
      scoreB: 15,
      playedAt: '2026-10-01',
    })
    insertMatch(db, {
      sideA: [bob],
      sideB: [alice],
      scoreA: 21,
      scoreB: 15,
      playedAt: '2026-10-03',
    })
    recomputeAll(db)
    const profile = getPlayerProfile(db, alice)
    expect(profile).toMatchObject({ id: alice, groupName: 'Groupe 1', deleted: false })
    expect(profile?.history.map((m) => m.playedAt)).toEqual(['2026-10-03', '2026-10-01'])
  })

  it('renvoie undefined pour un joueur inconnu', () => {
    expect(getPlayerProfile(createTestDb(), 9999)).toBeUndefined()
  })
})
