import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  InvestigationIconSidebar,
  INVESTIGATION_SECTIONS,
} from './InvestigationIconSidebar';
import type { InvestigationSection } from './InvestigationIconSidebar';

describe('InvestigationIconSidebar', () => {
  const defaultProps = {
    activeSection: 'Overview' as InvestigationSection,
    onSectionChange: vi.fn(),
  };

  it('renders 8 icon buttons', () => {
    render(<InvestigationIconSidebar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(8);
  });

  it('renders all section labels as aria-labels', () => {
    render(<InvestigationIconSidebar {...defaultProps} />);
    for (const section of INVESTIGATION_SECTIONS) {
      expect(screen.getByLabelText(section)).toBeInTheDocument();
    }
  });

  it('marks the active section with aria-current', () => {
    render(
      <InvestigationIconSidebar
        {...defaultProps}
        activeSection="Transactions"
      />
    );
    expect(screen.getByLabelText('Transactions')).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  it('does not mark inactive sections with aria-current', () => {
    render(<InvestigationIconSidebar {...defaultProps} />);
    expect(screen.getByLabelText('Network')).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('applies active styling to the active icon', () => {
    render(
      <InvestigationIconSidebar {...defaultProps} activeSection="Overview" />
    );
    const activeButton = screen.getByLabelText('Overview');
    expect(activeButton.className).toContain('border-primary');
  });

  it('calls onSectionChange with correct section on click', async () => {
    const onSectionChange = vi.fn();
    render(
      <InvestigationIconSidebar
        {...defaultProps}
        onSectionChange={onSectionChange}
      />
    );

    await userEvent.click(screen.getByLabelText('Network'));

    expect(onSectionChange).toHaveBeenCalledOnce();
    expect(onSectionChange).toHaveBeenCalledWith('Network');
  });

  it('shows tooltip on hover', () => {
    render(<InvestigationIconSidebar {...defaultProps} />);

    fireEvent.mouseEnter(screen.getByLabelText('Checklist'));

    expect(screen.getByRole('tooltip')).toHaveTextContent('Checklist');
  });

  it('hides tooltip on mouse leave', () => {
    render(<InvestigationIconSidebar {...defaultProps} />);

    fireEvent.mouseEnter(screen.getByLabelText('Checklist'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByLabelText('Checklist'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('exports INVESTIGATION_SECTIONS with 8 entries including Similar Cases', () => {
    expect(INVESTIGATION_SECTIONS).toHaveLength(8);
    expect(INVESTIGATION_SECTIONS).toContain('Similar Cases');
  });

  it('renders a nav with accessible label', () => {
    render(<InvestigationIconSidebar {...defaultProps} />);
    expect(screen.getByRole('navigation')).toHaveAttribute(
      'aria-label',
      'Investigation sections'
    );
  });
});
