# Documentation Index

## For the demo + report

- **[DEMO.md](./DEMO.md)** — 5-minute live demo script + speaker notes
- **[architecture.md](./architecture.md)** — high-level system diagram, 12-Factor mapping, HA story
- **[er.md](./er.md)** — entity-relationship diagram (Mermaid)

## Sequences

- **[sequences/safety-report.md](./sequences/safety-report.md)** — employee submits 「我安全」
- **[sequences/need-help.md](./sequences/need-help.md)** — need-help fan-out to manager chain
- **[sequences/reminder-cron.md](./sequences/reminder-cron.md)** — auto-reminder cron + email rate limit
- **[sequences/auth-flow.md](./sequences/auth-flow.md)** — user JWT vs admin session
- **[sequences/sse-streaming.md](./sequences/sse-streaming.md)** — SSE connection lifecycle + auto-reconnect

## Architecture Decision Records

- **[decisions/001-sse-over-websocket.md](./decisions/001-sse-over-websocket.md)**
- **[decisions/002-supabase-to-drizzle.md](./decisions/002-supabase-to-drizzle.md)**
- **[decisions/003-monolith-not-microservices.md](./decisions/003-monolith-not-microservices.md)**

## Operations & runbooks

- **[/k8s/observability/README.md](../k8s/observability/README.md)** — Grafana dashboards + alert rules
- **[/tests/load/README.md](../tests/load/README.md)** — k6 load testing
- **[/tests/e2e/README.md](../tests/e2e/README.md)** — Playwright end-to-end suite

## Source-of-truth files

| Concern              | File                                              |
| -------------------- | ------------------------------------------------- |
| Schema               | `packages/database/src/schema/*.ts`               |
| API contracts        | `packages/api-contracts/src/*.ts` (Zod)           |
| Server routes        | `apps/server/src/routes/index.ts`                 |
| K8s deployment       | `k8s/base/*.yaml`                                 |
| CI pipeline          | `.github/workflows/{ci,docker,e2e}.yml`           |
| Grafana dashboards   | `observability/grafana/dashboards/*.json`         |
| Alert rules          | `observability/prometheus/alerts.yml` + Helm chart |
