import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertFiltersBar } from './AlertFilters';
import type { AlertFilters } from '../../types/alert';

const DEFAULT_FILTERS: AlertFilters = { offset: 0, limit: 20 };

describe('AlertFiltersBar', () => {
  it('renders the search input', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    expect(screen.getByLabelText('Search alerts')).toBeInTheDocument();
  });

  it('renders the Filter button', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });

  it('does not show filter popover by default', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    expect(screen.queryByLabelText('Filter by typology')).not.toBeInTheDocument();
  });

  it('opens filter popover when Filter button is clicked', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByRole('button', { name: /filter/i }));

    expect(screen.getByLabelText('Filter by typology')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum risk score')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum risk score')).toBeInTheDocument();
  });

  it('closes filter popover when Filter button is clicked again', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    const filterButton = screen.getByRole('button', { name: /filter/i });
    fireEvent.click(filterButton);
    expect(screen.getByLabelText('Filter by typology')).toBeInTheDocument();

    fireEvent.click(filterButton);
    expect(screen.queryByLabelText('Filter by typology')).not.toBeInTheDocument();
  });

  it('does not show filter pills when no filters are active', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    expect(screen.queryByLabelText(/remove .* filter/i)).not.toBeInTheDocument();
  });

  it('shows a typology filter pill when typology is set', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = { ...DEFAULT_FILTERS, typology: 'Structuring' };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);
    expect(screen.getByText('Structuring')).toBeInTheDocument();
  });

  it('shows a status filter pill when status is set', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = { ...DEFAULT_FILTERS, status: 'New' };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('shows a risk min filter pill when risk_min is set', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = { ...DEFAULT_FILTERS, risk_min: 50 };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);
    expect(screen.getByText('Risk 50+')).toBeInTheDocument();
  });

  it('shows a risk max filter pill when risk_max is set', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = { ...DEFAULT_FILTERS, risk_max: 80 };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);
    expect(screen.getByText('Risk ≤80')).toBeInTheDocument();
  });

  it('shows a search filter pill when search is set', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = { ...DEFAULT_FILTERS, search: 'suspicious' };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);
    expect(screen.getByText('"suspicious"')).toBeInTheDocument();
  });

  it('removes typology filter when pill close button is clicked', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = { ...DEFAULT_FILTERS, typology: 'Structuring' };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByLabelText('Remove Structuring filter'));

    const callArg = onFiltersChange.mock.calls[0][0];
    expect(callArg.typology).toBeUndefined();
  });

  it('removes status filter when pill close button is clicked', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = { ...DEFAULT_FILTERS, status: 'New' };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByLabelText('Remove New filter'));

    const callArg = onFiltersChange.mock.calls[0][0];
    expect(callArg.status).toBeUndefined();
  });

  it('removes risk_min filter when pill close button is clicked', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = { ...DEFAULT_FILTERS, risk_min: 50 };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByLabelText('Remove Risk 50+ filter'));

    const callArg = onFiltersChange.mock.calls[0][0];
    expect(callArg.risk_min).toBeUndefined();
  });

  it('removes risk_max filter when pill close button is clicked', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = { ...DEFAULT_FILTERS, risk_max: 80 };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByLabelText('Remove Risk ≤80 filter'));

    const callArg = onFiltersChange.mock.calls[0][0];
    expect(callArg.risk_max).toBeUndefined();
  });

  it('removes search filter when pill close button is clicked', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = { ...DEFAULT_FILTERS, search: 'suspicious' };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByLabelText('Remove "suspicious" filter'));

    const callArg = onFiltersChange.mock.calls[0][0];
    expect(callArg.search).toBeUndefined();
  });

  it('calls onFiltersChange with typology on select change in popover', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.change(screen.getByLabelText('Filter by typology'), {
      target: { value: 'Unusual Geographic Activity' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ typology: 'Unusual Geographic Activity', offset: 0 })
    );
  });

  it('calls onFiltersChange with status on select change in popover', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.change(screen.getByLabelText('Filter by status'), {
      target: { value: 'Escalated' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Escalated', offset: 0 })
    );
  });

  it('clears typology filter when empty option selected in popover', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = { ...DEFAULT_FILTERS, typology: 'Structuring' };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.change(screen.getByLabelText('Filter by typology'), {
      target: { value: '' },
    });

    const callArg = onFiltersChange.mock.calls[0][0];
    expect(callArg.typology).toBeUndefined();
  });

  it('clears status filter when empty option selected in popover', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = { ...DEFAULT_FILTERS, status: 'New' };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.change(screen.getByLabelText('Filter by status'), {
      target: { value: '' },
    });

    const callArg = onFiltersChange.mock.calls[0][0];
    expect(callArg.status).toBeUndefined();
  });

  it('calls onFiltersChange with risk_min on input change in popover', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.change(screen.getByLabelText('Minimum risk score'), {
      target: { value: '60' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ risk_min: 60, offset: 0 })
    );
  });

  it('calls onFiltersChange with risk_max on input change in popover', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.change(screen.getByLabelText('Maximum risk score'), {
      target: { value: '90' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ risk_max: 90, offset: 0 })
    );
  });

  it('clears risk_min when input is emptied in popover', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = { ...DEFAULT_FILTERS, risk_min: 50 };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.change(screen.getByLabelText('Minimum risk score'), {
      target: { value: '' },
    });

    const callArg = onFiltersChange.mock.calls[0][0];
    expect(callArg.risk_min).toBeUndefined();
  });

  it('clears risk_max when input is emptied in popover', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = { ...DEFAULT_FILTERS, risk_max: 90 };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.change(screen.getByLabelText('Maximum risk score'), {
      target: { value: '' },
    });

    const callArg = onFiltersChange.mock.calls[0][0];
    expect(callArg.risk_max).toBeUndefined();
  });

  it('fires search on Enter key press', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    const searchInput = screen.getByLabelText('Search alerts');
    fireEvent.change(searchInput, { target: { value: 'suspicious' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'suspicious', offset: 0 })
    );
  });

  it('fires search with undefined when Enter is pressed with empty input', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    const searchInput = screen.getByLabelText('Search alerts');
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    const callArg = onFiltersChange.mock.calls[0][0];
    expect(callArg.search).toBeUndefined();
  });

  it('does not fire search on non-Enter key press', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    const searchInput = screen.getByLabelText('Search alerts');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.keyDown(searchInput, { key: 'Tab' });

    expect(onFiltersChange).not.toHaveBeenCalled();
  });

  it('fires search on blur', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    const searchInput = screen.getByLabelText('Search alerts');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.blur(searchInput);

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'test', offset: 0 })
    );
  });

  it('fires search with undefined when search input is empty on blur', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    const searchInput = screen.getByLabelText('Search alerts');
    fireEvent.blur(searchInput);

    const callArg = onFiltersChange.mock.calls[0][0];
    expect(callArg.search).toBeUndefined();
  });

  it('syncs search input when filters.search changes externally', () => {
    const onFiltersChange = vi.fn();
    const { rerender } = render(
      <AlertFiltersBar filters={{ ...DEFAULT_FILTERS, search: 'initial' }} onFiltersChange={onFiltersChange} />
    );
    expect(screen.getByLabelText('Search alerts')).toHaveValue('initial');

    rerender(
      <AlertFiltersBar filters={{ ...DEFAULT_FILTERS, search: undefined }} onFiltersChange={onFiltersChange} />
    );
    expect(screen.getByLabelText('Search alerts')).toHaveValue('');
  });

  it('shows Clear all button when filters are active and clears all', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = {
      offset: 0, limit: 20,
      typology: 'Structuring', status: 'New', search: 'test',
    };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByLabelText('Clear all filters'));

    expect(onFiltersChange).toHaveBeenCalledWith({ offset: 0, limit: 20 });
  });

  it('does not show Clear all button when no filters are active', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    expect(screen.queryByLabelText('Clear all filters')).not.toBeInTheDocument();
  });

  it('has accessible search role', () => {
    const onFiltersChange = vi.fn();
    render(<AlertFiltersBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    expect(screen.getByRole('search', { name: 'Alert filters' })).toBeInTheDocument();
  });

  it('renders multiple filter pills simultaneously', () => {
    const onFiltersChange = vi.fn();
    const activeFilters: AlertFilters = {
      ...DEFAULT_FILTERS,
      typology: 'Structuring',
      status: 'New',
      risk_min: 50,
    };
    render(<AlertFiltersBar filters={activeFilters} onFiltersChange={onFiltersChange} />);

    expect(screen.getByText('Structuring')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Risk 50+')).toBeInTheDocument();
  });
});
