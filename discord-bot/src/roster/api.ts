/**
 * Roster API client — fetches roster snapshots from roster-hub-api.
 */

import type { Env } from '../types.js';
import type { RosterSnapshot } from './types.js';

export const ROSTER_API_TIMEOUT_MS = 10_000;
export const ROSTER_API_MAX_RESPONSE_BYTES = 1024 * 1024;

export type FetchSnapshotErrorReason =
  'http' | 'timeout' | 'network' | 'response_too_large' | 'invalid_response';

export type FetchSnapshotResult =
  | { status: 'ok'; snapshot: RosterSnapshot }
  | { status: 'not_found' }
  | {
      status: 'error';
      code: number;
      reason: FetchSnapshotErrorReason;
      message: string;
    };

interface ReadBodyResult {
  text?: string;
  tooLarge: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRosterSnapshot(value: unknown): value is RosterSnapshot {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.trial_id === 'string' &&
    typeof value.author_name === 'string' &&
    typeof value.roster_data === 'string' &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string') &&
    typeof value.vote_count === 'number' &&
    Number.isFinite(value.vote_count) &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  );
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<ReadBodyResult> {
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      await response.body?.cancel();
      return { tooLarge: true };
    }
  }

  if (!response.body) {
    return { text: '', tooLarge: false };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { tooLarge: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    text: new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(body),
    tooLarge: false,
  };
}

function errorResult(
  rosterId: string,
  reason: FetchSnapshotErrorReason,
  message: string,
  code = 0,
): FetchSnapshotResult {
  console.error(`[roster-api] ${reason} for roster ${rosterId}: ${message}`);
  return { status: 'error', code, reason, message };
}

export async function fetchRosterSnapshot(
  env: Env,
  rosterId: string,
): Promise<FetchSnapshotResult> {
  const url = `${env.ROSTER_HUB_API_URL}/rosters/${encodeURIComponent(rosterId)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROSTER_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 404) {
      return { status: 'not_found' };
    }
    if (!response.ok) {
      return errorResult(
        rosterId,
        'http',
        `Roster Hub returned HTTP ${response.status}.`,
        response.status,
      );
    }

    const body = await readBoundedBody(response, ROSTER_API_MAX_RESPONSE_BYTES);
    if (body.tooLarge) {
      return errorResult(
        rosterId,
        'response_too_large',
        `Roster Hub response exceeded ${ROSTER_API_MAX_RESPONSE_BYTES} bytes.`,
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(body.text ?? '');
    } catch {
      return errorResult(rosterId, 'invalid_response', 'Roster Hub returned malformed JSON.');
    }

    if (!isRecord(data) || !isRosterSnapshot(data.roster)) {
      return errorResult(
        rosterId,
        'invalid_response',
        'Roster Hub response did not contain a valid roster snapshot.',
      );
    }

    return { status: 'ok', snapshot: data.roster };
  } catch (error) {
    if (controller.signal.aborted) {
      return errorResult(
        rosterId,
        'timeout',
        `Roster Hub did not respond within ${ROSTER_API_TIMEOUT_MS}ms.`,
      );
    }
    if (error instanceof TypeError) {
      return errorResult(rosterId, 'network', `Could not reach Roster Hub: ${error.message}`);
    }
    return errorResult(
      rosterId,
      'invalid_response',
      error instanceof Error ? error.message : 'Roster Hub response could not be read.',
    );
  } finally {
    clearTimeout(timeout);
  }
}
