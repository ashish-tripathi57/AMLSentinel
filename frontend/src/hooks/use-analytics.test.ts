import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnalytics } from './use-analytics';

/* Realistic mock data matching the backend API shapes */
const MOCK_OVERVIEW = {
  total_alerts: 100,
  open_alerts: 40,
  closed_alerts: 60,
  average_investigation_days: 3.5,
  false_positive_rate: 0.25,
};

const MOCK_TYPOLOGY = [
  { typology: 'Structuring', count: 15 },
  { typology: 'Layering', count: 8 },
];

const MOCK_RESOLUTION = [
  { resolution: 'SAR Filed', count: 20 },
  { resolution: 'No Suspicion', count: 30 },
];

const MOCK_RISK = [
  { range: '0-20', count: 5 },
  { range: '81-100', count: 12 },
];

const MOCK_VOLUME = [
  { date: '2026-02-01', count: 3 },
  { date: '2026-02-02', count: 5 },
];

const MOCK_FP_TREND = [
  { week: '2026-W05', total_closed: 10, false_positive_count: 3, rate: 0.3 },
];

/** Route a fetch URL to the correct mock response. */
function mockAllEndpoints() {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    let data: unknown = {};

    if (url.includes('/analytics/overview')) data = MOCK_OVERVIEW;
    else if (url.includes('/analytics/alerts-by-typology')) data = MOCK_TYPOLOGY;
    else if (url.includes('/analytics/resolution-breakdown')) data = MOCK_RESOLUTION;
    else if (url.includes('/analytics/risk-distribution')) data = MOCK_RISK;
    else if (url.includes('/analytics/alert-volume-trend')) data = MOCK_VOLUME;
    else if (url.includes('/analytics/false-positive-trend')) data = MOCK_FP_TREND;

    return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
  });
}

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches all analytics data on mount', async () => {
    mockAllEndpoints();

    const { result } = renderHook(() => useAnalytics());

    /* Initially loading */
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.overview).toEqual(MOCK_OVERVIEW);
    expect(result.current.typologyData).toEqual(MOCK_TYPOLOGY);
    expect(result.current.resolutionData).toEqual(MOCK_RESOLUTION);
    expect(result.current.riskDistribution).toEqual(MOCK_RISK);
    expect(result.current.volumeTrend).toEqual(MOCK_VOLUME);
    expect(result.current.fpTrend).toEqual(MOCK_FP_TREND);
    expect(result.current.error).toBeNull();
  });

  it('sets error when overview fetch fails', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/analytics/overview')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ detail: 'Database unavailable' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Database unavailable');
  });

  it('sets fallback error for non-Error thrown', async () => {
    global.fetch = vi.fn().mockRejectedValue(42);

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to fetch analytics');
  });

  it('returns null overview when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.overview).toBeNull();
  });

  it('returns empty arrays for chart data when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.typologyData).toEqual([]);
    expect(result.current.resolutionData).toEqual([]);
    expect(result.current.riskDistribution).toEqual([]);
    expect(result.current.volumeTrend).toEqual([]);
    expect(result.current.fpTrend).toEqual([]);
  });

  it('calls all six analytics endpoints', async () => {
    mockAllEndpoints();

    renderHook(() => useAnalytics());

    await waitFor(() => {
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.length).toBe(6);
    });

    const urls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map(
      (call: string[]) => call[0]
    );
    expect(urls).toContainEqual(expect.stringContaining('/analytics/overview'));
    expect(urls).toContainEqual(expect.stringContaining('/analytics/alerts-by-typology'));
    expect(urls).toContainEqual(expect.stringContaining('/analytics/resolution-breakdown'));
    expect(urls).toContainEqual(expect.stringContaining('/analytics/risk-distribution'));
    expect(urls).toContainEqual(expect.stringContaining('/analytics/alert-volume-trend'));
    expect(urls).toContainEqual(expect.stringContaining('/analytics/false-positive-trend'));
  });
});
