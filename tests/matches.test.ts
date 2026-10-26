import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { matches, matchPlayers, users } from '../server/database/schema'
import { createMatch, deleteMatch, listMatchViews, updateMatch } from '../server/utils/matches'
import type { MatchInput } from '../shared/schemas'
import { createTestDb, insertUser } from './helpers/db'
import { expectServiceError } from './helpers/errors'

type TestDb = ReturnType<typeof createTestDb>

function eloOf(db: TestDb, id: number): number | undefined {
  return db.select({ elo: users.elo }).from(users).where(eq(users.id, id)).get()?.elo
}

function markDeleted(db: TestDb, id: number): void {
  db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id)).run()
}

describe('service des matchs', () => {
  let db: TestDb
  let alice: number
  let bob: number
  let carol: number
  let dave: number
  let single: (overrides?: Partial<MatchInput>) => MatchInput

  beforeEach(() => {
    db = createTestDb()
    alice = insertUser(db, { firstName: 'Alice', lastName: 'Arnaud' })
    bob = insertUser(db, { firstName: 'Bob', lastName: 'Blanc' })
    carol = insertUser(db, { firstName: 'Carol', lastName: 'Caron' })
    dave = insertUser(db, { firstName: 'Dave', lastName: 'Durand' })
    single = (overrides = {}) => ({
      type: 'single',
      sideA: [alice],
      sideB: [bob],
      scoreA: 21,
      scoreB: 15,
      playedAt: '2026-10-01',
      ...overrides,
    })
  })

  describe('createMatch', () => {
    it("enregistre le match et met à jour l'Elo", () => {
      const id = createMatch(db, single(), alice)
      expect(id).toBeGreaterThan(0)
      expect(eloOf(db, alice)).toBe(1016)
      expect(eloOf(db, bob)).toBe(984)
    })

    it('accepte que le saisissant soit dans l’équipe B', () => {
      createMatch(db, single(), bob)
      expect(eloOf(db, bob)).toBe(984)
    })

    it('refuse si le saisissant ne joue pas le match', () => {
      expectServiceError(() => createMatch(db, single(), carol), 400, 'sideA')
      expect(db.select().from(matches).all()).toHaveLength(0)
    })

    it('refuse un joueur supprimé et n’enregistre rien', () => {
      markDeleted(db, bob)
      expectServiceError(() => createMatch(db, single(), alice), 400, 'sideB')
      expect(db.select().from(matches).all()).toHaveLength(0)
      expect(db.select().from(matchPlayers).all()).toHaveLength(0)
    })

    it('refuse un joueur inexistant', () => {
      expectServiceError(() => createMatch(db, single({ sideB: [9999] }), alice), 400, 'sideB')
    })
  })

  describe('updateMatch', () => {
    it('corrige le score et recalcule', () => {
      const id = createMatch(db, single(), alice)
      updateMatch(db, id, single({ scoreA: 10, scoreB: 21 }))
      expect(eloOf(db, alice)).toBe(984)
      expect(eloOf(db, bob)).toBe(1016)
    })

    it('change les joueurs', () => {
      const id = createMatch(db, single(), alice)
      updateMatch(db, id, single({ sideB: [carol] }))
      expect(eloOf(db, bob)).toBe(1000)
      expect(eloOf(db, carol)).toBe(984)
    })

    it('accepte un joueur déjà présent dans le match même s’il a été supprimé depuis', () => {
      const id = createMatch(db, single(), alice)
      markDeleted(db, bob)
      updateMatch(db, id, single({ scoreA: 21, scoreB: 19 }))
      expect(eloOf(db, alice)).toBe(1016)
    })

    it('refuse d’ajouter un joueur supprimé', () => {
      const id = createMatch(db, single(), alice)
      markDeleted(db, carol)
      expectServiceError(() => updateMatch(db, id, single({ sideB: [carol] })), 400, 'sideB')
    })

    it('renvoie 404 pour un match inexistant', () => {
      expectServiceError(() => updateMatch(db, 9999, single()), 404)
    })
  })

  describe('deleteMatch', () => {
    it('supprime le match et recalcule', () => {
      const id = createMatch(db, single(), alice)
      deleteMatch(db, id)
      expect(db.select().from(matches).all()).toHaveLength(0)
      expect(db.select().from(matchPlayers).all()).toHaveLength(0)
      expect(eloOf(db, alice)).toBe(1000)
      expect(eloOf(db, bob)).toBe(1000)
    })

    it('renvoie 404 pour un match inexistant', () => {
      expectServiceError(() => deleteMatch(db, 9999), 404)
    })
  })

  describe('listMatchViews', () => {
    it('renvoie un match avec les joueurs, les scores et les deltas', () => {
      const id = createMatch(
        db,
        { type: 'double', sideA: [alice, carol], sideB: [bob, dave], scoreA: 21, scoreB: 17, playedAt: '2026-10-01' },
        alice,
      )
      const [view] = listMatchViews(db, { matchId: id })
      expect(view?.type).toBe('double')
      expect(view?.sideA.map((p) => p.firstName)).toEqual(['Alice', 'Carol'])
      expect(view?.sideB.map((p) => p.eloDelta)).toEqual([-16, -16])
      expect(view?.sideA.map((p) => p.eloBefore)).toEqual([1000, 1000])
    })

    it("filtre par joueur, du plus récent au plus ancien", () => {
      createMatch(db, single({ playedAt: '2026-10-01' }), alice)
      createMatch(db, single({ sideA: [carol], sideB: [dave] }), carol)
      createMatch(db, single({ playedAt: '2026-10-05' }), alice)
      const views = listMatchViews(db, { userId: alice })
      expect(views.map((v) => v.playedAt)).toEqual(['2026-10-05', '2026-10-01'])
    })

    it('renvoie une liste vide pour un joueur sans match', () => {
      expect(listMatchViews(db, { userId: dave })).toEqual([])
    })
  })
})
