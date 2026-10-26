import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { matchPlayers, users } from '../server/database/schema'
import { listGroups, renameGroup } from '../server/utils/groups'
import {
  anonymizeUser,
  findLoginAccount,
  getActiveUser,
  listActivePlayers,
  registerUser,
  setPassword,
  updateProfile,
  updateUserAdmin,
} from '../server/utils/users'
import { createTestDb, insertMatch, insertUser } from './helpers/db'
import { expectServiceError } from './helpers/errors'

type TestDb = ReturnType<typeof createTestDb>

const newUser = { email: 'jean@ecole.fr', firstName: 'Jean', lastName: 'Dupont', groupId: 1 }

describe('inscription et connexion', () => {
  let db: TestDb
  beforeEach(() => {
    db = createTestDb()
  })

  it('crée un joueur avec le rôle player', () => {
    const user = registerUser(db, newUser, 'hash')
    expect(user).toMatchObject({
      firstName: 'Jean',
      lastName: 'Dupont',
      role: 'player',
      groupId: 1,
    })
  })

  it('donne le rôle admin à ADMIN_EMAIL sans tenir compte de la casse ni des espaces', () => {
    expect(registerUser(db, newUser, 'hash', ' JEAN@Ecole.fr ').role).toBe('admin')
  })

  it("stocke l'email en minuscules et le retrouve à la connexion", () => {
    registerUser(db, { ...newUser, email: 'Jean@Ecole.FR' }, 'hash')
    expect(findLoginAccount(db, ' JEAN@ecole.fr ')?.passwordHash).toBe('hash')
  })

  it('refuse un email déjà utilisé, même avec une autre casse', () => {
    registerUser(db, newUser, 'hash')
    expectServiceError(
      () => registerUser(db, { ...newUser, email: 'JEAN@ecole.fr' }, 'hash'),
      409,
      'email',
    )
  })

  it('refuse un groupe inconnu', () => {
    expectServiceError(() => registerUser(db, { ...newUser, groupId: 99 }, 'hash'), 400, 'groupId')
  })

  it('ne permet pas de se connecter à un compte supprimé', () => {
    const user = registerUser(db, newUser, 'hash')
    const adminId = insertUser(db, { role: 'admin' })
    anonymizeUser(db, adminId, user.id)
    expect(findLoginAccount(db, 'jean@ecole.fr')).toBeUndefined()
  })
})

describe('getActiveUser', () => {
  it('relit le rôle en base et ignore les comptes supprimés', () => {
    const db = createTestDb()
    const adminId = insertUser(db, { role: 'admin' })
    const playerId = insertUser(db)
    updateUserAdmin(db, adminId, playerId, { role: 'admin' })
    expect(getActiveUser(db, playerId)?.role).toBe('admin')
    updateUserAdmin(db, playerId, adminId, { role: 'player' })
    expect(getActiveUser(db, adminId)?.role).toBe('player')
    anonymizeUser(db, playerId, adminId)
    expect(getActiveUser(db, adminId)).toBeUndefined()
  })
})

describe('profil', () => {
  it('modifie le nom et le groupe', () => {
    const db = createTestDb()
    const id = insertUser(db)
    const user = updateProfile(db, id, { firstName: 'Léa', lastName: 'Petit', groupId: 2 })
    expect(user).toMatchObject({ firstName: 'Léa', lastName: 'Petit', groupId: 2 })
  })

  it('refuse un groupe inconnu', () => {
    const db = createTestDb()
    const id = insertUser(db)
    expectServiceError(
      () => updateProfile(db, id, { firstName: 'A', lastName: 'B', groupId: 99 }),
      400,
      'groupId',
    )
  })

  it("refuse de changer le mot de passe d'un compte supprimé", () => {
    const db = createTestDb()
    const id = insertUser(db, { deletedAt: new Date() })
    expectServiceError(() => setPassword(db, id, 'nouveau'), 404)
  })
})

describe('administration des joueurs', () => {
  let db: TestDb
  let adminId: number
  let playerId: number

  beforeEach(() => {
    db = createTestDb()
    adminId = insertUser(db, { role: 'admin' })
    playerId = insertUser(db)
  })

  it('change le groupe d’un joueur', () => {
    expect(updateUserAdmin(db, adminId, playerId, { groupId: 2 }).groupId).toBe(2)
  })

  it('refuse qu’un admin retire son propre rôle', () => {
    expectServiceError(() => updateUserAdmin(db, adminId, adminId, { role: 'player' }), 400, 'role')
  })

  it('refuse qu’un admin supprime son propre compte', () => {
    expectServiceError(() => anonymizeUser(db, adminId, adminId), 400)
  })

  it('anonymise un compte en conservant ses matchs', () => {
    const other = insertUser(db)
    insertMatch(db, { sideA: [playerId], sideB: [other], scoreA: 21, scoreB: 10 })
    anonymizeUser(db, adminId, playerId)
    const row = db.select().from(users).where(eq(users.id, playerId)).get()
    expect(row).toMatchObject({
      firstName: 'Joueur',
      lastName: 'supprimé',
      passwordHash: null,
      role: 'player',
    })
    expect(row?.email).not.toContain('@ecole.fr')
    expect(row?.deletedAt).not.toBeNull()
    expect(
      db.select().from(matchPlayers).where(eq(matchPlayers.userId, playerId)).all(),
    ).toHaveLength(1)
  })

  it('renvoie 404 pour un compte déjà supprimé', () => {
    anonymizeUser(db, adminId, playerId)
    expectServiceError(() => anonymizeUser(db, adminId, playerId), 404)
    expectServiceError(() => updateUserAdmin(db, adminId, playerId, { groupId: 2 }), 404)
  })

  it('la liste des joueurs actifs exclut les comptes supprimés', () => {
    anonymizeUser(db, adminId, playerId)
    expect(listActivePlayers(db).map((p) => p.id)).toEqual([adminId])
  })
})

describe('groupes', () => {
  it('liste et renomme les groupes', () => {
    const db = createTestDb()
    expect(renameGroup(db, 1, 'Mardi').name).toBe('Mardi')
    expect(listGroups(db).map((g) => g.name)).toEqual(['Mardi', 'Groupe 2'])
  })

  it('renvoie 404 pour un groupe inconnu', () => {
    const db = createTestDb()
    expectServiceError(() => renameGroup(db, 99, 'X'), 404)
  })
})
