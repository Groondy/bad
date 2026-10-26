import type { PlayerOption } from './models'

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export interface PlayerSearchOptions {
  excludeIds?: number[]
  preferredGroupId?: number
  limit?: number
}

export function searchPlayers(
  players: PlayerOption[],
  query: string,
  options: PlayerSearchOptions = {},
): PlayerOption[] {
  const needle = normalizeText(query)
  const excluded = new Set(options.excludeIds ?? [])
  const groupRank = (player: PlayerOption) => (player.groupId === options.preferredGroupId ? 0 : 1)

  return players
    .filter((player) => !excluded.has(player.id))
    .filter(
      (player) =>
        needle === '' ||
        normalizeText(`${player.firstName} ${player.lastName}`).includes(needle) ||
        normalizeText(`${player.lastName} ${player.firstName}`).includes(needle),
    )
    .sort(
      (a, b) =>
        groupRank(a) - groupRank(b) ||
        a.lastName.localeCompare(b.lastName, 'fr') ||
        a.firstName.localeCompare(b.firstName, 'fr'),
    )
    .slice(0, options.limit ?? players.length)
}
