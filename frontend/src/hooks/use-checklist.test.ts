import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChecklist } from './use-checklist';

describe('useChecklist', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches checklist on mount', async () => {
    const mockData = [{ id: 'item-1', description: 'Verify ID', is_checked: false }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useChecklist('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Server error' }),
    });

    const { result } = renderHook(() => useChecklist('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Server error');
  });

  it('sets fallback error for non-Error thrown', async () => {
    global.fetch = vi.fn().mockRejectedValue('oops');

    const { result } = renderHook(() => useChecklist('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to load checklist');
  });

  it('toggleItem updates the matching item and preserves non-matching items', async () => {
    const initialItems = [
      { id: 'item-1', description: 'Verify', is_checked: false, checked_by: null },
      { id: 'item-2', description: 'Review', is_checked: false, checked_by: null },
    ];
    const updatedItem = { id: 'item-1', description: 'Verify', is_checked: true, checked_by: 'analyst.one' };

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(initialItems) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(updatedItem) });
    });

    const { result } = renderHook(() => useChecklist('alert-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleItem('item-1', true, 'analyst.one');
    });

    expect(result.current.items[0].is_checked).toBe(true);
    expect(result.current.items[1].id).toBe('item-2');
    expect(result.current.items[1].is_checked).toBe(false);
  });

  it('toggleItem preserves ai_rationale returned by the server after manual toggle', async () => {
    // Scenario: AI check ran previously. Analyst manually unchecks the item.
    // The server (with the backend fix) returns the item with ai_rationale intact.
    // The hook must update state from the server response, keeping the rationale visible.
    const aiRationale = 'Customer made 9 transactions just below ₹10L threshold.';
    const initialItems = [
      { id: 'item-1', description: 'Verify', is_checked: true, checked_by: 'ai', ai_rationale: aiRationale },
    ];
    const serverResponse = {
      id: 'item-1',
      description: 'Verify',
      is_checked: false,
      checked_by: 'analyst.one',
      ai_rationale: aiRationale,  // backend preserves this
    };

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(initialItems) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(serverResponse) });
    });

    const { result } = renderHook(() => useChecklist('alert-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleItem('item-1', false, 'analyst.one');
    });

    expect(result.current.items[0].is_checked).toBe(false);
    expect(result.current.items[0].ai_rationale).toBe(aiRationale);
  });

  it('autoCheckItem updates the matching item and preserves non-matching items', async () => {
    const initialItems = [
      { id: 'item-1', description: 'Verify', is_checked: false, checked_by: null, ai_rationale: null },
      { id: 'item-2', description: 'Review', is_checked: false, checked_by: null, ai_rationale: null },
    ];
    const aiResult = { is_checked: true, rationale: 'Verified by AI' };

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(initialItems) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(aiResult) });
    });

    const { result } = renderHook(() => useChecklist('alert-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.autoCheckItem('item-1');
    });

    expect(result.current.items[0].is_checked).toBe(true);
    expect(result.current.items[0].ai_rationale).toBe('Verified by AI');
    expect(result.current.items[1].id).toBe('item-2');
    expect(result.current.items[1].is_checked).toBe(false);
  });
});
