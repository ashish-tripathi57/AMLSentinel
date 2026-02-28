import { useState, useEffect, useCallback } from 'react';
import { investigationService } from '../services/investigation-service';
import type { InvestigationNote } from '../types/investigation';

interface UseNotesResult {
  notes: InvestigationNote[];
  isLoading: boolean;
  error: string | null;
  addNote: (content: string, analyst: string) => Promise<void>;
  refetch: () => void;
}

/**
 * Fetches and manages investigation notes for the given alert.
 * Provides an `addNote` callback that creates a note and refreshes the list.
 */
export function useNotes(alertId: string): UseNotesResult {
  const [notes, setNotes] = useState<InvestigationNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await investigationService.getNotes(alertId);
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = useCallback(
    async (content: string, analyst: string) => {
      await investigationService.createNote(alertId, content, analyst);
      await fetchNotes();
    },
    [alertId, fetchNotes]
  );

  return { notes, isLoading, error, addNote, refetch: fetchNotes };
}
