# AML Sentinel — Frontend

React 19 + TypeScript frontend for the AML Sentinel investigation workbench. Organized following **Domain-Driven Design (DDD)** principles — components, hooks, services, and types are grouped by AML domain boundaries (alerts, investigation, analytics) rather than generic technical categories.

## Setup

```bash
npm install
npm run dev
```

The dev server starts at http://localhost:5174 and proxies API requests to the backend at http://localhost:8001.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run test` | Run all tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Testing

692 tests across 39+ test files using Vitest and React Testing Library.

```bash
npx vitest run           # Run all tests
npx vitest run --coverage  # With coverage report
```

## Folder Structure (Domain-Driven Design)

Components, hooks, and services are organized around AML domain concepts — each domain (alerts, investigation, analytics) owns its own folder with all related code co-located.

```
src/
├── components/          # Domain-grouped UI components
│   ├── common/          # Badge, Card, EmptyState, LoadingSpinner
│   ├── layout/          # AppShell (sidebar + main content area)
│   ├── alerts/          # AlertTable, AlertFilters, AlertStatsBar, AlertQueueTabs,
│   │                    # BulkActionBar, NumberedPagination, BulkCloseModal,
│   │                    # FalsePositiveSuggestions
│   ├── investigation/   # CustomerProfile, TransactionTimeline, PatternAnalysis,
│   │                    # NetworkGraph, InvestigationChat, Checklist, AnalystNotes,
│   │                    # AuditTrail, StatusTransition, SAREditor,
│   │                    # InvestigationIconSidebar, InvestigationHeader, SimilarCases
│   └── analytics/       # AnalyticsSummaryCards, TypologyBarChart, ResolutionDonutChart,
│                        # RiskDistributionChart, AlertVolumeTrendChart, FalsePositiveTrendChart
├── hooks/               # Custom React hooks (one per domain concern)
│   ├── use-alerts.ts, use-alert-detail.ts, use-customer-profile.ts
│   ├── use-transactions.ts, use-pattern-analysis.ts, use-network-graph.ts
│   ├── use-chat.ts, use-checklist.ts, use-sar-drafts.ts
│   ├── use-notes.ts, use-audit-trail.ts
│   ├── use-analytics.ts, use-bulk-operations.ts
│   ├── use-similar-cases.ts, use-export.ts
├── services/            # API client and domain services
│   ├── api-client.ts, alert-service.ts, investigation-service.ts
│   ├── analytics-service.ts, bulk-operations-service.ts, export-service.ts
├── types/               # TypeScript interfaces per domain
├── pages/               # Route-level page components
│   ├── AlertQueuePage.tsx, InvestigationPage.tsx, AnalyticsPage.tsx
├── contexts/            # React contexts (InvestigationDrawerContext)
└── utils/               # Currency formatting, date formatting
```

## Design System

The UI follows Datadog-style design patterns defined in the project's `CLAUDE.md`:

- **Font:** Inter (Google Fonts)
- **Sidebar:** Fixed 240px, `#0F172A` dark navy
- **Primary color:** `#2563EB` blue
- **Cards:** White, `rounded-xl`, `shadow-sm`, `border-gray-200`
- **Currency:** Indian Rupees (INR)
- **Styling:** Tailwind CSS only — no inline styles or CSS modules
