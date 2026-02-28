import { useState, useEffect, useCallback } from 'react';
import { alertService } from '../services/alert-service';
import type { Alert } from '../types/alert';

interface UseAlertDetailResult {
  alert: Alert | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches a single alert by its UUID and exposes loading/error state
 * along with a refetch callback for manual refresh.
 */
export function useAlertDetail(alertId: string): UseAlertDetailResult {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const refetch = useCallback(() => {
    setFetchCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAlert() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await alertService.getAlertById(alertId);
        if (!cancelled) {
          setAlert(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load alert');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAlert();

    return () => {
      cancelled = true;
    };
  }, [alertId, fetchCount]);

  return { alert, isLoading, error, refetch };
}
