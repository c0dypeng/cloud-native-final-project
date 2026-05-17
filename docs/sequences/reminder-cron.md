# Sequence — Auto-reminder cron job (every 5 minutes)

```mermaid
sequenceDiagram
    autonumber
    participant Cron as node-cron */5 * * * *
    participant DB as Postgres
    participant SSE as SSE registry
    participant U as Unreported user
    participant R as Redis (counter)
    participant ML as Resend
    participant Mgr as Manager of unreported user
    participant M as active_events_total / unreported_users_total

    Cron->>DB: SELECT events WHERE status = 'active'
    DB-->>Cron: rows
    loop for each active event
        Cron->>DB: SELECT users LEFT JOIN safety_reports<br/>WHERE r.id IS NULL OR r.status = 'not_reported'
        DB-->>Cron: unreported[]
        loop for each unreported user
            Cron->>SSE: sendToUser({type: "reminder"})
            SSE-->>U: toast「請回報您的安全狀況」
            Cron->>R: INCR reminder:{event}:{user} (TTL 8h)
            alt counter ≤ 3
                Cron->>ML: send unreportedReminderEmail
            else
                Note over Cron,ML: skip — rate-limited
            end
        end
        Cron->>DB: recursive CTE → managers with unreported subordinates
        DB-->>Cron: managers[]
        loop for each manager
            Cron->>SSE: sendToManagerChain([mgr], {type:"manager_reminder"})
            SSE-->>Mgr: toast「您有 N 位部屬未回報」
            Cron->>R: INCR reminder:{event}:mgr:{managerId}
            alt counter ≤ 3
                Cron->>ML: send managerReminderEmail
            end
        end
    end
    Cron->>M: set active_events_total / unreported_users_total
```

Why this design:

- The recursive CTE is computed **once per event** in a single SQL, returning
  managers + their unreported subordinate count grouped.
- The Redis counter caps the email volume so an unanswered user never gets
  spammed beyond 3 messages. SSE reminders keep firing as long as the user is
  online.
- The Prometheus gauges set at the end of every tick make the cron visible in
  Grafana (`active_events_total`, `unreported_users_total`).
- Cron is disabled in test runs via `REMINDER_JOB_DISABLED=1` so suites stay
  deterministic.
