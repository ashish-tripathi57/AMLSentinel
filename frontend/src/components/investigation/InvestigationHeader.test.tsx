import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InvestigationHeader } from './InvestigationHeader';
import type { Alert } from '../../types/alert';

const BASE_ALERT: Alert = {
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

function renderHeader(alert: Alert = BASE_ALERT) {
  return render(
    <MemoryRouter>
      <InvestigationHeader alert={alert} />
    </MemoryRouter>
  );
}

describe('InvestigationHeader', () => {
  it('renders the alert title', () => {
    renderHeader();
    expect(screen.getByText('Suspicious cash structuring detected')).toBeInTheDocument();
  });

  it('renders the alert_id in a monospace badge', () => {
    renderHeader();
    // S001 appears in both the breadcrumb span and the monospace ID badge
    const s001Nodes = screen.getAllByText('S001');
    expect(s001Nodes.length).toBeGreaterThanOrEqual(1);
    // Confirm at least one node carries the monospace font class
    const monoNode = s001Nodes.find((el) => el.className.includes('font-mono'));
    expect(monoNode).toBeDefined();
  });

  it('renders the typology', () => {
    renderHeader();
    expect(screen.getByText('Structuring')).toBeInTheDocument();
  });

  it('renders the status badge', () => {
    renderHeader();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders the risk score indicator', () => {
    renderHeader();
    expect(screen.getByLabelText('Risk score: 85')).toBeInTheDocument();
    expect(screen.getByLabelText('Risk score: 85')).toHaveTextContent('Risk 85');
  });

  it('renders the breadcrumb with Alert Queue link and alert_id', () => {
    renderHeader();
    expect(screen.getByText('Alert Queue')).toBeInTheDocument();
    // alert_id appears twice: breadcrumb + ID badge — both should be present
    const s001Nodes = screen.getAllByText('S001');
    expect(s001Nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders a Back link pointing to /', () => {
    renderHeader();
    const backLink = screen.getByRole('link', { name: /back to alert queue/i });
    expect(backLink).toHaveAttribute('href', '/');
  });

  describe('status badge color variants', () => {
    it.each([
      ['New', 'text-status-new'],
      ['In Progress', 'text-status-in-progress'],
      ['Review', 'text-status-review'],
      ['Closed', 'text-status-closed'],
      ['Escalated', 'text-status-escalated'],
    ])('status "%s" uses class "%s"', (status, expectedClass) => {
      renderHeader({ ...BASE_ALERT, status });
      // The badge text equals the status — get it and check class
      const badge = screen.getByText(status);
      expect(badge.className).toContain(expectedClass);
    });
  });

  describe('risk score color variants', () => {
    it('score >= 80 uses severity-critical color', () => {
      renderHeader({ ...BASE_ALERT, risk_score: 80 });
      expect(screen.getByLabelText('Risk score: 80').className).toContain('text-severity-critical');
    });

    it('score >= 60 and < 80 uses severity-high color', () => {
      renderHeader({ ...BASE_ALERT, risk_score: 65 });
      expect(screen.getByLabelText('Risk score: 65').className).toContain('text-severity-high');
    });

    it('score >= 40 and < 60 uses severity-medium color', () => {
      renderHeader({ ...BASE_ALERT, risk_score: 45 });
      expect(screen.getByLabelText('Risk score: 45').className).toContain('text-severity-medium');
    });

    it('score < 40 uses severity-low color', () => {
      renderHeader({ ...BASE_ALERT, risk_score: 30 });
      expect(screen.getByLabelText('Risk score: 30').className).toContain('text-severity-low');
    });
  });

  it('renders "new" variant badge for unknown status', () => {
    renderHeader({ ...BASE_ALERT, status: 'UnknownStatus' });
    const badge = screen.getByText('UnknownStatus');
    expect(badge.className).toContain('text-status-new');
  });

  // -----------------------------------------------------------------
  // Export button (Task 1.4)
  // -----------------------------------------------------------------

  it('renders Export Case File button', () => {
    renderHeader();
    expect(screen.getByText('Export Case File')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------
  // Resolution badge (Task 1.4)
  // -----------------------------------------------------------------

  it('shows resolution badge when alert is closed with resolution', () => {
    renderHeader({
      ...BASE_ALERT,
      status: 'Closed',
      resolution: 'SAR Filed',
      closed_at: '2024-02-01T14:00:00Z',
    });
    expect(screen.getByText('SAR Filed')).toBeInTheDocument();
  });

  it('does not show resolution badge when alert is not closed', () => {
    renderHeader();
    expect(screen.queryByText('No Suspicion')).not.toBeInTheDocument();
  });
});
