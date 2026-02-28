import { apiClient } from './api-client';
import type { Alert, AlertsResponse, AlertStats, AlertFilters } from '../types/alert';

function buildQueryString(filters: AlertFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const alertService = {
  getAlerts: (filters: AlertFilters = {}) =>
    apiClient.get<AlertsResponse>(`/alerts${buildQueryString(filters)}`),

  getAlertById: (id: string) =>
    apiClient.get<Alert>(`/alerts/${id}`),

  getAlertByAlertId: (alertId: string) =>
    apiClient.get<Alert>(`/alerts/by-alert-id/${alertId}`),

  updateStatus: (id: string, status: string, rationale: string, analyst: string, resolution?: string) =>
    apiClient.patch<Alert>(
      `/alerts/${id}/status?analyst_username=${encodeURIComponent(analyst)}`,
      { status, rationale, ...(resolution ? { resolution } : {}) }
    ),

  getStats: () =>
    apiClient.get<AlertStats>('/alerts/stats'),
};
