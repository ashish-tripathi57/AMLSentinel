import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exportService } from './export-service';

describe('exportService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockBlobResponse() {
    const mockBlob = new Blob(['test-content'], { type: 'application/octet-stream' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    return mockBlob;
  }

  function mockFailedResponse(status: number) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status,
    });
  }

  describe('downloadCaseFilePdf', () => {
    it('calls correct endpoint with GET method', async () => {
      mockBlobResponse();
      await exportService.downloadCaseFilePdf('alert-42');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/alerts/alert-42/case-file/pdf',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('returns a Blob on success', async () => {
      mockBlobResponse();
      const result = await exportService.downloadCaseFilePdf('alert-42');

      expect(result).toBeInstanceOf(Blob);
    });

    it('throws on non-ok response', async () => {
      mockFailedResponse(500);

      await expect(exportService.downloadCaseFilePdf('alert-42')).rejects.toThrow(
        'Export failed: 500'
      );
    });
  });

  describe('downloadStrPdf', () => {
    it('calls correct endpoint with GET method', async () => {
      mockBlobResponse();
      await exportService.downloadStrPdf('alert-77');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/alerts/alert-77/str/pdf',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('returns a Blob on success', async () => {
      mockBlobResponse();
      const result = await exportService.downloadStrPdf('alert-77');

      expect(result).toBeInstanceOf(Blob);
    });

    it('throws on non-ok response', async () => {
      mockFailedResponse(404);

      await expect(exportService.downloadStrPdf('alert-77')).rejects.toThrow(
        'Export failed: 404'
      );
    });
  });

  describe('downloadAnalyticsCsv', () => {
    it('calls correct endpoint with GET method', async () => {
      mockBlobResponse();
      await exportService.downloadAnalyticsCsv();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/analytics/export/csv',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('returns a Blob on success', async () => {
      mockBlobResponse();
      const result = await exportService.downloadAnalyticsCsv();

      expect(result).toBeInstanceOf(Blob);
    });

    it('throws on non-ok response', async () => {
      mockFailedResponse(403);

      await expect(exportService.downloadAnalyticsCsv()).rejects.toThrow(
        'Export failed: 403'
      );
    });
  });

  describe('downloadBulkSars', () => {
    it('calls correct endpoint with POST method and alert IDs body', async () => {
      mockBlobResponse();
      const alertIds = ['a1', 'a2', 'a3'];
      await exportService.downloadBulkSars(alertIds);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/sar/bulk-export',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ alert_ids: alertIds }),
        })
      );
    });

    it('sends Content-Type application/json header', async () => {
      mockBlobResponse();
      await exportService.downloadBulkSars(['a1']);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('returns a Blob on success', async () => {
      mockBlobResponse();
      const result = await exportService.downloadBulkSars(['a1', 'a2']);

      expect(result).toBeInstanceOf(Blob);
    });

    it('throws on non-ok response', async () => {
      mockFailedResponse(422);

      await expect(exportService.downloadBulkSars(['a1'])).rejects.toThrow(
        'Export failed: 422'
      );
    });
  });
});
