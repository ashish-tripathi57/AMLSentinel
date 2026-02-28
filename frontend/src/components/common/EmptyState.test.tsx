import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No alerts found" />);
    expect(screen.getByText('No alerts found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="No alerts" description="Try adjusting your filters" />);
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState title="No alerts" />);
    expect(screen.queryByText('Try adjusting')).not.toBeInTheDocument();
  });
});
