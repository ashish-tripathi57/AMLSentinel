import { useState, useEffect, useCallback } from 'react';
import { investigationService } from '../services/investigation-service';
import type { ChecklistItem } from '../types/investigation';

interface UseChecklistResult {
  items: ChecklistItem[];
  isLoading: boolean;
  error: string | null;
  toggleItem: (itemId: string, isChecked: boolean, checkedBy: string) => Promise<void>;
  autoCheckItem: (itemId: string) => Promise<void>;
  refetch: () => void;
}

/**
 * Fetches and manages the investigation checklist for the given alert.
 * Provides callbacks for manual toggle and AI auto-check.
 */
export function useChecklist(alertId: string): UseChecklistResult {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklist = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await investigationService.getChecklist(alertId);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checklist');
    } finally {
      setIsLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const toggleItem = useCallback(
    async (itemId: string, isChecked: boolean, checkedBy: string) => {
      const updated = await investigationService.updateChecklistItem(
        alertId,
        itemId,
        isChecked,
        checkedBy
      );
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    },
    [alertId]
  );

  const autoCheckItem = useCallback(
    async (itemId: string) => {
      const result = await investigationService.autoCheckItem(alertId, itemId);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, is_checked: result.is_checked, checked_by: 'ai', ai_rationale: result.rationale }
            : item
        )
      );
    },
    [alertId]
  );

  return { items, isLoading, error, toggleItem, autoCheckItem, refetch: fetchChecklist };
}
