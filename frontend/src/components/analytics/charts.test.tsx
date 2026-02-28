import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypologyBarChart } from './TypologyBarChart';
import { ResolutionDonutChart } from './ResolutionDonutChart';
import { RiskDistributionChart } from './RiskDistributionChart';
import { AlertVolumeTrendChart } from './AlertVolumeTrendChart';
import { FalsePositiveTrendChart } from './FalsePositiveTrendChart';

// Mock recharts — jsdom does not support SVG rendering
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

// ---------------------------------------------------------------------------
// TypologyBarChart
// ---------------------------------------------------------------------------

describe('TypologyBarChart', () => {
  const mockData = [
    { typology: 'Structuring', count: 8 },
    { typology: 'Rapid Fund Movement', count: 5 },
  ];

  it('renders chart container with title', () => {
    render(<TypologyBarChart data={mockData} />);
    expect(screen.getByText('Alerts by Typology')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders empty message when no data', () => {
    render(<TypologyBarChart data={[]} />);
    expect(screen.getByText('No typology data available')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ResolutionDonutChart
// ---------------------------------------------------------------------------

describe('ResolutionDonutChart', () => {
  const mockData = [
    { resolution: 'No Suspicion', count: 10 },
    { resolution: 'SAR Filed', count: 5 },
  ];

  it('renders chart container with title', () => {
    render(<ResolutionDonutChart data={mockData} />);
    expect(screen.getByText('Resolution Breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('renders empty message when no data', () => {
    render(<ResolutionDonutChart data={[]} />);
    expect(screen.getByText('No resolution data available')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// RiskDistributionChart
// ---------------------------------------------------------------------------

describe('RiskDistributionChart', () => {
  const mockData = [
    { range: '0-20', count: 3 },
    { range: '21-40', count: 5 },
    { range: '41-60', count: 8 },
    { range: '61-80', count: 4 },
    { range: '81-100', count: 2 },
  ];

  it('renders chart container with title', () => {
    render(<RiskDistributionChart data={mockData} />);
    expect(screen.getByText('Risk Score Distribution')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders empty message when no data', () => {
    render(<RiskDistributionChart data={[]} />);
    expect(screen.getByText('No risk distribution data available')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AlertVolumeTrendChart
// ---------------------------------------------------------------------------

describe('AlertVolumeTrendChart', () => {
  const mockData = [
    { date: '2025-01-20', count: 3 },
    { date: '2025-01-21', count: 5 },
  ];

  it('renders chart container with title', () => {
    render(<AlertVolumeTrendChart data={mockData} />);
    expect(screen.getByText('Alert Volume Trend')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders empty message when no data', () => {
    render(<AlertVolumeTrendChart data={[]} />);
    expect(screen.getByText('No volume trend data available')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// FalsePositiveTrendChart
// ---------------------------------------------------------------------------

describe('FalsePositiveTrendChart', () => {
  const mockData = [
    { week: '2025-W04', total_closed: 10, false_positive_count: 3, rate: 0.3 },
    { week: '2025-W05', total_closed: 8, false_positive_count: 2, rate: 0.25 },
  ];

  it('renders chart container with title', () => {
    render(<FalsePositiveTrendChart data={mockData} />);
    expect(screen.getByText('False Positive Rate Trend')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders empty message when no data', () => {
    render(<FalsePositiveTrendChart data={[]} />);
    expect(screen.getByText('No false positive trend data available')).toBeInTheDocument();
  });
});
