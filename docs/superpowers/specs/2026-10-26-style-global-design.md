# Style global « Volant » — design

Date : 2026-10-26

## Objectif

Donner au site une identité visuelle sportive et énergique, sans perdre en efficacité : la saisie d'un match sur mobile et la lecture du classement restent les priorités.

**Critères de succès**

- Toutes les paires texte/fond respectent le contraste WCAG AA (4,5:1 pour le texte courant).
- Aucune fonctionnalité, donnée ni route ne change : `pnpm lint`, `pnpm typecheck` et `pnpm test` restent au vert.
- Le site reste utilisable à 360 px de large (cibles tactiles ≥ 44 px, pas de défilement horizontal de la page).

## Décisions

| Sujet | Décision |
|---|---|
| Identité existante | Aucune, carte blanche |
| Ambiance | Sportif énergique (direction « Volant », choisie face à « Smash » sur maquette) |
| Thème | Clair uniquement |
| Typographie | Webfont de titres auto-hébergée, texte courant en police système |
| Dépendances | Aucune nouvelle dépendance npm ; aucun appel à un CDN de polices |

## Fondations

Fichiers : `app/assets/scss/_variables.scss`, `_mixins.scss`, `main.scss`.

### Couleurs

| Variable | Valeur | Usage |
|---|---|---|
| `$color-primary` | `#0B1F3A` (marine) | Barre du haut, titres, texte fort, liens |
| `$color-on-primary` | `#FFFFFF` | Texte sur fond marine (liens de la barre du haut) |
| `$color-accent` | `#C6F432` (vert-jaune volant) | Bouton primaire, onglet actif, pastille « Saisir », logo |
| `$color-accent-dark` | `#B2DE1F` | Survol de l'accent |
| `$color-bg` | `#F4F6F9` | Fond de page |
| `$color-surface` | `#FFFFFF` | Cartes, champs |
| `$color-text` | `#0B1F3A` | Texte courant |
| `$color-muted` | `#5B6577` | Texte secondaire |
| `$color-border` | `#E3E7EC` | Bordures |
| `$color-success` / `-bg` | `#166534` / `#E7F6EC` | Δ positif, messages de succès |
| `$color-danger` / `-bg` | `#B91C1C` / `#FDECEC` | Δ négatif, erreurs, actions destructrices |
| `$color-gold` / `-silver` / `-bronze` | `#F5C542` / `#CFD6DE` / `#E0A46B` | Médailles du top 3 (fond, chiffre marine) |

**Règle** : l'accent s'utilise toujours en aplat sous du texte marine, jamais comme couleur de texte sur fond clair (contraste 1,28:1). Sur fond marine, il peut servir de couleur de texte (logo).

Contrastes vérifiés : marine/accent 12,9 ; marine/blanc 16,5 ; marine/fond 15,3 ; muted/fond 5,4 ; succès/pastille 6,4 ; danger/pastille 5,7.

Le vert et le rouge sont réservés aux Δ d'Elo et aux messages, pour qu'aucune autre couleur ne s'y confonde.

### Typographie

- *Barlow Condensed* (licence OFL), graisses 600 et 700, sous-ensemble latin, `.woff2`, dans `public/fonts/`, avec le fichier de licence `OFL.txt`.
- `@font-face` dans `main.scss`, `font-display: swap`.
- `$font-display: 'Barlow Condensed', $font-family` : titres (`h1`, `h2`), logo, onglets, boutons, chiffres d'Elo ; en capitales avec un léger espacement des lettres.
- Texte courant : police système actuelle (`$font-family`).
- `font-variant-numeric: tabular-nums` sur les chiffres (Elo, scores, V/D, Δ).

### Formes et focus

- `$radius: 10px`.
- Focus clavier (`:focus-visible`) : contour marine 2 px + halo accent, sur les boutons, liens et champs.

## Composants globaux

- **Barre du haut** (`AppNav.vue`, desktop) : fond marine, logo texte « BAD **ELO** » avec « ELO » en accent, liens blancs ; lien actif souligné en accent.
- **Barre d'onglets** (`AppNav.vue`, mobile) : fond blanc, bordure haute ; onglet actif en marine gras avec un trait accent en haut ; l'onglet « Saisir un match » porte une pastille accent pour être mis en avant.
- **Boutons** (`.btn`) : primaire = fond accent, texte marine, police de titres ; secondaire = fond blanc bordé ; danger = inchangé (texte et bordure rouges).
- **Filtres de groupe** (page classement) : pastilles arrondies ; pastille active en marine avec texte accent.
- **Δ d'Elo** (`.delta--up`, `.delta--down`) : petites pastilles colorées (texte succès/danger sur fond `-bg`).
- **Cartes, alertes, champs** : nouvelles couleurs et nouvel arrondi, structure inchangée.
- Navigation admin (`AdminNav.vue`) : mêmes pastilles que les filtres.

## Écrans

Changements de style uniquement (SCSS et classes), sans modification des données, des appels API ni de la logique des composants.

- **Classement** (`RankingTable.vue`) : reste un tableau ; rangs 1 à 3 dans une médaille ronde or/argent/bronze ; Elo en police de titres, plus grand.
- **Profil joueur** (`joueurs/[id].vue`, `MatchHistory.vue`) : Elo actuel affiché en grand en police de titres ; Δ de l'historique en pastilles.
- **Saisie de match** (`MatchForm.vue`) : choix simple/double en sélecteur segmenté à deux gros boutons (option active en marine, texte accent).
- **Admin, connexion, inscription, profil** : héritent des styles globaux, ajustements ponctuels seulement si un style local entre en conflit.

## Hors périmètre

- Thème sombre.
- Bouton flottant « Saisir un match » (l'onglet suffit).
- Δ du dernier match dans le classement (donnée absente de l'API).
- Toute modification de structure des composants, des routes ou des données.

## Vérification

- `pnpm lint`, `pnpm typecheck`, `pnpm test` au vert.
- Contrastes : ceux listés plus haut ; toute nouvelle paire introduite pendant l'implémentation est vérifiée de la même façon.
- Contrôle visuel manuel à 360 px et sur desktop : classement, profil joueur, saisie de match, connexion, une page admin.
