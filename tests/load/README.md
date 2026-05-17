# Load testing (k6)

## Pre-flight

1. Stack up: `make up` or apply K8s manifests.
2. Seed load-scale data: `SEED_SCALE=load make seed` (creates 10k employees with
   predictable emails `empNNNNN@huyouan.local` + the seed password).
3. Admin creates an active event (via UI or `curl`). Note the event id.

## Run

```bash
# Burst of 1k VUs submitting reports
k6 run \
  -e API_URL=http://localhost:4000 \
  -e EVENT_ID=<event-uuid> \
  -e SEED_USER_PASSWORD=password123 \
  tests/load/report-surge.js

# 55 managers + admins polling dashboards
k6 run \
  -e API_URL=http://localhost:4000 \
  -e EVENT_ID=<event-uuid> \
  -e SEED_ADMIN_USERNAME=admin \
  -e SEED_ADMIN_PASSWORD=changeme \
  tests/load/dashboard-poll.js
```

## SLO

The thresholds encoded in the scripts are the project SLO:

| Metric                | Threshold        |
| --------------------- | ---------------- |
| HTTP error rate       | ≤ 0.5%           |
| p95 request duration  | ≤ 500 ms         |
| p99 report submission | ≤ 1000 ms        |

If a run fails a threshold, k6 exits non-zero so CI can fail the build.
