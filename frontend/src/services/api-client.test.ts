import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from './api-client';

describe('apiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('makes GET requests with correct URL', async () => {
    const mockResponse = { data: 'test' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await apiClient.get('/test');
    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/test',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('includes auth token in headers when available', async () => {
    localStorage.setItem('auth_token', 'test-token');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient.get('/test');
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('makes POST requests with body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1' }),
    });

    await apiClient.post('/items', { name: 'test' });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      })
    );
  });

  it('makes PATCH requests', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient.patch('/items/1', { status: 'active' });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/items/1',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('makes DELETE requests', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient.delete('/items/1');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/items/1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('throws error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: 'Not found' }),
    });

    await expect(apiClient.get('/missing')).rejects.toThrow('Not found');
  });

  it('throws generic error when response has no detail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('parse error')),
    });

    await expect(apiClient.get('/error')).rejects.toThrow('Request failed');
  });

  it('falls back to HTTP status code when error body has no detail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ message: 'validation error' }),
    });

    await expect(apiClient.get('/bad')).rejects.toThrow('HTTP 422');
  });

  it('does not include Authorization header when no token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient.get('/test');
    const callHeaders = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
    expect(callHeaders).not.toHaveProperty('Authorization');
  });
});
