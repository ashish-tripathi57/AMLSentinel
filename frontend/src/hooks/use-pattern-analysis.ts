import { useState, useEffect } from 'react';
import { apiClient } from '../services/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PatternAnalysisResponse {
  patterns: Array<{
    name: string;
    description: string;
    severity: string;
  }>;
  risk_indicators: Array<{
    indicator: string;
    level: string;
    detail: string;
  }>;
  summary: string;
}

interface UsePatternAnalysisResult {
  analysis: PatternAnalysisResponse | null;
  isLoading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches AI-generated pattern analysis for the given alert.
 *
 * Endpoint: GET /api/alerts/{alertId}/patterns
 */
export function usePatternAnalysis(alertId: string): UsePatternAnalysisResult {
  const [analysis, setAnalysis] = useState<PatternAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPatternAnalysis() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiClient.get<PatternAnalysisResponse>(
          `/alerts/${alertId}/patterns`
        );
        if (!cancelled) {
          setAnalysis(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load pattern analysis');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPatternAnalysis();

    return () => {
      cancelled = true;
    };
  }, [alertId]);

  return { analysis, isLoading, error };
}
