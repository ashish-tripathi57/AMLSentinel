import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkActionBar } from './BulkActionBar';

describe('BulkActionBar', () => {
  const defaultProps = {
    selectedCount: 5,
    onBulkClose: vi.fn(),
    onDetectFalsePositives: vi.fn(),
    onExportSars: vi.fn(),
    onClear: vi.fn(),
  };

  it('renders when selectedCount is greater than zero', () => {
    render(<BulkActionBar {...defaultProps} />);
    expect(screen.getByText('5 alerts selected')).toBeInTheDocument();
  });

  it('does not render when selectedCount is zero', () => {
    const { container } = render(<BulkActionBar {...defaultProps} selectedCount={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Bulk Close button', () => {
    render(<BulkActionBar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /bulk close/i })).toBeInTheDocument();
  });

  it('renders Detect False Positives button', () => {
    render(<BulkActionBar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /detect false positives/i })).toBeInTheDocument();
  });

  it('renders Export SARs button', () => {
    render(<BulkActionBar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /export sars/i })).toBeInTheDocument();
  });

  it('renders Clear button', () => {
    render(<BulkActionBar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('calls onBulkClose when Bulk Close is clicked', () => {
    const onBulkClose = vi.fn();
    render(<BulkActionBar {...defaultProps} onBulkClose={onBulkClose} />);
    fireEvent.click(screen.getByRole('button', { name: /bulk close/i }));
    expect(onBulkClose).toHaveBeenCalledOnce();
  });

  it('calls onDetectFalsePositives when Detect False Positives is clicked', () => {
    const onDetectFalsePositives = vi.fn();
    render(<BulkActionBar {...defaultProps} onDetectFalsePositives={onDetectFalsePositives} />);
    fireEvent.click(screen.getByRole('button', { name: /detect false positives/i }));
    expect(onDetectFalsePositives).toHaveBeenCalledOnce();
  });

  it('calls onExportSars when Export SARs is clicked', () => {
    const onExportSars = vi.fn();
    render(<BulkActionBar {...defaultProps} onExportSars={onExportSars} />);
    fireEvent.click(screen.getByRole('button', { name: /export sars/i }));
    expect(onExportSars).toHaveBeenCalledOnce();
  });

  it('calls onClear when Clear is clicked', () => {
    const onClear = vi.fn();
    render(<BulkActionBar {...defaultProps} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('shows singular text for 1 alert selected', () => {
    render(<BulkActionBar {...defaultProps} selectedCount={1} />);
    expect(screen.getByText('1 alert selected')).toBeInTheDocument();
  });

  it('shows plural text for multiple alerts selected', () => {
    render(<BulkActionBar {...defaultProps} selectedCount={10} />);
    expect(screen.getByText('10 alerts selected')).toBeInTheDocument();
  });
});
