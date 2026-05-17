#!/usr/bin/env bash
# Bootstraps a local kind cluster with ingress-nginx + kube-prometheus-stack,
# applies the HuYouAn manifests, and prints the access URLs.
#
# Pre-requisites: kind, kubectl, helm. Docker desktop running.
set -euo pipefail

NS=huyouan
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "== Step 1/6: create kind cluster (if missing)"
if ! kind get clusters | grep -q "^huyouan$"; then
  kind create cluster --config "${SCRIPT_DIR}/kind-cluster.yaml"
else
  echo "Cluster 'huyouan' already exists — skipping create."
fi
kubectl cluster-info --context kind-huyouan

echo "== Step 2/6: install ingress-nginx"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=180s

echo "== Step 3/6: install kube-prometheus-stack + loki"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null 2>&1 || true
helm repo add grafana https://grafana.github.io/helm-charts >/dev/null 2>&1 || true
helm repo update
helm upgrade --install prom prometheus-community/kube-prometheus-stack \
  --namespace observability --create-namespace \
  --set grafana.adminPassword=admin \
  --set grafana.service.type=ClusterIP \
  -f "${REPO_ROOT}/k8s/observability/kube-prometheus-stack-values.yaml" \
  --wait --timeout 5m
helm upgrade --install loki grafana/loki \
  --namespace observability \
  --set deploymentMode=SingleBinary \
  --set 'loki.commonConfig.replication_factor=1' \
  --set 'loki.storage.type=filesystem' \
  --wait --timeout 5m || echo "(loki install best-effort)"

echo "== Step 4/6: apply HuYouAn manifests"
kubectl apply -f "${REPO_ROOT}/k8s/base/namespace.yaml"
# Secrets — copy secrets.example.yaml → secrets.yaml first and edit values.
if [[ -f "${REPO_ROOT}/k8s/base/secrets.yaml" ]]; then
  kubectl apply -f "${REPO_ROOT}/k8s/base/secrets.yaml"
else
  echo "WARN: k8s/base/secrets.yaml not found — applying example template only."
  echo "      Copy secrets.example.yaml → secrets.yaml and edit before production."
  kubectl apply -f "${REPO_ROOT}/k8s/base/secrets.example.yaml"
fi
kubectl apply -f "${REPO_ROOT}/k8s/base/configmap.yaml"
kubectl apply -f "${REPO_ROOT}/k8s/base/postgres-statefulset.yaml"
kubectl apply -f "${REPO_ROOT}/k8s/base/pgbouncer.yaml"
kubectl apply -f "${REPO_ROOT}/k8s/base/redis.yaml"
kubectl apply -f "${REPO_ROOT}/k8s/base/server.yaml"
kubectl apply -f "${REPO_ROOT}/k8s/base/web.yaml"
kubectl apply -f "${REPO_ROOT}/k8s/base/ingress.yaml"

echo "== Step 5/6: wait for rollouts"
kubectl -n "${NS}" rollout status statefulset/postgres --timeout=180s
kubectl -n "${NS}" rollout status deployment/pgbouncer --timeout=180s
kubectl -n "${NS}" rollout status deployment/redis --timeout=120s
kubectl -n "${NS}" rollout status deployment/server --timeout=240s || true
kubectl -n "${NS}" rollout status deployment/web --timeout=240s || true
kubectl -n "${NS}" rollout status deployment/admin --timeout=240s || true

echo
echo "== Step 6/6: done"
cat <<EOF
Add these entries to /etc/hosts:

  127.0.0.1   huyouan.local admin.huyouan.local

Access:
  http://huyouan.local           # employee + manager web app
  http://admin.huyouan.local     # admin console

Observability (port-forward):
  kubectl -n observability port-forward svc/prom-grafana 3030:80
  → http://localhost:3030 (admin/admin)

Run migrations + seed:
  kubectl apply -f k8s/base/migrate-job.yaml
  kubectl -n huyouan exec deploy/server -- node -e "process.env.SEED_SCALE='demo'; import('./dist/lib/db.js')"

Tear down:
  kind delete cluster --name huyouan
EOF
