import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { ChatMessage, SourcePayload } from '../types';

export interface EsoChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
}

const initialState: EsoChatState = {
  messages: [],
  isStreaming: false,
  error: null,
};

export const esoChatSlice = createSlice({
  name: 'esoChat',
  initialState,
  reducers: {
    addUserMessage(state, action: PayloadAction<{ id: string; content: string }>) {
      state.messages.push({
        id: action.payload.id,
        role: 'user',
        content: action.payload.content,
        timestamp: Date.now(),
      });
      state.error = null;
    },
    addAssistantMessage(state, action: PayloadAction<{ id: string }>) {
      state.messages.push({
        id: action.payload.id,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      });
    },
    appendToLastAssistant(state, action: PayloadAction<string>) {
      const last = state.messages[state.messages.length - 1];
      if (last?.role === 'assistant') {
        last.content += action.payload;
      }
    },
    setLastAssistantSources(state, action: PayloadAction<SourcePayload>) {
      const last = state.messages[state.messages.length - 1];
      if (last?.role === 'assistant') {
        last.sources = action.payload;
      }
    },
    setStreaming(state, action: PayloadAction<boolean>) {
      state.isStreaming = action.payload;
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isStreaming = false;
    },
    clearChat() {
      return initialState;
    },
  },
});

export const {
  addUserMessage,
  addAssistantMessage,
  appendToLastAssistant,
  setLastAssistantSources,
  setStreaming,
  setError,
  clearChat,
} = esoChatSlice.actions;

export const esoChatReducer = esoChatSlice.reducer;
