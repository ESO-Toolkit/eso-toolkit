/**
 * Centralized model and configuration constants.
 * Change model IDs here to swap models across the entire worker.
 */

export const CHAT_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8' as const;

export const GLM_MODEL = 'glm-4.5-flash' as const;
export const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions' as const;

export const EMBEDDING_MODEL = '@cf/baai/bge-m3' as const;

export const EMBEDDING_DIMENSIONS = 1024;

export const VECTORIZE_TOP_K = 8;

export const CHAT_TEMPERATURE = 0.2;

export const D1_BUILD_STATS_LIMIT = 10;

export const MAX_MESSAGE_LENGTH = 2000;

export const SSE_EVENTS = {
  TOKEN: 'token',
  SOURCES: 'sources',
  ERROR: 'error',
  DONE: 'done',
} as const;
