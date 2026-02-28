export interface Alert {
  id: string;
  alert_id: string;
  customer_id: string;
  typology: string;
  risk_score: number;
  status: string;
  title: string;
  description: string | null;
  triggered_date: string;
  assigned_analyst: string | null;
  resolution: string | null;
  closed_at: string | null;
  total_flagged_amount: number | null;
  flagged_transaction_count: number;
}

export interface AlertsResponse {
  alerts: Alert[];
  total: number;
}

export interface AlertStats {
  total_alerts: number;
  open_alerts: number;
  high_risk_count: number;
  closed_count: number;
  unassigned_count: number;
}

export interface AlertFilters {
  typology?: string;
  status?: string;
  risk_min?: number;
  risk_max?: number;
  search?: string;
  resolution?: string;
  assigned_analyst?: string;
  sort_by?: string;
  sort_order?: string;
  offset?: number;
  limit?: number;
}

export interface BulkCloseResult {
  closed_count: number;
  failed_ids: string[];
}

export interface FalsePositiveResult {
  alert_id: string;
  alert_short_id: string;
  title: string;
  confidence: number;
  reasoning: string;
  suggested_resolution: string;
}

export interface FalsePositiveDetectionResult {
  results: FalsePositiveResult[];
  total_analyzed: number;
}
