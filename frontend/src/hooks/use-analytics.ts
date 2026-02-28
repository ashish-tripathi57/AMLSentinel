import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../services/analytics-service';
import type {
  AnalyticsOverview,
  TypologyBreakdown,
  ResolutionBreakdown,
  RiskScoreBucket,
  AlertVolumeTrend,
  FalsePositiveTrend,
} from '../types/analytics';

export interface UseAnalyticsReturn {
  overview: AnalyticsOverview | null;
  typologyData: TypologyBreakdown[];
  resolutionData: ResolutionBreakdown[];
  riskDistribution: RiskScoreBucket[];
  volumeTrend: AlertVolumeTrend[];
  fpTrend: FalsePositiveTrend[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches all analytics data (overview + chart breakdowns) on mount.
 * Returns loading/error state alongside the six data slices.
 */
export function useAnalytics(): UseAnalyticsReturn {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [typologyData, setTypologyData] = useState<TypologyBreakdown[]>([]);
  const [resolutionData, setResolutionData] = useState<ResolutionBreakdown[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<RiskScoreBucket[]>([]);
  const [volumeTrend, setVolumeTrend] = useState<AlertVolumeTrend[]>([]);
  const [fpTrend, setFpTrend] = useState<FalsePositiveTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        overviewData,
        typologyResult,
        resolutionResult,
        riskResult,
        volumeResult,
        fpResult,
      ] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getAlertsByTypology(),
        analyticsService.getResolutionBreakdown(),
        analyticsService.getRiskDistribution(),
        analyticsService.getAlertVolumeTrend(),
        analyticsService.getFalsePositiveTrend(),
      ]);

      setOverview(overviewData);
      setTypologyData(typologyResult);
      setResolutionData(resolutionResult);
      setRiskDistribution(riskResult);
      setVolumeTrend(volumeResult);
      setFpTrend(fpResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    overview,
    typologyData,
    resolutionData,
    riskDistribution,
    volumeTrend,
    fpTrend,
    isLoading,
    error,
  };
}
