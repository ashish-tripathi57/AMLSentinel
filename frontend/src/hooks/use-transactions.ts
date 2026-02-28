import { useState, useEffect } from 'react';
import { investigationService } from '../services/investigation-service';
import type { Transaction } from '../types/transaction';

interface UseTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches all transactions linked to the given alertId.
 */
export function useTransactions(alertId: string): UseTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await investigationService.getTransactions(alertId);
        if (!cancelled) {
          setTransactions(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load transactions');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [alertId]);

  return { transactions, isLoading, error };
}
