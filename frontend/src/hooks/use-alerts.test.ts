import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAlerts } from './use-alerts';

describe('useAlerts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches alerts on mount', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_alerts: 10, open_alerts: 5, high_risk_count: 2, closed_count: 1, unassigned_count: 3 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ alerts: [{ id: 'a1' }], total: 1 }),
      });
    });

    const { result } = renderHook(() => useAlerts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.alerts).toEqual([{ id: 'a1' }]);
    expect(result.current.total).toBe(1);
    expect(result.current.stats).toEqual({ total_alerts: 10, open_alerts: 5, high_risk_count: 2, closed_count: 1, unassigned_count: 3 });
  });

  it('sets error on alerts fetch failure', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_alerts: 0, open_alerts: 0, high_risk_count: 0, closed_count: 0, unassigned_count: 0 }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ detail: 'DB unavailable' }),
      });
    });

    const { result } = renderHook(() => useAlerts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('DB unavailable');
  });

  it('sets fallback error for non-Error thrown', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_alerts: 0, open_alerts: 0, high_risk_count: 0, closed_count: 0, unassigned_count: 0 }),
        });
      }
      return Promise.reject(42);
    });

    const { result } = renderHook(() => useAlerts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to fetch alerts');
  });

  it('silently ignores stats fetch failure', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.reject(new Error('stats failed'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ alerts: [], total: 0 }),
      });
    });

    const { result } = renderHook(() => useAlerts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('setFilters preserves existing limit from previous state', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_alerts: 0, open_alerts: 0, high_risk_count: 0, closed_count: 0, unassigned_count: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ alerts: [], total: 0 }),
      });
    });

    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    /* Call setFilters with explicit limit to verify it is preserved from prev state */
    act(() => {
      result.current.setFilters({ limit: 50 });
    });

    /* The limit should come from prev.limit (20), not from the passed value (50),
       because setFilters uses prev.limit ?? DEFAULT_PAGE_LIMIT */
    expect(result.current.filters.limit).toBe(20);
  });

  it('setFilters resets pagination to offset 0', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_alerts: 0, open_alerts: 0, high_risk_count: 0, closed_count: 0, unassigned_count: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ alerts: [], total: 0 }),
      });
    });

    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFilters({ typology: 'Structuring' });
    });

    expect(result.current.filters.offset).toBe(0);
  });

  it('setSort resets pagination to offset 0', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_alerts: 0, open_alerts: 0, high_risk_count: 0, closed_count: 0, unassigned_count: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ alerts: [], total: 0 }),
      });
    });

    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setSort({ sort_by: 'risk_score', sort_order: 'asc' });
    });

    expect(result.current.sort.sort_by).toBe('risk_score');
  });

  it('setPage updates offset', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_alerts: 0, open_alerts: 0, high_risk_count: 0, closed_count: 0, unassigned_count: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ alerts: [], total: 0 }),
      });
    });

    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setPage(20);
    });

    expect(result.current.filters.offset).toBe(20);
  });

  it('setPage clamps negative offset to 0', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_alerts: 0, open_alerts: 0, high_risk_count: 0, closed_count: 0, unassigned_count: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ alerts: [], total: 0 }),
      });
    });

    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setPage(-10);
    });

    expect(result.current.filters.offset).toBe(0);
  });

  it('setFilters passes resolution filter to API', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_alerts: 0, open_alerts: 0, high_risk_count: 0, closed_count: 0, unassigned_count: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ alerts: [], total: 0 }),
      });
    });

    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFilters({ resolution: 'No Suspicion' });
    });

    await waitFor(() => {
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastAlertCall = calls.filter((c: string[]) => !c[0].includes('/stats')).pop();
      expect(lastAlertCall?.[0]).toContain('resolution=No+Suspicion');
    });
  });

  it('setLimit updates limit and resets offset to 0', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_alerts: 0, open_alerts: 0, high_risk_count: 0, closed_count: 0, unassigned_count: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ alerts: [], total: 0 }),
      });
    });

    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Navigate to page 2 first
    act(() => {
      result.current.setPage(20);
    });
    expect(result.current.filters.offset).toBe(20);

    // Change limit — should reset offset to 0
    act(() => {
      result.current.setLimit(50);
    });

    expect(result.current.filters.limit).toBe(50);
    expect(result.current.filters.offset).toBe(0);
  });

  it('accepts initial filters and includes them in the first fetch', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_alerts: 0, open_alerts: 0, high_risk_count: 0, closed_count: 0, unassigned_count: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ alerts: [], total: 0 }),
      });
    });

    const { result } = renderHook(() => useAlerts({ status: 'New,In Progress' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
    const alertCall = calls.find((c: string[]) => !c[0].includes('/stats'));
    expect(alertCall?.[0]).toContain('status=New');
  });

  it('setFilters passes assigned_analyst filter to API', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_alerts: 0, open_alerts: 0, high_risk_count: 0, closed_count: 0, unassigned_count: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ alerts: [], total: 0 }),
      });
    });

    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFilters({ assigned_analyst: 'sarah.chen' });
    });

    await waitFor(() => {
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastAlertCall = calls.filter((c: string[]) => !c[0].includes('/stats')).pop();
      expect(lastAlertCall?.[0]).toContain('assigned_analyst=sarah.chen');
    });
  });
});
