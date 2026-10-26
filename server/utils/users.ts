import { and, asc, eq, isNull } from 'drizzle-orm'
import { users } from '../database/schema'
import type { AdminUserRow, PlayerOption, Role, SessionUser } from '../../shared/models'
import type { AdminUserUpdate, ProfileInput } from '../../shared/schemas'
import type { Db } from './db'
import { ServiceError } from './errors'
import { assertGroupExists } from './groups'

const sessionColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  role: users.role,
  groupId: users.groupId,
}

const adminColumns = { ...sessionColumns, email: users.email, elo: users.elo }

const isActive = (id: number) => and(eq(users.id, id), isNull(users.deletedAt))

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export interface NewUser {
  email: string
  firstName: string
  lastName: string
  groupId: number
}

export function registerUser(
  db: Db,
  input: NewUser,
  passwordHash: string,
  adminEmail?: string,
): SessionUser {
  const email = normalizeEmail(input.email)
  assertGroupExists(db, input.groupId)
  const existing = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get()
  if (existing) throw new ServiceError(409, 'Cet email est déjà utilisé', 'email')
  const role: Role = adminEmail && normalizeEmail(adminEmail) === email ? 'admin' : 'player'
  return db
    .insert(users)
    .values({
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      groupId: input.groupId,
      passwordHash,
      role,
    })
    .returning(sessionColumns)
    .get()
}

export function findLoginAccount(
  db: Db,
  email: string,
): { passwordHash: string; user: SessionUser } | undefined {
  const row = db
    .select({ ...sessionColumns, passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.email, normalizeEmail(email)), isNull(users.deletedAt)))
    .get()
  if (!row?.passwordHash) return undefined
  const { passwordHash, ...user } = row
  return { passwordHash, user }
}

export function getActiveUser(db: Db, id: number): SessionUser | undefined {
  return db.select(sessionColumns).from(users).where(isActive(id)).get()
}

export function getPasswordHash(db: Db, id: number): string | undefined {
  return (
    db.select({ passwordHash: users.passwordHash }).from(users).where(isActive(id)).get()
      ?.passwordHash ?? undefined
  )
}

export function updateProfile(db: Db, id: number, input: ProfileInput): SessionUser {
  assertGroupExists(db, input.groupId)
  const user = db.update(users).set(input).where(isActive(id)).returning(sessionColumns).get()
  if (!user) throw new ServiceError(404, 'Joueur introuvable')
  return user
}

export function setPassword(db: Db, id: number, passwordHash: string): void {
  const row = db
    .update(users)
    .set({ passwordHash })
    .where(isActive(id))
    .returning({ id: users.id })
    .get()
  if (!row) throw new ServiceError(404, 'Joueur introuvable')
}

export function listActivePlayers(db: Db): PlayerOption[] {
  return db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      groupId: users.groupId,
    })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.lastName), asc(users.firstName))
    .all()
}

export function listUsersAdmin(db: Db): AdminUserRow[] {
  return db
    .select(adminColumns)
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.lastName), asc(users.firstName))
    .all()
}

export function updateUserAdmin(
  db: Db,
  actorId: number,
  targetId: number,
  input: AdminUserUpdate,
): AdminUserRow {
  if (actorId === targetId && input.role === 'player') {
    throw new ServiceError(400, 'Tu ne peux pas retirer ton propre rôle admin', 'role')
  }
  if (input.groupId !== undefined) assertGroupExists(db, input.groupId)
  const row = db.update(users).set(input).where(isActive(targetId)).returning(adminColumns).get()
  if (!row) throw new ServiceError(404, 'Joueur introuvable')
  return row
}

export function anonymizeUser(db: Db, actorId: number, targetId: number): void {
  if (actorId === targetId)
    throw new ServiceError(400, 'Tu ne peux pas supprimer ton propre compte')
  anonymizeAccount(db, targetId)
}

/** Anonymise le compte en conservant ses matchs, pour ne pas fausser l'Elo des autres joueurs. */
export function anonymizeAccount(db: Db, targetId: number): void {
  const row = db
    .update(users)
    .set({
      firstName: 'Joueur',
      lastName: 'supprimé',
      email: `supprime-${targetId}@invalid`,
      passwordHash: null,
      role: 'player',
      deletedAt: new Date(),
    })
    .where(isActive(targetId))
    .returning({ id: users.id })
    .get()
  if (!row) throw new ServiceError(404, 'Joueur introuvable')
}
