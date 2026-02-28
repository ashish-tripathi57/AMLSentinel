import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAlertDetail } from './use-alert-detail';

const MOCK_ALERT = { id: 'alert-1', alert_id: 'S001', status: 'New' };

describe('useAlertDetail', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches alert detail on mount', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_ALERT),
    });

    const { result } = renderHook(() => useAlertDetail('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.alert).toEqual(MOCK_ALERT);
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Not found' }),
    });

    const { result } = renderHook(() => useAlertDetail('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Not found');
  });

  it('sets fallback error for non-Error thrown', async () => {
    global.fetch = vi.fn().mockRejectedValue(undefined);

    const { result } = renderHook(() => useAlertDetail('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to load alert');
  });

  it('refetch triggers a new fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_ALERT),
    });

    const { result } = renderHook(() => useAlertDetail('alert-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callsBefore = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('handles unmount during fetch without errors', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    const { unmount } = renderHook(() => useAlertDetail('alert-1'));
    unmount();
  });

  it('skips state updates when unmounted before fetch resolves', async () => {
    let resolveFetch!: (value: unknown) => void;
    global.fetch = vi.fn().mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    const { unmount } = renderHook(() => useAlertDetail('alert-1'));
    unmount();

    await act(async () => {
      resolveFetch({ ok: true, json: () => Promise.resolve({ id: 'alert-1' }) });
    });
  });

  it('skips state updates on error when unmounted before fetch rejects', async () => {
    let rejectFetch!: (reason: unknown) => void;
    global.fetch = vi.fn().mockImplementation(
      () => new Promise((_, reject) => { rejectFetch = reject; })
    );

    const { unmount } = renderHook(() => useAlertDetail('alert-1'));
    unmount();

    await act(async () => {
      rejectFetch(new Error('test error'));
    });
  });
});
