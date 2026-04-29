# Makefile for AI Task Processing Platform

.PHONY: help build up down logs test lint clean install dev

help:
	@echo "AI Task Processing Platform - Makefile"
	@echo ""
	@echo "Available commands:"
	@echo "  make install      - Install all dependencies"
	@echo "  make build        - Build Docker images"
	@echo "  make up           - Start all services with Docker Compose"
	@echo "  make down         - Stop all services"
	@echo "  make logs         - View logs from all services"
	@echo "  make logs-backend - View backend logs"
	@echo "  make logs-worker  - View worker logs"
	@echo "  make logs-frontend- View frontend logs"
	@echo "  make test         - Run tests"
	@echo "  make lint         - Run linting"
	@echo "  make clean        - Remove containers and volumes"
	@echo "  make dev          - Start development environment"

install:
	cd backend && npm install
	cd frontend && npm install
	cd worker && pip install -r requirements.txt

build:
	docker-compose build

up:
	docker-compose up -d
	@echo "Services starting up..."
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:5000"
	@sleep 5
	docker-compose logs

down:
	docker-compose down

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-worker:
	docker-compose logs -f worker

logs-frontend:
	docker-compose logs -f frontend

test:
	@echo "Running tests..."
	cd backend && npm test || true
	cd frontend && npm test -- --watchAll=false || true

lint:
	@echo "Linting backend..."
	cd backend && npm run lint || true
	@echo "Linting frontend..."
	cd frontend && npm run lint || true
	@echo "Linting worker..."
	pip install flake8 && flake8 worker/worker.py || true

clean:
	docker-compose down -v
	rm -rf node_modules
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

dev: clean install build up

restart:
	docker-compose restart

status:
	docker-compose ps

shell-backend:
	docker-compose exec backend /bin/sh

shell-frontend:
	docker-compose exec frontend /bin/sh

shell-worker:
	docker-compose exec worker /bin/bash

db-shell:
	docker-compose exec mongo mongosh

redis-shell:
	docker-compose exec redis redis-cli

healthcheck:
	@echo "Checking Backend Health..."
	curl -s http://localhost:5000/health | jq .
	@echo ""
	@echo "Checking MongoDB..."
	docker-compose exec mongo mongosh --eval "db.adminCommand('ping')" --quiet
	@echo ""
	@echo "Checking Redis..."
	docker-compose exec redis redis-cli ping

reset-db:
	docker-compose down mongo redis -v
	docker-compose up -d mongo redis
	@echo "Databases reset. Waiting for them to start..."
	sleep 5

.DEFAULT_GOAL := help
