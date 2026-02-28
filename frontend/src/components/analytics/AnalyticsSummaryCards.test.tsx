import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalyticsSummaryCards } from './AnalyticsSummaryCards';
import type { AnalyticsOverview } from '../../types/analytics';

const MOCK_OVERVIEW: AnalyticsOverview = {
  total_alerts: 120,
  open_alerts: 45,
  closed_alerts: 75,
  average_investigation_days: 3.5,
  false_positive_rate: 0.234,
};

describe('AnalyticsSummaryCards', () => {
  it('renders all four stat cards', () => {
    render(<AnalyticsSummaryCards overview={MOCK_OVERVIEW} />);
    expect(screen.getByText('Total Alerts')).toBeInTheDocument();
    expect(screen.getByText('Open Alerts')).toBeInTheDocument();
    expect(screen.getByText('Avg Investigation (days)')).toBeInTheDocument();
    expect(screen.getByText('False Positive Rate')).toBeInTheDocument();
  });

  it('displays correct values from overview data', () => {
    render(<AnalyticsSummaryCards overview={MOCK_OVERVIEW} />);
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('3.5')).toBeInTheDocument();
    expect(screen.getByText('23.4%')).toBeInTheDocument();
  });

  it('shows dashes when overview is null', () => {
    render(<AnalyticsSummaryCards overview={null} />);
    const dashes = screen.getAllByText('—');
    expect(dashes).toHaveLength(4);
  });

  it('renders the container with test id', () => {
    render(<AnalyticsSummaryCards overview={MOCK_OVERVIEW} />);
    expect(screen.getByTestId('analytics-summary-cards')).toBeInTheDocument();
  });
});
