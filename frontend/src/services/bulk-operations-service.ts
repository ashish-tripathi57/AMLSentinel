import { apiClient } from './api-client';
import type { BulkCloseResult, FalsePositiveDetectionResult } from '../types/alert';

export const bulkOperationsService = {
  bulkClose: (
    alertIds: string[],
    resolution: string,
    rationale: string,
    analystUsername: string
  ) =>
    apiClient.post<BulkCloseResult>(
      `/alerts/bulk-close?analyst_username=${encodeURIComponent(analystUsername)}`,
      { alert_ids: alertIds, resolution, rationale }
    ),

  detectFalsePositives: (alertIds: string[]) =>
    apiClient.post<FalsePositiveDetectionResult>(
      '/alerts/detect-false-positives',
      { alert_ids: alertIds }
    ),
};
