import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyticsService } from './analytics-service';

describe('analyticsService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it('fetches analytics overview', async () => {
    const mockOverview = {
      total_alerts: 100,
      open_alerts: 40,
      closed_alerts: 60,
      average_investigation_days: 3.5,
      false_positive_rate: 0.25,
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOverview),
    });

    const result = await analyticsService.getOverview();

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/analytics/overview',
      expect.any(Object)
    );
    expect(result.total_alerts).toBe(100);
    expect(result.false_positive_rate).toBe(0.25);
  });

  it('fetches alerts by typology', async () => {
    const mockData = [
      { typology: 'Structuring', count: 15 },
      { typology: 'Layering', count: 8 },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await analyticsService.getAlertsByTypology();

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/analytics/alerts-by-typology',
      expect.any(Object)
    );
    expect(result).toHaveLength(2);
    expect(result[0].typology).toBe('Structuring');
  });

  it('fetches resolution breakdown', async () => {
    const mockData = [
      { resolution: 'SAR Filed', count: 20 },
      { resolution: 'No Suspicion', count: 30 },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await analyticsService.getResolutionBreakdown();

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/analytics/resolution-breakdown',
      expect.any(Object)
    );
    expect(result).toHaveLength(2);
    expect(result[0].resolution).toBe('SAR Filed');
  });

  it('fetches risk distribution', async () => {
    const mockData = [
      { range: '0-20', count: 5 },
      { range: '81-100', count: 12 },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await analyticsService.getRiskDistribution();

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/analytics/risk-distribution',
      expect.any(Object)
    );
    expect(result).toHaveLength(2);
    expect(result[1].range).toBe('81-100');
  });

  it('fetches alert volume trend with default days', async () => {
    const mockData = [
      { date: '2026-02-01', count: 3 },
      { date: '2026-02-02', count: 5 },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await analyticsService.getAlertVolumeTrend();

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/analytics/alert-volume-trend?days=30',
      expect.any(Object)
    );
    expect(result).toHaveLength(2);
  });

  it('fetches alert volume trend with custom days', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await analyticsService.getAlertVolumeTrend(60);

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/analytics/alert-volume-trend?days=60',
      expect.any(Object)
    );
  });

  it('fetches false positive trend with default days', async () => {
    const mockData = [
      { week: '2026-W05', total_closed: 10, false_positive_count: 3, rate: 0.3 },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await analyticsService.getFalsePositiveTrend();

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/analytics/false-positive-trend?days=90',
      expect.any(Object)
    );
    expect(result[0].rate).toBe(0.3);
  });

  it('fetches false positive trend with custom days', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await analyticsService.getFalsePositiveTrend(180);

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/analytics/false-positive-trend?days=180',
      expect.any(Object)
    );
  });
});
