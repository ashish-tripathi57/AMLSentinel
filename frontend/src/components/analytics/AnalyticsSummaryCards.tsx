import type { AnalyticsOverview } from '../../types/analytics';

interface AnalyticsSummaryCardsProps {
  overview: AnalyticsOverview | null;
}

/**
 * Four stat cards summarizing key analytics metrics.
 * Renders a responsive grid of metric cards with labels and values.
 */
export function AnalyticsSummaryCards({ overview }: AnalyticsSummaryCardsProps) {
  const cards = [
    { label: 'Total Alerts', value: overview?.total_alerts ?? '—' },
    { label: 'Open Alerts', value: overview?.open_alerts ?? '—' },
    { label: 'Avg Investigation (days)', value: overview?.average_investigation_days ?? '—' },
    { label: 'False Positive Rate', value: overview?.false_positive_rate != null ? `${(overview.false_positive_rate * 100).toFixed(1)}%` : '—' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="analytics-summary-cards">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card-bg border border-card-border rounded-xl p-4 shadow-sm"
        >
          <p className="text-xs text-text-muted font-medium">{card.label}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
