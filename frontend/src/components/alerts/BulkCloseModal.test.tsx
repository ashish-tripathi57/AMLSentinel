import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkCloseModal } from './BulkCloseModal';

describe('BulkCloseModal', () => {
  const defaultProps = {
    selectedAlertIds: ['ALR-001', 'ALR-002', 'ALR-003'],
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  };

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <BulkCloseModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with correct alert count in the title', () => {
    render(<BulkCloseModal {...defaultProps} />);
    expect(screen.getByText('Bulk Close 3 Alerts')).toBeInTheDocument();
  });

  it('renders resolution dropdown and justification textarea', () => {
    render(<BulkCloseModal {...defaultProps} />);
    expect(screen.getByLabelText(/resolution/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/justification/i)).toBeInTheDocument();
  });

  it('confirm button is disabled when no resolution is selected', () => {
    render(<BulkCloseModal {...defaultProps} />);
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton).toBeDisabled();
  });

  it('confirm button is disabled when justification is too short', () => {
    render(<BulkCloseModal {...defaultProps} />);

    /* Select a valid resolution */
    fireEvent.change(screen.getByLabelText(/resolution/i), {
      target: { value: 'No Suspicion' },
    });

    /* Enter a justification shorter than 10 characters */
    fireEvent.change(screen.getByLabelText(/justification/i), {
      target: { value: 'short' },
    });

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton).toBeDisabled();
  });

  it('confirm button is enabled when both fields are valid', () => {
    render(<BulkCloseModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/resolution/i), {
      target: { value: 'No Suspicion' },
    });

    fireEvent.change(screen.getByLabelText(/justification/i), {
      target: { value: 'This alert has been reviewed and found to be compliant.' },
    });

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton).toBeEnabled();
  });

  it('calls onConfirm with resolution and justification when confirmed', () => {
    const onConfirm = vi.fn();
    render(<BulkCloseModal {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.change(screen.getByLabelText(/resolution/i), {
      target: { value: 'SAR Filed' },
    });

    fireEvent.change(screen.getByLabelText(/justification/i), {
      target: { value: 'SAR has been filed for these alerts after thorough review.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith(
      'SAR Filed',
      'SAR has been filed for these alerts after thorough review.',
    );
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<BulkCloseModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows loading state when isSubmitting is true', () => {
    render(<BulkCloseModal {...defaultProps} isSubmitting />);
    const confirmButton = screen.getByRole('button', { name: /closing/i });
    expect(confirmButton).toBeDisabled();
  });

  it('renders all resolution options', () => {
    render(<BulkCloseModal {...defaultProps} />);
    const select = screen.getByLabelText(/resolution/i);
    expect(select).toBeInTheDocument();

    const options = select.querySelectorAll('option');
    const optionTexts = Array.from(options).map((opt) => opt.textContent);
    expect(optionTexts).toContain('No Suspicion');
    expect(optionTexts).toContain('SAR Filed');
    expect(optionTexts).toContain('Escalated');
    expect(optionTexts).toContain('Insufficient Evidence');
  });
});
