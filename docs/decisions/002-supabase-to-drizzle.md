# ADR 002 — Replace Supabase with self-hosted Postgres + Drizzle

**Status:** Accepted · 2026-05-17

## Context

The course rubric grades "service reliability" and "no single point of
failure". Supabase is a great managed Postgres + Auth provider but for the
project we want to demonstrate operating the stack ourselves: rolling
updates, HPA, alert rules, the works. We also want to be 100% open-source so
graders can boot the demo on a laptop with no signups.

## Decision

- Replace `@supabase/ssr` with a custom JWT cookie scheme in `apps/web` and
  an in-memory session scheme in `apps/admin`.
- Replace Supabase types with a Drizzle schema (`packages/database`).
- Use Postgres 17 + PgBouncer (transaction pooling) directly.

## Consequences

**Good**

- Self-contained: clone + docker compose + bun = a working demo.
- We control the upsert SQL on `safety_reports` for sub-millisecond reports.
- Adding tables/columns is a one-line schema edit + `db:generate`.

**Bad**

- We re-implement auth — small attack surface but our responsibility.
- No managed backups; need to add `pg_dump` to Phase 2 ops.

**Migration delta:** see commit `30a4607` (history retained in `plan.md`).
