import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvestigationChat } from './InvestigationChat';
import { useChat } from '../../hooks/use-chat';
import type { ChatMessage } from '../../types/investigation';

vi.mock('../../hooks/use-chat', () => ({
  useChat: vi.fn(),
}));

const mockUseChat = vi.mocked(useChat);

const DEFAULT_ALERT_ID = 'alert-1';
const DEFAULT_ANALYST = 'analyst.one';

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    alert_id: DEFAULT_ALERT_ID,
    role: 'user',
    content: 'Hello',
    analyst_username: DEFAULT_ANALYST,
    created_at: '2026-02-24T10:00:00Z',
    ...overrides,
  };
}

function renderChat(alertId = DEFAULT_ALERT_ID, analystUsername = DEFAULT_ANALYST) {
  return render(
    <InvestigationChat alertId={alertId} analystUsername={analystUsername} />,
  );
}

describe('InvestigationChat', () => {
  let mockSendMessage: ReturnType<typeof vi.fn>;
  let mockClearMessages: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockSendMessage = vi.fn().mockResolvedValue(undefined);
    mockClearMessages = vi.fn();

    mockUseChat.mockReturnValue({
      messages: [],
      isStreaming: false,
      error: null,
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });
  });

  // -- Basic rendering --

  it('renders the chat panel heading', () => {
    renderChat();
    expect(screen.getByText('AI Investigation Chat')).toBeInTheDocument();
  });

  it('shows placeholder text when no messages', () => {
    renderChat();
    expect(screen.getByText(/Ask questions about this alert/)).toBeInTheDocument();
  });

  it('renders the chat input field', () => {
    renderChat();
    expect(screen.getByLabelText('Chat message')).toBeInTheDocument();
  });

  it('renders the Send button', () => {
    renderChat();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('disables Send button when input is empty', () => {
    renderChat();
    expect(screen.getByText('Send')).toBeDisabled();
  });

  it('enables Send button when text is entered', async () => {
    renderChat();
    await userEvent.type(screen.getByLabelText('Chat message'), 'Hello');
    expect(screen.getByText('Send')).not.toBeDisabled();
  });

  it('does not show Clear button when no messages', () => {
    renderChat();
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });

  // -- handleSubmit --

  it('calls sendMessage with trimmed input and analystUsername on form submit', async () => {
    renderChat();

    const input = screen.getByLabelText('Chat message');
    await userEvent.type(input, '  What is the risk?  ');
    await userEvent.click(screen.getByText('Send'));

    expect(mockSendMessage).toHaveBeenCalledOnce();
    expect(mockSendMessage).toHaveBeenCalledWith('What is the risk?', DEFAULT_ANALYST);
  });

  it('clears the input field after form submission', async () => {
    renderChat();

    const input = screen.getByLabelText('Chat message');
    await userEvent.type(input, 'Hello');
    await userEvent.click(screen.getByText('Send'));

    expect(input).toHaveValue('');
  });

  it('does not call sendMessage when input is only whitespace', async () => {
    renderChat();

    const input = screen.getByLabelText('Chat message');
    await userEvent.type(input, '   ');
    expect(screen.getByText('Send')).toBeDisabled();
  });

  it('does not call sendMessage when isStreaming is true', () => {
    mockUseChat.mockReturnValue({
      messages: [],
      isStreaming: true,
      error: null,
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    renderChat();

    expect(screen.getByText('Sending...')).toBeDisabled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('guards handleSubmit when isStreaming is true (form submit)', async () => {
    mockUseChat.mockReturnValue({
      messages: [],
      isStreaming: true,
      error: null,
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    renderChat();

    // Type text into input and force form submit
    const input = screen.getByLabelText('Chat message');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.submit(input.closest('form')!);

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  // -- Message rendering --

  it('renders user messages with content and analyst username', () => {
    const userMsg = buildMessage({
      id: 'user-1',
      role: 'user',
      content: 'Explain transaction patterns',
      analyst_username: 'john.doe',
    });

    mockUseChat.mockReturnValue({
      messages: [userMsg],
      isStreaming: false,
      error: null,
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    renderChat();

    expect(screen.getByText('Explain transaction patterns')).toBeInTheDocument();
    expect(screen.getByText('john.doe')).toBeInTheDocument();
    expect(screen.queryByText(/Ask questions about this alert/)).not.toBeInTheDocument();
  });

  it('renders assistant messages without analyst username', () => {
    const assistantMsg = buildMessage({
      id: 'asst-1',
      role: 'assistant',
      content: 'The account shows unusual patterns.',
      analyst_username: null,
    });

    mockUseChat.mockReturnValue({
      messages: [assistantMsg],
      isStreaming: false,
      error: null,
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    renderChat();

    expect(screen.getByText('The account shows unusual patterns.')).toBeInTheDocument();
  });

  it('renders both user and assistant messages in a conversation', () => {
    const userMsg = buildMessage({
      id: 'user-1',
      role: 'user',
      content: 'What is the risk score?',
      analyst_username: DEFAULT_ANALYST,
    });
    const assistantMsg = buildMessage({
      id: 'asst-1',
      role: 'assistant',
      content: 'The risk score is 85 out of 100.',
      analyst_username: null,
    });

    mockUseChat.mockReturnValue({
      messages: [userMsg, assistantMsg],
      isStreaming: false,
      error: null,
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    renderChat();

    expect(screen.getByText('What is the risk score?')).toBeInTheDocument();
    expect(screen.getByText('The risk score is 85 out of 100.')).toBeInTheDocument();
  });

  it('does not render analyst username for user message when analyst_username is null', () => {
    const userMsg = buildMessage({
      id: 'user-1',
      role: 'user',
      content: 'Anonymous question',
      analyst_username: null,
    });

    mockUseChat.mockReturnValue({
      messages: [userMsg],
      isStreaming: false,
      error: null,
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    renderChat();

    expect(screen.getByText('Anonymous question')).toBeInTheDocument();
  });

  // -- Clear button --

  it('shows Clear button when messages exist', () => {
    mockUseChat.mockReturnValue({
      messages: [buildMessage()],
      isStreaming: false,
      error: null,
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    renderChat();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('calls clearMessages when Clear button is clicked', async () => {
    mockUseChat.mockReturnValue({
      messages: [buildMessage()],
      isStreaming: false,
      error: null,
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    renderChat();
    await userEvent.click(screen.getByText('Clear'));
    expect(mockClearMessages).toHaveBeenCalledOnce();
  });

  // -- Error display --

  it('displays the error message when error is set', () => {
    mockUseChat.mockReturnValue({
      messages: [],
      isStreaming: false,
      error: 'Network connection failed',
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    renderChat();
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
  });

  // -- Streaming state --

  it('shows "Sending..." on button and disables input when isStreaming is true', () => {
    mockUseChat.mockReturnValue({
      messages: [],
      isStreaming: true,
      error: null,
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    renderChat();
    expect(screen.getByText('Sending...')).toBeInTheDocument();
    expect(screen.getByText('Sending...')).toBeDisabled();
    expect(screen.getByLabelText('Chat message')).toBeDisabled();
  });

  it('shows "..." fallback for assistant message with empty content during streaming', () => {
    const emptyAssistantMsg = buildMessage({
      id: 'asst-streaming',
      role: 'assistant',
      content: '',
      analyst_username: null,
    });

    mockUseChat.mockReturnValue({
      messages: [emptyAssistantMsg],
      isStreaming: true,
      error: null,
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    renderChat();
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('does not show "..." fallback for empty assistant message when not streaming', () => {
    const emptyAssistantMsg = buildMessage({
      id: 'asst-done',
      role: 'assistant',
      content: '',
      analyst_username: null,
    });

    mockUseChat.mockReturnValue({
      messages: [emptyAssistantMsg],
      isStreaming: false,
      error: null,
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    renderChat();
    expect(screen.queryByText('...')).not.toBeInTheDocument();
  });

  // -- scrollIntoView --

  it('calls scrollIntoView when messages update', () => {
    const scrollIntoViewMock = vi.fn();
    HTMLDivElement.prototype.scrollIntoView = scrollIntoViewMock;

    mockUseChat.mockReturnValue({
      messages: [buildMessage()],
      isStreaming: false,
      error: null,
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    renderChat();
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  // -- Hook wiring --

  it('passes alertId to useChat hook', () => {
    renderChat('custom-alert-42');
    expect(mockUseChat).toHaveBeenCalledWith('custom-alert-42');
  });
});
