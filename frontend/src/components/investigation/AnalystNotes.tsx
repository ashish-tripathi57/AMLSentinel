import { useState } from 'react';
import { useNotes } from '../../hooks/use-notes';
import { Card, CardHeader, CardContent, LoadingSpinner, EmptyState } from '../common';
import { formatDate } from '../../utils/format-date';

interface AnalystNotesProps {
  alertId: string;
  analystUsername: string;
}

/**
 * Displays a chronological list of analyst investigation notes with the ability
 * to add new notes. Notes are shown newest-first (the backend returns them in
 * descending created_at order).
 */
export function AnalystNotes({ alertId, analystUsername }: AnalystNotesProps) {
  const { notes, isLoading, error, addNote } = useNotes(alertId);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      await addNote(trimmed, analystUsername);
      setDraft('');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div role="tabpanel" id="tabpanel-notes" aria-label="Notes" className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="tabpanel" id="tabpanel-notes" aria-label="Notes" className="p-6">
        <EmptyState title="Failed to load notes" description={error} />
      </div>
    );
  }

  return (
    <div role="tabpanel" id="tabpanel-notes" aria-label="Notes" className="p-6 space-y-4">
      {/* New note form */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-text-primary">Add Note</h3>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write your investigation note..."
              rows={3}
              className="w-full rounded-md border border-card-border bg-page-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
              aria-label="Note content"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!draft.trim() || isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Add Note'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Notes list */}
      {notes.length === 0 ? (
        <EmptyState title="No notes yet" description="Add the first investigation note above." />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-primary">{note.analyst_username}</span>
                  <time className="text-xs text-text-muted">{formatDate(note.created_at)}</time>
                </div>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{note.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
