import { useState, useEffect, useCallback } from 'react';
import { investigationService } from '../services/investigation-service';
import type { AuditTrailEntry } from '../types/investigation';

interface UseAuditTrailResult {
  entries: AuditTrailEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches the audit trail for the given alert.
 * Optionally filters by action type.
 */
export function useAuditTrail(alertId: string, action?: string): UseAuditTrailResult {
  const [entries, setEntries] = useState<AuditTrailEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditTrail = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await investigationService.getAuditTrail(alertId, action);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit trail');
    } finally {
      setIsLoading(false);
    }
  }, [alertId, action]);

  useEffect(() => {
    fetchAuditTrail();
  }, [fetchAuditTrail]);

  return { entries, isLoading, error, refetch: fetchAuditTrail };
}
