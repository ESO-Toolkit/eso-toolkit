import type { HistoryMessage } from '../types';

import { glmChatSync } from './glm-client';

const REWRITE_PROMPT = `You rewrite follow-up questions into standalone search queries.
Given a conversation and a follow-up message, rewrite the follow-up as a self-contained question that includes all necessary context from the conversation.
Output ONLY the rewritten query — no explanation, no quotes, no prefix.
If the message is already self-contained, return it unchanged.`;

export async function rewriteQuery(
  message: string,
  history: HistoryMessage[],
  glmApiKey?: string,
): Promise<string> {
  if (history.length === 0) return message;

  const recentHistory = history.slice(-4);
  const historyText = recentHistory
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const userPrompt = `Conversation:\n${historyText}\n\nFollow-up: ${message}\n\nRewritten query:`;

  if (glmApiKey) {
    try {
      const rewritten = await glmChatSync(glmApiKey, [
        { role: 'system', content: REWRITE_PROMPT },
        { role: 'user', content: userPrompt },
      ]);
      const trimmed = rewritten.trim();
      if (trimmed.length > 0 && trimmed.length < 500) return trimmed;
    } catch {
      // Fall through to original message
    }
  }

  return message;
}
