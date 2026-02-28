import { useState, useEffect } from 'react';
import { investigationService } from '../services/investigation-service';
import type { Customer } from '../types/customer';

interface UseCustomerProfileResult {
  customer: Customer | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches the customer profile (with linked bank accounts) for the given alertId.
 * The backend returns a CustomerWithAccountsResponse that includes the `accounts` array.
 */
export function useCustomerProfile(alertId: string): UseCustomerProfileResult {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomer() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await investigationService.getCustomer(alertId);
        if (!cancelled) {
          setCustomer(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load customer');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadCustomer();

    return () => {
      cancelled = true;
    };
  }, [alertId]);

  return { customer, isLoading, error };
}
