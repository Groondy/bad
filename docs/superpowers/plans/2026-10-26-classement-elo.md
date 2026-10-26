# Classement Elo du club de badminton — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Site Nuxt responsive où les membres du club s'inscrivent, saisissent leurs matchs (simple/double, un set) et consultent un classement Elo commun filtrable par groupe, avec une administration pour corriger matchs, joueurs et groupes.

**Architecture :** Application Nuxt 4 full-stack dans un seul conteneur. Les routes API Nitro (`server/api/`) sont de fines couches au-dessus de services synchrones (`server/utils/*.ts`) qui prennent la base Drizzle/SQLite en paramètre et sont testés avec Vitest sur une base en mémoire. L'Elo est recalculé en rejouant tout l'historique dans la même transaction que chaque écriture de match.

**Tech Stack :** Nuxt 4, Vue 3.5 (`<script setup lang="ts">`), TypeScript, SCSS, pnpm, Drizzle ORM + better-sqlite3, nuxt-auth-utils, zod 4, Vitest, ESLint (@nuxt/eslint) + Prettier, Docker.

**Spec :** `docs/superpowers/specs/2026-10-26-classement-elo-design.md`

## Global Constraints

- Gestionnaire de paquets : **pnpm uniquement** (jamais npm/yarn, jamais `package-lock.json`/`yarn.lock`).
- Dépendances autorisées, et aucune autre : `nuxt`, `vue`, `vue-router`, `nuxt-auth-utils`, `drizzle-orm@^0.44`, `better-sqlite3`, `zod@^4` ; dev : `drizzle-kit@^0.31`, `@types/better-sqlite3`, `vitest`, `sass`, `typescript`, `vue-tsc`, `@nuxt/eslint`, `eslint`, `prettier`.
- TypeScript partout. Composants en `<script setup lang="ts">`, props/emits typés (`defineProps<{…}>()`, `defineEmits<{…}>()`), pas de `any`.
- Style : SCSS pur, variables dans `app/assets/scss/_variables.scss`, mixins dans `_mixins.scss`, pas plus de 3 niveaux d'imbrication. Pas de Tailwind.
- Textes de l'interface en français, en tutoyant (« Complète… », « Inscris-toi »).
- Elo : départ **1000**, **K = 32** fixe, double = moyenne des deux joueurs, même Δ pour les deux.
- Format d'un match : un seul set, deux scores entiers ≥ 0 et différents, pas de limite haute.
- Dates de match : chaîne `YYYY-MM-DD`, « aujourd'hui » calculé dans le fuseau **Europe/Paris**.
- Les fichiers de `server/utils/` et `shared/` sont importés par les tests Vitest (hors Nuxt) : **pas d'auto-imports Nuxt/Nitro dedans, imports relatifs explicites**. Partout ailleurs (pages, composants, `server/api`), utiliser les auto-imports et l'alias `#shared/…`.
- Le tsconfig Nuxt 4 active `noUncheckedIndexedAccess` : un accès `tableau[i]` est de type `T | undefined`.
- Variables d'environnement : `NUXT_SESSION_PASSWORD` (≥ 32 caractères), `ADMIN_EMAIL`, `DATABASE_PATH` (défaut `data/bad.db`).
- Format des erreurs API : `{ statusCode, message, data?: { fieldErrors: Record<string, string[]> } }`.
- Écarts assumés par rapport à la spec :
  - la déconnexion utilise la route intégrée de nuxt-auth-utils (`DELETE /api/_auth/session`, via `useUserSession().clear()`) au lieu de `POST /api/auth/logout` ;
  - `GET /api/players` renvoie tous les joueurs actifs (40 environ) et la recherche se fait côté client, insensible aux accents ;
  - ajout de `GET /api/admin/users`, nécessaire à la page admin des joueurs ;
  - SQLite en mode journal par défaut (pas de WAL), pour que la sauvegarde reste la copie d'un seul fichier.

## Review Focus

1. **Match saisi entre 0 h et 2 h, heure de Paris** : le serveur tourne en UTC, mais la date « aujourd'hui » doit être celle de Paris et être acceptée. Testé dans la Task 5 (`todayInParis`).
2. **Email avec majuscules ou espaces** (` Jean@Ecole.FR `) à l'inscription et à la connexion : même compte, doublon détecté, `ADMIN_EMAIL` reconnu sans tenir compte de la casse. Testé dans les Tasks 5 et 7.
3. **Session périmée** : un admin rétrogradé ou un compte supprimé garde son cookie. Le serveur doit relire le rôle et l'état du compte en base à chaque requête. Testé dans la Task 7 (`getActiveUser`) et vérifié avec curl dans la Task 9.
4. **Correction admin d'un match impliquant un joueur supprimé depuis** : corriger le score doit rester possible, mais ajouter un joueur supprimé doit être refusé. Testé dans la Task 6.
5. **Recherche de joueur** : « helene » doit trouver « Hélène », et « dupont jean » doit trouver « Jean Dupont ». Testé dans la Task 5 (`searchPlayers`).

---

## Structure des fichiers

```
package.json, pnpm-workspace.yaml, nuxt.config.ts, tsconfig.json, vitest.config.ts,
drizzle.config.ts, eslint.config.mjs, .prettierrc, .prettierignore, .gitignore,
.env.example, Dockerfile, .dockerignore, README.md

shared/
  models.ts          types métier partagés front/serveur
  schemas.ts         schémas zod + types d'entrée
  date.ts            todayInParis()
  playerSearch.ts    normalizeText(), searchPlayers()
  types/auth.d.ts    typage de la session nuxt-auth-utils

server/
  database/schema.ts         tables Drizzle
  database/migrations/       SQL généré par drizzle-kit
  plugins/database.ts        migrations + seed au démarrage
  middleware/admin.ts        protège /api/admin/*
  utils/
    db.ts            createDb, migrateDb, seedGroups, useDb, type Db
    elo.ts           fonctions Elo pures
    recompute.ts     recomputeAll(db)
    errors.ts        ServiceError
    groups.ts        listGroups, assertGroupExists, renameGroup
    users.ts         inscription, connexion, profil, admin joueurs
    matches.ts       createMatch, updateMatch, deleteMatch, listMatchViews
    ranking.ts       getRanking, getPlayerProfile
    http.ts          parseBody, parseId, runService (Nitro uniquement)
    session.ts       requireActiveUser, requireAdmin (Nitro uniquement)
  api/…              routes (voir Tasks 9 et 10)

app/
  app.vue, layouts/default.vue
  assets/scss/_variables.scss, _mixins.scss, main.scss
  utils/apiErrors.ts, utils/format.ts
  middleware/auth.ts, middleware/admin.ts
  components/AppNav.vue, AdminNav.vue, FormField.vue, RankingTable.vue,
             MatchHistory.vue, PlayerPicker.vue, MatchForm.vue
  pages/index.vue, connexion.vue, inscription.vue, profil.vue,
        joueurs/[id].vue, matchs/nouveau.vue,
        admin/matchs.vue, admin/joueurs.vue, admin/groupes.vue

tests/
  helpers/db.ts, helpers/errors.ts
  elo.test.ts, db.test.ts, recompute.test.ts, schemas.test.ts,
  playerSearch.test.ts, matches.test.ts, users.test.ts, ranking.test.ts
```

---

### Task 1 : Initialisation du projet Nuxt

**Files :**
- Create : `package.json`, `pnpm-workspace.yaml`, `nuxt.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.gitignore`, `.env.example`, `app/app.vue`

**Interfaces :**
- Produces : scripts `pnpm dev | build | lint | format | typecheck | test | db:generate` ; `vitest.config.ts` qui cherche `tests/**/*.test.ts`.

- [ ] **Step 1 : Créer `package.json`**

```json
{
  "name": "bad-classement",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.5.1",
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "nuxt typecheck",
    "test": "vitest run",
    "db:generate": "drizzle-kit generate"
  }
}
```

- [ ] **Step 2 : Créer `pnpm-workspace.yaml`** (pnpm ≥ 11 n'exécute les scripts de build natifs que s'ils sont autorisés)

```yaml
allowBuilds:
  better-sqlite3: true
  esbuild: true
  '@parcel/watcher': true
```

- [ ] **Step 3 : Installer les dépendances**

```bash
pnpm add nuxt vue vue-router nuxt-auth-utils drizzle-orm@^0.44 better-sqlite3 zod@^4
pnpm add -D drizzle-kit@^0.31 @types/better-sqlite3 vitest sass typescript vue-tsc @nuxt/eslint eslint prettier
```

Si pnpm signale d'autres paquets dont le build a été ignoré, les ajouter à `allowBuilds` puis relancer `pnpm install`. Si `better-sqlite3` doit être compilé (pas de binaire précompilé pour la version de Node), installer `python3 make g++` dans WSL.

- [ ] **Step 4 : Créer `nuxt.config.ts`**

```ts
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  modules: ['nuxt-auth-utils', '@nuxt/eslint'],
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      titleTemplate: '%s · Bad Elo',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
})
```

- [ ] **Step 5 : Créer `tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./.nuxt/tsconfig.app.json" },
    { "path": "./.nuxt/tsconfig.server.json" },
    { "path": "./.nuxt/tsconfig.shared.json" },
    { "path": "./.nuxt/tsconfig.node.json" }
  ]
}
```

- [ ] **Step 6 : Créer `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
```

- [ ] **Step 7 : Créer `eslint.config.mjs`** (exception au « tout TypeScript » : format de config généré par @nuxt/eslint)

```js
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt()
```

- [ ] **Step 8 : Créer `.prettierrc` et `.prettierignore`**

`.prettierrc` :

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "all"
}
```

`.prettierignore` :

```
.nuxt
.output
node_modules
pnpm-lock.yaml
server/database/migrations
data
```

- [ ] **Step 9 : Créer `.gitignore` et `.env.example`**

`.gitignore` :

```
node_modules
.nuxt
.output
.data
data
.env
*.log
```

`.env.example` :

```
# Secret des sessions (≥ 32 caractères). En dev, nuxt-auth-utils le génère dans .env s'il manque.
NUXT_SESSION_PASSWORD=
# Le compte inscrit avec cet email devient admin
ADMIN_EMAIL=
# Chemin du fichier SQLite (défaut : data/bad.db)
DATABASE_PATH=data/bad.db
```

- [ ] **Step 10 : Créer `app/app.vue` provisoire**

```vue
<template>
  <main>
    <h1>Bad Elo</h1>
  </main>
</template>
```

- [ ] **Step 11 : Vérifier**

Run : `pnpm dev`, ouvrir http://localhost:3000.
Expected : la page affiche « Bad Elo ». Arrêter le serveur.

Run : `pnpm lint && pnpm typecheck`
Expected : aucune erreur.

- [ ] **Step 12 : Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml nuxt.config.ts tsconfig.json vitest.config.ts eslint.config.mjs .prettierrc .prettierignore .gitignore .env.example app/app.vue CLAUDE.md README.md .claude
git commit -m "chore: initialisation du projet Nuxt"
```

---

### Task 2 : Calcul Elo (fonctions pures)

**Files :**
- Create : `server/utils/elo.ts`
- Test : `tests/elo.test.ts`

**Interfaces :**
- Produces :
  - `INITIAL_ELO = 1000`, `K_FACTOR = 32`
  - `expectedScore(rating: number, opponentRating: number): number`
  - `computeGain(winnerRating: number, loserRating: number): number` : points gagnés par le vainqueur (entier ≥ 0) ; le perdant perd la même valeur.
  - `teamRating(ratings: number[]): number` : moyenne.

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/elo.test.ts` :

```ts
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
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run : `pnpm test tests/elo.test.ts`
Expected : FAIL, `Failed to load url ../server/utils/elo`.

- [ ] **Step 3 : Implémenter**

`server/utils/elo.ts` :

```ts
export const INITIAL_ELO = 1000
export const K_FACTOR = 32

/** Probabilité de victoire d'un joueur (ou d'une équipe) noté `rating` face à `opponentRating`. */
export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400))
}

/** Points gagnés par le vainqueur ; le perdant perd exactement la même valeur. */
export function computeGain(winnerRating: number, loserRating: number): number {
  return Math.round(K_FACTOR * (1 - expectedScore(winnerRating, loserRating)))
}

/** Note d'une équipe : moyenne de ses joueurs (un seul joueur en simple). */
export function teamRating(ratings: number[]): number {
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run : `pnpm test tests/elo.test.ts`
Expected : PASS (10 tests).

- [ ] **Step 5 : Commit**

```bash
git add server/utils/elo.ts tests/elo.test.ts
git commit -m "feat: calcul Elo (score attendu, gain, note d'équipe)"
```

---

### Task 3 : Schéma de base, connexion SQLite et migrations

**Files :**
- Create : `server/database/schema.ts`, `drizzle.config.ts`, `server/utils/db.ts`, `server/plugins/database.ts`, `server/database/migrations/*` (généré), `tests/helpers/db.ts`
- Test : `tests/db.test.ts`

**Interfaces :**
- Produces :
  - tables `groups`, `users`, `matches`, `matchPlayers` (exports de `server/database/schema.ts`)
  - `type Db` : type accepté par tous les services (base ou transaction)
  - `createDb(path: string): BetterSQLite3Database<typeof schema>`
  - `migrateDb(db: BetterSQLite3Database<typeof schema>): void`
  - `seedGroups(db: Db): void` : crée « Groupe 1 » et « Groupe 2 » si la table est vide
  - `useDb()` : instance unique, fichier `process.env.DATABASE_PATH ?? 'data/bad.db'`
  - helpers de test : `createTestDb()`, `insertUser(db, overrides?) → number`, `insertMatch(db, { sideA, sideB, scoreA, scoreB, playedAt? }) → number`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/db.test.ts` :

```ts
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { groups, users } from '../server/database/schema'
import { seedGroups } from '../server/utils/db'
import { createTestDb, insertUser } from './helpers/db'

describe('base de données', () => {
  it('applique les migrations et crée les deux groupes', () => {
    const db = createTestDb()
    expect(db.select().from(groups).all().map((g) => g.name)).toEqual(['Groupe 1', 'Groupe 2'])
  })

  it('ne recrée pas les groupes si le seed est relancé', () => {
    const db = createTestDb()
    seedGroups(db)
    expect(db.select().from(groups).all()).toHaveLength(2)
  })

  it('un nouveau joueur démarre à 1000 avec le rôle player', () => {
    const db = createTestDb()
    const id = insertUser(db)
    const user = db.select().from(users).where(eq(users.id, id)).get()
    expect(user?.elo).toBe(1000)
    expect(user?.role).toBe('player')
    expect(user?.deletedAt).toBeNull()
  })

  it('refuse deux comptes avec le même email', () => {
    const db = createTestDb()
    insertUser(db, { email: 'meme@ecole.fr' })
    expect(() => insertUser(db, { email: 'meme@ecole.fr' })).toThrow()
  })
})
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run : `pnpm test tests/db.test.ts`
Expected : FAIL (modules introuvables).

- [ ] **Step 3 : Écrire le schéma**

`server/database/schema.ts` :

```ts
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
```

- [ ] **Step 4 : Configurer drizzle-kit et générer la migration**

`drizzle.config.ts` :

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
})
```

Run : `pnpm db:generate`
Expected : création de `server/database/migrations/0000_*.sql` et `server/database/migrations/meta/`.

- [ ] **Step 5 : Écrire la connexion**

`server/utils/db.ts` :

```ts
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
```

- [ ] **Step 6 : Plugin de démarrage**

`server/plugins/database.ts` :

```ts
export default defineNitroPlugin(() => {
  const db = useDb()
  migrateDb(db)
  seedGroups(db)
})
```

- [ ] **Step 7 : Helpers de test**

`tests/helpers/db.ts` :

```ts
import { matches, matchPlayers, users } from '../../server/database/schema'
import { createDb, migrateDb, seedGroups } from '../../server/utils/db'

export function createTestDb() {
  const db = createDb(':memory:')
  migrateDb(db)
  seedGroups(db)
  return db
}

type TestDb = ReturnType<typeof createTestDb>

let counter = 0

export function insertUser(db: TestDb, overrides: Partial<typeof users.$inferInsert> = {}): number {
  counter += 1
  return db
    .insert(users)
    .values({
      email: `joueur${counter}@ecole.fr`,
      firstName: `Prénom${counter}`,
      lastName: `Nom${counter}`,
      passwordHash: 'hash',
      groupId: 1,
      ...overrides,
    })
    .returning({ id: users.id })
    .get().id
}

export function insertMatch(
  db: TestDb,
  match: { sideA: number[]; sideB: number[]; scoreA: number; scoreB: number; playedAt?: string },
): number {
  const [creator] = match.sideA
  if (creator === undefined) throw new Error('sideA vide')
  const id = db
    .insert(matches)
    .values({
      type: match.sideA.length === 1 ? 'single' : 'double',
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      playedAt: match.playedAt ?? '2026-10-01',
      createdBy: creator,
    })
    .returning({ id: matches.id })
    .get().id
  db.insert(matchPlayers)
    .values([
      ...match.sideA.map((userId) => ({ matchId: id, userId, side: 'A' as const })),
      ...match.sideB.map((userId) => ({ matchId: id, userId, side: 'B' as const })),
    ])
    .run()
  return id
}
```

- [ ] **Step 8 : Lancer le test pour vérifier qu'il passe**

Run : `pnpm test tests/db.test.ts`
Expected : PASS (4 tests).

- [ ] **Step 9 : Vérifier le démarrage réel**

Run : `pnpm dev`, attendre « Nitro server built », puis `ls data/`.
Expected : `bad.db` existe. Arrêter le serveur.

- [ ] **Step 10 : Commit**

```bash
git add server/database drizzle.config.ts server/utils/db.ts server/plugins/database.ts tests/helpers/db.ts tests/db.test.ts
git commit -m "feat: schéma SQLite, migrations et seed des groupes"
```

---

### Task 4 : Recalcul de l'Elo depuis l'historique

**Files :**
- Create : `server/utils/recompute.ts`
- Test : `tests/recompute.test.ts`

**Interfaces :**
- Consumes : `Db` (Task 3), `INITIAL_ELO`, `computeGain`, `teamRating` (Task 2).
- Produces : `recomputeAll(db: Db): void`. Rejoue tous les matchs triés par `playedAt`, puis `createdAt`, puis `id`, réécrit `matchPlayers.eloBefore` / `eloDelta` et `users.elo`. Seule fonction qui écrit des Elo.

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/recompute.test.ts` :

```ts
import { and, eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { matches, matchPlayers, users } from '../server/database/schema'
import { recomputeAll } from '../server/utils/recompute'
import { createTestDb, insertMatch, insertUser } from './helpers/db'

type TestDb = ReturnType<typeof createTestDb>

function eloOf(db: TestDb, id: number): number | undefined {
  return db.select({ elo: users.elo }).from(users).where(eq(users.id, id)).get()?.elo
}

describe('recomputeAll', () => {
  let db: TestDb
  let alice: number
  let bob: number
  let carol: number
  let dave: number

  beforeEach(() => {
    db = createTestDb()
    alice = insertUser(db)
    bob = insertUser(db)
    carol = insertUser(db)
    dave = insertUser(db)
  })

  it('met à jour les Elo et écrit eloBefore / eloDelta', () => {
    const matchId = insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 15 })
    recomputeAll(db)
    expect(eloOf(db, alice)).toBe(1016)
    expect(eloOf(db, bob)).toBe(984)
    const row = db
      .select()
      .from(matchPlayers)
      .where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.userId, bob)))
      .get()
    expect(row?.eloBefore).toBe(1000)
    expect(row?.eloDelta).toBe(-16)
  })

  it('le vainqueur peut être le côté B', () => {
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 12, scoreB: 21 })
    recomputeAll(db)
    expect(eloOf(db, alice)).toBe(984)
    expect(eloOf(db, bob)).toBe(1016)
  })

  it('enchaîne les matchs en tenant compte des Elo intermédiaires', () => {
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 15, playedAt: '2026-10-01' })
    insertMatch(db, { sideA: [carol], sideB: [alice], scoreA: 21, scoreB: 19, playedAt: '2026-10-02' })
    recomputeAll(db)
    // Carol (1000) bat Alice (1016) : gain = round(32 × (1 − 1/(1+10^(16/400)))) = 17
    expect(eloOf(db, carol)).toBe(1017)
    expect(eloOf(db, alice)).toBe(999)
    expect(eloOf(db, bob)).toBe(984)
  })

  it('un match saisi avec une date passée est rejoué à sa place', () => {
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 15, playedAt: '2026-10-10' })
    insertMatch(db, { sideA: [carol], sideB: [alice], scoreA: 21, scoreB: 19, playedAt: '2026-10-01' })
    recomputeAll(db)
    // Ordre réel : Carol bat Alice (1016/984), puis Alice (984) bat Bob (1000) : +17
    expect(eloOf(db, carol)).toBe(1016)
    expect(eloOf(db, alice)).toBe(1001)
    expect(eloOf(db, bob)).toBe(983)
  })

  it('supprimer un match intermédiaire corrige les Elo suivants', () => {
    const first = insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 15, playedAt: '2026-10-01' })
    insertMatch(db, { sideA: [carol], sideB: [alice], scoreA: 21, scoreB: 19, playedAt: '2026-10-02' })
    recomputeAll(db)
    db.delete(matches).where(eq(matches.id, first)).run()
    recomputeAll(db)
    expect(eloOf(db, alice)).toBe(984)
    expect(eloOf(db, bob)).toBe(1000)
    expect(eloOf(db, carol)).toBe(1016)
  })

  it('en double, les deux joueurs reçoivent le même delta', () => {
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 0, playedAt: '2026-10-01' })
    // Équipe Alice (1016) + Carol (1000) = 1008 contre Bob (984) + Dave (1000) = 992
    insertMatch(db, { sideA: [alice, carol], sideB: [bob, dave], scoreA: 21, scoreB: 18, playedAt: '2026-10-02' })
    recomputeAll(db)
    // gain = round(32 × (1 − 1/(1+10^(−16/400)))) = 15
    expect(eloOf(db, alice)).toBe(1031)
    expect(eloOf(db, carol)).toBe(1015)
    expect(eloOf(db, bob)).toBe(969)
    expect(eloOf(db, dave)).toBe(985)
  })

  it('remet à 1000 un joueur dont tous les matchs ont été supprimés', () => {
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 15 })
    recomputeAll(db)
    db.delete(matches).run()
    recomputeAll(db)
    expect(eloOf(db, alice)).toBe(1000)
    expect(eloOf(db, bob)).toBe(1000)
  })
})
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run : `pnpm test tests/recompute.test.ts`
Expected : FAIL (`recompute` introuvable).

- [ ] **Step 3 : Implémenter**

`server/utils/recompute.ts` :

```ts
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
    const ratingA = teamRating(participants.filter((p) => p.side === 'A').map((p) => ratingOf(p.userId)))
    const ratingB = teamRating(participants.filter((p) => p.side === 'B').map((p) => ratingOf(p.userId)))
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
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run : `pnpm test tests/recompute.test.ts`
Expected : PASS (7 tests).

- [ ] **Step 5 : Commit**

```bash
git add server/utils/recompute.ts tests/recompute.test.ts
git commit -m "feat: recalcul complet de l'Elo depuis l'historique"
```

---

### Task 5 : Types partagés, validation, date de Paris, recherche de joueurs

**Files :**
- Create : `shared/models.ts`, `shared/date.ts`, `shared/schemas.ts`, `shared/playerSearch.ts`
- Test : `tests/schemas.test.ts`, `tests/playerSearch.test.ts`

**Interfaces :**
- Produces :
  - `shared/models.ts` : `Role`, `MatchType`, `SessionUser`, `Group`, `PlayerOption`, `Participant`, `MatchView`, `RankingRow`, `PlayerProfile`, `AdminUserRow` (définitions ci-dessous)
  - `todayInParis(now?: Date): string` (`YYYY-MM-DD`)
  - schémas zod : `registerSchema`, `loginSchema`, `profileSchema`, `passwordChangeSchema`, `matchInputSchema`, `adminUserUpdateSchema`, `resetPasswordSchema`, `groupRenameSchema` ; types `RegisterInput`, `ProfileInput`, `MatchInput`, `AdminUserUpdate`
  - `normalizeText(value: string): string`, `searchPlayers(players, query, options?): PlayerOption[]`

- [ ] **Step 1 : Écrire les tests qui échouent**

`tests/schemas.test.ts` :

```ts
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
    const result = matchInputSchema.safeParse({ ...validMatch, type: 'double', sideA: [1, 2], sideB: [3, 4] })
    expect(result.success).toBe(true)
  })

  it("accepte la date d'aujourd'hui à Paris", () => {
    expect(matchInputSchema.safeParse({ ...validMatch, playedAt: todayInParis() }).success).toBe(true)
  })

  it('refuse une égalité', () => {
    expect(errorPaths(matchInputSchema.safeParse({ ...validMatch, scoreB: 21 }))).toContain('scoreB')
  })

  it('refuse un double incomplet', () => {
    const result = matchInputSchema.safeParse({ ...validMatch, type: 'double', sideA: [1, 2], sideB: [3] })
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
    expect(errorPaths(matchInputSchema.safeParse({ ...validMatch, playedAt: '2999-01-01' }))).toContain(
      'playedAt',
    )
  })

  it('refuse une date inexistante', () => {
    expect(errorPaths(matchInputSchema.safeParse({ ...validMatch, playedAt: '2026-02-31' }))).toContain(
      'playedAt',
    )
  })

  it('refuse un score négatif ou décimal', () => {
    expect(errorPaths(matchInputSchema.safeParse({ ...validMatch, scoreA: -1 }))).toContain('scoreA')
    expect(errorPaths(matchInputSchema.safeParse({ ...validMatch, scoreA: 20.5 }))).toContain('scoreA')
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
    expect(errorPaths(registerSchema.safeParse({ ...valid, password: 'court' }))).toContain('password')
  })

  it("refuse l'absence de groupe", () => {
    expect(errorPaths(registerSchema.safeParse({ ...valid, groupId: 0 }))).toContain('groupId')
  })

  it('refuse un email invalide', () => {
    expect(errorPaths(registerSchema.safeParse({ ...valid, email: 'pas-un-email' }))).toContain('email')
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
```

`tests/playerSearch.test.ts` :

```ts
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
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `pnpm test tests/schemas.test.ts tests/playerSearch.test.ts`
Expected : FAIL (modules introuvables).

- [ ] **Step 3 : Écrire `shared/models.ts`**

```ts
export type Role = 'player' | 'admin'
export type MatchType = 'single' | 'double'

export interface SessionUser {
  id: number
  firstName: string
  lastName: string
  role: Role
  groupId: number
}

export interface Group {
  id: number
  name: string
}

export interface PlayerOption {
  id: number
  firstName: string
  lastName: string
  groupId: number
}

export interface Participant {
  id: number
  firstName: string
  lastName: string
  eloBefore: number
  eloDelta: number
}

export interface MatchView {
  id: number
  type: MatchType
  playedAt: string
  scoreA: number
  scoreB: number
  createdBy: number
  sideA: Participant[]
  sideB: Participant[]
}

export interface RankingRow {
  rank: number
  id: number
  firstName: string
  lastName: string
  groupId: number
  groupName: string
  elo: number
  matches: number
  wins: number
  losses: number
}

export interface PlayerProfile {
  id: number
  firstName: string
  lastName: string
  groupId: number
  groupName: string
  elo: number
  deleted: boolean
  history: MatchView[]
}

export interface AdminUserRow {
  id: number
  email: string
  firstName: string
  lastName: string
  groupId: number
  role: Role
  elo: number
}
```

- [ ] **Step 4 : Écrire `shared/date.ts`**

```ts
const parisDate = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Date du jour à Paris au format YYYY-MM-DD (le serveur tourne en UTC). */
export function todayInParis(now: Date = new Date()): string {
  return parisDate.format(now)
}
```

- [ ] **Step 5 : Écrire `shared/schemas.ts`**

```ts
import { z } from 'zod'
import { todayInParis } from './date'

const email = z.string().trim().toLowerCase().pipe(z.email('Email invalide'))
const personName = (label: string) =>
  z.string().trim().min(1, `${label} requis`).max(50, `${label} trop long`)
const password = z.string().min(8, 'Au moins 8 caractères').max(200, 'Mot de passe trop long')
const groupId = z.number({ error: 'Choisis un groupe' }).int().positive('Choisis un groupe')
const playerId = z.number({ error: 'Joueur requis' }).int().positive('Joueur requis')
const score = z.number({ error: 'Score requis' }).int('Score entier attendu').min(0, 'Score positif attendu')

export const registerSchema = z.object({
  email,
  firstName: personName('Prénom'),
  lastName: personName('Nom'),
  password,
  groupId,
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Mot de passe requis'),
})

export const profileSchema = z.object({
  firstName: personName('Prénom'),
  lastName: personName('Nom'),
  groupId,
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: password,
})

export const matchInputSchema = z
  .object({
    type: z.enum(['single', 'double'], { error: 'Type de match invalide' }),
    sideA: z.array(playerId),
    sideB: z.array(playerId),
    scoreA: score,
    scoreB: score,
    playedAt: z.iso.date('Date invalide'),
  })
  .superRefine((match, ctx) => {
    const size = match.type === 'single' ? 1 : 2
    if (match.sideA.length !== size || match.sideB.length !== size) {
      ctx.addIssue({
        code: 'custom',
        path: ['sideA'],
        message: match.type === 'single' ? 'Un joueur par équipe en simple' : 'Deux joueurs par équipe en double',
      })
    }
    const all = [...match.sideA, ...match.sideB]
    if (new Set(all).size !== all.length) {
      ctx.addIssue({ code: 'custom', path: ['sideA'], message: 'Un joueur ne peut apparaître qu’une fois' })
    }
    if (match.scoreA === match.scoreB) {
      ctx.addIssue({ code: 'custom', path: ['scoreB'], message: 'Il ne peut pas y avoir d’égalité' })
    }
    if (match.playedAt > todayInParis()) {
      ctx.addIssue({ code: 'custom', path: ['playedAt'], message: 'La date ne peut pas être dans le futur' })
    }
  })

export const adminUserUpdateSchema = z
  .object({
    groupId: groupId.optional(),
    role: z.enum(['player', 'admin']).optional(),
  })
  .refine((update) => update.groupId !== undefined || update.role !== undefined, 'Rien à modifier')

export const resetPasswordSchema = z.object({ password })

export const groupRenameSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(30, 'Nom trop long'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type MatchInput = z.infer<typeof matchInputSchema>
export type AdminUserUpdate = z.infer<typeof adminUserUpdateSchema>
```

- [ ] **Step 6 : Écrire `shared/playerSearch.ts`**

```ts
import type { PlayerOption } from './models'

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
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
```

- [ ] **Step 7 : Lancer les tests pour vérifier qu'ils passent**

Run : `pnpm test tests/schemas.test.ts tests/playerSearch.test.ts`
Expected : PASS.

- [ ] **Step 8 : Commit**

```bash
git add shared tests/schemas.test.ts tests/playerSearch.test.ts
git commit -m "feat: types partagés, schémas de validation et recherche de joueurs"
```

---

### Task 6 : Service des matchs

**Files :**
- Create : `server/utils/errors.ts`, `server/utils/matches.ts`, `tests/helpers/errors.ts`
- Test : `tests/matches.test.ts`

**Interfaces :**
- Consumes : `Db`, tables (Task 3), `recomputeAll` (Task 4), `MatchInput`, `MatchView`, `Participant` (Task 5).
- Produces :
  - `class ServiceError extends Error { statusCode: number; field?: string }`
  - `createMatch(db: Db, input: MatchInput, actorId: number): number` (id du match)
  - `updateMatch(db: Db, matchId: number, input: MatchInput): void`
  - `deleteMatch(db: Db, matchId: number): void`
  - `listMatchViews(db: Db, filter?: { matchId?: number; userId?: number }): MatchView[]`, du plus récent au plus ancien
  - helper de test `expectServiceError(fn, statusCode, field?)`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/helpers/errors.ts` :

```ts
import { expect } from 'vitest'
import { ServiceError } from '../../server/utils/errors'

export function expectServiceError(fn: () => unknown, statusCode: number, field?: string): void {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(ServiceError)
    expect((error as ServiceError).statusCode).toBe(statusCode)
    if (field !== undefined) expect((error as ServiceError).field).toBe(field)
    return
  }
  throw new Error(`ServiceError ${statusCode} attendue, aucune erreur levée`)
}
```

`tests/matches.test.ts` :

```ts
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { matches, matchPlayers, users } from '../server/database/schema'
import { createMatch, deleteMatch, listMatchViews, updateMatch } from '../server/utils/matches'
import type { MatchInput } from '../shared/schemas'
import { createTestDb, insertUser } from './helpers/db'
import { expectServiceError } from './helpers/errors'

type TestDb = ReturnType<typeof createTestDb>

function eloOf(db: TestDb, id: number): number | undefined {
  return db.select({ elo: users.elo }).from(users).where(eq(users.id, id)).get()?.elo
}

function markDeleted(db: TestDb, id: number): void {
  db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id)).run()
}

describe('service des matchs', () => {
  let db: TestDb
  let alice: number
  let bob: number
  let carol: number
  let dave: number
  let single: (overrides?: Partial<MatchInput>) => MatchInput

  beforeEach(() => {
    db = createTestDb()
    alice = insertUser(db, { firstName: 'Alice', lastName: 'Arnaud' })
    bob = insertUser(db, { firstName: 'Bob', lastName: 'Blanc' })
    carol = insertUser(db, { firstName: 'Carol', lastName: 'Caron' })
    dave = insertUser(db, { firstName: 'Dave', lastName: 'Durand' })
    single = (overrides = {}) => ({
      type: 'single',
      sideA: [alice],
      sideB: [bob],
      scoreA: 21,
      scoreB: 15,
      playedAt: '2026-10-01',
      ...overrides,
    })
  })

  describe('createMatch', () => {
    it("enregistre le match et met à jour l'Elo", () => {
      const id = createMatch(db, single(), alice)
      expect(id).toBeGreaterThan(0)
      expect(eloOf(db, alice)).toBe(1016)
      expect(eloOf(db, bob)).toBe(984)
    })

    it('accepte que le saisissant soit dans l’équipe B', () => {
      createMatch(db, single(), bob)
      expect(eloOf(db, bob)).toBe(984)
    })

    it('refuse si le saisissant ne joue pas le match', () => {
      expectServiceError(() => createMatch(db, single(), carol), 400, 'sideA')
      expect(db.select().from(matches).all()).toHaveLength(0)
    })

    it('refuse un joueur supprimé et n’enregistre rien', () => {
      markDeleted(db, bob)
      expectServiceError(() => createMatch(db, single(), alice), 400, 'sideB')
      expect(db.select().from(matches).all()).toHaveLength(0)
      expect(db.select().from(matchPlayers).all()).toHaveLength(0)
    })

    it('refuse un joueur inexistant', () => {
      expectServiceError(() => createMatch(db, single({ sideB: [9999] }), alice), 400, 'sideB')
    })
  })

  describe('updateMatch', () => {
    it('corrige le score et recalcule', () => {
      const id = createMatch(db, single(), alice)
      updateMatch(db, id, single({ scoreA: 10, scoreB: 21 }))
      expect(eloOf(db, alice)).toBe(984)
      expect(eloOf(db, bob)).toBe(1016)
    })

    it('change les joueurs', () => {
      const id = createMatch(db, single(), alice)
      updateMatch(db, id, single({ sideB: [carol] }))
      expect(eloOf(db, bob)).toBe(1000)
      expect(eloOf(db, carol)).toBe(984)
    })

    it('accepte un joueur déjà présent dans le match même s’il a été supprimé depuis', () => {
      const id = createMatch(db, single(), alice)
      markDeleted(db, bob)
      updateMatch(db, id, single({ scoreA: 21, scoreB: 19 }))
      expect(eloOf(db, alice)).toBe(1016)
    })

    it('refuse d’ajouter un joueur supprimé', () => {
      const id = createMatch(db, single(), alice)
      markDeleted(db, carol)
      expectServiceError(() => updateMatch(db, id, single({ sideB: [carol] })), 400, 'sideB')
    })

    it('renvoie 404 pour un match inexistant', () => {
      expectServiceError(() => updateMatch(db, 9999, single()), 404)
    })
  })

  describe('deleteMatch', () => {
    it('supprime le match et recalcule', () => {
      const id = createMatch(db, single(), alice)
      deleteMatch(db, id)
      expect(db.select().from(matches).all()).toHaveLength(0)
      expect(db.select().from(matchPlayers).all()).toHaveLength(0)
      expect(eloOf(db, alice)).toBe(1000)
      expect(eloOf(db, bob)).toBe(1000)
    })

    it('renvoie 404 pour un match inexistant', () => {
      expectServiceError(() => deleteMatch(db, 9999), 404)
    })
  })

  describe('listMatchViews', () => {
    it('renvoie un match avec les joueurs, les scores et les deltas', () => {
      const id = createMatch(
        db,
        { type: 'double', sideA: [alice, carol], sideB: [bob, dave], scoreA: 21, scoreB: 17, playedAt: '2026-10-01' },
        alice,
      )
      const [view] = listMatchViews(db, { matchId: id })
      expect(view?.type).toBe('double')
      expect(view?.sideA.map((p) => p.firstName)).toEqual(['Alice', 'Carol'])
      expect(view?.sideB.map((p) => p.eloDelta)).toEqual([-16, -16])
      expect(view?.sideA.map((p) => p.eloBefore)).toEqual([1000, 1000])
    })

    it("filtre par joueur, du plus récent au plus ancien", () => {
      createMatch(db, single({ playedAt: '2026-10-01' }), alice)
      createMatch(db, single({ sideA: [carol], sideB: [dave] }), carol)
      createMatch(db, single({ playedAt: '2026-10-05' }), alice)
      const views = listMatchViews(db, { userId: alice })
      expect(views.map((v) => v.playedAt)).toEqual(['2026-10-05', '2026-10-01'])
    })

    it('renvoie une liste vide pour un joueur sans match', () => {
      expect(listMatchViews(db, { userId: dave })).toEqual([])
    })
  })
})
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run : `pnpm test tests/matches.test.ts`
Expected : FAIL (modules introuvables).

- [ ] **Step 3 : Écrire `server/utils/errors.ts`**

```ts
/** Erreur métier, convertie en erreur HTTP par runService (server/utils/http.ts). */
export class ServiceError extends Error {
  readonly statusCode: number
  readonly field?: string

  constructor(statusCode: number, message: string, field?: string) {
    super(message)
    this.name = 'ServiceError'
    this.statusCode = statusCode
    this.field = field
  }
}
```

- [ ] **Step 4 : Écrire `server/utils/matches.ts`**

```ts
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { matches, matchPlayers, users } from '../database/schema'
import type { MatchView, Participant } from '../../shared/models'
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

export function updateMatch(db: Db, matchId: number, input: MatchInput): void {
  db.transaction((tx) => {
    const existing = tx.select({ id: matches.id }).from(matches).where(eq(matches.id, matchId)).get()
    if (!existing) throw new ServiceError(404, 'Match introuvable')
    const currentIds = tx
      .select({ userId: matchPlayers.userId })
      .from(matchPlayers)
      .where(eq(matchPlayers.matchId, matchId))
      .all()
      .map((row) => row.userId)
    assertPlayersAllowed(tx, [...input.sideA, ...input.sideB], currentIds)
    tx.update(matches)
      .set({ type: input.type, scoreA: input.scoreA, scoreB: input.scoreB, playedAt: input.playedAt })
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
    const deleted = tx.delete(matches).where(eq(matches.id, matchId)).returning({ id: matches.id }).get()
    if (!deleted) throw new ServiceError(404, 'Match introuvable')
    recomputeAll(tx)
  })
}

export function listMatchViews(db: Db, filter: { matchId?: number; userId?: number } = {}): MatchView[] {
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
    .where(inArray(matchPlayers.matchId, matchRows.map((m) => m.id)))
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
```

- [ ] **Step 5 : Lancer le test pour vérifier qu'il passe**

Run : `pnpm test tests/matches.test.ts`
Expected : PASS (15 tests).

- [ ] **Step 6 : Commit**

```bash
git add server/utils/errors.ts server/utils/matches.ts tests/helpers/errors.ts tests/matches.test.ts
git commit -m "feat: service des matchs (création, correction, suppression, vues)"
```

---

### Task 7 : Services des joueurs et des groupes

**Files :**
- Create : `server/utils/groups.ts`, `server/utils/users.ts`
- Test : `tests/users.test.ts`

**Interfaces :**
- Consumes : `Db`, tables, `ServiceError`, types `SessionUser`, `PlayerOption`, `AdminUserRow`, `Group`, `Role`, `AdminUserUpdate`.
- Produces :
  - `listGroups(db): Group[]`, `assertGroupExists(db, groupId): void` (400, champ `groupId`), `renameGroup(db, id, name): Group` (404)
  - `registerUser(db, input: NewUser, passwordHash: string, adminEmail?: string): SessionUser` (409 champ `email`)
  - `findLoginAccount(db, email): { passwordHash: string; user: SessionUser } | undefined`
  - `getActiveUser(db, id): SessionUser | undefined` (relu en base, `undefined` si supprimé)
  - `getPasswordHash(db, id): string | undefined`
  - `updateProfile(db, id, input: ProfileInput): SessionUser`
  - `setPassword(db, id, passwordHash): void` (404 si inactif)
  - `listActivePlayers(db): PlayerOption[]`
  - `listUsersAdmin(db): AdminUserRow[]`
  - `updateUserAdmin(db, actorId, targetId, input: AdminUserUpdate): AdminUserRow`
  - `anonymizeUser(db, actorId, targetId): void`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/users.test.ts` :

```ts
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { matchPlayers, users } from '../server/database/schema'
import { listGroups, renameGroup } from '../server/utils/groups'
import {
  anonymizeUser,
  findLoginAccount,
  getActiveUser,
  listActivePlayers,
  registerUser,
  setPassword,
  updateProfile,
  updateUserAdmin,
} from '../server/utils/users'
import { createTestDb, insertMatch, insertUser } from './helpers/db'
import { expectServiceError } from './helpers/errors'

type TestDb = ReturnType<typeof createTestDb>

const newUser = { email: 'jean@ecole.fr', firstName: 'Jean', lastName: 'Dupont', groupId: 1 }

describe('inscription et connexion', () => {
  let db: TestDb
  beforeEach(() => {
    db = createTestDb()
  })

  it('crée un joueur avec le rôle player', () => {
    const user = registerUser(db, newUser, 'hash')
    expect(user).toMatchObject({ firstName: 'Jean', lastName: 'Dupont', role: 'player', groupId: 1 })
  })

  it("donne le rôle admin à ADMIN_EMAIL sans tenir compte de la casse ni des espaces", () => {
    expect(registerUser(db, newUser, 'hash', ' JEAN@Ecole.fr ').role).toBe('admin')
  })

  it("stocke l'email en minuscules et le retrouve à la connexion", () => {
    registerUser(db, { ...newUser, email: 'Jean@Ecole.FR' }, 'hash')
    expect(findLoginAccount(db, ' JEAN@ecole.fr ')?.passwordHash).toBe('hash')
  })

  it('refuse un email déjà utilisé, même avec une autre casse', () => {
    registerUser(db, newUser, 'hash')
    expectServiceError(() => registerUser(db, { ...newUser, email: 'JEAN@ecole.fr' }, 'hash'), 409, 'email')
  })

  it('refuse un groupe inconnu', () => {
    expectServiceError(() => registerUser(db, { ...newUser, groupId: 99 }, 'hash'), 400, 'groupId')
  })

  it('ne permet pas de se connecter à un compte supprimé', () => {
    const user = registerUser(db, newUser, 'hash')
    const adminId = insertUser(db, { role: 'admin' })
    anonymizeUser(db, adminId, user.id)
    expect(findLoginAccount(db, 'jean@ecole.fr')).toBeUndefined()
  })
})

describe('getActiveUser', () => {
  it('relit le rôle en base et ignore les comptes supprimés', () => {
    const db = createTestDb()
    const adminId = insertUser(db, { role: 'admin' })
    const playerId = insertUser(db)
    updateUserAdmin(db, adminId, playerId, { role: 'admin' })
    expect(getActiveUser(db, playerId)?.role).toBe('admin')
    updateUserAdmin(db, playerId, adminId, { role: 'player' })
    expect(getActiveUser(db, adminId)?.role).toBe('player')
    anonymizeUser(db, playerId, adminId)
    expect(getActiveUser(db, adminId)).toBeUndefined()
  })
})

describe('profil', () => {
  it('modifie le nom et le groupe', () => {
    const db = createTestDb()
    const id = insertUser(db)
    const user = updateProfile(db, id, { firstName: 'Léa', lastName: 'Petit', groupId: 2 })
    expect(user).toMatchObject({ firstName: 'Léa', lastName: 'Petit', groupId: 2 })
  })

  it('refuse un groupe inconnu', () => {
    const db = createTestDb()
    const id = insertUser(db)
    expectServiceError(() => updateProfile(db, id, { firstName: 'A', lastName: 'B', groupId: 99 }), 400, 'groupId')
  })

  it("refuse de changer le mot de passe d'un compte supprimé", () => {
    const db = createTestDb()
    const id = insertUser(db, { deletedAt: new Date() })
    expectServiceError(() => setPassword(db, id, 'nouveau'), 404)
  })
})

describe('administration des joueurs', () => {
  let db: TestDb
  let adminId: number
  let playerId: number

  beforeEach(() => {
    db = createTestDb()
    adminId = insertUser(db, { role: 'admin' })
    playerId = insertUser(db)
  })

  it('change le groupe d’un joueur', () => {
    expect(updateUserAdmin(db, adminId, playerId, { groupId: 2 }).groupId).toBe(2)
  })

  it('refuse qu’un admin retire son propre rôle', () => {
    expectServiceError(() => updateUserAdmin(db, adminId, adminId, { role: 'player' }), 400, 'role')
  })

  it('refuse qu’un admin supprime son propre compte', () => {
    expectServiceError(() => anonymizeUser(db, adminId, adminId), 400)
  })

  it('anonymise un compte en conservant ses matchs', () => {
    const other = insertUser(db)
    insertMatch(db, { sideA: [playerId], sideB: [other], scoreA: 21, scoreB: 10 })
    anonymizeUser(db, adminId, playerId)
    const row = db.select().from(users).where(eq(users.id, playerId)).get()
    expect(row).toMatchObject({ firstName: 'Joueur', lastName: 'supprimé', passwordHash: null, role: 'player' })
    expect(row?.email).not.toContain('@ecole.fr')
    expect(row?.deletedAt).not.toBeNull()
    expect(db.select().from(matchPlayers).where(eq(matchPlayers.userId, playerId)).all()).toHaveLength(1)
  })

  it('renvoie 404 pour un compte déjà supprimé', () => {
    anonymizeUser(db, adminId, playerId)
    expectServiceError(() => anonymizeUser(db, adminId, playerId), 404)
    expectServiceError(() => updateUserAdmin(db, adminId, playerId, { groupId: 2 }), 404)
  })

  it('la liste des joueurs actifs exclut les comptes supprimés', () => {
    anonymizeUser(db, adminId, playerId)
    expect(listActivePlayers(db).map((p) => p.id)).toEqual([adminId])
  })
})

describe('groupes', () => {
  it('liste et renomme les groupes', () => {
    const db = createTestDb()
    expect(renameGroup(db, 1, 'Mardi').name).toBe('Mardi')
    expect(listGroups(db).map((g) => g.name)).toEqual(['Mardi', 'Groupe 2'])
  })

  it('renvoie 404 pour un groupe inconnu', () => {
    const db = createTestDb()
    expectServiceError(() => renameGroup(db, 99, 'X'), 404)
  })
})
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run : `pnpm test tests/users.test.ts`
Expected : FAIL (modules introuvables).

- [ ] **Step 3 : Écrire `server/utils/groups.ts`**

```ts
import { asc, eq } from 'drizzle-orm'
import { groups } from '../database/schema'
import type { Group } from '../../shared/models'
import type { Db } from './db'
import { ServiceError } from './errors'

export function listGroups(db: Db): Group[] {
  return db.select().from(groups).orderBy(asc(groups.id)).all()
}

export function assertGroupExists(db: Db, groupId: number): void {
  const group = db.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).get()
  if (!group) throw new ServiceError(400, 'Groupe inconnu', 'groupId')
}

export function renameGroup(db: Db, id: number, name: string): Group {
  const group = db.update(groups).set({ name }).where(eq(groups.id, id)).returning().get()
  if (!group) throw new ServiceError(404, 'Groupe introuvable')
  return group
}
```

- [ ] **Step 4 : Écrire `server/utils/users.ts`**

```ts
import { and, asc, eq, isNull } from 'drizzle-orm'
import { users } from '../database/schema'
import type { AdminUserRow, PlayerOption, Role, SessionUser } from '../../shared/models'
import type { AdminUserUpdate, ProfileInput } from '../../shared/schemas'
import type { Db } from './db'
import { ServiceError } from './errors'
import { assertGroupExists } from './groups'

const sessionColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  role: users.role,
  groupId: users.groupId,
}

const adminColumns = { ...sessionColumns, email: users.email, elo: users.elo }

const isActive = (id: number) => and(eq(users.id, id), isNull(users.deletedAt))

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export interface NewUser {
  email: string
  firstName: string
  lastName: string
  groupId: number
}

export function registerUser(db: Db, input: NewUser, passwordHash: string, adminEmail?: string): SessionUser {
  const email = normalizeEmail(input.email)
  assertGroupExists(db, input.groupId)
  const existing = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get()
  if (existing) throw new ServiceError(409, 'Cet email est déjà utilisé', 'email')
  const role: Role = adminEmail && normalizeEmail(adminEmail) === email ? 'admin' : 'player'
  return db
    .insert(users)
    .values({
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      groupId: input.groupId,
      passwordHash,
      role,
    })
    .returning(sessionColumns)
    .get()
}

export function findLoginAccount(
  db: Db,
  email: string,
): { passwordHash: string; user: SessionUser } | undefined {
  const row = db
    .select({ ...sessionColumns, passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.email, normalizeEmail(email)), isNull(users.deletedAt)))
    .get()
  if (!row?.passwordHash) return undefined
  const { passwordHash, ...user } = row
  return { passwordHash, user }
}

export function getActiveUser(db: Db, id: number): SessionUser | undefined {
  return db.select(sessionColumns).from(users).where(isActive(id)).get()
}

export function getPasswordHash(db: Db, id: number): string | undefined {
  return db.select({ passwordHash: users.passwordHash }).from(users).where(isActive(id)).get()?.passwordHash ?? undefined
}

export function updateProfile(db: Db, id: number, input: ProfileInput): SessionUser {
  assertGroupExists(db, input.groupId)
  const user = db.update(users).set(input).where(isActive(id)).returning(sessionColumns).get()
  if (!user) throw new ServiceError(404, 'Joueur introuvable')
  return user
}

export function setPassword(db: Db, id: number, passwordHash: string): void {
  const row = db.update(users).set({ passwordHash }).where(isActive(id)).returning({ id: users.id }).get()
  if (!row) throw new ServiceError(404, 'Joueur introuvable')
}

export function listActivePlayers(db: Db): PlayerOption[] {
  return db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, groupId: users.groupId })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.lastName), asc(users.firstName))
    .all()
}

export function listUsersAdmin(db: Db): AdminUserRow[] {
  return db
    .select(adminColumns)
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.lastName), asc(users.firstName))
    .all()
}

export function updateUserAdmin(db: Db, actorId: number, targetId: number, input: AdminUserUpdate): AdminUserRow {
  if (actorId === targetId && input.role === 'player') {
    throw new ServiceError(400, 'Tu ne peux pas retirer ton propre rôle admin', 'role')
  }
  if (input.groupId !== undefined) assertGroupExists(db, input.groupId)
  const row = db.update(users).set(input).where(isActive(targetId)).returning(adminColumns).get()
  if (!row) throw new ServiceError(404, 'Joueur introuvable')
  return row
}

export function anonymizeUser(db: Db, actorId: number, targetId: number): void {
  if (actorId === targetId) throw new ServiceError(400, 'Tu ne peux pas supprimer ton propre compte')
  const row = db
    .update(users)
    .set({
      firstName: 'Joueur',
      lastName: 'supprimé',
      email: `supprime-${targetId}@invalid`,
      passwordHash: null,
      role: 'player',
      deletedAt: new Date(),
    })
    .where(isActive(targetId))
    .returning({ id: users.id })
    .get()
  if (!row) throw new ServiceError(404, 'Joueur introuvable')
}
```

- [ ] **Step 5 : Lancer le test pour vérifier qu'il passe**

Run : `pnpm test tests/users.test.ts`
Expected : PASS.

- [ ] **Step 6 : Commit**

```bash
git add server/utils/groups.ts server/utils/users.ts tests/users.test.ts
git commit -m "feat: services joueurs (inscription, profil, admin) et groupes"
```

---

### Task 8 : Classement et profil public

**Files :**
- Create : `server/utils/ranking.ts`
- Test : `tests/ranking.test.ts`

**Interfaces :**
- Consumes : `Db`, tables, `listMatchViews` (Task 6), `RankingRow`, `PlayerProfile`.
- Produces :
  - `getRanking(db: Db, groupId?: number): RankingRow[]` : joueurs actifs ayant au moins un match, triés par Elo décroissant puis nom ; rang partagé en cas d'égalité (1, 1, 3).
  - `getPlayerProfile(db: Db, id: number): PlayerProfile | undefined`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/ranking.test.ts` :

```ts
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { users } from '../server/database/schema'
import { getPlayerProfile, getRanking } from '../server/utils/ranking'
import { recomputeAll } from '../server/utils/recompute'
import { createTestDb, insertMatch, insertUser } from './helpers/db'

type TestDb = ReturnType<typeof createTestDb>

describe('classement', () => {
  let db: TestDb
  let alice: number
  let bob: number
  let carol: number
  let dave: number
  let eve: number

  beforeEach(() => {
    db = createTestDb()
    alice = insertUser(db, { lastName: 'Arnaud', groupId: 1 })
    bob = insertUser(db, { lastName: 'Blanc', groupId: 1 })
    carol = insertUser(db, { lastName: 'Caron', groupId: 2 })
    dave = insertUser(db, { lastName: 'Durand', groupId: 2 })
    eve = insertUser(db, { lastName: 'Evrard', groupId: 1 })
  })

  it('exclut les joueurs sans match et les comptes supprimés', () => {
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 15 })
    recomputeAll(db)
    db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, bob)).run()
    expect(getRanking(db).map((r) => r.id)).toEqual([alice])
    expect(getRanking(db).map((r) => r.id)).not.toContain(eve)
  })

  it('compte victoires et défaites et trie par Elo', () => {
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 15, playedAt: '2026-10-01' })
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 18, scoreB: 21, playedAt: '2026-10-02' })
    insertMatch(db, { sideA: [alice], sideB: [carol], scoreA: 21, scoreB: 3, playedAt: '2026-10-03' })
    recomputeAll(db)
    const ranking = getRanking(db)
    expect(ranking[0]).toMatchObject({ id: alice, matches: 3, wins: 2, losses: 1, groupName: 'Groupe 1' })
    expect(ranking.map((r) => r.elo)).toEqual([...ranking.map((r) => r.elo)].sort((a, b) => b - a))
  })

  it('filtre par groupe', () => {
    insertMatch(db, { sideA: [alice], sideB: [carol], scoreA: 21, scoreB: 15 })
    insertMatch(db, { sideA: [carol], sideB: [dave], scoreA: 21, scoreB: 15 })
    recomputeAll(db)
    expect(getRanking(db, 2).map((r) => r.id).sort()).toEqual([carol, dave].sort())
  })

  it('donne le même rang aux Elo égaux', () => {
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 15 })
    insertMatch(db, { sideA: [carol], sideB: [dave], scoreA: 21, scoreB: 15 })
    recomputeAll(db)
    expect(getRanking(db).map((r) => r.rank)).toEqual([1, 1, 3, 3])
  })
})

describe('profil public', () => {
  it("renvoie l'Elo, le groupe et l'historique", () => {
    const db = createTestDb()
    const alice = insertUser(db)
    const bob = insertUser(db)
    insertMatch(db, { sideA: [alice], sideB: [bob], scoreA: 21, scoreB: 15, playedAt: '2026-10-01' })
    insertMatch(db, { sideA: [bob], sideB: [alice], scoreA: 21, scoreB: 15, playedAt: '2026-10-03' })
    recomputeAll(db)
    const profile = getPlayerProfile(db, alice)
    expect(profile).toMatchObject({ id: alice, groupName: 'Groupe 1', deleted: false })
    expect(profile?.history.map((m) => m.playedAt)).toEqual(['2026-10-03', '2026-10-01'])
  })

  it('renvoie undefined pour un joueur inconnu', () => {
    expect(getPlayerProfile(createTestDb(), 9999)).toBeUndefined()
  })
})
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run : `pnpm test tests/ranking.test.ts`
Expected : FAIL (module introuvable).

- [ ] **Step 3 : Implémenter**

`server/utils/ranking.ts` :

```ts
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
    .where(and(isNull(users.deletedAt), groupId !== undefined ? eq(users.groupId, groupId) : undefined))
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
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run : `pnpm test tests/ranking.test.ts`
Expected : PASS (6 tests).

- [ ] **Step 5 : Lancer toute la suite**

Run : `pnpm test`
Expected : tous les fichiers PASS.

- [ ] **Step 6 : Commit**

```bash
git add server/utils/ranking.ts tests/ranking.test.ts
git commit -m "feat: classement filtrable et profil public"
```

---

### Task 9 : API d'authentification, session et protection admin

**Files :**
- Create : `shared/types/auth.d.ts`, `server/utils/http.ts`, `server/utils/session.ts`, `server/middleware/admin.ts`, `server/api/auth/register.post.ts`, `server/api/auth/login.post.ts`, `server/api/groups.get.ts`

**Interfaces :**
- Consumes : services des Tasks 3 à 7.
- Produces :
  - `parseBody<T extends z.ZodType>(event, schema: T): Promise<z.output<T>>` : 400 avec `data.fieldErrors`
  - `parseId(event): number` : 404 si `:id` n'est pas un entier positif
  - `runService<T>(fn: () => T): T` : convertit `ServiceError` en erreur HTTP
  - `requireActiveUser(event): Promise<SessionUser>` : 401 et suppression du cookie si l'utilisateur est absent ou supprimé ; rôle relu en base
  - `requireAdmin(event): Promise<SessionUser>` : 403 si l'utilisateur n'est pas admin
  - Routes : `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/groups`. La session (`useUserSession().user`) a le type `SessionUser`.

- [ ] **Step 1 : Typage de la session**

`shared/types/auth.d.ts` :

```ts
declare module '#auth-utils' {
  interface User {
    id: number
    firstName: string
    lastName: string
    role: 'player' | 'admin'
    groupId: number
  }
}

export {}
```

- [ ] **Step 2 : Helpers HTTP**

`server/utils/http.ts` :

```ts
import type { H3Event } from 'h3'
import { z } from 'zod'
import { ServiceError } from './errors'

export async function parseBody<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.output<T>> {
  const result = schema.safeParse(await readBody(event))
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Données invalides',
      data: { fieldErrors: z.flattenError(result.error).fieldErrors },
    })
  }
  return result.data
}

export function parseId(event: H3Event): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 404, message: 'Introuvable' })
  return id
}

export function runService<T>(fn: () => T): T {
  try {
    return fn()
  } catch (error) {
    if (error instanceof ServiceError) {
      throw createError({
        statusCode: error.statusCode,
        message: error.message,
        data: error.field ? { fieldErrors: { [error.field]: [error.message] } } : undefined,
      })
    }
    throw error
  }
}
```

- [ ] **Step 3 : Helpers de session**

`server/utils/session.ts` :

```ts
import type { H3Event } from 'h3'
import type { SessionUser } from '../../shared/models'

/** Relit l'utilisateur en base : un compte supprimé ou rétrogradé ne garde pas ses droits. */
export async function requireActiveUser(event: H3Event): Promise<SessionUser> {
  const session = await getUserSession(event)
  const user = session.user ? getActiveUser(useDb(), session.user.id) : undefined
  if (!user) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, message: 'Connexion requise' })
  }
  return user
}

export async function requireAdmin(event: H3Event): Promise<SessionUser> {
  const user = await requireActiveUser(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: 'Accès réservé aux admins' })
  return user
}
```

- [ ] **Step 4 : Middleware admin**

`server/middleware/admin.ts` :

```ts
export default defineEventHandler(async (event) => {
  if (event.path.startsWith('/api/admin')) await requireAdmin(event)
})
```

- [ ] **Step 5 : Routes d'authentification et des groupes**

`server/api/auth/register.post.ts` :

```ts
import { registerSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const { password, ...input } = await parseBody(event, registerSchema)
  const passwordHash = await hashPassword(password)
  const user = runService(() => registerUser(useDb(), input, passwordHash, process.env.ADMIN_EMAIL))
  await setUserSession(event, { user })
  return user
})
```

`server/api/auth/login.post.ts` :

```ts
import { loginSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const { email, password } = await parseBody(event, loginSchema)
  const account = findLoginAccount(useDb(), email)
  if (!account || !(await verifyPassword(account.passwordHash, password))) {
    throw createError({ statusCode: 401, message: 'Email ou mot de passe incorrect' })
  }
  await setUserSession(event, { user: account.user })
  return account.user
})
```

`server/api/groups.get.ts` :

```ts
export default defineEventHandler(() => listGroups(useDb()))
```

- [ ] **Step 6 : Vérifier avec curl**

Créer `.env` avec `ADMIN_EMAIL=admin@test.fr` (et laisser nuxt-auth-utils générer `NUXT_SESSION_PASSWORD`). Supprimer `data/bad.db` s'il existe, lancer `pnpm dev`, puis dans un autre terminal :

```bash
C=$(mktemp -d)
J='content-type: application/json'
curl -s localhost:3000/api/groups
# Expected : [{"id":1,"name":"Groupe 1"},{"id":2,"name":"Groupe 2"}]

curl -s -c $C/admin -H "$J" -d '{"email":" Admin@Test.fr ","firstName":"Ada","lastName":"Admin","password":"motdepasse1","groupId":1}' localhost:3000/api/auth/register
# Expected : {"id":1,...,"role":"admin","groupId":1}

curl -s -c $C/bob -H "$J" -d '{"email":"bob@test.fr","firstName":"Bob","lastName":"Blanc","password":"motdepasse2","groupId":2}' localhost:3000/api/auth/register
# Expected : {"id":2,...,"role":"player"}

curl -s -H "$J" -d '{"email":"BOB@test.fr","firstName":"B","lastName":"B","password":"motdepasse2","groupId":2}' localhost:3000/api/auth/register
# Expected : statusCode 409, data.fieldErrors.email

curl -s -H "$J" -d '{"email":"bob@test.fr","password":"mauvais"}' localhost:3000/api/auth/login
# Expected : statusCode 401 "Email ou mot de passe incorrect"

curl -s -c $C/bob -H "$J" -d '{"email":"BOB@test.fr","password":"motdepasse2"}' localhost:3000/api/auth/login
# Expected : utilisateur Bob

curl -s -b $C/bob localhost:3000/api/admin/matches
# Expected : statusCode 403 (la route n'existe pas encore, mais le middleware répond avant)

curl -s localhost:3000/api/admin/matches
# Expected : statusCode 401
```

- [ ] **Step 7 : Lint, typecheck, commit**

Run : `pnpm lint && pnpm typecheck && pnpm test`
Expected : aucune erreur.

```bash
git add shared/types/auth.d.ts server/utils/http.ts server/utils/session.ts server/middleware/admin.ts server/api
git commit -m "feat: API d'inscription/connexion, sessions et protection admin"
```

---

### Task 10 : Routes API joueurs, matchs, profil et admin

**Files :**
- Create :
  - `server/api/ranking.get.ts`, `server/api/players/index.get.ts`, `server/api/players/[id].get.ts`
  - `server/api/matches.post.ts`, `server/api/me.patch.ts`, `server/api/me/password.patch.ts`
  - `server/api/admin/matches.get.ts`, `server/api/admin/matches/[id].patch.ts`, `server/api/admin/matches/[id].delete.ts`
  - `server/api/admin/users.get.ts`, `server/api/admin/users/[id].patch.ts`, `server/api/admin/users/[id].delete.ts`, `server/api/admin/users/[id]/reset-password.post.ts`
  - `server/api/admin/groups/[id].patch.ts`

**Interfaces :**
- Consumes : helpers de la Task 9 et services des Tasks 6 à 8.
- Produces (utilisées par le front) :
  - `GET /api/ranking?group=` → `RankingRow[]`
  - `GET /api/players` → `PlayerOption[]` (connecté)
  - `GET /api/players/:id` → `PlayerProfile`
  - `POST /api/matches` → `MatchView`
  - `PATCH /api/me` → `SessionUser`
  - `PATCH /api/me/password` → `{ ok: true }`
  - `GET /api/admin/matches` → `MatchView[]`
  - `PATCH /api/admin/matches/:id` → `MatchView`
  - `DELETE /api/admin/matches/:id` → `{ ok: true }`
  - `GET /api/admin/users` → `AdminUserRow[]`
  - `PATCH /api/admin/users/:id` → `AdminUserRow`
  - `DELETE /api/admin/users/:id` → `{ ok: true }`
  - `POST /api/admin/users/:id/reset-password` → `{ ok: true }`
  - `PATCH /api/admin/groups/:id` → `Group`

- [ ] **Step 1 : Routes publiques et joueurs**

`server/api/ranking.get.ts` :

```ts
export default defineEventHandler((event) => {
  const group = Number(getQuery(event).group)
  return getRanking(useDb(), Number.isInteger(group) && group > 0 ? group : undefined)
})
```

`server/api/players/index.get.ts` :

```ts
export default defineEventHandler(async (event) => {
  await requireActiveUser(event)
  return listActivePlayers(useDb())
})
```

`server/api/players/[id].get.ts` :

```ts
export default defineEventHandler((event) => {
  const profile = getPlayerProfile(useDb(), parseId(event))
  if (!profile) throw createError({ statusCode: 404, message: 'Joueur introuvable' })
  return profile
})
```

- [ ] **Step 2 : Saisie de match et profil**

`server/api/matches.post.ts` :

```ts
import { matchInputSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const actor = await requireActiveUser(event)
  const input = await parseBody(event, matchInputSchema)
  const db = useDb()
  const id = runService(() => createMatch(db, input, actor.id))
  return listMatchViews(db, { matchId: id })[0]
})
```

`server/api/me.patch.ts` :

```ts
import { profileSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const actor = await requireActiveUser(event)
  const input = await parseBody(event, profileSchema)
  const user = runService(() => updateProfile(useDb(), actor.id, input))
  await replaceUserSession(event, { user })
  return user
})
```

`server/api/me/password.patch.ts` :

```ts
import { passwordChangeSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const actor = await requireActiveUser(event)
  const { currentPassword, newPassword } = await parseBody(event, passwordChangeSchema)
  const db = useDb()
  const hash = getPasswordHash(db, actor.id)
  if (!hash || !(await verifyPassword(hash, currentPassword))) {
    const message = 'Mot de passe actuel incorrect'
    throw createError({ statusCode: 400, message, data: { fieldErrors: { currentPassword: [message] } } })
  }
  const newHash = await hashPassword(newPassword)
  runService(() => setPassword(db, actor.id, newHash))
  return { ok: true }
})
```

- [ ] **Step 3 : Routes admin des matchs**

`server/api/admin/matches.get.ts` :

```ts
export default defineEventHandler(() => listMatchViews(useDb()))
```

`server/api/admin/matches/[id].patch.ts` :

```ts
import { matchInputSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const input = await parseBody(event, matchInputSchema)
  const db = useDb()
  runService(() => updateMatch(db, id, input))
  return listMatchViews(db, { matchId: id })[0]
})
```

`server/api/admin/matches/[id].delete.ts` :

```ts
export default defineEventHandler((event) => {
  const id = parseId(event)
  runService(() => deleteMatch(useDb(), id))
  return { ok: true }
})
```

- [ ] **Step 4 : Routes admin des joueurs et des groupes**

`server/api/admin/users.get.ts` :

```ts
export default defineEventHandler(() => listUsersAdmin(useDb()))
```

`server/api/admin/users/[id].patch.ts` :

```ts
import { adminUserUpdateSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = parseId(event)
  const input = await parseBody(event, adminUserUpdateSchema)
  return runService(() => updateUserAdmin(useDb(), actor.id, id, input))
})
```

`server/api/admin/users/[id].delete.ts` :

```ts
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = parseId(event)
  runService(() => anonymizeUser(useDb(), actor.id, id))
  return { ok: true }
})
```

`server/api/admin/users/[id]/reset-password.post.ts` :

```ts
import { resetPasswordSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const { password } = await parseBody(event, resetPasswordSchema)
  const passwordHash = await hashPassword(password)
  runService(() => setPassword(useDb(), id, passwordHash))
  return { ok: true }
})
```

`server/api/admin/groups/[id].patch.ts` :

```ts
import { groupRenameSchema } from '#shared/schemas'

export default defineEventHandler(async (event) => {
  const id = parseId(event)
  const { name } = await parseBody(event, groupRenameSchema)
  return runService(() => renameGroup(useDb(), id, name))
})
```

- [ ] **Step 5 : Vérifier avec curl** (reprend les comptes et cookies de la Task 9 ; refaire les étapes d'inscription si la base a été supprimée)

```bash
curl -s -b $C/bob -H "$J" -d '{"type":"single","sideA":[2],"sideB":[1],"scoreA":21,"scoreB":17,"playedAt":"2026-10-20"}' localhost:3000/api/matches
# Expected : MatchView, sideA[0].eloDelta = 16, sideB[0].eloDelta = -16

curl -s -b $C/bob -H "$J" -d '{"type":"single","sideA":[2],"sideB":[1],"scoreA":21,"scoreB":21,"playedAt":"2026-10-20"}' localhost:3000/api/matches
# Expected : 400, data.fieldErrors.scoreB

curl -s localhost:3000/api/ranking
# Expected : Bob 1016 rang 1, Ada 984 rang 2

curl -s "localhost:3000/api/ranking?group=1"
# Expected : seulement Ada

curl -s -X DELETE -b $C/admin localhost:3000/api/admin/matches/1
# Expected : {"ok":true} ; /api/ranking renvoie alors []

curl -s -X PATCH -b $C/admin -H "$J" -d '{"role":"admin"}' localhost:3000/api/admin/users/2
curl -s -X PATCH -b $C/admin -H "$J" -d '{"role":"player"}' localhost:3000/api/admin/users/2
curl -s -b $C/bob localhost:3000/api/admin/users
# Expected : 403 — Bob a été rétrogradé, même si son cookie date d'avant (Review Focus 3)

curl -s -X DELETE -b $C/admin localhost:3000/api/admin/users/2
curl -s -b $C/bob localhost:3000/api/players
# Expected : 401 — compte supprimé, cookie invalidé (Review Focus 3)
```

- [ ] **Step 6 : Lint, typecheck, commit**

Run : `pnpm lint && pnpm typecheck && pnpm test`
Expected : aucune erreur.

```bash
git add server/api
git commit -m "feat: routes API classement, matchs, profil et administration"
```

---

### Task 11 : Base du front (styles, layout, navigation, connexion, inscription)

**Files :**
- Create : `app/assets/scss/_variables.scss`, `app/assets/scss/_mixins.scss`, `app/assets/scss/main.scss`, `app/layouts/default.vue`, `app/components/AppNav.vue`, `app/components/FormField.vue`, `app/utils/apiErrors.ts`, `app/utils/format.ts`, `app/middleware/auth.ts`, `app/middleware/admin.ts`, `app/pages/connexion.vue`, `app/pages/inscription.vue`, `app/pages/index.vue` (provisoire)
- Modify : `nuxt.config.ts`, `app/app.vue`

**Interfaces :**
- Produces (auto-importés) :
  - `getFieldErrors(error: unknown): Record<string, string>`, `getErrorMessage(error: unknown, fallback?: string): string`
  - `formatDate(iso: string): string`, `formatDelta(delta: number): string`
  - composant `<FormField label error?>` (slot = champ)
  - middlewares de route `auth` et `admin`
  - classes globales : `.container`, `.card`, `.form`, `.btn`, `.btn--primary`, `.btn--danger`, `.btn--block`, `.alert`, `.success`, `.muted`, `.delta--up`, `.delta--down`, `.actions`

- [ ] **Step 1 : Variables et mixins SCSS**

`app/assets/scss/_variables.scss` :

```scss
$color-primary: #0f766e;
$color-primary-dark: #115e59;
$color-bg: #f8fafc;
$color-surface: #ffffff;
$color-text: #0f172a;
$color-muted: #64748b;
$color-border: #e2e8f0;
$color-success: #15803d;
$color-success-bg: #f0fdf4;
$color-danger: #b91c1c;
$color-danger-bg: #fef2f2;

$radius: 8px;
$space-1: 4px;
$space-2: 8px;
$space-3: 12px;
$space-4: 16px;
$space-6: 24px;
$space-8: 32px;

$font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
$breakpoint-md: 768px;
$tabbar-height: 64px;
```

`app/assets/scss/_mixins.scss` :

```scss
@use 'variables' as *;

@mixin md-up {
  @media (min-width: $breakpoint-md) {
    @content;
  }
}

@mixin card {
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius;
  padding: $space-4;
}
```

- [ ] **Step 2 : Styles globaux**

`app/assets/scss/main.scss` (variables et mixins y sont injectés par la config Vite) :

```scss
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: $font-family;
  font-size: 16px;
  line-height: 1.5;
  background: $color-bg;
  color: $color-text;
}

a {
  color: $color-primary;
}

h1 {
  font-size: 1.5rem;
  margin: 0 0 $space-4;
}

h2 {
  font-size: 1.15rem;
  margin: $space-6 0 $space-3;
}

input,
select {
  width: 100%;
  min-height: 44px;
  padding: $space-2 $space-3;
  font: inherit;
  color: $color-text;
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius;
}

fieldset {
  margin: 0;
  padding: 0;
  border: 0;
}

legend {
  font-weight: 700;
  margin-bottom: $space-2;
}

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: $space-4;
}

.card {
  @include card;
}

.form {
  display: grid;
  gap: $space-4;
  max-width: 440px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 $space-4;
  font: inherit;
  color: $color-text;
  text-decoration: none;
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &--primary {
    color: #fff;
    background: $color-primary;
    border-color: $color-primary;
  }

  &--danger {
    color: $color-danger;
    border-color: $color-danger;
  }

  &--block {
    width: 100%;
  }
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  margin-top: $space-4;
}

.alert {
  padding: $space-3;
  color: $color-danger;
  background: $color-danger-bg;
  border-radius: $radius;
}

.success {
  padding: $space-3;
  color: $color-success;
  background: $color-success-bg;
  border-radius: $radius;
}

.muted {
  color: $color-muted;
}

.delta--up {
  color: $color-success;
  font-weight: 700;
}

.delta--down {
  color: $color-danger;
  font-weight: 700;
}
```

- [ ] **Step 3 : Brancher le SCSS dans `nuxt.config.ts`**

Ajouter dans l'objet passé à `defineNuxtConfig`, après `devtools` :

```ts
  css: ['~/assets/scss/main.scss'],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/variables" as *; @use "~/assets/scss/mixins" as *;',
        },
      },
    },
  },
```

- [ ] **Step 4 : Utilitaires front**

`app/utils/apiErrors.ts` :

```ts
interface ApiErrorBody {
  message?: string
  data?: { fieldErrors?: Record<string, string[] | undefined> }
}

function errorBody(error: unknown): ApiErrorBody | undefined {
  return (error as { data?: ApiErrorBody } | null)?.data
}

/** Premier message d'erreur de chaque champ renvoyé par l'API. */
export function getFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [field, messages] of Object.entries(errorBody(error)?.data?.fieldErrors ?? {})) {
    const [first] = messages ?? []
    if (first) result[field] = first
  }
  return result
}

export function getErrorMessage(error: unknown, fallback = 'Une erreur est survenue, réessaie.'): string {
  return errorBody(error)?.message ?? fallback
}
```

`app/utils/format.ts` :

```ts
export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`
}
```

- [ ] **Step 5 : Middlewares de route**

`app/middleware/auth.ts` :

```ts
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) return navigateTo({ path: '/connexion', query: { redirect: to.fullPath } })
})
```

`app/middleware/admin.ts` :

```ts
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value) return navigateTo({ path: '/connexion', query: { redirect: to.fullPath } })
  if (user.value?.role !== 'admin') return navigateTo('/')
})
```

- [ ] **Step 6 : `FormField`**

`app/components/FormField.vue` :

```vue
<script setup lang="ts">
defineProps<{
  label: string
  error?: string
}>()
</script>

<template>
  <label class="field">
    <span class="field__label">{{ label }}</span>
    <slot />
    <span v-if="error" class="field__error">{{ error }}</span>
  </label>
</template>

<style scoped lang="scss">
.field {
  display: grid;
  gap: $space-1;
}

.field__label {
  font-size: 0.9rem;
  font-weight: 600;
}

.field__error {
  font-size: 0.85rem;
  color: $color-danger;
}
</style>
```

- [ ] **Step 7 : Navigation et layout**

`app/components/AppNav.vue` :

```vue
<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()
const isAdmin = computed(() => user.value?.role === 'admin')

async function logout() {
  await clear()
  await navigateTo('/')
}
</script>

<template>
  <header class="topbar">
    <div class="topbar__inner">
      <NuxtLink to="/" class="topbar__brand">🏸 Bad Elo</NuxtLink>
      <nav class="topbar__links" aria-label="Navigation principale">
        <NuxtLink to="/" class="topbar__link topbar__link--desktop">Classement</NuxtLink>
        <template v-if="loggedIn">
          <NuxtLink to="/matchs/nouveau" class="btn btn--primary topbar__link--desktop">
            Saisir un match
          </NuxtLink>
          <NuxtLink to="/profil" class="topbar__link topbar__link--desktop">Profil</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin/matchs" class="topbar__link">Admin</NuxtLink>
          <button type="button" class="topbar__link topbar__logout" @click="logout">Déconnexion</button>
        </template>
        <template v-else>
          <NuxtLink to="/connexion" class="topbar__link">Connexion</NuxtLink>
          <NuxtLink to="/inscription" class="topbar__link topbar__link--desktop">Inscription</NuxtLink>
        </template>
      </nav>
    </div>
  </header>

  <nav class="tabbar" aria-label="Navigation mobile">
    <NuxtLink to="/" class="tabbar__item">Classement</NuxtLink>
    <template v-if="loggedIn">
      <NuxtLink to="/matchs/nouveau" class="tabbar__item tabbar__item--cta">+ Match</NuxtLink>
      <NuxtLink to="/profil" class="tabbar__item">Profil</NuxtLink>
    </template>
    <NuxtLink v-else to="/inscription" class="tabbar__item tabbar__item--cta">Inscription</NuxtLink>
  </nav>
</template>

<style scoped lang="scss">
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: $color-surface;
  border-bottom: 1px solid $color-border;
}

.topbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 960px;
  margin: 0 auto;
  padding: $space-2 $space-4;
}

.topbar__brand {
  font-weight: 800;
  color: $color-text;
  text-decoration: none;
}

.topbar__links {
  display: flex;
  align-items: center;
  gap: $space-4;
}

.topbar__link {
  padding: 0;
  font: inherit;
  color: $color-text;
  text-decoration: none;
  background: none;
  border: 0;
  cursor: pointer;

  &.router-link-exact-active {
    color: $color-primary;
    font-weight: 700;
  }
}

.topbar__link--desktop {
  display: none;

  @include md-up {
    display: inline-flex;
  }
}

.topbar__logout {
  color: $color-muted;
}

.tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  display: flex;
  height: $tabbar-height;
  background: $color-surface;
  border-top: 1px solid $color-border;

  @include md-up {
    display: none;
  }
}

.tabbar__item {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: $color-muted;
  text-decoration: none;

  &.router-link-exact-active {
    color: $color-primary;
  }

  &--cta {
    margin: $space-2;
    color: #fff;
    background: $color-primary;
    border-radius: $radius;

    &.router-link-exact-active {
      color: #fff;
      background: $color-primary-dark;
    }
  }
}
</style>
```

`app/layouts/default.vue` :

```vue
<template>
  <div>
    <AppNav />
    <main class="container layout__main">
      <slot />
    </main>
  </div>
</template>

<style scoped lang="scss">
.layout__main {
  padding-bottom: calc(#{$tabbar-height} + #{$space-6});

  @include md-up {
    padding-bottom: $space-8;
  }
}
</style>
```

`app/app.vue` (remplace le contenu provisoire) :

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

`app/pages/index.vue` (provisoire, remplacé à la Task 12) :

```vue
<script setup lang="ts">
useHead({ title: 'Classement' })
</script>

<template>
  <h1>Classement</h1>
</template>
```

- [ ] **Step 8 : Page de connexion**

`app/pages/connexion.vue` :

```vue
<script setup lang="ts">
useHead({ title: 'Connexion' })

const route = useRoute()
const { fetch: refreshSession } = useUserSession()

const form = reactive({ email: '', password: '' })
const errors = ref<Record<string, string>>({})
const message = ref('')
const pending = ref(false)

function safeRedirect(): string {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/'
}

async function submit() {
  pending.value = true
  errors.value = {}
  message.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: form })
    await refreshSession()
    await navigateTo(safeRedirect())
  } catch (error) {
    errors.value = getFieldErrors(error)
    message.value = getErrorMessage(error)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section>
    <h1>Connexion</h1>
    <form class="form card" novalidate @submit.prevent="submit">
      <FormField label="Email" :error="errors.email">
        <input v-model="form.email" type="email" autocomplete="email" required />
      </FormField>
      <FormField label="Mot de passe" :error="errors.password">
        <input v-model="form.password" type="password" autocomplete="current-password" required />
      </FormField>
      <p v-if="message && Object.keys(errors).length === 0" class="alert">{{ message }}</p>
      <button type="submit" class="btn btn--primary btn--block" :disabled="pending">
        {{ pending ? 'Connexion…' : 'Se connecter' }}
      </button>
      <p class="muted">
        Pas encore de compte ? <NuxtLink to="/inscription">Inscris-toi</NuxtLink>.<br />
        Mot de passe oublié ? Demande à un admin de le réinitialiser.
      </p>
    </form>
  </section>
</template>
```

- [ ] **Step 9 : Page d'inscription**

`app/pages/inscription.vue` :

```vue
<script setup lang="ts">
import type { Group } from '#shared/models'

useHead({ title: 'Inscription' })

const { fetch: refreshSession } = useUserSession()
const { data: groups } = await useFetch<Group[]>('/api/groups', { default: () => [] })

const form = reactive({ email: '', firstName: '', lastName: '', password: '', groupId: 0 })
const errors = ref<Record<string, string>>({})
const message = ref('')
const pending = ref(false)

async function submit() {
  pending.value = true
  errors.value = {}
  message.value = ''
  try {
    await $fetch('/api/auth/register', { method: 'POST', body: form })
    await refreshSession()
    await navigateTo('/')
  } catch (error) {
    errors.value = getFieldErrors(error)
    message.value = getErrorMessage(error)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section>
    <h1>Inscription</h1>
    <form class="form card" novalidate @submit.prevent="submit">
      <FormField label="Email" :error="errors.email">
        <input v-model="form.email" type="email" autocomplete="email" required />
      </FormField>
      <FormField label="Prénom" :error="errors.firstName">
        <input v-model="form.firstName" type="text" autocomplete="given-name" required />
      </FormField>
      <FormField label="Nom" :error="errors.lastName">
        <input v-model="form.lastName" type="text" autocomplete="family-name" required />
      </FormField>
      <FormField label="Mot de passe (8 caractères minimum)" :error="errors.password">
        <input v-model="form.password" type="password" autocomplete="new-password" required />
      </FormField>
      <FormField label="Ta séance" :error="errors.groupId">
        <select v-model.number="form.groupId" required>
          <option :value="0" disabled>Choisis ton groupe</option>
          <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
        </select>
      </FormField>
      <p v-if="message && Object.keys(errors).length === 0" class="alert">{{ message }}</p>
      <button type="submit" class="btn btn--primary btn--block" :disabled="pending">
        {{ pending ? 'Création…' : 'Créer mon compte' }}
      </button>
      <p class="muted">Déjà inscrit ? <NuxtLink to="/connexion">Connecte-toi</NuxtLink>.</p>
    </form>
  </section>
</template>
```

- [ ] **Step 10 : Vérifier dans le navigateur**

Run : `pnpm dev`, ouvrir http://localhost:3000 avec les outils de développement en mode mobile (375 px de large).
Expected :
- mobile : barre d'onglets en bas (Classement, Inscription), pas de défilement horizontal ;
- desktop (≥ 768 px) : barre d'onglets masquée, liens dans la barre du haut ;
- l'inscription avec un email déjà pris affiche « Cet email est déjà utilisé » sous le champ email ;
- l'inscription valide connecte l'utilisateur et la barre affiche « + Match », « Profil », « Déconnexion » ;
- après « Déconnexion », un nouvel essai de connexion avec un mauvais mot de passe affiche « Email ou mot de passe incorrect » ;
- `/connexion?redirect=//exemple.com` redirige vers `/` après connexion.

- [ ] **Step 11 : Lint, typecheck, commit**

Run : `pnpm lint && pnpm typecheck`
Expected : aucune erreur.

```bash
git add app nuxt.config.ts
git commit -m "feat: base du front, navigation responsive, connexion et inscription"
```

---

### Task 12 : Page du classement et profil joueur

**Files :**
- Create : `app/components/RankingTable.vue`, `app/components/MatchHistory.vue`, `app/pages/joueurs/[id].vue`
- Modify : `app/pages/index.vue` (remplace la version provisoire)

**Interfaces :**
- Consumes : `GET /api/groups`, `GET /api/ranking`, `GET /api/players/:id`, `formatDate`, `formatDelta`.
- Produces :
  - `<RankingTable :rows="RankingRow[]">`
  - `<MatchHistory :matches="MatchView[]" :player-id?="number">` avec un slot nommé `actions` (prop de slot `{ match }`). Si `playerId` est fourni, affiche le Δ de ce joueur ; sinon le Δ de chaque équipe.

- [ ] **Step 1 : `RankingTable`**

`app/components/RankingTable.vue` :

```vue
<script setup lang="ts">
import type { RankingRow } from '#shared/models'

defineProps<{
  rows: RankingRow[]
}>()
</script>

<template>
  <div class="ranking card">
    <table>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Joueur</th>
          <th scope="col" class="ranking__optional">Groupe</th>
          <th scope="col" class="ranking__number">Elo</th>
          <th scope="col" class="ranking__optional ranking__number">Matchs</th>
          <th scope="col" class="ranking__number">V / D</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td class="ranking__rank">{{ row.rank }}</td>
          <td>
            <NuxtLink :to="`/joueurs/${row.id}`">{{ row.firstName }} {{ row.lastName }}</NuxtLink>
          </td>
          <td class="ranking__optional">{{ row.groupName }}</td>
          <td class="ranking__number ranking__elo">{{ row.elo }}</td>
          <td class="ranking__optional ranking__number">{{ row.matches }}</td>
          <td class="ranking__number">{{ row.wins }} / {{ row.losses }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="scss">
.ranking {
  padding: 0;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: $space-3 $space-2;
  text-align: left;
  border-bottom: 1px solid $color-border;
}

th {
  font-size: 0.85rem;
  color: $color-muted;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.ranking__rank {
  width: 2.5rem;
  font-weight: 700;
  color: $color-muted;
}

.ranking__number {
  text-align: right;
  white-space: nowrap;
}

.ranking__elo {
  font-weight: 700;
}

.ranking__optional {
  display: none;

  @include md-up {
    display: table-cell;
  }
}
</style>
```

- [ ] **Step 2 : `MatchHistory`**

`app/components/MatchHistory.vue` :

```vue
<script setup lang="ts">
import type { MatchView, Participant } from '#shared/models'

const props = defineProps<{
  matches: MatchView[]
  playerId?: number
}>()

defineSlots<{
  actions?: (props: { match: MatchView }) => unknown
}>()

function deltaFor(match: MatchView): number | undefined {
  return [...match.sideA, ...match.sideB].find((p) => p.id === props.playerId)?.eloDelta
}

function sideDelta(side: Participant[]): number {
  return side[0]?.eloDelta ?? 0
}

function deltaClass(delta: number): string {
  return delta >= 0 ? 'delta--up' : 'delta--down'
}
</script>

<template>
  <ul class="history">
    <li v-for="match in matches" :key="match.id" class="history__item card">
      <div class="history__meta muted">
        {{ formatDate(match.playedAt) }} · {{ match.type === 'single' ? 'Simple' : 'Double' }}
      </div>
      <div class="history__line">
        <span class="history__side" :class="{ 'history__side--winner': match.scoreA > match.scoreB }">
          <template v-for="(p, index) in match.sideA" :key="p.id">
            <template v-if="index > 0"> &amp; </template>
            <NuxtLink :to="`/joueurs/${p.id}`">{{ p.firstName }} {{ p.lastName }}</NuxtLink>
          </template>
        </span>
        <strong class="history__score">{{ match.scoreA }} – {{ match.scoreB }}</strong>
        <span class="history__side" :class="{ 'history__side--winner': match.scoreB > match.scoreA }">
          <template v-for="(p, index) in match.sideB" :key="p.id">
            <template v-if="index > 0"> &amp; </template>
            <NuxtLink :to="`/joueurs/${p.id}`">{{ p.firstName }} {{ p.lastName }}</NuxtLink>
          </template>
        </span>
      </div>
      <div v-if="playerId !== undefined" class="history__delta">
        <span v-if="deltaFor(match) !== undefined" :class="deltaClass(deltaFor(match) ?? 0)">
          {{ formatDelta(deltaFor(match) ?? 0) }} Elo
        </span>
      </div>
      <div v-else class="history__delta">
        <span :class="deltaClass(sideDelta(match.sideA))">{{ formatDelta(sideDelta(match.sideA)) }}</span>
        /
        <span :class="deltaClass(sideDelta(match.sideB))">{{ formatDelta(sideDelta(match.sideB)) }}</span>
      </div>
      <slot name="actions" :match="match" />
    </li>
  </ul>
</template>

<style scoped lang="scss">
.history {
  display: grid;
  gap: $space-3;
  margin: 0;
  padding: 0;
  list-style: none;
}

.history__meta {
  font-size: 0.85rem;
}

.history__line {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: $space-2;
  align-items: center;
  margin: $space-1 0;
}

.history__side:last-child {
  text-align: right;
}

.history__side--winner {
  font-weight: 700;
}

.history__score {
  font-size: 1.1rem;
  white-space: nowrap;
}

.history__delta {
  font-size: 0.9rem;
}
</style>
```

- [ ] **Step 3 : Page du classement**

`app/pages/index.vue` :

```vue
<script setup lang="ts">
import type { Group, RankingRow } from '#shared/models'

useHead({ title: 'Classement' })

const selectedGroup = ref<number | undefined>()
const { data: groups } = await useFetch<Group[]>('/api/groups', { default: () => [] })
const { data: rows, status } = await useFetch<RankingRow[]>('/api/ranking', {
  query: computed(() => ({ group: selectedGroup.value })),
  default: () => [],
})
</script>

<template>
  <section>
    <h1>Classement</h1>
    <div class="filters" role="group" aria-label="Filtrer par groupe">
      <button
        type="button"
        class="btn"
        :class="{ 'btn--primary': selectedGroup === undefined }"
        @click="selectedGroup = undefined"
      >
        Tous
      </button>
      <button
        v-for="group in groups"
        :key="group.id"
        type="button"
        class="btn"
        :class="{ 'btn--primary': selectedGroup === group.id }"
        @click="selectedGroup = group.id"
      >
        {{ group.name }}
      </button>
    </div>
    <p v-if="status === 'error'" class="alert">Impossible de charger le classement.</p>
    <p v-else-if="rows.length === 0" class="muted">Aucun match joué pour l'instant.</p>
    <RankingTable v-else :rows="rows" />
  </section>
</template>

<style scoped lang="scss">
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  margin-bottom: $space-4;
}
</style>
```

- [ ] **Step 4 : Page profil joueur**

`app/pages/joueurs/[id].vue` :

```vue
<script setup lang="ts">
import type { PlayerProfile } from '#shared/models'

const route = useRoute()
const { data: profile, error } = await useFetch<PlayerProfile>(() => `/api/players/${route.params.id}`)

useHead({
  title: () => (profile.value ? `${profile.value.firstName} ${profile.value.lastName}` : 'Joueur'),
})
</script>

<template>
  <section>
    <p v-if="error" class="alert">Joueur introuvable.</p>
    <template v-else-if="profile">
      <h1>{{ profile.firstName }} {{ profile.lastName }}</h1>
      <p class="muted">
        {{ profile.groupName }} · <strong>{{ profile.elo }}</strong> Elo ·
        {{ profile.history.length }} match{{ profile.history.length > 1 ? 's' : '' }}
      </p>
      <h2>Historique</h2>
      <p v-if="profile.history.length === 0" class="muted">Aucun match joué.</p>
      <MatchHistory v-else :matches="profile.history" :player-id="profile.id" />
    </template>
  </section>
</template>
```

- [ ] **Step 5 : Vérifier dans le navigateur**

Préparer des données : avec curl (voir Task 10), saisir au moins trois matchs entre trois comptes, dont un dans chaque groupe.

Run : `pnpm dev`, ouvrir http://localhost:3000.
Expected :
- le classement liste les joueurs ayant joué, triés par Elo ; les filtres de groupe changent la liste sans recharger la page ;
- à 375 px : colonnes « Groupe » et « Matchs » masquées, pas de défilement horizontal ;
- un clic sur un nom ouvre son profil avec l'historique (le plus récent en premier) et un Δ vert ou rouge ;
- `/joueurs/9999` affiche « Joueur introuvable. ».

- [ ] **Step 6 : Lint, typecheck, commit**

Run : `pnpm lint && pnpm typecheck`
Expected : aucune erreur.

```bash
git add app
git commit -m "feat: page classement filtrable et profil joueur"
```

---

### Task 13 : Saisie d'un match

**Files :**
- Create : `app/components/PlayerPicker.vue`, `app/components/MatchForm.vue`, `app/pages/matchs/nouveau.vue`

**Interfaces :**
- Consumes : `GET /api/players`, `POST /api/matches`, `searchPlayers` (`#shared/playerSearch`), `todayInParis` (`#shared/date`), `MatchHistory`, `FormField`.
- Produces :
  - `<PlayerPicker v-model="number | undefined" :label :players :exclude-ids :preferred-group-id? :locked? :error?>`
  - `<MatchForm :players :submit-label :initial?="MatchInput" :locked-player-id? :preferred-group-id? :pending? :errors? @submit="(input: MatchInput) => void">`, réutilisé par l'admin à la Task 15.

- [ ] **Step 1 : `PlayerPicker`**

`app/components/PlayerPicker.vue` :

```vue
<script setup lang="ts">
import type { PlayerOption } from '#shared/models'
import { searchPlayers } from '#shared/playerSearch'

const props = defineProps<{
  label: string
  players: PlayerOption[]
  excludeIds: number[]
  preferredGroupId?: number
  locked?: boolean
  error?: string
}>()

const model = defineModel<number>()
const query = ref('')
const inputId = useId()

const selected = computed(() => props.players.find((p) => p.id === model.value))
const results = computed(() =>
  searchPlayers(props.players, query.value, {
    excludeIds: props.excludeIds,
    preferredGroupId: props.preferredGroupId,
    limit: 8,
  }),
)

function select(id: number) {
  model.value = id
  query.value = ''
}
</script>

<template>
  <div class="picker">
    <label :for="inputId" class="picker__label">{{ label }}</label>
    <div v-if="selected" class="picker__selected">
      <span>{{ selected.firstName }} {{ selected.lastName }}</span>
      <button v-if="!locked" type="button" class="btn" @click="model = undefined">Changer</button>
    </div>
    <template v-else>
      <input :id="inputId" v-model="query" type="search" placeholder="Rechercher un nom…" autocomplete="off" />
      <ul class="picker__results">
        <li v-for="player in results" :key="player.id">
          <button type="button" class="picker__option" @click="select(player.id)">
            {{ player.firstName }} {{ player.lastName }}
          </button>
        </li>
        <li v-if="results.length === 0" class="muted">Aucun joueur trouvé</li>
      </ul>
    </template>
    <span v-if="error" class="picker__error">{{ error }}</span>
  </div>
</template>

<style scoped lang="scss">
.picker {
  display: grid;
  gap: $space-1;
}

.picker__label {
  font-size: 0.9rem;
  font-weight: 600;
}

.picker__selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  min-height: 44px;
  padding: $space-1 $space-1 $space-1 $space-3;
  font-weight: 600;
  background: $color-bg;
  border: 1px solid $color-border;
  border-radius: $radius;
}

.picker__results {
  display: grid;
  max-height: 240px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
  border: 1px solid $color-border;
  border-radius: $radius;
}

.picker__option {
  width: 100%;
  min-height: 44px;
  padding: $space-2 $space-3;
  font: inherit;
  text-align: left;
  background: $color-surface;
  border: 0;
  border-bottom: 1px solid $color-border;
  cursor: pointer;
}

.picker__error {
  font-size: 0.85rem;
  color: $color-danger;
}
</style>
```

- [ ] **Step 2 : `MatchForm`**

`app/components/MatchForm.vue` :

```vue
<script setup lang="ts">
import { todayInParis } from '#shared/date'
import type { MatchType, PlayerOption } from '#shared/models'
import type { MatchInput } from '#shared/schemas'

const props = defineProps<{
  players: PlayerOption[]
  submitLabel: string
  initial?: MatchInput
  lockedPlayerId?: number
  preferredGroupId?: number
  pending?: boolean
  errors?: Record<string, string>
}>()

const emit = defineEmits<{
  submit: [input: MatchInput]
}>()

const today = todayInParis()
const type = ref<MatchType>(props.initial?.type ?? 'single')
const a1 = ref<number | undefined>(props.initial?.sideA[0] ?? props.lockedPlayerId)
const a2 = ref<number | undefined>(props.initial?.sideA[1])
const b1 = ref<number | undefined>(props.initial?.sideB[0])
const b2 = ref<number | undefined>(props.initial?.sideB[1])
const scoreA = ref<number | ''>(props.initial?.scoreA ?? '')
const scoreB = ref<number | ''>(props.initial?.scoreB ?? '')
const playedAt = ref(props.initial?.playedAt ?? today)
const localError = ref('')

const isDouble = computed(() => type.value === 'double')
const isLocked = computed(() => props.lockedPlayerId !== undefined)
const selectedIds = computed(() =>
  [a1.value, a2.value, b1.value, b2.value].filter((id): id is number => id !== undefined),
)
const sideError = computed(() => props.errors?.sideA ?? props.errors?.sideB)

function excludeFor(current: number | undefined): number[] {
  return selectedIds.value.filter((id) => id !== current)
}

function submit() {
  localError.value = ''
  const sideA = isDouble.value ? [a1.value, a2.value] : [a1.value]
  const sideB = isDouble.value ? [b1.value, b2.value] : [b1.value]
  const a = scoreA.value
  const b = scoreB.value
  if ([...sideA, ...sideB].some((id) => id === undefined) || a === '' || b === '') {
    localError.value = 'Complète tous les joueurs et les deux scores.'
    return
  }
  emit('submit', {
    type: type.value,
    sideA: sideA as number[],
    sideB: sideB as number[],
    scoreA: a,
    scoreB: b,
    playedAt: playedAt.value,
  })
}
</script>

<template>
  <form class="match-form" novalidate @submit.prevent="submit">
    <fieldset class="match-form__type">
      <legend>Type de match</legend>
      <label class="match-form__choice"><input v-model="type" type="radio" value="single" /> Simple</label>
      <label class="match-form__choice"><input v-model="type" type="radio" value="double" /> Double</label>
    </fieldset>

    <div class="match-form__sides">
      <fieldset class="match-form__side card">
        <legend>{{ isLocked ? 'Ton équipe' : 'Équipe A' }}</legend>
        <PlayerPicker
          v-model="a1"
          :label="isLocked ? 'Toi' : 'Joueur 1'"
          :players="players"
          :exclude-ids="excludeFor(a1)"
          :preferred-group-id="preferredGroupId"
          :locked="isLocked"
        />
        <PlayerPicker
          v-if="isDouble"
          v-model="a2"
          :label="isLocked ? 'Ton partenaire' : 'Joueur 2'"
          :players="players"
          :exclude-ids="excludeFor(a2)"
          :preferred-group-id="preferredGroupId"
        />
        <FormField label="Score" :error="errors?.scoreA">
          <input v-model.number="scoreA" type="number" inputmode="numeric" min="0" step="1" />
        </FormField>
      </fieldset>

      <fieldset class="match-form__side card">
        <legend>{{ isLocked ? 'Adversaires' : 'Équipe B' }}</legend>
        <PlayerPicker
          v-model="b1"
          :label="isDouble ? 'Adversaire 1' : 'Adversaire'"
          :players="players"
          :exclude-ids="excludeFor(b1)"
          :preferred-group-id="preferredGroupId"
        />
        <PlayerPicker
          v-if="isDouble"
          v-model="b2"
          label="Adversaire 2"
          :players="players"
          :exclude-ids="excludeFor(b2)"
          :preferred-group-id="preferredGroupId"
        />
        <FormField label="Score" :error="errors?.scoreB">
          <input v-model.number="scoreB" type="number" inputmode="numeric" min="0" step="1" />
        </FormField>
      </fieldset>
    </div>

    <p v-if="sideError" class="alert">{{ sideError }}</p>

    <FormField label="Date du match" :error="errors?.playedAt">
      <input v-model="playedAt" type="date" :max="today" required />
    </FormField>

    <p v-if="localError" class="alert">{{ localError }}</p>

    <button type="submit" class="btn btn--primary btn--block" :disabled="pending">
      {{ pending ? 'Enregistrement…' : submitLabel }}
    </button>
  </form>
</template>

<style scoped lang="scss">
.match-form {
  display: grid;
  gap: $space-4;
}

.match-form__type {
  display: flex;
  flex-wrap: wrap;
  gap: $space-4;
}

.match-form__choice {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  min-height: 44px;

  input {
    width: auto;
    min-height: 0;
  }
}

.match-form__sides {
  display: grid;
  gap: $space-4;

  @include md-up {
    grid-template-columns: 1fr 1fr;
  }
}

.match-form__side {
  display: grid;
  gap: $space-3;
  align-content: start;
}
</style>
```

- [ ] **Step 3 : Page de saisie**

`app/pages/matchs/nouveau.vue` :

```vue
<script setup lang="ts">
import type { MatchView, PlayerOption } from '#shared/models'
import type { MatchInput } from '#shared/schemas'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Saisir un match' })

const { user } = useUserSession()
const { data: players } = await useFetch<PlayerOption[]>('/api/players', { default: () => [] })

const pending = ref(false)
const errors = ref<Record<string, string>>({})
const message = ref('')
const created = ref<MatchView | null>(null)
const formKey = ref(0)

async function save(input: MatchInput) {
  pending.value = true
  errors.value = {}
  message.value = ''
  try {
    created.value = await $fetch<MatchView>('/api/matches', { method: 'POST', body: input })
  } catch (error) {
    errors.value = getFieldErrors(error)
    message.value = getErrorMessage(error)
  } finally {
    pending.value = false
  }
}

function enterAnother() {
  created.value = null
  formKey.value += 1
}
</script>

<template>
  <section>
    <h1>Saisir un match</h1>
    <template v-if="created">
      <p class="success">Match enregistré, le classement est à jour.</p>
      <MatchHistory :matches="[created]" :player-id="user?.id" />
      <div class="actions">
        <button type="button" class="btn btn--primary" @click="enterAnother">Saisir un autre match</button>
        <NuxtLink to="/" class="btn">Voir le classement</NuxtLink>
      </div>
    </template>
    <template v-else-if="user">
      <p v-if="message && Object.keys(errors).length === 0" class="alert">{{ message }}</p>
      <MatchForm
        :key="formKey"
        :players="players"
        :locked-player-id="user.id"
        :preferred-group-id="user.groupId"
        :pending="pending"
        :errors="errors"
        submit-label="Enregistrer le match"
        @submit="save"
      />
    </template>
  </section>
</template>
```

- [ ] **Step 4 : Vérifier dans le navigateur** (375 px de large puis desktop)

Run : `pnpm dev`, se connecter, ouvrir « + Match ».
Expected :
- déconnecté, `/matchs/nouveau` redirige vers `/connexion?redirect=/matchs/nouveau`, puis revient sur la saisie après connexion ;
- « Toi » est pré-rempli et ne peut pas être changé ;
- la recherche « helene » trouve « Hélène » ; un joueur déjà choisi n'apparaît plus dans les autres listes ; les membres de mon groupe sont proposés en premier ;
- en double, les champs « Ton partenaire » et « Adversaire 2 » apparaissent ;
- un score à égalité affiche « Il ne peut pas y avoir d'égalité » sous le score adverse ;
- une soumission incomplète affiche « Complète tous les joueurs et les deux scores. » ;
- un double clic rapide sur « Enregistrer » ne crée qu'un seul match (bouton désactivé pendant l'envoi) ;
- après l'enregistrement : récapitulatif avec mon Δ Elo, puis « Saisir un autre match » réaffiche un formulaire vide.

- [ ] **Step 5 : Lint, typecheck, commit**

Run : `pnpm lint && pnpm typecheck`
Expected : aucune erreur.

```bash
git add app
git commit -m "feat: saisie de match mobile (simple et double)"
```

---

### Task 14 : Page « Mon profil »

**Files :**
- Create : `app/pages/profil.vue`

**Interfaces :**
- Consumes : `GET /api/groups`, `PATCH /api/me`, `PATCH /api/me/password`, `useUserSession().fetch`.

- [ ] **Step 1 : Écrire la page**

`app/pages/profil.vue` :

```vue
<script setup lang="ts">
import type { Group } from '#shared/models'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Mon profil' })

const { user, fetch: refreshSession } = useUserSession()
const { data: groups } = await useFetch<Group[]>('/api/groups', { default: () => [] })

const info = reactive({
  firstName: user.value?.firstName ?? '',
  lastName: user.value?.lastName ?? '',
  groupId: user.value?.groupId ?? 0,
})
const infoErrors = ref<Record<string, string>>({})
const infoMessage = ref('')
const infoSuccess = ref('')
const infoPending = ref(false)

async function saveInfo() {
  infoPending.value = true
  infoErrors.value = {}
  infoMessage.value = ''
  infoSuccess.value = ''
  try {
    await $fetch('/api/me', { method: 'PATCH', body: info })
    await refreshSession()
    infoSuccess.value = 'Profil mis à jour.'
  } catch (error) {
    infoErrors.value = getFieldErrors(error)
    infoMessage.value = getErrorMessage(error)
  } finally {
    infoPending.value = false
  }
}

const passwords = reactive({ currentPassword: '', newPassword: '' })
const passwordErrors = ref<Record<string, string>>({})
const passwordMessage = ref('')
const passwordSuccess = ref('')
const passwordPending = ref(false)

async function savePassword() {
  passwordPending.value = true
  passwordErrors.value = {}
  passwordMessage.value = ''
  passwordSuccess.value = ''
  try {
    await $fetch('/api/me/password', { method: 'PATCH', body: passwords })
    passwords.currentPassword = ''
    passwords.newPassword = ''
    passwordSuccess.value = 'Mot de passe modifié.'
  } catch (error) {
    passwordErrors.value = getFieldErrors(error)
    passwordMessage.value = getErrorMessage(error)
  } finally {
    passwordPending.value = false
  }
}
</script>

<template>
  <section>
    <h1>Mon profil</h1>
    <p v-if="user">
      <NuxtLink :to="`/joueurs/${user.id}`">Voir mon historique et mon Elo</NuxtLink>
    </p>

    <h2>Mes informations</h2>
    <form class="form card" novalidate @submit.prevent="saveInfo">
      <FormField label="Prénom" :error="infoErrors.firstName">
        <input v-model="info.firstName" type="text" autocomplete="given-name" />
      </FormField>
      <FormField label="Nom" :error="infoErrors.lastName">
        <input v-model="info.lastName" type="text" autocomplete="family-name" />
      </FormField>
      <FormField label="Ma séance" :error="infoErrors.groupId">
        <select v-model.number="info.groupId">
          <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
        </select>
      </FormField>
      <p v-if="infoSuccess" class="success">{{ infoSuccess }}</p>
      <p v-if="infoMessage && Object.keys(infoErrors).length === 0" class="alert">{{ infoMessage }}</p>
      <button type="submit" class="btn btn--primary" :disabled="infoPending">Enregistrer</button>
    </form>

    <h2>Changer mon mot de passe</h2>
    <form class="form card" novalidate @submit.prevent="savePassword">
      <FormField label="Mot de passe actuel" :error="passwordErrors.currentPassword">
        <input v-model="passwords.currentPassword" type="password" autocomplete="current-password" />
      </FormField>
      <FormField label="Nouveau mot de passe (8 caractères minimum)" :error="passwordErrors.newPassword">
        <input v-model="passwords.newPassword" type="password" autocomplete="new-password" />
      </FormField>
      <p v-if="passwordSuccess" class="success">{{ passwordSuccess }}</p>
      <p v-if="passwordMessage && Object.keys(passwordErrors).length === 0" class="alert">
        {{ passwordMessage }}
      </p>
      <button type="submit" class="btn btn--primary" :disabled="passwordPending">Changer le mot de passe</button>
    </form>
  </section>
</template>
```

- [ ] **Step 2 : Vérifier dans le navigateur**

Expected :
- changer de groupe affiche « Profil mis à jour. » ; la saisie de match propose ensuite en premier les membres du nouveau groupe ;
- un mauvais mot de passe actuel affiche « Mot de passe actuel incorrect » sous le champ ;
- après un changement réussi, la déconnexion puis la connexion avec le nouveau mot de passe fonctionnent.

- [ ] **Step 3 : Lint, typecheck, commit**

Run : `pnpm lint && pnpm typecheck`
Expected : aucune erreur.

```bash
git add app/pages/profil.vue
git commit -m "feat: page profil (infos, groupe, mot de passe)"
```

---

### Task 15 : Pages d'administration

**Files :**
- Create : `app/components/AdminNav.vue`, `app/pages/admin/matchs.vue`, `app/pages/admin/joueurs.vue`, `app/pages/admin/groupes.vue`

**Interfaces :**
- Consumes : routes `/api/admin/*`, `GET /api/players`, `GET /api/groups`, `MatchHistory` (slot `actions`), `MatchForm`.

- [ ] **Step 1 : `AdminNav`**

`app/components/AdminNav.vue` :

```vue
<template>
  <nav class="admin-nav" aria-label="Administration">
    <NuxtLink to="/admin/matchs" class="btn">Matchs</NuxtLink>
    <NuxtLink to="/admin/joueurs" class="btn">Joueurs</NuxtLink>
    <NuxtLink to="/admin/groupes" class="btn">Groupes</NuxtLink>
  </nav>
</template>

<style scoped lang="scss">
.admin-nav {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  margin-bottom: $space-6;

  .router-link-exact-active {
    color: #fff;
    background: $color-primary;
    border-color: $color-primary;
  }
}
</style>
```

- [ ] **Step 2 : Admin des matchs**

`app/pages/admin/matchs.vue` :

```vue
<script setup lang="ts">
import type { MatchView, PlayerOption } from '#shared/models'
import type { MatchInput } from '#shared/schemas'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Admin · Matchs' })

const { data: matches, refresh } = await useFetch<MatchView[]>('/api/admin/matches', { default: () => [] })
const { data: players } = await useFetch<PlayerOption[]>('/api/players', { default: () => [] })

const editingId = ref<number | null>(null)
const pending = ref(false)
const errors = ref<Record<string, string>>({})
const message = ref('')

function toInput(match: MatchView): MatchInput {
  return {
    type: match.type,
    sideA: match.sideA.map((p) => p.id),
    sideB: match.sideB.map((p) => p.id),
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    playedAt: match.playedAt,
  }
}

/** Ajoute les joueurs supprimés du match pour qu'ils restent affichés dans le formulaire. */
function playersFor(match: MatchView): PlayerOption[] {
  const known = new Set(players.value.map((p) => p.id))
  const missing = [...match.sideA, ...match.sideB]
    .filter((p) => !known.has(p.id))
    .map((p) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, groupId: 0 }))
  return [...players.value, ...missing]
}

function startEdit(id: number) {
  editingId.value = id
  errors.value = {}
  message.value = ''
}

async function save(id: number, input: MatchInput) {
  pending.value = true
  errors.value = {}
  message.value = ''
  try {
    await $fetch(`/api/admin/matches/${id}`, { method: 'PATCH', body: input })
    editingId.value = null
    await refresh()
  } catch (error) {
    errors.value = getFieldErrors(error)
    message.value = getErrorMessage(error)
  } finally {
    pending.value = false
  }
}

async function remove(match: MatchView) {
  if (!confirm(`Supprimer ce match (${match.scoreA} – ${match.scoreB}) ? Le classement sera recalculé.`)) return
  message.value = ''
  try {
    await $fetch(`/api/admin/matches/${match.id}`, { method: 'DELETE' })
    await refresh()
  } catch (error) {
    message.value = getErrorMessage(error)
  }
}
</script>

<template>
  <section>
    <h1>Administration</h1>
    <AdminNav />
    <p v-if="message && Object.keys(errors).length === 0" class="alert">{{ message }}</p>
    <p v-if="matches.length === 0" class="muted">Aucun match.</p>
    <MatchHistory v-else :matches="matches">
      <template #actions="{ match }">
        <div v-if="editingId === match.id" class="admin-edit">
          <MatchForm
            :players="playersFor(match)"
            :initial="toInput(match)"
            :pending="pending"
            :errors="errors"
            submit-label="Enregistrer les modifications"
            @submit="save(match.id, $event)"
          />
          <button type="button" class="btn btn--block" @click="editingId = null">Annuler</button>
        </div>
        <div v-else class="actions">
          <button type="button" class="btn" @click="startEdit(match.id)">Modifier</button>
          <button type="button" class="btn btn--danger" @click="remove(match)">Supprimer</button>
        </div>
      </template>
    </MatchHistory>
  </section>
</template>

<style scoped lang="scss">
.admin-edit {
  display: grid;
  gap: $space-2;
  margin-top: $space-4;
  padding-top: $space-4;
  border-top: 1px solid $color-border;
}
</style>
```

- [ ] **Step 3 : Admin des joueurs**

`app/pages/admin/joueurs.vue` :

```vue
<script setup lang="ts">
import type { AdminUserRow, Group, Role } from '#shared/models'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Admin · Joueurs' })

const { user } = useUserSession()
const { data: users, refresh } = await useFetch<AdminUserRow[]>('/api/admin/users', { default: () => [] })
const { data: groups } = await useFetch<Group[]>('/api/groups', { default: () => [] })

const message = ref('')
const success = ref('')

async function run(action: () => Promise<unknown>, successText: string) {
  message.value = ''
  success.value = ''
  try {
    await action()
    success.value = successText
  } catch (error) {
    message.value = getErrorMessage(error)
  }
  await refresh()
}

function changeGroup(target: AdminUserRow, groupId: number) {
  return run(
    () => $fetch(`/api/admin/users/${target.id}`, { method: 'PATCH', body: { groupId } }),
    `Groupe de ${target.firstName} ${target.lastName} modifié.`,
  )
}

function changeRole(target: AdminUserRow, role: Role) {
  return run(
    () => $fetch(`/api/admin/users/${target.id}`, { method: 'PATCH', body: { role } }),
    `Rôle de ${target.firstName} ${target.lastName} modifié.`,
  )
}

function resetPassword(target: AdminUserRow) {
  const password = prompt(
    `Nouveau mot de passe temporaire pour ${target.firstName} ${target.lastName} (8 caractères minimum) :`,
  )
  if (!password) return
  return run(
    () => $fetch(`/api/admin/users/${target.id}/reset-password`, { method: 'POST', body: { password } }),
    `Mot de passe de ${target.firstName} réinitialisé. Transmets-le-lui et demande-lui de le changer.`,
  )
}

function remove(target: AdminUserRow) {
  if (!confirm(`Supprimer le compte de ${target.firstName} ${target.lastName} ? Ses matchs seront conservés de façon anonyme.`)) {
    return
  }
  return run(() => $fetch(`/api/admin/users/${target.id}`, { method: 'DELETE' }), 'Compte supprimé.')
}
</script>

<template>
  <section>
    <h1>Administration</h1>
    <AdminNav />
    <p v-if="success" class="success">{{ success }}</p>
    <p v-if="message" class="alert">{{ message }}</p>
    <ul class="users">
      <li v-for="target in users" :key="target.id" class="users__item card">
        <div class="users__head">
          <strong>{{ target.firstName }} {{ target.lastName }}</strong>
          <span class="muted">{{ target.email }} · {{ target.elo }} Elo</span>
        </div>
        <div class="users__controls">
          <FormField label="Groupe">
            <select
              :value="target.groupId"
              @change="changeGroup(target, Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
            </select>
          </FormField>
          <FormField label="Rôle">
            <select
              :value="target.role"
              :disabled="target.id === user?.id"
              @change="changeRole(target, ($event.target as HTMLSelectElement).value as Role)"
            >
              <option value="player">Joueur</option>
              <option value="admin">Admin</option>
            </select>
          </FormField>
        </div>
        <div class="actions">
          <button type="button" class="btn" @click="resetPassword(target)">Réinitialiser le mot de passe</button>
          <button v-if="target.id !== user?.id" type="button" class="btn btn--danger" @click="remove(target)">
            Supprimer
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.users {
  display: grid;
  gap: $space-3;
  margin: 0;
  padding: 0;
  list-style: none;
}

.users__head {
  display: grid;
  margin-bottom: $space-3;
}

.users__controls {
  display: grid;
  gap: $space-3;

  @include md-up {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
```

- [ ] **Step 4 : Admin des groupes**

`app/pages/admin/groupes.vue` :

```vue
<script setup lang="ts">
import type { Group } from '#shared/models'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Admin · Groupes' })

const { data: groups, refresh } = await useFetch<Group[]>('/api/groups', { default: () => [] })
const names = ref<Record<number, string>>({})
const message = ref('')
const success = ref('')

watch(
  groups,
  (list) => {
    names.value = Object.fromEntries(list.map((group) => [group.id, group.name]))
  },
  { immediate: true },
)

async function save(id: number) {
  message.value = ''
  success.value = ''
  try {
    await $fetch(`/api/admin/groups/${id}`, { method: 'PATCH', body: { name: names.value[id] ?? '' } })
    success.value = 'Groupe renommé.'
    await refresh()
  } catch (error) {
    message.value = getFieldErrors(error).name ?? getErrorMessage(error)
  }
}
</script>

<template>
  <section>
    <h1>Administration</h1>
    <AdminNav />
    <p v-if="success" class="success">{{ success }}</p>
    <p v-if="message" class="alert">{{ message }}</p>
    <form v-for="group in groups" :key="group.id" class="form card groups__item" @submit.prevent="save(group.id)">
      <FormField :label="`Groupe ${group.id}`">
        <input v-model="names[group.id]" type="text" maxlength="30" />
      </FormField>
      <button type="submit" class="btn btn--primary">Renommer</button>
    </form>
  </section>
</template>

<style scoped lang="scss">
.groups__item {
  margin-bottom: $space-3;
}
</style>
```

- [ ] **Step 5 : Vérifier dans le navigateur** (connecté avec le compte `ADMIN_EMAIL`)

Expected :
- un joueur non admin qui ouvre `/admin/matchs` est renvoyé vers `/` ; le lien « Admin » n'apparaît pas pour lui ;
- **Matchs** : « Modifier » ouvre le formulaire pré-rempli ; inverser les scores puis enregistrer met à jour la liste et le classement ; « Supprimer » demande confirmation puis recalcule le classement ;
- un match impliquant un joueur supprimé reste modifiable (son nom « Joueur supprimé » s'affiche dans le formulaire) ;
- **Joueurs** : changer le groupe ou le rôle affiche un message de succès ; mon propre rôle est verrouillé et je n'ai pas de bouton « Supprimer » sur ma ligne ; le mot de passe temporaire permet au joueur de se connecter ; un compte supprimé disparaît de la liste et apparaît comme « Joueur supprimé » dans l'historique des autres ;
- **Groupes** : renommer « Groupe 1 » en « Mardi » met à jour le filtre du classement et la liste d'inscription ; un nom vide affiche « Nom requis ».

- [ ] **Step 6 : Lint, typecheck, commit**

Run : `pnpm lint && pnpm typecheck && pnpm test`
Expected : aucune erreur.

```bash
git add app
git commit -m "feat: administration des matchs, joueurs et groupes"
```

---

### Task 16 : Docker et README

**Files :**
- Create : `Dockerfile`, `.dockerignore`
- Modify : `README.md` (remplace le README du template)

**Interfaces :**
- Consumes : `pnpm build` (sortie `.output/`), `server/database/migrations/` lu au démarrage depuis `process.cwd()`.

> Avant d'écrire le Dockerfile, charger la skill `deploy-docker` (exigence du CLAUDE.md) et partir de `.claude/skills/deploy-docker/reference/Dockerfile.example`.

- [ ] **Step 1 : `Dockerfile`**

```dockerfile
# Build multi-stage Nuxt/Nitro avec pnpm (d'après .claude/skills/deploy-docker)
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Stage dépendances (outils de compilation pour better-sqlite3 si besoin) ---
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- Stage build ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# --- Stage final ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/data/bad.db

COPY --from=build /app/.output ./.output
# Les migrations sont appliquées au démarrage par server/plugins/database.ts
COPY --from=build /app/server/database/migrations ./server/database/migrations

VOLUME /data
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
```

- [ ] **Step 2 : `.dockerignore`**

```
node_modules
.nuxt
.output
.data
data
.env
.git
tests
docs
```

- [ ] **Step 3 : Construire et tester l'image**

```bash
docker build -t bad-elo .
docker run --rm -d --name bad-elo-test -p 3000:3000 \
  -e NUXT_SESSION_PASSWORD=$(openssl rand -hex 32) \
  -e ADMIN_EMAIL=admin@test.fr \
  -v bad-elo-test-data:/data bad-elo
sleep 3
curl -s localhost:3000/api/groups
# Expected : [{"id":1,"name":"Groupe 1"},{"id":2,"name":"Groupe 2"}]
curl -s -H 'content-type: application/json' -d '{"email":"admin@test.fr","firstName":"Ada","lastName":"Admin","password":"motdepasse1","groupId":1}' localhost:3000/api/auth/register
# Expected : role "admin"
docker restart bad-elo-test && sleep 3
curl -s -H 'content-type: application/json' -d '{"email":"admin@test.fr","password":"motdepasse1"}' localhost:3000/api/auth/login
# Expected : le compte existe toujours (données persistées dans le volume)
docker stop bad-elo-test && docker volume rm bad-elo-test-data
```

Si `better-sqlite3` ne se charge pas dans l'image (erreur `Could not locate the bindings file`), vérifier que `.output/server/node_modules/better-sqlite3/build/Release/better_sqlite3.node` est présent dans l'image ; sinon, ajouter dans `nuxt.config.ts` : `nitro: { externals: { traceInclude: ['better-sqlite3'] } }`.

- [ ] **Step 4 : `README.md`**

````markdown
# Bad Elo — classement du club de badminton

Site où les membres du club s'inscrivent, saisissent leurs matchs (simple ou double, un set) et suivent un classement Elo commun, filtrable par séance.

Spec : `docs/superpowers/specs/2026-10-26-classement-elo-design.md`

## Développement

```bash
cp .env.example .env    # renseigner ADMIN_EMAIL
pnpm install
pnpm dev                # http://localhost:3000
```

Le compte qui s'inscrit avec `ADMIN_EMAIL` devient admin. Il peut ensuite promouvoir d'autres joueurs.

| Commande | Rôle |
|---|---|
| `pnpm test` | Tests Vitest (Elo, recalcul, services) |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm typecheck` | Vérification TypeScript |
| `pnpm db:generate` | Génère une migration après modification de `server/database/schema.ts` |

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `NUXT_SESSION_PASSWORD` | Secret des sessions, 32 caractères minimum (obligatoire en production) |
| `ADMIN_EMAIL` | Email du premier admin |
| `DATABASE_PATH` | Fichier SQLite (`data/bad.db` en dev, `/data/bad.db` dans l'image) |

## Docker

```bash
docker build -t bad-elo .
docker run -d --name bad-elo \
  -e NUXT_SESSION_PASSWORD=<secret de 32+ caractères> \
  -e ADMIN_EMAIL=<email admin> \
  -v bad-elo-data:/data \
  bad-elo
```

Le conteneur écoute sur le port 3000. L'exposition (reverse proxy, mapping de port) dépend de l'hébergement. Les migrations sont appliquées automatiquement au démarrage.

## Sauvegarde

Toutes les données tiennent dans un seul fichier, `/data/bad.db`. Pour une copie cohérente, arrêter brièvement le conteneur :

```bash
docker stop bad-elo
docker run --rm -v bad-elo-data:/data -v "$PWD":/backup alpine cp /data/bad.db /backup/bad-$(date +%F).db
docker start bad-elo
```

Pour restaurer : arrêter le conteneur, recopier le fichier dans le volume sous le nom `bad.db`, redémarrer.
````

- [ ] **Step 5 : Commit**

```bash
git add Dockerfile .dockerignore README.md
git commit -m "chore: image Docker et documentation"
```
