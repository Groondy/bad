# Template Claude Code — sites Vue/Nuxt

Dossier de base à copier dans chaque nouveau projet Vue/Nuxt/SCSS/pnpm.

## Utilisation

1. Copier `CLAUDE.md` et `.claude/` à la racine du nouveau projet.
2. Adapter `CLAUDE.md` si le projet a des spécificités (TypeScript ou non, librairies utilisées, etc.).
3. Compléter au fil du projet : ajouter des sections au `CLAUDE.md`, ou de nouvelles skills dans `.claude/skills/` (ex. une skill pour une API interne, un CMS headless, etc.).

## Contenu

- `CLAUDE.md` — contexte stack + conventions de code, à charger automatiquement par Claude Code.
- `.claude/skills/deploy-docker/` — skill + fichier de référence (Dockerfile multi-stage) pour conteneuriser le site.
- `.claude/skills/vue/`, `.claude/skills/nuxt/`, `.claude/skills/pnpm/` — conventions Vue 3 / Nuxt / pnpm.

Volontairement minimal pour l'instant : pas de skill de test ni de librairie UI imposée, à ajouter projet par projet selon le besoin réel.
