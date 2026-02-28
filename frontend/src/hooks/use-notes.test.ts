import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNotes } from './use-notes';

describe('useNotes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches notes on mount', async () => {
    const mockData = [{ id: 'note-1', content: 'Test note' }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useNotes('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notes).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Server error' }),
    });

    const { result } = renderHook(() => useNotes('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Server error');
  });

  it('sets fallback error for non-Error thrown', async () => {
    global.fetch = vi.fn().mockRejectedValue(undefined);

    const { result } = renderHook(() => useNotes('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to load notes');
  });

  it('addNote calls service and refetches', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (callCount === 2) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'note-2' }) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: 'note-2', content: 'New' }]),
      });
    });

    const { result } = renderHook(() => useNotes('alert-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addNote('New note', 'analyst.one');
    });

    expect(callCount).toBeGreaterThanOrEqual(3);
  });
});
