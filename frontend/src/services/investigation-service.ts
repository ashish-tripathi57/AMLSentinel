import { apiClient } from './api-client';
import type { Customer } from '../types/customer';
import type { Transaction } from '../types/transaction';
import type {
  InvestigationNote,
  ChecklistItem,
  AuditTrailEntry,
  NetworkGraph,
  SARDraft,
  SimilarCase,
} from '../types/investigation';

export const investigationService = {
  getCustomer: (alertId: string) =>
    apiClient.get<Customer>(`/alerts/${alertId}/customer`),

  getTransactions: (alertId: string) =>
    apiClient.get<Transaction[]>(`/alerts/${alertId}/transactions`),

  getNetwork: (alertId: string) =>
    apiClient.get<NetworkGraph>(`/alerts/${alertId}/network`),

  getNotes: (alertId: string) =>
    apiClient.get<InvestigationNote[]>(`/alerts/${alertId}/notes`),

  createNote: (alertId: string, content: string, analyst: string) =>
    apiClient.post<InvestigationNote>(
      `/alerts/${alertId}/notes?analyst_username=${encodeURIComponent(analyst)}`,
      { content }
    ),

  getChecklist: (alertId: string) =>
    apiClient.get<ChecklistItem[]>(`/alerts/${alertId}/checklist`),

  updateChecklistItem: (alertId: string, itemId: string, isChecked: boolean, checkedBy: string, aiRationale?: string) =>
    apiClient.patch<ChecklistItem>(
      `/alerts/${alertId}/checklist/${itemId}`,
      { is_checked: isChecked, checked_by: checkedBy, ai_rationale: aiRationale ?? null }
    ),

  getAuditTrail: (alertId: string, action?: string) => {
    const params = action ? `?action=${encodeURIComponent(action)}` : '';
    return apiClient.get<AuditTrailEntry[]>(`/alerts/${alertId}/audit-trail${params}`);
  },

  autoCheckItem: (alertId: string, itemId: string) =>
    apiClient.post<{ is_checked: boolean; rationale: string }>(
      `/alerts/${alertId}/checklist/${itemId}/auto-check`,
      {}
    ),

  generateSAR: (alertId: string, analyst: string) =>
    apiClient.post<SARDraft>(
      `/alerts/${alertId}/sar/generate?analyst_username=${encodeURIComponent(analyst)}`,
      {}
    ),

  getSARDrafts: (alertId: string) =>
    apiClient.get<SARDraft[]>(`/alerts/${alertId}/sar`),

  updateSARDraft: (alertId: string, draftId: string, sections: Partial<Pick<SARDraft, 'subject_info' | 'activity_description' | 'narrative' | 'reason_for_suspicion' | 'action_taken'>>) =>
    apiClient.patch<SARDraft>(`/alerts/${alertId}/sar/${draftId}`, sections),

  getSimilarCases: (alertId: string) =>
    apiClient.get<SimilarCase[]>(`/alerts/${alertId}/similar-cases`),
};
