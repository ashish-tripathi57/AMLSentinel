import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InvestigationDrawerProvider } from '../../contexts/InvestigationDrawerContext';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <InvestigationDrawerProvider>
          {ui}
        </InvestigationDrawerProvider>
      </MemoryRouter>
    );
  };

  it('renders the app name', () => {
    renderWithRouter(<AppShell><div>content</div></AppShell>);
    expect(screen.getByText('AML Sentinel')).toBeInTheDocument();
  });

  it('renders navigation link for Alert Queue', () => {
    renderWithRouter(<AppShell><div>content</div></AppShell>);
    expect(screen.getByText('Alert Queue')).toBeInTheDocument();
  });

  it('renders children in main content area', () => {
    renderWithRouter(<AppShell><div data-testid="child">Test Content</div></AppShell>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders the GUIDE framework footer', () => {
    renderWithRouter(<AppShell><div>content</div></AppShell>);
    expect(screen.getByText(/G\.U\.I\.D\.E/)).toBeInTheDocument();
  });

  it('highlights active nav link', () => {
    renderWithRouter(<AppShell><div>content</div></AppShell>, { route: '/' });
    const link = screen.getByText('Alert Queue');
    expect(link.className).toContain('bg-sidebar-active');
  });

  it('renders subtitle text', () => {
    renderWithRouter(<AppShell><div>content</div></AppShell>);
    expect(screen.getByText('Investigation Assistant')).toBeInTheDocument();
  });

  it('uses muted style for inactive nav link', () => {
    renderWithRouter(<AppShell><div>content</div></AppShell>, { route: '/other' });
    const link = screen.getByText('Alert Queue');
    expect(link.className).toContain('text-text-muted');
    expect(link.className).not.toContain('bg-sidebar-active');
  });

  it('renders navigation link for Analytics', () => {
    renderWithRouter(<AppShell><div>content</div></AppShell>);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('highlights Analytics link when on /analytics route', () => {
    renderWithRouter(<AppShell><div>content</div></AppShell>, { route: '/analytics' });
    const link = screen.getByText('Analytics');
    expect(link.className).toContain('bg-sidebar-active');
  });

  it('renders the collapse sidebar button', () => {
    renderWithRouter(<AppShell><div>content</div></AppShell>);
    expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
  });

  it('collapses sidebar when collapse button is clicked', () => {
    renderWithRouter(<AppShell><div>content</div></AppShell>);

    fireEvent.click(screen.getByLabelText('Collapse sidebar'));

    expect(screen.queryByText('Alert Queue')).not.toBeInTheDocument();
    expect(screen.queryByText('AML Sentinel')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  it('expands sidebar when expand button is clicked after collapsing', () => {
    renderWithRouter(<AppShell><div>content</div></AppShell>);

    fireEvent.click(screen.getByLabelText('Collapse sidebar'));
    fireEvent.click(screen.getByLabelText('Expand sidebar'));

    expect(screen.getByText('Alert Queue')).toBeInTheDocument();
    expect(screen.getByText('AML Sentinel')).toBeInTheDocument();
  });

  it('does not show investigation sections on the home route', () => {
    renderWithRouter(<AppShell><div>content</div></AppShell>, { route: '/' });

    expect(screen.queryByRole('navigation', { name: 'Investigation sections' })).not.toBeInTheDocument();
  });

  it('shows investigation sections when on an investigation route', () => {
    renderWithRouter(<AppShell><div>content</div></AppShell>, { route: '/investigation/uuid-1' });

    expect(screen.getByRole('navigation', { name: 'Investigation sections' })).toBeInTheDocument();
    expect(screen.getByLabelText('Overview')).toBeInTheDocument();
    expect(screen.getByLabelText('Transactions')).toBeInTheDocument();
    expect(screen.getByLabelText('Network')).toBeInTheDocument();
  });

  it('hides investigation section labels when sidebar is collapsed on investigation route', () => {
    renderWithRouter(<AppShell><div>content</div></AppShell>, { route: '/investigation/uuid-1' });

    fireEvent.click(screen.getByLabelText('Collapse sidebar'));

    // Section buttons should still exist (by aria-label)
    expect(screen.getByLabelText('Overview')).toBeInTheDocument();
    // But section text labels should be hidden
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
  });
});
