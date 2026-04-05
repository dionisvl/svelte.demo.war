.PHONY: help dev prod up down logs build stop restart

help:
	@echo "Sveltewar - Svelte Game"
	@echo ""
	@echo "Development:"
	@echo "  make dev       - Start development environment"
	@echo "  make logs      - View logs"
	@echo ""
	@echo "Production:"
	@echo "  make prod      - Start production environment"
	@echo ""
	@echo "Common:"
	@echo "  make build     - Rebuild images"
	@echo "  make stop      - Stop containers"
	@echo "  make down      - Stop and remove containers"
	@echo "  make restart   - Restart containers"

dev:
	docker compose -f compose.yml -f compose.override.dev.yaml up -d

prod:
	docker compose -f compose.yml -f compose.override.prod.yaml up -d

up:
	docker compose -f compose.yml -f compose.override.dev.yaml up -d

down:
	docker compose down

stop:
	docker compose stop

restart:
	docker compose restart

logs:
	docker compose logs -f sveltewar-app

build:
	docker compose -f compose.yml -f compose.override.dev.yaml build --no-cache