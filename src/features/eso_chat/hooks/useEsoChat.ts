import { useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';
import { useAppDispatch } from '@/store/useAppDispatch';

import {
  selectChatError,
  selectChatMessages,
  selectIsStreaming,
  selectStatusText,
} from '../store/esoChatSelectors';
import {
  addAssistantMessage,
  addUserMessage,
  appendToLastAssistant,
  clearChat,
  deleteMessagePair,
  removeAssistantResponse,
  setError,
  setLastAssistantSources,
  setStatusText,
  setStreaming,
} from '../store/esoChatSlice';
import type { ChatMessage, SourcePayload } from '../types';

const API_URL = import.meta.env.VITE_ESO_CHAT_API_URL ?? 'http://localhost:8787';

let messageCounter = 0;
const nextId = (): string => `msg-${Date.now()}-${++messageCounter}`;

interface UseEsoChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  statusText: string | null;
  sendMessage: (content: string) => Promise<void>;
  retryMessage: (assistantId: string) => Promise<void>;
  deleteMessage: (id: string) => void;
  stopStreaming: () => void;
  clearChat: () => void;
}

export const useEsoChat = (): UseEsoChatReturn => {
  const dispatch = useAppDispatch();
  const messages = useSelector((state: RootState) => selectChatMessages(state));
  const isStreaming = useSelector((state: RootState) => selectIsStreaming(state));
  const error = useSelector((state: RootState) => selectChatError(state));
  const statusText = useSelector((state: RootState) => selectStatusText(state));
  const abortRef = useRef<AbortController | null>(null);

  const streamResponse = useCallback(
    async (content: string, history: { role: 'user' | 'assistant'; content: string }[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const assistantId = nextId();
      dispatch(addAssistantMessage({ id: assistantId }));
      dispatch(setStreaming(true));

      try {
        const response = await fetch(`${API_URL}/api/eso-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, history }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Request failed' }));
          throw new Error((err as { error?: string }).error ?? `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const event of events) {
            const lines = event.split('\n');
            let eventType = '';
            const dataLines: string[] = [];

            for (const line of lines) {
              if (line.startsWith('event: ') || line.startsWith('event:')) {
                eventType = line.replace(/^event:\s?/, '').trim();
              } else if (line.startsWith('data: ') || line.startsWith('data:')) {
                dataLines.push(line.replace(/^data:\s?/, ''));
              }
            }

            const data = dataLines.join('\n');

            if (!eventType || !data) continue;

            if (eventType === 'token') {
              dispatch(setStatusText(null));
              dispatch(appendToLastAssistant(data));
            } else if (eventType === 'status') {
              dispatch(setStatusText(data));
            } else if (eventType === 'sources') {
              try {
                const sources: SourcePayload = JSON.parse(data);
                dispatch(setLastAssistantSources(sources));
              } catch {
                // skip malformed sources
              }
            } else if (eventType === 'error') {
              try {
                const errData = JSON.parse(data) as { error: string };
                dispatch(setError(errData.error));
              } catch {
                dispatch(setError('Stream error'));
              }
            }
          }
        }

        dispatch(setStreaming(false));
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        dispatch(setError((err as Error).message));
        dispatch(setStreaming(false));
      }
    },
    [dispatch],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      dispatch(addUserMessage({ id: nextId(), content: content.trim() }));
      await streamResponse(content.trim(), history);
    },
    [dispatch, isStreaming, messages, streamResponse],
  );

  const retryMessage = useCallback(
    async (assistantId: string) => {
      if (isStreaming) return;

      const idx = messages.findIndex((m) => m.id === assistantId && m.role === 'assistant');
      if (idx === -1) return;

      const userMsg = messages[idx - 1];
      if (!userMsg || userMsg.role !== 'user') return;

      const history = messages
        .slice(0, idx - 1)
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      dispatch(removeAssistantResponse(assistantId));
      await streamResponse(userMsg.content, history);
    },
    [dispatch, isStreaming, messages, streamResponse],
  );

  const deleteMessage = useCallback(
    (id: string) => {
      if (isStreaming) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.id === id) return;
      }
      dispatch(deleteMessagePair(id));
    },
    [dispatch, isStreaming, messages],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    dispatch(setStreaming(false));
  }, [dispatch]);

  const handleClearChat = useCallback(() => {
    abortRef.current?.abort();
    dispatch(clearChat());
  }, [dispatch]);

  return {
    messages,
    isStreaming,
    error,
    statusText,
    sendMessage,
    retryMessage,
    deleteMessage,
    stopStreaming,
    clearChat: handleClearChat,
  };
};
