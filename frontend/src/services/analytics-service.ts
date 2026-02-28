import { apiClient } from './api-client';
import type {
  AnalyticsOverview,
  TypologyBreakdown,
  ResolutionBreakdown,
  RiskScoreBucket,
  AlertVolumeTrend,
  FalsePositiveTrend,
} from '../types/analytics';

export const analyticsService = {
  getOverview: () =>
    apiClient.get<AnalyticsOverview>('/analytics/overview'),

  getAlertsByTypology: () =>
    apiClient.get<TypologyBreakdown[]>('/analytics/alerts-by-typology'),

  getResolutionBreakdown: () =>
    apiClient.get<ResolutionBreakdown[]>('/analytics/resolution-breakdown'),

  getRiskDistribution: () =>
    apiClient.get<RiskScoreBucket[]>('/analytics/risk-distribution'),

  getAlertVolumeTrend: (days: number = 30) =>
    apiClient.get<AlertVolumeTrend[]>(`/analytics/alert-volume-trend?days=${days}`),

  getFalsePositiveTrend: (days: number = 90) =>
    apiClient.get<FalsePositiveTrend[]>(`/analytics/false-positive-trend?days=${days}`),
};
