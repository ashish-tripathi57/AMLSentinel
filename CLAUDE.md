# CLAUDE.md

Asana Workflow: Always Build a project plan with tasks mapped to category sections Ensure an asana task exists before beginning to work on a particular task. Use Asana MCP; request the project URL first. Create tasks only after plan approval. Update all fields and include a parallel group field upon task completion which indicates grouping of tasks within same category for parallel run.

Parallel Execution: Always evaluate and utilize sub-agents to run independent tasks in parallel to optimize speed. Suggest in your project plan which ones can be run independently clearly larifying dependencies if any.

Testing Standards:  Strictly follow TDD with 100% code coverage. When making an enhancement in existing code, always run regression test suites. Always use the actual components which will be used in application instesd of mockups and passing the tests. If running with mock data explicitly ask the user for approval. 

Dev Standards: Avoid over-engineering; discuss the approach with the user as necessary. Code quality — write as if a senior engineer reviews this PR tomorrow hence the code should be easy to read and understandable for humans, use Meaningful variable names (leverage domain driven design industry standards), add comments/hints as necessary, do not leave any dead code, any commented-out blocks, or any unresolved TODOs, add a README.md with setup instructions, architecture overview, API endpoints, how to run tests, use proper folder structures and group codebase based on domain driven design standards as applicable.

Strictly follow the guidelines for UI design as provided by the user, if you are deviating or assuming anything regarding the same, ask the user before proceeding and call it out exclusively.

Use Chrome MCP for UI validation, but always ask the user if they want to handle the UI testing for particular task/category or if you should.

Never assume. Ask clarifying questions if any doubt arises.

Core Documentation: At project start create  architecture.md (high-level design), and technical-architecture.md (technical details). Use Mermaid diagrams in architecture files.

Ask user whenever there is change in architecture if they want you to update the architecture.md and technical-architecture.md files. 

When using sub-agents please ensure they aren't referring any other project directory by mistake in workspace.

---

# AML Sentinel — UI Design System & Standards

## Datadog Design Philosophy (7 Patterns)

1. **Data-dense investigation workbench** — Information-rich panels optimized for analysts
2. **Dark sidebar navigation** — Fixed left sidebar with primary navigation
3. **Tabs within detail views** — Multi-tab tabbed panels for investigation data
4. **Compact information panels** — Sophisticated but functional layout
5. **Tool for power users** — Designed for analysts who live in it 8 hours a day
6. **Functional over decorative** — Every element serves the investigation workflow
7. **Dark theme with strategic color accents** — Professional, data-focused aesthetic

## Design Tokens

### Typography
- **Font Family:** Inter (Google Fonts) — ALL text must render in Inter

### Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Sidebar BG | `#0F172A` | Dark navy sidebar background |
| Primary Blue | `#2563EB` | Buttons, links, active states, primary actions |
| Page BG | `#F8FAFC` | Light gray page background |
| Card BG | `#FFFFFF` | White cards with `border-gray-200` |

### Chart Color Palette (8 colors, in order)
```
#2563EB (Blue), #7C3AED (Purple), #059669 (Green), #D97706 (Amber),
#DC2626 (Red), #0891B2 (Cyan), #4F46E5 (Indigo), #CA8A04 (Yellow)
```

### Severity Badge Classes
| Level | Classes |
|-------|---------|
| Critical | `bg-red-100 text-red-800 rounded-full` |
| High | `bg-orange-100 text-orange-800 rounded-full` |
| Medium | `bg-amber-100 text-amber-800 rounded-full` |
| Low | `bg-emerald-100 text-emerald-800 rounded-full` |

### Status Badge Classes
| Status | Classes |
|--------|---------|
| New | `bg-blue-100 text-blue-800` |
| In Progress | `bg-purple-100 text-purple-800` |
| Done | `bg-emerald-100 text-emerald-800` |
| Rejected | `bg-red-100 text-red-800` |
| Review | `bg-amber-100 text-amber-800` |

### Layout Specifications
- **Sidebar:** Fixed left, 240px wide, `bg-[#0F172A]`, header "AML Sentinel" with icon, nav links, login
- **Cards:** White, `rounded-xl`, `shadow-sm`, `border border-gray-200`
- **Tables:** Compact Datadog-style density, sortable, row-click navigation
- **Footer:** "Built with G.U.I.D.E.™ Framework" in `text-gray-400`

### Data Formatting
- **Currency:** Indian Rupees (₹) — INR formatting
- **Risk scores:** 0–100 scale
- **Dates:** Standard formatting

## UI Deviation Rule
**MANDATORY:** If deviating from or assuming anything about these design tokens, patterns, or layout specs, you MUST ask the user before proceeding and call it out exclusively. Never assume.

---

# Code Quality Standards

## Python (Backend)
- Meaningful variable names using AML/banking domain terminology
- Domain-driven design folder structure: `core/`, `models/`, `schemas/`, `repositories/`, `services/`, `routes/`
- Type hints on all function signatures
- Comments only where logic isn't self-evident
- No dead code, no commented-out blocks, no unresolved TODOs
- Async/await throughout (aiosqlite, async SQLAlchemy)
- Pydantic schemas for all API request/response models

## React/TypeScript (Frontend)
- Meaningful variable names using AML/investigation domain terminology
- Domain-driven component grouping: `common/`, `layout/`, `alerts/`, `investigation/`
- TypeScript strict mode — no `any` types
- Custom hooks for data fetching (`use-alerts`, `use-chat`, etc.)
- Tailwind CSS only — no inline styles, no CSS modules
- Components: functional with proper prop typing

## TDD Requirements
- Write tests FIRST, then implementation
- 100% code coverage on both backend and frontend
- Backend: pytest with async support, real Claude API for AI tests (no mocks for AI layer)
- Frontend: Vitest + React Testing Library
- Run regression suites when modifying existing code

## File Structure Conventions
```
backend/api/
  core/       — config, database, dependencies, auth
  models/     — SQLAlchemy models (one per domain entity)
  schemas/    — Pydantic schemas (one per domain entity + common)
  repositories/ — async CRUD (one per domain entity)
  services/   — business logic (alert, investigation, ai, chat, sar, pdf)
  routes/     — FastAPI routers (one per domain)
  seed/       — synthetic data seeders per typology
  tests/      — mirrors source structure (test_models/, test_routes/, etc.)

frontend/src/
  types/      — TypeScript interfaces per domain
  services/   — API client and domain services
  hooks/      — Custom React hooks per domain
  components/ — Domain-grouped: common/, layout/, alerts/, investigation/
  pages/      — Page-level components (AlertQueuePage, InvestigationPage)
  utils/      — Formatters, constants, config
```
