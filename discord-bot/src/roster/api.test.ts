import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../types';
import { fetchRosterSnapshot, ROSTER_API_MAX_RESPONSE_BYTES, ROSTER_API_TIMEOUT_MS } from './api';
import type { RosterSnapshot } from './types';

const env = {
  ROSTER_HUB_API_URL: 'https://rosters.example.test',
} as Env;

const validRoster: RosterSnapshot = {
  id: 'roster-1',
  title: 'Core Team',
  description: 'Sunday progression',
  trial_id: 'lucent-citadel',
  author_name: 'RaidLead',
  roster_data: 'encoded-roster',
  tags: ['veteran', 'progression'],
  vote_count: 4,
  created_at: '2026-08-30T12:00:00.000Z',
  updated_at: '2026-08-30T13:00:00.000Z',
};

describe('fetchRosterSnapshot', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('accepts and returns a valid roster snapshot', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ roster: validRoster }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchRosterSnapshot(env, 'roster/one')).resolves.toEqual({
      status: 'ok',
      snapshot: validRoster,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://rosters.example.test/rosters/roster%2Fone',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('returns an actionable HTTP error for a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 })));

    await expect(fetchRosterSnapshot(env, 'roster-1')).resolves.toMatchObject({
      status: 'error',
      code: 503,
      reason: 'http',
      message: 'Roster Hub returned HTTP 503.',
    });
  });

  it('aborts a request that exceeds the timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        });
      }),
    );

    const result = fetchRosterSnapshot(env, 'roster-1');
    await vi.advanceTimersByTimeAsync(ROSTER_API_TIMEOUT_MS);

    await expect(result).resolves.toMatchObject({
      status: 'error',
      code: 0,
      reason: 'timeout',
    });
  });

  it('stops reading a response body that exceeds the size cap', async () => {
    const oversizedBody = 'x'.repeat(ROSTER_API_MAX_RESPONSE_BYTES + 1);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(oversizedBody)));

    await expect(fetchRosterSnapshot(env, 'roster-1')).resolves.toMatchObject({
      status: 'error',
      code: 0,
      reason: 'response_too_large',
    });
  });

  it('rejects malformed JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"roster":')));

    await expect(fetchRosterSnapshot(env, 'roster-1')).resolves.toMatchObject({
      status: 'error',
      code: 0,
      reason: 'invalid_response',
      message: 'Roster Hub returned malformed JSON.',
    });
  });

  it('rejects a roster with an invalid runtime shape', async () => {
    const invalidRoster = { ...validRoster, tags: ['veteran', 42] };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ roster: invalidRoster }))),
    );

    await expect(fetchRosterSnapshot(env, 'roster-1')).resolves.toMatchObject({
      status: 'error',
      code: 0,
      reason: 'invalid_response',
      message: 'Roster Hub response did not contain a valid roster snapshot.',
    });
  });

  it('preserves the not-found category for a 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(fetchRosterSnapshot(env, 'missing')).resolves.toEqual({ status: 'not_found' });
  });
});
