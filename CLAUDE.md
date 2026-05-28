# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working with this repository.

This is **護你安 HuYouAn** — an employee safety & response system (final
project for 雲原生應用程式開發, 114-2). The architecture is a single Express
API plus two Next.js frontends, all in one Bun + Turborepo monorepo.

## Build & Development Commands

```bash
bun install                    # Install all dependencies
bun dev                        # Run all apps in dev mode (web:3000, admin:3001, server:4000)
bun run build                  # Build all apps/packages (api-contracts compiles before consumers)
bun lint                       # Lint all packages
bun run typecheck              # Type check all packages
bun format                     # Prettier format *.ts, *.tsx, *.md

# Scoped to a single app
bun run --filter web dev
bun run --filter admin dev
bun run --filter server dev

# Docker / Make
make dev-docker                 # Dev mode (attached, hot-reload via volume mounts)
make up                         # Production (detached)
make down                       # Stop services
make logs                       # All logs; also logs-web, logs-admin, logs-server
make migrate                    # Run drizzle migrations against DATABASE_URL
make seed                       # Demo seed (100 users + admin)
make seed-load                  # k6 seed (10k users)
make test                       # Vitest + Supertest integration suite
make obs-up                     # Prometheus + Grafana + Loki + Promtail (compose profile)
make kind-up                    # Local Kubernetes cluster (kind) + apply manifests
make k6-report EVENT_ID=...     # Load test report surge (1k VUs)
make clean                      # Remove containers, volumes, and images
```

**Before committing, always run:** `bun lint && bun run typecheck && bun run build`

## Apps

- **`apps/web`** — Next.js 16 PWA for **employees + managers** (port 3000).
  JWT cookie auth set by server action; cookie + API calls flow same-origin
  via Next.js `rewrites()` to the backend. Routes:
  `/login`, `/dashboard`, `/dashboard/team`, `/dashboard/settings`, `/offline`.
  Service worker + manifest for install-to-home-screen.
- **`apps/admin`** — Next.js 16 admin console (port 3001). Thin client over
  the server's `/api/admin/auth/*` endpoints. `admin-session` cookie set on
  admin domain, forwarded by Next.js `rewrites()`. Routes:
  `/` (overview), `/events`, `/events/[id]`, `/users`, `/departments`,
  `/reports`.
- **`apps/server`** — Express 4 API (port 4000). Drizzle ORM + Postgres +
  PgBouncer + Redis. Auth, events, reports, stats (3s cache), manager
  recursive CTE, users CRUD, departments, SSE, reminder cron, Prometheus
  metrics, pino JSON logging.

## Packages

- **`@workspace/api-contracts`** — Zod schemas + inferred TS types shared
  between server (validation) and frontends (typed fetch). Compiled to
  `dist/` so Next.js Turbopack can consume it cleanly. Single barrel
  export from `./dist/index.js`.
- **`@workspace/database`** — Drizzle schema for the 5 tables:
  `departments`, `users`, `events`, `safety_reports`, `admin_accounts`.
  Seed script (`src/seed.ts`) supports `SEED_SCALE=demo|load` for 100 vs
  10k users via faker.
- **`@workspace/ui`** — shadcn (Base UI variant) on Tailwind v4 + OKLCH.
  Components use the `render={<Button … />}` pattern (Base UI), **not**
  Radix's `asChild`. Custom tokens include `--success`, `--warning`,
  `--info`. The `Button` component has extra `loading` / `loadingText`
  props.
- **`@workspace/eslint-config`** / **`@workspace/typescript-config`** —
  Shared configs. `typescript-config/base.json` uses `NodeNext` module
  resolution and `noUncheckedIndexedAccess: true`.

## Key Architectural Patterns

**Same-origin API via Next.js rewrites.** Both `apps/web` and `apps/admin`
expose `/api/*` paths that `next.config.ts` rewrites to the API server.
Browser → Next.js (same origin, cookie sent) → backend (cookie forwarded
via header → `extractToken` / `extractAdminSession`).

**Two parallel auth systems.**
- `apps/web` uses JWT in an httpOnly `token` cookie (8h). Server actions in
  `utils/auth/actions.ts` call `/api/auth/login` server-to-server and set
  the cookie on web's origin.
- `apps/admin` uses an admin-session UUID in an httpOnly `admin-session`
  cookie (24h). Sessions live in an in-memory `Map` on the server pod.

**Real-time updates.** Single `GET /api/sse` endpoint. Express writes
`text/event-stream`; browsers connect with `EventSource`. SSE event shapes
are a Zod discriminated union in `@workspace/api-contracts/src/sse.ts`.
Fan-out: `broadcastAll`, `broadcastToOversight`, `sendToUser`,
`sendToManagerChain`. Heartbeat every 25s prevents idle proxies from
killing the connection.

**Manager hierarchy via recursive CTE.** `users.manager_id` self-ref +
Postgres `WITH RECURSIVE`. See `apps/server/src/lib/team.ts`.

**Stats cache.** `/api/events/:id/stats` is cached in Redis for 3 seconds,
keyed by event id. Cache is `DEL`'d on every report upsert. Stats compute
is a single SQL with `COUNT(*) FILTER (WHERE status = …)` grouped by
department.

**Reminder cron.** `node-cron` `*/5 * * * *` scans every active event,
pushes SSE reminders and sends Resend email (capped at 3 per
(event, user) via Redis counter). Disabled in tests via
`REMINDER_JOB_DISABLED=1`.

**Auto-scaling.** K8s HPA on the server Deployment (2 → 10 pods, target CPU
70%). Rolling update with `maxUnavailable: 0`, PDB `minAvailable: 1`. See
`k8s/base/server.yaml`.

## UI & Styling Rules

- Always use shadcn/ui components from `@workspace/ui`. Add new ones:
  `cd packages/ui && npx shadcn@latest add [component-name]`.
- This is the **Base UI** variant of shadcn — use `render={<Button>…</Button>}`
  on triggers/closes/actions, **not** `asChild`.
- Use semantic tokens (`bg-success/15`, `text-destructive`) — never hardcode
  Tailwind colors like `bg-red-500`.
- Status colors: `safe → success`, `need_help → destructive`,
  `not_reported → muted-foreground`.
- Empty states via `<Empty>` from `@workspace/ui/components/empty`. Loading
  states via `Skeleton` + `Button` `loading` prop. Toasts via `sonner`.

## Testing

- **Unit tests** — `apps/server/src/**/*.test.ts` (14 files, 158 tests).
  Pure unit tests with mocked dependencies (no DB/Redis required). Covers:
  JWT, locale, validation, auth middleware, sessions, Redis utils, email
  templates, SSE, Prometheus metrics, Zod schemas, and all controllers.
  Run: `cd apps/server && npx vitest run src/`.
- **Backend integration** — `apps/server/tests/integration/*.test.ts` using
  Vitest + Supertest against a real Postgres + Redis. Reset between suites
  via `resetAndSeed()` in `tests/db-helper.ts`.
- **E2E** — `tests/e2e/specs/*.spec.ts` (4 files, 6 tests) using Playwright.
  Covers employee login, manager team view, safety report, admin event CRUD.
- **Load** — `tests/load/*.js` using k6. SLO: 1k VU, p95 ≤ 500ms, error
  rate ≤ 0.5%. See `tests/load/README.md`.

## Observability

- `/metrics` Prometheus endpoint on the server. Custom metrics:
  `http_requests_total`, `http_request_duration_seconds`,
  `sse_active_connections`, `report_submit_total{status, result}`,
  `reminder_emails_total{result}`, `stats_cache_hits_total/misses_total`,
  `active_events_total`, `unreported_users_total`.
- 3 Grafana dashboards committed under
  `observability/grafana/dashboards/`.
- 3 alert rules in `observability/prometheus/alerts.yml` and
  `k8s/observability/kube-prometheus-stack-values.yaml`.

## Environment

Root `.env` for Docker. Per-app `.env.local` for local dev (overrides root).
See `.env.example` for all variables. Required for the server:
`DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`. Optional: `RESEND_API_KEY` (no
key = email drops to stdout).

## Commit Style

Short, descriptive first line (e.g., "Add SSE need-help fan-out to manager
chain"). Conventional-style prefixes welcome (`feat:`, `fix:`, `docs:`).
Always run lint + typecheck + build before committing.

## Demo Bootstrap Fixes (2026-05-21)

Three small fixes made `make demo-ready` succeed on a fresh ARM64 macOS host:
- `docker-compose.yml` — pgbouncer healthcheck switched from `pg_isready`
  (not shipped in the Bitnami image) to a bash TCP probe on port 6432.
- `apps/server/Dockerfile` — runner stage now also copies
  `packages/database/node_modules` and `packages/api-contracts/node_modules`
  so workspace package `dist/` files can resolve `drizzle-orm` etc.
- `apps/admin/Dockerfile` — wrapped `bun install --frozen-lockfile` in a
  10-attempt retry loop to ride out flaky ARM64 tarball downloads
  (`@swc/core-linux-arm64-*`, `@next/swc-linux-arm64-musl`, etc.).

Demo run: `make demo-ready` → all 10 containers healthy
(web :3000, admin :3001, api :4000, grafana :3030, prometheus :9090).

## Unit Test Suite (2026-05-25)

Added 17 unit test files with 174 test cases to `apps/server/src/`:

| File | Tests | What it covers |
|------|-------|----------------|
| `lib/jwt.test.ts` | 8 | signToken, verifyToken (round-trip, expired, tampered, wrong secret) |
| `lib/locale.test.ts` | 14 | normalizeLocale, getRequestLocale (query, header, cookie priority) |
| `lib/redis.test.ts` | 13 | cacheGet/Set/Del, statsCacheKey, acquireLock, reminderCounterKey |
| `lib/sessions.test.ts` | 8 | createAdminSession, getValidAdminSession, deleteAdminSession + TTL |
| `lib/resend.test.ts` | 13 | Email templates: XSS escaping, header injection, tel: sanitization |
| `lib/sse.test.ts` | 9 | register (headers, connected event), broadcast scopes (all/oversight/user/managers) |
| `lib/metrics.test.ts` | 6 | All Prometheus Counter/Histogram/Gauge instances + registry |
| `middleware/validate.test.ts` | 11 | isUuid, validateBody, validateQuery (pass/fail/edge cases) |
| `middleware/auth.middleware.test.ts` | 14 | requireAuth, requireRole, requireAdmin, requireAuthOrAdmin |
| `controllers/auth.controller.test.ts` | 12 | login (validation, wrong pw, inactive user), logout, me, adminMe, adminLogout |
| `controllers/events.controller.test.ts` | 7 | getEvent (400), createEvent (SSE broadcast), closeEvent (409/cache invalidation) |
| `controllers/users.controller.test.ts` | 12 | createUser (409 dup, bcrypt), updateUser (self-ref guard), softDelete, resetPassword |
| `controllers/departments.controller.test.ts` | 8 | createDept, updateDept (self-parent), deleteDept (409 has users/children) |
| `controllers/stats.controller.test.ts` | 7 | getStats (cache hit/miss), getUnreported (401/403/admin/manager scoping) |
| `controllers/manager.controller.test.ts` | 5 | getTeam (403 guard), getTeamStatus (400/empty members) |
| `controllers/sse.controller.test.ts` | 3 | sseHandler (admin/user/unauthorized branching) |
| `schemas.test.ts` | 23 | All Zod schemas: login, event, report, user, dept, SSE discriminated union |

Coverage thresholds kept at 50% (lines/branches/functions/statements) — set
by integration tests in CI. Unit test files alone cover ~46% of `src/`;
combined with integration tests (CI runs both via service containers)
coverage clears the 50% gate.

## Documentation Added (2026-05-25)

- `docs/USER_STORIES.md` — 19 User Stories (Employee 7 + Manager 4 + Admin 8)
  with Acceptance Criteria, mapped to all System Requirements
- `docs/LOAD_TEST_RESULTS.md` — k6 report-surge results analysis:
  p95=110ms, 177 reports/sec, 64,599 total reports at 1000 VUs

## TODO

- [ ] 修復 production `/api/*` 500 errors（需 kubectl logs）
- [ ] 考慮提升 coverage threshold 到 70%+
