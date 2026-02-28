import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checklist } from './Checklist';
import { useChecklist } from '../../hooks/use-checklist';
import type { ChecklistItem } from '../../types/investigation';

vi.mock('../../hooks/use-checklist', () => ({
  useChecklist: vi.fn(),
}));

const mockUseChecklist = vi.mocked(useChecklist);

const MOCK_ITEMS: ChecklistItem[] = [
  {
    id: 'item-1',
    alert_id: 'alert-1',
    description: 'Verify customer identity documents',
    is_checked: false,
    checked_by: null,
    ai_rationale: null,
    sort_order: 1,
  },
  {
    id: 'item-2',
    alert_id: 'alert-1',
    description: 'Review transaction pattern',
    is_checked: true,
    checked_by: 'analyst.one',
    ai_rationale: 'Verified via transaction analysis.',
    sort_order: 2,
  },
];

function setupMock(overrides: Partial<ReturnType<typeof useChecklist>> = {}) {
  const defaults: ReturnType<typeof useChecklist> = {
    items: MOCK_ITEMS,
    isLoading: false,
    error: null,
    toggleItem: vi.fn().mockResolvedValue(undefined),
    autoCheckItem: vi.fn().mockResolvedValue(undefined),
    refetch: vi.fn(),
  };
  const merged = { ...defaults, ...overrides };
  mockUseChecklist.mockReturnValue(merged);
  return merged;
}

describe('Checklist', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading spinner while fetching', () => {
    setupMock({ items: [], isLoading: true });
    render(<Checklist alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the tabpanel with correct id', () => {
    setupMock();
    render(<Checklist alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-checklist');
  });

  it('displays checklist items', () => {
    setupMock();
    render(<Checklist alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByText('Verify customer identity documents')).toBeInTheDocument();
    expect(screen.getByText('Review transaction pattern')).toBeInTheDocument();
  });

  it('shows progress count', () => {
    setupMock();
    render(<Checklist alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByText('Progress: 1 / 2')).toBeInTheDocument();
  });

  it('displays AI rationale when present', () => {
    setupMock();
    render(<Checklist alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByText('Verified via transaction analysis.')).toBeInTheDocument();
    expect(screen.getByText('AI Rationale')).toBeInTheDocument();
  });

  it('displays checked_by when present', () => {
    setupMock();
    render(<Checklist alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByText('analyst.one')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    setupMock({ items: [] });
    render(<Checklist alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByText('No checklist items')).toBeInTheDocument();
  });

  it('shows error state on fetch failure', () => {
    setupMock({ items: [], error: 'Server error' });
    render(<Checklist alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByText('Failed to load checklist')).toBeInTheDocument();
  });

  it('renders AI Check buttons for each item', () => {
    setupMock();
    render(<Checklist alertId="alert-1" analystUsername="analyst.one" />);
    const aiCheckButtons = screen.getAllByText('AI Check');
    expect(aiCheckButtons).toHaveLength(2);
  });

  it('renders checkboxes for each item', () => {
    setupMock();
    render(<Checklist alertId="alert-1" analystUsername="analyst.one" />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
  });

  it('toggles a checkbox when clicked', async () => {
    const toggleItem = vi.fn().mockResolvedValue(undefined);
    setupMock({ toggleItem });
    render(<Checklist alertId="alert-1" analystUsername="analyst.one" />);
    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);
    expect(toggleItem).toHaveBeenCalledWith('item-1', true, 'analyst.one');
  });

  it('calls autoCheckItem when AI Check button is clicked', async () => {
    const autoCheckItem = vi.fn().mockResolvedValue(undefined);
    setupMock({ autoCheckItem });
    render(<Checklist alertId="alert-1" analystUsername="analyst.one" />);
    const aiCheckButtons = screen.getAllByText('AI Check');
    await userEvent.click(aiCheckButtons[0]);
    expect(autoCheckItem).toHaveBeenCalledWith('item-1');
  });

  it('shows "Checking..." text while auto-check is in progress', async () => {
    let resolveAutoCheck!: () => void;
    const autoCheckItem = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveAutoCheck = resolve; }),
    );
    setupMock({ autoCheckItem });
    render(<Checklist alertId="alert-1" analystUsername="analyst.one" />);
    const aiCheckButtons = screen.getAllByText('AI Check');
    await userEvent.click(aiCheckButtons[0]);
    expect(screen.getByText('Checking...')).toBeInTheDocument();
    resolveAutoCheck();
    await waitFor(() => {
      expect(screen.queryByText('Checking...')).not.toBeInTheDocument();
    });
  });
});
