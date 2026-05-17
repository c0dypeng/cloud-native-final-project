# ADR 001 — Server-Sent Events over WebSocket

**Status:** Accepted · 2026-05-17

## Context

Managers need live dashboards (stats updates, need-help banners) during a
disaster. We have to push from server to client. Two natural choices:

1. **WebSocket** — bi-directional, requires sticky sessions in K8s and a
   Redis pub/sub bridge for multi-pod scale.
2. **Server-Sent Events (SSE)** — one-way, plain HTTP/1.1, browsers and
   nginx-ingress both speak it natively.

## Decision

We use **SSE**. Specifically:

- Single endpoint `GET /api/sse`.
- Auth via the same JWT or admin-session cookie that every other route uses.
- Server keeps a `Set<Connection>` in memory.
- Annotations on ingress: `proxy-buffering: off`, long `proxy-read-timeout`.

## Consequences

**Good**

- No new infrastructure — no sticky sessions, no Redis adapter (yet).
- Works in every browser via `EventSource`.
- Same-origin via Next.js rewrite means the auth cookie just works.
- Heartbeat keep-alive every 25s prevents idle disconnects.

**Bad**

- Multi-pod fan-out doesn't share state. A user connected to pod A won't
  receive an event published from pod B unless we bridge through Redis.
  Acceptable for the 1-pod MVP; the same Redis we already use for stats can
  host a `PUBLISH huyouan-sse` channel later.

**Reversible?** Yes — we'd swap to socket.io if we needed bidirectional
streams (live cursors, room-based broadcasts) or browser fallback to long
polling on weird corporate proxies.
