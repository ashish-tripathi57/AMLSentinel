.PHONY: install install-backend install-frontend dev-backend dev-frontend test test-backend test-frontend seed venv

VENV := backend/.venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
PYTEST := $(VENV)/bin/pytest
UVICORN := $(VENV)/bin/uvicorn

venv:
	python3 -m venv $(VENV)

install: install-backend install-frontend

install-backend: venv
	$(PIP) install -e "backend/.[dev]"

install-frontend:
	cd frontend && npm install

dev-backend:
	cd backend && ../$(UVICORN) api.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

test: test-backend test-frontend

test-backend:
	cd backend && ../$(PYTEST) --cov=api --cov-report=term-missing

test-frontend:
	cd frontend && npx vitest run --coverage

seed:
	cd backend && ../$(PYTHON) -m api.seed
