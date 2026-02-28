import type { AlertStats } from '../../types/alert';

interface AlertStatsBarProps {
  stats: AlertStats | null;
}

interface StatCardProps {
  label: string;
  value: number | string;
  valueClassName?: string;
}

function StatCard({ label, value, valueClassName = 'text-text-primary' }: StatCardProps) {
  return (
    <div className="bg-card-bg border border-card-border rounded-lg px-4 py-3 flex items-center gap-3">
      <div>
        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-semibold font-mono mt-0.5 ${valueClassName}`}>{value}</p>
      </div>
    </div>
  );
}

/**
 * Compact horizontal stats bar displayed at the top of the Alert Queue page.
 * Shows total alerts, open alerts, and high-risk count.
 */
export function AlertStatsBar({ stats }: AlertStatsBarProps) {
  if (!stats) {
    return (
      <div className="flex gap-3" aria-label="Alert statistics loading">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card-bg border border-card-border rounded-lg px-4 py-3 w-36 h-16 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 flex-wrap" role="region" aria-label="Alert statistics">
      <StatCard label="Total Alerts" value={stats.total_alerts} />
      <StatCard
        label="Open Alerts"
        value={stats.open_alerts}
        valueClassName="text-status-new"
      />
      <StatCard
        label="High Risk"
        value={stats.high_risk_count}
        valueClassName="text-severity-critical"
      />
    </div>
  );
}
