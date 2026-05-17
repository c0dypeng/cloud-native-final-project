# Sequence — Employee submits a safety report

```mermaid
sequenceDiagram
    autonumber
    participant E as Employee browser
    participant W as apps/web (Next.js)
    participant A as apps/server (Express)
    participant DB as Postgres
    participant R as Redis
    participant SSE as SSE registry
    participant M as Managers / Admin (subscribed)

    E->>W: tap「我安全」on SafetyReportCard
    W->>A: POST /api/events/:id/report<br/>{ status: "safe" }<br/>(JWT cookie via Next.js rewrite)
    A->>A: requireAuth (JWT)
    A->>A: validate body (Zod)
    A->>A: isEventActive(eventId)?
    A->>DB: INSERT … ON CONFLICT (event_id, user_id) DO UPDATE
    DB-->>A: returning row
    A->>R: DEL stats:{eventId}
    A->>SSE: broadcastToOversight({type: "report_submitted"})
    SSE-->>M: SSE message "report_submitted"
    A-->>W: 200 { report: { … } }
    W-->>E: toast "已回報"<br/>router.refresh()
```

Why this design:

- The upsert is a **single SQL** — atomic at the database level, no race
  between two concurrent reports from the same user.
- Cache invalidation is fire-and-forget; on next read, the stats endpoint
  recomputes within ~30ms for a 5k-user event.
- SSE fan-out happens after the response is sent — the user doesn't wait for
  managers to receive the update.
