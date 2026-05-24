.PHONY: help dev-docker up down logs logs-web logs-admin logs-server logs-postgres migrate seed seed-load test test-coverage k6-report k6-dashboard kind-up kind-down obs-up obs-down demo-ready demo-status clean

# Sensible defaults so a fresh checkout works without exporting env vars.
POSTGRES_PASSWORD ?= devpassword
DATABASE_URL ?= postgresql://safety:$(POSTGRES_PASSWORD)@localhost:5432/safetydb
SEED_ADMIN_USERNAME ?= admin
SEED_ADMIN_PASSWORD ?= changeme
SEED_USER_PASSWORD ?= password123

# Auto-load .env if present so `make migrate` / `make seed` pick up
# DATABASE_URL without the caller having to `export` it. Explicit
# command-line overrides (e.g. `make migrate DATABASE_URL=...`) still win
# because of the `?=` assignments above.
ifneq (,$(wildcard ./.env))
	include .env
	export
endif

# Default target
help:
	@echo "Safety Response System - Docker Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev-docker       - Run all apps in Docker (development mode, hot-reload)"
	@echo ""
	@echo "Production:"
	@echo "  make up               - Start all services (detached)"
	@echo "  make down             - Stop all services"
	@echo ""
	@echo "Database:"
	@echo "  make migrate          - Run Drizzle migrations (requires DATABASE_URL)"
	@echo "  make seed             - Demo seed: 5 depts, 100 users + admin (requires DATABASE_URL)"
	@echo "  make seed-load        - Load-test seed: 10k users for k6"
	@echo ""
	@echo "Tests:"
	@echo "  make test             - Run server integration tests (Vitest + Supertest)"
	@echo "  make test-coverage    - Same with coverage report"
	@echo "  make k6-report        - k6 report-surge: 1k VUs (set EVENT_ID=...)"
	@echo "  make k6-dashboard     - k6 dashboard-poll: 55 admins polling"
	@echo ""
	@echo "Observability (docker-compose profile):"
	@echo "  make obs-up           - Start Prometheus + Grafana + Loki + Promtail"
	@echo "  make obs-down         - Stop observability stack"
	@echo ""
	@echo "Kubernetes (local kind cluster):"
	@echo "  make kind-up          - Create kind cluster + apply manifests"
	@echo "  make kind-down        - Delete kind cluster"
	@echo ""
	@echo "Logs:"
	@echo "  make logs             - All service logs"
	@echo "  make logs-web         - Web app logs"
	@echo "  make logs-admin       - Admin app logs"
	@echo "  make logs-server      - API server logs"
	@echo "  make logs-postgres    - Postgres logs"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean            - Remove all containers, volumes, and images"
	@echo ""
	@echo "Demo:"
	@echo "  make demo-ready       - One-shot pre-flight: boot stack + migrate + seed + obs"
	@echo "  make demo-status      - Show service health + URLs + demo credentials"
	@echo ""
	@echo "Local dev (no Docker): bun dev"
	@echo "Build check:           bun lint && bun typecheck && bun run build"
	@echo ""

# Docker development (hot-reload)
dev-docker:
	docker compose -f docker-compose.dev.yml up

# Docker production
# Brings the stack up and then runs migrations once Postgres is healthy,
# so `make up && make seed` is enough for a working app — no manual
# migrate step required.
up:
	docker compose up -d
	@echo "→ Waiting for Postgres to be healthy…"
	@for i in $$(seq 1 30); do \
		docker compose exec -T postgres pg_isready -U safety -d safetydb >/dev/null 2>&1 && break; \
		sleep 2; \
	done
	@$(MAKE) migrate

down:
	docker compose down

# Database migrations and seed.
# Use `bunx` so we don't depend on `node_modules/.bin` being on PATH or
# on `bun run`'s script-resolution shim (which failed on a fresh checkout).
migrate:
	cd packages/database && DATABASE_URL='$(DATABASE_URL)' bunx drizzle-kit migrate

seed:
	cd packages/database && DATABASE_URL='$(DATABASE_URL)' \
		SEED_ADMIN_USERNAME='$(SEED_ADMIN_USERNAME)' \
		SEED_ADMIN_PASSWORD='$(SEED_ADMIN_PASSWORD)' \
		SEED_USER_PASSWORD='$(SEED_USER_PASSWORD)' \
		bunx tsx src/seed.ts

seed-load:
	cd packages/database && DATABASE_URL='$(DATABASE_URL)' \
		SEED_SCALE=load \
		SEED_ADMIN_USERNAME='$(SEED_ADMIN_USERNAME)' \
		SEED_ADMIN_PASSWORD='$(SEED_ADMIN_PASSWORD)' \
		SEED_USER_PASSWORD='$(SEED_USER_PASSWORD)' \
		bunx tsx src/seed.ts

# ── Tests ─────────────────────────────────────────────────────────────────────
test:
	cd apps/server && bun run test

test-coverage:
	cd apps/server && bun run test:coverage

# ── k6 ────────────────────────────────────────────────────────────────────────
# Usage: make k6-report EVENT_ID=<uuid> [API_URL=http://localhost:4000]
k6-report:
	k6 run \
		-e API_URL=$(or $(API_URL),http://localhost:4000) \
		-e EVENT_ID=$(EVENT_ID) \
		-e SEED_USER_PASSWORD=$(or $(SEED_USER_PASSWORD),password123) \
		tests/load/report-surge.js

k6-dashboard:
	k6 run \
		-e API_URL=$(or $(API_URL),http://localhost:4000) \
		-e EVENT_ID=$(EVENT_ID) \
		-e SEED_ADMIN_USERNAME=$(or $(SEED_ADMIN_USERNAME),admin) \
		-e SEED_ADMIN_PASSWORD=$(or $(SEED_ADMIN_PASSWORD),changeme) \
		tests/load/dashboard-poll.js

# ── Observability ─────────────────────────────────────────────────────────────
obs-up:
	docker compose --profile observability up -d

obs-down:
	docker compose --profile observability down

# ── Kubernetes ────────────────────────────────────────────────────────────────
kind-up:
	bash k8s/kind/setup.sh

kind-down:
	kind delete cluster --name huyouan

# Logs
logs:
	docker compose logs -f

logs-web:
	docker compose logs -f web

logs-admin:
	docker compose logs -f admin

logs-server:
	docker compose logs -f server

logs-postgres:
	docker compose logs -f postgres

# ── Demo pre-flight ───────────────────────────────────────────────────────────
# One-shot bring-up for the 5/26 demo: data services, migrations, seed,
# observability stack. Idempotent — safe to re-run.
demo-ready:
	@if [ ! -f .env ]; then \
		echo "Creating .env from .env.example…"; \
		cp .env.example .env; \
		echo "WARNING: edit .env to set real values before production use."; \
	fi
	@echo "→ Booting Postgres + Redis + 3 app services (auto-migrates on healthy)…"
	$(MAKE) up
	@echo "→ Bringing up observability (Prometheus + Grafana + Loki + Promtail)…"
	docker compose --profile observability up -d
	@echo "→ Seeding demo data (100 users, 5 depts × 4-level hierarchy)…"
	$(MAKE) seed
	@$(MAKE) demo-status

demo-status:
	@echo ""
	@echo "════════════════════════════════════════════════════════════"
	@echo " 護你安 HuYouAn — demo stack status"
	@echo "════════════════════════════════════════════════════════════"
	@echo ""
	@curl -sf http://localhost:4000/api/health 2>/dev/null \
		| sed 's/^/  API:    /' || echo "  API:    NOT REACHABLE (docker compose up?)"
	@echo "  Web:    http://localhost:3000  (employees + managers)"
	@echo "  Admin:  http://localhost:3001  (admin console)"
	@echo "  Grafana http://localhost:3030  (admin/admin)"
	@echo "  Prom:   http://localhost:9090"
	@echo ""
	@echo "  Demo credentials (password: $(SEED_USER_PASSWORD) unless noted):"
	@echo "    Admin:    $(SEED_ADMIN_USERNAME) / $(SEED_ADMIN_PASSWORD)   → http://localhost:3001/login"
	@echo "    Employee: employee@huyouan.local"
	@echo "    Manager:  manager@huyouan.local"
	@echo "    CEO:      ceo@huyouan.local"
	@echo ""
	@echo "  Demo script:  docs/DEMO.md"
	@echo "  Load test:    make seed-load && make k6-report EVENT_ID=<uuid>"
	@echo "════════════════════════════════════════════════════════════"

# Cleanup
clean:
	docker compose down -v
	docker compose --profile observability down -v
	docker system prune -af --volumes
