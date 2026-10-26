# Contexte projet

Site web construit avec ce stack :

- **Framework** : Vue.js / Nuxt.js (Composition API, `<script setup lang="ts">`)
- **Langage** : TypeScript partout (composants, composables, config) — pas de `.js` nu
- **Style** : SCSS (Sass)
- **Package manager** : pnpm — ne jamais utiliser npm ou yarn, ne jamais générer de `package-lock.json` ou `yarn.lock`
- **Lint / format** : ESLint + Prettier
- **Environnement dev** : VSCode sous WSL
- **Déploiement** : sites conteneurisés avec Docker

## Méthodologie

Réponds toujours en français.

Ces principes privilégient la prudence à la vitesse — pour une tâche triviale, fais preuve de discernement.

**Réfléchir avant de coder**
- Énonce explicitement tes hypothèses ; en cas de doute, demande plutôt que de supposer.
- S'il existe plusieurs interprétations possibles, présente-les — ne tranche pas en silence.
- S'il existe une approche plus simple, mentionne-la, quitte à contester la demande.
- Si un point n'est pas clair, arrête-toi, nomme précisément ce qui bloque, et pose la question.

**Priorité à la simplicité**
- Le strict minimum de code pour résoudre le problème, rien de spéculatif.
- Pas d'abstraction pour du code à usage unique, pas de flexibilité/configurabilité superflue.
- Si 50 lignes suffisent là où 200 ont été écrites, réécris.

**Modifications chirurgicales**
- Ne touche qu'au strict nécessaire ; ne refactorise pas ce qui fonctionne.
- Signale le code mort sans rapport avec la tâche plutôt que de le supprimer.
- Supprime uniquement les imports/variables/fonctions devenus orphelins à cause du changement en cours — pas le code mort préexistant.
- Chaque ligne modifiée doit pouvoir être rattachée directement à la demande.

**Exécution orientée objectifs**
- Transforme chaque tâche en critère vérifiable (ex. « corriger le bug » → « écrire un test qui le reproduit, puis le faire passer »).
- Pour une tâche en plusieurs étapes, énonce un plan succinct avec une vérification par étape.

## Conventions de code

- Composants en `<script setup lang="ts">` — ne pas mélanger Options API et Composition API dans un même projet.
- Typer explicitement les props (`defineProps<{ ... }>()`), les emits (`defineEmits<{ ... }>()`) et les retours de composables. Éviter `any`.
- Nommage des composants en PascalCase (`UserCard.vue`), des fichiers de composables en camelCase préfixés `use` (`useAuth.ts`).
- Profiter des auto-imports Nuxt (composants, composables, `#imports`) plutôt que d'importer manuellement ce que Nuxt importe déjà tout seul.
- SCSS : variables et mixins centralisés (ex. `assets/scss/_variables.scss`, `_mixins.scss`), éviter les sélecteurs imbriqués sur plus de 3 niveaux.
- Toujours vérifier si un composant/utilitaire similaire existe déjà dans le projet avant d'en créer un nouveau.

## Commandes

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint        # ESLint
pnpm format      # Prettier
pnpm typecheck   # vue-tsc / nuxt typecheck
```

(Adapter si les scripts du `package.json` du projet diffèrent.)

## À ne pas faire

- Ne pas ajouter de dépendance (UI kit, librairie de composants, state manager, etc.) sans demander — le choix se fait projet par projet.
- Ne pas configurer Tailwind ou un autre framework CSS utilitaire : ce stack utilise SCSS pur.
- Ne pas committer de fichiers de lock d'un autre gestionnaire que pnpm.
- Ne pas toucher aux fichiers de config Docker sans lire la skill `deploy-docker`.

## Skills disponibles

- `deploy-docker` : à charger dès qu'il s'agit de Dockerfile ou docker-compose pour ce projet.
- `vue`, `nuxt` : conventions Vue 3 / Nuxt (Composition API, auto-imports, structure).
