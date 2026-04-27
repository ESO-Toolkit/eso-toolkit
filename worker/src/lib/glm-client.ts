import { CHAT_TEMPERATURE, GLM_API_URL, GLM_MODEL } from '../config';

interface GlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GlmChoice {
  message: { content: string; reasoning_content?: string };
  delta?: { content?: string; reasoning_content?: string };
}

interface GlmResponse {
  choices: GlmChoice[];
}

export async function glmChat(
  apiKey: string,
  messages: GlmMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(GLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GLM_MODEL,
      messages,
      temperature: CHAT_TEMPERATURE,
      max_tokens: 1024,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.text();
    throw new Error(`GLM ${res.status}: ${err}`);
  }

  return res.body;
}

export async function glmChatSync(
  apiKey: string,
  messages: GlmMessage[],
): Promise<string> {
  const res = await fetch(GLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GLM_MODEL,
      messages,
      temperature: CHAT_TEMPERATURE,
      max_tokens: 1024,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GLM ${res.status}: ${err}`);
  }

  const json = (await res.json()) as GlmResponse;
  return json.choices[0]?.message?.content ?? '';
}
