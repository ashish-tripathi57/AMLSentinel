import { useState } from 'react';
import { useSARDrafts } from '../../hooks/use-sar-drafts';
import { Card, CardHeader, CardContent, LoadingSpinner, EmptyState } from '../common';
import { formatDate } from '../../utils/format-date';
import type { SARDraft } from '../../types/investigation';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';

interface SAREditorProps {
  alertId: string;
  analystUsername: string;
}

const SAR_SECTIONS: { key: keyof Pick<SARDraft, 'subject_info' | 'activity_description' | 'narrative' | 'reason_for_suspicion' | 'action_taken'>; label: string }[] = [
  { key: 'subject_info', label: 'Subject Information' },
  { key: 'activity_description', label: 'Activity Description' },
  { key: 'narrative', label: 'Narrative' },
  { key: 'reason_for_suspicion', label: 'Reason for Suspicion' },
  { key: 'action_taken', label: 'Action Taken' },
];

/**
 * SAR draft editor with 5 sections, AI generation, version history, and PDF download.
 */
export function SAREditor({ alertId, analystUsername }: SAREditorProps) {
  const {
    drafts,
    activeDraft,
    isLoading,
    isGenerating,
    error,
    generateDraft,
    updateDraft,
    selectDraft,
  } = useSARDrafts(alertId);

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function handleEdit(section: string, currentValue: string | null) {
    setEditingSection(section);
    setEditValue(currentValue ?? '');
  }

  async function handleSave(section: string) {
    setIsSaving(true);
    try {
      await updateDraft(activeDraft!.id, { [section]: editValue });
      setEditingSection(null);
    } catch {
      // Error is surfaced by the hook; component stays in edit mode
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setEditingSection(null);
    setEditValue('');
  }

  if (isLoading) {
    return (
      <div role="tabpanel" id="tabpanel-sar" aria-label="SAR" className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && drafts.length === 0) {
    return (
      <div role="tabpanel" id="tabpanel-sar" aria-label="SAR" className="p-6">
        <EmptyState title="Failed to load SAR drafts" description={error} />
      </div>
    );
  }

  return (
    <div role="tabpanel" id="tabpanel-sar" aria-label="SAR" className="p-6 space-y-4">
      {/* Header row: Generate button + version selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => generateDraft(analystUsername)}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate SAR Draft'}
          </button>

          {activeDraft && (
            <a
              href={`${API_BASE_URL}/alerts/${alertId}/sar/${activeDraft.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-md hover:bg-primary/5 transition-colors"
            >
              Download PDF
            </a>
          )}
        </div>

        {/* Version selector */}
        {drafts.length > 1 && (
          <select
            value={activeDraft?.id ?? ''}
            onChange={(e) => {
              const selected = drafts.find((d) => d.id === e.target.value);
              if (selected) selectDraft(selected);
            }}
            className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Select SAR version"
          >
            {drafts.map((draft) => (
              <option key={draft.id} value={draft.id}>
                v{draft.version} — {formatDate(draft.created_at)} ({draft.generated_by})
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-severity-critical/30 bg-severity-critical/5 px-4 py-3">
          <p className="text-sm text-severity-critical">{error}</p>
        </div>
      )}

      {/* SAR Sections */}
      {!activeDraft ? (
        <EmptyState
          title="No SAR drafts"
          description="Click 'Generate SAR Draft' to create an AI-generated Suspicious Activity Report."
        />
      ) : (
        <div className="space-y-4">
          {SAR_SECTIONS.map(({ key, label }) => (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
                  {editingSection !== key && (
                    <button
                      onClick={() => handleEdit(key, activeDraft[key])}
                      className="text-xs text-primary hover:text-primary-hover transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingSection === key ? (
                  <div className="space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={6}
                      className="w-full rounded-md border border-card-border bg-page-bg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                      aria-label={`Edit ${label}`}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleCancel}
                        className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(key)}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-hover rounded-md transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                    {activeDraft[key] ?? 'Not yet generated.'}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
