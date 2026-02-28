import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuditTrail } from './use-audit-trail';

describe('useAuditTrail', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches audit trail on mount', async () => {
    const mockData = [{ id: 'entry-1', action: 'status_change' }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useAuditTrail('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.entries).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('passes action filter to the service', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { result } = renderHook(() => useAuditTrail('alert-1', 'status_change'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('action=status_change'),
      expect.anything(),
    );
  });

  it('sets error on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Server error' }),
    });

    const { result } = renderHook(() => useAuditTrail('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Server error');
  });

  it('sets fallback error for non-Error thrown', async () => {
    global.fetch = vi.fn().mockRejectedValue(42);

    const { result } = renderHook(() => useAuditTrail('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to load audit trail');
  });

  it('refetch re-fetches the audit trail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { result } = renderHook(() => useAuditTrail('alert-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callsBefore = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
