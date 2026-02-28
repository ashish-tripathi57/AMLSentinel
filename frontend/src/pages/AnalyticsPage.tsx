import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import {
  AnalyticsSummaryCards,
  TypologyBarChart,
  ResolutionDonutChart,
  RiskDistributionChart,
  AlertVolumeTrendChart,
  FalsePositiveTrendChart,
} from '../components/analytics';
import { useAnalytics } from '../hooks/use-analytics';

/**
 * Analytics Dashboard page — displays AML compliance metrics and trends.
 * Composes summary cards at the top with five chart panels in a two-column grid.
 */
export function AnalyticsPage() {
  const {
    overview,
    typologyData,
    resolutionData,
    riskDistribution,
    volumeTrend,
    fpTrend,
    isLoading,
    error,
  } = useAnalytics();

  if (isLoading) {
    return (
      <div className="p-6 min-h-full bg-page-bg">
        <div className="py-16">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 min-h-full bg-page-bg">
        <div className="py-16">
          <EmptyState title="Failed to load analytics" description={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-full bg-page-bg">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Analytics Dashboard</h1>
        <p className="text-xs text-text-secondary mt-0.5">
          AML compliance metrics and trends
        </p>
      </div>

      {/* Summary cards — full width */}
      <AnalyticsSummaryCards overview={overview} />

      {/* Charts — two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TypologyBarChart data={typologyData} />
        <ResolutionDonutChart data={resolutionData} />
        <RiskDistributionChart data={riskDistribution} />
        <AlertVolumeTrendChart data={volumeTrend} />
        <FalsePositiveTrendChart data={fpTrend} />
      </div>
    </div>
  );
}
