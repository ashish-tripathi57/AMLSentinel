import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/use-chat';
import { Card, CardHeader, CardContent } from '../common';

interface InvestigationChatProps {
  alertId: string;
  analystUsername: string;
}

/**
 * Real-time AI investigation chat panel with SSE streaming.
 * Shows user and assistant message bubbles, auto-scrolls to the latest message.
 */
export function InvestigationChat({ alertId, analystUsername }: InvestigationChatProps) {
  const { messages, isStreaming, error, sendMessage, clearMessages } = useChat(alertId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or content is streaming
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setInput('');
    await sendMessage(trimmed, analystUsername);
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">AI Investigation Chat</h3>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </CardHeader>

      {/* Messages area */}
      <CardContent className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && !error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-text-muted">
              Ask questions about this alert's transactions, patterns, or risk indicators.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-page-bg border border-card-border text-text-primary'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content || (isStreaming ? '...' : '')}</p>
              {msg.role === 'user' && msg.analyst_username && (
                <p className="mt-1 text-xs opacity-70">{msg.analyst_username}</p>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="rounded-lg border border-severity-critical/30 bg-severity-critical/5 px-3 py-2">
            <p className="text-xs text-severity-critical">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input area */}
      <div className="border-t border-card-border px-4 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this alert..."
            disabled={isStreaming}
            className="flex-1 rounded-md border border-card-border bg-page-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            aria-label="Chat message"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </Card>
  );
}
