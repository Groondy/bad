import { describe, expect, it } from 'vitest'
import { todayInParis } from '../shared/date'
import { adminUserUpdateSchema, matchInputSchema, registerSchema } from '../shared/schemas'

const validMatch = {
  type: 'single',
  sideA: [1],
  sideB: [2],
  scoreA: 21,
  scoreB: 15,
  playedAt: '2026-10-01',
}

function errorPaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  expect(result.success).toBe(false)
  return result.error?.issues.map((issue) => issue.path.join('.')) ?? []
}

describe('todayInParis', () => {
  it("donne la date de Paris quand il est déjà le lendemain à Paris (heure d'hiver)", () => {
    expect(todayInParis(new Date('2026-10-26T23:30:00Z'))).toBe('2026-10-27')
  })

  it("donne la date de Paris quand il est déjà le lendemain à Paris (heure d'été)", () => {
    expect(todayInParis(new Date('2026-07-01T22:30:00Z'))).toBe('2026-07-02')
  })

  it('donne la même date en milieu de journée', () => {
    expect(todayInParis(new Date('2026-10-26T11:00:00Z'))).toBe('2026-10-26')
  })
})

describe('matchInputSchema', () => {
  it('accepte un simple valide', () => {
    expect(matchInputSchema.safeParse(validMatch).success).toBe(true)
  })

  it('accepte un double valide', () => {
    const result = matchInputSchema.safeParse({
      ...validMatch,
      type: 'double',
      sideA: [1, 2],
      sideB: [3, 4],
    })
    expect(result.success).toBe(true)
  })

  it("accepte la date d'aujourd'hui à Paris", () => {
    expect(matchInputSchema.safeParse({ ...validMatch, playedAt: todayInParis() }).success).toBe(
      true,
    )
  })

  it('refuse une égalité', () => {
    expect(errorPaths(matchInputSchema.safeParse({ ...validMatch, scoreB: 21 }))).toContain(
      'scoreB',
    )
  })

  it('refuse un double incomplet', () => {
    const result = matchInputSchema.safeParse({
      ...validMatch,
      type: 'double',
      sideA: [1, 2],
      sideB: [3],
    })
    expect(errorPaths(result)).toContain('sideA')
  })

  it('refuse un simple à deux joueurs par côté', () => {
    const result = matchInputSchema.safeParse({ ...validMatch, sideA: [1, 2], sideB: [3, 4] })
    expect(errorPaths(result)).toContain('sideA')
  })

  it('refuse un même joueur des deux côtés', () => {
    expect(errorPaths(matchInputSchema.safeParse({ ...validMatch, sideB: [1] }))).toContain('sideA')
  })

  it('refuse une date future', () => {
    expect(
      errorPaths(matchInputSchema.safeParse({ ...validMatch, playedAt: '2999-01-01' })),
    ).toContain('playedAt')
  })

  it('refuse une date inexistante', () => {
    expect(
      errorPaths(matchInputSchema.safeParse({ ...validMatch, playedAt: '2026-02-31' })),
    ).toContain('playedAt')
  })

  it('refuse un score négatif ou décimal', () => {
    expect(errorPaths(matchInputSchema.safeParse({ ...validMatch, scoreA: -1 }))).toContain(
      'scoreA',
    )
    expect(errorPaths(matchInputSchema.safeParse({ ...validMatch, scoreA: 20.5 }))).toContain(
      'scoreA',
    )
  })
})

describe('registerSchema', () => {
  const valid = {
    email: ' Jean.Dupont@Ecole.FR ',
    firstName: ' Jean ',
    lastName: 'Dupont',
    password: 'motdepasse',
    groupId: 1,
  }

  it("normalise l'email et les noms", () => {
    const result = registerSchema.parse(valid)
    expect(result.email).toBe('jean.dupont@ecole.fr')
    expect(result.firstName).toBe('Jean')
  })

  it('refuse un mot de passe trop court', () => {
    expect(errorPaths(registerSchema.safeParse({ ...valid, password: 'court' }))).toContain(
      'password',
    )
  })

  it("refuse l'absence de groupe", () => {
    expect(errorPaths(registerSchema.safeParse({ ...valid, groupId: 0 }))).toContain('groupId')
  })

  it('refuse un email invalide', () => {
    expect(errorPaths(registerSchema.safeParse({ ...valid, email: 'pas-un-email' }))).toContain(
      'email',
    )
  })
})

describe('adminUserUpdateSchema', () => {
  it('refuse une mise à jour vide', () => {
    expect(adminUserUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('accepte un changement de rôle seul', () => {
    expect(adminUserUpdateSchema.safeParse({ role: 'admin' }).success).toBe(true)
  })
})
