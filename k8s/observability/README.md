# Observability

Local: `docker compose --profile observability up -d` — brings up Prometheus
(`:9090`), Grafana (`:3030`, admin/admin), Loki (`:3100`), and Promtail.

Cluster: `k8s/kind/setup.sh` installs the kube-prometheus-stack Helm chart
with our custom values + alert rules.

## Dashboards

The three dashboards under `observability/grafana/dashboards/` cover:

1. **API Overview** — RPS, p50/p95/p99 latency, error rate, SSE/stats gauges.
2. **Safety SLO** — report submit success rate, p95 latency on the report
   endpoint, need_help volume, reminder email throughput.
3. **Backing Services** — Node memory/heap, event-loop lag, cache hit ratio.

Grafana auto-imports them via the file provisioning in
`observability/grafana/provisioning/dashboards/dashboards.yml` (mounted into
the container by `docker-compose.yml`).

In Kubernetes, create a ConfigMap with the dashboard files:

```bash
kubectl -n observability create configmap huyouan-grafana-dashboards \
  --from-file=observability/grafana/dashboards/ \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Alert rules

Three rules ship in `kube-prometheus-stack-values.yaml`:

- `HighErrorRate` — 5xx > 1% for 5m
- `HighP95Latency` — p95 > 1s for 5m
- `PodCrashLooping` — > 3 restarts in 10m

Wire Alertmanager receivers (Slack/email) by editing the values file.
