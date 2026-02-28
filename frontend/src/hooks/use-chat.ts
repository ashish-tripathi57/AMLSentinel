import { useState, useCallback } from 'react';
import type { ChatMessage } from '../types/investigation';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';

interface UseChatResult {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (userMessage: string, analyst: string) => Promise<void>;
  clearMessages: () => void;
}

/**
 * Manages the investigation AI chat for an alert.
 * Sends messages via POST and consumes the SSE stream to build the assistant response.
 */
export function useChat(alertId: string): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string, analyst: string) => {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        alert_id: alertId,
        role: 'user',
        content: userMessage,
        analyst_username: analyst,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setError(null);

      const assistantId = `assistant-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        alert_id: alertId,
        role: 'assistant',
        content: '',
        analyst_username: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(
          `${API_BASE_URL}/alerts/${alertId}/chat?analyst_username=${encodeURIComponent(analyst)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ content: userMessage }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Chat request failed' }));
          const detail = errorData.detail;
          const detailText =
            typeof detail === 'string'
              ? detail
              : Array.isArray(detail)
                ? detail.map((d: { msg?: string }) => d.msg ?? String(d)).join('; ')
                : `HTTP ${response.status}`;
          throw new Error(detailText);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              accumulated += data.replace(/\\n/g, '\n');
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
              );
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chat failed');
        // Remove the empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsStreaming(false);
      }
    },
    [alertId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, sendMessage, clearMessages };
}
