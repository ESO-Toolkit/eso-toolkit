import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { SSEMessage } from 'hono/streaming';

import { CHAT_MODEL, CHAT_TEMPERATURE, EMBEDDING_MODEL, MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH, SSE_EVENTS, VECTORIZE_TOP_K } from '../config';
import { keywordSearchKnowledgeDocs, queryBuildStats, queryKnowledgeDocsById } from '../lib/d1-queries';
import { extractIntent } from '../lib/intent-extraction';
import { glmChat } from '../lib/glm-client';
import { buildSystemPrompt } from '../lib/prompt-builder';
import { rewriteQuery } from '../lib/query-rewriter';
import type { BuildStatSource, ChatRequest, Env, KnowledgeDocSource, SourcePayload } from '../types';

export const chatRoute = new Hono<{ Bindings: Env }>();

const VECTORIZE_SCORE_THRESHOLD = 0.3;

type ChatMessages = { role: 'system' | 'user' | 'assistant'; content: string }[];

interface StreamWriter {
  writeSSE(message: SSEMessage): Promise<void>;
}

function createThinkingFilter(): (token: string) => string {
  let inThinking = false;
  return (token: string): string => {
    let result = '';
    let i = 0;
    while (i < token.length) {
      if (!inThinking) {
        const openIdx = token.indexOf('<think>', i);
        if (openIdx === -1) {
          result += token.slice(i);
          break;
        }
        result += token.slice(i, openIdx);
        inThinking = true;
        i = openIdx + 7;
      } else {
        const closeIdx = token.indexOf('</think>', i);
        if (closeIdx === -1) break;
        inThinking = false;
        i = closeIdx + 8;
      }
    }
    return result;
  };
}

async function processSSEStream(
  body: ReadableStream<Uint8Array>,
  stream: StreamWriter,
  tokenIdRef: { value: number },
  filterThinking: (token: string) => string,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      await processSSEPart(part, stream, tokenIdRef, filterThinking);
    }
  }

  if (buffer.trim()) {
    await processSSEPart(buffer, stream, tokenIdRef, filterThinking);
  }
}

async function processSSEPart(
  part: string,
  stream: StreamWriter,
  tokenIdRef: { value: number },
  filterThinking: (token: string) => string,
): Promise<void> {
  for (const line of part.split('\n')) {
    if (!line.startsWith('data: ') && !line.startsWith('data:')) continue;
    const data = line.replace(/^data:\s?/, '').trim();
    if (data === '[DONE]') continue;

    try {
      const parsed = JSON.parse(data);
      const raw =
        parsed.response ??
        parsed.choices?.[0]?.delta?.content ??
        '';
      const token = filterThinking(raw);
      if (token) {
        await stream.writeSSE({
          event: SSE_EVENTS.TOKEN,
          data: token,
          id: String(tokenIdRef.value++),
        });
      }
    } catch {
      // Incomplete JSON — skip
    }
  }
}

async function streamGlm(
  apiKey: string,
  messages: ChatMessages,
  stream: StreamWriter,
  tokenIdRef: { value: number },
  filterThinking: (token: string) => string,
): Promise<void> {
  const glmStream = await glmChat(apiKey, messages);
  await processSSEStream(glmStream, stream, tokenIdRef, filterThinking);
}

async function streamQwen(
  ai: Ai,
  messages: ChatMessages,
  stream: StreamWriter,
  tokenIdRef: { value: number },
  filterThinking: (token: string) => string,
): Promise<void> {
  const aiResponse = await ai.run(CHAT_MODEL, {
    messages,
    stream: true,
    temperature: CHAT_TEMPERATURE,
  });

  if (aiResponse instanceof ReadableStream) {
    await processSSEStream(aiResponse, stream, tokenIdRef, filterThinking);
  } else {
    const raw = (aiResponse as { response?: string }).response ?? JSON.stringify(aiResponse);
    const text = filterThinking(raw);
    if (text) {
      await stream.writeSSE({
        event: SSE_EVENTS.TOKEN,
        data: text,
        id: String(tokenIdRef.value++),
      });
    }
  }
}

chatRoute.post('/eso-chat', async (c) => {
  const body = await c.req.json<ChatRequest>();

  if (!body.message || typeof body.message !== 'string') {
    return c.json({ error: 'message is required' }, 400);
  }

  if (body.message.length > MAX_MESSAGE_LENGTH) {
    return c.json({ error: `message exceeds ${MAX_MESSAGE_LENGTH} characters` }, 400);
  }

  const searchQuery = await rewriteQuery(
    body.message,
    body.history ?? [],
    c.env.GLM_API_KEY,
  );

  const intent = extractIntent(searchQuery);

  const buildStats = await queryBuildStats(c.env.DB, intent);
  let knowledgeDocs: Awaited<ReturnType<typeof queryKnowledgeDocsById>> = [];
  let vectorMatches: { id: string; score: number; metadata?: Record<string, unknown> }[] = [];

  try {
    const embeddingResult = await c.env.AI.run(EMBEDDING_MODEL, { text: [searchQuery] });
    const embData = embeddingResult as { data?: number[][] };
    const vector = embData.data?.[0];

    if (vector && vector.length > 0) {
      const vectorResults = await c.env.VECTOR_INDEX.query(vector, {
        topK: VECTORIZE_TOP_K,
        returnMetadata: 'all',
      });

      vectorMatches = vectorResults.matches.filter((m) => m.score > VECTORIZE_SCORE_THRESHOLD);
      const vectorizeIds = vectorMatches.map((m) => m.id);
      knowledgeDocs = await queryKnowledgeDocsById(c.env.DB, vectorizeIds);
    }
  } catch {
    // Vectorize/embedding failure is non-fatal
  }

  const keywordTerms = [
    ...intent.keywords,
    ...intent.weapons,
    ...intent.classes,
  ].slice(0, 5);
  if (keywordTerms.length > 0) {
    try {
      const keywordDocs = await keywordSearchKnowledgeDocs(c.env.DB, keywordTerms);
      const existingIds = new Set(knowledgeDocs.map((d) => d.vectorize_id));
      for (const doc of keywordDocs) {
        if (!existingIds.has(doc.vectorize_id)) {
          knowledgeDocs.push(doc);
          existingIds.add(doc.vectorize_id);
        }
      }
    } catch {
      // Keyword search failure is non-fatal
    }
  }

  const systemPrompt = buildSystemPrompt(buildStats, knowledgeDocs);

  const sources: SourcePayload = {
    buildStats: buildStats.map(
      (s): BuildStatSource => ({
        weaponCombo: s.weapon_combo,
        role: s.role,
        class: s.class,
        usageCount: s.usage_count,
        avgParseScore: s.avg_parse_score,
      }),
    ),
    knowledgeDocs: vectorMatches.map(
      (m): KnowledgeDocSource => ({
        title: (m.metadata?.title as string) ?? m.id,
        docType: (m.metadata?.doc_type as string) ?? 'unknown',
        score: m.score,
      }),
    ),
  };

  const history: ChatMessages = (body.history ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .filter((m) => typeof m.content === 'string' && m.content.trim().length > 0)
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content }));

  const messages: ChatMessages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: body.message },
  ];

  const useGlm = Boolean(c.env.GLM_API_KEY);

  c.header('Content-Encoding', 'Identity');

  return streamSSE(c, async (stream) => {
    const tokenIdRef = { value: 0 };
    const filterThinking = createThinkingFilter();

    try {
      if (useGlm) {
        try {
          await streamGlm(c.env.GLM_API_KEY!, messages, stream, tokenIdRef, filterThinking);
        } catch {
          // GLM failed — fall back to Qwen3
          await streamQwen(c.env.AI, messages, stream, tokenIdRef, filterThinking);
        }
      } else {
        await streamQwen(c.env.AI, messages, stream, tokenIdRef, filterThinking);
      }

      await stream.writeSSE({
        event: SSE_EVENTS.SOURCES,
        data: JSON.stringify(sources),
        id: String(tokenIdRef.value++),
      });

      await stream.writeSSE({
        event: SSE_EVENTS.DONE,
        data: '',
        id: String(tokenIdRef.value++),
      });
    } catch (err) {
      await stream.writeSSE({
        event: SSE_EVENTS.ERROR,
        data: JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
        id: String(tokenIdRef.value++),
      });
    }
  });
});
