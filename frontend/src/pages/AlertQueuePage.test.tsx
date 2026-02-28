import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InvestigationDrawerProvider } from '../contexts/InvestigationDrawerContext';
import { AlertQueuePage } from './AlertQueuePage';
import type { Alert, AlertsResponse, AlertStats } from '../types/alert';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_ALERT: Alert = {
  id: 'uuid-1',
  alert_id: 'S001',
  customer_id: 'cust-1',
  typology: 'Structuring',
  risk_score: 85,
  status: 'New',
  title: 'Suspicious structuring pattern',
  description: null,
  triggered_date: '2024-01-10T08:00:00Z',
  assigned_analyst: 'sarah.chen',
  total_flagged_amount: 500000,
  flagged_transaction_count: 3,
  resolution: null,
  closed_at: null,
};

const MOCK_RESPONSE: AlertsResponse = { alerts: [MOCK_ALERT], total: 1 };
const MOCK_STATS: AlertStats = {
  total_alerts: 10,
  open_alerts: 6,
  high_risk_count: 3,
  closed_count: 2,
  unassigned_count: 4,
};

function makeFetchMock(
  alertsPayload: AlertsResponse = MOCK_RESPONSE,
  statsPayload: AlertStats = MOCK_STATS
) {
  return vi.fn().mockImplementation((url: string) => {
    if ((url as string).includes('/stats')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(statsPayload) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(alertsPayload) });
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <InvestigationDrawerProvider>
        <AlertQueuePage />
      </InvestigationDrawerProvider>
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AlertQueuePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = makeFetchMock();
  });

  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Alert Queue' })).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    renderPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders alerts after loading completes', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.getByText('S001')).toBeInTheDocument();
    expect(screen.getByText('Suspicious structuring pattern')).toBeInTheDocument();
  });

  it('renders stats bar with values after loading', async () => {
    renderPage();
    const statsRegion = await waitFor(() =>
      screen.getByRole('region', { name: 'Alert statistics' })
    );

    const stats = within(statsRegion);
    expect(stats.getByText('10')).toBeInTheDocument();
    expect(stats.getByText('6')).toBeInTheDocument();
    expect(stats.getByText('3')).toBeInTheDocument();
  });

  it('renders empty state when no alerts returned', async () => {
    global.fetch = makeFetchMock({ alerts: [], total: 0 });
    renderPage();

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.getByText('No alerts found')).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/stats')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_STATS) });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ detail: 'Database unavailable' }),
      });
    });

    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.getByText('Failed to load alerts')).toBeInTheDocument();
    expect(screen.getByText('Database unavailable')).toBeInTheDocument();
  });

  it('renders pagination when there are alerts', async () => {
    global.fetch = makeFetchMock({ alerts: [MOCK_ALERT], total: 50 });
    renderPage();

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Next page')).toBeInTheDocument();
  });

  it('disables previous page button on first page', async () => {
    global.fetch = makeFetchMock({ alerts: [MOCK_ALERT], total: 50 });
    renderPage();

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.getByLabelText('Previous page')).toBeDisabled();
  });

  it('enables next page button when more pages exist', async () => {
    global.fetch = makeFetchMock({ alerts: [MOCK_ALERT], total: 50 });
    renderPage();

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.getByLabelText('Next page')).not.toBeDisabled();
  });

  it('disables next page button on last page', async () => {
    global.fetch = makeFetchMock({ alerts: [MOCK_ALERT], total: 1 });
    renderPage();

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('shows total count in pagination footer', async () => {
    global.fetch = makeFetchMock({ alerts: [MOCK_ALERT], total: 42 });
    renderPage();

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders filter bar above the table', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.getByRole('search', { name: 'Alert filters' })).toBeInTheDocument();
  });

  it('re-fetches when typology filter changes', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    const fetchCallCountBefore = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    /* Open popover first, then change the typology */
    fireEvent.click(screen.getByLabelText('Filter'));
    fireEvent.change(screen.getByLabelText('Filter by typology'), {
      target: { value: 'Layering' },
    });

    await waitFor(() => {
      const callCountAfter = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(callCountAfter).toBeGreaterThan(fetchCallCountBefore);
    });
  });

  it('navigates to next page when Next is clicked', async () => {
    global.fetch = makeFetchMock({ alerts: [MOCK_ALERT], total: 50 });
    renderPage();

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Next page'));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastUrl = calls[calls.length - 1][0] as string;
      expect(lastUrl).toContain('offset=20');
    });
  });

  it('navigates to previous page when Previous is clicked after navigating to page 2', async () => {
    global.fetch = makeFetchMock({ alerts: [MOCK_ALERT], total: 50 });
    renderPage();

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Next page'));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastUrl = calls[calls.length - 1][0] as string;
      expect(lastUrl).toContain('offset=20');
    });

    fireEvent.click(screen.getByLabelText('Previous page'));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastUrl = calls[calls.length - 1][0] as string;
      expect(lastUrl).toContain('offset=0');
    });
  });

  it('sorts alerts when a column header is clicked', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    fireEvent.click(screen.getByText('Risk Score'));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastUrl = calls[calls.length - 1][0] as string;
      expect(lastUrl).toContain('sort_by=risk_score');
    });
  });

  it('shows no pagination when no alerts', async () => {
    global.fetch = makeFetchMock({ alerts: [], total: 0 });
    renderPage();

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.queryByLabelText('Previous page')).not.toBeInTheDocument();
  });

  // ---- Tabs tests ----

  it('renders Alert Queue tabs', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.getByRole('tab', { name: /open/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /my alerts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /completed/i })).toBeInTheDocument();
  });

  it('defaults to Open tab as active', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.getByRole('tab', { name: /open/i })).toHaveAttribute('aria-selected', 'true');
  });

  // ---- Selection state tests ----

  it('renders select-all checkbox in the table', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.getByLabelText('Select all alerts')).toBeInTheDocument();
  });

  it('shows bulk action bar when alerts are selected', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Select alert S001'));

    expect(screen.getByText('1 alert selected')).toBeInTheDocument();
  });

  it('hides bulk action bar when selection is cleared', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    // Select
    fireEvent.click(screen.getByLabelText('Select alert S001'));
    expect(screen.getByText('1 alert selected')).toBeInTheDocument();

    // Clear via bulk action bar — use exact text to avoid collision with "Clear all" in filter bar
    fireEvent.click(screen.getByRole('button', { name: /^clear$/i }));
    expect(screen.queryByText('1 alert selected')).not.toBeInTheDocument();
  });

  // ---- Items per page dropdown ----

  it('renders items per page dropdown in pagination', async () => {
    global.fetch = makeFetchMock({ alerts: [MOCK_ALERT], total: 50 });
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.getByLabelText('Items per page')).toBeInTheDocument();
  });

  // ---- Tab switching sends correct filters ----

  it('sends open status filter on initial load', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const alertsCall = calls.find((c: [string]) => !c[0].includes('/stats'));
    expect(alertsCall).toBeDefined();
    expect(alertsCall![0]).toContain('status=New');
  });

  it('sends __unassigned__ filter when Unassigned tab is clicked', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: /unassigned/i }));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastUrl = calls[calls.length - 1][0] as string;
      expect(lastUrl).toContain('assigned_analyst=__unassigned__');
    });
  });

  it('sends Closed status filter when Completed tab is clicked', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: /completed/i }));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastUrl = calls[calls.length - 1][0] as string;
      expect(lastUrl).toContain('status=Closed');
    });
  });

  it('sends analyst username filter when My Alerts tab is clicked', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: /my alerts/i }));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastUrl = calls[calls.length - 1][0] as string;
      expect(lastUrl).toContain('assigned_analyst=analyst.one');
    });
  });

  it('shows correct completed count from stats', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    const completedTab = screen.getByRole('tab', { name: /completed/i });
    expect(within(completedTab).getByText('2')).toBeInTheDocument();
  });

  it('shows correct unassigned count from stats', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    const unassignedTab = screen.getByRole('tab', { name: /unassigned/i });
    expect(within(unassignedTab).getByText('4')).toBeInTheDocument();
  });

  // ---- Export button ----

  it('renders the Export Queue button', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    expect(screen.getByRole('button', { name: /export queue/i })).toBeInTheDocument();
  });
});
