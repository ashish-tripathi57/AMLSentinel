import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCustomerProfile } from './use-customer-profile';

const MOCK_CUSTOMER = {
  id: 'cust-1',
  full_name: 'Priya Sharma',
  accounts: [],
};

describe('useCustomerProfile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches customer on mount and returns data', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_CUSTOMER),
    });

    const { result } = renderHook(() => useCustomerProfile('alert-1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.customer).toEqual(MOCK_CUSTOMER);
    expect(result.current.error).toBeNull();
  });

  it('sets error when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Customer not found' }),
    });

    const { result } = renderHook(() => useCustomerProfile('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Customer not found');
    expect(result.current.customer).toBeNull();
  });

  it('sets fallback error for non-Error thrown', async () => {
    global.fetch = vi.fn().mockRejectedValue('string error');

    const { result } = renderHook(() => useCustomerProfile('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to load customer');
  });

  it('handles unmount during fetch without errors', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    const { unmount } = renderHook(() => useCustomerProfile('alert-1'));
    unmount();
  });

  it('skips state updates when unmounted before fetch resolves', async () => {
    let resolveFetch!: (value: unknown) => void;
    global.fetch = vi.fn().mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    const { unmount } = renderHook(() => useCustomerProfile('alert-1'));
    unmount();

    await act(async () => {
      resolveFetch({ ok: true, json: () => Promise.resolve({ id: 'cust-1', full_name: 'Test' }) });
    });
  });

  it('skips state updates on error when unmounted before fetch rejects', async () => {
    let rejectFetch!: (reason: unknown) => void;
    global.fetch = vi.fn().mockImplementation(
      () => new Promise((_, reject) => { rejectFetch = reject; })
    );

    const { unmount } = renderHook(() => useCustomerProfile('alert-1'));
    unmount();

    await act(async () => {
      rejectFetch(new Error('test error'));
    });
  });
});
