import { useState, useEffect } from 'react';
import { investigationService } from '../services/investigation-service';
import type { NetworkGraph } from '../types/investigation';

interface UseNetworkGraphResult {
  network: NetworkGraph | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches the transaction network graph (nodes + edges) for the given alert.
 *
 * Delegates to investigationService.getNetwork which calls:
 * GET /api/alerts/{alertId}/network
 */
export function useNetworkGraph(alertId: string): UseNetworkGraphResult {
  const [network, setNetwork] = useState<NetworkGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNetwork() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await investigationService.getNetwork(alertId);
        if (!cancelled) {
          setNetwork(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load network graph');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadNetwork();

    return () => {
      cancelled = true;
    };
  }, [alertId]);

  return { network, isLoading, error };
}
