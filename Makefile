.PHONY: help dev-docker up down logs logs-web logs-admin logs-server logs-postgres migrate seed clean

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
	@echo "  make seed             - Seed initial admin account (requires DATABASE_URL)"
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
