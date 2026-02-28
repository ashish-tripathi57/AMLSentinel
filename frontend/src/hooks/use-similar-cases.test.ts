import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSimilarCases } from './use-similar-cases';

const MOCK_SIMILAR_CASES = [
  {
    id: 'uuid-10',
    alert_id: 'S10',
    title: 'Structuring — Multiple Sub-Threshold Deposits',
    typology: 'Structuring',
    risk_score: 82,
    status: 'Closed',
    resolution: 'SAR Filed',
    similarity_score: 91,
    matching_factors: ['Same typology', 'Similar risk score', 'Same customer risk category'],
  },
  {
    id: 'uuid-11',
    alert_id: 'S11',
    title: 'Structuring — Rapid Sequence Deposits',
    typology: 'Structuring',
    risk_score: 75,
    status: 'In Progress',
    resolution: null,
    similarity_score: 78,
    matching_factors: ['Same typology', 'Similar flagged amount'],
  },
];

describe('useSimilarCases', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches similar cases on mount and returns data', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_SIMILAR_CASES),
    });

    const { result } = renderHook(() => useSimilarCases('alert-uuid-1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.similarCases).toEqual(MOCK_SIMILAR_CASES);
    expect(result.current.error).toBeNull();
  });

  it('calls the correct API endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    renderHook(() => useSimilarCases('my-alert-uuid'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/alerts/my-alert-uuid/similar-cases'),
        expect.any(Object)
      );
    });
  });

  it('sets error when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Alert not found' }),
    });

    const { result } = renderHook(() => useSimilarCases('alert-uuid-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Alert not found');
    expect(result.current.similarCases).toEqual([]);
  });

  it('sets fallback error for non-Error thrown', async () => {
    global.fetch = vi.fn().mockRejectedValue('string error');

    const { result } = renderHook(() => useSimilarCases('alert-uuid-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to load similar cases');
  });

  it('handles unmount during fetch without errors', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    const { unmount } = renderHook(() => useSimilarCases('alert-uuid-1'));
    unmount();
  });

  it('skips state updates when unmounted before fetch resolves', async () => {
    let resolveFetch!: (value: unknown) => void;
    global.fetch = vi.fn().mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    const { unmount } = renderHook(() => useSimilarCases('alert-uuid-1'));
    unmount();

    await act(async () => {
      resolveFetch({
        ok: true,
        json: () => Promise.resolve(MOCK_SIMILAR_CASES),
      });
    });
  });

  it('skips state updates on error when unmounted before fetch rejects', async () => {
    let rejectFetch!: (reason: unknown) => void;
    global.fetch = vi.fn().mockImplementation(
      () => new Promise((_, reject) => { rejectFetch = reject; })
    );

    const { unmount } = renderHook(() => useSimilarCases('alert-uuid-1'));
    unmount();

    await act(async () => {
      rejectFetch(new Error('test error'));
    });
  });

  it('returns empty array when API returns empty list', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { result } = renderHook(() => useSimilarCases('alert-uuid-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.similarCases).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
