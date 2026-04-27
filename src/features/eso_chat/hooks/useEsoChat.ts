import { useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';
import { useAppDispatch } from '@/store/useAppDispatch';

import {
  selectChatError,
  selectChatMessages,
  selectIsStreaming,
} from '../store/esoChatSelectors';
import {
  addAssistantMessage,
  addUserMessage,
  appendToLastAssistant,
  clearChat,
  setError,
  setLastAssistantSources,
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
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
  clearChat: () => void;
}

export const useEsoChat = (): UseEsoChatReturn => {
  const dispatch = useAppDispatch();
  const messages = useSelector((state: RootState) => selectChatMessages(state));
  const isStreaming = useSelector((state: RootState) => selectIsStreaming(state));
  const error = useSelector((state: RootState) => selectChatError(state));
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      dispatch(addUserMessage({ id: nextId(), content: content.trim() }));
      const assistantId = nextId();
      dispatch(addAssistantMessage({ id: assistantId }));
      dispatch(setStreaming(true));

      try {
        const response = await fetch(`${API_URL}/api/eso-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content.trim() }),
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
              dispatch(appendToLastAssistant(data));
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
      }
    },
    [dispatch, isStreaming],
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
    sendMessage,
    stopStreaming,
    clearChat: handleClearChat,
  };
};
