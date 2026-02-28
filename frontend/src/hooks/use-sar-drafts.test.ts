import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSARDrafts } from './use-sar-drafts';
import type { SARDraft } from '../types/investigation';

const MOCK_DRAFT: SARDraft = {
  id: 'draft-1',
  alert_id: 'alert-1',
  version: 1,
  subject_info: 'Subject info',
  activity_description: 'Activity description',
  narrative: 'Narrative',
  reason_for_suspicion: 'Reason',
  action_taken: 'Action',
  generated_by: 'ai',
  created_at: '2024-01-15T12:00:00Z',
};

function mockFetchSuccess(data: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchFailure(detail: string) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ detail }),
  });
}

describe('useSARDrafts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches SAR drafts on mount', async () => {
    mockFetchSuccess([MOCK_DRAFT]);
    const { result } = renderHook(() => useSARDrafts('alert-1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.drafts).toEqual([MOCK_DRAFT]);
    expect(result.current.activeDraft).toEqual(MOCK_DRAFT);
  });

  it('sets activeDraft to first draft', async () => {
    mockFetchSuccess([MOCK_DRAFT]);
    const { result } = renderHook(() => useSARDrafts('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activeDraft?.id).toBe('draft-1');
  });

  it('sets error on fetch failure', async () => {
    mockFetchFailure('Server error');
    const { result } = renderHook(() => useSARDrafts('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Server error');
  });

  it('returns empty drafts when none exist', async () => {
    mockFetchSuccess([]);
    const { result } = renderHook(() => useSARDrafts('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.drafts).toEqual([]);
    expect(result.current.activeDraft).toBeNull();
  });

  it('generateDraft creates a new draft and sets it active', async () => {
    const newDraft: SARDraft = { ...MOCK_DRAFT, id: 'draft-2', version: 2 };

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(newDraft) });
    });

    const { result } = renderHook(() => useSARDrafts('alert-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.generateDraft('analyst.one');
    });

    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.activeDraft?.id).toBe('draft-2');
    expect(result.current.isGenerating).toBe(false);
  });

  it('selectDraft switches the active draft', async () => {
    const draft2: SARDraft = { ...MOCK_DRAFT, id: 'draft-2', version: 2 };
    mockFetchSuccess([MOCK_DRAFT, draft2]);

    const { result } = renderHook(() => useSARDrafts('alert-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.selectDraft(draft2);
    });

    expect(result.current.activeDraft?.id).toBe('draft-2');
  });

  it('sets fallback error when fetch rejects with non-Error during load', async () => {
    global.fetch = vi.fn().mockRejectedValue('string error');

    const { result } = renderHook(() => useSARDrafts('alert-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to load SAR drafts');
  });

  it('sets error message from Error instance when generateDraft fails', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.reject(new Error('Network timeout'));
    });

    const { result } = renderHook(() => useSARDrafts('alert-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.generateDraft('analyst.one');
    });

    expect(result.current.error).toBe('Network timeout');
    expect(result.current.isGenerating).toBe(false);
  });

  it('sets error on generateDraft failure with non-Error', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.reject('string error');
    });

    const { result } = renderHook(() => useSARDrafts('alert-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.generateDraft('analyst.one');
    });

    expect(result.current.error).toBe('Failed to generate SAR draft');
    expect(result.current.isGenerating).toBe(false);
  });

  it('updateDraft updates matching draft and active draft', async () => {
    const updated: SARDraft = { ...MOCK_DRAFT, subject_info: 'Updated' };

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([MOCK_DRAFT]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(updated) });
    });

    const { result } = renderHook(() => useSARDrafts('alert-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeDraft?.id).toBe('draft-1');

    await act(async () => {
      await result.current.updateDraft('draft-1', { subject_info: 'Updated' });
    });

    expect(result.current.drafts[0].subject_info).toBe('Updated');
    expect(result.current.activeDraft?.subject_info).toBe('Updated');
  });

  it('does not auto-select when activeDraft already matches a returned draft', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      /* First fetch (mount): returns [MOCK_DRAFT] => activeDraft set to MOCK_DRAFT */
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([MOCK_DRAFT]) });
      }
      /* Second fetch (refetch): returns same data; activeDraft already matches draft-1 */
      return Promise.resolve({ ok: true, json: () => Promise.resolve([MOCK_DRAFT]) });
    });

    const { result } = renderHook(() => useSARDrafts('alert-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeDraft?.id).toBe('draft-1');

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeDraft?.id).toBe('draft-1');
  });

  it('auto-selects new first draft when activeDraft is not found in refetched data', async () => {
    const otherDraft: SARDraft = { ...MOCK_DRAFT, id: 'draft-99', version: 3 };

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First fetch: returns MOCK_DRAFT → activeDraft set to draft-1
        return Promise.resolve({ ok: true, json: () => Promise.resolve([MOCK_DRAFT]) });
      }
      // Second fetch (refetch): returns a different draft → activeDraft should auto-select
      return Promise.resolve({ ok: true, json: () => Promise.resolve([otherDraft]) });
    });

    const { result } = renderHook(() => useSARDrafts('alert-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeDraft?.id).toBe('draft-1');

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.activeDraft?.id).toBe('draft-99'));
    expect(result.current.drafts).toHaveLength(1);
  });

  it('updateDraft does not update activeDraft when IDs differ', async () => {
    const draft2: SARDraft = { ...MOCK_DRAFT, id: 'draft-2', version: 2 };
    const updatedDraft2: SARDraft = { ...draft2, subject_info: 'Updated v2' };

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([MOCK_DRAFT, draft2]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(updatedDraft2) });
    });

    const { result } = renderHook(() => useSARDrafts('alert-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Active draft is MOCK_DRAFT (draft-1), updating draft-2
    await act(async () => {
      await result.current.updateDraft('draft-2', { subject_info: 'Updated v2' });
    });

    // Active draft should still be draft-1
    expect(result.current.activeDraft?.id).toBe('draft-1');
    expect(result.current.drafts[1].subject_info).toBe('Updated v2');
  });
});
