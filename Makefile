COMPOSE_DEV = docker compose -f compose.yml -f compose.override.dev.yaml
COMPOSE_PROD = docker compose -f compose.yml -f compose.override.prod.yaml

.PHONY: help dev prod up down logs build stop restart test check lint

help:
	@echo "Sveltewar - orbital defense arcade"
	@echo ""
	@echo "Local (host Node >= 20.19):"
	@echo "  npm run dev    - Vite dev server on :5173"
	@echo "  make test      - Run unit tests"
	@echo "  make check     - Tests, lint, svelte-check, production build"
	@echo ""
	@echo "Docker:"
	@echo "  make dev       - Dev stack (Vite + Traefik, source mounted)"
	@echo "  make prod      - Build and start production (immutable image)"
	@echo "  make build     - Rebuild dev images without cache"
	@echo "  make logs      - Follow app logs"
	@echo "  make down      - Stop and remove dev containers"

dev up:
	$(COMPOSE_DEV) up -d --build

prod:
	$(COMPOSE_PROD) up -d --build

down:
	$(COMPOSE_DEV) down

stop:
	$(COMPOSE_DEV) stop

restart:
	$(COMPOSE_DEV) restart

logs:
	$(COMPOSE_DEV) logs -f sveltewar-app

build:
	$(COMPOSE_DEV) build --no-cache

test:
	npm test

check:
	npm test
	npm run lint
	npm run check
	npm run build
