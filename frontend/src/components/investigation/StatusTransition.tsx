import { useState } from 'react';
import { alertService } from '../../services/alert-service';
import { Badge } from '../common';

type StatusBadgeVariant = 'new' | 'in-progress' | 'review' | 'escalated' | 'closed';

const STATUS_FLOW: Record<string, string[]> = {
  New: ['In Progress'],
  'In Progress': ['Review', 'Escalated'],
  Review: ['Closed', 'In Progress'],
  Escalated: ['In Progress', 'Closed'],
  Closed: [],
};

const RESOLUTION_OPTIONS = [
  'No Suspicion',
  'SAR Filed',
  'Escalated',
  'Insufficient Evidence',
] as const;

function statusToBadgeVariant(status: string): StatusBadgeVariant {
  const mapping: Record<string, StatusBadgeVariant> = {
    New: 'new',
    'In Progress': 'in-progress',
    Review: 'review',
    Escalated: 'escalated',
    Closed: 'closed',
  };
  return mapping[status] ?? 'new';
}

interface StatusTransitionProps {
  alertId: string;
  currentStatus: string;
  analystUsername: string;
  onStatusChanged: (newStatus: string) => void;
}

/**
 * Status transition modal with resolution dropdown required when closing an alert.
 */
export function StatusTransition({
  alertId,
  currentStatus,
  analystUsername,
  onStatusChanged,
}: StatusTransitionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [resolution, setResolution] = useState('');
  const [rationale, setRationale] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatuses = STATUS_FLOW[currentStatus] ?? [];
  const isClosing = selectedStatus === 'Closed';
  const isSubmitDisabled =
    !selectedStatus ||
    !rationale.trim() ||
    (isClosing && !resolution) ||
    isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStatus || !rationale.trim()) return;
    if (isClosing && !resolution) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await alertService.updateStatus(
        alertId,
        selectedStatus,
        rationale.trim(),
        analystUsername,
        isClosing ? resolution : undefined
      );
      onStatusChanged(selectedStatus);
      setIsOpen(false);
      setSelectedStatus('');
      setResolution('');
      setRationale('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setIsOpen(false);
    setSelectedStatus('');
    setResolution('');
    setRationale('');
    setError(null);
  }

  if (nextStatuses.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-hover rounded-md transition-colors"
      >
        Change Status
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-label="Change alert status">
          <div className="bg-card-bg border border-card-border rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-5 py-4 border-b border-card-border">
              <h2 className="text-sm font-semibold text-text-primary">Change Alert Status</h2>
              <p className="text-xs text-text-secondary mt-1">
                Current: <Badge variant={statusToBadgeVariant(currentStatus)}>{currentStatus}</Badge>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              {/* Status selection */}
              <fieldset>
                <legend className="text-xs font-medium text-text-secondary mb-2">New Status</legend>
                <div className="flex gap-2 flex-wrap">
                  {nextStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setSelectedStatus(status);
                        if (status !== 'Closed') setResolution('');
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                        selectedStatus === status
                          ? 'bg-primary text-white border-primary'
                          : 'bg-card-bg text-text-primary border-card-border hover:border-primary/50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Resolution dropdown — shown only when closing */}
              {isClosing && (
                <div>
                  <label htmlFor="resolution-select" className="block text-xs font-medium text-text-secondary mb-1">
                    Resolution (required)
                  </label>
                  <select
                    id="resolution-select"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full rounded-md border border-card-border bg-page-bg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select resolution...</option>
                    {RESOLUTION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Rationale */}
              <div>
                <label htmlFor="status-rationale" className="block text-xs font-medium text-text-secondary mb-1">
                  Rationale (required)
                </label>
                <textarea
                  id="status-rationale"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  rows={3}
                  placeholder="Explain why this status change is appropriate..."
                  className="w-full rounded-md border border-card-border bg-page-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                />
              </div>

              {error && (
                <p className="text-xs text-severity-critical">{error}</p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary-hover rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Updating...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
