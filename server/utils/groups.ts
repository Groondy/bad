import { asc, eq } from 'drizzle-orm'
import { groups } from '../database/schema'
import type { Group } from '../../shared/models'
import type { Db } from './db'
import { ServiceError } from './errors'

export function listGroups(db: Db): Group[] {
  return db.select().from(groups).orderBy(asc(groups.id)).all()
}

export function assertGroupExists(db: Db, groupId: number): void {
  const group = db.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).get()
  if (!group) throw new ServiceError(400, 'Groupe inconnu', 'groupId')
}

export function renameGroup(db: Db, id: number, name: string): Group {
  const group = db.update(groups).set({ name }).where(eq(groups.id, id)).returning().get()
  if (!group) throw new ServiceError(404, 'Groupe introuvable')
  return group
}
