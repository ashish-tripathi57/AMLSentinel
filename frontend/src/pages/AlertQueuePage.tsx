import { useState } from 'react';
import { Download } from 'lucide-react';
import { Card } from '../components/common/Card';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { AlertQueueTabs } from '../components/alerts/AlertQueueTabs';
import { AlertTable } from '../components/alerts/AlertTable';
import { AlertFiltersBar } from '../components/alerts/AlertFilters';
import { AlertStatsBar } from '../components/alerts/AlertStatsBar';
import { BulkActionBar } from '../components/alerts/BulkActionBar';
import { NumberedPagination } from '../components/alerts/NumberedPagination';
import { useAlerts } from '../hooks/use-alerts';
import { exportService } from '../services/export-service';
import { formatRelativeTime } from '../utils/format-date';
import type { AlertFilters } from '../types/alert';
import type { SortState } from '../hooks/use-alerts';
import type { TabKey } from '../components/alerts/AlertQueueTabs';

/** Comma-separated open statuses for backend filtering. */
const OPEN_STATUSES = 'New,In Progress,Review,Escalated';

/** Hardcoded analyst for the "My Alerts" tab — matches backend seed data. */
const ANALYST_USERNAME = 'analyst.one';

/**
 * Alert Queue page — the landing page of AML Sentinel.
 * Composes breadcrumb, stats bar, tabs (Open/Unassigned/My Alerts/Completed),
 * filters with pills, sortable table with checkboxes, bulk action bar,
 * and numbered pagination. Matches Verilix UI layout.
 */
export function AlertQueuePage() {
  const { alerts, total, stats, isLoading, error, filters, sort, setFilters, setSort, setPage, setLimit } =
    useAlerts({ status: OPEN_STATUSES });

  const [activeTab, setActiveTab] = useState<TabKey>('open');
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set());

  const currentOffset = filters.offset!;
  const currentLimit = filters.limit!;

  /* Derive tab counts from backend stats */
  const tabCounts = {
    open: stats?.open_alerts ?? 0,
    unassigned: stats?.unassigned_count ?? 0,
    myAlerts: 0,
    completed: stats?.closed_count ?? 0,
  };

  /* "Updated X ago" subtitle — based on the most recent alert's triggered_date */
  const lastUpdated = alerts.length > 0
    ? formatRelativeTime(alerts[0].triggered_date)
    : null;

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    setSelectedAlertIds(new Set());

    if (tab === 'open') {
      setFilters({ ...filters, status: OPEN_STATUSES, assigned_analyst: undefined, resolution: undefined });
    } else if (tab === 'unassigned') {
      setFilters({ ...filters, assigned_analyst: '__unassigned__', status: OPEN_STATUSES, resolution: undefined });
    } else if (tab === 'my-alerts') {
      setFilters({ ...filters, assigned_analyst: ANALYST_USERNAME, status: undefined, resolution: undefined });
    } else {
      setFilters({ ...filters, status: 'Closed', assigned_analyst: undefined });
    }
  }

  function handleFiltersChange(newFilters: AlertFilters) {
    setFilters(newFilters);
  }

  function handleSortChange(newSort: SortState) {
    setSort(newSort);
  }

  function handlePageChange(newOffset: number) {
    setPage(newOffset);
  }

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
  }

  function handleSelectionChange(ids: Set<string>) {
    setSelectedAlertIds(ids);
  }

  function handleBulkClose() {
    setSelectedAlertIds(new Set());
  }

  function handleDetectFalsePositives() {
    setSelectedAlertIds(new Set());
  }

  function handleExportSars() {
    setSelectedAlertIds(new Set());
  }

  function handleClearSelection() {
    setSelectedAlertIds(new Set());
  }

  async function handleExportQueue() {
    try {
      const blob = await exportService.downloadAnalyticsCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'alert-queue-export.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // Export failed silently — user can retry
    }
  }

  return (
    <div className="p-6 space-y-4 min-h-full bg-page-bg">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-text-muted">
        <span className="text-text-secondary">Investigation</span>
        <span className="mx-1.5">/</span>
        <span className="text-text-primary font-medium">Cases</span>
      </nav>

      {/* Page header — title + subtitle + action button */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Alert Queue</h1>
          {lastUpdated && (
            <p className="text-xs text-text-secondary mt-0.5">
              Updated {lastUpdated}
            </p>
          )}
          {!lastUpdated && (
            <p className="text-xs text-text-secondary mt-0.5">
              Review and triage active AML alerts
            </p>
          )}
        </div>
        <button
          onClick={handleExportQueue}
          className="flex items-center gap-1.5 h-8 px-4 bg-primary text-white text-xs font-medium rounded hover:bg-primary-hover transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export Queue
        </button>
      </div>

      {/* Stats bar */}
      <AlertStatsBar stats={stats} />

      {/* Tabs + filters + table card */}
      <Card>
        {/* Queue tabs */}
        <AlertQueueTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          counts={tabCounts}
        />

        {/* Filter bar with pills */}
        <div className="px-4 py-3 border-b border-card-border">
          <AlertFiltersBar filters={filters} onFiltersChange={handleFiltersChange} />
        </div>

        {/* Table body */}
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="py-16">
            <EmptyState
              title="Failed to load alerts"
              description={error}
            />
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            title="No alerts found"
            description="Try adjusting your filters to see more results."
          />
        ) : (
          <AlertTable
            alerts={alerts}
            sort={sort}
            onSortChange={handleSortChange}
            selectedIds={selectedAlertIds}
            onSelectionChange={handleSelectionChange}
          />
        )}

        {/* Numbered pagination */}
        {!isLoading && !error && total > 0 && (
          <NumberedPagination
            offset={currentOffset}
            limit={currentLimit}
            total={total}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        )}
      </Card>

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedAlertIds.size}
        onBulkClose={handleBulkClose}
        onDetectFalsePositives={handleDetectFalsePositives}
        onExportSars={handleExportSars}
        onClear={handleClearSelection}
      />
    </div>
  );
}
