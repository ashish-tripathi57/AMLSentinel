import { useState } from 'react';
import { useAuditTrail } from '../../hooks/use-audit-trail';
import { Card, CardHeader, CardContent, LoadingSpinner, EmptyState } from '../common';
import { formatDate } from '../../utils/format-date';

interface AuditTrailProps {
  alertId: string;
}

/** Maps action strings to colour classes for the action badge. */
function actionBadgeClasses(action: string): string {
  const normalised = action.toLowerCase();
  if (normalised.includes('escalat')) return 'bg-severity-critical/10 text-severity-critical';
  if (normalised.includes('status')) return 'bg-status-in-progress/10 text-status-in-progress';
  if (normalised.includes('note')) return 'bg-primary/10 text-primary';
  if (normalised.includes('checklist')) return 'bg-status-review/10 text-status-review';
  if (normalised.includes('sar')) return 'bg-chart-5/10 text-chart-5';
  return 'bg-text-muted/10 text-text-muted';
}

/** Unique action types extracted from the entries for filter dropdown. */
function extractActionTypes(entries: { action: string }[]): string[] {
  return [...new Set(entries.map((e) => e.action))].sort();
}

/**
 * Displays a chronological audit trail log for an alert, with optional action
 * type filtering. Shows who performed each action and when.
 */
export function AuditTrail({ alertId }: AuditTrailProps) {
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);
  const { entries, isLoading, error } = useAuditTrail(alertId, actionFilter);

  // For the filter dropdown we need all entries (unfiltered) to extract action types.
  // Since the hook is called with the filter, we store filter options from when filter is undefined.
  const { entries: allEntries } = useAuditTrail(alertId);
  const actionTypes = extractActionTypes(allEntries);

  if (isLoading) {
    return (
      <div role="tabpanel" id="tabpanel-audit-trail" aria-label="Audit Trail" className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="tabpanel" id="tabpanel-audit-trail" aria-label="Audit Trail" className="p-6">
        <EmptyState title="Failed to load audit trail" description={error} />
      </div>
    );
  }

  return (
    <div role="tabpanel" id="tabpanel-audit-trail" aria-label="Audit Trail" className="p-6 space-y-4">
      {/* Filter bar */}
      {actionTypes.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="action-filter" className="text-xs font-medium text-text-secondary">
            Filter by action:
          </label>
          <select
            id="action-filter"
            value={actionFilter ?? ''}
            onChange={(e) => setActionFilter(e.target.value || undefined)}
            className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">All actions</option>
            {actionTypes.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Trail entries */}
      {entries.length === 0 ? (
        <EmptyState title="No audit trail entries" description="No actions have been recorded for this alert yet." />
      ) : (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-text-primary">
              Audit Trail ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
            </h3>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-card-border">
              {entries.map((entry) => (
                <li key={entry.id} className="px-4 py-3 flex items-start gap-3">
                  {/* Timeline dot */}
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionBadgeClasses(entry.action)}`}
                      >
                        {entry.action}
                      </span>
                      <span className="text-xs font-medium text-text-secondary">{entry.performed_by}</span>
                      <time className="text-xs text-text-muted ml-auto">{formatDate(entry.created_at)}</time>
                    </div>
                    {entry.details && (
                      <p className="mt-1 text-sm text-text-secondary">{entry.details}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
