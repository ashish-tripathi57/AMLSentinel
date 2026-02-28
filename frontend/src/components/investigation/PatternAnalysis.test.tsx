import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PatternAnalysis } from './PatternAnalysis';
import type { PatternAnalysisResponse } from '../../hooks/use-pattern-analysis';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_ANALYSIS: PatternAnalysisResponse = {
  summary: 'Multiple structuring patterns detected across 30-day window.',
  patterns: [
    {
      name: 'Structuring',
      description: 'Repeated deposits just below the $10,000 reporting threshold.',
      severity: 'high',
    },
    {
      name: 'Rapid Movement',
      description: 'Funds transferred within 24 hours of deposit.',
      severity: 'medium',
    },
  ],
  risk_indicators: [
    { indicator: 'Frequent cash deposits', level: 'high', detail: '15 deposits in 30 days' },
    { indicator: 'Unusual geography', level: 'medium', detail: 'Transactions from 3 countries' },
    { indicator: 'Low account age', level: 'low', detail: 'Account opened 45 days ago' },
  ],
};

function mockFetchSuccess(data: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchFailure(detail: string) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ detail }),
  });
}

function renderComponent(alertId = 'alert-1') {
  return render(
    <MemoryRouter>
      <PatternAnalysis alertId={alertId} />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PatternAnalysis', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ---- Loading state -------------------------------------------------------

  it('shows loading spinner while analysis is being fetched', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    renderComponent();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/generating pattern analysis/i)).toBeInTheDocument();
  });

  // ---- Error state ---------------------------------------------------------

  it('shows error message when the fetch fails', async () => {
    mockFetchFailure('Pattern service unavailable');
    renderComponent();

    await waitFor(() =>
      expect(screen.getByText(/failed to load analysis/i)).toBeInTheDocument()
    );
    expect(screen.getByText('Pattern service unavailable')).toBeInTheDocument();
  });

  // ---- Success state -------------------------------------------------------

  it('renders the analysis summary card', async () => {
    mockFetchSuccess(MOCK_ANALYSIS);
    renderComponent();

    await waitFor(() =>
      expect(screen.getByText('Analysis Summary')).toBeInTheDocument()
    );
    expect(
      screen.getByText('Multiple structuring patterns detected across 30-day window.')
    ).toBeInTheDocument();
  });

  it('renders all detected pattern cards with names and descriptions', async () => {
    mockFetchSuccess(MOCK_ANALYSIS);
    renderComponent();

    await waitFor(() =>
      expect(screen.getByText('Structuring')).toBeInTheDocument()
    );

    expect(
      screen.getByText('Repeated deposits just below the $10,000 reporting threshold.')
    ).toBeInTheDocument();
    expect(screen.getByText('Rapid Movement')).toBeInTheDocument();
    expect(
      screen.getByText('Funds transferred within 24 hours of deposit.')
    ).toBeInTheDocument();
  });

  it('renders severity badges for each pattern', async () => {
    mockFetchSuccess(MOCK_ANALYSIS);
    renderComponent();

    await waitFor(() =>
      expect(screen.getByText('Detected Patterns')).toBeInTheDocument()
    );

    // 'high' appears in both the pattern SeverityBadge and the risk indicator
    // RiskLevelBadge, so we use getAllByText and assert at least one is present.
    expect(screen.getAllByText('high').length).toBeGreaterThan(0);
    // 'medium' similarly appears in both sections
    expect(screen.getAllByText('medium').length).toBeGreaterThan(0);
  });

  it('renders all risk indicators with their levels and details', async () => {
    mockFetchSuccess(MOCK_ANALYSIS);
    renderComponent();

    await waitFor(() =>
      expect(screen.getByText('Risk Indicators')).toBeInTheDocument()
    );

    expect(screen.getByText('Frequent cash deposits')).toBeInTheDocument();
    expect(screen.getByText('15 deposits in 30 days')).toBeInTheDocument();
    expect(screen.getByText('Unusual geography')).toBeInTheDocument();
    expect(screen.getByText('Transactions from 3 countries')).toBeInTheDocument();
    expect(screen.getByText('Low account age')).toBeInTheDocument();
    expect(screen.getByText('Account opened 45 days ago')).toBeInTheDocument();
  });

  it('renders the tabpanel with the correct aria-label', async () => {
    mockFetchSuccess(MOCK_ANALYSIS);
    renderComponent();

    // The tabpanel aria-label is present in all states; wait for success state
    await waitFor(() =>
      expect(screen.getByRole('tabpanel', { name: 'Pattern Analysis' })).toBeInTheDocument()
    );
  });

  it('does not crash when patterns array is empty', async () => {
    const emptyPatterns: PatternAnalysisResponse = {
      ...MOCK_ANALYSIS,
      patterns: [],
    };
    mockFetchSuccess(emptyPatterns);
    renderComponent();

    await waitFor(() =>
      expect(screen.getByText('Analysis Summary')).toBeInTheDocument()
    );
    expect(screen.queryByText('Detected Patterns')).not.toBeInTheDocument();
  });

  it('does not crash when risk_indicators array is empty', async () => {
    const noIndicators: PatternAnalysisResponse = {
      ...MOCK_ANALYSIS,
      risk_indicators: [],
    };
    mockFetchSuccess(noIndicators);
    renderComponent();

    await waitFor(() =>
      expect(screen.getByText('Analysis Summary')).toBeInTheDocument()
    );
    expect(screen.queryByText('Risk Indicators')).not.toBeInTheDocument();
  });

  it('renders "low" severity badge for low severity patterns', async () => {
    const lowSeverity: PatternAnalysisResponse = {
      summary: 'Minor findings.',
      patterns: [
        { name: 'Low Risk Pattern', description: 'Minor anomaly.', severity: 'low' },
      ],
      risk_indicators: [],
    };
    mockFetchSuccess(lowSeverity);
    renderComponent();

    await waitFor(() => screen.getByText('Low Risk Pattern'));
    expect(screen.getByText('low')).toBeInTheDocument();
  });

  it('returns null when analysis is null without error or loading', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null),
    });
    const { container } = renderComponent();

    // Wait for loading to finish
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    // Component returns null for !analysis when not loading and no error
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
    expect(container.textContent).toBe('');
  });
});
