import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

/* Mock useAnalytics so AnalyticsPage renders without a real API */
vi.mock('./hooks/use-analytics', () => ({
  useAnalytics: () => ({
    overview: { total_alerts: 10, open_alerts: 5, avg_investigation_hours: 12, false_positive_rate: 0.3 },
    typologyData: [],
    resolutionData: [],
    riskDistribution: [],
    volumeTrend: [],
    fpTrend: [],
    isLoading: false,
    error: null,
  }),
}));

/* Mock recharts so jsdom does not choke on SVG rendering */
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

describe('App', () => {
  it('renders the AML Sentinel app shell', () => {
    render(<App />);
    expect(screen.getByText('AML Sentinel')).toBeInTheDocument();
  });

  it('renders the alert queue placeholder', () => {
    render(<App />);
    const matches = screen.getAllByText('Alert Queue');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the analytics page at /analytics route', () => {
    window.history.pushState({}, '', '/analytics');
    render(<App />);
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('AML compliance metrics and trends')).toBeInTheDocument();
  });
});
