import { XCircle, FileText, ShieldAlert, Archive } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onBulkClose: () => void;
  onDetectFalsePositives: () => void;
  onExportSars: () => void;
  onClear: () => void;
}

/**
 * Floating action bar that slides up from the bottom when alerts are selected.
 * Provides bulk operations: close, detect false positives, export SARs, and clear selection.
 */
export function BulkActionBar({
  selectedCount,
  onBulkClose,
  onDetectFalsePositives,
  onExportSars,
  onClear,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  const selectionLabel = selectedCount === 1
    ? '1 alert selected'
    : `${selectedCount} alerts selected`;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-sidebar-bg text-white px-5 py-3 rounded-lg shadow-lg border border-white/10">
      <span className="text-sm font-medium mr-2">{selectionLabel}</span>

      <button
        onClick={onBulkClose}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-white/10 hover:bg-white/20 transition-colors"
      >
        <Archive className="w-3.5 h-3.5" />
        Bulk Close
      </button>

      <button
        onClick={onDetectFalsePositives}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-white/10 hover:bg-white/20 transition-colors"
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        Detect False Positives
      </button>

      <button
        onClick={onExportSars}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-white/10 hover:bg-white/20 transition-colors"
      >
        <FileText className="w-3.5 h-3.5" />
        Export SARs
      </button>

      <button
        onClick={onClear}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white"
      >
        <XCircle className="w-3.5 h-3.5" />
        Clear
      </button>
    </div>
  );
}
