import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNetworkGraph } from './use-network-graph';

describe('useNetworkGraph', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches network graph on mount', async () => {
    const mockData = { nodes: [], edges: [] };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useNetworkGraph('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.network).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Network data not found' }),
    });

    const { result } = renderHook(() => useNetworkGraph('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Network data not found');
  });

  it('sets fallback error for non-Error thrown', async () => {
    global.fetch = vi.fn().mockRejectedValue(null);

    const { result } = renderHook(() => useNetworkGraph('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to load network graph');
  });

  it('handles unmount during fetch without errors', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    const { unmount } = renderHook(() => useNetworkGraph('alert-1'));
    unmount();
  });

  it('skips state updates when unmounted before fetch resolves', async () => {
    let resolveFetch!: (value: unknown) => void;
    global.fetch = vi.fn().mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    const { unmount } = renderHook(() => useNetworkGraph('alert-1'));
    unmount();

    await act(async () => {
      resolveFetch({ ok: true, json: () => Promise.resolve({ nodes: [], edges: [] }) });
    });
  });

  it('skips state updates on error when unmounted before fetch rejects', async () => {
    let rejectFetch!: (reason: unknown) => void;
    global.fetch = vi.fn().mockImplementation(
      () => new Promise((_, reject) => { rejectFetch = reject; })
    );

    const { unmount } = renderHook(() => useNetworkGraph('alert-1'));
    unmount();

    await act(async () => {
      rejectFetch(new Error('test error'));
    });
  });
});
