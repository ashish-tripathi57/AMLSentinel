import { useState, useCallback } from 'react';
import { exportService } from '../services/export-service';

export interface UseExportReturn {
  isExporting: boolean;
  exportError: string | null;
  exportCaseFilePdf: (alertId: string) => Promise<void>;
  exportStrPdf: (alertId: string) => Promise<void>;
  exportAnalyticsCsv: () => Promise<void>;
  exportBulkSars: (alertIds: string[]) => Promise<void>;
}

/**
 * Hook wrapping the export service with loading state and browser download trigger.
 * Creates a temporary anchor element to initiate the file download.
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const downloadFile = useCallback(async (fetchFn: () => Promise<Blob>, filename: string) => {
    setIsExporting(true);
    setExportError(null);
    try {
      const blob = await fetchFn();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportCaseFilePdf = useCallback(
    (alertId: string) => downloadFile(() => exportService.downloadCaseFilePdf(alertId), `case-file-${alertId}.pdf`),
    [downloadFile],
  );

  const exportStrPdf = useCallback(
    (alertId: string) => downloadFile(() => exportService.downloadStrPdf(alertId), `str-${alertId}.pdf`),
    [downloadFile],
  );

  const exportAnalyticsCsv = useCallback(
    () => downloadFile(() => exportService.downloadAnalyticsCsv(), 'analytics-export.csv'),
    [downloadFile],
  );

  const exportBulkSars = useCallback(
    (alertIds: string[]) => downloadFile(() => exportService.downloadBulkSars(alertIds), 'bulk-sars.zip'),
    [downloadFile],
  );

  return {
    isExporting,
    exportError,
    exportCaseFilePdf,
    exportStrPdf,
    exportAnalyticsCsv,
    exportBulkSars,
  };
}
