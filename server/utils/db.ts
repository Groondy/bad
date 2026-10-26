import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import * as schema from '../database/schema'

/** Base ou transaction : tous les services acceptent les deux. */
export type Db = BaseSQLiteDatabase<'sync', Database.RunResult, typeof schema>

export function createDb(path: string): BetterSQLite3Database<typeof schema> {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const sqlite = new Database(path)
  sqlite.pragma('foreign_keys = ON')
  return drizzle(sqlite, { schema })
}

export function migrateDb(db: BetterSQLite3Database<typeof schema>): void {
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'server/database/migrations') })
}

export function seedGroups(db: Db): void {
  const existing = db.select({ id: schema.groups.id }).from(schema.groups).limit(1).all()
  if (existing.length === 0) {
    db.insert(schema.groups).values([{ name: 'Groupe 1' }, { name: 'Groupe 2' }]).run()
  }
}

let instance: BetterSQLite3Database<typeof schema> | undefined

export function useDb(): BetterSQLite3Database<typeof schema> {
  instance ??= createDb(process.env.DATABASE_PATH ?? 'data/bad.db')
  return instance
}
