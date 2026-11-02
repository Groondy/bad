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
