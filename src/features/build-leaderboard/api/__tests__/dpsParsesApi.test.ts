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

  it.each(['abc', 'RepOrt123', 'xb7TKHXR8DJByp4Q'])(
    'preserves a valid report code (%s)',
    (code) => {
      expect(normalizeParse(validRow({ report_code: code }))?.report_code).toBe(code);
    },
  );

  it.each([
    'javascript:alert(1)',
    'abc/def',
    'abc?redirect=https://evil.example',
    'abc%2Fdef',
    'abc-def',
    'abc.def',
    'abc def',
    'abc\n',
    'abc\t',
    'abc#fight=1',
    '../abc',
    42,
    null,
  ])('drops an invalid report code (%p)', (code) => {
    expect(normalizeParse(validRow({ report_code: code }))?.report_code).toBe('');
  });

  it.each([
    'https://www.esologs.com/reports/xb7TKHXR8DJByp4Q#fight=1',
    // WHATWG URL parsing normalizes scheme/host casing while preserving the
    // trusted value returned to the caller.
    'HTTPS://WWW.ESOLOGS.COM/reports/xb7TKHXR8DJByp4Q?fight=1#details',
    // The default HTTPS port is equivalent to the canonical origin and is
    // normalized away by URL.port, unlike an arbitrary alternate port.
    'https://www.esologs.com:443/reports/xb7TKHXR8DJByp4Q#fight=1',
  ])('preserves a safe HTTPS ESO Logs source URL (%s)', (source) => {
    expect(normalizeParse(validRow({ source_url: source }))?.source_url).toBe(source);
  });

  it.each([
    'http://www.esologs.com/reports/abc',
    'https://esologs.com/reports/abc',
    'https://www.esologs.com.evil.example/reports/abc',
    'https://www.esologs.com@evil.example/reports/abc',
    'https://www.esologs.com%2eevil.example/reports/abc',
    'https://evil.example/reports/abc',
    '//www.esologs.com/reports/abc',
    'javascript:window.location="https://evil.example"',
    'data:text/html,<script>alert(1)</script>',
    'https://user:password@www.esologs.com/reports/abc',
    'https://www.esologs.com:8443/reports/abc',
    'not a URL',
    42,
    null,
  ])('drops an invalid source URL (%p)', (source) => {
    expect(normalizeParse(validRow({ source_url: source }))?.source_url).toBe('');
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

  /**
   * toFeatureVector reads build.sets.fivePiece and build.bars.front/back without
   * guarding, so a malformed build would throw during feature extraction and take
   * the whole page down. Anything failing the shape check becomes null, which
   * every consumer already handles.
   */
  it.each([
    ['missing sets', { bars: { front: [], back: [] }, setCounts: [], missing: [] }],
    ['missing bars', { sets: { fivePiece: [], extra: [] }, setCounts: [], missing: [] }],
    [
      'fivePiece not an array',
      {
        sets: { fivePiece: 'x', extra: [] },
        bars: { front: [], back: [] },
        setCounts: [],
        missing: [],
      },
    ],
    [
      'bars.front not an array',
      {
        sets: { fivePiece: [], extra: [] },
        bars: { front: null, back: [] },
        setCounts: [],
        missing: [],
      },
    ],
    [
      'setCounts not an array',
      { sets: { fivePiece: [], extra: [] }, bars: { front: [], back: [] }, missing: [] },
    ],
    ['build is a string', 'nope'],
  ])('nulls a malformed build (%s) rather than passing it through', (_label, build) => {
    expect(normalizeParse(validRow({ build }))?.build).toBeNull();
  });

  /**
   * Container checks alone let a string through into arrays that feature
   * extraction sorts numerically, producing NaN comparisons and silently wrong
   * clusters rather than a visible failure.
   */
  it.each([
    [
      'string in fivePiece',
      {
        sets: { fivePiece: ['1'], extra: [] },
        bars: { front: [], back: [] },
        setCounts: [],
        missing: [],
      },
    ],
    [
      'string in bars.front',
      {
        sets: { fivePiece: [], extra: [] },
        bars: { front: ['10'], back: [] },
        setCounts: [],
        missing: [],
      },
    ],
    [
      'NaN in bars.back',
      {
        sets: { fivePiece: [], extra: [] },
        bars: { front: [], back: [Number.NaN] },
        setCounts: [],
        missing: [],
      },
    ],
    [
      'setCounts not pairs',
      {
        sets: { fivePiece: [], extra: [] },
        bars: { front: [], back: [] },
        setCounts: [[1]],
        missing: [],
      },
    ],
    [
      'setCounts pair not numeric',
      {
        sets: { fivePiece: [], extra: [] },
        bars: { front: [], back: [] },
        setCounts: [[1, 'x']],
        missing: [],
      },
    ],
    [
      'missing not strings',
      {
        sets: { fivePiece: [], extra: [] },
        bars: { front: [], back: [] },
        setCounts: [],
        missing: [7],
      },
    ],
  ])('nulls a build with wrong element types (%s)', (_label, build) => {
    expect(normalizeParse(validRow({ build }))?.build).toBeNull();
  });

  it('keeps a well-formed build', () => {
    const build = {
      v: 1,
      sets: { fivePiece: [1, 2], extra: [] },
      bars: { front: [10], back: [20], barOrderKnown: true },
      setCounts: [[1, 5]],
      missing: ['race'],
    };
    expect(normalizeParse(validRow({ build }))?.build).toEqual(build);
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
  /**
   * Content-Type is not a CORS-safelisted request header, so setting it on a
   * bodyless GET forces an OPTIONS preflight on every cross-origin call — an
   * extra round trip that also has to clear the Worker's origin allowlist.
   */
  it('sends no Content-Type on GETs, avoiding a CORS preflight', async () => {
    const fetchMock = mockJson({ parses: [], total: 0, limit: 100, offset: 0 });
    await dpsParsesApi.listParses({ encounterId: 4 });

    const init = fetchMock.mock.calls[0][1] ?? {};
    const headers = (init.headers ?? {}) as Record<string, string>;
    expect(Object.keys(headers)).toHaveLength(0);
  });

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
    const abortError = (): Error => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      return err;
    };

    const mock = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          // Real fetch rejects straight away for an already-aborted signal; a
          // listener would never fire, since the event has already been emitted.
          if (init?.signal?.aborted) {
            reject(abortError());
            return;
          }
          init?.signal?.addEventListener('abort', () => reject(abortError()));
        }),
    );
    global.fetch = mock as unknown as typeof fetch;
    return mock;
  }

  function responseWithPendingBody(status = 200): {
    fetchMock: jest.Mock;
    bodyStarted: jest.Mock;
  } {
    const abortError = (): Error => {
      const err = new Error('aborted while reading body');
      err.name = 'AbortError';
      return err;
    };
    const bodyStarted = jest.fn();
    const fetchMock = jest.fn(async (_url: string, init?: RequestInit) => {
      const readBody = (): Promise<never> => {
        bodyStarted();
        return new Promise((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(abortError());
            return;
          }
          init?.signal?.addEventListener('abort', () => reject(abortError()), { once: true });
        });
      };
      return {
        ok: status >= 200 && status < 300,
        status,
        json: readBody,
        text: readBody,
      };
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return { fetchMock, bodyStarted };
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

  it('keeps the timeout active while consuming a successful JSON body', async () => {
    jest.useFakeTimers();
    try {
      const { bodyStarted } = responseWithPendingBody();
      const promise = dpsParsesApi.listParses({ encounterId: 4 });
      const assertion = expect(promise).rejects.toThrow(/timed out/i);

      await Promise.resolve();
      await Promise.resolve();
      expect(bodyStarted).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(20_000);

      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps caller cancellation active while consuming an error body', async () => {
    const { bodyStarted } = responseWithPendingBody(503);
    const controller = new AbortController();
    const promise = dpsParsesApi.listParses({ encounterId: 4 }, controller.signal);

    await Promise.resolve();
    await Promise.resolve();
    expect(bodyStarted).toHaveBeenCalledTimes(1);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    await expect(promise).rejects.not.toThrow(/timed out/i);
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

  /**
   * A signal that is already aborted has had its 'abort' event; a listener added
   * afterwards never fires. Without an explicit check the request would run to
   * the full 15s timeout before anyone noticed the caller had given up.
   */
  it('aborts immediately when handed an already-aborted signal', async () => {
    const fetchMock = pendingFetchRespectingSignal();
    const controller = new AbortController();
    controller.abort();

    await expect(
      dpsParsesApi.listParses({ encounterId: 4 }, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });

    // The fetch is issued, but with an already-aborted signal, so it settles at
    // once rather than hanging until the timeout.
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
