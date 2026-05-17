# ADR 003 — Monolithic Express API instead of 7 microservices

**Status:** Accepted · 2026-05-17

## Context

The HW2 architecture proposal split the system into seven microservices:
Auth, Incident, Report, Notification, Hazard, Dashboard, File. The mentor
review (4/14) flagged this as too granular for a 5-person team and pointed
out that the right granularity is "coarse, not fine" — split when scale
demands it, not pre-emptively.

## Decision

Ship as **a single Express service** with logical modules (controllers).
Keep the option to split by feature in the future.

## Consequences

**Good**

- One Dockerfile, one deployment pipeline, one set of probes/HPA rules.
- One process = one shared in-memory SSE registry, no cross-service event bus.
- The team owns one codebase; reviews touch all callers when an interface
  changes.

**Bad**

- All routes scale together. If the `/report` endpoint becomes a hot path
  needing 50 pods, the otherwise-quiet `/users` admin endpoint also gets 50.
- We can't ship `apps/server` in independent slices.

**When we'd split:**

- Report endpoint hits CPU ceiling on the same pod as everything else.
- A second team wants to own one slice independently.
- An external partner needs to consume one slice as a public API.

Each split costs ~1 service mesh + 1 set of probes + 1 CI pipeline. We'll
pay the cost when the constraint shows up, not before.
