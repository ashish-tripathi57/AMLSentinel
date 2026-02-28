import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SAREditor } from './SAREditor';
import { useSARDrafts } from '../../hooks/use-sar-drafts';
import type { SARDraft } from '../../types/investigation';

vi.mock('../../hooks/use-sar-drafts', () => ({
  useSARDrafts: vi.fn(),
}));

const mockedUseSARDrafts = vi.mocked(useSARDrafts);

const MOCK_DRAFT: SARDraft = {
  id: 'draft-1',
  alert_id: 'alert-1',
  version: 1,
  subject_info: 'Subject information about the case.',
  activity_description: 'Description of suspicious activity.',
  narrative: 'Detailed narrative of the investigation.',
  reason_for_suspicion: 'Reasons for filing the report.',
  action_taken: 'Actions taken by the institution.',
  generated_by: 'ai',
  created_at: '2024-01-15T12:00:00Z',
};

const MOCK_DRAFT_V2: SARDraft = {
  id: 'draft-2',
  alert_id: 'alert-1',
  version: 2,
  subject_info: 'Updated subject info.',
  activity_description: 'Updated activity.',
  narrative: 'Updated narrative.',
  reason_for_suspicion: 'Updated reasons.',
  action_taken: 'Updated actions.',
  generated_by: 'analyst',
  created_at: '2024-02-20T14:00:00Z',
};

function createMockHookResult(overrides: Partial<ReturnType<typeof useSARDrafts>> = {}): ReturnType<typeof useSARDrafts> {
  return {
    drafts: [],
    activeDraft: null,
    isLoading: false,
    isGenerating: false,
    error: null,
    generateDraft: vi.fn(),
    updateDraft: vi.fn().mockResolvedValue(undefined),
    selectDraft: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  };
}

describe('SAREditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading spinner while fetching', () => {
    mockedUseSARDrafts.mockReturnValue(createMockHookResult({ isLoading: true }));
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the tabpanel with correct id', () => {
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT], activeDraft: MOCK_DRAFT }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-sar');
  });

  it('shows empty state when no drafts exist', () => {
    mockedUseSARDrafts.mockReturnValue(createMockHookResult());
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByText('No SAR drafts')).toBeInTheDocument();
    expect(screen.getByText(/Click 'Generate SAR Draft'/)).toBeInTheDocument();
  });

  it('renders all 5 SAR sections when a draft exists', () => {
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT], activeDraft: MOCK_DRAFT }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByText('Subject Information')).toBeInTheDocument();
    expect(screen.getByText('Activity Description')).toBeInTheDocument();
    expect(screen.getByText('Narrative')).toBeInTheDocument();
    expect(screen.getByText('Reason for Suspicion')).toBeInTheDocument();
    expect(screen.getByText('Action Taken')).toBeInTheDocument();
  });

  it('displays section content from the draft', () => {
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT], activeDraft: MOCK_DRAFT }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByText('Subject information about the case.')).toBeInTheDocument();
    expect(screen.getByText('Description of suspicious activity.')).toBeInTheDocument();
  });

  it('renders the Generate SAR Draft button', () => {
    mockedUseSARDrafts.mockReturnValue(createMockHookResult());
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByText('Generate SAR Draft')).toBeInTheDocument();
  });

  it('renders the Download PDF link when a draft exists', () => {
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT], activeDraft: MOCK_DRAFT }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    const pdfLink = screen.getByText('Download PDF');
    expect(pdfLink).toHaveAttribute('href', expect.stringContaining('/sar/draft-1/pdf'));
  });

  it('shows Edit button for each section', () => {
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT], activeDraft: MOCK_DRAFT }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons).toHaveLength(5);
  });

  it('opens edit mode when Edit is clicked', async () => {
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT], activeDraft: MOCK_DRAFT }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    const editButtons = screen.getAllByText('Edit');
    await userEvent.click(editButtons[0]);
    expect(screen.getByLabelText('Edit Subject Information')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('cancels edit mode', async () => {
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT], activeDraft: MOCK_DRAFT }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    const editButtons = screen.getAllByText('Edit');
    await userEvent.click(editButtons[0]);
    await userEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByLabelText('Edit Subject Information')).not.toBeInTheDocument();
    expect(screen.getByText('Subject information about the case.')).toBeInTheDocument();
  });

  it('shows error state on fetch failure with no drafts', () => {
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ error: 'Server error' }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByText('Failed to load SAR drafts')).toBeInTheDocument();
  });

  // --- handleSave ---

  it('calls updateDraft with correct args when Save is clicked after editing', async () => {
    const updateDraft = vi.fn().mockResolvedValue(undefined);
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT], activeDraft: MOCK_DRAFT, updateDraft }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    const editButtons = screen.getAllByText('Edit');
    await userEvent.click(editButtons[0]);
    const textarea = screen.getByLabelText('Edit Subject Information');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Updated subject info via test');
    await userEvent.click(screen.getByText('Save'));
    expect(updateDraft).toHaveBeenCalledOnce();
    expect(updateDraft).toHaveBeenCalledWith('draft-1', { subject_info: 'Updated subject info via test' });
  });

  it('exits edit mode after a successful save', async () => {
    const updateDraft = vi.fn().mockResolvedValue(undefined);
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT], activeDraft: MOCK_DRAFT, updateDraft }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    await userEvent.click(screen.getAllByText('Edit')[0]);
    await userEvent.click(screen.getByText('Save'));
    expect(screen.queryByLabelText('Edit Subject Information')).not.toBeInTheDocument();
  });

  it('clears isSaving even when updateDraft rejects', async () => {
    const updateDraft = vi.fn().mockRejectedValue(new Error('Network error'));
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT], activeDraft: MOCK_DRAFT, updateDraft }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    await userEvent.click(screen.getAllByText('Edit')[0]);
    await userEvent.click(screen.getByText('Save'));
    // Edit mode should still be open since save failed
    expect(screen.getByLabelText('Edit Subject Information')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  // --- Generate button ---

  it('calls generateDraft with analystUsername when Generate button is clicked', async () => {
    const generateDraft = vi.fn();
    mockedUseSARDrafts.mockReturnValue(createMockHookResult({ generateDraft }));
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    await userEvent.click(screen.getByText('Generate SAR Draft'));
    expect(generateDraft).toHaveBeenCalledOnce();
    expect(generateDraft).toHaveBeenCalledWith('analyst.one');
  });

  it('shows Generating and disables button when isGenerating is true', () => {
    mockedUseSARDrafts.mockReturnValue(createMockHookResult({ isGenerating: true }));
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    const button = screen.getByText('Generating...');
    expect(button).toBeDisabled();
  });

  // --- Version selector ---

  it('renders version selector when 2+ drafts exist and calls selectDraft on change', async () => {
    const selectDraft = vi.fn();
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT_V2, MOCK_DRAFT], activeDraft: MOCK_DRAFT_V2, selectDraft }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    const versionSelect = screen.getByLabelText('Select SAR version');
    expect(versionSelect).toBeInTheDocument();
    await userEvent.selectOptions(versionSelect, 'draft-1');
    expect(selectDraft).toHaveBeenCalledOnce();
    expect(selectDraft).toHaveBeenCalledWith(MOCK_DRAFT);
  });

  it('does not call selectDraft when version selector value does not match any draft', () => {
    const selectDraft = vi.fn();
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT_V2, MOCK_DRAFT], activeDraft: MOCK_DRAFT_V2, selectDraft }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    const versionSelect = screen.getByLabelText('Select SAR version');
    fireEvent.change(versionSelect, { target: { value: 'non-existent-id' } });
    expect(selectDraft).not.toHaveBeenCalled();
  });

  it('does not render version selector when only 1 draft exists', () => {
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT], activeDraft: MOCK_DRAFT }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.queryByLabelText('Select SAR version')).not.toBeInTheDocument();
  });

  // --- Error with existing drafts ---

  it('shows error banner alongside sections when error exists with drafts', () => {
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT], activeDraft: MOCK_DRAFT, error: 'Partial refresh failed' }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByText('Partial refresh failed')).toBeInTheDocument();
    expect(screen.getByText('Subject Information')).toBeInTheDocument();
  });

  // --- Null section value ---

  it('shows "Not yet generated." for a section with null value', () => {
    const draftWithNull: SARDraft = { ...MOCK_DRAFT, subject_info: null };
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [draftWithNull], activeDraft: draftWithNull }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    expect(screen.getByText('Not yet generated.')).toBeInTheDocument();
  });

  it('renders version selector when activeDraft is null but 2+ drafts exist', () => {
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [MOCK_DRAFT, MOCK_DRAFT_V2], activeDraft: null }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    const versionSelect = screen.getByLabelText('Select SAR version');
    expect(versionSelect).toBeInTheDocument();
    // No SAR sections rendered since activeDraft is null
    expect(screen.getByText('No SAR drafts')).toBeInTheDocument();
  });

  it('pre-fills textarea with empty string when editing a null section', async () => {
    const draftWithNull: SARDraft = { ...MOCK_DRAFT, narrative: null };
    mockedUseSARDrafts.mockReturnValue(
      createMockHookResult({ drafts: [draftWithNull], activeDraft: draftWithNull }),
    );
    render(<SAREditor alertId="alert-1" analystUsername="analyst.one" />);
    const editButtons = screen.getAllByText('Edit');
    await userEvent.click(editButtons[2]); // Narrative is 3rd section
    const textarea = screen.getByLabelText('Edit Narrative');
    expect(textarea).toHaveValue('');
  });
});
