import type { RootState } from '@/store/storeWithHistory';

import type { ChatMessage } from '../types';

export const selectChatMessages = (state: RootState): ChatMessage[] => state.esoChat.messages;
export const selectIsStreaming = (state: RootState): boolean => state.esoChat.isStreaming;
export const selectChatError = (state: RootState): string | null => state.esoChat.error;
export const selectStatusText = (state: RootState): string | null => state.esoChat.statusText;
