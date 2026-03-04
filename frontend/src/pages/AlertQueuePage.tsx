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
import { formatRelativeTime, formatDateShort } from '../utils/format-date';
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
    useAlerts({ initialFilters: { status: OPEN_STATUSES }, analyst: ANALYST_USERNAME });

  const [activeTab, setActiveTab] = useState<TabKey>('open');
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set());

  const currentOffset = filters.offset!;
  const currentLimit = filters.limit!;

  /* Derive tab counts from backend stats */
  const tabCounts = {
    open: stats?.open_alerts ?? 0,
    unassigned: stats?.unassigned_count ?? 0,
    myAlerts: stats?.my_alerts_count ?? 0,
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
    if (alerts.length === 0) return;

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Alert Queue');

    const typologyFill: Record<string, { bg: string; fg: string }> = {
      'Structuring':                { bg: 'FFDBEAFE', fg: 'FF2563EB' },
      'Unusual Geographic Activity': { bg: 'FFEDE9FE', fg: 'FF7C3AED' },
      'Rapid Fund Movement':        { bg: 'FFD1FAE5', fg: 'FF059669' },
      'Round-trip Transactions':    { bg: 'FFFEF3C7', fg: 'FFD97706' },
      'Sudden Activity Change':     { bg: 'FFFEE2E2', fg: 'FFDC2626' },
      'Large Cash Transactions':    { bg: 'FFCFFAFE', fg: 'FF0891B2' },
    };
    const defaultTypologyFill = { bg: 'FFFEF9C3', fg: 'FFCA8A04' };

    const statusFill: Record<string, { bg: string; fg: string }> = {
      'New':         { bg: 'FFDBEAFE', fg: 'FF2563EB' },
      'In Progress': { bg: 'FFEDE9FE', fg: 'FF7C3AED' },
      'Review':      { bg: 'FFFEF3C7', fg: 'FFD97706' },
      'Escalated':   { bg: 'FFFEE2E2', fg: 'FFDC2626' },
      'Closed':      { bg: 'FFD1FAE5', fg: 'FF059669' },
    };
    const defaultStatusFill = { bg: 'FFF3F4F6', fg: 'FF6B7280' };

    function riskFill(score: number): { bg: string; fg: string } {
      if (score >= 80) return { bg: 'FFFEE2E2', fg: 'FFDC2626' };
      if (score >= 60) return { bg: 'FFFEF3C7', fg: 'FFD97706' };
      if (score >= 40) return { bg: 'FFFEF9C3', fg: 'FFCA8A04' };
      return { bg: 'FFD1FAE5', fg: 'FF059669' };
    }

    // Column definitions
    sheet.columns = [
      { header: 'Name',              key: 'name',     width: 12 },
      { header: 'Typology',          key: 'typology', width: 28 },
      { header: 'Risk Score',        key: 'risk',     width: 14 },
      { header: 'Alert Description', key: 'desc',     width: 60 },
      { header: 'Assignee',          key: 'assignee', width: 18 },
      { header: 'Status',            key: 'status',   width: 14 },
      { header: 'Created',           key: 'created',  width: 16 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 28;

    // Data rows
    alerts.forEach((alert) => {
      const row = sheet.addRow({
        name: alert.alert_id,
        typology: alert.typology,
        risk: `${alert.risk_score}/100`,
        desc: alert.title,
        assignee: alert.assigned_analyst ?? 'Unassigned',
        status: alert.status,
        created: formatDateShort(alert.triggered_date),
      });

      row.height = 24;
      row.eachCell((cell) => {
        cell.font = { size: 11 };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });

      // Name — bold monospace-style
      const nameCell = row.getCell('name');
      nameCell.font = { bold: true, size: 11 };

      // Typology — colored background
      const tc = typologyFill[alert.typology] ?? defaultTypologyFill;
      const typologyCell = row.getCell('typology');
      typologyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tc.bg } };
      typologyCell.font = { bold: true, size: 11, color: { argb: tc.fg } };

      // Risk Score — colored background
      const rc = riskFill(alert.risk_score);
      const riskCell = row.getCell('risk');
      riskCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rc.bg } };
      riskCell.font = { bold: true, size: 11, color: { argb: rc.fg } };
      riskCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Assignee — italic gray for unassigned
      if (!alert.assigned_analyst) {
        const assigneeCell = row.getCell('assignee');
        assigneeCell.font = { italic: true, size: 11, color: { argb: 'FF9CA3AF' } };
      }

      // Status — colored background
      const sc = statusFill[alert.status] ?? defaultStatusFill;
      const statusCell = row.getCell('status');
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sc.bg } };
      statusCell.font = { bold: true, size: 11, color: { argb: sc.fg } };
      statusCell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'alert-queue-export.xlsx';
    link.click();
    URL.revokeObjectURL(url);
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
