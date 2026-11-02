import { and, eq, isNull } from 'drizzle-orm'
import { groups, matches, matchPlayers, users } from '../database/schema'
import type { PlayerProfile, RankingRow } from '../../shared/models'
import type { Db } from './db'
import { listMatchViews } from './matches'

function computeRecords(db: Db): Map<number, { wins: number; losses: number }> {
  const rows = db
    .select({
      userId: matchPlayers.userId,
      side: matchPlayers.side,
      scoreA: matches.scoreA,
      scoreB: matches.scoreB,
    })
    .from(matchPlayers)
    .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
    .all()

  const records = new Map<number, { wins: number; losses: number }>()
  for (const row of rows) {
    const record = records.get(row.userId) ?? { wins: 0, losses: 0 }
    const won = row.side === 'A' ? row.scoreA > row.scoreB : row.scoreB > row.scoreA
    if (won) record.wins += 1
    else record.losses += 1
    records.set(row.userId, record)
  }
  return records
}

export function getRanking(db: Db, groupId?: number): RankingRow[] {
  const records = computeRecords(db)
  const players = db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      groupId: users.groupId,
      groupName: groups.name,
      elo: users.elo,
    })
    .from(users)
    .innerJoin(groups, eq(groups.id, users.groupId))
    .where(
      and(isNull(users.deletedAt), groupId !== undefined ? eq(users.groupId, groupId) : undefined),
    )
    .all()

  const rows = players
    .map((player) => {
      const { wins, losses } = records.get(player.id) ?? { wins: 0, losses: 0 }
      return { ...player, wins, losses, matches: wins + losses }
    })
    .filter((row) => row.matches > 0)
    .sort(
      (a, b) =>
        b.elo - a.elo ||
        a.lastName.localeCompare(b.lastName, 'fr') ||
        a.firstName.localeCompare(b.firstName, 'fr'),
    )

  let rank = 0
  return rows.map((row, index) => {
    if (rows[index - 1]?.elo !== row.elo) rank = index + 1
    return { rank, ...row }
  })
}

export function getPlayerProfile(db: Db, id: number): PlayerProfile | undefined {
  const player = db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      groupId: users.groupId,
      groupName: groups.name,
      elo: users.elo,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .innerJoin(groups, eq(groups.id, users.groupId))
    .where(eq(users.id, id))
    .get()
  if (!player) return undefined
  const { deletedAt, ...rest } = player
  return { ...rest, deleted: deletedAt !== null, history: listMatchViews(db, { userId: id }) }
}
