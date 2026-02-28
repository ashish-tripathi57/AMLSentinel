import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePatternAnalysis } from './use-pattern-analysis';

describe('usePatternAnalysis', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches analysis on mount', async () => {
    const mockData = { summary: 'Test', patterns: [], risk_indicators: [] };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => usePatternAnalysis('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.analysis).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Analysis failed' }),
    });

    const { result } = renderHook(() => usePatternAnalysis('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Analysis failed');
  });

  it('sets fallback error for non-Error thrown', async () => {
    global.fetch = vi.fn().mockRejectedValue(false);

    const { result } = renderHook(() => usePatternAnalysis('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to load pattern analysis');
  });

  it('handles unmount during fetch without errors', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    const { unmount } = renderHook(() => usePatternAnalysis('alert-1'));
    unmount();
  });

  it('skips state updates when unmounted before fetch resolves', async () => {
    let resolveFetch!: (value: unknown) => void;
    global.fetch = vi.fn().mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    const { unmount } = renderHook(() => usePatternAnalysis('alert-1'));
    unmount();

    await act(async () => {
      resolveFetch({ ok: true, json: () => Promise.resolve({ patterns: [], risk_indicators: [], summary: '' }) });
    });
  });

  it('skips state updates on error when unmounted before fetch rejects', async () => {
    let rejectFetch!: (reason: unknown) => void;
    global.fetch = vi.fn().mockImplementation(
      () => new Promise((_, reject) => { rejectFetch = reject; })
    );

    const { unmount } = renderHook(() => usePatternAnalysis('alert-1'));
    unmount();

    await act(async () => {
      rejectFetch(new Error('test error'));
    });
  });
});
