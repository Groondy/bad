# Style global « Volant » — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Appliquer le style « Volant » (marine + vert-jaune, Barlow Condensed) à tout le site sans changer aucune fonctionnalité.

**Architecture :** Les tokens (couleurs, polices, arrondi) vivent dans `app/assets/scss/_variables.scss`, injecté dans tous les composants par `nuxt.config.ts`. Les styles globaux (`main.scss`) portent la typo, les boutons, les pastilles `.pill`, les Δ et le focus. Les composants ne changent que leurs `<style scoped>` et, ponctuellement, une classe ou un élément d'enrobage. Un test Vitest vérifie les contrastes des paires de couleurs déclarées.

**Tech Stack :** Nuxt 4, Vue 3 `<script setup lang="ts">`, SCSS, Vitest, pnpm.

**Spec :** `docs/superpowers/specs/2026-10-26-style-global-design.md`

## Global Constraints

- Aucune nouvelle dépendance npm ; aucun appel à un CDN de polices à l'exécution (polices dans `public/fonts/`).
- Thème clair uniquement.
- Contraste WCAG AA : ≥ 4,5:1 pour toute paire texte/fond.
- L'accent `#C6F432` n'est jamais une couleur de texte sur fond clair ; seulement en aplat sous du texte marine, ou en texte sur fond marine.
- Vert et rouge réservés aux Δ d'Elo et aux messages.
- Cibles tactiles ≥ 44 px ; pas de défilement horizontal de la page à 360 px.
- Aucune modification des données, routes API, appels `useFetch` ni de la logique des composants.
- SCSS : pas plus de 3 niveaux d'imbrication ; variables dans `_variables.scss`.
- Commandes : `pnpm lint`, `pnpm typecheck`, `pnpm test` au vert à la fin de chaque tâche.

## Review Focus

1. **Focus clavier sur la barre marine et sur le sélecteur simple/double** (radios rendues invisibles) : le focus doit rester visible. Vérification manuelle à la Task 3, étape 6.
2. **Police indisponible** (fichier bloqué, réseau lent) : le site retombe sur la police système sans casser la mise en page. Vérification manuelle à la Task 3, étape 6.
3. **Noms longs à 360 px** dans le classement, avec la médaille et l'Elo agrandi : pas de défilement horizontal de la page. Vérification manuelle à la Task 3, étape 6.
4. **Ex æquo** (deux joueurs au rang 2) : les deux reçoivent la médaille d'argent. C'est le cas par construction, puisque la classe dépend de `row.rank`.
5. **Accent utilisé comme texte sur fond clair** par erreur : contrôle par `grep` à la Task 3, étape 5.

## Fichiers touchés

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `app/assets/scss/_variables.scss` | Tokens couleurs, polices, arrondi | 1 |
| `app/assets/scss/main.scss` | `@font-face`, base, titres, focus, boutons, `.pill`, Δ | 1 |
| `public/fonts/*.woff2`, `public/fonts/OFL.txt` | Police Barlow Condensed et sa licence | 1 |
| `tests/contrast.test.ts` | Contrastes des paires déclarées | 1 |
| `docs/superpowers/specs/2026-10-26-style-global-design.md` | Retrait de `$color-primary-dark`, ajout de `$color-on-primary` | 1 |
| `app/components/AppNav.vue` | Barre marine, logo, onglets | 2 |
| `app/components/AdminNav.vue` | Pastilles | 2 |
| `app/pages/index.vue` | Filtres en pastilles | 2 |
| `app/components/RankingTable.vue` | Médailles, Elo en police de titres | 3 |
| `app/pages/joueurs/[id].vue` | Elo en grand | 3 |
| `app/components/MatchHistory.vue` | Score en police de titres | 3 |
| `app/components/MatchForm.vue` | Sélecteur segmenté simple/double | 3 |

---

### Task 1 : Fondations (tokens, police, styles globaux)

**Files :**
- Create : `tests/contrast.test.ts`, `public/fonts/barlow-condensed-latin-600-normal.woff2`, `public/fonts/barlow-condensed-latin-700-normal.woff2`, `public/fonts/OFL.txt`
- Modify : `app/assets/scss/_variables.scss` (fichier entier), `app/assets/scss/main.scss` (fichier entier), `docs/superpowers/specs/2026-10-26-style-global-design.md` (tableau des couleurs)

**Interfaces :**
- Produces (variables SCSS) : `$color-primary`, `$color-on-primary`, `$color-accent`, `$color-accent-dark`, `$color-bg`, `$color-surface`, `$color-text`, `$color-muted`, `$color-border`, `$color-success`, `$color-success-bg`, `$color-danger`, `$color-danger-bg`, `$color-gold`, `$color-silver`, `$color-bronze`, `$radius`, `$font-family`, `$font-display`. `$color-primary-dark` est supprimé : son seul usage, dans `AppNav.vue`, est remplacé à la Task 2.
- Produces (classes globales) : `.btn`, `.btn--primary`, `.btn--danger`, `.btn--block`, `.pill`, `.pill--active` (et `.pill.router-link-exact-active`), `.delta--up`, `.delta--down`, plus les classes existantes inchangées (`.container`, `.card`, `.form`, `.auth`, `.actions`, `.alert`, `.success`, `.muted`).

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/contrast.test.ts` :

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const scss = readFileSync(new URL('../app/assets/scss/_variables.scss', import.meta.url), 'utf8')
const colors: Record<string, string> = Object.fromEntries(
  [...scss.matchAll(/^\$(color-[\w-]+):\s*(#[0-9a-fA-F]{6});/gm)].map(([, name, hex]) => [
    name,
    hex,
  ]),
)

function color(name: string): string {
  const hex = colors[name]
  if (!hex) throw new Error(`Variable $${name} absente de _variables.scss`)
  return hex
}

// Luminance relative WCAG 2.1
function luminance(hex: string): number {
  return [0.2126, 0.7152, 0.0722].reduce((sum, weight, k) => {
    const c = parseInt(hex.slice(1 + 2 * k, 3 + 2 * k), 16) / 255
    return sum + weight * (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  }, 0)
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// [texte, fond]
const pairs: [string, string][] = [
  ['color-text', 'color-bg'],
  ['color-text', 'color-surface'],
  ['color-muted', 'color-bg'],
  ['color-muted', 'color-surface'],
  ['color-on-primary', 'color-primary'],
  ['color-accent', 'color-primary'],
  ['color-primary', 'color-accent'],
  ['color-primary', 'color-accent-dark'],
  ['color-success', 'color-success-bg'],
  ['color-danger', 'color-danger-bg'],
  ['color-danger', 'color-surface'],
  ['color-primary', 'color-gold'],
  ['color-primary', 'color-silver'],
  ['color-primary', 'color-bronze'],
]

describe('contrastes des couleurs', () => {
  it.each(pairs)('$%s sur $%s ≥ 4,5:1', (text, background) => {
    expect(contrast(color(text), color(background))).toBeGreaterThanOrEqual(4.5)
  })

  it("l'accent n'est pas lisible en texte sur fond clair (règle d'usage)", () => {
    expect(contrast(color('color-accent'), color('color-surface'))).toBeLessThan(4.5)
  })
})
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run : `pnpm vitest run tests/contrast.test.ts`
Expected : FAIL, avec `Variable $color-on-primary absente de _variables.scss` (et `color-accent`, `color-gold`…), et `$color-muted sur $color-bg` sous 4,5.

- [ ] **Step 3 : Réécrire `app/assets/scss/_variables.scss`**

```scss
$color-primary: #0b1f3a;
$color-on-primary: #ffffff;
$color-accent: #c6f432;
$color-accent-dark: #b2de1f;
$color-bg: #f4f6f9;
$color-surface: #ffffff;
$color-text: #0b1f3a;
$color-muted: #5b6577;
$color-border: #e3e7ec;
$color-success: #166534;
$color-success-bg: #e7f6ec;
$color-danger: #b91c1c;
$color-danger-bg: #fdecec;
$color-gold: #f5c542;
$color-silver: #cfd6de;
$color-bronze: #e0a46b;

$radius: 10px;
$space-1: 4px;
$space-2: 8px;
$space-3: 12px;
$space-4: 16px;
$space-6: 24px;
$space-8: 32px;

$font-family:
  system-ui,
  -apple-system,
  'Segoe UI',
  Roboto,
  sans-serif;
$font-display:
  'Barlow Condensed',
  system-ui,
  sans-serif;
$breakpoint-md: 768px;
$tabbar-height: 64px;
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run : `pnpm vitest run tests/contrast.test.ts`
Expected : PASS (15 tests).

- [ ] **Step 5 : Ajouter la police**

```bash
mkdir -p public/fonts
base=https://cdn.jsdelivr.net/npm/@fontsource/barlow-condensed@5.1.0
curl -fsSL -o public/fonts/barlow-condensed-latin-600-normal.woff2 $base/files/barlow-condensed-latin-600-normal.woff2
curl -fsSL -o public/fonts/barlow-condensed-latin-700-normal.woff2 $base/files/barlow-condensed-latin-700-normal.woff2
curl -fsSL -o public/fonts/OFL.txt $base/LICENSE
file public/fonts/*.woff2
```

Expected : `Web Open Font Format (Version 2)` pour les deux fichiers ; `OFL.txt` contient « SIL Open Font License ». Le CDN ne sert qu'au téléchargement, une seule fois ; le site sert les fichiers lui-même.

- [ ] **Step 6 : Réécrire `app/assets/scss/main.scss`**

```scss
@font-face {
  font-family: 'Barlow Condensed';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/barlow-condensed-latin-600-normal.woff2') format('woff2');
}

@font-face {
  font-family: 'Barlow Condensed';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/barlow-condensed-latin-700-normal.woff2') format('woff2');
}

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

h1,
h2 {
  font-family: $font-display;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: $color-primary;
}

h1 {
  font-size: 2rem;
  margin: 0 0 $space-4;
}

h2 {
  font-size: 1.4rem;
  margin: $space-6 0 $space-3;
}

:focus-visible {
  outline: 2px solid $color-primary;
  outline-offset: 2px;
  box-shadow: 0 0 0 2px $color-accent;
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

.auth {
  max-width: 440px;
  margin: 0 auto;

  h1 {
    text-align: center;
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 $space-4;
  font: inherit;
  font-family: $font-display;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: $color-text;
  text-decoration: none;
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: $color-primary;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &--primary {
    color: $color-primary;
    background: $color-accent;
    border-color: $color-accent;

    &:hover:not(:disabled) {
      background: $color-accent-dark;
      border-color: $color-accent-dark;
    }
  }

  &--danger {
    color: $color-danger;
    border-color: $color-danger;

    &:hover:not(:disabled) {
      background: $color-danger-bg;
      border-color: $color-danger;
    }
  }

  &--block {
    width: 100%;
  }
}

.pill {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 $space-4;
  font: inherit;
  font-weight: 600;
  color: $color-text;
  text-decoration: none;
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: 999px;
  cursor: pointer;

  &:hover {
    border-color: $color-primary;
  }

  &--active,
  &.router-link-exact-active {
    color: $color-accent;
    background: $color-primary;
    border-color: $color-primary;
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

.delta--up,
.delta--down {
  display: inline-block;
  padding: 0 $space-2;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  border-radius: 6px;
}

.delta--up {
  color: $color-success;
  background: $color-success-bg;
}

.delta--down {
  color: $color-danger;
  background: $color-danger-bg;
}
```

- [ ] **Step 7 : Mettre la spec à jour**

Dans `docs/superpowers/specs/2026-10-26-style-global-design.md`, tableau « Couleurs » : remplacer la ligne

```
| `$color-primary-dark` | `#06142A` | Survol des éléments marine |
```

par

```
| `$color-on-primary` | `#FFFFFF` | Texte sur fond marine (liens de la barre du haut) |
```

(Aucun élément marine n'a d'état de survol ; la couleur de texte sur marine, elle, est nécessaire.)

- [ ] **Step 8 : Vérifier**

Run : `pnpm test && pnpm lint && pnpm typecheck`
Expected : tout au vert. `pnpm build` n'est pas encore lancé : `AppNav.vue` utilise toujours `$color-primary-dark`, que la Task 2 remplace. Si `pnpm typecheck` compile les styles et échoue sur `$color-primary-dark`, enchaîner directement avec la Task 2 avant de committer.

- [ ] **Step 9 : Commit**

```bash
git add app/assets/scss public/fonts tests/contrast.test.ts docs/superpowers/specs/2026-10-26-style-global-design.md
git commit -m "style: fondations du thème Volant (couleurs, police, styles globaux)"
```

---

### Task 2 : Navigation et pastilles

**Files :**
- Modify : `app/components/AppNav.vue` (lien du logo + bloc `<style>` entier), `app/components/AdminNav.vue` (fichier entier), `app/pages/index.vue` (boutons de filtre)

**Interfaces :**
- Consumes : variables de la Task 1 (`$color-primary`, `$color-on-primary`, `$color-accent`, `$color-accent-dark`, `$color-muted`, `$color-surface`, `$color-border`, `$font-display`, `$radius`), classes globales `.pill`, `.pill--active`, `.btn--primary`.

- [ ] **Step 1 : Logo de `AppNav.vue`**

Remplacer

```vue
      <NuxtLink to="/" class="topbar__brand">🏸 Bad Elo</NuxtLink>
```

par

```vue
      <NuxtLink to="/" class="topbar__brand"
        >BAD <span class="topbar__brand-accent">ELO</span></NuxtLink
      >
```

- [ ] **Step 2 : Remplacer le bloc `<style scoped lang="scss">` de `AppNav.vue`**

```scss
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: $color-primary;
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
  font-family: $font-display;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: $color-on-primary;
  text-decoration: none;
}

.topbar__brand-accent {
  color: $color-accent;
}

.topbar__links {
  display: flex;
  align-items: center;
  gap: $space-4;
}

.topbar__link {
  padding: $space-1 0;
  font: inherit;
  font-weight: 600;
  color: $color-on-primary;
  text-decoration: none;
  background: none;
  border: 0;
  border-bottom: 3px solid transparent;
  cursor: pointer;

  &.router-link-exact-active {
    border-bottom-color: $color-accent;
  }
}

.topbar__link--desktop {
  display: none;

  @include md-up {
    display: inline-flex;
  }
}

.topbar__logout {
  font-weight: 400;
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
  font-family: $font-display;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: $color-muted;
  text-decoration: none;

  &.router-link-exact-active {
    color: $color-primary;
    box-shadow: inset 0 3px 0 $color-accent;
  }

  &--cta {
    margin: $space-2;
    color: $color-primary;
    background: $color-accent;
    border-radius: $radius;

    &.router-link-exact-active {
      background: $color-accent-dark;
      box-shadow: none;
    }
  }
}
```

- [ ] **Step 3 : Réécrire `app/components/AdminNav.vue`**

```vue
<template>
  <nav class="admin-nav" aria-label="Administration">
    <NuxtLink to="/admin/matchs" class="pill">Matchs</NuxtLink>
    <NuxtLink to="/admin/joueurs" class="pill">Joueurs</NuxtLink>
    <NuxtLink to="/admin/groupes" class="pill">Groupes</NuxtLink>
  </nav>
</template>

<style scoped lang="scss">
.admin-nav {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  margin-bottom: $space-6;
}
</style>
```

- [ ] **Step 4 : Filtres de `app/pages/index.vue`**

Dans les deux boutons de filtre, remplacer `class="btn"` par `class="pill"` et `'btn--primary'` par `'pill--active'` :

```vue
      <button
        type="button"
        class="pill"
        :class="{ 'pill--active': selectedGroup === undefined }"
        @click="selectedGroup = undefined"
      >
        Tous
      </button>
      <button
        v-for="group in groups"
        :key="group.id"
        type="button"
        class="pill"
        :class="{ 'pill--active': selectedGroup === group.id }"
        @click="selectedGroup = group.id"
      >
        {{ group.name }}
      </button>
```

- [ ] **Step 5 : Vérifier qu'il ne reste aucune référence à la variable supprimée**

Run : `grep -rn 'color-primary-dark' app`
Expected : aucune sortie.

- [ ] **Step 6 : Vérifier**

Run : `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected : tout au vert, build sans erreur Sass.

- [ ] **Step 7 : Commit**

```bash
git add app/components/AppNav.vue app/components/AdminNav.vue app/pages/index.vue
git commit -m "style: navigation marine et filtres en pastilles"
```

---

### Task 3 : Écrans (classement, profil joueur, historique, saisie)

**Files :**
- Modify : `app/components/RankingTable.vue` (cellule du rang + styles), `app/pages/joueurs/[id].vue` (résumé + bloc `<style>` ajouté), `app/components/MatchHistory.vue` (`.history__score`), `app/components/MatchForm.vue` (choix du type + styles)

**Interfaces :**
- Consumes : variables de la Task 1 (`$color-primary`, `$color-accent`, `$color-bg`, `$color-surface`, `$color-border`, `$color-muted`, `$color-gold`, `$color-silver`, `$color-bronze`, `$font-display`, `$radius`). `RankingRow.rank: number` (déjà dans `#shared/models`).

- [ ] **Step 1 : Médailles et Elo dans `RankingTable.vue`**

Template, remplacer

```vue
          <td class="ranking__rank">{{ row.rank }}</td>
```

par

```vue
          <td class="ranking__rank">
            <span class="ranking__medal" :class="{ [`ranking__medal--${row.rank}`]: row.rank <= 3 }">
              {{ row.rank }}
            </span>
          </td>
```

Styles, remplacer les blocs `.ranking__rank`, `.ranking__number` et `.ranking__elo` par :

```scss
.ranking__rank {
  width: 3rem;
}

.ranking__medal {
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  font-family: $font-display;
  font-size: 1.1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: $color-primary;
  background: $color-bg;
  border-radius: 50%;

  &--1 {
    background: $color-gold;
  }

  &--2 {
    background: $color-silver;
  }

  &--3 {
    background: $color-bronze;
  }
}

.ranking__number {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.ranking__elo {
  font-family: $font-display;
  font-size: 1.35rem;
  font-weight: 700;
  color: $color-primary;
}
```

- [ ] **Step 2 : Elo en grand dans `app/pages/joueurs/[id].vue`**

Remplacer

```vue
      <p class="muted">
        {{ profile.groupName }} · <strong>{{ profile.elo }}</strong> Elo ·
        {{ profile.history.length }} match{{ profile.history.length > 1 ? 's' : '' }}
      </p>
```

par

```vue
      <p class="player__elo">
        <span class="player__elo-value">{{ profile.elo }}</span> Elo
      </p>
      <p class="muted">
        {{ profile.groupName }} · {{ profile.history.length }} match{{
          profile.history.length > 1 ? 's' : ''
        }}
      </p>
```

et ajouter en fin de fichier :

```vue
<style scoped lang="scss">
.player__elo {
  margin: 0 0 $space-1;
  font-family: $font-display;
  font-size: 1.4rem;
  font-weight: 700;
  text-transform: uppercase;
  color: $color-primary;
}

.player__elo-value {
  font-size: 3rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
</style>
```

- [ ] **Step 3 : Score dans `MatchHistory.vue`**

Remplacer le bloc `.history__score` par :

```scss
.history__score {
  font-family: $font-display;
  font-size: 1.4rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: $color-primary;
}
```

- [ ] **Step 4 : Sélecteur segmenté dans `MatchForm.vue`**

Template, remplacer le `<fieldset class="match-form__type">…</fieldset>` par (les radios restent de vrais `<input type="radio">`, donc clavier et lecteurs d'écran fonctionnent comme avant) :

```vue
    <fieldset>
      <legend>Type de match</legend>
      <div class="match-form__segmented">
        <label class="match-form__choice"
          ><input v-model="type" type="radio" value="single" /> Simple</label
        >
        <label class="match-form__choice"
          ><input v-model="type" type="radio" value="double" /> Double</label
        >
      </div>
    </fieldset>
```

Styles, remplacer les blocs `.match-form__type` et `.match-form__choice` par :

```scss
.match-form__segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-1;
  padding: $space-1;
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius;
}

.match-form__choice {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  font-family: $font-display;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: $color-muted;
  border-radius: calc(#{$radius} - #{$space-1});
  cursor: pointer;

  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    min-height: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  &:has(input:checked) {
    color: $color-accent;
    background: $color-primary;
  }

  &:has(input:focus-visible) {
    outline: 2px solid $color-primary;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px $color-accent;
  }
}
```

- [ ] **Step 5 : Contrôle de la règle de l'accent**

Run : `grep -rn 'color: \$color-accent' app`
Expected : uniquement des sélecteurs posés sur fond marine : `.topbar__brand-accent`, `.pill--active`, `.match-form__choice:has(input:checked)`. Toute autre occurrence enfreint la règle d'usage et doit être corrigée.

- [ ] **Step 6 : Vérifier**

Run : `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected : tout au vert.

Contrôle manuel (`pnpm dev`, puis l'émulation mobile des devtools à 360 px, et sur ordinateur) :
- **Classement** : médailles du top 3, Elo en police de titres, aucun défilement horizontal de la page, y compris avec un nom long (`pnpm db:seed` fournit des données).
- **Profil joueur** : Elo en grand, Δ en pastilles.
- **Saisie** : sélecteur simple/double. Au clavier (Tab puis flèches), le focus reste visible et le choix change.
- **Barre du haut** : le focus clavier est visible sur les liens blancs (halo accent).
- **Connexion, une page admin** : rendu cohérent.
- **Police bloquée** (devtools → Network → bloquer `/fonts/`) : la police système prend le relais et la mise en page tient.

- [ ] **Step 7 : Commit**

```bash
git add app/components/RankingTable.vue app/pages/joueurs/[id].vue app/components/MatchHistory.vue app/components/MatchForm.vue
git commit -m "style: médailles du classement, Elo en grand et sélecteur simple/double"
```
