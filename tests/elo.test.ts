import { describe, expect, it } from 'vitest'
import { computeGain, expectedScore, INITIAL_ELO, K_FACTOR, teamRating } from '../server/utils/elo'

describe('constantes', () => {
  it('départ à 1000, K = 32', () => {
    expect(INITIAL_ELO).toBe(1000)
    expect(K_FACTOR).toBe(32)
  })
})

describe('expectedScore', () => {
  it('vaut 0.5 à niveau égal', () => {
    expect(expectedScore(1000, 1000)).toBe(0.5)
  })

  it('vaut 1/11 contre un joueur 400 points plus fort', () => {
    expect(expectedScore(1000, 1400)).toBeCloseTo(1 / 11, 10)
  })

  it('les deux probabilités somment à 1', () => {
    expect(expectedScore(1234, 1100) + expectedScore(1100, 1234)).toBeCloseTo(1, 10)
  })
})

describe('computeGain', () => {
  it('1000 bat 1400 : +29', () => {
    expect(computeGain(1000, 1400)).toBe(29)
  })

  it('1400 bat 1000 : +3', () => {
    expect(computeGain(1400, 1000)).toBe(3)
  })

  it('1000 bat 1000 : +16', () => {
    expect(computeGain(1000, 1000)).toBe(16)
  })

  it('ne devient jamais négatif, même pour un énorme favori', () => {
    expect(computeGain(2600, 1000)).toBeGreaterThanOrEqual(0)
  })
})

describe('teamRating', () => {
  it('fait la moyenne des deux joueurs', () => {
    expect(teamRating([1000, 1200])).toBe(1100)
  })

  it('renvoie la note du joueur seul en simple', () => {
    expect(teamRating([1234])).toBe(1234)
  })
})
