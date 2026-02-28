import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertQueueTabs } from './AlertQueueTabs';

const DEFAULT_COUNTS = { open: 12, unassigned: 4, myAlerts: 3, completed: 5 };

describe('AlertQueueTabs', () => {
  it('renders all four tabs', () => {
    render(
      <AlertQueueTabs
        activeTab="open"
        onTabChange={vi.fn()}
        counts={DEFAULT_COUNTS}
      />
    );

    expect(screen.getByRole('tab', { name: /open/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /unassigned/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /my alerts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /completed/i })).toBeInTheDocument();
  });

  it('shows count badges on each tab', () => {
    render(
      <AlertQueueTabs
        activeTab="open"
        onTabChange={vi.fn()}
        counts={DEFAULT_COUNTS}
      />
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('highlights the active tab with primary blue underline', () => {
    render(
      <AlertQueueTabs
        activeTab="open"
        onTabChange={vi.fn()}
        counts={DEFAULT_COUNTS}
      />
    );

    const openTab = screen.getByRole('tab', { name: /open/i });
    expect(openTab).toHaveAttribute('aria-selected', 'true');
    expect(openTab.className).toContain('border-primary');
  });

  it('does not highlight inactive tabs', () => {
    render(
      <AlertQueueTabs
        activeTab="open"
        onTabChange={vi.fn()}
        counts={DEFAULT_COUNTS}
      />
    );

    const myAlertsTab = screen.getByRole('tab', { name: /my alerts/i });
    expect(myAlertsTab).toHaveAttribute('aria-selected', 'false');
    expect(myAlertsTab.className).not.toContain('border-primary');
  });

  it('calls onTabChange with "my-alerts" when My Alerts tab is clicked', () => {
    const onTabChange = vi.fn();
    render(
      <AlertQueueTabs
        activeTab="open"
        onTabChange={onTabChange}
        counts={DEFAULT_COUNTS}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /my alerts/i }));
    expect(onTabChange).toHaveBeenCalledWith('my-alerts');
  });

  it('calls onTabChange with "open" when Open tab is clicked', () => {
    const onTabChange = vi.fn();
    render(
      <AlertQueueTabs
        activeTab="completed"
        onTabChange={onTabChange}
        counts={DEFAULT_COUNTS}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /open/i }));
    expect(onTabChange).toHaveBeenCalledWith('open');
  });

  it('calls onTabChange with "completed" when Completed tab is clicked', () => {
    const onTabChange = vi.fn();
    render(
      <AlertQueueTabs
        activeTab="open"
        onTabChange={onTabChange}
        counts={DEFAULT_COUNTS}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /completed/i }));
    expect(onTabChange).toHaveBeenCalledWith('completed');
  });

  it('calls onTabChange with "unassigned" when Unassigned tab is clicked', () => {
    const onTabChange = vi.fn();
    render(
      <AlertQueueTabs
        activeTab="open"
        onTabChange={onTabChange}
        counts={DEFAULT_COUNTS}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /unassigned/i }));
    expect(onTabChange).toHaveBeenCalledWith('unassigned');
  });

  it('highlights the my-alerts tab when activeTab is my-alerts', () => {
    render(
      <AlertQueueTabs
        activeTab="my-alerts"
        onTabChange={vi.fn()}
        counts={DEFAULT_COUNTS}
      />
    );

    const myAlertsTab = screen.getByRole('tab', { name: /my alerts/i });
    expect(myAlertsTab).toHaveAttribute('aria-selected', 'true');
    expect(myAlertsTab.className).toContain('border-primary');
  });

  it('highlights the completed tab when activeTab is completed', () => {
    render(
      <AlertQueueTabs
        activeTab="completed"
        onTabChange={vi.fn()}
        counts={DEFAULT_COUNTS}
      />
    );

    const completedTab = screen.getByRole('tab', { name: /completed/i });
    expect(completedTab).toHaveAttribute('aria-selected', 'true');
    expect(completedTab.className).toContain('border-primary');
  });

  it('renders tablist role for accessibility', () => {
    render(
      <AlertQueueTabs
        activeTab="open"
        onTabChange={vi.fn()}
        counts={DEFAULT_COUNTS}
      />
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders zero counts correctly', () => {
    render(
      <AlertQueueTabs
        activeTab="open"
        onTabChange={vi.fn()}
        counts={{ open: 0, unassigned: 0, myAlerts: 0, completed: 0 }}
      />
    );

    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(4);
  });
});
