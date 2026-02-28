import { describe, it, expect, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AnalyticsPage } from './AnalyticsPage';
import { useAnalytics } from '../hooks/use-analytics';
import type { UseAnalyticsReturn } from '../hooks/use-analytics';

vi.mock('../hooks/use-analytics');

/* Mock recharts — jsdom does not support SVG rendering */
vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  );
  const MockBarChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  );
  const MockPieChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  );
  const MockLineChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  );
  const Noop = () => null;

  return {
    ResponsiveContainer: MockResponsiveContainer,
    BarChart: MockBarChart,
    Bar: Noop,
    PieChart: MockPieChart,
    Pie: Noop,
    Cell: Noop,
    LineChart: MockLineChart,
    Line: Noop,
    XAxis: Noop,
    YAxis: Noop,
    CartesianGrid: Noop,
    Tooltip: Noop,
    Legend: Noop,
  };
});

const mockedUseAnalytics = useAnalytics as Mock;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/analytics']}>
      <AnalyticsPage />
    </MemoryRouter>,
  );
}

/** Fully-loaded mock data returned by useAnalytics */
const loadedState: UseAnalyticsReturn = {
  overview: {
    total_alerts: 50,
    open_alerts: 12,
    average_investigation_days: 3.5,
    false_positive_rate: 0.25,
  },
  typologyData: [
    { typology: 'Structuring', count: 10 },
    { typology: 'Rapid Fund Movement', count: 7 },
  ],
  resolutionData: [
    { resolution: 'SAR Filed', count: 5 },
    { resolution: 'No Suspicion', count: 20 },
  ],
  riskDistribution: [
    { range: '0-20', count: 4 },
    { range: '81-100', count: 8 },
  ],
  volumeTrend: [
    { date: '2025-01-20', count: 3 },
    { date: '2025-01-21', count: 6 },
  ],
  fpTrend: [
    { week: '2025-W04', total_closed: 10, false_positive_count: 3, rate: 0.3 },
  ],
  isLoading: false,
  error: null,
};

describe('AnalyticsPage', () => {
  it('shows a loading spinner while data is loading', () => {
    mockedUseAnalytics.mockReturnValue({
      ...loadedState,
      overview: null,
      typologyData: [],
      resolutionData: [],
      riskDistribution: [],
      volumeTrend: [],
      fpTrend: [],
      isLoading: true,
      error: null,
    });

    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows an error message when fetching fails', () => {
    mockedUseAnalytics.mockReturnValue({
      ...loadedState,
      overview: null,
      typologyData: [],
      resolutionData: [],
      riskDistribution: [],
      volumeTrend: [],
      fpTrend: [],
      isLoading: false,
      error: 'Network error',
    });

    renderPage();

    expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('renders page title and subtitle', () => {
    mockedUseAnalytics.mockReturnValue(loadedState);
    renderPage();

    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('AML compliance metrics and trends')).toBeInTheDocument();
  });

  it('renders the AnalyticsSummaryCards component', () => {
    mockedUseAnalytics.mockReturnValue(loadedState);
    renderPage();

    expect(screen.getByTestId('analytics-summary-cards')).toBeInTheDocument();
  });

  it('renders all five chart components when data is loaded', () => {
    mockedUseAnalytics.mockReturnValue(loadedState);
    renderPage();

    expect(screen.getByText('Alerts by Typology')).toBeInTheDocument();
    expect(screen.getByText('Resolution Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Risk Score Distribution')).toBeInTheDocument();
    expect(screen.getByText('Alert Volume Trend')).toBeInTheDocument();
    expect(screen.getByText('False Positive Rate Trend')).toBeInTheDocument();
  });

  it('does not show loading spinner when data is loaded', () => {
    mockedUseAnalytics.mockReturnValue(loadedState);
    renderPage();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not show error message when no error exists', () => {
    mockedUseAnalytics.mockReturnValue(loadedState);
    renderPage();

    expect(screen.queryByText('Failed to load analytics')).not.toBeInTheDocument();
  });
});
