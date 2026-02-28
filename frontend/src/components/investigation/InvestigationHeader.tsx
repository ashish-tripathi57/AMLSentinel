import { Link } from 'react-router-dom';
import { FileDown } from 'lucide-react';
import { Badge } from '../common';
import type { Alert } from '../../types/alert';

// Mirror of the Badge variant union — kept here to avoid coupling to Badge internals.
type StatusBadgeVariant = 'new' | 'in-progress' | 'review' | 'escalated' | 'closed';

interface InvestigationHeaderProps {
  alert: Alert;
}

/** Maps an alert status string to its Badge variant. */
function statusToBadgeVariant(status: string): StatusBadgeVariant {
  const mapping: Record<string, StatusBadgeVariant> = {
    New: 'new',
    'In Progress': 'in-progress',
    Review: 'review',
    Closed: 'closed',
    Escalated: 'escalated',
  };
  return mapping[status] ?? 'new';
}

/**
 * Returns Tailwind text/background classes for the risk score chip.
 *
 * Thresholds:
 *  ≥ 80 → red (critical)
 *  ≥ 60 → orange (high)
 *  ≥ 40 → yellow (medium)
 *  < 40 → green (low)
 */
function riskScoreColorClasses(score: number): string {
  if (score >= 80) return 'bg-severity-critical/10 text-severity-critical';
  if (score >= 60) return 'bg-severity-high/10 text-severity-high';
  if (score >= 40) return 'bg-severity-medium/10 text-severity-medium';
  return 'bg-severity-low/10 text-severity-low';
}

/**
 * Header bar for the Investigation page.
 *
 * Displays:
 *  - Breadcrumb: Alert Queue > {alert_id}
 *  - Back button (← to alert queue)
 *  - Alert ID monospace badge, title, typology badge, status badge, risk score chip
 */
export function InvestigationHeader({ alert }: InvestigationHeaderProps) {
  const riskColorClasses = riskScoreColorClasses(alert.risk_score);

  return (
    <div className="bg-card-bg border-b border-card-border">
      {/* Breadcrumb */}
      <div className="px-6 pt-4 pb-1 flex items-center gap-1.5 text-xs text-text-muted">
        <Link to="/" className="hover:text-text-secondary transition-colors">
          Alert Queue
        </Link>
        <span aria-hidden="true">&gt;</span>
        <span className="text-text-secondary font-medium">{alert.alert_id}</span>
      </div>

      {/* Main header row */}
      <div className="px-6 pb-4 flex items-start gap-4">
        {/* Back button */}
        <Link
          to="/"
          aria-label="Back to alert queue"
          className="mt-0.5 flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors shrink-0"
        >
          <span aria-hidden="true">&#8592;</span>
          <span>Back</span>
        </Link>

        {/* Alert identity */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Alert ID — monospace badge */}
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-page-bg border border-card-border text-xs font-mono text-text-secondary">
            {alert.alert_id}
          </span>

          {/* Title */}
          <h1 className="text-base font-semibold text-text-primary truncate">
            {alert.title}
          </h1>

          {/* Typology */}
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-page-bg border border-card-border text-xs text-text-secondary">
            {alert.typology}
          </span>

          {/* Status badge */}
          <Badge variant={statusToBadgeVariant(alert.status)}>{alert.status}</Badge>

          {/* Risk score chip */}
          <span
            aria-label={`Risk score: ${alert.risk_score}`}
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${riskColorClasses}`}
          >
            Risk {alert.risk_score}
          </span>

          {/* Resolution badge — only shown for closed alerts */}
          {alert.status === 'Closed' && alert.resolution && (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-medium">
              {alert.resolution}
            </span>
          )}
        </div>

        {/* Export button — right-aligned */}
        <div className="ml-auto shrink-0">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary border border-card-border rounded-md hover:bg-page-bg transition-colors"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export Case File
          </button>
        </div>
      </div>
    </div>
  );
}
