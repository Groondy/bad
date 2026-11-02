import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fetch, setup } from '@nuxt/test-utils/e2e'
import { beforeAll, describe, expect, it } from 'vitest'

const ADMIN_EMAIL = 'admin@test.fr'
const PASSWORD = 'motdepasse'

await setup({
  server: true,
  env: {
    DATABASE_PATH: join(mkdtempSync(join(tmpdir(), 'bad-api-')), 'test.db'),
    NUXT_SESSION_PASSWORD: 'secret-de-test-de-plus-de-32-caracteres',
    ADMIN_EMAIL,
  },
})

/** Appelle l'API en JSON avec le cookie de session éventuel. */
function api(path: string, options: { method?: string; body?: unknown; cookie?: string } = {}) {
  return fetch(path, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
}

interface Account {
  id: number
  cookie: string
}

async function register(name: string): Promise<Account> {
  const response = await api('/api/auth/register', {
    method: 'POST',
    body: {
      email: `${name}@test.fr`,
      firstName: name,
      lastName: 'Test',
      password: PASSWORD,
      groupId: 1,
    },
  })
  expect(response.status).toBe(200)
  const cookie = response.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')
  const { id } = (await response.json()) as { id: number }
  return { id, cookie }
}

const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

describe('routes API', () => {
  let admin: Account
  let alice: Account
  let bob: Account
  let carol: Account
  let dave: Account
  let single: (overrides?: Record<string, unknown>) => Record<string, unknown>
  let matchId: number

  beforeAll(async () => {
    admin = await register('admin')
    alice = await register('alice')
    bob = await register('bob')
    carol = await register('carol')
    dave = await register('dave')
    single = (overrides = {}) => ({
      type: 'single',
      sideA: [alice.id],
      sideB: [bob.id],
      scoreA: 21,
      scoreB: 15,
      playedAt: yesterday,
      ...overrides,
    })
    // Créé ici : le contexte de @nuxt/test-utils n'existe pas dans un beforeAll imbriqué
    const response = await api('/api/matches', {
      method: 'POST',
      body: single(),
      cookie: alice.cookie,
    })
    matchId = ((await response.json()) as { id: number }).id
  })

  describe('saisie de match', () => {
    it('refuse un visiteur non connecté', async () => {
      const response = await api('/api/matches', { method: 'POST', body: single() })
      expect(response.status).toBe(401)
    })

    // Fonctions : les comptes n'existent qu'après beforeAll
    it.each([
      ['un score à égalité', () => ({ scoreB: 21 })],
      ['un saisissant absent du match', () => ({ sideA: [carol.id] })],
      ['un double incomplet', () => ({ type: 'double' })],
      ['une date future', () => ({ playedAt: '2999-01-01' })],
    ])('refuse %s', async (_label, overrides) => {
      const response = await api('/api/matches', {
        method: 'POST',
        body: single(overrides()),
        cookie: alice.cookie,
      })
      expect(response.status).toBe(400)
    })

    it('enregistre un match valide', async () => {
      const response = await api('/api/matches', {
        method: 'POST',
        body: single(),
        cookie: alice.cookie,
      })
      expect(response.status).toBe(200)
    })
  })

  describe('modification et suppression de match', () => {
    it('refuse un joueur absent du match', async () => {
      const patch = await api(`/api/matches/${matchId}`, {
        method: 'PATCH',
        body: single({ scoreB: 3 }),
        cookie: carol.cookie,
      })
      const remove = await api(`/api/matches/${matchId}`, {
        method: 'DELETE',
        cookie: carol.cookie,
      })
      expect([patch.status, remove.status]).toEqual([403, 403])
    })

    it('laisse un participant qui n’a pas saisi le match le modifier', async () => {
      const response = await api(`/api/matches/${matchId}`, {
        method: 'PATCH',
        body: single({ scoreB: 19 }),
        cookie: bob.cookie,
      })
      expect(response.status).toBe(200)
      expect(((await response.json()) as { scoreB: number }).scoreB).toBe(19)
    })

    it('laisse un admin supprimer n’importe quel match', async () => {
      const response = await api(`/api/matches/${matchId}`, {
        method: 'DELETE',
        cookie: admin.cookie,
      })
      expect(response.status).toBe(200)
    })
  })

  describe('routes admin', () => {
    it('sont refusées à un joueur', async () => {
      const response = await api('/api/admin/users', { cookie: alice.cookie })
      expect(response.status).toBe(403)
    })

    it('sont refusées à un visiteur non connecté', async () => {
      const response = await api('/api/admin/users')
      expect(response.status).toBe(401)
    })

    it('sont accessibles à un admin', async () => {
      const response = await api('/api/admin/users', { cookie: admin.cookie })
      expect(response.status).toBe(200)
    })
  })

  describe('suppression de son compte', () => {
    it('refuse un mauvais mot de passe', async () => {
      const response = await api('/api/me', {
        method: 'DELETE',
        body: { password: 'mauvais' },
        cookie: dave.cookie,
      })
      expect(response.status).toBe(400)
    })

    it('refuse la suppression du dernier admin', async () => {
      const response = await api('/api/me', {
        method: 'DELETE',
        body: { password: PASSWORD },
        cookie: admin.cookie,
      })
      expect(response.status).toBe(400)
    })

    it('supprime le compte et empêche de s’y reconnecter', async () => {
      const response = await api('/api/me', {
        method: 'DELETE',
        body: { password: PASSWORD },
        cookie: dave.cookie,
      })
      expect(response.status).toBe(200)
      const login = await api('/api/auth/login', {
        method: 'POST',
        body: { email: 'dave@test.fr', password: PASSWORD },
      })
      expect(login.status).toBe(401)
      const oldSession = await api('/api/players', { cookie: dave.cookie })
      expect(oldSession.status).toBe(401)
    })
  })
})
