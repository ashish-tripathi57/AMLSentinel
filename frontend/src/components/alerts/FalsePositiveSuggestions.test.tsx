import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FalsePositiveSuggestions } from './FalsePositiveSuggestions';
import type { FalsePositiveResult } from '../../types/alert';

const mockResults: FalsePositiveResult[] = [
  {
    alert_id: 'a1b2c3',
    alert_short_id: 'ALR-001',
    title: 'Suspicious cash deposit pattern',
    confidence: 0.92,
    reasoning: 'Transaction pattern is consistent with regular payroll deposits. Customer has stable employment history.',
    suggested_resolution: 'No Suspicion',
  },
  {
    alert_id: 'd4e5f6',
    alert_short_id: 'ALR-002',
    title: 'Large international wire transfer',
    confidence: 0.35,
    reasoning: 'Wire transfer to high-risk jurisdiction with no documented business relationship. Inconsistent with customer profile.',
    suggested_resolution: 'Escalated',
  },
];

describe('FalsePositiveSuggestions', () => {
  const defaultProps = {
    results: mockResults,
    isLoading: false,
    onClose: vi.fn(),
  };

  it('shows loading spinner when isLoading is true', () => {
    render(<FalsePositiveSuggestions {...defaultProps} isLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
  });

  it('renders results with correct alert IDs', () => {
    render(<FalsePositiveSuggestions {...defaultProps} />);
    expect(screen.getByText('ALR-001')).toBeInTheDocument();
    expect(screen.getByText('ALR-002')).toBeInTheDocument();
  });

  it('shows green badge for likely false positives (confidence >= 0.7)', () => {
    render(<FalsePositiveSuggestions {...defaultProps} />);
    expect(screen.getByText('Likely False Positive')).toBeInTheDocument();
  });

  it('shows red badge for likely genuine alerts (confidence < 0.7)', () => {
    render(<FalsePositiveSuggestions {...defaultProps} />);
    expect(screen.getByText('Likely Genuine')).toBeInTheDocument();
  });

  it('displays confidence as a percentage', () => {
    render(<FalsePositiveSuggestions {...defaultProps} />);
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
  });

  it('displays reasoning text for each result', () => {
    render(<FalsePositiveSuggestions {...defaultProps} />);
    expect(
      screen.getByText(/Transaction pattern is consistent with regular payroll deposits/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Wire transfer to high-risk jurisdiction/),
    ).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<FalsePositiveSuggestions {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders the panel title', () => {
    render(<FalsePositiveSuggestions {...defaultProps} />);
    expect(screen.getByText('AI False Positive Analysis')).toBeInTheDocument();
  });

  it('displays suggested resolution for each result', () => {
    render(<FalsePositiveSuggestions {...defaultProps} />);
    expect(screen.getByText('No Suspicion')).toBeInTheDocument();
    expect(screen.getByText('Escalated')).toBeInTheDocument();
  });
});
