import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge variant="new">New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies new variant styles', () => {
    render(<Badge variant="new">New</Badge>);
    const badge = screen.getByText('New');
    expect(badge.className).toContain('text-status-new');
  });

  it('applies critical variant styles', () => {
    render(<Badge variant="critical">Critical</Badge>);
    const badge = screen.getByText('Critical');
    expect(badge.className).toContain('text-severity-critical');
  });

  it('applies in-progress variant styles', () => {
    render(<Badge variant="in-progress">In Progress</Badge>);
    const badge = screen.getByText('In Progress');
    expect(badge.className).toContain('text-status-in-progress');
  });
});
