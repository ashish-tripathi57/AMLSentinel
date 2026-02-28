import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TransactionTimeline, dotColor } from './TransactionTimeline';
import type { Transaction } from '../../types/transaction';

// Mock Recharts — canvas-based rendering not available in jsdom
vi.mock('recharts', () => ({
  ScatterChart: ({ children }: { children: React.ReactNode }) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => <div data-testid="scatter-series" />,
  XAxis: (props: { tickFormatter?: (value: number) => string }) => {
    const formatted = props.tickFormatter ? props.tickFormatter(1705312800000) : '';
    return <span data-testid="xaxis-tick">{formatted}</span>;
  },
  YAxis: (props: { tickFormatter?: (value: number) => string }) => {
    const formatted = props.tickFormatter ? props.tickFormatter(9500) : '';
    return <span data-testid="yaxis-tick">{formatted}</span>;
  },
  CartesianGrid: () => null,
  Tooltip: ({ content }: { content: (props: { active: boolean; payload: Array<{ payload: unknown }> }) => React.ReactNode }) => {
    // Exercise the content render function with active=true and active=false
    const activeResult = content({ active: true, payload: [{ payload: { x: 1705312800000, y: 9500 } }] });
    const inactiveResult = content({ active: false, payload: [] });
    return (
      <div data-testid="tooltip-wrapper">
        <div data-testid="tooltip-active">{activeResult}</div>
        <div data-testid="tooltip-inactive">{inactiveResult}</div>
      </div>
    );
  },
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => null,
}));

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    account_id: 'acc-1',
    transaction_date: '2024-01-15T10:00:00Z',
    transaction_type: 'cash_deposit',
    amount: 9500,
    currency: 'INR',
    direction: 'credit',
    channel: 'branch',
    counterparty_name: 'Self',
    counterparty_account: null,
    location: 'Mumbai',
    is_flagged: true,
    flag_reason: 'Structuring pattern',
  },
  {
    id: 'tx-2',
    account_id: 'acc-1',
    transaction_date: '2024-01-14T14:00:00Z',
    transaction_type: 'transfer',
    amount: 25000,
    currency: 'INR',
    direction: 'debit',
    channel: 'online',
    counterparty_name: 'Shell Corp',
    counterparty_account: 'ACC-999',
    location: null,
    is_flagged: false,
    flag_reason: null,
  },
  {
    id: 'tx-3',
    account_id: 'acc-1',
    transaction_date: '2024-01-13T09:00:00Z',
    transaction_type: 'wire_transfer',
    amount: 50000,
    currency: 'INR',
    direction: 'credit',
    channel: null,
    counterparty_name: null,
    counterparty_account: null,
    location: null,
    is_flagged: false,
    flag_reason: null,
  },
  {
    id: 'tx-4',
    account_id: 'acc-1',
    transaction_date: '2024-01-16T10:00:00Z',
    transaction_type: 'transfer',
    amount: 15000,
    currency: 'INR',
    direction: 'credit',
    channel: 'online',
    counterparty_name: 'Another Corp',
    counterparty_account: 'ACC-888',
    location: 'Delhi',
    is_flagged: false,
    flag_reason: null,
  },
  {
    id: 'tx-5',
    account_id: 'acc-1',
    transaction_date: '2024-01-17T10:00:00Z',
    transaction_type: 'unknown_exotic_type',
    amount: 5000,
    currency: 'INR',
    direction: 'internal',
    channel: 'mobile',
    counterparty_name: 'Random Payee',
    counterparty_account: 'ACC-777',
    location: 'Chennai',
    is_flagged: false,
    flag_reason: null,
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

function renderComponent(alertId = 'alert-1') {
  return render(
    <MemoryRouter>
      <TransactionTimeline alertId={alertId} />
    </MemoryRouter>
  );
}

describe('TransactionTimeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --- Loading ---
  it('shows loading spinner while fetching', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the tabpanel with correct id during loading', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-transactions');
  });

  // --- Error ---
  it('shows error state on fetch failure', async () => {
    mockFetchFailure('Server error');
    renderComponent();

    await waitFor(() => screen.getByText('Failed to load transactions'));
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });

  // --- Empty ---
  it('shows empty chart message when no transactions', async () => {
    mockFetchSuccess([]);
    renderComponent();

    await waitFor(() => screen.getByText('No transactions to chart.'));
    expect(screen.getByText('No transactions found.')).toBeInTheDocument();
  });

  // --- Success ---
  it('renders the scatter chart when transactions exist', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByTestId('scatter-chart'));
  });

  it('formats XAxis ticks as short dates via tickFormatter', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByTestId('xaxis-tick'));
    const xAxisTick = screen.getByTestId('xaxis-tick');
    // The tickFormatter calls formatDateShort on the timestamp 1705312800000
    expect(xAxisTick.textContent).toBeTruthy();
    expect(xAxisTick.textContent!.length).toBeGreaterThan(0);
  });

  it('formats YAxis ticks as currency via tickFormatter', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByTestId('yaxis-tick'));
    const yAxisTick = screen.getByTestId('yaxis-tick');
    // The tickFormatter calls formatCurrency on the value 9500
    expect(yAxisTick.textContent).toBeTruthy();
    expect(yAxisTick.textContent).toContain('9,500');
  });

  it('displays the transaction count header', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByText('Transaction Detail (5)'));
  });

  it('renders the column headers', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    // "Date" is the default sort column (desc), so it shows "Date ▼"
    await waitFor(() => screen.getByText(/Date.*▼/));
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Amount (INR)')).toBeInTheDocument();
    expect(screen.getByText('Direction')).toBeInTheDocument();
    expect(screen.getByText('Channel')).toBeInTheDocument();
    expect(screen.getByText('Counterparty')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Flagged')).toBeInTheDocument();
  });

  it('renders transaction rows', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByText('Self'));
    expect(screen.getByText('Shell Corp')).toBeInTheDocument();
  });

  it('shows "Yes" badge for flagged transactions', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByText('Yes'));
  });

  it('shows direction badges', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => {
      const credits = screen.getAllByText('credit');
      expect(credits.length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('debit').length).toBeGreaterThanOrEqual(1);
  });

  it('shows dash for null location', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByText('Mumbai'));
    // null locations should show '—'
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  // --- Sorting ---
  it('sorts by Amount when Amount header is clicked', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByText('Amount (INR)'));

    // Click Amount header to sort ascending
    await userEvent.click(screen.getByText('Amount (INR)'));

    // After sort asc, first row should have the smallest amount (5,000 from tx-5)
    const rows = screen.getAllByRole('row');
    // rows[0] is header, rows[1] is first data row
    const firstDataRow = rows[1];
    expect(within(firstDataRow).getByText(/5,000/)).toBeInTheDocument();
  });

  it('toggles sort direction on double click', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByText('Amount (INR)'));

    // Click once for asc — header text becomes "Amount (INR) ▲"
    await userEvent.click(screen.getByText('Amount (INR)'));
    expect(screen.getByText(/Amount \(INR\).*▲/)).toBeInTheDocument();

    // Click again for desc — use regex to match the updated text
    await userEvent.click(screen.getByText(/Amount \(INR\)/));

    // Should show ▼ indicator
    expect(screen.getByText(/Amount \(INR\).*▼/)).toBeInTheDocument();
  });

  it('sorts by Type column', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByText('Type'));

    await userEvent.click(screen.getByText('Type'));

    // Should show ▲ indicator
    expect(screen.getByText(/Type.*▲/)).toBeInTheDocument();
  });

  it('sorts by Flagged column', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByText('Flagged'));

    await userEvent.click(screen.getByText('Flagged'));

    expect(screen.getByText(/Flagged.*▲/)).toBeInTheDocument();
  });

  it('renders tooltip content with date and amount when active', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByTestId('tooltip-active'));
    // The active tooltip should render formatted date and amount
    const tooltipActive = screen.getByTestId('tooltip-active');
    expect(tooltipActive.textContent).toBeTruthy();
  });

  it('renders nothing for inactive tooltip', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByTestId('tooltip-inactive'));
    // Inactive tooltip returns null, so container should be empty
    expect(screen.getByTestId('tooltip-inactive').textContent).toBe('');
  });

  it('sorts by Direction column', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByText('Direction'));

    await userEvent.click(screen.getByText('Direction'));
    expect(screen.getByText(/Direction.*▲/)).toBeInTheDocument();
  });

  it('sorts by Channel column', async () => {
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByText('Channel'));

    await userEvent.click(screen.getByText('Channel'));
    expect(screen.getByText(/Channel.*▲/)).toBeInTheDocument();
  });

  it('exercises null-safe string comparison when sorting by Channel with null values', async () => {
    // tx-3 has channel: null, which exercises the `a[key] ?? ''` / `b[key] ?? ''` fallback
    mockFetchSuccess(MOCK_TRANSACTIONS);
    renderComponent();

    await waitFor(() => screen.getByText('Channel'));

    // Click Channel header to sort ascending — null values sort as empty strings
    await userEvent.click(screen.getByText('Channel'));
    expect(screen.getByText(/Channel.*▲/)).toBeInTheDocument();

    // Click again for descending
    await userEvent.click(screen.getByText(/Channel/));
    expect(screen.getByText(/Channel.*▼/)).toBeInTheDocument();
  });
});

// --- Unit tests for dotColor ---
describe('dotColor', () => {
  it('returns flagged color for flagged transactions', () => {
    const tx = { is_flagged: true, transaction_type: 'cash_deposit' } as Transaction;
    expect(dotColor(tx)).toBe('#DC2626');
  });

  it('returns type color for non-flagged transactions', () => {
    const tx = { is_flagged: false, transaction_type: 'cash_deposit' } as Transaction;
    expect(dotColor(tx)).toBe('#2563EB');
  });

  it('returns default color for unknown transaction type', () => {
    const tx = { is_flagged: false, transaction_type: 'unknown_type' } as Transaction;
    expect(dotColor(tx)).toBe('#94A3B8');
  });
});
