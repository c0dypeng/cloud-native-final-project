# syntax=docker/dockerfile:1
# apps/server/Dockerfile — Express API + SSE + node-cron

FROM oven/bun:1 AS base
WORKDIR /app

# Stage 1: prune monorepo down to `server` and its workspace deps.
FROM base AS builder
RUN bun add -g turbo
COPY . .
RUN turbo prune server --docker

# Stage 2: install + build (api-contracts → database → server in dep order).
FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile
COPY --from=builder /app/out/full/ .
# `turbo run build --filter=server` builds api-contracts + database first
# thanks to dependsOn: ["^build"] in turbo.json.
RUN bun run build --filter=server

# Stage 3: minimal Node runtime. We keep the full workspace symlink layout
# because the compiled server still resolves `@workspace/database` to the
# dist/ of the local package via its package.json `exports`.
FROM node:20-alpine AS runner
WORKDIR /app

# Workspace package dist + package.json (no source maps shipped to prod).
COPY --from=installer /app/packages/api-contracts/package.json ./packages/api-contracts/package.json
COPY --from=installer /app/packages/api-contracts/dist ./packages/api-contracts/dist
COPY --from=installer /app/packages/api-contracts/node_modules ./packages/api-contracts/node_modules
COPY --from=installer /app/packages/database/package.json ./packages/database/package.json
COPY --from=installer /app/packages/database/dist ./packages/database/dist
COPY --from=installer /app/packages/database/drizzle ./packages/database/drizzle
COPY --from=installer /app/packages/database/node_modules ./packages/database/node_modules

# Server build artefacts and resolved deps.
COPY --from=installer /app/apps/server/dist ./apps/server/dist
COPY --from=installer /app/apps/server/package.json ./apps/server/package.json
COPY --from=installer /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=installer /app/node_modules ./node_modules

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 expressjs \
 && chown -R expressjs:nodejs /app
USER expressjs

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

WORKDIR /app/apps/server
CMD ["node", "dist/index.js"]
