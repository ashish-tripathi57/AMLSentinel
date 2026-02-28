export interface InvestigationNote {
  id: string;
  alert_id: string;
  analyst_username: string;
  content: string;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  alert_id: string;
  description: string;
  is_checked: boolean;
  checked_by: string | null;
  ai_rationale: string | null;
  sort_order: number;
}

export interface ChatMessage {
  id: string;
  alert_id: string;
  role: string;
  content: string;
  analyst_username: string | null;
  created_at: string;
}

export interface SARDraft {
  id: string;
  alert_id: string;
  version: number;
  subject_info: string | null;
  activity_description: string | null;
  narrative: string | null;
  reason_for_suspicion: string | null;
  action_taken: string | null;
  generated_by: string;
  created_at: string;
}

export interface AuditTrailEntry {
  id: string;
  alert_id: string;
  action: string;
  details: string | null;
  performed_by: string;
  created_at: string;
}

export interface NetworkNode {
  id: string;
  label: string;
  type: 'customer' | 'account' | 'counterparty';
  risk: string | null;
}

export interface NetworkEdge {
  source: string;
  target: string;
  amount: number;
  type: string;
  date: string;
  direction: string;
  counterparty: string;
}

export interface NetworkGraph {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface SimilarCase {
  id: string;
  alert_id: string;
  title: string;
  typology: string;
  risk_score: number;
  status: string;
  resolution: string | null;
  similarity_score: number;
  matching_factors: string[];
}
