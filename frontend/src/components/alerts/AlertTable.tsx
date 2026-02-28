import { useNavigate } from 'react-router-dom';
import { formatRelativeWithDate } from '../../utils/format-date';
import type { Alert } from '../../types/alert';
import type { SortState } from '../../hooks/use-alerts';

// ---------------------------------------------------------------------------
// Column configuration
// ---------------------------------------------------------------------------

interface ColumnDef {
  key: string;
  label: string;
  sortable: boolean;
  className: string;
}

const COLUMNS: ColumnDef[] = [
  { key: 'alert_id',         label: 'Name',        sortable: true,  className: 'w-36' },
  { key: 'risk_score',       label: 'Risk Score',   sortable: true,  className: 'w-32' },
  { key: 'title',            label: 'Alerts',       sortable: true,  className: 'min-w-0 flex-1' },
  { key: 'assigned_analyst', label: 'Assignee',     sortable: false, className: 'w-40' },
  { key: 'status',           label: 'Status',       sortable: true,  className: 'w-28' },
  { key: 'triggered_date',   label: 'Created',      sortable: true,  className: 'w-44' },
];

// ---------------------------------------------------------------------------
// Risk score bar — displays as "XX/100" with a colored progress bar
// ---------------------------------------------------------------------------

function getRiskBarColor(score: number): string {
  if (score >= 80) return 'bg-severity-critical';
  if (score >= 60) return 'bg-severity-high';
  if (score >= 40) return 'bg-severity-medium';
  return 'bg-severity-low';
}

interface RiskScoreCellProps {
  score: number;
}

function RiskScoreCell({ score }: RiskScoreCellProps) {
  const barColor = getRiskBarColor(score);

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-card-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${score}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="text-xs font-mono text-text-primary">{score}/100</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge with colored dot — matches Verilix pattern
// ---------------------------------------------------------------------------

interface StatusDotConfig {
  dotColor: string;
  bgColor: string;
  textColor: string;
}

const STATUS_DOT_MAP: Record<string, StatusDotConfig> = {
  New:           { dotColor: 'bg-status-new',         bgColor: 'bg-status-new/10',         textColor: 'text-status-new' },
  'In Progress': { dotColor: 'bg-status-in-progress', bgColor: 'bg-status-in-progress/10', textColor: 'text-status-in-progress' },
  Review:        { dotColor: 'bg-status-review',       bgColor: 'bg-status-review/10',       textColor: 'text-status-review' },
  Escalated:     { dotColor: 'bg-status-escalated',    bgColor: 'bg-status-escalated/10',    textColor: 'text-status-escalated' },
  Closed:        { dotColor: 'bg-status-closed',       bgColor: 'bg-status-closed/10',       textColor: 'text-status-closed' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_DOT_MAP[status];
  if (!config) {
    return <span className="text-xs text-text-muted">{status}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      <span className={`w-2 h-2 rounded-full ${config.dotColor}`} aria-hidden="true" />
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Avatar with initials — gives each analyst a color-coded circle
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  'bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4',
  'bg-chart-5', 'bg-chart-6', 'bg-chart-7', 'bg-chart-8',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.split(/[.\-_\s]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function AssigneeCell({ analyst }: { analyst: string | null }) {
  if (!analyst) {
    return <span className="text-text-muted italic text-xs">Unassigned</span>;
  }

  const initials = getInitials(analyst);
  const avatarColor = getAvatarColor(analyst);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full ${avatarColor} flex items-center justify-center text-white text-[10px] font-semibold shrink-0`}
        aria-hidden="true"
      >
        {initials}
      </div>
      <span className="text-xs text-text-primary truncate">{analyst}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typology badge colors
// ---------------------------------------------------------------------------

const TYPOLOGY_COLORS: Record<string, string> = {
  Structuring:     'bg-chart-1/10 text-chart-1',
  Layering:        'bg-chart-2/10 text-chart-2',
  'Round Tripping': 'bg-chart-3/10 text-chart-3',
  'Shell Company': 'bg-chart-4/10 text-chart-4',
  'Trade Based':   'bg-chart-5/10 text-chart-5',
  'Cash Intensive': 'bg-chart-7/10 text-chart-7',
};

function getTypologyClasses(typology: string): string {
  return TYPOLOGY_COLORS[typology] ?? 'bg-chart-8/10 text-chart-8';
}

// ---------------------------------------------------------------------------
// Sort indicator icon
// ---------------------------------------------------------------------------

interface SortIconProps {
  columnKey: string;
  currentSort: SortState;
}

function SortIcon({ columnKey, currentSort }: SortIconProps) {
  const isActive = currentSort.sort_by === columnKey;

  if (!isActive) {
    return <span className="ml-1 text-text-muted opacity-40" aria-hidden="true">{'\u21C5'}</span>;
  }

  return (
    <span className="ml-1 text-primary" aria-hidden="true">
      {currentSort.sort_order === 'asc' ? '\u2191' : '\u2193'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface AlertTableProps {
  alerts: Alert[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

/**
 * Dense Datadog/Verilix-style sortable alert queue table.
 * Features: checkbox selection, risk bars (XX/100), colored-dot status badges,
 * avatar assignees, and relative+absolute date display.
 */
export function AlertTable({
  alerts,
  sort,
  onSortChange,
  selectedIds,
  onSelectionChange,
}: AlertTableProps) {
  const navigate = useNavigate();

  const allSelected = alerts.length > 0 && alerts.every((a) => selectedIds.has(a.id));

  function handleColumnSort(columnKey: string) {
    const isSameColumn = sort.sort_by === columnKey;
    onSortChange({
      sort_by: columnKey,
      sort_order: isSameColumn && sort.sort_order === 'asc' ? 'desc' : 'asc',
    });
  }

  function handleRowClick(alert: Alert) {
    navigate(`/investigation/${alert.id}`);
  }

  function handleRowKeyDown(e: React.KeyboardEvent, alert: Alert) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/investigation/${alert.id}`);
    }
  }

  function handleSelectAll() {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(alerts.map((a) => a.id)));
    }
  }

  function handleSelectRow(e: React.MouseEvent, alertId: string) {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(alertId)) {
      next.delete(alertId);
    } else {
      next.add(alertId);
    }
    onSelectionChange(next);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse" role="grid" aria-label="Alert queue">
        <thead>
          <tr className="border-b border-card-border">
            {/* Select-all checkbox */}
            <th scope="col" className="w-10 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                aria-label="Select all alerts"
                className="rounded border-card-border text-primary focus:ring-primary cursor-pointer"
              />
            </th>

            {COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`
                  px-3 py-2 text-left font-semibold text-text-secondary uppercase tracking-wider
                  whitespace-nowrap select-none
                  ${col.sortable ? 'cursor-pointer hover:text-text-primary' : ''}
                  ${col.className}
                `}
                onClick={col.sortable ? () => handleColumnSort(col.key) : undefined}
                aria-sort={
                  sort.sort_by === col.key
                    ? sort.sort_order === 'asc' ? 'ascending' : 'descending'
                    : col.sortable ? 'none' : undefined
                }
              >
                {col.label}
                {col.sortable && <SortIcon columnKey={col.key} currentSort={sort} />}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {alerts.map((alert, index) => {
            const isEvenRow = index % 2 === 0;
            const isSelected = selectedIds.has(alert.id);
            const { relative, absolute } = formatRelativeWithDate(alert.triggered_date);

            return (
              <tr
                key={alert.id}
                onClick={() => handleRowClick(alert)}
                onKeyDown={(e) => handleRowKeyDown(e, alert)}
                tabIndex={0}
                role="row"
                aria-label={`Alert ${alert.alert_id}: ${alert.title}`}
                className={`
                  border-b border-card-border last:border-b-0
                  cursor-pointer transition-colors
                  hover:bg-primary/5 focus:outline-none focus:bg-primary/5
                  ${isSelected ? 'bg-primary/5' : isEvenRow ? 'bg-card-bg' : 'bg-page-bg'}
                `}
              >
                {/* Row checkbox */}
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {/* handled by onClick */}}
                    onClick={(e) => handleSelectRow(e, alert.id)}
                    aria-label={`Select alert ${alert.alert_id}`}
                    className="rounded border-card-border text-primary focus:ring-primary cursor-pointer"
                  />
                </td>

                {/* Name (Alert ID + typology badge) */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-text-primary">{alert.alert_id}</span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getTypologyClasses(alert.typology)}`}
                    >
                      {alert.typology}
                    </span>
                  </div>
                </td>

                {/* Risk score bar + XX/100 */}
                <td className="px-3 py-2">
                  <RiskScoreCell score={alert.risk_score} />
                </td>

                {/* Alerts (title) */}
                <td className="px-3 py-2 max-w-xs">
                  <span className="text-text-primary leading-snug line-clamp-1">
                    {alert.title}
                  </span>
                </td>

                {/* Assignee with avatar */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <AssigneeCell analyst={alert.assigned_analyst} />
                </td>

                {/* Status — colored dot badge */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <StatusBadge status={alert.status} />
                </td>

                {/* Created — relative time + absolute date */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="text-text-secondary text-xs">
                    {relative}
                    {absolute && (
                      <span className="text-text-muted ml-1">{absolute}</span>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
