# AML Sentinel — Implementation Plan

## Context

Build a greenfield AI-powered AML Alert Investigation Assistant for banking compliance teams. The tool helps analysts triage 20 synthetic alerts across 6 typologies, investigate with AI assistance, and generate SAR reports. TDD throughout with 100% coverage.

**Key decisions:**
- Basic auth with hardcoded analysts (no registration)
- Alert Queue is the landing page with compact stats bar (no separate dashboard — V2)
- Real Claude API in tests (no mocks for AI layer)
- SAR as professional narrative PDF (5 sections); FIU-IND STR format noted as roadmap in README
- **SQLite** database (no Docker/PostgreSQL) — simpler setup, zero infrastructure

---

## Standards Enforcement Strategy

The UI design system and code quality standards will be embedded directly into **CLAUDE.md** as the first implementation step (task 1.0). This ensures:
- CLAUDE.md is loaded as context in **every conversation turn** and by **every sub-agent**
- Standards are impossible to miss — they're always in the prompt context
- No need to reference the plan file during implementation
- Sub-agents building frontend components will see the exact Datadog patterns, design tokens, and badge classes

**What goes into CLAUDE.md:**
- Datadog design philosophy (7 specific patterns)
- Exact design tokens (colors, fonts, sidebar spec, badge classes, chart palette)
- UI deviation rule (must ask user before deviating)
- Python code quality checklist
- React code quality checklist
- TDD requirements
- File structure conventions

---

## Asana Workflow (per CLAUDE.md — strictly followed)

**Project URL:** https://app.asana.com/1/1213373285257491/project/1213407028238830/list

**Workflow for every task:**
1. **Create task in Asana** under the appropriate section BEFORE starting any work
2. **Wait for user approval** before beginning implementation
3. **Update task fields on completion:** mark completed, set the `Parallel Group` field to indicate which tasks in the same section could run in parallel
4. **Audit trail:** Each task maps 1:1 to an Asana task; no work happens without a corresponding Asana entry

**Asana sections (12 sections):**
> **NOTE:** The Asana MCP cannot create sections. The user will create these 12 sections manually in Asana. Once created, I will call `get_project_sections` to get section GIDs and assign tasks to the correct sections.

1. Project Setup & Infrastructure
2. Database & Data Layer
3. Synthetic Data & Seeding
4. Backend API — Core
5. Backend API — AI Integration
6. Frontend — Shell & Navigation
7. Frontend — Alert Queue
8. Frontend — Investigation View
9. Frontend — AI Chat & Checklist
10. Frontend — SAR Generator & Case Management
11. Integration & E2E Testing
12. Documentation & Polish

---

## Architecture

```
React SPA (Vite + Tailwind + Recharts + react-force-graph-2d)
        |
    REST API + SSE (chat streaming)
        |
FastAPI Backend (Uvicorn)
        |
  +-----+-----+-----+
  |           |           |
 SQLite    Claude API   File Storage
 (local)   (sonnet-4-6) (SAR PDFs)
```

**Backend layers:** Routes → Services → Repositories → Models (SQLAlchemy) + Schemas (Pydantic)
**Frontend layers:** Pages → Components (domain-grouped) → Hooks → Services (API client) → Types

**Database:** SQLite via aiosqlite (async). File at `backend/aml_sentinel.db`. Test DB uses separate in-memory or temp file SQLite instance. Alembic for migrations with SQLite dialect.

**Database entities:**
```
Customer 1──* Account 1──* Transaction
Customer 1──* Alert *──* Transaction (junction: alert_transactions)
Alert 1──* InvestigationNote | ChecklistItem | ChatMessage | SARDraft | AuditTrailEntry
User (hardcoded analysts for basic auth)
```

---

## File Structure

```
AMLSentinel/
├── Makefile
├── README.md
├── architecture.md
├── technical-architecture.md
├── .env.example
├── .gitignore
│
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/versions/
│   ├── api/
│   │   ├── main.py
│   │   ├── core/           (config, database, dependencies, auth)
│   │   ├── models/         (customer, account, transaction, alert, investigation, user, base)
│   │   ├── schemas/        (Pydantic models per domain + common)
│   │   ├── repositories/   (async CRUD per domain)
│   │   ├── services/       (alert, investigation, ai, pattern_analysis, chat, checklist, sar, pdf)
│   │   ├── routes/         (alerts, customers, transactions, investigation, chat, sar, auth, health)
│   │   ├── seed/           (per-typology seeders + checklist templates)
│   │   └── tests/          (test_models/, test_repositories/, test_services/, test_routes/, test_integration/)
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts / vitest.config.ts / tailwind.config.ts
│   └── src/
│       ├── types/          (alert, customer, transaction, investigation, api)
│       ├── services/       (api-client, alert-service, investigation-service)
│       ├── hooks/          (use-alerts, use-alert-detail, use-transactions, use-network, use-chat, use-checklist, use-sar)
│       ├── components/
│       │   ├── common/     (Badge, Card, Button, Table, Tabs, Pagination, LoadingSpinner, EmptyState)
│       │   ├── layout/     (AppShell, Sidebar)
│       │   ├── alerts/     (AlertTable, AlertFilters, AlertStatsBar, RiskScoreBar)
│       │   └── investigation/ (CustomerProfile, TransactionTimeline, TransactionTable, PatternAnalysis, NetworkGraph, InvestigationChat, Checklist, AnalystNotes, AuditTrail, StatusTransition, SAREditor)
│       ├── pages/          (AlertQueuePage, InvestigationPage)
│       └── utils/          (format-currency, format-date, constants, typology-config)
```

---

## Asana Sections & Tasks (63 tasks)

### Section 1: Project Setup & Infrastructure (8 tasks)

| # | Task | Dependencies | Parallel Group |
|---|------|-------------|----------------|
| 1.0 | Embed UI design system + code quality standards into CLAUDE.md | None | PG-1A |
| 1.1 | Initialize Python backend with FastAPI + SQLite (aiosqlite) | None | PG-1A |
| 1.2 | Initialize React frontend with Vite + Tailwind + Inter font | None | PG-1A |
| 1.3 | Configure pytest with async support and 100% coverage | 1.1 | PG-1B |
| 1.4 | Configure Vitest with React Testing Library and 100% coverage | 1.2 | PG-1B |
| 1.5 | Set up Alembic for SQLite migrations | 1.1, 1.3 | PG-1C |
| 1.6 | Implement basic auth with hardcoded analysts (TDD) | 1.1, 1.3 | PG-1B |
| 1.7 | Create architecture.md and technical-architecture.md with initial Mermaid diagrams | 1.1, 1.2 | PG-1B |

**Parallel execution:** 1.0 + 1.1 + 1.2 simultaneously → 1.3 + 1.4 + 1.6 + 1.7 simultaneously → 1.5

> **Per CLAUDE.md:** architecture.md and technical-architecture.md are CREATED here at project start (task 1.7), then UPDATED with final details in Section 12 (tasks 12.2, 12.3). Any architecture changes during implementation will prompt the user about updating these docs.

### Section 2: Database & Data Layer (7 tasks)

| # | Task | Dependencies | Parallel Group |
|---|------|-------------|----------------|
| 2.1 | Define Customer model and Pydantic schemas (TDD) | 1.5 | PG-2A |
| 2.2 | Define Account model and Pydantic schemas (TDD) | 1.5 | PG-2A |
| 2.3 | Define Transaction model and Pydantic schemas (TDD) | 1.5 | PG-2A |
| 2.4 | Define Alert model and Pydantic schemas (TDD) | 1.5 | PG-2A |
| 2.5 | Define Investigation support models — notes, checklist, chat, SAR, audit (TDD) | 1.5 | PG-2A |
| 2.6 | Generate Alembic migration and validate schema | 2.1-2.5 | PG-2B |
| 2.7 | Implement repository layer with async CRUD operations (TDD) | 2.6 | PG-2C |

**Parallel execution:** 2.1-2.5 all simultaneously → 2.6 → 2.7

### Section 3: Synthetic Data & Seeding (8 tasks)

| # | Task | Dependencies | Parallel Group |
|---|------|-------------|----------------|
| 3.1 | Design synthetic data specification (20 alerts, 6 typologies) | 2.6 | PG-3A |
| 3.2 | Implement Structuring typology seed data (5 alerts: S1-S5) | 3.1 | PG-3B |
| 3.3 | Implement Unusual Geographic seed data (3 alerts: G1-G3) | 3.1 | PG-3B |
| 3.4 | Implement Rapid Movement seed data (3 alerts: R1-R3) | 3.1 | PG-3B |
| 3.5 | Implement Round-trip seed data (3 alerts: RT1-RT3) | 3.1 | PG-3B |
| 3.6 | Implement Sudden Activity Change seed data (3 alerts: SA1-SA3) | 3.1 | PG-3B |
| 3.7 | Implement Large Cash seed data (3 alerts: LC1-LC3) | 3.1 | PG-3B |
| 3.8 | Create database seeding CLI command and validation tests | 3.2-3.7 | PG-3C |

**Parallel execution:** 3.1 first → 3.2-3.7 all simultaneously → 3.8

### Section 4: Backend API — Core (8 tasks)

| # | Task | Dependencies | Parallel Group |
|---|------|-------------|----------------|
| 4.1 | Implement Alert Queue API — GET /api/alerts with filters/sort/pagination (TDD) | 2.7 | PG-4A |
| 4.2 | Implement Customer Profile API — GET /api/alerts/{id}/customer (TDD) | 2.7 | PG-4A |
| 4.3 | Implement Transaction Timeline API — GET /api/alerts/{id}/transactions (TDD) | 2.7 | PG-4A |
| 4.4 | Implement Network Graph API — GET /api/alerts/{id}/network (TDD) | 2.7 | PG-4A |
| 4.5 | Implement Investigation Notes CRUD API (TDD) | 2.7 | PG-4A |
| 4.6 | Implement Checklist API with per-typology templates (TDD) | 2.7 | PG-4A |
| 4.7 | Implement Case Management status transitions + audit trail API (TDD) | 2.7 | PG-4A |
| 4.8 | Implement health check endpoint and CORS middleware (TDD) | 1.1 | PG-4A |

**Parallel execution:** All 8 tasks simultaneously

### Section 5: Backend API — AI Integration (6 tasks)

| # | Task | Dependencies | Parallel Group |
|---|------|-------------|----------------|
| 5.1 | Implement Claude API client wrapper service (TDD with real API) | 1.1 | PG-5A |
| 5.2 | Implement Pattern Analysis generation service (TDD with real API) | 5.1, 4.3 | PG-5B |
| 5.3 | Implement Investigation Chat API with SSE streaming (TDD with real API) | 5.1, 2.7 | PG-5B |
| 5.4 | Implement Checklist auto-check service (TDD with real API) | 5.1, 4.6 | PG-5B |
| 5.5 | Implement SAR Draft generation service (TDD with real API) | 5.1, 2.7 | PG-5B |
| 5.6 | Implement SAR PDF export — narrative format, 5 sections (TDD) | 5.5 | PG-5C |

**Parallel execution:** 5.1 first → 5.2 + 5.3 + 5.4 + 5.5 simultaneously → 5.6

### Section 6: Frontend — Shell & Navigation (4 tasks)

| # | Task | Dependencies | Parallel Group |
|---|------|-------------|----------------|
| 6.1 | Implement design system tokens in Tailwind — Inter font, all colors, badge variants, chart palette | 1.4 | PG-6A |
| 6.2 | Implement AppShell — Datadog-style dark sidebar (240px, bg-[#0F172A]), "AML Sentinel" header with icon, nav links, login | 6.1 | PG-6B |
| 6.3 | Implement API client service layer with typed hooks | 1.4 | PG-6A |
| 6.4 | Implement shared UI components — Badge, Card, Button, Table, Tabs, Pagination (Datadog compact style) | 6.1 | PG-6B |

**Parallel execution:** 6.1 + 6.3 simultaneously → 6.2 + 6.4 simultaneously

### Section 7: Frontend — Alert Queue (3 tasks)

| # | Task | Dependencies | Parallel Group |
|---|------|-------------|----------------|
| 7.1 | Implement Alert Queue page — Datadog-style dense sortable table with row click navigation | 6.2, 6.3, 6.4 | PG-7A |
| 7.2 | Implement Alert Queue filters — typology multi-select, status, risk range, date range, text search | 7.1 | PG-7B |
| 7.3 | Implement compact stats bar — open alerts, high-risk count, avg resolution time (top of queue) | 7.1 | PG-7B |

**Parallel execution:** 7.1 first → 7.2 + 7.3 simultaneously

### Section 8: Frontend — Investigation View (5 tasks)

| # | Task | Dependencies | Parallel Group |
|---|------|-------------|----------------|
| 8.1 | Implement Investigation page shell — Datadog-style tabbed detail panel with header, breadcrumbs | 6.2, 6.3, 6.4 | PG-8A |
| 8.2 | Implement Customer Profile tab — organized card grid, dense info panels | 8.1 | PG-8B |
| 8.3 | Implement Transaction Timeline tab — Recharts scatter (color-coded), dense sortable table, INR formatting | 8.1 | PG-8B |
| 8.4 | Implement Pattern Analysis tab — AI-generated structured cards with risk indicators | 8.1 | PG-8B |
| 8.5 | Implement Network Graph tab — react-force-graph-2d, nodes colored by risk, hover tooltips | 8.1 | PG-8B |

**Parallel execution:** 8.1 first → 8.2 + 8.3 + 8.4 + 8.5 simultaneously

### Section 9: Frontend — AI Chat & Checklist (2 tasks)

| # | Task | Dependencies | Parallel Group |
|---|------|-------------|----------------|
| 9.1 | Implement Investigation Chat panel — SSE streaming, message bubbles, transaction data references | 8.1, 6.3 | PG-9A |
| 9.2 | Implement Investigation Checklist panel — per-typology items, auto-check with AI rationale | 8.1, 6.3 | PG-9A |

**Parallel execution:** 9.1 + 9.2 simultaneously

### Section 10: Frontend — SAR Generator & Case Management (5 tasks)

| # | Task | Dependencies | Parallel Group |
|---|------|-------------|----------------|
| 10.1 | Implement SAR Draft Generator UI — 5-section editor, version history | 8.1, 6.3 | PG-10A |
| 10.2 | Implement SAR PDF download functionality | 10.1 | PG-10B |
| 10.3 | Implement Case Management status transitions UI — confirmation modal, rationale input | 8.1, 6.4 | PG-10A |
| 10.4 | Implement Analyst Notes panel — chronological, timestamped, markdown rendering | 8.1, 6.3 | PG-10A |
| 10.5 | Implement Audit Trail view — chronological log, filterable by action type | 8.1, 6.3 | PG-10A |

**Parallel execution:** 10.1 + 10.3 + 10.4 + 10.5 simultaneously → 10.2

### Section 11: Integration & E2E Testing (4 tasks)

| # | Task | Dependencies | Parallel Group |
|---|------|-------------|----------------|
| 11.1 | Write backend integration tests — full alert investigation flow with real Claude API | Sections 4+5 | PG-11A |
| 11.2 | Write frontend integration tests — full user journeys | Sections 7-10 | PG-11A |
| 11.3 | UI validation via Chrome MCP (ask user if they want to handle or I should) | 11.2 | PG-11B |
| 11.4 | Run full regression and enforce 100% coverage on both backend + frontend | 11.1, 11.2 | PG-11B |

**Parallel execution:** 11.1 + 11.2 simultaneously → 11.3 + 11.4 simultaneously

### Section 12: Documentation & Polish (4 tasks)

| # | Task | Dependencies | Parallel Group |
|---|------|-------------|----------------|
| 12.1 | Write comprehensive README.md — setup, architecture, API endpoints, tests, FIU-IND STR as roadmap | 11.4 | PG-12A |
| 12.2 | Update architecture.md with final Mermaid diagrams | 11.4 | PG-12A |
| 12.3 | Update technical-architecture.md with implementation details | 11.4 | PG-12A |
| 12.4 | Code cleanup — linters (ruff, eslint+prettier), no dead code, no TODOs, no commented blocks | 11.4 | PG-12A |

**Parallel execution:** All 4 simultaneously

---

## Critical Path

```
Backend:  1.1 → 1.3 → 1.5 → 2.1-2.5 (parallel) → 2.6 → 2.7 → 4.1-4.8 (parallel) → 5.1 → 5.2-5.5 (parallel) → 11.1 → 11.4 → 12.x
Frontend: 1.2 → 1.4 → 6.1+6.3 → 6.2+6.4 → 7.1+8.1 (parallel) → tabs+panels (parallel) → 11.2 → 11.4 → 12.x
```

Backend and frontend critical paths run in parallel after Section 1.

**Key bottlenecks:** Models (2.1-2.5), Repository layer (2.7), AI Client (5.1), Investigation shell (8.1)

---

## Verification

1. `make seed` populates SQLite with 20 alerts and full transaction histories
2. `cd backend && pytest --cov=api --cov-report=term-missing` — all pass, 100% coverage
3. `cd frontend && npx vitest run --coverage` — all pass, 100% coverage
4. Backend at `http://localhost:8000`, Frontend at `http://localhost:5173`
5. Login with hardcoded analyst credentials
6. Alert Queue shows 20 alerts with filters, sorting, compact stats bar
7. Click alert → Datadog-style tabbed investigation view with all 4 tabs
8. Chat with AI referencing real transaction data (SSE streaming)
9. Generate SAR → edit 5 sections → download narrative PDF
10. Change status → audit trail records the transition
11. Footer shows "Built with G.U.I.D.E.TM Framework"
12. All text renders in Inter font, sidebar is #0F172A, primary actions are #2563EB
