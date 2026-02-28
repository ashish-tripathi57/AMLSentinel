const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';

/**
 * Helper to fetch a binary response as a Blob.
 * Throws a descriptive error on non-ok HTTP status.
 */
async function fetchBlob(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown,
): Promise<Blob> {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }
  return response.blob();
}

/**
 * Service for downloading exported files (PDF, CSV, ZIP) from the API.
 */
class ExportService {
  /** Download a comprehensive case file PDF for an alert. */
  downloadCaseFilePdf(alertId: string): Promise<Blob> {
    return fetchBlob(`/api/alerts/${alertId}/case-file/pdf`);
  }

  /** Download FIU-IND STR PDF for an alert. */
  downloadStrPdf(alertId: string): Promise<Blob> {
    return fetchBlob(`/api/alerts/${alertId}/str/pdf`);
  }

  /** Download analytics data as CSV. */
  downloadAnalyticsCsv(): Promise<Blob> {
    return fetchBlob('/api/analytics/export/csv');
  }

  /** Download a ZIP of multiple SAR PDFs. */
  downloadBulkSars(alertIds: string[]): Promise<Blob> {
    return fetchBlob('/api/sar/bulk-export', 'POST', { alert_ids: alertIds });
  }
}

export const exportService = new ExportService();
