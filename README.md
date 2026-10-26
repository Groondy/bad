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

TypeScript est épinglé en `^6` : TypeScript 7 casse actuellement typescript-eslint et vue-tsc.

| Commande                    | Rôle                                                                   |
| --------------------------- | ---------------------------------------------------------------------- |
| `pnpm test`                 | Tests Vitest (Elo, recalcul, services)                                 |
| `pnpm lint` / `pnpm format` | ESLint / Prettier                                                      |
| `pnpm typecheck`            | Vérification TypeScript                                                |
| `pnpm db:generate`          | Génère une migration après modification de `server/database/schema.ts` |
| `pnpm db:seed`              | Ajoute des joueurs et matchs de démo (nécessite `pnpm dev` lancé)      |

## Variables d'environnement

| Variable                | Rôle                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| `NUXT_SESSION_PASSWORD` | Secret des sessions, 32 caractères minimum (obligatoire en production) |
| `ADMIN_EMAIL`           | Email du premier admin                                                 |
| `DATABASE_PATH`         | Fichier SQLite (`data/bad.db` en dev, `/data/bad.db` dans l'image)     |

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
