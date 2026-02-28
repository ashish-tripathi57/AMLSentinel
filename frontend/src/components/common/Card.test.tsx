import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardContent } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card><span>content</span></Card>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="p-4">content</Card>);
    expect(container.firstChild).toHaveClass('p-4');
  });

  it('renders with header and content', () => {
    render(
      <Card>
        <CardHeader>Title</CardHeader>
        <CardContent>Body</CardContent>
      </Card>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});
