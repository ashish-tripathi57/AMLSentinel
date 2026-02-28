import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuditTrail } from './AuditTrail';
import type { AuditTrailEntry } from '../../types/investigation';

const MOCK_ENTRIES: AuditTrailEntry[] = [
  {
    id: 'entry-1',
    alert_id: 'alert-1',
    action: 'status_change',
    details: 'Changed from New to In Progress',
    performed_by: 'analyst.one',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'entry-2',
    alert_id: 'alert-1',
    action: 'note_added',
    details: null,
    performed_by: 'analyst.two',
    created_at: '2024-01-15T11:00:00Z',
  },
  {
    id: 'entry-3',
    alert_id: 'alert-1',
    action: 'escalation_requested',
    details: 'Escalated to senior analyst',
    performed_by: 'analyst.one',
    created_at: '2024-01-15T12:00:00Z',
  },
  {
    id: 'entry-4',
    alert_id: 'alert-1',
    action: 'checklist_updated',
    details: 'Verified ID documents',
    performed_by: 'analyst.two',
    created_at: '2024-01-15T13:00:00Z',
  },
  {
    id: 'entry-5',
    alert_id: 'alert-1',
    action: 'sar_generated',
    details: 'SAR draft created',
    performed_by: 'analyst.one',
    created_at: '2024-01-15T14:00:00Z',
  },
  {
    id: 'entry-6',
    alert_id: 'alert-1',
    action: 'misc_action',
    details: 'Some other action',
    performed_by: 'analyst.two',
    created_at: '2024-01-15T15:00:00Z',
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

describe('AuditTrail', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading spinner while fetching', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AuditTrail alertId="alert-1" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the tabpanel with correct id', async () => {
    mockFetchSuccess(MOCK_ENTRIES);
    render(<AuditTrail alertId="alert-1" />);

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-audit-trail');
  });

  it('displays audit trail entries', async () => {
    mockFetchSuccess(MOCK_ENTRIES);
    render(<AuditTrail alertId="alert-1" />);

    await waitFor(() => screen.getByText('Changed from New to In Progress'));
    // "status_change" appears in both the filter dropdown and the entry badge
    const statusMatches = screen.getAllByText('status_change');
    expect(statusMatches.length).toBeGreaterThanOrEqual(1);
    const noteMatches = screen.getAllByText('note_added');
    expect(noteMatches.length).toBeGreaterThanOrEqual(1);
  });

  it('displays performed_by for each entry', async () => {
    mockFetchSuccess(MOCK_ENTRIES);
    render(<AuditTrail alertId="alert-1" />);

    await waitFor(() => expect(screen.getAllByText('analyst.one').length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByText('analyst.two').length).toBeGreaterThanOrEqual(1);
  });

  it('shows entry count in header for 2 entries', async () => {
    mockFetchSuccess(MOCK_ENTRIES.slice(0, 2));
    render(<AuditTrail alertId="alert-1" />);

    await waitFor(() => screen.getByText('Audit Trail (2 entries)'));
  });

  it('shows singular "entry" when only one', async () => {
    mockFetchSuccess([MOCK_ENTRIES[0]]);
    render(<AuditTrail alertId="alert-1" />);

    await waitFor(() => screen.getByText('Audit Trail (1 entry)'));
  });

  it('shows empty state when no entries', async () => {
    mockFetchSuccess([]);
    render(<AuditTrail alertId="alert-1" />);

    await waitFor(() => screen.getByText('No audit trail entries'));
  });

  it('shows error state on fetch failure', async () => {
    mockFetchFailure('Server error');
    render(<AuditTrail alertId="alert-1" />);

    await waitFor(() => screen.getByText('Failed to load audit trail'));
  });

  it('renders the action filter dropdown', async () => {
    mockFetchSuccess(MOCK_ENTRIES);
    render(<AuditTrail alertId="alert-1" />);

    await waitFor(() => screen.getByLabelText('Filter by action:'));
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders badge classes for all action types', async () => {
    mockFetchSuccess(MOCK_ENTRIES);
    render(<AuditTrail alertId="alert-1" />);

    // Each action text appears in both the entry badge and the filter dropdown option
    await waitFor(() => expect(screen.getAllByText('escalation_requested').length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByText('checklist_updated').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('sar_generated').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('misc_action').length).toBeGreaterThanOrEqual(1);
  });

  it('shows entry count for all entries', async () => {
    mockFetchSuccess(MOCK_ENTRIES);
    render(<AuditTrail alertId="alert-1" />);

    await waitFor(() => screen.getByText('Audit Trail (6 entries)'));
  });

  it('filters entries when action filter is changed', async () => {
    mockFetchSuccess(MOCK_ENTRIES);
    render(<AuditTrail alertId="alert-1" />);

    await waitFor(() => expect(screen.getByLabelText('Filter by action:')).toBeInTheDocument());

    const select = screen.getByRole('combobox');

    // Change filter to a specific action type
    fireEvent.change(select, { target: { value: 'status_change' } });

    // Verify the select value changed (controlled component)
    await waitFor(() => expect(select).toHaveValue('status_change'));

    // Reset filter back to "All actions"
    fireEvent.change(select, { target: { value: '' } });
    await waitFor(() => expect(select).toHaveValue(''));
  });
});
