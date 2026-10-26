import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { groups, users } from '../server/database/schema'
import { seedGroups } from '../server/utils/db'
import { createTestDb, insertUser } from './helpers/db'

describe('base de données', () => {
  it('applique les migrations et crée les deux groupes', () => {
    const db = createTestDb()
    expect(db.select().from(groups).all().map((g) => g.name)).toEqual(['Groupe 1', 'Groupe 2'])
  })

  it('ne recrée pas les groupes si le seed est relancé', () => {
    const db = createTestDb()
    seedGroups(db)
    expect(db.select().from(groups).all()).toHaveLength(2)
  })

  it('un nouveau joueur démarre à 1000 avec le rôle player', () => {
    const db = createTestDb()
    const id = insertUser(db)
    const user = db.select().from(users).where(eq(users.id, id)).get()
    expect(user?.elo).toBe(1000)
    expect(user?.role).toBe('player')
    expect(user?.deletedAt).toBeNull()
  })

  it('refuse deux comptes avec le même email', () => {
    const db = createTestDb()
    insertUser(db, { email: 'meme@ecole.fr' })
    expect(() => insertUser(db, { email: 'meme@ecole.fr' })).toThrow()
  })
})
