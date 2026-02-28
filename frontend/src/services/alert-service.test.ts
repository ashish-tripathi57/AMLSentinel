import { describe, it, expect, beforeEach, vi } from 'vitest';
import { alertService } from './alert-service';

describe('alertService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ alerts: [], total: 0 }),
    });
  });

  it('fetches alerts without filters', async () => {
    await alertService.getAlerts();
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/alerts',
      expect.any(Object)
    );
  });

  it('fetches alerts with filters', async () => {
    await alertService.getAlerts({ typology: 'Structuring', risk_min: 70 });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain('typology=Structuring');
    expect(url).toContain('risk_min=70');
  });

  it('skips empty-string filter values in query string', async () => {
    await alertService.getAlerts({ typology: '', status: 'New' });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).not.toContain('typology');
    expect(url).toContain('status=New');
  });

  it('fetches alert by id', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'uuid-1' }),
    });
    await alertService.getAlertById('uuid-1');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/alerts/uuid-1',
      expect.any(Object)
    );
  });

  it('fetches alert by alert_id', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ alert_id: 'S1' }),
    });
    await alertService.getAlertByAlertId('S1');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/alerts/by-alert-id/S1',
      expect.any(Object)
    );
  });

  it('updates alert status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    await alertService.updateStatus('uuid-1', 'In Progress', 'Starting investigation', 'sarah.chen');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/alerts/uuid-1/status'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('fetches stats', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ total_alerts: 20, open_alerts: 15, high_risk_count: 8 }),
    });
    const stats = await alertService.getStats();
    expect(stats.total_alerts).toBe(20);
  });

  it('sends resolution in updateStatus body when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    await alertService.updateStatus('uuid-1', 'Closed', 'No issues', 'sarah.chen', 'No Suspicion');
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.resolution).toBe('No Suspicion');
  });

  it('omits resolution from updateStatus body when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    await alertService.updateStatus('uuid-1', 'In Progress', 'Starting', 'sarah.chen');
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.resolution).toBeUndefined();
  });

  it('passes resolution filter in query string', async () => {
    await alertService.getAlerts({ resolution: 'SAR Filed' });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain('resolution=SAR+Filed');
  });

  it('passes assigned_analyst filter in query string', async () => {
    await alertService.getAlerts({ assigned_analyst: 'sarah.chen' });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain('assigned_analyst=sarah.chen');
  });
});
