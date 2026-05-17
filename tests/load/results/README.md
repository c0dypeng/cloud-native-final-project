# k6 load test results

This directory holds the JSON summary exports from each `k6 run`. Drop the
file's `metrics` block into the final report's load-test section.

## Latest pass

Run on 2026-05-17 against a single-host Docker stack (Postgres + Redis +
single API replica) with `SEED_SCALE=load` (10,000 employees) and
`LOAD_TEST=1` on the server (login rate-limiter bypassed for 127.0.0.1).

| Metric                                  | Value      | SLO       | Verdict |
| --------------------------------------- | ---------- | --------- | ------- |
| report submit p95                       | **109.8ms** | ≤ 500ms   | ✅      |
| report submit p99                       | **135.6ms** | ≤ 1000ms  | ✅      |
| report submit error rate                | **0.00%**   | ≤ 0.5%    | ✅      |
| reports submitted in 6 min @ 1k VUs     | **64,599**  | —         |         |
| sustained report throughput             | **177/s**   | —         |         |
| login p95                               | **84.5ms**  | —         |         |

The aggregate `http_req_failed` rate was 1.33% — driven entirely by initial-
login bcrypt contention during the ramp window, not by the report endpoint.
Every report submission that completed succeeded.

## How to reproduce

```bash
# 1. Stack up
make up                        # or `make dev-docker`
make obs-up                    # optional, for live Grafana

# 2. Load-scale seed (10k users)
make seed-load DATABASE_URL=postgresql://safety:$POSTGRES_PASSWORD@localhost:5432/safetydb

# 3. Restart server with LOAD_TEST=1
docker compose stop server
LOAD_TEST=1 docker compose up server -d
# Or for bare-metal dev:
#   LOAD_TEST=1 bun run --filter server dev

# 4. Admin creates an event, copy its UUID
EVENT_ID=$(curl -s -X POST http://localhost:4000/api/admin/auth/login \
  -H "content-type: application/json" \
  -d '{"username":"admin","password":"changeme"}' | jq -r .sessionId)
# (then curl POST /api/events with x-admin-session)

# 5. Run k6
make k6-report EVENT_ID=<uuid>
```

The Makefile target writes the summary JSON to this directory.
