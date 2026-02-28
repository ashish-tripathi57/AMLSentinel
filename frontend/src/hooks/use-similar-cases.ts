import { useState, useEffect } from 'react';
import { investigationService } from '../services/investigation-service';
import type { SimilarCase } from '../types/investigation';

interface UseSimilarCasesResult {
  similarCases: SimilarCase[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches similar cases for the given alert.
 * Returns alerts with matching typology, risk profile, and transaction patterns,
 * ranked by similarity score descending.
 */
export function useSimilarCases(alertId: string): UseSimilarCasesResult {
  const [similarCases, setSimilarCases] = useState<SimilarCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSimilarCases() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await investigationService.getSimilarCases(alertId);
        if (!cancelled) {
          setSimilarCases(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load similar cases');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSimilarCases();

    return () => {
      cancelled = true;
    };
  }, [alertId]);

  return { similarCases, isLoading, error };
}
