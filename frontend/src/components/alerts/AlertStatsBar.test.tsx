import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertStatsBar } from './AlertStatsBar';
import type { AlertStats } from '../../types/alert';

const MOCK_STATS: AlertStats = {
  total_alerts: 42,
  open_alerts: 18,
  high_risk_count: 7,
};

describe('AlertStatsBar', () => {
  it('renders all three stat cards with correct values', () => {
    render(<AlertStatsBar stats={MOCK_STATS} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders correct stat labels', () => {
    render(<AlertStatsBar stats={MOCK_STATS} />);

    expect(screen.getByText('Total Alerts')).toBeInTheDocument();
    expect(screen.getByText('Open Alerts')).toBeInTheDocument();
    expect(screen.getByText('High Risk')).toBeInTheDocument();
  });

  it('renders loading skeleton when stats is null', () => {
    render(<AlertStatsBar stats={null} />);

    const region = screen.getByLabelText('Alert statistics loading');
    expect(region).toBeInTheDocument();
    // Should not render actual numbers
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  it('has accessible region label when stats loaded', () => {
    render(<AlertStatsBar stats={MOCK_STATS} />);
    expect(screen.getByRole('region', { name: 'Alert statistics' })).toBeInTheDocument();
  });
});
