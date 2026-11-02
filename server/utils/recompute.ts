import { and, asc, eq } from 'drizzle-orm'
import { matches, matchPlayers, users } from '../database/schema'
import type { Db } from './db'
import { computeGain, INITIAL_ELO, teamRating } from './elo'

/** Rejoue tout l'historique et réécrit les Elo. À appeler dans la transaction de l'écriture. */
export function recomputeAll(db: Db): void {
  const ratings = new Map<number, number>()
  for (const { id } of db.select({ id: users.id }).from(users).all()) {
    ratings.set(id, INITIAL_ELO)
  }
  const ratingOf = (userId: number) => ratings.get(userId) ?? INITIAL_ELO

  const participantsByMatch = new Map<number, (typeof matchPlayers.$inferSelect)[]>()
  for (const participant of db.select().from(matchPlayers).all()) {
    const list = participantsByMatch.get(participant.matchId) ?? []
    list.push(participant)
    participantsByMatch.set(participant.matchId, list)
  }

  const orderedMatches = db
    .select()
    .from(matches)
    .orderBy(asc(matches.playedAt), asc(matches.createdAt), asc(matches.id))
    .all()

  for (const match of orderedMatches) {
    const participants = participantsByMatch.get(match.id) ?? []
    const ratingA = teamRating(
      participants.filter((p) => p.side === 'A').map((p) => ratingOf(p.userId)),
    )
    const ratingB = teamRating(
      participants.filter((p) => p.side === 'B').map((p) => ratingOf(p.userId)),
    )
    const aWon = match.scoreA > match.scoreB
    const gain = aWon ? computeGain(ratingA, ratingB) : computeGain(ratingB, ratingA)

    for (const participant of participants) {
      const before = ratingOf(participant.userId)
      const delta = (participant.side === 'A') === aWon ? gain : -gain
      db.update(matchPlayers)
        .set({ eloBefore: before, eloDelta: delta })
        .where(and(eq(matchPlayers.matchId, match.id), eq(matchPlayers.userId, participant.userId)))
        .run()
      ratings.set(participant.userId, before + delta)
    }
  }

  for (const [id, elo] of ratings) {
    db.update(users).set({ elo }).where(eq(users.id, id)).run()
  }
}
