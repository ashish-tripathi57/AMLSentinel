import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusTransition } from './StatusTransition';

describe('StatusTransition', () => {
  const onStatusChanged = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    onStatusChanged.mockClear();
  });

  it('renders Change Status button for non-closed alerts', () => {
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="New"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );
    expect(screen.getByText('Change Status')).toBeInTheDocument();
  });

  it('renders nothing for Closed alerts', () => {
    const { container } = render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="Closed"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('opens the modal when button is clicked', async () => {
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="New"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Change Alert Status')).toBeInTheDocument();
  });

  it('shows available next statuses for "New"', async () => {
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="New"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));

    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('shows available next statuses for "In Progress"', async () => {
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="In Progress"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));

    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Escalated')).toBeInTheDocument();
  });

  it('disables Confirm when no status or rationale is selected', async () => {
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="New"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));

    expect(screen.getByText('Confirm')).toBeDisabled();
  });

  it('closes modal on Cancel', async () => {
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="New"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('submits status change and calls onStatusChanged', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'alert-1', status: 'In Progress' }),
    });

    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="New"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));

    // Select "In Progress"
    await userEvent.click(screen.getByText('In Progress'));

    // Enter rationale
    await userEvent.type(screen.getByLabelText('Rationale (required)'), 'Moving to investigation phase');

    // Submit
    await userEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(onStatusChanged).toHaveBeenCalledWith('In Progress');
    });

    // Modal should close
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows error on failed submission', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'Invalid transition' }),
    });

    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="New"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));
    await userEvent.click(screen.getByText('In Progress'));
    await userEvent.type(screen.getByLabelText('Rationale (required)'), 'Test');
    await userEvent.click(screen.getByText('Confirm'));

    await waitFor(() => screen.getByText('Invalid transition'));
    expect(onStatusChanged).not.toHaveBeenCalled();
  });

  it('renders nothing for unknown status with no transitions', () => {
    const { container } = render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="UnknownStatus"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows error fallback for non-Error thrown during submit', async () => {
    global.fetch = vi.fn().mockRejectedValue('string error');

    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="New"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));
    await userEvent.click(screen.getByText('In Progress'));
    await userEvent.type(screen.getByLabelText('Rationale (required)'), 'Reason');
    await userEvent.click(screen.getByText('Confirm'));

    await waitFor(() => screen.getByText('Failed to update status'));
  });

  it('does not submit when rationale is whitespace only', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'alert-1', status: 'In Progress' }),
    });

    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="New"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));
    await userEvent.click(screen.getByText('In Progress'));
    // Type only spaces — Confirm should stay disabled
    await userEvent.type(screen.getByLabelText('Rationale (required)'), '   ');
    expect(screen.getByText('Confirm')).toBeDisabled();
  });

  it('shows available next statuses for "Review"', async () => {
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="Review"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));

    // Review can go to Closed or In Progress
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('shows available next statuses for "Escalated"', async () => {
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="Escalated"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));

    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('handleSubmit guards against empty selectedStatus via direct form submit', async () => {
    global.fetch = vi.fn();
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="New"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));

    // Type rationale but do NOT select a status
    await userEvent.type(screen.getByLabelText('Rationale (required)'), 'Some reason');

    // Force submit the form directly (bypassing the disabled button)
    fireEvent.submit(screen.getByLabelText('Rationale (required)').closest('form')!);

    // handleSubmit guard should prevent the API call
    expect(global.fetch).not.toHaveBeenCalled();
    expect(onStatusChanged).not.toHaveBeenCalled();
  });

  it('handleSubmit guards against empty rationale via direct form submit', async () => {
    global.fetch = vi.fn();
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="New"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));

    // Select a status but leave rationale empty
    await userEvent.click(screen.getByText('In Progress'));

    // Force submit the form directly
    fireEvent.submit(screen.getByLabelText('Rationale (required)').closest('form')!);

    // handleSubmit guard should prevent the API call
    expect(global.fetch).not.toHaveBeenCalled();
    expect(onStatusChanged).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------
  // Resolution dropdown tests (Task 1.2)
  // -----------------------------------------------------------------

  it('shows resolution dropdown when Closed is selected', async () => {
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="Review"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));
    await userEvent.click(screen.getByText('Closed'));

    expect(screen.getByLabelText('Resolution (required)')).toBeInTheDocument();
    expect(screen.getByText('Select resolution...')).toBeInTheDocument();
  });

  it('hides resolution dropdown for non-close status transitions', async () => {
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="Review"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));
    await userEvent.click(screen.getByText('In Progress'));

    expect(screen.queryByLabelText('Resolution (required)')).not.toBeInTheDocument();
  });

  it('disables Confirm when closing without resolution selected', async () => {
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="Review"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));
    await userEvent.click(screen.getByText('Closed'));
    await userEvent.type(screen.getByLabelText('Rationale (required)'), 'Closing this alert');

    // Confirm should be disabled because resolution is not selected
    expect(screen.getByText('Confirm')).toBeDisabled();
  });

  it('enables Confirm when closing with resolution and rationale', async () => {
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="Review"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));
    await userEvent.click(screen.getByText('Closed'));
    await userEvent.type(screen.getByLabelText('Rationale (required)'), 'No suspicious activity found');
    await userEvent.selectOptions(screen.getByLabelText('Resolution (required)'), 'No Suspicion');

    expect(screen.getByText('Confirm')).not.toBeDisabled();
  });

  it('sends resolution in API call when closing alert', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'alert-1',
          status: 'Closed',
          resolution: 'SAR Filed',
        }),
    });

    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="Review"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));
    await userEvent.click(screen.getByText('Closed'));
    await userEvent.type(screen.getByLabelText('Rationale (required)'), 'SAR has been filed');
    await userEvent.selectOptions(screen.getByLabelText('Resolution (required)'), 'SAR Filed');
    await userEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(onStatusChanged).toHaveBeenCalledWith('Closed');
    });

    // Verify the fetch call includes resolution in the body
    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.resolution).toBe('SAR Filed');
  });

  it('clears resolution when switching from Closed to another status', async () => {
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="Review"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));
    // Select Closed first
    await userEvent.click(screen.getByText('Closed'));
    expect(screen.getByLabelText('Resolution (required)')).toBeInTheDocument();

    // Switch to In Progress — resolution dropdown should disappear
    await userEvent.click(screen.getByText('In Progress'));
    expect(screen.queryByLabelText('Resolution (required)')).not.toBeInTheDocument();
  });

  it('handleSubmit guards against missing resolution when closing via direct form submit', async () => {
    global.fetch = vi.fn();
    render(
      <StatusTransition
        alertId="alert-1"
        currentStatus="Review"
        analystUsername="analyst.one"
        onStatusChanged={onStatusChanged}
      />
    );

    await userEvent.click(screen.getByText('Change Status'));
    await userEvent.click(screen.getByText('Closed'));
    await userEvent.type(screen.getByLabelText('Rationale (required)'), 'Closing');

    // Force submit without selecting resolution
    fireEvent.submit(screen.getByLabelText('Rationale (required)').closest('form')!);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(onStatusChanged).not.toHaveBeenCalled();
  });
});
