# apps/web/Dockerfile — Next.js 16 PWA for employees + managers
FROM oven/bun:1 AS base
WORKDIR /app

# Stage 1: prune the monorepo down to just `web` and its deps.
FROM base AS builder
RUN bun add -g turbo
COPY . .
RUN turbo prune web --docker

# Stage 2: install + build.
FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile
COPY --from=builder /app/out/full/ .
RUN mkdir -p /app/apps/web/public

# NEXT_PUBLIC_* must be baked into the JS bundle at build time.
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_SITE_URL="http://huyouan.local"
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN bun run build --filter=web

# Stage 3: minimal Node runtime serving the Next.js standalone output.
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
USER nextjs

# Next.js standalone bundle copies the necessary node_modules + server.js.
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
