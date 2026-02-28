import { useState } from 'react';

const RESOLUTION_OPTIONS = ['No Suspicion', 'SAR Filed', 'Escalated', 'Insufficient Evidence'];
const MIN_JUSTIFICATION_LENGTH = 10;

interface BulkCloseModalProps {
  selectedAlertIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (resolution: string, justification: string) => void;
  isSubmitting?: boolean;
}

/**
 * Modal dialog for bulk-closing multiple alerts at once.
 * Requires a resolution selection and a justification of at least 10 characters.
 */
export function BulkCloseModal({
  selectedAlertIds,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}: BulkCloseModalProps) {
  const [resolution, setResolution] = useState('');
  const [justification, setJustification] = useState('');

  if (!isOpen) return null;

  const isValid = resolution !== '' && justification.length >= MIN_JUSTIFICATION_LENGTH;

  function handleConfirm() {
    if (isValid) {
      onConfirm(resolution, justification);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card-bg rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-base font-semibold text-text-primary mb-4">
          Bulk Close {selectedAlertIds.length} Alerts
        </h2>

        {/* Resolution dropdown */}
        <div className="mb-4">
          <label htmlFor="bulk-resolution" className="block text-xs font-medium text-text-secondary mb-1">
            Resolution
          </label>
          <select
            id="bulk-resolution"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            aria-label="Resolution"
            className="w-full h-9 px-3 text-sm border border-card-border rounded bg-card-bg text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select resolution…</option>
            {RESOLUTION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Justification textarea */}
        <div className="mb-6">
          <label htmlFor="bulk-justification" className="block text-xs font-medium text-text-secondary mb-1">
            Justification
          </label>
          <textarea
            id="bulk-justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            aria-label="Justification"
            placeholder="Provide justification for closing these alerts (min 10 characters)…"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-card-border rounded bg-card-bg text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary border border-card-border rounded-md hover:bg-page-bg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Closing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
