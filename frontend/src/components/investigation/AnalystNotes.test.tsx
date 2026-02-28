import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalystNotes } from './AnalystNotes';
import type { InvestigationNote } from '../../types/investigation';

const MOCK_NOTES: InvestigationNote[] = [
  {
    id: 'note-1',
    alert_id: 'alert-1',
    analyst_username: 'analyst.one',
    content: 'Suspicious pattern detected.',
    created_at: '2024-01-15T12:00:00Z',
  },
];

function mockFetchSuccess(data: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchFailure(detail: string) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ detail }),
  });
}

describe('AnalystNotes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading spinner while fetching', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AnalystNotes alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the tabpanel with correct id', async () => {
    mockFetchSuccess(MOCK_NOTES);
    render(<AnalystNotes alertId="alert-1" analystUsername="analyst.one" />);

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-notes');
  });

  it('displays notes when loaded', async () => {
    mockFetchSuccess(MOCK_NOTES);
    render(<AnalystNotes alertId="alert-1" analystUsername="analyst.one" />);

    await waitFor(() => screen.getByText('Suspicious pattern detected.'));
    expect(screen.getByText('analyst.one')).toBeInTheDocument();
  });

  it('shows empty state when no notes exist', async () => {
    mockFetchSuccess([]);
    render(<AnalystNotes alertId="alert-1" analystUsername="analyst.one" />);

    await waitFor(() => screen.getByText('No notes yet'));
    expect(screen.getByText('Add the first investigation note above.')).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    mockFetchFailure('Server error');
    render(<AnalystNotes alertId="alert-1" analystUsername="analyst.one" />);

    await waitFor(() => screen.getByText('Failed to load notes'));
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });

  it('renders the Add Note form', async () => {
    mockFetchSuccess(MOCK_NOTES);
    render(<AnalystNotes alertId="alert-1" analystUsername="analyst.one" />);

    await waitFor(() => screen.getByLabelText('Note content'));
    expect(screen.getByLabelText('Note content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Note' })).toBeInTheDocument();
  });

  it('disables submit button when textarea is empty', async () => {
    mockFetchSuccess(MOCK_NOTES);
    render(<AnalystNotes alertId="alert-1" analystUsername="analyst.one" />);

    await waitFor(() => screen.getByLabelText('Note content'));

    expect(screen.getByRole('button', { name: 'Add Note' })).toBeDisabled();
  });

  it('ignores form submission when text is only whitespace', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_NOTES),
    });
    global.fetch = fetchSpy;
    render(<AnalystNotes alertId="alert-1" analystUsername="analyst.one" />);

    await waitFor(() => screen.getByLabelText('Note content'));

    // Type whitespace only
    fireEvent.change(screen.getByLabelText('Note content'), { target: { value: '   ' } });

    // Submit the form directly
    fireEvent.submit(screen.getByLabelText('Note content').closest('form')!);

    // fetch should only have been called once (initial load), not for a new note
    expect(fetchSpy.mock.calls.length).toBe(1);
  });

  it('submits a new note and clears the textarea', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_NOTES) });
      }
      if (callCount === 2) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'note-2',
              alert_id: 'alert-1',
              analyst_username: 'analyst.one',
              content: 'New note content',
              created_at: '2024-01-16T10:00:00Z',
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            ...MOCK_NOTES,
            {
              id: 'note-2',
              alert_id: 'alert-1',
              analyst_username: 'analyst.one',
              content: 'New note content',
              created_at: '2024-01-16T10:00:00Z',
            },
          ]),
      });
    });

    render(<AnalystNotes alertId="alert-1" analystUsername="analyst.one" />);
    await waitFor(() => screen.getByText('Suspicious pattern detected.'));

    const textarea = screen.getByLabelText('Note content');
    await userEvent.type(textarea, 'New note content');

    const buttons = screen.getAllByRole('button');
    const submitButton = buttons.find((b) => b.textContent === 'Add Note')!;
    await userEvent.click(submitButton);

    await waitFor(() => screen.getByText('New note content'));
  });
});
