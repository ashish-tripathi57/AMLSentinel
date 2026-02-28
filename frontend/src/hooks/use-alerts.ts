import { useState, useEffect, useCallback } from 'react';
import { alertService } from '../services/alert-service';
import type { Alert, AlertFilters, AlertStats } from '../types/alert';

export interface SortState {
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

export interface UseAlertsReturn {
  alerts: Alert[];
  total: number;
  stats: AlertStats | null;
  isLoading: boolean;
  error: string | null;
  filters: AlertFilters;
  sort: SortState;
  /** Update filter criteria — always resets pagination to page 0. */
  setFilters: (filters: AlertFilters) => void;
  /** Update sort column/direction — resets pagination to page 0. */
  setSort: (sort: SortState) => void;
  /** Navigate to a specific page offset without resetting filters. */
  setPage: (offset: number) => void;
  /** Update items-per-page limit — resets pagination to page 0. */
  setLimit: (limit: number) => void;
}

const DEFAULT_PAGE_LIMIT = 20;

const DEFAULT_FILTERS: AlertFilters = {
  offset: 0,
  limit: DEFAULT_PAGE_LIMIT,
};

const DEFAULT_SORT: SortState = {
  sort_by: 'triggered_date',
  sort_order: 'desc',
};

/**
 * Manages alert list state including filters, sorting, and pagination.
 * Fetches alerts and stats from the API whenever filters or sort state change.
 * Accepts optional initial filters to configure the first fetch.
 */
export function useAlerts(initialFilters?: Partial<AlertFilters>): UseAlertsReturn {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<AlertFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [sort, setSortState] = useState<SortState>(DEFAULT_SORT);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const combinedFilters: AlertFilters = {
        ...filters,
        sort_by: sort.sort_by,
        sort_order: sort.sort_order,
      };
      const response = await alertService.getAlerts(combinedFilters);
      setAlerts(response.alerts);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setIsLoading(false);
    }
  }, [filters, sort]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await alertService.getStats();
      setStats(response);
    } catch {
      // Stats are supplementary; silently ignore failures
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Apply new filter criteria. Always resets pagination to offset 0.
  const setFilters = useCallback((newFilters: AlertFilters) => {
    setFiltersState((prev) => ({
      ...DEFAULT_FILTERS,
      ...newFilters,
      // Always reset to first page when filter criteria change
      offset: 0,
      // Preserve limit from previous state
      limit: prev.limit,
    }));
  }, []);

  const setSort = useCallback((newSort: SortState) => {
    // Reset to first page when sort changes
    setSortState(newSort);
    setFiltersState((prev) => ({ ...prev, offset: 0 }));
  }, []);

  // Pure pagination: update offset without touching filter criteria.
  const setPage = useCallback((offset: number) => {
    setFiltersState((prev) => ({ ...prev, offset: Math.max(0, offset) }));
  }, []);

  // Update items-per-page limit and reset to page 0.
  const setLimit = useCallback((limit: number) => {
    setFiltersState((prev) => ({ ...prev, limit, offset: 0 }));
  }, []);

  return {
    alerts,
    total,
    stats,
    isLoading,
    error,
    filters,
    sort,
    setFilters,
    setSort,
    setPage,
    setLimit,
  };
}
