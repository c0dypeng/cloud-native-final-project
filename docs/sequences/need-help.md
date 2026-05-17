# Sequence — Employee marks 「需要協助」 (need_help)

```mermaid
sequenceDiagram
    autonumber
    participant E as Employee browser
    participant A as apps/server
    participant DB as Postgres
    participant R as Redis
    participant SSE as SSE registry
    participant Mgr as Direct Manager (browser)
    participant VP as Manager-of-manager / VP
    participant Adm as Admin browser
    participant ML as Resend (email)

    E->>A: POST /report { status: "need_help", message }
    A->>DB: upsert safety_reports
    A->>R: DEL stats:{eventId}
    A->>DB: getManagerChain(userId) (recursive CTE)
    DB-->>A: [managerId, vpId, …]
    A->>SSE: sendToManagerChain([…], {type:"need_help", …})
    SSE-->>Mgr: pulsing red banner
    SSE-->>VP: pulsing red banner
    SSE-->>Adm: pulsing red banner (admin always in)
    A->>DB: getDirectManager(userId)
    DB-->>A: { id, name, email }
    A->>ML: send needHelpAlertEmail()
    ML-->>Mgr: email arrives in inbox
    A-->>E: 200 OK
```

Notes:

- The SSE fan-out reaches **every** manager up the chain plus all online
  admins — so a senior VP can step in if the direct manager is offline.
- Email is best-effort and rate-limited (max 3 per (event, user) via a Redis
  counter with 8h TTL) — see `reminder-cron.md`.
- The banner client-side is dismissible per-alert.
