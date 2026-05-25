# ───────────────────────────────────────────────────────
# Stage 0: Base
# ───────────────────────────────────────────────────────
FROM oven/bun:1.3.9-alpine AS base
WORKDIR /app

# ───────────────────────────────────────────────────────
# Stage 1: Prune (利用 Turbo 裁剪 Monorepo)
# ───────────────────────────────────────────────────────
FROM base AS builder
RUN bun add -g turbo
COPY . .
RUN turbo prune web --docker

# ───────────────────────────────────────────────────────
# Stage 2: Installer (安裝與打包)
# ───────────────────────────────────────────────────────
FROM base AS installer
WORKDIR /app

# 先複製 package.json 與 lockfile
COPY --from=builder /app/out/json/ .
# 【修正重點】相容新舊版 bun.lock / bun.lockb 的動態檔名，並維持你原本的鎖定名稱
COPY --from=builder /app/out/bun.lock* ./
# 保留你寫的超讚網路重試機制
RUN for i in 1 2 3; do bun install --frozen-lockfile && exit 0; sleep 5; done; exit 1

# 複製其餘原始碼並進行打包
COPY --from=builder /app/out/full/ .
RUN mkdir -p /app/apps/web/public

# NEXT_PUBLIC_* 必須在編譯時（Build time）注入
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_SITE_URL="http://huyouan.local"
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV API_URL=http://server:4000

RUN bun run build --filter=web

# ───────────────────────────────────────────────────────
# Stage 3: Runner (極小化生產環境，使用 Node 執行)
# ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# 【修正重點】直接將 standalone 的目錄內容解構到 /app 根目錄
# 這樣 node_modules 與 server.js 的相對路徑才會正確
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# 【修正重點】將 static 和 public 放進對應的應用程式目錄下，防止 PWA 靜態資源破圖
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

# 啟動路徑保持不變，完美對齊
CMD ["node", "apps/web/server.js"]