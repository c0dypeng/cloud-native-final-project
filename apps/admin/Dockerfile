# ───────────────────────────────────────────────────────
# Stage 1: Base
# ───────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS base
WORKDIR /app

# ───────────────────────────────────────────────────────
# Stage 2: Prune (利用 Turbo 裁剪 Monorepo)
# ───────────────────────────────────────────────────────
FROM base AS builder
RUN for i in 1 2 3 4 5; do bun add -g turbo && exit 0; sleep 3; done; exit 1
COPY . .
# 產生只包含 admin 及其依賴的輕量化原始碼於 /app/out
RUN turbo prune admin --docker

# ───────────────────────────────────────────────────────
# Stage 3: Installer (安裝與打包)
# ───────────────────────────────────────────────────────
FROM base AS installer
WORKDIR /app

# 先複製 package.json 與 lockfile 以利利用 Docker Layer 快取
COPY --from=builder /app/out/json/ .
# 這裡確保能同時相容新版 bun.lock 與舊版 bun.lockb
COPY --from=builder /app/out/bun.lock* ./
RUN for i in 1 2 3; do bun install --frozen-lockfile && exit 0; sleep 5; done; exit 1

# 複製其餘原始碼並進行打包
COPY --from=builder /app/out/full/ .
RUN mkdir -p /app/apps/admin/public

ARG NEXT_PUBLIC_API_URL=""
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN bun run build --filter=admin

# ───────────────────────────────────────────────────────
# Stage 4: Runner (極小化生產環境，使用 Node 執行)
# ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# 【修正重點】直接把 standalone 裡面的內容拷貝到 /app 根目錄
# 這樣 server.js 就會直接在 /app/apps/admin/server.js 運行
COPY --from=installer --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
# 【修正重點】依據 Next.js 官方規範，static 必須放在對應應用程式目錄下
COPY --from=installer --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public

USER nextjs

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

EXPOSE 3001

# 執行路徑保持不變，但內部結構已完美對齊
CMD ["node", "apps/admin/server.js"]