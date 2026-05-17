.PHONY: help dev-docker up down logs logs-web logs-admin logs-server logs-postgres migrate seed seed-load test test-coverage k6-report k6-dashboard kind-up kind-down obs-up obs-down clean

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
	@echo "Local dev (no Docker): bun dev"
	@echo "Build check:           bun lint && bun typecheck && bun run build"
	@echo ""

# Docker development (hot-reload)
dev-docker:
	docker compose -f docker-compose.dev.yml up

# Docker production
up:
	docker compose up -d

down:
	docker compose down

# Database migrations and seed
migrate:
	cd packages/database && DATABASE_URL=$(DATABASE_URL) bun run db:migrate

seed:
	cd packages/database && DATABASE_URL=$(DATABASE_URL) \
		SEED_ADMIN_USERNAME=$(or $(SEED_ADMIN_USERNAME),admin) \
		SEED_ADMIN_PASSWORD=$(or $(SEED_ADMIN_PASSWORD),changeme) \
		bun run seed

seed-load:
	cd packages/database && DATABASE_URL=$(DATABASE_URL) \
		SEED_SCALE=load \
		SEED_ADMIN_USERNAME=$(or $(SEED_ADMIN_USERNAME),admin) \
		SEED_ADMIN_PASSWORD=$(or $(SEED_ADMIN_PASSWORD),changeme) \
		bun run seed

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

# Cleanup
clean:
	docker compose down -v
	docker system prune -af --volumes
