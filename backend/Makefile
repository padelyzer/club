.PHONY: help dev test clean migrate shell lint format docker-up docker-down docker-rebuild

# Default target
.DEFAULT_GOAL := help

# Variables
PYTHON := python
PIP := pip
DJANGO := $(PYTHON) manage.py
DOCKER_COMPOSE := docker-compose

# Help target
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development targets
dev: ## Start development server
	$(DJANGO) runserver

migrate: ## Run database migrations
	$(DJANGO) makemigrations
	$(DJANGO) migrate

shell: ## Open Django shell
	$(DJANGO) shell_plus --print-sql

createsuperuser: ## Create superuser
	$(DJANGO) createsuperuser

collectstatic: ## Collect static files
	$(DJANGO) collectstatic --noinput

# Database targets
dbshell: ## Open database shell
	$(DJANGO) dbshell

dbreset: ## Reset database (WARNING: destroys all data)
	$(DJANGO) reset_db --noinput
	$(MAKE) migrate
	@echo "Database reset complete"

# Testing targets
test: ## Run tests
	pytest

test-coverage: ## Run tests with coverage
	pytest --cov=apps --cov-report=html --cov-report=term

# Code quality targets
lint: ## Run linters
	flake8 apps/
	pylint apps/ --load-plugins pylint_django
	mypy apps/

format: ## Format code with black and isort
	black .
	isort .

check-format: ## Check code formatting
	black --check .
	isort --check-only .

type-check: ## Run type checking with mypy
	mypy apps/

security: ## Check security vulnerabilities
	bandit -r apps/
	safety check

quality: format lint type-check security ## Run all quality checks

pre-commit-install: ## Install pre-commit hooks
	pre-commit install

pre-commit-run: ## Run pre-commit on all files
	pre-commit run --all-files

# Docker targets
docker-up: ## Start Docker containers
	$(DOCKER_COMPOSE) up -d

docker-down: ## Stop Docker containers
	$(DOCKER_COMPOSE) down

docker-rebuild: ## Rebuild Docker containers
	$(DOCKER_COMPOSE) build --no-cache

docker-logs: ## View Docker logs
	$(DOCKER_COMPOSE) logs -f

docker-shell: ## Open shell in backend container
	$(DOCKER_COMPOSE) exec backend bash

docker-migrate: ## Run migrations in Docker
	$(DOCKER_COMPOSE) exec backend python manage.py migrate

docker-test: ## Run tests in Docker
	$(DOCKER_COMPOSE) exec backend pytest

# Celery targets
celery-worker: ## Start Celery worker
	celery -A config worker -l info

celery-beat: ## Start Celery beat
	celery -A config beat -l info

celery-flower: ## Start Flower (Celery monitoring)
	celery -A config flower

# Installation targets
install: ## Install dependencies
	$(PIP) install -r requirements/development.txt

install-prod: ## Install production dependencies
	$(PIP) install -r requirements/production.txt

install-dev-tools: ## Install development tools
	$(PIP) install black isort flake8 mypy pytest pytest-cov pre-commit bandit safety
	$(PIP) install pylint pylint-django django-stubs djangorestframework-stubs

setup-dev: install install-dev-tools pre-commit-install ## Complete development setup
	@echo "✅ Development environment ready!"
	@echo "Run 'make format' to format code"
	@echo "Run 'make test' to run tests"
	@echo "Run 'make dev' to start development server"

# Utility targets
clean: ## Clean up temporary files
	find . -type f -name '*.pyc' -delete
	find . -type d -name '__pycache__' -delete
	find . -type d -name '.pytest_cache' -delete
	find . -type d -name '.mypy_cache' -delete
	rm -rf htmlcov/
	rm -rf .coverage
	rm -rf *.egg-info

urls: ## Show all URL patterns
	$(DJANGO) show_urls

check-deploy: ## Check deployment readiness
	$(DJANGO) check --deploy

# Railway deployment
deploy: ## Deploy to Railway
	railway up

# API Documentation
api-schema: ## Generate API schema
	$(DJANGO) spectacular --color --file schema.yml

api-docs: ## Serve API documentation
	@echo "API documentation available at:"
	@echo "  - Swagger UI: http://localhost:8000/api/schema/swagger/"
	@echo "  - ReDoc: http://localhost:8000/api/schema/redoc/"