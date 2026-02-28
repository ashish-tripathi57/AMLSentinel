import { useState, useEffect, useCallback } from 'react';
import { investigationService } from '../services/investigation-service';
import type { SARDraft } from '../types/investigation';

interface UseSARDraftsResult {
  drafts: SARDraft[];
  activeDraft: SARDraft | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  generateDraft: (analyst: string) => Promise<void>;
  updateDraft: (draftId: string, sections: Partial<Pick<SARDraft, 'subject_info' | 'activity_description' | 'narrative' | 'reason_for_suspicion' | 'action_taken'>>) => Promise<void>;
  selectDraft: (draft: SARDraft) => void;
  refetch: () => void;
}

/**
 * Manages SAR drafts for an alert: listing versions, generating new ones,
 * and applying manual edits.
 */
export function useSARDrafts(alertId: string): UseSARDraftsResult {
  const [drafts, setDrafts] = useState<SARDraft[]>([]);
  const [activeDraft, setActiveDraft] = useState<SARDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await investigationService.getSARDrafts(alertId);
      setDrafts(data);
      // Auto-select the latest draft if none is selected or current is gone
      if (data.length > 0 && (!activeDraft || !data.find((d) => d.id === activeDraft.id))) {
        setActiveDraft(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SAR drafts');
    } finally {
      setIsLoading(false);
    }
  }, [alertId, activeDraft]);

  useEffect(() => {
    fetchDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertId]);

  const generateDraft = useCallback(
    async (analyst: string) => {
      setIsGenerating(true);
      setError(null);
      try {
        const newDraft = await investigationService.generateSAR(alertId, analyst);
        setDrafts((prev) => [newDraft, ...prev]);
        setActiveDraft(newDraft);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate SAR draft');
      } finally {
        setIsGenerating(false);
      }
    },
    [alertId]
  );

  const updateDraft = useCallback(
    async (
      draftId: string,
      sections: Partial<Pick<SARDraft, 'subject_info' | 'activity_description' | 'narrative' | 'reason_for_suspicion' | 'action_taken'>>
    ) => {
      const updated = await investigationService.updateSARDraft(alertId, draftId, sections);
      setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      if (activeDraft?.id === updated.id) {
        setActiveDraft(updated);
      }
    },
    [alertId, activeDraft]
  );

  return {
    drafts,
    activeDraft,
    isLoading,
    isGenerating,
    error,
    generateDraft,
    updateDraft,
    selectDraft: setActiveDraft,
    refetch: fetchDrafts,
  };
}
