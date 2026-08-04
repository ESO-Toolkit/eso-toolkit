import {
  dpsParsesApi,
  normalizeEncountersResponse,
  normalizeParse,
  normalizeParsesResponse,
} from '../dpsParsesApi';

const originalFetch = global.fetch;

function mockJson(body: unknown, status = 200): jest.Mock {
  const mock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

function validRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    parse_id: '4-122-abc123',
    encounter_id: 4,
    difficulty: 122,
    amount: 300_000,
    eso_class: 'Necromancer',
    character_label: 'Someone',
    report_code: 'abc',
    fight_id: 1,
    signature_hash: 'deadbeef',
    build: { v: 1, sets: { fivePiece: [], extra: [] }, bars: { front: [], back: [] } },
    source_url: 'https://www.esologs.com/reports/abc#fight=1',
    ...overrides,
  };
}

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('normalizeParse', () => {
  it('accepts a well-formed row', () => {
    const parse = normalizeParse(validRow());
    expect(parse?.parse_id).toBe('4-122-abc123');
    expect(parse?.amount).toBe(300_000);
  });

  // A parse with no metric cannot be ranked; one with no id cannot be opened.
  it('drops rows with no amount or no parse_id', () => {
    expect(normalizeParse(validRow({ amount: undefined }))).toBeNull();
    expect(normalizeParse(validRow({ parse_id: '' }))).toBeNull();
    expect(normalizeParse(validRow({ amount: 'lots' }))).toBeNull();
  });

  it.each([null, undefined, 'string', 42, []])('returns null for %p', (input) => {
    expect(normalizeParse(input)).toBeNull();
  });

  it('defaults optional fields instead of throwing', () => {
    const parse = normalizeParse({ parse_id: 'x', amount: 1 });
    expect(parse?.character_label).toBe('Anonymous');
    expect(parse?.set1_id).toBeNull();
    expect(parse?.build).toBeNull();
    expect(parse?.trial_id).toBe('');
  });
});

describe('normalizeParsesResponse', () => {
  it('keeps valid rows and drops malformed siblings', () => {
    const result = normalizeParsesResponse({
      parses: [validRow(), { junk: true }, validRow({ parse_id: '4-122-def456' })],
      total: 3,
      limit: 100,
      offset: 0,
    });

    expect(result.parses).toHaveLength(2);
    // `total` reflects what the server reported, not what survived filtering.
    expect(result.total).toBe(3);
  });

  it.each([null, undefined, 'nope', { parses: 'not an array' }])(
    'returns an empty page for %p',
    (input) => {
      expect(normalizeParsesResponse(input).parses).toEqual([]);
    },
  );
});

describe('normalizeEncountersResponse', () => {
  it('drops entries with no encounter id', () => {
    const result = normalizeEncountersResponse({
      encounters: [{ encounter_id: 4, encounter_name: 'The Mage' }, { encounter_name: 'Nope' }],
    });

    expect(result.encounters).toHaveLength(1);
    expect(result.encounters[0].encounter_name).toBe('The Mage');
  });

  it('returns empty for a malformed payload', () => {
    expect(normalizeEncountersResponse({}).encounters).toEqual([]);
  });
});

describe('dpsParsesApi.listParses', () => {
  it('builds the query string from the options given', async () => {
    const fetchMock = mockJson({ parses: [], total: 0, limit: 100, offset: 0 });

    await dpsParsesApi.listParses({
      encounterId: 4,
      difficulty: 122,
      esoClass: 'Arcanist',
      limit: 50,
      sort: 'recent',
    });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('encounter=4');
    expect(url).toContain('difficulty=122');
    expect(url).toContain('class=Arcanist');
    expect(url).toContain('limit=50');
    expect(url).toContain('sort=recent');
    // Omitted options must not appear at all.
    expect(url).not.toContain('offset=');
    expect(url).not.toContain('signature=');
  });

  /**
   * The server rejects an unfiltered query with a 400 to prevent a full table
   * scan; failing fast here avoids a guaranteed-useless round trip.
   */
  it('throws before requesting when no filter is supplied', async () => {
    const fetchMock = mockJson({});
    await expect(dpsParsesApi.listParses({})).rejects.toThrow(/at least one/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces the server error message and status', async () => {
    mockJson({ error: 'Provide at least one of: encounter, class' }, 400);

    await expect(dpsParsesApi.listParses({ encounterId: 4 })).rejects.toMatchObject({
      message: 'Provide at least one of: encounter, class',
      status: 400,
    });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => '<html>oops</html>',
    }) as unknown as typeof fetch;

    await expect(dpsParsesApi.listParses({ encounterId: 4 })).rejects.toThrow('API error 500');
  });

  /**
   * A fetch that behaves like the real one: it rejects with an AbortError only
   * when its signal is aborted. That is what lets these two cases be told apart.
   */
  function pendingFetchRespectingSignal(): jest.Mock {
    const mock = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );
    global.fetch = mock as unknown as typeof fetch;
    return mock;
  }

  it('reports a genuine timeout as a readable message', async () => {
    jest.useFakeTimers();
    pendingFetchRespectingSignal();

    const promise = dpsParsesApi.listParses({ encounterId: 4 });
    const assertion = expect(promise).rejects.toThrow(/timed out/i);
    jest.advanceTimersByTime(20_000);

    await assertion;
    jest.useRealTimers();
  });

  /**
   * A caller cancelling (unmount, superseded query) is not a failure. Dressing it
   * up as "Request timed out" would show users an error for something that worked
   * exactly as intended, so the AbortError is re-thrown as-is.
   */
  it('re-throws a caller cancellation as an AbortError, not a timeout', async () => {
    pendingFetchRespectingSignal();

    const controller = new AbortController();
    const promise = dpsParsesApi.listParses({ encounterId: 4 }, controller.signal);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    await expect(promise).rejects.not.toThrow(/timed out/i);
  });

  it('removes its abort listener once the request settles', async () => {
    mockJson({ parses: [], total: 0, limit: 100, offset: 0 });
    const controller = new AbortController();
    const removeSpy = jest.spyOn(controller.signal, 'removeEventListener');

    await dpsParsesApi.listParses({ encounterId: 4 }, controller.signal);

    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('normalizes the response body', async () => {
    mockJson({ parses: [validRow(), { bad: true }], total: 2, limit: 100, offset: 0 });
    const result = await dpsParsesApi.listParses({ encounterId: 4 });
    expect(result.parses).toHaveLength(1);
  });
});

describe('dpsParsesApi.getBuild', () => {
  it('encodes the parse id into the path', async () => {
    const fetchMock = mockJson({ parseId: 'x', playerName: 'y', combatant: {} });
    await dpsParsesApi.getBuild('4-122-abc/../etc');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain(encodeURIComponent('4-122-abc/../etc'));
    expect(url).not.toContain('/../');
  });
});
