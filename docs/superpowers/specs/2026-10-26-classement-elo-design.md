# Classement Elo du club de badminton — design (cycle 1)

Date : 2026-10-26

## Objectif

Remplacer le tableur de classement du club de badminton de l'école par un site web responsive où les membres :

- se créent un compte (email, prénom, nom, mot de passe, groupe) ;
- saisissent eux-mêmes leurs matchs, sans passer par le professeur ;
- consultent un classement Elo commun, filtrable par groupe.

Un joueur faible qui bat un joueur fort doit gagner beaucoup de points (comportement natif de l'Elo).

**Critères de succès**

- Un joueur peut s'inscrire puis saisir un match depuis son téléphone en moins d'une minute.
- Le classement est à jour immédiatement après chaque saisie.
- Un admin peut corriger ou supprimer n'importe quel match, et le classement reste cohérent.

## Contexte et contraintes

- Environ 40 joueurs, 2 séances hebdomadaires = 2 groupes.
- Stack imposé : Nuxt (Composition API, `<script setup lang="ts">`), TypeScript, SCSS, pnpm, ESLint + Prettier, déploiement Docker.
- Le classement existant n'est pas repris : tout le monde démarre à 1000.

## Découpage

Le projet est découpé en deux cycles spec → plan → implémentation :

1. **Ce document** : comptes, groupes, saisie des matchs, classement Elo, administration.
2. **Plus tard** : tournois (poules puis tableau final à élimination directe, simple ou double au choix à la création, matchs comptés pour l'Elo). Le champ `matches.tournamentId` est réservé dès ce cycle.

## Décisions

| Sujet | Décision |
|---|---|
| Types de match | Simple et double, un seul classement commun |
| Fiabilité des scores | Confiance totale : un match saisi compte immédiatement ; seul un admin peut corriger ou supprimer |
| Connexion | Email + mot de passe ; en cas d'oubli, un admin réinitialise le mot de passe (aucun envoi d'email) |
| Domaine email | Aucune restriction |
| Groupes | Un seul Elo par joueur ; classement global filtrable par groupe ; matchs inter-groupes autorisés ; le joueur choisit son groupe à l'inscription, un admin peut le changer |
| Format d'un match | Un seul set, limite de points libre ; on saisit les deux scores ; l'Elo ne dépend que de la victoire |
| Elo initial | 1000 pour tous |
| Facteur K | 32, fixe |
| Classement | Public (consultable sans compte) |

## Architecture

Application Nuxt full-stack dans un seul conteneur :

- routes API Nitro dans `server/api/` ;
- base **SQLite** (fichier sur volume Docker) via **Drizzle ORM** (`drizzle-orm`, `better-sqlite3`, `drizzle-kit` en dev) ;
- sessions par cookie chiffré et hachage scrypt via **nuxt-auth-utils** ;
- validation des entrées avec **zod**, schémas partagés front/serveur ;
- tests avec **Vitest**.

Ces dépendances ont été validées. Aucune autre dépendance n'est ajoutée sans accord.

## Modèle de données

### `groups`

| Champ | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `name` | text | Ex. « Mardi », « Jeudi ». Deux groupes créés par le seed, renommables par un admin |

### `users`

| Champ | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `email` | text unique | Stocké en minuscules |
| `firstName` | text | |
| `lastName` | text | |
| `passwordHash` | text | Nullable une fois le compte anonymisé |
| `groupId` | integer FK → groups | |
| `role` | text | `player` \| `admin` |
| `elo` | integer | Valeur en cache, recalculée ; défaut 1000 |
| `deletedAt` | timestamp nullable | Compte anonymisé si renseigné |
| `createdAt` | timestamp | |

### `matches`

| Champ | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `type` | text | `single` \| `double` |
| `scoreA` | integer | ≥ 0 |
| `scoreB` | integer | ≥ 0, différent de `scoreA` |
| `playedAt` | date | Choisie par le joueur, aujourd'hui par défaut, jamais dans le futur |
| `createdBy` | integer FK → users | Traçabilité en cas d'abus |
| `tournamentId` | integer nullable | Réservé au cycle 2, toujours `null` dans ce cycle |
| `createdAt` | timestamp | |

### `match_players`

| Champ | Type | Notes |
|---|---|---|
| `matchId` | integer FK → matches | Suppression en cascade |
| `userId` | integer FK → users | |
| `side` | text | `A` \| `B` |
| `eloBefore` | integer | Écrit par le recalcul |
| `eloDelta` | integer | Écrit par le recalcul |

Clé primaire : (`matchId`, `userId`). Simple : 1 joueur par côté. Double : 2 joueurs par côté. Le vainqueur est le côté au score le plus élevé.

## Calcul Elo

- Elo initial : 1000. K = 32.
- Score attendu : `E = 1 / (1 + 10^((R_adverse − R_soi) / 400))`.
- Variation : `Δ = round(K × (S − E))`, avec `S = 1` en cas de victoire et `0` en cas de défaite.
- Double : la note d'une équipe est la moyenne des notes de ses deux joueurs ; chaque joueur de l'équipe reçoit le même Δ.
- Le Δ est calculé une fois pour le côté A ; le côté B reçoit `−Δ`. La somme des points est ainsi conservée.

Exemples de référence (servent de tests) :

| Situation | Δ vainqueur | Δ perdant |
|---|---|---|
| 1000 bat 1400 | +29 | −29 |
| 1400 bat 1000 | +3 | −3 |
| 1000 bat 1000 | +16 | −16 |

### Recalcul

Une seule fonction, `recomputeAll`, écrit les Elo :

1. remettre tous les joueurs à 1000 en mémoire ;
2. parcourir tous les matchs triés par `playedAt`, puis `createdAt`, puis `id` ;
3. pour chaque match, écrire `eloBefore` et `eloDelta` de chaque participant et mettre à jour sa note en mémoire ;
4. écrire `users.elo` pour tous les joueurs.

Elle est appelée après chaque création, modification ou suppression de match, **dans la même transaction** que l'écriture du match. Si elle échoue, l'opération entière est annulée. Les comptes anonymisés gardent leurs matchs et participent au recalcul.

## Pages

### Publiques

- `/` — classement : rang, nom, groupe, Elo, nombre de matchs, victoires/défaites ; filtre « Tous » / groupe 1 / groupe 2. Les comptes anonymisés et les joueurs sans aucun match n'apparaissent pas.
- `/joueurs/[id]` — profil : Elo actuel et historique des matchs (date, type, partenaire, adversaires, score, Δ Elo).
- `/connexion`, `/inscription`.

### Joueur connecté

- `/matchs/nouveau` — saisie mobile-first : type (simple/double) → partenaire (double) → adversaire(s) → les deux scores → date. Le saisissant est forcément l'un des joueurs. La sélection se fait par recherche de nom, avec les membres de son groupe proposés en premier. Après validation, un récapitulatif affiche les variations d'Elo.
- `/profil` — modifier prénom, nom, groupe et mot de passe (ancien mot de passe exigé) ; supprimer son compte (mot de passe exigé).
- `/joueurs/[id]` — un participant d'un match peut le modifier (joueurs, scores, date) ou le supprimer, sans limite de temps.

### Admin

- `/admin/matchs` — liste de tous les matchs, modification (joueurs, scores, date) et suppression.
- `/admin/joueurs` — changer le groupe ou le rôle, définir un mot de passe temporaire, supprimer (anonymiser) un compte.
- `/admin/groupes` — renommer les groupes.

### Navigation

Barre en haut sur desktop, barre d'onglets en bas sur mobile (Classement, Saisir un match, Profil). « Saisir un match » est mis en avant. Les liens admin ne sont visibles que pour les admins.

## API

| Route | Accès | Rôle |
|---|---|---|
| `POST /api/auth/register` | public | Inscription, ouvre une session |
| `POST /api/auth/login` | public | Connexion |
| `POST /api/auth/logout` | connecté | Déconnexion |
| `GET /api/groups` | public | Liste des groupes |
| `GET /api/ranking?group=` | public | Classement, filtrable |
| `GET /api/players/:id` | public | Profil + historique |
| `GET /api/players?q=` | connecté | Recherche de joueurs actifs |
| `POST /api/matches` | connecté | Saisie d'un match |
| `PATCH /api/me` | connecté | Modifier son profil |
| `PATCH /api/me/password` | connecté | Changer son mot de passe |
| `GET /api/admin/matches` | admin | Liste des matchs |
| `PATCH /api/admin/matches/:id` | admin | Corriger un match |
| `DELETE /api/admin/matches/:id` | admin | Supprimer un match |
| `PATCH /api/admin/users/:id` | admin | Groupe, rôle |
| `POST /api/admin/users/:id/reset-password` | admin | Mot de passe temporaire |
| `DELETE /api/admin/users/:id` | admin | Anonymiser un compte |
| `PATCH /api/admin/groups/:id` | admin | Renommer un groupe |

## Règles de validation (serveur, zod)

- **Inscription** : email valide et non utilisé (comparaison insensible à la casse), prénom et nom non vides, mot de passe ≥ 8 caractères, groupe existant.
- **Match** : 1 joueur par côté en simple, 2 en double ; tous les joueurs distincts, existants et non anonymisés ; le saisissant fait partie du match, et un joueur qui modifie un match doit y rester (un admin n'a pas cette contrainte) ; scores entiers ≥ 0 et différents ; date non future.
- **Admin** : un middleware serveur refuse toute route `/api/admin/*` à un non-admin. Un admin ne peut pas retirer son propre rôle admin ni anonymiser son propre compte, pour qu'il reste toujours au moins un admin.
- **Mots de passe** : hachés (scrypt, nuxt-auth-utils), jamais renvoyés au client.

## Administration initiale

Le compte qui s'inscrit avec l'email défini dans `ADMIN_EMAIL` reçoit le rôle `admin`. Les admins peuvent ensuite promouvoir d'autres joueurs.

## Suppression de compte

Un joueur peut supprimer son propre compte depuis `/profil`, un admin celui d'un autre joueur. Un compte supprimé est anonymisé : prénom/nom remplacés par « Joueur supprimé », email remplacé par une valeur unique non utilisable, mot de passe effacé, `deletedAt` renseigné. Ses matchs restent pour ne pas fausser l'Elo des autres.

## Gestion des erreurs

- Codes HTTP : 400 donnée invalide (détail par champ), 401 non connecté, 403 non admin, 404 introuvable, 409 email déjà utilisé.
- Les formulaires affichent les erreurs sous chaque champ, en français.
- Création, modification ou suppression d'un match + recalcul dans une même transaction.

## Limite connue, acceptée

N'importe quel membre connecté peut saisir un match contre n'importe qui. Garde-fous : historique visible sur chaque profil, `createdBy` enregistré, correction par un participant ou un admin.

## Structure du projet

```
app/
  pages/            index.vue, joueurs/[id].vue, connexion.vue, inscription.vue,
                    matchs/nouveau.vue, profil.vue, admin/{matchs,joueurs,groupes}.vue
  components/       RankingTable.vue, MatchForm.vue, PlayerPicker.vue,
                    MatchHistory.vue, AppNav.vue, …
  middleware/       auth.ts, admin.ts
  assets/scss/      _variables.scss, _mixins.scss, main.scss
server/
  api/              routes ci-dessus
  database/         schema.ts, migrations/, seed (2 groupes)
  utils/            elo.ts (pur), recompute.ts, db.ts
  middleware/       admin.ts
shared/             schémas zod partagés
```

## Tests (Vitest)

- `elo.ts` : exemples de référence, symétrie des Δ, note d'équipe en double.
- `recompute.ts` (SQLite en mémoire) : une suite de matchs donne les Elo attendus ; supprimer un match intermédiaire corrige les Elo suivants ; un match saisi avec une date passée s'insère au bon endroit.
- Routes API : refus d'un score à égalité, d'un saisissant absent du match, d'un double incomplet, d'une date future ; refus des routes admin à un joueur.
- Pas de tests end-to-end navigateur dans ce cycle ; le responsive est vérifié manuellement.

## Déploiement

- Un conteneur Docker, Dockerfile écrit en suivant la skill `deploy-docker`.
- SQLite sur un volume : `/data/bad.db`. Migrations Drizzle appliquées au démarrage, puis seed des groupes s'ils n'existent pas.
- Variables : `NUXT_SESSION_PASSWORD`, `ADMIN_EMAIL`, `DATABASE_PATH`.
- Sauvegarde : copie du fichier `.db`, procédure documentée dans le README.

## Hors périmètre de ce cycle

- Tournois (cycle 2).
- Envoi d'emails, confirmation des matchs par l'adversaire, graphique d'évolution de l'Elo.
