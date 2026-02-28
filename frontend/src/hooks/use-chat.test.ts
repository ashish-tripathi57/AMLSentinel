import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from './use-chat';

describe('useChat', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with empty messages and no errors', () => {
    const { result } = renderHook(() => useChat('alert-1'));

    expect(result.current.messages).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('clearMessages resets the state', () => {
    const { result } = renderHook(() => useChat('alert-1'));

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('sendMessage adds a user message immediately', async () => {
    // Mock fetch that returns an empty stream
    const mockReader = {
      read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    const { result } = renderHook(() => useChat('alert-1'));

    await act(async () => {
      await result.current.sendMessage('Hello', 'analyst.one');
    });

    // Should have user message + assistant message
    expect(result.current.messages.length).toBe(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('Hello');
  });

  it('handles fetch error and sets error state', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: 'Alert not found' }),
    });

    const { result } = renderHook(() => useChat('alert-1'));

    await act(async () => {
      await result.current.sendMessage('Hello', 'analyst.one');
    });

    expect(result.current.error).toBe('Alert not found');
    // User message stays, assistant message removed on error
    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].role).toBe('user');
  });

  it('processes SSE stream chunks', async () => {
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode('data: Hello\n\n'),
      encoder.encode('data:  World\n\ndata: [DONE]\n\n'),
    ];

    let readIndex = 0;
    const mockReader = {
      read: vi.fn().mockImplementation(() => {
        if (readIndex < chunks.length) {
          return Promise.resolve({ done: false, value: chunks[readIndex++] });
        }
        return Promise.resolve({ done: true, value: undefined });
      }),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    const { result } = renderHook(() => useChat('alert-1'));

    await act(async () => {
      await result.current.sendMessage('Test', 'analyst.one');
    });

    expect(result.current.messages.length).toBe(2);
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toBe('Hello World');
    expect(result.current.isStreaming).toBe(false);
  });

  it('handles missing response body (no reader)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: null,
    });

    const { result } = renderHook(() => useChat('alert-1'));

    await act(async () => {
      await result.current.sendMessage('Test', 'analyst.one');
    });

    expect(result.current.error).toBe('No response body');
    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].role).toBe('user');
  });

  it('handles json parse failure in error response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Invalid JSON')),
    });

    const { result } = renderHook(() => useChat('alert-1'));

    await act(async () => {
      await result.current.sendMessage('Test', 'analyst.one');
    });

    expect(result.current.error).toBe('Chat request failed');
  });

  it('handles non-Error thrown during sendMessage', async () => {
    global.fetch = vi.fn().mockRejectedValue('network failure');

    const { result } = renderHook(() => useChat('alert-1'));

    await act(async () => {
      await result.current.sendMessage('Test', 'analyst.one');
    });

    expect(result.current.error).toBe('Chat failed');
  });

  it('includes auth token when present in localStorage', async () => {
    const mockReader = {
      read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    // Set the token directly in localStorage (jsdom provides a working localStorage)
    localStorage.setItem('auth_token', 'test-token');

    const { result } = renderHook(() => useChat('alert-1'));

    await act(async () => {
      await result.current.sendMessage('Test', 'analyst.one');
    });

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const fetchOptions = fetchCall[1] as { headers: Record<string, string> };
    expect(fetchOptions.headers['Authorization']).toBe('Bearer test-token');

    // Cleanup
    localStorage.removeItem('auth_token');
  });

  it('handles error response with detail field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'Bad request detail' }),
    });

    const { result } = renderHook(() => useChat('alert-1'));

    await act(async () => {
      await result.current.sendMessage('Test', 'analyst.one');
    });

    expect(result.current.error).toBe('Bad request detail');
  });

  it('handles error response without detail field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useChat('alert-1'));

    await act(async () => {
      await result.current.sendMessage('Test', 'analyst.one');
    });

    expect(result.current.error).toBe('HTTP 500');
  });
});
