import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bulkOperationsService } from './bulk-operations-service';

describe('bulkOperationsService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('bulkClose', () => {
    it('sends POST to /alerts/bulk-close with alert_ids, resolution, and rationale', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ closed_count: 3, failed_ids: [] }),
      });

      const result = await bulkOperationsService.bulkClose(
        ['uuid-1', 'uuid-2', 'uuid-3'],
        'No Suspicion',
        'Batch reviewed — no risk indicators',
        'sarah.chen'
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/alerts/bulk-close?analyst_username=sarah.chen'),
        expect.objectContaining({ method: 'POST' })
      );

      const body = JSON.parse(
        (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
      );
      expect(body.alert_ids).toEqual(['uuid-1', 'uuid-2', 'uuid-3']);
      expect(body.resolution).toBe('No Suspicion');
      expect(body.rationale).toBe('Batch reviewed — no risk indicators');
      expect(result.closed_count).toBe(3);
      expect(result.failed_ids).toEqual([]);
    });

    it('returns failed_ids when some alerts cannot be closed', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ closed_count: 1, failed_ids: ['uuid-2'] }),
      });

      const result = await bulkOperationsService.bulkClose(
        ['uuid-1', 'uuid-2'],
        'SAR Filed',
        'Filed for both',
        'analyst.one'
      );

      expect(result.closed_count).toBe(1);
      expect(result.failed_ids).toEqual(['uuid-2']);
    });

    it('encodes analyst username with special characters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ closed_count: 1, failed_ids: [] }),
      });

      await bulkOperationsService.bulkClose(
        ['uuid-1'],
        'No Suspicion',
        'Clean',
        'john doe'
      );

      const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(url).toContain('analyst_username=john%20doe');
    });

    it('propagates HTTP errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ detail: 'Validation error' }),
      });

      await expect(
        bulkOperationsService.bulkClose(
          ['uuid-1'],
          'No Suspicion',
          'Clean',
          'sarah.chen'
        )
      ).rejects.toThrow('Validation error');
    });
  });

  describe('detectFalsePositives', () => {
    it('sends POST to /alerts/detect-false-positives with alert_ids', async () => {
      const mockResults = {
        results: [
          {
            alert_id: 'uuid-1',
            alert_short_id: 'S1',
            title: 'Structuring Alert',
            confidence: 0.85,
            reasoning: 'Low risk profile',
            suggested_resolution: 'No Suspicion',
          },
        ],
        total_analyzed: 1,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResults),
      });

      const result = await bulkOperationsService.detectFalsePositives([
        'uuid-1',
      ]);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/alerts/detect-false-positives'),
        expect.objectContaining({ method: 'POST' })
      );

      const body = JSON.parse(
        (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
      );
      expect(body.alert_ids).toEqual(['uuid-1']);
      expect(result.results).toHaveLength(1);
      expect(result.total_analyzed).toBe(1);
    });

    it('returns multiple results for multiple alert_ids', async () => {
      const mockResults = {
        results: [
          {
            alert_id: 'uuid-1',
            alert_short_id: 'S1',
            title: 'Alert 1',
            confidence: 0.9,
            reasoning: 'Reason 1',
            suggested_resolution: 'No Suspicion',
          },
          {
            alert_id: 'uuid-2',
            alert_short_id: 'S2',
            title: 'Alert 2',
            confidence: 0.3,
            reasoning: 'Reason 2',
            suggested_resolution: 'SAR Filed',
          },
        ],
        total_analyzed: 2,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResults),
      });

      const result = await bulkOperationsService.detectFalsePositives([
        'uuid-1',
        'uuid-2',
      ]);

      expect(result.results).toHaveLength(2);
      expect(result.total_analyzed).toBe(2);
    });

    it('propagates HTTP errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({
            detail: 'alert_ids list is required and must not be empty',
          }),
      });

      await expect(
        bulkOperationsService.detectFalsePositives([])
      ).rejects.toThrow('alert_ids list is required and must not be empty');
    });
  });
});
