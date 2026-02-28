export interface AnalyticsOverview {
  total_alerts: number;
  open_alerts: number;
  closed_alerts: number;
  average_investigation_days: number;
  false_positive_rate: number;
}

export interface TypologyBreakdown {
  typology: string;
  count: number;
}

export interface ResolutionBreakdown {
  resolution: string;
  count: number;
}

export interface RiskScoreBucket {
  range: string;
  count: number;
}

export interface AlertVolumeTrend {
  date: string;
  count: number;
}

export interface FalsePositiveTrend {
  week: string;
  total_closed: number;
  false_positive_count: number;
  rate: number;
}
