# Employee Safety & Response System

A cloud-native emergency safety reporting system built with Next.js, Express, PostgreSQL, and Kubernetes.

When emergencies happen (earthquakes, fires, etc.), admins create events and employees report their safety status. Managers monitor their team in real time.

## Project Structure

```
├── apps/
│   ├── web/               # Employee & manager frontend (Next.js, port 3000)
│   ├── admin/             # Admin dashboard (Next.js, port 3001)
│   └── server/            # REST API (Express, port 4000)
├── packages/
│   ├── database/          # Drizzle ORM schema, migrations, seed
│   ├── ui/                # Shared shadcn/ui components
│   ├── eslint-config/
│   └── typescript-config/
├── k8s/                   # Kubernetes manifests
├── docker-compose.yml     # Production Docker setup
├── docker-compose.dev.yml # Development Docker setup (hot-reload)
├── plan.md                # Full project plan and team split
└── Makefile               # Convenience commands
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

### 5. Seed the initial admin account (one-time)

```bash
make seed DATABASE_URL=postgresql://safety:devpassword@localhost:5432/safetydb
```

Default credentials: `admin` / `changeme` (change via `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` in `.env`).

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

## Code Quality

Run these before every commit:

```bash
bun lint && bun typecheck && bun run build
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

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| UI | shadcn/ui, Tailwind CSS v4 |
| API | Express 4, TypeScript |
| Database | PostgreSQL 17, Drizzle ORM |
| Connection pooling | PgBouncer |
| Auth | Custom JWT (`jsonwebtoken` + `bcryptjs`) |
| Logging | pino (structured JSON) |
| Metrics | prom-client (Prometheus) |
| Monorepo | Turborepo + Bun workspaces |
| Containers | Docker + Docker Compose |
| Orchestration | Kubernetes (manifests in `k8s/`) |

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
