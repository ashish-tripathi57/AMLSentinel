import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NumberedPagination } from './NumberedPagination';

describe('NumberedPagination', () => {
  it('renders items per page label and summary', () => {
    render(
      <NumberedPagination
        offset={0}
        limit={20}
        total={42}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Items per page/)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders numbered page buttons', () => {
    render(
      <NumberedPagination
        offset={0}
        limit={10}
        total={50}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 5' })).toBeInTheDocument();
  });

  it('highlights the current page', () => {
    render(
      <NumberedPagination
        offset={0}
        limit={10}
        total={50}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />
    );

    const page1 = screen.getByRole('button', { name: 'Page 1' });
    expect(page1).toHaveAttribute('aria-current', 'page');
    expect(page1.className).toContain('bg-primary');
  });

  it('calls onPageChange when a page button is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <NumberedPagination
        offset={0}
        limit={10}
        total={50}
        onPageChange={onPageChange}
        onLimitChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(20);
  });

  it('renders previous and next buttons', () => {
    render(
      <NumberedPagination
        offset={10}
        limit={10}
        total={50}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Next page')).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(
      <NumberedPagination
        offset={0}
        limit={10}
        total={50}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Previous page')).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <NumberedPagination
        offset={40}
        limit={10}
        total={50}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('navigates to previous page when Previous is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <NumberedPagination
        offset={20}
        limit={10}
        total={50}
        onPageChange={onPageChange}
        onLimitChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Previous page'));
    expect(onPageChange).toHaveBeenCalledWith(10);
  });

  it('navigates to next page when Next is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <NumberedPagination
        offset={20}
        limit={10}
        total={50}
        onPageChange={onPageChange}
        onLimitChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Next page'));
    expect(onPageChange).toHaveBeenCalledWith(30);
  });

  it('renders ellipsis for large page ranges', () => {
    render(
      <NumberedPagination
        offset={0}
        limit={10}
        total={200}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />
    );

    const ellipses = screen.getAllByText('…');
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
  });

  it('renders items per page dropdown', () => {
    render(
      <NumberedPagination
        offset={0}
        limit={20}
        total={50}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Items per page')).toBeInTheDocument();
  });

  it('calls onLimitChange when items per page is changed', () => {
    const onLimitChange = vi.fn();
    render(
      <NumberedPagination
        offset={0}
        limit={20}
        total={50}
        onPageChange={vi.fn()}
        onLimitChange={onLimitChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Items per page'), { target: { value: '50' } });
    expect(onLimitChange).toHaveBeenCalledWith(50);
  });

  it('shows all pages when total pages is small (no ellipsis)', () => {
    render(
      <NumberedPagination
        offset={0}
        limit={10}
        total={30}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument();
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });

  it('handles single page gracefully', () => {
    render(
      <NumberedPagination
        offset={0}
        limit={20}
        total={5}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('shows correct showing range on middle page', () => {
    render(
      <NumberedPagination
        offset={20}
        limit={10}
        total={50}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />
    );

    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('caps the end range at total on last page', () => {
    render(
      <NumberedPagination
        offset={40}
        limit={10}
        total={45}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />
    );

    expect(screen.getByText('41')).toBeInTheDocument();
    /* "45" appears twice — once in showEnd and once in total — verify both are present */
    expect(screen.getAllByText('45')).toHaveLength(2);
  });
});
