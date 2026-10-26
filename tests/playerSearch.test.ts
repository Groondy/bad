import { describe, expect, it } from 'vitest'
import type { PlayerOption } from '../shared/models'
import { normalizeText, searchPlayers } from '../shared/playerSearch'

const players: PlayerOption[] = [
  { id: 1, firstName: 'Hélène', lastName: 'Martin', groupId: 1 },
  { id: 2, firstName: 'Jean', lastName: 'Dupont', groupId: 2 },
  { id: 3, firstName: 'Zoé', lastName: 'Bernard', groupId: 2 },
  { id: 4, firstName: 'Lucas', lastName: 'André', groupId: 1 },
]

describe('normalizeText', () => {
  it('retire accents, majuscules et espaces de bord', () => {
    expect(normalizeText('  Hélène ÉLOÏSE ')).toBe('helene eloise')
  })
})

describe('searchPlayers', () => {
  it('ignore les accents et la casse', () => {
    expect(searchPlayers(players, 'helene').map((p) => p.id)).toEqual([1])
  })

  it('trouve « nom prénom » comme « prénom nom »', () => {
    expect(searchPlayers(players, 'dupont jean').map((p) => p.id)).toEqual([2])
    expect(searchPlayers(players, 'jean dup').map((p) => p.id)).toEqual([2])
  })

  it('exclut les joueurs déjà choisis', () => {
    expect(searchPlayers(players, '', { excludeIds: [1, 2] }).map((p) => p.id)).toEqual([4, 3])
  })

  it("propose d'abord le groupe préféré, puis l'ordre alphabétique du nom", () => {
    expect(searchPlayers(players, '', { preferredGroupId: 2 }).map((p) => p.id)).toEqual([3, 2, 4, 1])
  })

  it('respecte la limite', () => {
    expect(searchPlayers(players, '', { limit: 2 })).toHaveLength(2)
  })
})
