import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
})

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  passwordHash: text('password_hash'),
  groupId: integer('group_id')
    .notNull()
    .references(() => groups.id),
  role: text('role', { enum: ['player', 'admin'] })
    .notNull()
    .default('player'),
  elo: integer('elo').notNull().default(1000),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const matches = sqliteTable('matches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['single', 'double'] }).notNull(),
  scoreA: integer('score_a').notNull(),
  scoreB: integer('score_b').notNull(),
  playedAt: text('played_at').notNull(),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  // Réservé au cycle 2 (tournois), toujours null pour l'instant
  tournamentId: integer('tournament_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const matchPlayers = sqliteTable(
  'match_players',
  {
    matchId: integer('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    side: text('side', { enum: ['A', 'B'] }).notNull(),
    eloBefore: integer('elo_before').notNull().default(0),
    eloDelta: integer('elo_delta').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.userId] })],
)
