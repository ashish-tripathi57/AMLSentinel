import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBulkOperations } from './use-bulk-operations';

describe('useBulkOperations', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useBulkOperations());

    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.isClosing).toBe(false);
    expect(result.current.isDetecting).toBe(false);
    expect(result.current.closeResult).toBeNull();
    expect(result.current.falsePositiveResults).toBeNull();
  });

  describe('selection management', () => {
    it('toggleSelection adds an id when not present', () => {
      const { result } = renderHook(() => useBulkOperations());

      act(() => {
        result.current.toggleSelection('uuid-1');
      });

      expect(result.current.selectedIds.has('uuid-1')).toBe(true);
      expect(result.current.selectedIds.size).toBe(1);
    });

    it('toggleSelection removes an id when already present', () => {
      const { result } = renderHook(() => useBulkOperations());

      act(() => {
        result.current.toggleSelection('uuid-1');
      });
      act(() => {
        result.current.toggleSelection('uuid-1');
      });

      expect(result.current.selectedIds.has('uuid-1')).toBe(false);
      expect(result.current.selectedIds.size).toBe(0);
    });

    it('selectAll replaces selection with provided ids', () => {
      const { result } = renderHook(() => useBulkOperations());

      act(() => {
        result.current.toggleSelection('old-id');
      });
      act(() => {
        result.current.selectAll(['uuid-1', 'uuid-2', 'uuid-3']);
      });

      expect(result.current.selectedIds.size).toBe(3);
      expect(result.current.selectedIds.has('uuid-1')).toBe(true);
      expect(result.current.selectedIds.has('uuid-2')).toBe(true);
      expect(result.current.selectedIds.has('uuid-3')).toBe(true);
      expect(result.current.selectedIds.has('old-id')).toBe(false);
    });

    it('clearSelection empties selected ids and clears results', () => {
      const { result } = renderHook(() => useBulkOperations());

      act(() => {
        result.current.selectAll(['uuid-1', 'uuid-2']);
      });
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.closeResult).toBeNull();
      expect(result.current.falsePositiveResults).toBeNull();
    });
  });

  describe('executeBulkClose', () => {
    it('calls bulk close and sets closeResult on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ closed_count: 2, failed_ids: [] }),
      });

      const { result } = renderHook(() => useBulkOperations());

      act(() => {
        result.current.selectAll(['uuid-1', 'uuid-2']);
      });

      await act(async () => {
        await result.current.executeBulkClose(
          'No Suspicion',
          'Clean batch',
          'sarah.chen'
        );
      });

      expect(result.current.isClosing).toBe(false);
      expect(result.current.closeResult).toEqual({
        closed_count: 2,
        failed_ids: [],
      });
    });

    it('sets isClosing to true during the request', async () => {
      let resolveFetch!: (value: unknown) => void;
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
      );

      const { result } = renderHook(() => useBulkOperations());

      act(() => {
        result.current.selectAll(['uuid-1']);
      });

      let closePromise: Promise<void>;
      act(() => {
        closePromise = result.current.executeBulkClose(
          'No Suspicion',
          'Clean',
          'sarah.chen'
        );
      });

      expect(result.current.isClosing).toBe(true);

      await act(async () => {
        resolveFetch({
          ok: true,
          json: () => Promise.resolve({ closed_count: 1, failed_ids: [] }),
        });
        await closePromise!;
      });

      expect(result.current.isClosing).toBe(false);
    });

    it('sets closeResult to error shape on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ detail: 'Server error' }),
      });

      const { result } = renderHook(() => useBulkOperations());

      act(() => {
        result.current.selectAll(['uuid-1']);
      });

      await act(async () => {
        await result.current.executeBulkClose(
          'No Suspicion',
          'Clean',
          'sarah.chen'
        );
      });

      expect(result.current.isClosing).toBe(false);
      expect(result.current.closeResult).toEqual({
        closed_count: 0,
        failed_ids: ['uuid-1'],
      });
    });
  });

  describe('executeDetectFalsePositives', () => {
    it('calls detect false positives and sets results on success', async () => {
      const mockResults = {
        results: [
          {
            alert_id: 'uuid-1',
            alert_short_id: 'S1',
            title: 'Alert 1',
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

      const { result } = renderHook(() => useBulkOperations());

      act(() => {
        result.current.selectAll(['uuid-1']);
      });

      await act(async () => {
        await result.current.executeDetectFalsePositives();
      });

      expect(result.current.isDetecting).toBe(false);
      expect(result.current.falsePositiveResults).toEqual(mockResults);
    });

    it('sets isDetecting to true during the request', async () => {
      let resolveFetch!: (value: unknown) => void;
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
      );

      const { result } = renderHook(() => useBulkOperations());

      act(() => {
        result.current.selectAll(['uuid-1']);
      });

      let detectPromise: Promise<void>;
      act(() => {
        detectPromise = result.current.executeDetectFalsePositives();
      });

      expect(result.current.isDetecting).toBe(true);

      await act(async () => {
        resolveFetch({
          ok: true,
          json: () =>
            Promise.resolve({ results: [], total_analyzed: 0 }),
        });
        await detectPromise!;
      });

      expect(result.current.isDetecting).toBe(false);
    });

    it('sets falsePositiveResults to null on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({ detail: 'Detection failed' }),
      });

      const { result } = renderHook(() => useBulkOperations());

      act(() => {
        result.current.selectAll(['uuid-1']);
      });

      await act(async () => {
        await result.current.executeDetectFalsePositives();
      });

      expect(result.current.isDetecting).toBe(false);
      expect(result.current.falsePositiveResults).toBeNull();
    });
  });
});
