# Demo Script — 護你安 HuYouAn (5 minutes)

This is the live demo flow for the 5/26 預演 and 6/2 final report. Run it
end-to-end at least twice before the actual presentation.

## Pre-flight (do this 10 minutes before the demo)

```bash
# Boot the stack with observability + seed demo data
make up
make obs-up                  # Prometheus + Grafana + Loki + Promtail
make migrate DATABASE_URL=postgresql://safety:$POSTGRES_PASSWORD@localhost:5432/safetydb
make seed    DATABASE_URL=postgresql://safety:$POSTGRES_PASSWORD@localhost:5432/safetydb

# Open the four windows you'll use:
# 1. http://localhost:3000  — Employee tab     (employee@huyouan.local / password123)
# 2. http://localhost:3000  — Manager tab      (manager@huyouan.local  / password123)
# 3. http://localhost:3001  — Admin console    (admin / changeme)
# 4. http://localhost:3030  — Grafana          (admin / admin)

# A terminal showing real-time logs is a nice prop:
make logs-server
```

Optional pre-built kind cluster:

```bash
make kind-up
# /etc/hosts: 127.0.0.1   huyouan.local admin.huyouan.local
# http://huyouan.local        (employees + managers)
# http://admin.huyouan.local  (admin console)
kubectl -n observability port-forward svc/prom-grafana 3030:80 &
```

## The 5-minute story

### 0:00 — Open ✦ The problem

"When an earthquake hits TSMC's plant, 50,000 employees need to report their
status in seconds. Phone trees don't scale. We built 護你安 to solve that."

Three tabs open: **Admin · Manager · Employee**. Don't talk to the slides yet.

### 0:30 — Admin creates an incident

In **Admin tab** (`/events`):
1. Click **建立事件**.
2. Type **"2026 花蓮地震"**, type **地震**, click **建立並推送**.
3. Land on the event detail page; counters show `總員工: ~100, 已安全: 0,
   需協助: 0, 未回報: ~100`.

Talking point: "The server broadcasts an SSE event to every connected
client. Watch the employee tab."

### 1:00 — Employee receives the push and reports safe

Switch to **Employee tab**:
- A toast already says **新緊急事件：2026 花蓮地震**.
- The dashboard now shows a `SafetyReportCard`.
- Click **我安全**. Toast confirms **已回報「我安全」**.

Talking point: "One tap. Cookie-auth'd over a Next.js `/api/*` rewrite, the
report hit Postgres via PgBouncer, the stats cache in Redis was invalidated,
and an SSE event fan-out fired."

### 1:45 — Manager sees the live counter tick

Switch to **Manager tab** (`/dashboard`):
- `TeamStatusSummary` widget shows **已安全: 1, 未回報: N-1**, with a brief
  ring-pulse animation triggered by the SSE event.
- `UnreportedTeamList` shows other team members.
- Open `/dashboard/team` to show the recursive subordinate tree.

Talking point: "Every manager up the reporting chain gets the same SSE
broadcast. We compute the chain with a single recursive CTE on
`users.manager_id`."

### 2:30 — Employee marks 「需要協助」 — pulsing red banner everywhere

Back to **Employee tab**:
- Click **附上訊息**, type **"我在 B 棟 3F 受困"**.
- Click **需要協助**. Toast: 已通知主管.

Switch to **Manager tab** immediately:
- A pulsing red `NeedHelpBanner` slides in with the employee's name + message
  + Contact button.
- Click **Contact** → `mailto:` opens.
- Admin tab also shows the banner (admins always receive need_help fan-out).

Talking point: "Need-help broadcasts to every manager in the chain AND every
admin, plus a Resend email to the direct manager. Logging in Grafana." (If
RESEND_API_KEY is unset, it logs `[email:dry-run]` instead — the metric still
increments.)

### 3:15 — Show K8s + autoscaling

Switch to the terminal:
```bash
kubectl get pods,svc,hpa,ingress -n huyouan
```

Show:
- 2 `server` pods, HPA target 70% CPU min 2 max 10.
- StatefulSet `postgres`, Deployment `pgbouncer`, Deployment `redis`.
- Ingress on `huyouan.local`.

Then trigger a rolling update:
```bash
kubectl -n huyouan rollout restart deployment/server
kubectl -n huyouan rollout status deployment/server
```

Pods turn over with `maxUnavailable: 0` — the manager tab keeps streaming.

### 3:45 — Grafana observability story

Switch to **Grafana tab** (http://localhost:3030):
- **API Overview** dashboard: requests/sec, p95 latency, SSE active connections,
  report submissions per minute, cache hit rate. Watch the values move.
- **Safety SLO** dashboard: report success rate, need-help volume.
- Open **Alerting → Rules** to show the three rules.

### 4:30 — Load test snapshot

Switch to a separate terminal that has the saved k6 output ready (run earlier
during pre-flight or in a different window):

```bash
SEED_SCALE=load make seed DATABASE_URL=...
make k6-report EVENT_ID=<current event uuid>
```

Show the k6 console summary:
- 1k concurrent VUs over 5 minutes
- p95 ≈ 300-450ms (passes SLO of ≤ 500ms)
- error rate < 0.5%

### 4:50 — Close out

Switch to **Admin → Events → detail page** and click **結束事件 → 確定結束**.
Manager + Employee tabs receive `event_closed` SSE; dashboards return to the
empty state.

"Total time on call: well under the 99.9% SLO. Total grade weight covered:
30% requirements + 25% architecture + 25% tests + 10% ops + 10% code quality
= 100%."

---

## Speaker notes

- If SSE drops mid-demo, the **連線狀態** badge in the header will say
  `重新連線中` — the client reconnects with exponential backoff and resumes.
- If a Resend send fails, the call is best-effort — never blocks the report
  response. Watch the `reminder_emails_total{result="error"}` counter.
- The need-help cron rate-limits at 3 emails per (event, user, 8h). Confirm
  the `reminder:{event}:{user}` Redis key.

## Troubleshooting cheat sheet

| Symptom                                | Check                                                |
| -------------------------------------- | ---------------------------------------------------- |
| Login fails with "Cannot reach server" | `docker compose ps` — is `server` healthy?           |
| Empty dashboard                        | Did you run `make seed`?                             |
| SSE shows `重新連線中`                  | `kubectl logs deploy/server | grep sse`              |
| Stats stale                            | `redis-cli DEL stats:<eventId>` (it should auto-DEL) |
| k6 fails SLO                           | Was the `seed:load` step run? HPA scaled?            |
