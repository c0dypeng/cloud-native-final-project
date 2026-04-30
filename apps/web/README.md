# Web App

Next.js 16 frontend for the Employee Safety & Response system. Employees use this app to log in and submit their safety status during incidents.

## Stack

- **Next.js 16 App Router** with React Server Components
- **Custom JWT cookie auth** — `jose`-based, validates tokens issued by `apps/server`
- **Self-hosted Postgres + Drizzle** via `@workspace/database` (no Supabase)
- **shadcn/ui** components from `@workspace/ui`
- **next-themes** light/dark mode

## Getting Started

### Prerequisites

- Node.js 20+
- Bun
- Running `apps/server` (default port 4000) — see root `README.md` or `make dev-docker`

### Environment Setup

```bash
cp apps/web/.env.example apps/web/.env.local
```

Fill in `JWT_SECRET` (must match `apps/server`'s value) and adjust API URLs if needed.

### Development

```bash
# From repo root
bun dev                          # all apps
bun run --filter web dev         # web only
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
bun run --filter web build
```

## Authentication Flow

The web app uses an httpOnly JWT cookie issued by `apps/server`'s `/api/auth/login` endpoint.

```
┌────────────┐  POST /api/auth/login   ┌──────────────┐
│  Browser   │ ──────────────────────▶ │   Server     │
│            │  { email, password }    │ (Express)    │
│            │ ◀────────────────────── │              │
│            │  Set-Cookie: token=<JWT>│              │
└────────────┘                         └──────────────┘
       │
       │  GET /dashboard  (cookie sent automatically)
       ▼
┌────────────┐
│ Next.js    │  proxy.ts checks cookie → redirects if missing
│ web app    │  RSC calls getCurrentUser() → verifies JWT locally with jose
│            │  Server Actions call apiFetch() → forwards token as Bearer
└────────────┘
```

### Key files

```
apps/web/
├── proxy.ts                     # Gates /dashboard/* — redirects to /login if no cookie
├── utils/
│   ├── auth/
│   │   ├── server.ts            # getToken, getCurrentUser (verify JWT), requireAuth
│   │   └── actions.ts           # login / logout (server actions)
│   └── api.ts                   # apiFetch — server-side fetch with cookie→Bearer forwarding
├── app/
│   ├── login/
│   │   ├── page.tsx             # Email + password form
│   │   └── login-form.tsx       # Client form using useActionState
│   ├── dashboard/
│   │   ├── layout.tsx           # Sidebar + header (requireAuth, fetches profile)
│   │   ├── page.tsx             # Active event + SafetyReportCard (Phase 4)
│   │   └── actions.ts           # submitReport server action (Phase 4)
│   └── error/page.tsx           # Auth error page
└── components/safety/           # ActiveEventCard, SafetyReportCard (Phase 4)
```

### Why local JWT verification?

Verifying the token in `getCurrentUser()` with `jose` (using the shared `JWT_SECRET`) avoids an HTTP round-trip on every Server Component render. The dashboard layout still calls `/api/auth/me` once to fetch the user's `name`, which isn't part of the JWT payload.

## Routes

- `/` — redirects to `/dashboard` if logged in, otherwise `/login`
- `/login` — email + password login (web users only — admins use the admin app)
- `/dashboard` — employee view: active event + safety reporting card
- `/dashboard/team` — manager view (added by Person 3)

## Troubleshooting

### "Unauthorized" on every request

- Verify `JWT_SECRET` in `apps/web/.env.local` matches `apps/server`'s value exactly.
- Check that `apps/server` is reachable at `API_URL` (default `http://localhost:4000`).

### Logged out unexpectedly

- The JWT TTL is 8h (configurable via `JWT_EXPIRES_IN` on the server).
- The cookie is `httpOnly` + `sameSite=lax` — make sure your browser preserves it across the redirect.

### Type errors after schema changes

- Drizzle types live in `packages/database/src/schema`. Run `bun typecheck` from repo root.
