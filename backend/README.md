# AML Sentinel — Backend

FastAPI backend for the AML Sentinel investigation platform. Organized following **Domain-Driven Design (DDD)** principles — each AML domain entity (alert, investigation, analytics, SAR) has its own model, schema, repository, service, and route module.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Create a `.env` file:

```env
GEMINI_API_KEY=your-gemini-api-key
DATABASE_URL=sqlite+aiosqlite:///./aml_sentinel.db
DEBUG=false
```

## Database Seeding

Seed the database with 20 synthetic AML alerts across 6 typologies:

```bash
python -m api.seed
```

This creates the SQLite database file and populates it with customers, accounts, transactions, alerts, and checklist templates.

## Running

```bash
uvicorn api.main:app --reload --port 8001
```

The API is available at http://localhost:8001. Interactive docs at http://localhost:8001/docs.

## Testing

249 tests using pytest with async support.

```bash
python -m pytest -v                              # Run all tests
python -m pytest --cov=api --cov-report=term-missing  # With coverage
```

AI-dependent services (chat, pattern analysis, SAR generation, checklist auto-check) are tested with the real Gemini API when `RUN_REAL_API_TESTS=1` is set.

## Folder Structure (Domain-Driven Design)

The backend follows a layered DDD architecture. Each domain entity flows through: **Model** (ORM) → **Schema** (validation) → **Repository** (persistence) → **Service** (business logic) → **Route** (HTTP handler).

```
api/
├── core/                # Infrastructure layer: config, database engine, auth
│   ├── config.py        # Pydantic settings (env-based)
│   ├── database.py      # Async engine + session factory
│   └── auth.py          # Basic auth with hardcoded analysts
├── models/              # SQLAlchemy ORM models
│   ├── base.py          # DeclarativeBase, UUID + Timestamp mixins
│   ├── customer.py, account.py, transaction.py
│   ├── alert.py         # Alert + alert_transactions junction
│   └── investigation.py # Note, ChecklistItem, ChatMessage, SARDraft, AuditTrail
├── schemas/             # Pydantic request/response schemas
│   ├── alert.py, analytics.py, auth.py
│   ├── customer.py, account.py, transaction.py
│   └── investigation.py
├── repositories/        # Async database access layer
│   ├── alert.py, analytics.py, customer.py
│   ├── investigation.py, transaction.py
├── services/            # Business logic and AI integration
│   ├── ai_client.py     # Gemini API wrapper
│   ├── chat.py          # SSE streaming chat
│   ├── sar_generator.py # AI SAR draft generation
│   ├── pdf_generator.py # SAR PDF export
│   ├── fiu_ind_generator.py    # FIU-IND STR PDF
│   ├── case_file_generator.py  # Investigation case file PDF
│   ├── bulk_export.py          # Bulk SAR/STR ZIP export
│   ├── similar_cases.py        # Similar case matching
│   ├── false_positive_detector.py  # AI false positive detection
│   ├── pattern_analysis.py     # AI pattern analysis
│   └── checklist_ai.py         # AI checklist auto-check
├── routes/              # FastAPI route handlers
│   ├── alerts.py        # /api/alerts/* (queue, stats, bulk close, FP detection)
│   ├── analytics.py     # /api/analytics/* (overview, charts, CSV export)
│   ├── auth.py          # /api/auth/* (login, logout, me)
│   ├── chat.py          # /api/alerts/{id}/chat (SSE)
│   ├── health.py        # /api/health
│   ├── investigation.py # /api/alerts/{id}/* (customer, transactions, network, notes, checklist, audit, similar cases, case file)
│   ├── pattern_analysis.py  # /api/alerts/{id}/pattern-analysis
│   └── sar.py           # /api/alerts/{id}/sar/*, /api/sar/bulk-export
├── seed/                # Synthetic data generation (6 typology seeders)
└── tests/               # 249 tests mirroring source structure
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Authenticate analyst |
| POST | /api/auth/logout | End session |
| GET | /api/auth/me | Current analyst profile |

### Alert Queue
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/alerts | Paginated, filterable alert list |
| GET | /api/alerts/stats | Queue summary statistics |
| GET | /api/alerts/{id} | Full alert detail |
| PATCH | /api/alerts/{id}/status | Update status with resolution |
| POST | /api/alerts/bulk-close | Bulk close alerts |
| POST | /api/alerts/detect-false-positives | AI false positive analysis |

### Investigation
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/alerts/{id}/customer | Customer profile with accounts |
| GET | /api/alerts/{id}/transactions | Transaction timeline |
| GET | /api/alerts/{id}/network | Network graph data |
| GET | /api/alerts/{id}/notes | Investigation notes |
| POST | /api/alerts/{id}/notes | Add investigation note |
| GET | /api/alerts/{id}/checklist | Checklist items |
| PATCH | /api/alerts/{id}/checklist/{item_id} | Update checklist item |
| POST | /api/alerts/{id}/checklist/{item_id}/auto-check | AI auto-check |
| GET | /api/alerts/{id}/audit-trail | Audit trail entries |
| GET | /api/alerts/{id}/similar-cases | Similar case matches |
| GET | /api/alerts/{id}/case-file/pdf | Download case file PDF |

### AI Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/alerts/{id}/chat | SSE streaming chat |

### Pattern Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/alerts/{id}/pattern-analysis | AI pattern analysis |

### SAR / STR
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/alerts/{id}/sar/generate | Generate AI SAR draft |
| GET | /api/alerts/{id}/sar | List SAR drafts |
| PATCH | /api/alerts/{id}/sar/{draft_id} | Edit SAR draft |
| GET | /api/alerts/{id}/sar/{draft_id}/pdf | Download SAR PDF |
| GET | /api/alerts/{id}/str/pdf | Download FIU-IND STR PDF |
| POST | /api/sar/bulk-export | Bulk STR PDF ZIP export |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/overview | Dashboard summary stats |
| GET | /api/analytics/alerts-by-typology | Typology distribution |
| GET | /api/analytics/resolution-breakdown | Resolution outcomes |
| GET | /api/analytics/risk-distribution | Risk score buckets |
| GET | /api/analytics/alert-volume-trend | Daily alert volume |
| GET | /api/analytics/false-positive-trend | Weekly FP rates |
| GET | /api/analytics/export/csv | Download analytics CSV |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
