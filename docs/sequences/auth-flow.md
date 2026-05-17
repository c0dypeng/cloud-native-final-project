# Sequence — Auth flows

Two parallel auth systems share the API server but never touch each other's state.

## User (employee / manager) login

```mermaid
sequenceDiagram
    autonumber
    participant U as Browser
    participant W as apps/web (Next.js SSR)
    participant A as apps/server
    participant DB as Postgres

    U->>W: POST /login form (email + password)
    W->>A: POST /api/auth/login (server-to-server)
    A->>DB: SELECT users WHERE email = ?
    DB-->>A: user row
    A->>A: bcrypt.compare(password, passwordHash)
    A->>A: signToken({ id, email, role, ... }, JWT_SECRET, 8h)
    A-->>W: { token, user }
    W->>W: cookies().set("token", token, httpOnly + 8h)
    W-->>U: 302 → /dashboard

    Note over U,W: Cookie lives on web's origin (port 3000).
    Note over U,A: Subsequent /api/* calls go through Next.js rewrite<br/>which forwards the cookie to the server.
```

## Admin login

```mermaid
sequenceDiagram
    autonumber
    participant Op as Admin browser
    participant Ad as apps/admin (Next.js SSR)
    participant A as apps/server
    participant DB as Postgres
    participant Map as in-memory adminSessions

    Op->>Ad: POST /login form (username + password)
    Ad->>A: POST /api/admin/auth/login (server-to-server)
    A->>DB: SELECT admin_accounts WHERE username = ?
    DB-->>A: admin row
    A->>A: bcrypt.compare
    A->>DB: UPDATE admin_accounts SET last_login = now()
    A->>Map: createAdminSession(adminId, username) → sessionId
    A-->>Ad: { sessionId, username }
    Ad->>Ad: cookies().set("admin-session", sessionId, httpOnly + 24h)
    Ad-->>Op: 302 → /

    Op->>Ad: GET / (SSR page)
    Ad->>A: GET /api/admin/auth/me<br/>(X-Admin-Session header from cookie)
    A->>Map: lookup sessionId
    A-->>Ad: { admin: { … } }
    Ad-->>Op: render with admin context
```

## Trade-offs

- **Why two systems?** Admin needs a different cookie scope and shorter
  audit-friendly trail (we keep `admin_accounts.last_login`). Reusing JWT
  would force a single secret across two security boundaries.
- **Why in-memory admin sessions?** A small set (~5 admins) makes a Map cheap
  and avoids a Redis round-trip on every request. Trade-off: server restart
  invalidates active admin sessions. Acceptable for MVP; multi-pod would
  require a Redis-backed session adapter (Phase 2).
