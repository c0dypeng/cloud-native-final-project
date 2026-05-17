# 護你安 HuYouAn · Employee Safety & Response System

[![ci](https://github.com/c0dypeng/cloud-native-final-project/actions/workflows/ci.yml/badge.svg)](https://github.com/c0dypeng/cloud-native-final-project/actions)

> 災害發生時，員工一鍵回報「我安全」或「需要協助」，主管即時掌握全員狀態。
> 雲原生應用程式開發 114-2 期末專案 · Group 3 · Mentor: Jeffery (TSMC)

Cloud-native employee safety reporting system: Next.js 16 PWA · Express 4
API · PostgreSQL 17 + Drizzle ORM · Redis cache · SSE real-time push ·
Kubernetes deployment with HPA + zero-downtime rollouts + Prometheus +
Grafana + Loki + Alertmanager.

## Project Structure

```
├── apps/
│   ├── web/               # Employees + managers (Next.js PWA, port 3000)
│   ├── admin/             # Admin console (Next.js, port 3001)
│   └── server/            # REST API + SSE + reminder cron (Express, :4000)
├── packages/
│   ├── api-contracts/     # Shared Zod schemas (request/response/SSE)
│   ├── database/          # Drizzle ORM schema + migrations + faker seed
│   ├── ui/                # shadcn (Base UI) component library
│   └── {eslint,typescript}-config/
├── k8s/
│   ├── base/              # Deployment, Service, Ingress, HPA, StatefulSet, PDB
│   ├── observability/     # kube-prometheus-stack values + alert rules
│   └── kind/              # Local Kubernetes (kind) bootstrap script
├── observability/         # Local Prometheus / Grafana / Loki / Promtail
├── tests/load/            # k6 load test scripts
├── docs/                  # Architecture, sequences, ER, ADRs (Mermaid)
├── .github/workflows/     # CI (lint+typecheck+test+build), Docker, e2e
├── docker-compose.yml     # All services (incl. observability profile)
├── docker-compose.dev.yml # Hot-reload dev compose
├── plan.md                # Original HW2 architecture plan
└── Makefile               # Convenience commands (see `make help`)
```

## Prerequisites

- [Bun](https://bun.sh) >= 1.3 — `curl -fsSL https://bun.sh/install | bash`
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- `make` (pre-installed on macOS/Linux)

---

## Development Model

**Docker runs the database. `bun dev` runs the apps.** That's it.

```
┌─────────────────────────────────────────────────────┐
│  Docker (always running)          bun dev            │
│  ┌─────────────┐                  ┌───────────────┐  │
│  │  postgres   │ ←── connects ──  │  apps/server  │  │
│  │  pgbouncer  │                  │  apps/web     │  │
│  └─────────────┘                  │  apps/admin   │  │
│                                   └───────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## First-Time Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Create environment file

```bash
cp .env.example .env
```

Fill in the required values:

```env
# Postgres password — pick anything for local dev
POSTGRES_PASSWORD=devpassword

# JWT secret — generate with: openssl rand -hex 64
JWT_SECRET=your-64-char-random-string

# Seed credentials for the first admin account
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=changeme
```

The rest of `.env.example` has sensible defaults for local dev.

### 3. Start the database (Docker)

```bash
docker compose -f docker-compose.dev.yml up postgres pgbouncer -d
```

Verify it's healthy:

```bash
docker compose -f docker-compose.dev.yml ps
# postgres should show "healthy"
```

This is the **only Docker step you need for daily development.** Keep it running in the background.

### 4. Run database migrations (one-time)

Creates all tables. Only needed once per environment (or after `make clean`).

```bash
make migrate DATABASE_URL=postgresql://safety:devpassword@localhost:5432/safetydb
```

### 5. Seed demo data (one-time)

```bash
make seed DATABASE_URL=postgresql://safety:devpassword@localhost:5432/safetydb
```

This creates:

- **Admin account:** `admin` / `changeme` (via `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`).
- **5 departments × 4-level hierarchy × ~100 users** (faker-generated, deterministic).
- **Demo logins** (password `password123` for all):
  - `employee@huyouan.local` — 員工視角
  - `manager@huyouan.local` — 主管視角，has the demo employee as a subordinate
  - `ceo@huyouan.local` — 高階主管，sees the full recursive subordinate tree

For load testing run `make seed-load` instead — same hierarchy with 10k users
and predictable emails `empNNNNN@huyouan.local`.

### 6. Start the apps

```bash
bun dev
```

- Web (employees/managers): http://localhost:3000
- Admin dashboard: http://localhost:3001
- API server: http://localhost:4000

The server reads `DATABASE_URL` and `JWT_SECRET` from your `.env` (or `apps/server/.env`).

---

## Day-to-Day Development

```bash
# Terminal 1 — keep the DB running (if not already)
docker compose -f docker-compose.dev.yml up postgres pgbouncer -d

# Terminal 2 — start all apps with hot-reload
bun dev
```

Data persists in a Docker volume across restarts. You only need to re-run `make migrate` + `make seed` if you run `make clean` (which wipes the volume).

### Full Docker dev (optional)

If you want all services in containers (e.g. to test the production setup locally):

```bash
make dev-docker
```

Same URLs. Source code is volume-mounted so edits hot-reload automatically.

---

## Schema Changes

When you modify files in `packages/database/src/schema/`:

```bash
# 1. Generate a new migration SQL file
cd packages/database
DATABASE_URL=postgresql://safety:devpassword@localhost:5432/safetydb bun run db:generate

# 2. Apply the new migration
make migrate DATABASE_URL=postgresql://safety:devpassword@localhost:5432/safetydb
```

Drizzle tracks which migrations have been applied — running `migrate` is always safe and idempotent.

---

## Production (Docker)

```bash
# Build and start all services (detached)
make up

# Stop
make down

# View logs
make logs
make logs-server
make logs-web
make logs-admin
make logs-postgres

# Full reset (destroys all data)
make clean
```

Make sure your `.env` at the root has all required values (see `.env.example`).

---

## Tests

```bash
# Spin up Postgres + Redis (re-uses the dev compose stack)
make dev-docker  # in another terminal, leave running

# Backend integration suite (Vitest + Supertest against real Postgres + Redis)
make test
make test-coverage   # writes apps/server/coverage/

# Load tests (requires an active event and seed:load data)
make seed-load DATABASE_URL=...
make k6-report EVENT_ID=<uuid>
make k6-dashboard EVENT_ID=<uuid>
```

The SLO encoded in `tests/load/report-surge.js`:
1k concurrent VUs, p95 ≤ 500ms, error rate ≤ 0.5%.

## Kubernetes (local kind cluster)

```bash
# One-command setup: kind cluster + nginx-ingress + kube-prometheus-stack + apps
make kind-up

# Add to /etc/hosts:
#   127.0.0.1   huyouan.local admin.huyouan.local
# Open:
#   http://huyouan.local           (employee + manager)
#   http://admin.huyouan.local     (admin console)

# Grafana
kubectl -n observability port-forward svc/prom-grafana 3030:80
#   http://localhost:3030 (admin/admin)

make kind-down                     # tear it all down
```

Manifests cover: Deployment + Service + Ingress + HPA (2→10 server pods) +
PodDisruptionBudget + Postgres StatefulSet + PgBouncer + Redis + DB migration
Job. Strategy: RollingUpdate with `maxUnavailable: 0`, `maxSurge: 1`.

## Observability

Local (docker-compose):

```bash
make obs-up
# Prometheus  http://localhost:9090
# Grafana     http://localhost:3030  (admin/admin) — 3 dashboards pre-loaded
# Loki        http://localhost:3100
```

Cluster: included in `make kind-up`. Three Grafana dashboards under
`observability/grafana/dashboards/`: **API Overview**, **Safety SLO**,
**Backing Services**. Three alert rules: `HighErrorRate`, `HighP95Latency`,
`PodCrashLooping`.

## Architecture docs

Diagrams live in [`docs/`](./docs):
- [Architecture overview](./docs/architecture.md) (high-level Mermaid)
- [Entity-relationship](./docs/er.md)
- Sequences: [safety-report](./docs/sequences/safety-report.md),
  [need-help](./docs/sequences/need-help.md),
  [reminder-cron](./docs/sequences/reminder-cron.md),
  [auth-flow](./docs/sequences/auth-flow.md)
- ADRs: [SSE](./docs/decisions/001-sse-over-websocket.md),
  [Supabase→Drizzle](./docs/decisions/002-supabase-to-drizzle.md),
  [Monolith](./docs/decisions/003-monolith-not-microservices.md)

## Code Quality

Run these before every commit:

```bash
bun lint && bun run typecheck && bun run build
```

---

## Available Scripts

### Root
```bash
bun dev          # All apps in dev mode
bun run build    # Build all apps
bun lint         # Lint all packages
bun typecheck    # Type check all packages
bun format       # Prettier format
```

### Individual apps
```bash
bun run --filter web dev
bun run --filter admin dev
bun run --filter server dev
```

### Database (`packages/database`)
```bash
bun run db:generate   # Generate migration from schema changes
bun run db:migrate    # Apply pending migrations
bun run db:push       # Push schema directly (dev only, skips migration files)
bun run db:studio     # Open Drizzle Studio (visual DB browser)
bun run seed          # Insert initial admin account
```

---

## Adding shadcn/ui Components

```bash
cd packages/ui
npx shadcn@latest add [component-name]
```

Components are automatically available to all apps via `@workspace/ui/components/[name]`.

---

## Adding API Routes (for Person 1)

1. Create `apps/server/src/controllers/your-feature.controller.ts`
2. Create `apps/server/src/routes/your-feature.routes.ts`
3. Register in `apps/server/src/routes/index.ts`

Auth middleware is already set up — use `requireAuth`, `requireRole`, or `requireAdmin` from `middleware/auth.middleware.ts`.

---

## Tech Stack

| Layer                | Technology                                                |
|----------------------|-----------------------------------------------------------|
| Frontend             | Next.js 16 (App Router) · React 19 · React Compiler · PWA |
| UI                   | shadcn/ui (Base UI variant) · Tailwind CSS v4 · OKLCH     |
| Real-time            | Server-Sent Events (Express → `EventSource`)              |
| API                  | Express 4 · TypeScript · Zod (`@workspace/api-contracts`) |
| Database             | PostgreSQL 17 · Drizzle ORM · recursive CTEs              |
| Connection pool      | PgBouncer (transaction pooling)                           |
| Cache                | Redis 7 (3s TTL stats cache + reminder counters)          |
| Auth                 | Custom JWT cookie (users) + in-memory session (admin)     |
| Notifications        | Resend (email) + SSE (in-app)                             |
| Logging              | pino (structured JSON) → Loki via Promtail                |
| Metrics              | prom-client → Prometheus → Grafana + Alertmanager        |
| Tests                | Vitest + Supertest (integration) · k6 (load)              |
| Monorepo             | Turborepo + Bun workspaces                                |
| Containers           | Docker + Docker Compose                                   |
| Orchestration        | Kubernetes (kind locally; manifests in `k8s/`)            |
| CI/CD                | GitHub Actions → GHCR (multi-image)                       |

---

## Troubleshooting

**`DATABASE_URL` connection refused**
Make sure Postgres is running: `docker compose -f docker-compose.dev.yml up postgres -d`

**Tables don't exist / relation not found**
Run migrations: `make migrate DATABASE_URL=...`

**Admin login fails**
Make sure you ran `make seed`. Default: `admin` / `changeme`.

**Port already in use**
Stop whatever is on 3000/3001/4000, or change port mappings in `docker-compose.dev.yml`.

**`make clean` then nothing works**
Volumes were wiped — redo steps 4 and 5 (migrate + seed).

---

For the full project architecture, team split, and feature plan see [plan.md](./plan.md).
