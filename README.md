# AML Sentinel

AI-powered Anti-Money Laundering Alert Investigation Assistant for banking compliance teams.

## What is AML Sentinel?

AML Sentinel is a full-stack investigation workbench that enables compliance analysts to triage, investigate, and resolve AML alerts with AI assistance. Built around 20 synthetic alerts spanning 6 money laundering typologies, it provides an end-to-end workflow from alert queue to SAR filing with comprehensive audit trails.

The codebase follows **Domain-Driven Design (DDD)** principles — both backend and frontend are organized around AML/banking domain concepts (alerts, investigations, analytics, SAR) rather than technical layers. The UI follows Datadog-style design patterns — data-dense, functional, and optimized for analysts who work in compliance tooling 8 hours a day.

## Key Features

- **Alert Queue** — Sortable, filterable table with tabs (All / My Alerts / High Risk), bulk selection, and numbered pagination
- **Investigation Workbench** — 8-section icon sidebar: Customer Profile, Transaction Timeline, Pattern Analysis, Network Graph, Similar Cases, Analyst Notes, Checklist, Audit Trail
- **AI Chat** — Streaming conversational AI (Gemini) with access to alert transaction data
- **Pattern Analysis** — AI-generated risk indicators and structured analysis cards
- **SAR Generation** — AI-drafted Suspicious Activity Reports with 5 narrative sections, version history, and PDF export
- **Analytics Dashboard** — Summary cards, typology distribution, resolution breakdown, risk distribution, volume trends, false positive trends
- **Bulk Operations** — Bulk close with resolution tracking, AI-powered false positive detection
- **Similar Case Matching** — Up to 5 similar alerts ranked by typology, risk score, amount, and customer risk
- **Export** — FIU-IND STR PDF, investigation case file PDF, SAR PDF, analytics CSV, bulk SAR ZIP

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| Charts | Recharts 3, react-force-graph-2d |
| Icons | lucide-react |
| Backend | Python 3.11+, FastAPI, SQLAlchemy (async) |
| Database | SQLite via aiosqlite |
| AI | Gemini API (gemini-2.5-flash) via Google Generative AI SDK |
| PDF | ReportLab |
| Testing | Vitest + React Testing Library (frontend), pytest + pytest-asyncio (backend) |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Gemini API key ([Get one here](https://aistudio.google.com/apikey))

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Create `.env` in the `backend/` directory:

```env
GEMINI_API_KEY=your-gemini-api-key
DATABASE_URL=sqlite+aiosqlite:///./aml_sentinel.db
DEBUG=false
```

Seed the database and start the server:

```bash
python -m api.seed
uvicorn api.main:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at http://localhost:5174 and connects to the backend at http://localhost:8001.

### Login Credentials

| Username | Password |
|----------|----------|
| analyst.one | analyst123 |
| sarah.chen | analyst123 |

## Running Tests

### Backend (249 tests)

```bash
cd backend
.venv/bin/python -m pytest -v
```

### Frontend (692 tests)

```bash
cd frontend
npx vitest run
```

## Project Structure (Domain-Driven Design)

The repository follows **Domain-Driven Design (DDD)** guidelines — code is organized around AML/banking domain boundaries rather than generic technical categories. Each domain entity (alert, investigation, analytics, SAR) has its own model, schema, repository, service, and route on the backend, and its own components, hooks, services, and types on the frontend.

```
AMLSentinel/
├── architecture.md              # High-level architecture overview
├── technical-architecture.md    # Technical deep-dive
├── CLAUDE.md                    # AI assistant instructions + design system
├── Makefile                     # Development commands
├── backend/
│   ├── api/
│   │   ├── core/                # Infrastructure: config, database, auth
│   │   ├── models/              # Domain entities (SQLAlchemy ORM)
│   │   ├── schemas/             # Domain contracts (Pydantic validation)
│   │   ├── repositories/        # Domain persistence (async CRUD per entity)
│   │   ├── services/            # Domain logic + AI integration
│   │   ├── routes/              # Domain API endpoints (one router per domain)
│   │   ├── seed/                # Synthetic data generation (per typology)
│   │   └── tests/               # Mirrors source structure
│   └── pyproject.toml
└── frontend/
    ├── src/
    │   ├── components/          # Domain-grouped: alerts/, investigation/, analytics/, common/, layout/
    │   ├── hooks/               # Domain hooks: use-alerts, use-chat, use-analytics, etc.
    │   ├── services/            # Domain API clients: alert-service, analytics-service, etc.
    │   ├── types/               # Domain interfaces: alert.ts, investigation.ts, analytics.ts
    │   ├── pages/               # Route-level pages (one per domain view)
    │   └── utils/               # Formatters, constants
    └── package.json
```

## Documentation

- [Architecture Overview](architecture.md) — System design, user flows, component boundaries
- [Technical Architecture](technical-architecture.md) — Tech stack, database schema, API endpoints, file structure
