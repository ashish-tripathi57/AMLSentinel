import { useState, useCallback } from 'react';
import { bulkOperationsService } from '../services/bulk-operations-service';
import type { BulkCloseResult, FalsePositiveDetectionResult } from '../types/alert';

export interface UseBulkOperationsReturn {
  selectedIds: Set<string>;
  isClosing: boolean;
  isDetecting: boolean;
  closeResult: BulkCloseResult | null;
  falsePositiveResults: FalsePositiveDetectionResult | null;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  executeBulkClose: (resolution: string, rationale: string, analystUsername: string) => Promise<void>;
  executeDetectFalsePositives: () => Promise<void>;
}

/**
 * Manages bulk alert operations: multi-select, bulk close, and false positive detection.
 * Tracks selection state and async operation progress independently.
 */
export function useBulkOperations(): UseBulkOperationsReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isClosing, setIsClosing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [closeResult, setCloseResult] = useState<BulkCloseResult | null>(null);
  const [falsePositiveResults, setFalsePositiveResults] =
    useState<FalsePositiveDetectionResult | null>(null);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setCloseResult(null);
    setFalsePositiveResults(null);
  }, []);

  const executeBulkClose = useCallback(
    async (resolution: string, rationale: string, analystUsername: string) => {
      const ids = Array.from(selectedIds);
      setIsClosing(true);
      try {
        const result = await bulkOperationsService.bulkClose(
          ids,
          resolution,
          rationale,
          analystUsername
        );
        setCloseResult(result);
      } catch {
        setCloseResult({ closed_count: 0, failed_ids: ids });
      } finally {
        setIsClosing(false);
      }
    },
    [selectedIds]
  );

  const executeDetectFalsePositives = useCallback(async () => {
    const ids = Array.from(selectedIds);
    setIsDetecting(true);
    try {
      const result = await bulkOperationsService.detectFalsePositives(ids);
      setFalsePositiveResults(result);
    } catch {
      setFalsePositiveResults(null);
    } finally {
      setIsDetecting(false);
    }
  }, [selectedIds]);

  return {
    selectedIds,
    isClosing,
    isDetecting,
    closeResult,
    falsePositiveResults,
    toggleSelection,
    selectAll,
    clearSelection,
    executeBulkClose,
    executeDetectFalsePositives,
  };
}
