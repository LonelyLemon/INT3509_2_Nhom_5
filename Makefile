# =============================================================
# MarketMind — Root Makefile
#
# All backend Docker operations are delegated to the backend/
# directory where the Dockerfile and docker-compose files live.
#
# Quick start (dev):
#   make dev-setup   # first time: copies .env.dev → checks ready
#   make dev         # start all dev containers
#   make logs        # tail all logs
#   make down        # stop and remove containers
# =============================================================

BACKEND_DIR := backend
DC_DEV  := docker compose -f docker-compose.dev.yml
DC_PROD := docker compose -f docker-compose.prod.yml

.DEFAULT_GOAL := help

# ---------- help ---------------------------------------------
.PHONY: help
help:
	@echo ""
	@echo "  MarketMind — available targets"
	@echo ""
	@echo "  Development:"
	@echo "    make dev-setup    Copy .env.dev as starting point (first-time setup)"
	@echo "    make dev          Build images (if needed) and start all dev containers"
	@echo "    make dev-build    Force-rebuild images and start dev containers"
	@echo "    make down         Stop and remove all dev containers + networks"
	@echo "    make down-v       Stop and remove containers, networks AND volumes (wipes DB)"
	@echo ""
	@echo "  Logs & status:"
	@echo "    make logs         Tail logs from all dev containers"
	@echo "    make logs-api     Tail logs from the API container only"
	@echo "    make ps           Show running containers"
	@echo ""
	@echo "  Database:"
	@echo "    make migrate      Run Alembic migrations inside the api container"
	@echo "    make migration m=\"msg\"  Create a new Alembic revision (autogenerate)"
	@echo "    make db-shell     Open psql inside the db container"
	@echo ""
	@echo "  Utilities:"
	@echo "    make shell        Open bash shell inside the api container"
	@echo "    make test         Run pytest inside the api container"
	@echo ""
	@echo "  Production:"
	@echo "    make prod         Build and start production containers (detached)"
	@echo "    make prod-down    Stop and remove production containers"
	@echo ""

# ---------- first-time setup ---------------------------------
.PHONY: dev-setup
dev-setup:
	@if [ ! -f $(BACKEND_DIR)/.env.dev.local ]; then \
		cp $(BACKEND_DIR)/.env.dev $(BACKEND_DIR)/.env.dev.local; \
		echo "  Created $(BACKEND_DIR)/.env.dev.local"; \
		echo "  Edit it to add your API keys (MASSIVE_API_KEY, MAIL_*, etc.)"; \
	else \
		echo "  $(BACKEND_DIR)/.env.dev.local already exists — skipping copy"; \
	fi

# ---------- development --------------------------------------
.PHONY: dev
dev:
	cd $(BACKEND_DIR) && $(DC_DEV) up

.PHONY: dev-build
dev-build:
	cd $(BACKEND_DIR) && $(DC_DEV) up --build

.PHONY: down
down:
	cd $(BACKEND_DIR) && $(DC_DEV) down

.PHONY: down-v
down-v:
	@echo "WARNING: This will delete all database data."
	@read -p "Continue? [y/N] " ans && [ "$$ans" = "y" ]
	cd $(BACKEND_DIR) && $(DC_DEV) down -v

# ---------- logs & status ------------------------------------
.PHONY: logs
logs:
	cd $(BACKEND_DIR) && $(DC_DEV) logs -f

.PHONY: logs-api
logs-api:
	cd $(BACKEND_DIR) && $(DC_DEV) logs -f api

.PHONY: ps
ps:
	cd $(BACKEND_DIR) && $(DC_DEV) ps

# ---------- database -----------------------------------------
.PHONY: migrate
migrate:
	cd $(BACKEND_DIR) && $(DC_DEV) exec api alembic upgrade head

.PHONY: migration
migration:
	@if [ -z "$(m)" ]; then echo "Usage: make migration m=\"your message\""; exit 1; fi
	cd $(BACKEND_DIR) && $(DC_DEV) exec api alembic revision --autogenerate -m "$(m)"

.PHONY: db-shell
db-shell:
	cd $(BACKEND_DIR) && $(DC_DEV) exec db psql -U marketmind -d marketminddb

# ---------- utilities ----------------------------------------
.PHONY: shell
shell:
	cd $(BACKEND_DIR) && $(DC_DEV) exec api bash

.PHONY: test
test:
	cd $(BACKEND_DIR) && $(DC_DEV) exec api pytest $(ARGS)

# ---------- production ---------------------------------------
.PHONY: prod
prod:
	cd $(BACKEND_DIR) && $(DC_PROD) up --build -d

.PHONY: prod-down
prod-down:
	cd $(BACKEND_DIR) && $(DC_PROD) down
