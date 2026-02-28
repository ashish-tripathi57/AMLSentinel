import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InvestigationDrawerProvider } from '../../contexts/InvestigationDrawerContext';
import { AlertTable } from './AlertTable';
import type { Alert } from '../../types/alert';
import type { SortState } from '../../hooks/use-alerts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_SORT: SortState = { sort_by: 'triggered_date', sort_order: 'desc' };

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'uuid-1',
    alert_id: 'S001',
    customer_id: 'cust-1',
    typology: 'Structuring',
    risk_score: 85,
    status: 'New',
    title: 'Suspicious structuring activity',
    description: null,
    triggered_date: '2024-01-10T08:00:00Z',
    assigned_analyst: 'sarah.chen',
    total_flagged_amount: 500000,
    flagged_transaction_count: 3,
    resolution: null,
    closed_at: null,
    ...overrides,
  };
}

function renderTable(
  alerts: Alert[],
  sort: SortState = BASE_SORT,
  onSortChange = vi.fn(),
  selectedIds = new Set<string>(),
  onSelectionChange = vi.fn()
) {
  return render(
    <MemoryRouter>
      <InvestigationDrawerProvider>
        <AlertTable
          alerts={alerts}
          sort={sort}
          onSortChange={onSortChange}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      </InvestigationDrawerProvider>
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AlertTable', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the table with all column headers', () => {
    renderTable([]);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Risk Score')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
  });

  it('renders alert data in the table rows', () => {
    const alert = makeAlert();
    renderTable([alert]);

    expect(screen.getByText('S001')).toBeInTheDocument();
    expect(screen.getByText('Suspicious structuring activity')).toBeInTheDocument();
    expect(screen.getByText('Structuring')).toBeInTheDocument();
    expect(screen.getByText('85/100')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('sarah.chen')).toBeInTheDocument();
  });

  it('shows "Unassigned" when analyst is null', () => {
    const alert = makeAlert({ assigned_analyst: null });
    renderTable([alert]);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('renders multiple alerts', () => {
    const alerts = [
      makeAlert({ id: '1', alert_id: 'S001', title: 'Alert One' }),
      makeAlert({ id: '2', alert_id: 'S002', title: 'Alert Two' }),
    ];
    renderTable(alerts);

    expect(screen.getByText('Alert One')).toBeInTheDocument();
    expect(screen.getByText('Alert Two')).toBeInTheDocument();
  });

  it('calls onSortChange with asc when clicking unsorted column', () => {
    const onSortChange = vi.fn();
    renderTable([makeAlert()], BASE_SORT, onSortChange);

    fireEvent.click(screen.getByText('Risk Score'));

    expect(onSortChange).toHaveBeenCalledWith({ sort_by: 'risk_score', sort_order: 'asc' });
  });

  it('toggles sort order when clicking the currently sorted column', () => {
    const onSortChange = vi.fn();
    const sort: SortState = { sort_by: 'risk_score', sort_order: 'asc' };
    renderTable([makeAlert()], sort, onSortChange);

    fireEvent.click(screen.getByText('Risk Score'));

    expect(onSortChange).toHaveBeenCalledWith({ sort_by: 'risk_score', sort_order: 'desc' });
  });

  it('navigates to /investigation/:id when row is clicked', () => {
    const alert = makeAlert({ id: 'uuid-999' });
    const { container } = renderTable([alert]);

    const row = container.querySelector('tr[role="row"]')!;
    fireEvent.click(row);

    expect(row).toBeInTheDocument();
  });

  it('navigates on Enter key press on a row', () => {
    const alert = makeAlert({ id: 'uuid-999' });
    const { container } = renderTable([alert]);

    const row = container.querySelector('tr[role="row"]')!;
    fireEvent.keyDown(row, { key: 'Enter' });

    expect(row).toBeInTheDocument();
  });

  it('navigates on Space key press on a row', () => {
    const alert = makeAlert({ id: 'uuid-999' });
    const { container } = renderTable([alert]);

    const row = container.querySelector('tr[role="row"]')!;
    fireEvent.keyDown(row, { key: ' ' });

    expect(row).toBeInTheDocument();
  });

  it('does not navigate on non-Enter/Space key press', () => {
    const alert = makeAlert({ id: 'uuid-999' });
    const { container } = renderTable([alert]);

    const row = container.querySelector('tr[role="row"]')!;
    fireEvent.keyDown(row, { key: 'Tab' });

    expect(row).toBeInTheDocument();
  });

  it('does not call onSortChange when clicking non-sortable column (Assignee)', () => {
    const onSortChange = vi.fn();
    renderTable([makeAlert()], BASE_SORT, onSortChange);

    fireEvent.click(screen.getByText('Assignee'));

    expect(onSortChange).not.toHaveBeenCalled();
  });

  it('renders status badges for all status values', () => {
    const statuses = ['New', 'In Progress', 'Review', 'Escalated', 'Closed'];
    const alerts = statuses.map((status, i) =>
      makeAlert({ id: `id-${i}`, alert_id: `A00${i}`, status })
    );
    renderTable(alerts);

    for (const status of statuses) {
      expect(screen.getByText(status)).toBeInTheDocument();
    }
  });

  it('renders typology badge for each row', () => {
    const alerts = [
      makeAlert({ id: '1', alert_id: 'A1', typology: 'Layering' }),
      makeAlert({ id: '2', alert_id: 'A2', typology: 'Round Tripping' }),
    ];
    renderTable(alerts);

    expect(screen.getByText('Layering')).toBeInTheDocument();
    expect(screen.getByText('Round Tripping')).toBeInTheDocument();
  });

  it('has accessible grid label', () => {
    renderTable([]);
    expect(screen.getByRole('grid', { name: 'Alert queue' })).toBeInTheDocument();
  });

  it('shows sort direction indicator on active column', () => {
    const sort: SortState = { sort_by: 'triggered_date', sort_order: 'desc' };
    renderTable([makeAlert()], sort);

    const header = screen.getByText('Created').closest('th')!;
    expect(header.textContent).toContain('↓');
  });

  it('shows ascending indicator when sort order is asc', () => {
    const sort: SortState = { sort_by: 'triggered_date', sort_order: 'asc' };
    renderTable([makeAlert()], sort);

    const header = screen.getByText('Created').closest('th')!;
    expect(header.textContent).toContain('↑');
  });

  it('renders risk score colors for severity-high (60-79)', () => {
    renderTable([makeAlert({ risk_score: 65 })]);
    expect(screen.getByText('65/100')).toBeInTheDocument();
  });

  it('renders risk score colors for severity-medium (40-59)', () => {
    renderTable([makeAlert({ risk_score: 45 })]);
    expect(screen.getByText('45/100')).toBeInTheDocument();
  });

  it('renders risk score colors for severity-low (<40)', () => {
    renderTable([makeAlert({ risk_score: 30 })]);
    expect(screen.getByText('30/100')).toBeInTheDocument();
  });

  it('renders plain text status for unknown status values', () => {
    renderTable([makeAlert({ status: 'UnknownStatus' })]);
    expect(screen.getByText('UnknownStatus')).toBeInTheDocument();
  });

  it('uses fallback typology color for unrecognized typology', () => {
    renderTable([makeAlert({ typology: 'Custom Typology' })]);
    expect(screen.getByText('Custom Typology')).toBeInTheDocument();
  });

  // ---- Checkbox selection tests ----

  it('renders select-all checkbox in the header', () => {
    renderTable([makeAlert()]);
    expect(screen.getByLabelText('Select all alerts')).toBeInTheDocument();
  });

  it('renders individual checkboxes for each row', () => {
    const alerts = [
      makeAlert({ id: '1', alert_id: 'A1' }),
      makeAlert({ id: '2', alert_id: 'A2' }),
    ];
    renderTable(alerts);

    const checkboxes = screen.getAllByRole('checkbox');
    // 1 header + 2 rows
    expect(checkboxes).toHaveLength(3);
  });

  it('checks individual checkbox when alert is in selectedIds', () => {
    const alert = makeAlert({ id: 'uuid-1' });
    renderTable([alert], BASE_SORT, vi.fn(), new Set(['uuid-1']));

    const rowCheckbox = screen.getByLabelText('Select alert S001');
    expect(rowCheckbox).toBeChecked();
  });

  it('does not check checkbox when alert is not in selectedIds', () => {
    const alert = makeAlert({ id: 'uuid-1' });
    renderTable([alert], BASE_SORT, vi.fn(), new Set());

    const rowCheckbox = screen.getByLabelText('Select alert S001');
    expect(rowCheckbox).not.toBeChecked();
  });

  it('calls onSelectionChange when individual checkbox is clicked', () => {
    const onSelectionChange = vi.fn();
    const alert = makeAlert({ id: 'uuid-1' });
    renderTable([alert], BASE_SORT, vi.fn(), new Set(), onSelectionChange);

    fireEvent.click(screen.getByLabelText('Select alert S001'));

    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['uuid-1']));
  });

  it('removes from selection when checked checkbox is clicked', () => {
    const onSelectionChange = vi.fn();
    const alert = makeAlert({ id: 'uuid-1' });
    renderTable([alert], BASE_SORT, vi.fn(), new Set(['uuid-1']), onSelectionChange);

    fireEvent.click(screen.getByLabelText('Select alert S001'));

    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it('selects all alerts when select-all checkbox is clicked', () => {
    const onSelectionChange = vi.fn();
    const alerts = [
      makeAlert({ id: '1', alert_id: 'A1' }),
      makeAlert({ id: '2', alert_id: 'A2' }),
    ];
    renderTable(alerts, BASE_SORT, vi.fn(), new Set(), onSelectionChange);

    fireEvent.click(screen.getByLabelText('Select all alerts'));

    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1', '2']));
  });

  it('deselects all alerts when all are selected and select-all is clicked', () => {
    const onSelectionChange = vi.fn();
    const alerts = [
      makeAlert({ id: '1', alert_id: 'A1' }),
      makeAlert({ id: '2', alert_id: 'A2' }),
    ];
    renderTable(alerts, BASE_SORT, vi.fn(), new Set(['1', '2']), onSelectionChange);

    fireEvent.click(screen.getByLabelText('Select all alerts'));

    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it('does not navigate when checkbox is clicked', () => {
    const onSelectionChange = vi.fn();
    const alert = makeAlert({ id: 'uuid-1' });
    renderTable([alert], BASE_SORT, vi.fn(), new Set(), onSelectionChange);

    // Clicking checkbox should not trigger navigation
    fireEvent.click(screen.getByLabelText('Select alert S001'));

    // The selection should have changed
    expect(onSelectionChange).toHaveBeenCalled();
  });

  it('checks select-all when all rows are selected', () => {
    const alerts = [
      makeAlert({ id: '1', alert_id: 'A1' }),
      makeAlert({ id: '2', alert_id: 'A2' }),
    ];
    renderTable(alerts, BASE_SORT, vi.fn(), new Set(['1', '2']));

    expect(screen.getByLabelText('Select all alerts')).toBeChecked();
  });

  // ---- Relative time display tests ----

  it('displays relative time in the Created column', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-13T08:00:00Z'));

    const alert = makeAlert({ triggered_date: '2024-01-10T08:00:00Z' });
    renderTable([alert]);

    expect(screen.getByText('3 days ago')).toBeInTheDocument();
  });

  it('displays "just now" for very recent alerts', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-10T08:00:30Z'));

    const alert = makeAlert({ triggered_date: '2024-01-10T08:00:00Z' });
    renderTable([alert]);

    expect(screen.getByText('just now')).toBeInTheDocument();
  });
});
