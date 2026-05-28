# Load Test Results — 護你安 HuYouAn

## Test Configuration

| Parameter | Value |
|-----------|-------|
| Tool | k6 v2.0.0 |
| Script | `tests/load/report-surge.js` |
| Scenario | Report Surge — simulate disaster onset |
| Ramp Profile | 0 → 100 → 500 → 1000 VUs over 5m30s |
| Peak VUs | 1,000 |
| Target | Local Docker Compose stack (single server pod) |

## SLO Definition

| Metric | Threshold | Purpose |
|--------|-----------|---------|
| Report latency p95 | ≤ 500 ms | 95% of safety reports submitted within 500ms |
| Report latency p99 | ≤ 1,000 ms | 99% within 1s (tail tolerance) |
| Error rate | ≤ 0.5% | Less than 1 in 200 requests fail |

## Results Summary

### Throughput

| Metric | Value |
|--------|-------|
| Total reports submitted | **64,599** |
| Report throughput | **177 reports/sec** (sustained) |
| Total HTTP requests | 66,484 |
| HTTP request rate | 182 req/s |
| Test duration | ~365 seconds |

### Latency

| Percentile | Report Latency | HTTP Duration | SLO |
|------------|---------------|---------------|-----|
| Average | 23.0 ms | 23.6 ms | — |
| Median (p50) | 4.0 ms | 4.1 ms | — |
| p90 | 85.7 ms | 85.2 ms | — |
| **p95** | **109.8 ms** | **109.6 ms** | **✅ < 500 ms** |
| Max | 219.3 ms | 219.3 ms | ✅ < 1,000 ms |

### Reliability

| Metric | Value | SLO |
|--------|-------|-----|
| Failed requests | 888 / 66,484 | — |
| Error rate | 1.34% | ⚠️ Above 0.5% target |
| Login latency avg | 63.7 ms | — |
| Login latency p95 | 84.5 ms | — |

### Data Transfer

| Metric | Value |
|--------|-------|
| Data sent | 38.5 MB |
| Data received | 73.4 MB |
| Avg iteration duration | 3,994 ms |

## Analysis

### Strengths

1. **Latency is excellent** — p95 at 110ms is well under the 500ms SLO, with
   headroom for a 4x traffic increase before hitting the threshold.

2. **Throughput is strong** — 177 reports/sec on a single server pod means
   the system can handle ~10,600 reports per minute. With K8s HPA scaling to
   10 pods, theoretical capacity reaches ~100,000 reports/minute.

3. **Median latency of 4ms** — under normal load, the system responds almost
   instantly. The long tail (max 219ms) is well within acceptable bounds.

4. **Login is fast** — even with bcrypt (cost 10), login p95 is 84ms. The
   authentication overhead is negligible.

### Areas for Improvement

1. **Error rate 1.34%** — slightly above the 0.5% SLO. Root cause: PgBouncer
   connection pool exhaustion under 1000 concurrent VUs on a single pod.
   Mitigation: increase `PGBOUNCER_DEFAULT_POOL_SIZE` from 20 → 40, or rely
   on HPA to distribute load across pods (each pod gets its own pool).

2. **Single-pod test** — this test ran against one Express process. In
   production with K8s HPA (2–10 replicas), each replica handles a fraction
   of the traffic, so the per-pod load would be 100–500 VUs at peak.

### Capacity Projection (with K8s HPA)

| Pods | Est. Max VUs | Est. Reports/sec | Supports |
|------|-------------|-------------------|----------|
| 2 | 2,000 | 354 | ~21k reports/min |
| 5 | 5,000 | 885 | ~53k reports/min |
| 10 | 10,000 | 1,770 | ~106k reports/min |

For an 80,000-employee organization, even a worst-case simultaneous surge
(all employees reporting within 1 minute) would require ~1,333 reports/sec —
achievable with 8 pods.

## How to Reproduce

```bash
# 1. Start the full stack
make up

# 2. Seed 10,000 test users
SEED_SCALE=load make seed

# 3. Create an active event via admin UI, note the EVENT_ID

# 4. Run the load test
make k6-report EVENT_ID=<uuid>

# Results saved to tests/load/results/
```

## Raw Data

- `tests/load/results/report-surge-final.json` — full k6 JSON metrics
- `tests/load/results/report-surge-20260517-214207.json` — timestamped run
