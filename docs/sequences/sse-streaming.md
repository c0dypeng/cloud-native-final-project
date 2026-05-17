# Sequence — SSE connection lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser (EventSource)
    participant N as Next.js (rewrite /api/sse)
    participant E as Express /api/sse handler
    participant Reg as SSE registry (Map)
    participant Mw as Auth middleware

    B->>N: GET /api/sse (cookie: token=…)
    N->>E: GET /api/sse (cookie forwarded)
    E->>Mw: requireAuthOrAdmin
    Mw-->>E: req.user / req.adminId
    E->>Reg: register(res, identity)
    E-->>B: HTTP/1.1 200 OK<br/>Content-Type: text/event-stream<br/>data: {"type":"connected",…}
    loop heartbeat every 25s
        E-->>B: :ping comment line
    end
    Note over E,Reg: Other handlers call sendToUser /<br/>sendToManagerChain / broadcastToOversight
    E-->>B: event: report_submitted<br/>data: {...}
    E-->>B: event: need_help<br/>data: {...}
    B--xE: connection drop
    E->>Reg: drop(conn) → sse_active_connections.dec
    B->>B: EventSource auto-reconnect<br/>(exp. backoff via useSse hook)
    B->>N: re-open SSE
```

Notes:

- The heartbeat is a comment line (`:ping\n\n`) — visible only to keep proxies
  like nginx and Cloudflare from closing idle connections.
- The discriminated union `SseEvent` is defined in
  `@workspace/api-contracts/src/sse.ts`; both server and client parse with
  `sseEventSchema` so any drift is a type error.
- Connection registry is in-memory per server pod. For multi-pod scale, a
  Redis pub/sub bridge would relay events between pods (Phase 2).
