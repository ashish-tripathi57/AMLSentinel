import { describe, it, expect, beforeEach, vi } from 'vitest';
import { investigationService } from './investigation-service';

describe('investigationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it('fetches customer for alert', async () => {
    await investigationService.getCustomer('alert-uuid');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/alerts/alert-uuid/customer',
      expect.any(Object)
    );
  });

  it('fetches transactions for alert', async () => {
    await investigationService.getTransactions('alert-uuid');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/alerts/alert-uuid/transactions',
      expect.any(Object)
    );
  });

  it('fetches network graph for alert', async () => {
    await investigationService.getNetwork('alert-uuid');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/alerts/alert-uuid/network',
      expect.any(Object)
    );
  });

  it('fetches notes for alert', async () => {
    await investigationService.getNotes('alert-uuid');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/alerts/alert-uuid/notes',
      expect.any(Object)
    );
  });

  it('creates a note', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'note-1' }),
    });
    await investigationService.createNote('alert-uuid', 'Test note', 'sarah.chen');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/alerts/alert-uuid/notes'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('fetches checklist for alert', async () => {
    await investigationService.getChecklist('alert-uuid');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/alerts/alert-uuid/checklist',
      expect.any(Object)
    );
  });

  it('updates checklist item', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    await investigationService.updateChecklistItem('alert-uuid', 'item-1', true, 'ai', 'Verified');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/alerts/alert-uuid/checklist/item-1'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('sends null ai_rationale when omitted', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    await investigationService.updateChecklistItem('alert-uuid', 'item-2', false, 'analyst');
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.ai_rationale).toBeNull();
  });

  it('fetches audit trail', async () => {
    await investigationService.getAuditTrail('alert-uuid');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/alerts/alert-uuid/audit-trail',
      expect.any(Object)
    );
  });

  it('fetches audit trail with action filter', async () => {
    await investigationService.getAuditTrail('alert-uuid', 'status_change');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('action=status_change'),
      expect.any(Object)
    );
  });

  it('auto-checks a checklist item', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ is_checked: true, rationale: 'AI verified.' }),
    });
    await investigationService.autoCheckItem('alert-uuid', 'item-1');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/alerts/alert-uuid/checklist/item-1/auto-check'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('generates a SAR draft', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'sar-1' }),
    });
    await investigationService.generateSAR('alert-uuid', 'analyst.one');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/alerts/alert-uuid/sar/generate'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('fetches SAR drafts', async () => {
    await investigationService.getSARDrafts('alert-uuid');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/alerts/alert-uuid/sar',
      expect.any(Object)
    );
  });

  it('updates a SAR draft', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'sar-1' }),
    });
    await investigationService.updateSARDraft('alert-uuid', 'sar-1', {
      narrative: 'Updated narrative.',
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/alerts/alert-uuid/sar/sar-1'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('fetches similar cases for alert', async () => {
    const mockCases = [
      {
        id: 'uuid-10',
        alert_id: 'S10',
        title: 'Structuring Alert',
        typology: 'Structuring',
        risk_score: 82,
        status: 'Closed',
        resolution: 'SAR Filed',
        similarity_score: 91,
        matching_factors: ['Same typology'],
      },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCases),
    });
    const result = await investigationService.getSimilarCases('alert-uuid');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/alerts/alert-uuid/similar-cases',
      expect.any(Object)
    );
    expect(result).toEqual(mockCases);
  });
});
