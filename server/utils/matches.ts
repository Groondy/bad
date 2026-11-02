import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { matches, matchPlayers, users } from '../database/schema'
import type { MatchView, Participant, SessionUser } from '../../shared/models'
import type { MatchInput } from '../../shared/schemas'
import type { Db } from './db'
import { ServiceError } from './errors'
import { recomputeAll } from './recompute'

/** Vérifie que les joueurs existent et sont actifs ; ceux déjà présents dans le match sont tolérés. */
function assertPlayersAllowed(db: Db, ids: number[], alreadyInMatch: number[] = []): void {
  const toCheck = ids.filter((id) => !alreadyInMatch.includes(id))
  if (toCheck.length === 0) return
  const found = db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, toCheck), isNull(users.deletedAt)))
    .all()
  if (found.length !== toCheck.length) {
    throw new ServiceError(400, 'Joueur introuvable ou supprimé', 'sideB')
  }
}

function writeParticipants(db: Db, matchId: number, input: MatchInput): void {
  db.insert(matchPlayers)
    .values([
      ...input.sideA.map((userId) => ({ matchId, userId, side: 'A' as const })),
      ...input.sideB.map((userId) => ({ matchId, userId, side: 'B' as const })),
    ])
    .run()
}

export function createMatch(db: Db, input: MatchInput, actorId: number): number {
  const playerIds = [...input.sideA, ...input.sideB]
  if (!playerIds.includes(actorId)) {
    throw new ServiceError(400, 'Tu dois faire partie du match', 'sideA')
  }
  return db.transaction((tx) => {
    assertPlayersAllowed(tx, playerIds)
    const { id } = tx
      .insert(matches)
      .values({
        type: input.type,
        scoreA: input.scoreA,
        scoreB: input.scoreB,
        playedAt: input.playedAt,
        createdBy: actorId,
      })
      .returning({ id: matches.id })
      .get()
    writeParticipants(tx, id, input)
    recomputeAll(tx)
    return id
  })
}

/**
 * Un joueur peut modifier ou supprimer un match auquel il participe, un admin n'importe lequel.
 * Avec `input` (modification), un joueur doit rester dans le match, comme à la création.
 */
export function assertCanEditMatch(
  db: Db,
  matchId: number,
  actor: Pick<SessionUser, 'id' | 'role'>,
  input?: MatchInput,
): void {
  const existing = db.select({ id: matches.id }).from(matches).where(eq(matches.id, matchId)).get()
  if (!existing) throw new ServiceError(404, 'Match introuvable')
  if (actor.role === 'admin') return
  const participant = db
    .select({ userId: matchPlayers.userId })
    .from(matchPlayers)
    .where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.userId, actor.id)))
    .get()
  if (!participant) throw new ServiceError(403, 'Tu ne participes pas à ce match')
  if (input && ![...input.sideA, ...input.sideB].includes(actor.id)) {
    throw new ServiceError(400, 'Tu dois faire partie du match', 'sideA')
  }
}

export function updateMatch(db: Db, matchId: number, input: MatchInput): void {
  db.transaction((tx) => {
    const existing = tx
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.id, matchId))
      .get()
    if (!existing) throw new ServiceError(404, 'Match introuvable')
    const currentIds = tx
      .select({ userId: matchPlayers.userId })
      .from(matchPlayers)
      .where(eq(matchPlayers.matchId, matchId))
      .all()
      .map((row) => row.userId)
    assertPlayersAllowed(tx, [...input.sideA, ...input.sideB], currentIds)
    tx.update(matches)
      .set({
        type: input.type,
        scoreA: input.scoreA,
        scoreB: input.scoreB,
        playedAt: input.playedAt,
      })
      .where(eq(matches.id, matchId))
      .run()
    tx.delete(matchPlayers).where(eq(matchPlayers.matchId, matchId)).run()
    writeParticipants(tx, matchId, input)
    recomputeAll(tx)
  })
}

export function deleteMatch(db: Db, matchId: number): void {
  db.transaction((tx) => {
    tx.delete(matchPlayers).where(eq(matchPlayers.matchId, matchId)).run()
    const deleted = tx
      .delete(matches)
      .where(eq(matches.id, matchId))
      .returning({ id: matches.id })
      .get()
    if (!deleted) throw new ServiceError(404, 'Match introuvable')
    recomputeAll(tx)
  })
}

export function listMatchViews(
  db: Db,
  filter: { matchId?: number; userId?: number } = {},
): MatchView[] {
  let ids: number[] | undefined
  if (filter.matchId !== undefined) {
    ids = [filter.matchId]
  } else if (filter.userId !== undefined) {
    ids = db
      .select({ id: matchPlayers.matchId })
      .from(matchPlayers)
      .where(eq(matchPlayers.userId, filter.userId))
      .all()
      .map((row) => row.id)
  }
  if (ids?.length === 0) return []

  const matchRows = db
    .select()
    .from(matches)
    .where(ids ? inArray(matches.id, ids) : undefined)
    .orderBy(desc(matches.playedAt), desc(matches.createdAt), desc(matches.id))
    .all()
  if (matchRows.length === 0) return []

  const participantRows = db
    .select({
      matchId: matchPlayers.matchId,
      side: matchPlayers.side,
      eloBefore: matchPlayers.eloBefore,
      eloDelta: matchPlayers.eloDelta,
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(matchPlayers)
    .innerJoin(users, eq(users.id, matchPlayers.userId))
    .where(
      inArray(
        matchPlayers.matchId,
        matchRows.map((m) => m.id),
      ),
    )
    .orderBy(asc(users.firstName), asc(users.lastName))
    .all()

  const toParticipant = (row: (typeof participantRows)[number]): Participant => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    eloBefore: row.eloBefore,
    eloDelta: row.eloDelta,
  })

  return matchRows.map((match) => {
    const participants = participantRows.filter((row) => row.matchId === match.id)
    return {
      id: match.id,
      type: match.type,
      playedAt: match.playedAt,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      createdBy: match.createdBy,
      sideA: participants.filter((row) => row.side === 'A').map(toParticipant),
      sideB: participants.filter((row) => row.side === 'B').map(toParticipant),
    }
  })
}
