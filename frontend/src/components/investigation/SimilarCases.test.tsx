import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SimilarCases } from './SimilarCases';
import type { SimilarCase } from '../../types/investigation';

vi.mock('../../hooks/use-similar-cases', () => ({
  useSimilarCases: vi.fn(),
}));

import { useSimilarCases } from '../../hooks/use-similar-cases';

const mockUseSimilarCases = vi.mocked(useSimilarCases);

const MOCK_CASES: SimilarCase[] = [
  {
    id: 'case-1',
    alert_id: 'S001',
    title: 'Suspicious cash structuring detected',
    typology: 'Structuring',
    risk_score: 85,
    status: 'Closed',
    resolution: 'Confirmed',
    similarity_score: 92,
    matching_factors: ['Same typology', 'Similar amount range', 'Same branch'],
  },
  {
    id: 'case-2',
    alert_id: 'S002',
    title: 'Rapid movement of funds',
    typology: 'Layering',
    risk_score: 65,
    status: 'In Progress',
    resolution: null,
    similarity_score: 55,
    matching_factors: ['Similar transaction pattern'],
  },
  {
    id: 'case-3',
    alert_id: 'S003',
    title: 'Low risk account activity',
    typology: 'Structuring',
    risk_score: 25,
    status: 'New',
    resolution: null,
    similarity_score: 30,
    matching_factors: ['Same typology'],
  },
];

/** Wraps SimilarCases in a MemoryRouter so Link components work. */
function renderComponent(alertId = 'alert-1') {
  return render(
    <MemoryRouter>
      <SimilarCases alertId={alertId} />
    </MemoryRouter>
  );
}

describe('SimilarCases', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading spinner while data is fetching', () => {
    mockUseSimilarCases.mockReturnValue({
      similarCases: [],
      isLoading: true,
      error: null,
    });

    renderComponent();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', () => {
    mockUseSimilarCases.mockReturnValue({
      similarCases: [],
      isLoading: false,
      error: 'Network error',
    });

    renderComponent();
    expect(screen.getByText('Failed to load similar cases')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('shows empty state when no similar cases found', () => {
    mockUseSimilarCases.mockReturnValue({
      similarCases: [],
      isLoading: false,
      error: null,
    });

    renderComponent();
    expect(screen.getByText('No similar cases found')).toBeInTheDocument();
  });

  it('renders case cards with all fields', () => {
    mockUseSimilarCases.mockReturnValue({
      similarCases: MOCK_CASES,
      isLoading: false,
      error: null,
    });

    renderComponent();

    /* Case 1 fields */
    expect(screen.getByText('S001')).toBeInTheDocument();
    expect(screen.getByText('Suspicious cash structuring detected')).toBeInTheDocument();
    /* "Structuring" appears for case-1 and case-3 */
    expect(screen.getAllByText('Structuring')).toHaveLength(2);
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();

    /* Case 2 fields */
    expect(screen.getByText('S002')).toBeInTheDocument();
    expect(screen.getByText('Rapid movement of funds')).toBeInTheDocument();
    expect(screen.getByText('Layering')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders clickable alert_id links that navigate to investigation page', () => {
    mockUseSimilarCases.mockReturnValue({
      similarCases: MOCK_CASES,
      isLoading: false,
      error: null,
    });

    renderComponent();

    const linkS001 = screen.getByRole('link', { name: 'S001' });
    expect(linkS001).toHaveAttribute('href', '/investigation/case-1');

    const linkS002 = screen.getByRole('link', { name: 'S002' });
    expect(linkS002).toHaveAttribute('href', '/investigation/case-2');

    const linkS003 = screen.getByRole('link', { name: 'S003' });
    expect(linkS003).toHaveAttribute('href', '/investigation/case-3');
  });

  it('displays similarity score as a percentage', () => {
    mockUseSimilarCases.mockReturnValue({
      similarCases: MOCK_CASES,
      isLoading: false,
      error: null,
    });

    renderComponent();

    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('color-codes similarity score: green for >= 70%, amber for 40-69%, gray for < 40%', () => {
    mockUseSimilarCases.mockReturnValue({
      similarCases: MOCK_CASES,
      isLoading: false,
      error: null,
    });

    renderComponent();

    /* 92% should be green */
    const highScore = screen.getByText('92%');
    expect(highScore.className).toContain('text-emerald');

    /* 55% should be amber */
    const midScore = screen.getByText('55%');
    expect(midScore.className).toContain('text-amber');

    /* 30% should be gray */
    const lowScore = screen.getByText('30%');
    expect(lowScore.className).toContain('text-gray');
  });

  it('renders matching factors as tags', () => {
    mockUseSimilarCases.mockReturnValue({
      similarCases: MOCK_CASES,
      isLoading: false,
      error: null,
    });

    renderComponent();

    /* "Same typology" appears in both case-1 and case-3 */
    expect(screen.getAllByText('Same typology')).toHaveLength(2);
    expect(screen.getByText('Similar amount range')).toBeInTheDocument();
    expect(screen.getByText('Same branch')).toBeInTheDocument();
    expect(screen.getByText('Similar transaction pattern')).toBeInTheDocument();
  });

  it('displays risk score for each case', () => {
    mockUseSimilarCases.mockReturnValue({
      similarCases: MOCK_CASES,
      isLoading: false,
      error: null,
    });

    renderComponent();

    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('passes alertId to the useSimilarCases hook', () => {
    mockUseSimilarCases.mockReturnValue({
      similarCases: [],
      isLoading: true,
      error: null,
    });

    renderComponent('test-alert-42');
    expect(mockUseSimilarCases).toHaveBeenCalledWith('test-alert-42');
  });

  it('does not render resolution badge when resolution is null', () => {
    mockUseSimilarCases.mockReturnValue({
      similarCases: [MOCK_CASES[1]], // S002 has resolution: null
      isLoading: false,
      error: null,
    });

    renderComponent();

    /* The resolution text "Confirmed" from case-1 should not appear */
    expect(screen.queryByText('Confirmed')).not.toBeInTheDocument();
  });

  it('renders the section header', () => {
    mockUseSimilarCases.mockReturnValue({
      similarCases: MOCK_CASES,
      isLoading: false,
      error: null,
    });

    renderComponent();

    expect(screen.getByText('Similar Cases')).toBeInTheDocument();
    expect(screen.getByText(`${MOCK_CASES.length} matches found`)).toBeInTheDocument();
  });
});
