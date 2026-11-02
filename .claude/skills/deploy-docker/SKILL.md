---
name: deploy-docker
description: A charger dès qu'il s'agit de conteneuriser ce site (Dockerfile, docker-compose, build de l'image) — utilisé pour tous les projets de ce stack.
---

# Déploiement Docker

Chaque site est packagé dans une image Docker, buildée en multi-stage pour rester légère.

## Principes

- Build multi-stage : un stage pour installer les dépendances (pnpm), un stage pour le build Nuxt (`nuxt build`, sortie Nitro), un stage final minimal qui ne contient que `.output/` et Node.
- Le serveur Nitro (`node .output/server/index.mjs`) sert l'app directement — pas besoin de nginx séparé sauf demande explicite.
- Le container expose un port interne (3000 par défaut) via `EXPOSE` dans le Dockerfile ; comment ce port est ensuite exposé/routé à l'extérieur (reverse proxy, mapping de port, etc.) dépend de l'hébergement du projet et n'est pas couvert par cette skill.

## Fichier de référence

- `reference/Dockerfile.example` — build multi-stage Nuxt/Nitro avec pnpm, à adapter au projet (version de Node, `PORT` si besoin).

Lire ce fichier avant de générer le Dockerfile réel du projet, et remplacer les éléments génériques par les valeurs réelles.

## À ne pas faire

- Ne pas exposer de port hôte par défaut dans un `docker-compose.yml` sans que ce soit demandé — ça dépend de comment le site sera exposé.
- Ne pas dupliquer une config nginx si le serveur Nitro suffit.
- Ne pas inventer de config de reverse proxy (Traefik, nginx, etc.) : ce n'est pas couvert ici, demander si le projet en a besoin.
