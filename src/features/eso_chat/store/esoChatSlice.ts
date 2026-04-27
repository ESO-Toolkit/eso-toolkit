import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';

import type { ChatMessage, SourcePayload } from '../types';

export interface EsoChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  statusText: string | null;
}

const initialState: EsoChatState = {
  messages: [],
  isStreaming: false,
  error: null,
  statusText: null,
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
      if (!action.payload) state.statusText = null;
    },
    setStatusText(state, action: PayloadAction<string | null>) {
      state.statusText = action.payload;
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isStreaming = false;
    },
    deleteMessagePair(state, action: PayloadAction<string>) {
      const idx = state.messages.findIndex((m) => m.id === action.payload);
      if (idx === -1) return;
      const msg = state.messages[idx];
      if (msg.role === 'user') {
        const next = state.messages[idx + 1];
        const count = next?.role === 'assistant' ? 2 : 1;
        state.messages.splice(idx, count);
      } else {
        const prev = state.messages[idx - 1];
        if (prev?.role === 'user') {
          state.messages.splice(idx - 1, 2);
        } else {
          state.messages.splice(idx, 1);
        }
      }
    },
    removeAssistantResponse(state, action: PayloadAction<string>) {
      const idx = state.messages.findIndex(
        (m) => m.id === action.payload && m.role === 'assistant',
      );
      if (idx !== -1) state.messages.splice(idx, 1);
    },
    clearChat() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(REHYDRATE, (state, action) => {
      const payload = (action as { payload?: { esoChat?: EsoChatState } }).payload;
      if (payload?.esoChat) {
        return { ...payload.esoChat, isStreaming: false, error: null, statusText: null };
      }
      return state;
    });
  },
});

export const {
  addUserMessage,
  addAssistantMessage,
  appendToLastAssistant,
  setLastAssistantSources,
  setStreaming,
  setStatusText,
  setError,
  deleteMessagePair,
  removeAssistantResponse,
  clearChat,
} = esoChatSlice.actions;

export const esoChatReducer = esoChatSlice.reducer;
