# Employee Safety & Response System — Project Plan

## What We're Building

A cloud-native **Emergency Safety Reporting System** for TSMC. When emergencies happen (earthquakes, fires, etc.), admins create an event and all employees report their safety status. Managers monitor their team. Admins see everything.

**Stack:** Turborepo monorepo · Next.js 16 · Express 4 · PostgreSQL 17 · Drizzle ORM · Docker · Kubernetes

---

## Three User Roles

| Role | What they can do |
|------|-----------------|
| `employee` | Report own safety (Safe / Need Help + message); view own report only |
| `manager` | Same as employee + view dept report status + contact unreported subordinates (主管關懷) |
| `admin` | Create/close events; manage users & departments; full analytics & reports |

---

## Apps

| App | Port | Who uses it |
|-----|------|-------------|
| `apps/web` | 3000 | Employees + Managers |
| `apps/admin` | 3001 | Admins only |
| `apps/server` | 4000 | Internal API (used by both frontends) |

---

## Database Schema (`packages/database`)

Using **Drizzle ORM** with PostgreSQL. Five tables:

### `departments`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text | |
| `parent_id` | uuid → departments | self-ref, nullable — supports org hierarchy |
| `created_at` | timestamp | |

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `email` | text UNIQUE | login credential |
| `name` | text | |
| `password_hash` | text | bcrypt |
| `department_id` | uuid → departments | nullable |
| `manager_id` | uuid → users | self-ref, nullable |
| `role` | enum | `employee` \| `manager` |
| `phone` | text | nullable, for supervisor care |
| `is_active` | boolean | soft delete flag |
| `created_at` | timestamp | |

### `events`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `title` | text | e.g. "2026 花蓮地震" |
| `description` | text | nullable |
| `type` | enum | `earthquake` \| `fire` \| `security` \| `accident` \| `other` |
| `status` | enum | `active` \| `closed` |
| `created_by` | uuid → admin_accounts | which admin created it |
| `created_at` | timestamp | |
| `closed_at` | timestamp | nullable |

### `safety_reports`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `event_id` | uuid → events | CASCADE delete |
| `user_id` | uuid → users | CASCADE delete |
| `status` | enum | `safe` \| `need_help` \| `not_reported` (default) |
| `message` | text | nullable, free-text from employee |
| `latitude` | decimal(10,7) | nullable, reserved for future GPS feature |
| `longitude` | decimal(10,7) | nullable, reserved for future GPS feature |
| `reported_at` | timestamp | nullable, set when actively submitted |
| `updated_at` | timestamp | always updated on upsert |

**Unique constraint on `(event_id, user_id)`** — enables fast upsert for high-traffic disaster scenarios.

### `admin_accounts`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `username` | text UNIQUE | login credential |
| `password_hash` | text | bcrypt |
| `created_at` | timestamp | |
| `last_login` | timestamp | nullable |

Separate from `users` — admins are not employees.

---

## API Routes (`apps/server`)

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Email + password → JWT in httpOnly cookie |
| POST | `/api/auth/logout` | — | Clear JWT cookie |
| GET | `/api/auth/me` | JWT | Return current user |
| POST | `/api/admin/auth/login` | — | Username + password → session cookie |
| POST | `/api/admin/auth/logout` | session | Clear admin session |

### Events
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/events` | JWT | List events (employees: active only; managers/admin: all) |
| POST | `/api/events` | Admin session | Create event |
| GET | `/api/events/:id` | JWT | Single event |
| PATCH | `/api/events/:id/close` | Admin session | Close event |

### Reports
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/events/:eventId/report` | JWT | Upsert own safety report `{ status, message }` |
| GET | `/api/events/:eventId/reports` | JWT | Role-scoped: employee=own, manager=dept, admin=all |
| GET | `/api/events/:eventId/stats` | JWT | `{ total, safe, need_help, not_reported, byDepartment[] }` |
| GET | `/api/events/:eventId/unreported` | JWT | Unreported users with contact info (manager/admin) |

### Manager
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/manager/team` | JWT | All direct reports with report status + contact info |

### Users (admin only)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | Admin session | Paginated list, filterable |
| POST | `/api/users` | Admin session | Create user (bcrypt password) |
| PATCH | `/api/users/:id` | Admin session | Update user |
| DELETE | `/api/users/:id` | Admin session | Soft delete |

### Departments (admin only for writes)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/departments` | JWT | All departments |
| POST | `/api/departments` | Admin session | Create |
| PATCH | `/api/departments/:id` | Admin session | Update |
| DELETE | `/api/departments/:id` | Admin session | Delete |

---

## Auth Design

**Web users (employees/managers):**
- Login via `POST /api/auth/login` → server returns JWT
- JWT stored in httpOnly cookie named `token`
- JWT payload: `{ id, email, role, departmentId, managerId }`
- Web app verifies JWT locally using shared `JWT_SECRET` — no round-trip needed
- No signup page — admin creates all accounts

**Admin:**
- Login via `POST /api/admin/auth/login` → server returns session UUID in `admin-session` cookie
- Sessions stored in-memory Map on server (24h TTL)
- Admin app passes session ID as `X-Admin-Session` header on all API calls

---

## Web App Pages (`apps/web`)

| Route | Role | Description |
|-------|------|-------------|
| `/login` | All | Email + password login |
| `/dashboard` | Employee | Active event + SafetyReportCard |
| `/dashboard` | Manager | Same + team status summary + unreported list |
| `/dashboard/team` | Manager | 主管關懷 — all direct reports, filter tabs, 聯繫 button |

**No signup page** — admin creates all user accounts via admin app.

---

## Admin App Pages (`apps/admin`)

| Route | Description |
|-------|-------------|
| `/login` | Username + password login |
| `/` | Dashboard overview |
| `/events` | List all events |
| `/events/[id]` | Event detail — full report table, close button |
| `/users` | User management — create/edit/deactivate |
| `/departments` | Department management |
| `/reports` | Analytics — event selector, summary cards, dept breakdown |

---

## Team Split

### Cody — Infra + DevOps + Backend Foundation *(Week 1, then Week 3)*

**Week 1 (blocks everyone):**
- `packages/database` — Drizzle schema, migrations, seed script
- `apps/server` — `lib/db.ts`, `lib/jwt.ts`, `auth.middleware.ts`
- Auth routes: user login/logout/me + admin login/logout
- Prometheus metrics (`prom-client`) + structured logging (`pino`)
- `docker-compose.yml` / `docker-compose.dev.yml` — add postgres + pgbouncer, remove Supabase
- `.env.example` rewrite, `Makefile` updates

**Week 3:**
- All Kubernetes manifests (`k8s/`)
- CI/CD GitHub Actions pipeline
- Load testing

---

### Person 1 — Backend Business Logic *(Week 2–3)*

**Owns:** All Express feature routes

**Deliverables:**
- Events CRUD controllers + routes
- Reports upsert (single `INSERT ... ON CONFLICT DO UPDATE`), report list, unreported list
- Stats aggregate endpoint (single SQL `COUNT GROUP BY`)
- Manager team endpoint
- Users + Departments CRUD controllers + routes
- Auto-reminder cron job (`node-cron`, every 5 min)
- Rate limiting on report endpoint (`express-rate-limit`, 30 req/min/IP)

**Depends on:** Cody finishing `auth.middleware.ts` and schema

**Key files:**
```
apps/server/src/controllers/events.controller.ts
apps/server/src/controllers/reports.controller.ts
apps/server/src/controllers/stats.controller.ts
apps/server/src/controllers/users.controller.ts
apps/server/src/controllers/departments.controller.ts
apps/server/src/routes/*.ts
apps/server/src/jobs/reminder.job.ts
apps/server/src/routes/index.ts  ← register all routers here
```

---

### Person 2 — Web App: Auth + Employee UI *(Week 2–3)*

**Owns:** `apps/web` — remove Supabase, build auth layer, employee dashboard

**Deliverables:**
- Delete: `utils/supabase/`, `app/signup/`, `app/auth/confirm/`, `app/auth/signout/`
- Remove `@supabase/ssr` and `@supabase/supabase-js` from `apps/web`
- New `utils/auth/server.ts` — JWT cookie helpers (`getToken`, `getCurrentUser`, `requireAuth`)
- New `utils/auth/actions.ts` — `login()` and `logout()` server actions
- New `proxy.ts` — JWT cookie check (Next 16 renamed `middleware` → `proxy`; required convention as of 16.x)
- Login page — email + password only, "帳戶由管理員建立" notice
- Dashboard layout — reads JWT, fetches profile from API, passes to sidebar
- `app/dashboard/page.tsx` — employee view: active event + `SafetyReportCard`
- `components/safety/safety-report-card.tsx` — status buttons + optional message, submits to API
- `components/safety/no-active-event.tsx`
- `components/layout/app-sidebar.tsx` — role-aware nav
- `components/layout/nav-user.tsx` — real user data + logout

**Depends on:** Cody finishing JWT auth routes; Person 1 for `/api/events`

**Key files:**
```
apps/web/utils/auth/server.ts
apps/web/utils/auth/actions.ts
apps/web/utils/api.ts
apps/web/proxy.ts
apps/web/app/login/page.tsx + login-form.tsx
apps/web/app/dashboard/layout.tsx
apps/web/app/dashboard/page.tsx
apps/web/components/safety/safety-report-card.tsx
apps/web/components/safety/no-active-event.tsx
apps/web/components/layout/app-sidebar.tsx
apps/web/components/layout/nav-user.tsx
```

---

### Person 3 — Web App: Manager UI + i18n *(Week 3–4)*

**Owns:** Manager features in `apps/web` + multi-language support in both apps

**Deliverables:**
- `app/dashboard/page.tsx` manager additions — `TeamStatusSummary`, `UnreportedTeamList` widgets
- `app/dashboard/team/page.tsx` — 主管關懷 page:
  - All direct reports (not just unreported)
  - Report status badge per person
  - Filter tabs: All / 未回報 / 安全 / 需要協助
  - "聯繫" button per row (mailto/tel)
- `next-intl` setup in both `apps/web` and `apps/admin`
- `messages/zh-TW.json` + `messages/en.json` for both apps
- Language switcher component in sidebar/nav

**Depends on:** Person 2 finishing dashboard layout; Person 1 for `GET /api/manager/team` and stats

**Key files:**
```
apps/web/app/dashboard/team/page.tsx
apps/web/components/safety/team-status-summary.tsx
apps/web/components/safety/unreported-team-list.tsx
apps/web/messages/zh-TW.json
apps/web/messages/en.json
apps/admin/messages/zh-TW.json
apps/admin/messages/en.json
apps/web/components/layout/language-switcher.tsx
apps/admin/components/layout/language-switcher.tsx
```

---

### Person 4 — Admin App *(Week 2–4)*

**Owns:** All of `apps/admin`

**Deliverables:**
- Delete: `lib/supabase/`, `lib/supabase.ts`, `app/(auth)/signup/`, `app/auth/callback/`
- Remove `@supabase/ssr` and `@supabase/supabase-js` from `apps/admin`
- Rewrite `lib/dal.ts` — `verifyCredentials(username, password)` queries `admin_accounts` table, bcrypt compare, updates `last_login`; sessions now store `{ createdAt, adminId, username }`
- Rewrite `lib/actions.ts` — reads `username` + `password` from formData
- Update `lib/env.ts` — remove `ADMIN_PASSWORD_HASH`, add `DATABASE_URL`, `API_URL`
- Login page — add username field
- Expand nav: 儀表板 / 事件管理 / 使用者管理 / 部門管理 / 統計報告
- Events list page + event detail page (full report table + close button)
- User management (DataTable + create/edit dialogs, react-hook-form + zod)
- Department management (tree/table + CRUD)
- Reports page (event selector, summary cards, dept breakdown table)

**Depends on:** Cody finishing schema + admin auth routes; Person 1 for all business API endpoints

**Key files:**
```
apps/admin/lib/dal.ts  ← REWRITE
apps/admin/lib/actions.ts  ← REWRITE
apps/admin/lib/env.ts  ← MODIFY
apps/admin/app/(auth)/login/page.tsx
apps/admin/app/(dashboard)/events/page.tsx
apps/admin/app/(dashboard)/events/[id]/page.tsx
apps/admin/app/(dashboard)/users/page.tsx
apps/admin/app/(dashboard)/departments/page.tsx
apps/admin/app/(dashboard)/reports/page.tsx
apps/admin/components/events/create-event-dialog.tsx
apps/admin/components/users/create-user-dialog.tsx
apps/admin/components/users/edit-user-dialog.tsx
apps/admin/components/nav/main-nav.tsx
```

---

## Timeline

```
Week 1    Cody ──────── DB schema + server auth + docker-compose  ← BLOCKS EVERYONE
Week 2    Person 1 ─── business API routes
          Person 2 ─── web auth + employee UI
          Person 4 ─── admin auth rewrite + app shell
Week 3    Person 1 ─── reminder job + rate limiting
          Person 2 ─── dashboard polish
          Person 3 ─── manager UI + i18n setup
          Person 4 ─── admin pages
          Cody ──────── K8s manifests + CI/CD
Week 4    Person 3 ─── i18n strings (once all pages exist)
          All ──────── integration testing + final polish
          Cody ──────── load testing + K8s verification
```

---

## Interface Contracts (agree Day 1)

All consumers mock these until Person 1 / Cody deliver the real thing:

| Contract | Owner | Consumers |
|----------|-------|-----------|
| JWT payload shape `{ id, email, role, departmentId, managerId }` | Cody | 1, 2, 3, 4 |
| `GET /api/events` response shape | Person 1 | 2, 4 |
| `GET /api/events/:id/stats` response shape | Person 1 | 3, 4 |
| `GET /api/manager/team` response shape | Person 1 | 3 |
| `POST /api/events/:id/report` body `{ status, message }` | Person 1 | 2 |
| `X-Admin-Session` header format | Cody | 4, Person 1 |

---

## Environment Variables

### Remove (Supabase — no longer used)
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ADMIN_PASSWORD_HASH
```

### Add
```env
# Database
DATABASE_URL=postgresql://safety:password@pgbouncer:6432/safetydb
POSTGRES_PASSWORD=your-postgres-password

# Auth
JWT_SECRET=<64-char random string — same value in server and web>
JWT_EXPIRES_IN=8h

# apps/web
NEXT_PUBLIC_API_URL=http://localhost:4000   # browser-facing
API_URL=http://server:4000                  # SSR / server actions
JWT_SECRET=<same as server>

# apps/admin
API_URL=http://server:4000
DATABASE_URL=<same as server>
```

---

## Advanced Requirements Coverage

| Requirement | How |
|-------------|-----|
| 支援多國語言 | `next-intl` in both apps, zh-TW + en, language switcher in nav |
| 效能 (高流量) | Single upsert SQL on report, PgBouncer transaction pooling, K8s HPA 2→10 pods, rate limiting |
| 服務擴充性 | Self-ref `departments.parent_id` + `users.manager_id` — org changes need no schema migration |
| 服務可靠性 | K8s RollingUpdate (`maxUnavailable: 0`), ≥2 replicas on server+web, liveness/readiness probes, StatefulSet for Postgres |
| 監控告警 | `prom-client` `/metrics` endpoint, `pino` JSON logs, Prometheus ServiceMonitor + Grafana dashboard |

---

## Dev Commands

```bash
bun install              # install all dependencies
bun dev                  # run all apps locally (web:3000, admin:3001, server:4000)
make dev-docker          # run in Docker (dev mode, hot reload)
make up                  # production Docker
make down                # stop
make logs                # all logs
bun lint && bun typecheck && bun run build   # run before every commit
```
