import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InvestigationDrawerProvider } from '../contexts/InvestigationDrawerContext';
import { AppShell } from '../components/layout/AppShell';
import { InvestigationPage } from './InvestigationPage';
import type { Alert } from '../types/alert';
import type { Customer } from '../types/customer';

// Mock react-force-graph-2d to avoid jsdom canvas/WebGL errors
vi.mock('react-force-graph-2d', () => ({
  default: (props: Record<string, unknown>) => <div data-testid="force-graph-mock" {...(typeof props.width === 'number' ? { style: { width: props.width } } : {})} />,
}));

// Mock useSimilarCases so the SimilarCases component renders without API
vi.mock('../hooks/use-similar-cases', () => ({
  useSimilarCases: () => ({
    similarCases: [],
    isLoading: false,
    error: null,
  }),
}));

const MOCK_ALERT: Alert = {
  id: 'uuid-1',
  alert_id: 'S001',
  customer_id: 'CUST-1',
  typology: 'Structuring',
  risk_score: 85,
  status: 'New',
  title: 'Suspicious cash structuring detected',
  description: null,
  triggered_date: '2024-01-15T10:00:00Z',
  assigned_analyst: null,
  resolution: null,
  closed_at: null,
  total_flagged_amount: 50000,
  flagged_transaction_count: 12,
};

const MOCK_CUSTOMER: Customer = {
  id: 'cust-1',
  full_name: 'Priya Sharma',
  date_of_birth: '1985-06-15',
  nationality: 'Indian',
  occupation: 'Software Engineer',
  employer: 'TechCorp Pvt Ltd',
  declared_annual_income: 1500000,
  risk_category: 'Medium',
  customer_since: '2018-03-01T00:00:00Z',
  id_type: 'Aadhaar',
  id_number: '1234-5678-9012',
  address: '42 MG Road, Bengaluru',
  phone: '+91-9876543210',
  email: 'priya@example.com',
  pep_status: false,
  previous_alert_count: 2,
  accounts: [],
};

/** Mount InvestigationPage inside AppShell + provider so sidebar sections are accessible. */
function renderPage(alertId = 'uuid-1') {
  return render(
    <MemoryRouter initialEntries={[`/investigation/${alertId}`]}>
      <InvestigationDrawerProvider>
        <AppShell>
          <Routes>
            <Route path="/investigation/:alertId" element={<InvestigationPage />} />
          </Routes>
        </AppShell>
      </InvestigationDrawerProvider>
    </MemoryRouter>
  );
}

/**
 * Mock fetch to return the right data based on the URL.
 * Each section component makes its own API call, so we route by endpoint.
 */
function mockFetchSuccess() {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/customer')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_CUSTOMER) });
    }
    if (url.includes('/transactions')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (url.includes('/network')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ nodes: [], edges: [] }) });
    }
    if (url.includes('/notes')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (url.includes('/checklist')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (url.includes('/audit-trail')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (url.includes('/sar')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (url.includes('/status')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...MOCK_ALERT, status: 'In Progress' }) });
    }
    // Default: alert detail
    return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_ALERT) });
  });
}

/** Get a sidebar section button by its aria-label, scoped to the navigation. */
function getSidebarButton(section: string) {
  const sidebar = within(screen.getByRole('navigation', { name: 'Investigation sections' }));
  return sidebar.getByLabelText(section);
}

function mockFetchFailure(detail: string) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    json: () => Promise.resolve({ detail }),
  });
}

describe('InvestigationPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a loading spinner while data is fetching', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the alert header once the fetch completes', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Suspicious cash structuring detected')).toBeInTheDocument()
    );
  });

  it('renders the icon sidebar navigation', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    expect(screen.getByRole('navigation', { name: 'Investigation sections' })).toBeInTheDocument();
  });

  it('renders all 8 investigation section buttons in the sidebar', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    const sidebar = within(screen.getByRole('navigation', { name: 'Investigation sections' }));
    for (const section of ['Overview', 'Transactions', 'Network', 'Notes', 'Checklist', 'Audit Trail', 'SAR', 'Similar Cases']) {
      expect(sidebar.getByLabelText(section)).toBeInTheDocument();
    }
  });

  it('shows the CustomerProfile on the Overview section by default', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    // Overview (CustomerProfile) loads customer data
    await waitFor(() => {
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const customerCall = fetchCalls.find((call: [string]) => call[0].includes('/customer'));
      expect(customerCall).toBeDefined();
    });
  });

  it('switches to the Notes section when clicked', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    await userEvent.click(getSidebarButton('Notes'));

    // Notes section fetches /notes
    await waitFor(() => {
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const notesCall = fetchCalls.find((call: [string]) => call[0].includes('/notes'));
      expect(notesCall).toBeDefined();
    });
  });

  it('switches to the Checklist section when clicked', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    await userEvent.click(getSidebarButton('Checklist'));

    await waitFor(() => {
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const checklistCall = fetchCalls.find((call: [string]) => call[0].includes('/checklist'));
      expect(checklistCall).toBeDefined();
    });
  });

  it('switches to the Audit Trail section when clicked', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    await userEvent.click(getSidebarButton('Audit Trail'));

    await waitFor(() => {
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const auditCall = fetchCalls.find((call: [string]) => call[0].includes('/audit-trail'));
      expect(auditCall).toBeDefined();
    });
  });

  it('switches to the SAR section when clicked', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    await userEvent.click(getSidebarButton('SAR'));

    await waitFor(() => {
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const sarCall = fetchCalls.find((call: [string]) => call[0].includes('/sar'));
      expect(sarCall).toBeDefined();
    });
  });

  it('shows the empty-state error view on a failed fetch', async () => {
    mockFetchFailure('Alert not found');
    renderPage('bad-id');

    await waitFor(() => {
      const matches = screen.getAllByText('Alert not found');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    // Sidebar investigation sections still render (they live in AppShell, driven by route)
    expect(screen.getByRole('navigation', { name: 'Investigation sections' })).toBeInTheDocument();
  });

  it('renders the risk score indicator', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    expect(screen.getByLabelText('Risk score: 85')).toBeInTheDocument();
  });

  it('renders the breadcrumb with Alert Queue link', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    const alertQueueLinks = screen.getAllByText('Alert Queue');
    expect(alertQueueLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the Change Status button for non-closed alerts', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    expect(screen.getByText('Change Status')).toBeInTheDocument();
  });

  it('triggers handleStatusChanged after completing a status transition', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    // Open the status change modal
    await userEvent.click(screen.getByText('Change Status'));

    // The modal should appear with the dialog role
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Change alert status' })).toBeInTheDocument()
    );

    // Select 'In Progress' as the new status (current is 'New', so STATUS_FLOW['New'] = ['In Progress'])
    await userEvent.click(screen.getByText('In Progress'));

    // Type a rationale
    await userEvent.type(
      screen.getByLabelText('Rationale (required)'),
      'Analyst beginning investigation'
    );

    // Submit the form
    await userEvent.click(screen.getByText('Confirm'));

    // Verify the PATCH fetch was called for the status update
    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const statusCall = calls.find(
        (call: [string, ...unknown[]]) =>
          (call[0] as string).includes('/status') &&
          (call[1] as RequestInit | undefined)?.method === 'PATCH'
      );
      expect(statusCall).toBeDefined();
    });

    // After successful status change, the modal should close
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Change alert status' })).not.toBeInTheDocument()
    );
  });

  it('renders the AI chat panel', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    expect(screen.getByText('AI Investigation Chat')).toBeInTheDocument();
  });

  it('switches to the Transactions section when clicked', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    await userEvent.click(getSidebarButton('Transactions'));

    await waitFor(() => {
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const txnCall = fetchCalls.find((call: [string]) => call[0].includes('/transactions'));
      expect(txnCall).toBeDefined();
    });
  });

  it('switches to the Network section when clicked', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    await userEvent.click(getSidebarButton('Network'));

    // Network section should render without crashing
    expect(screen.getByRole('navigation', { name: 'Investigation sections' })).toBeInTheDocument();
  });

  it('handles missing alertId param gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null),
    });

    render(
      <MemoryRouter initialEntries={['/investigation/']}>
        <InvestigationDrawerProvider>
          <AppShell>
            <Routes>
              <Route path="/investigation/" element={<InvestigationPage />} />
            </Routes>
          </AppShell>
        </InvestigationDrawerProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('The requested alert could not be loaded.')).toBeInTheDocument();
    });
  });

  it('shows default error message when error is null but alert is also null', async () => {
    // fetch resolves with null (simulating unexpected empty response)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null),
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('The requested alert could not be loaded.')).toBeInTheDocument();
    });
  });

  it('renders SimilarCases component when that section is active', async () => {
    mockFetchSuccess();
    renderPage();

    await waitFor(() => screen.getByText('Suspicious cash structuring detected'));

    await userEvent.click(getSidebarButton('Similar Cases'));

    expect(screen.getByText('No similar cases found')).toBeInTheDocument();
  });
});
