# apps/admin/Dockerfile — Next.js 16 admin console
FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS builder
RUN bun add -g turbo
COPY . .
RUN turbo prune admin --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/bun.lock ./bun.lock
RUN for i in 1 2 3 4 5 6 7 8 9 10; do bun install --frozen-lockfile && break || { echo "bun install retry $i"; sleep 4; }; done
COPY --from=builder /app/out/full/ .
RUN mkdir -p /app/apps/admin/public

ARG NEXT_PUBLIC_API_URL=""
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV API_URL=http://server:4000

RUN bun run build --filter=admin

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=installer --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
