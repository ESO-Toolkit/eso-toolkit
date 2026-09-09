import {
  buildPullProgression,
  type ProgressionContext,
  type PullSnapshot,
} from './pullProgression';

const context: ProgressionContext = {
  esoUpdate: 'U46',
  partition: 'live-pc-na',
  encounterId: 'lucent-citadel',
  encounterVersion: '1',
  difficulty: 'veteran',
  role: 'damage-dealer',
  classId: 'arcanist',
  buildBracket: 'cp160',
};

const pull = (
  id: string,
  startedAt: number,
  damage: number | null | undefined,
  overrides: Partial<PullSnapshot> = {},
): PullSnapshot => ({
  id,
  startedAt,
  context,
  metrics: { damage },
  evidence: [{ timestamp: startedAt + 25, phase: 'execute', eventId: `${id}-event` }],
  ...overrides,
});

describe('buildPullProgression', () => {
  it('orders pulls stably by timestamp and derives transparent improvement deltas', () => {
    const result = buildPullProgression({
      context,
      pulls: [
        pull('third-input', 300, 1_250),
        pull('first', 100, 1_000),
        pull('second', 200, 1_100),
      ],
      metrics: [{ id: 'damage', direction: 'higher-is-better' }],
    });

    expect(result).toMatchObject({
      status: 'ready',
      orderedPullIds: ['first', 'second', 'third-input'],
    });
    if (result.status !== 'ready') {
      throw new Error('expected a ready progression');
    }

    const metric = result.metrics[0];
    expect(metric.baselineValue).toBe(1_000);
    expect(metric.latestValue).toBe(1_250);
    expect(metric.netDelta).toBe(250);
    expect(metric.classification).toBe('improved');
    expect(metric.transitions).toEqual([
      expect.objectContaining({
        fromPullId: 'first',
        toPullId: 'second',
        delta: 100,
        classification: 'improved',
      }),
      expect.objectContaining({
        fromPullId: 'second',
        toPullId: 'third-input',
        delta: 150,
        classification: 'improved',
      }),
    ]);
  });

  it('keeps input order for pulls with the same timestamp', () => {
    const result = buildPullProgression({
      context,
      pulls: [pull('same-time-first', 100, 1), pull('same-time-second', 100, 2)],
      metrics: [{ id: 'damage', direction: 'higher-is-better' }],
    });

    expect(result).toMatchObject({
      status: 'ready',
      orderedPullIds: ['same-time-first', 'same-time-second'],
    });
  });

  it('returns an explicit unavailable state when no pulls supply storyboard evidence', () => {
    const result = buildPullProgression({
      context,
      pulls: [],
      metrics: [{ id: 'damage', direction: 'higher-is-better' }],
    });

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'no-pulls',
      context,
      conflictingPullIds: [],
    });
  });

  it('returns an explicit unavailable state when no metric has been selected', () => {
    const result = buildPullProgression({
      context,
      pulls: [pull('pull-a', 100, 1)],
      metrics: [],
    });

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'no-metrics',
      context,
      conflictingPullIds: [],
    });
  });

  it('rejects every pull set that crosses its version, encounter, or character/build cohort', () => {
    const contexts = [
      { ...context, esoUpdate: 'U47' },
      { ...context, partition: 'pts-pc-na' },
      { ...context, encounterId: 'cloudrest' },
      { ...context, encounterVersion: '2' },
      { ...context, difficulty: 'normal' },
      { ...context, role: 'healer' },
      { ...context, buildBracket: 'no-cp' },
    ];

    for (const mismatchedContext of contexts) {
      const result = buildPullProgression({
        context,
        pulls: [
          pull('matching', 10, 100),
          pull('conflicting', 20, 200, { context: mismatchedContext }),
        ],
        metrics: [],
      });
      expect(result).toEqual({
        status: 'unavailable',
        reason: 'mixed-context',
        context,
        conflictingPullIds: ['conflicting'],
      });
    }
  });

  it('isolates a pull with a mismatched classId from the comparison cohort', () => {
    const result = buildPullProgression({
      context,
      pulls: [
        pull('matching', 10, 100),
        pull('different-class', 20, 200, { context: { ...context, classId: 'templar' } }),
      ],
      metrics: [],
    });

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'mixed-context',
      context,
      conflictingPullIds: ['different-class'],
    });
  });

  it('keeps missing, null, and non-finite metric values unknown rather than coercing them to zero', () => {
    const result = buildPullProgression({
      context,
      pulls: [
        pull('known', 10, 100),
        pull('missing', 20, undefined),
        pull('nan-at-boundary', 30, Number.NaN),
        pull('null', 40, null),
      ],
      metrics: [{ id: 'damage', direction: 'higher-is-better' }],
    });

    if (result.status !== 'ready') {
      throw new Error('expected a ready progression');
    }

    const metric = result.metrics[0];
    expect(metric.points.map((point) => point.value)).toEqual([100, null, null, null]);
    expect(metric.netDelta).toBeNull();
    expect(metric.classification).toBe('unknown');
    expect(metric.transitions.map((transition) => transition.classification)).toEqual([
      'unknown',
      'unknown',
      'unknown',
    ]);
  });

  it('classifies improvement, regression, stability, and unknown without assigning a direction implicitly', () => {
    const result = buildPullProgression({
      context,
      pulls: [
        pull('baseline', 10, 100, { metrics: { damage: 100, deaths: 2 } }),
        pull('middle', 20, 105, { metrics: { damage: 105, deaths: 1 } }),
        pull('latest', 30, 90, { metrics: { damage: 90, deaths: 3 } }),
      ],
      metrics: [
        { id: 'damage', direction: 'higher-is-better', stabilityTolerance: 5 },
        { id: 'deaths', direction: 'lower-is-better' },
        { id: 'unknown-metric', direction: 'higher-is-better' },
      ],
    });

    if (result.status !== 'ready') {
      throw new Error('expected a ready progression');
    }

    expect(result.metrics[0].transitions.map((transition) => transition.classification)).toEqual([
      'stable',
      'regressed',
    ]);
    expect(result.metrics[0].classification).toBe('regressed');
    expect(result.metrics[1].transitions.map((transition) => transition.classification)).toEqual([
      'improved',
      'regressed',
    ]);
    expect(result.metrics[1].classification).toBe('regressed');
    expect(result.metrics[2].classification).toBe('unknown');
  });

  it('preserves timestamp and phase evidence on points and their drilldown transitions', () => {
    const baselineEvidence = {
      timestamp: 0,
      phase: 'opening',
      actorId: 17,
      eventId: 'baseline-event',
    };
    const latestEvidence = {
      timestamp: 500,
      phase: 'execute',
      actorId: 17,
      eventId: 'latest-event',
      note: 'interrupt missed',
    };
    const result = buildPullProgression({
      context,
      pulls: [
        pull('baseline', 0, 1, { evidence: [baselineEvidence] }),
        pull('latest', 400, 2, { evidence: [latestEvidence] }),
      ],
      metrics: [{ id: 'damage', direction: 'higher-is-better' }],
    });

    if (result.status !== 'ready') {
      throw new Error('expected a ready progression');
    }

    const metric = result.metrics[0];
    expect(metric.points[0].evidence).toEqual([baselineEvidence]);
    expect(metric.points[1].evidence).toEqual([latestEvidence]);
    expect(metric.transitions[0].fromEvidence).toEqual([baselineEvidence]);
    expect(metric.transitions[0].toEvidence).toEqual([latestEvidence]);
  });

  it('returns an explicit unavailable state for non-finite pull timestamps', () => {
    const result = buildPullProgression({
      context,
      pulls: [pull('invalid', Number.POSITIVE_INFINITY, 100)],
      metrics: [],
    });

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-pull-timestamp',
      context,
      conflictingPullIds: ['invalid'],
    });
  });

  it('rejects negative pull timestamps while retaining timestamp zero', () => {
    const zeroTimestampResult = buildPullProgression({
      context,
      pulls: [pull('at-report-start', 0, 100)],
      metrics: [{ id: 'damage', direction: 'higher-is-better' }],
    });
    expect(zeroTimestampResult).toMatchObject({
      status: 'ready',
      orderedPullIds: ['at-report-start'],
    });

    const negativeTimestampResult = buildPullProgression({
      context,
      pulls: [pull('before-report', -1, 100)],
      metrics: [],
    });
    expect(negativeTimestampResult).toEqual({
      status: 'unavailable',
      reason: 'invalid-pull-timestamp',
      context,
      conflictingPullIds: ['before-report'],
    });
  });

  it('rejects negative and non-finite evidence timestamps while retaining timestamp zero', () => {
    for (const timestamp of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = buildPullProgression({
        context,
        pulls: [pull('invalid-evidence', 100, 100, { evidence: [{ timestamp }] })],
        metrics: [],
      });

      expect(result).toEqual({
        status: 'unavailable',
        reason: 'invalid-evidence-timestamp',
        context,
        conflictingPullIds: ['invalid-evidence'],
      });
    }

    const result = buildPullProgression({
      context,
      pulls: [pull('zero-evidence', 100, 100, { evidence: [{ timestamp: 0 }] })],
      metrics: [{ id: 'damage', direction: 'higher-is-better' }],
    });
    expect(result.status).toBe('ready');
  });

  it('keeps overflowing deltas unknown instead of emitting a non-finite claim', () => {
    const result = buildPullProgression({
      context,
      pulls: [pull('baseline', 10, -Number.MAX_VALUE), pull('latest', 20, Number.MAX_VALUE)],
      metrics: [{ id: 'damage', direction: 'higher-is-better' }],
    });

    if (result.status !== 'ready') {
      throw new Error('expected a ready progression');
    }

    const metric = result.metrics[0];
    expect(metric.transitions[0]).toMatchObject({ delta: null, classification: 'unknown' });
    expect(metric.netDelta).toBeNull();
    expect(metric.classification).toBe('unknown');
  });

  it('canonicalizes negative zero values and deltas to ordinary zero', () => {
    const result = buildPullProgression({
      context,
      pulls: [pull('baseline', -0, 0, { evidence: [{ timestamp: -0 }] }), pull('latest', 20, -0)],
      metrics: [{ id: 'damage', direction: 'higher-is-better' }],
    });

    if (result.status !== 'ready') {
      throw new Error('expected a ready progression');
    }

    const metric = result.metrics[0];
    expect(Object.is(metric.points[0].startedAt, -0)).toBe(false);
    expect(Object.is(metric.points[0].evidence[0].timestamp, -0)).toBe(false);
    expect(Object.is(metric.points[1].value, -0)).toBe(false);
    expect(Object.is(metric.transitions[0].delta, -0)).toBe(false);
    expect(Object.is(metric.netDelta, -0)).toBe(false);
    expect(metric.netDelta).toBe(0);
  });

  it('fails closed for a runtime-invalid metric direction', () => {
    const result = buildPullProgression({
      context,
      pulls: [pull('baseline', 10, 100), pull('latest', 20, 200)],
      metrics: [
        {
          id: 'damage',
          direction: 'unqualified-direction' as unknown as 'higher-is-better',
        },
      ],
    });

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-metric-definition',
      context,
      conflictingPullIds: [],
      invalidMetricIds: ['damage'],
    });
  });

  it('fails closed for blank, duplicate, and non-finite metric definitions', () => {
    const result = buildPullProgression({
      context,
      pulls: [pull('baseline', 10, 100)],
      metrics: [
        { id: '', direction: 'higher-is-better' },
        { id: 'damage', direction: 'higher-is-better' },
        { id: 'damage', direction: 'higher-is-better', stabilityTolerance: Number.NaN },
        { id: 'negative-tolerance', direction: 'higher-is-better', stabilityTolerance: -1 },
      ],
    });

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-metric-definition',
      context,
      conflictingPullIds: [],
      invalidMetricIds: ['', 'damage', 'damage', 'negative-tolerance'],
    });
  });

  it('rejects an incomplete comparison context instead of treating unknown partitions as equal', () => {
    const result = buildPullProgression({
      context: { ...context, partition: '  ' },
      pulls: [pull('pull-a', 10, 100)],
      metrics: [],
    });

    expect(result).toMatchObject({
      status: 'unavailable',
      reason: 'invalid-context',
      conflictingPullIds: ['pull-a'],
    });
  });

  it('fails closed without throwing for null, non-string, missing, or non-array runtime input', () => {
    const malformedInputs: unknown[] = [
      null,
      { context: null, pulls: [], metrics: [] },
      { context: { ...context, partition: null }, pulls: [], metrics: [] },
      { context: { ...context, role: 4 }, pulls: [], metrics: [] },
      { context, pulls: null, metrics: [] },
      { context, pulls: [], metrics: null },
      {
        context,
        pulls: [{ id: 'missing-evidence', startedAt: 10, context, metrics: {} }],
        metrics: [],
      },
      { context, pulls: [{ ...pull('missing-evidence', 10, 100), evidence: null }], metrics: [] },
      { context, pulls: [{ ...pull('non-array-evidence', 10, 100), evidence: {} }], metrics: [] },
      { context, pulls: [{ ...pull('invalid-metrics', 10, 100), metrics: [] }], metrics: [] },
      { context, pulls: [null], metrics: [] },
    ];

    for (const malformedInput of malformedInputs) {
      let result: ReturnType<typeof buildPullProgression> | undefined;
      expect(() => {
        result = buildPullProgression(malformedInput as never);
      }).not.toThrow();
      expect(result).toMatchObject({ status: 'unavailable' });
    }
  });

  it('fails closed for non-string metric ids and malformed metric definitions without inspecting them as strings', () => {
    const metricDefinitions: unknown[] = [
      null,
      { id: null, direction: 'higher-is-better' },
      { id: 7, direction: 'higher-is-better' },
      { id: 'damage', direction: null },
      { id: 'damage', direction: 'higher-is-better', stabilityTolerance: 'zero' },
    ];

    for (const metrics of metricDefinitions) {
      let result: ReturnType<typeof buildPullProgression> | undefined;
      expect(() => {
        result = buildPullProgression({ context, pulls: [], metrics: [metrics] } as never);
      }).not.toThrow();
      expect(result).toMatchObject({ status: 'unavailable', reason: 'invalid-metric-definition' });
    }
  });

  it('rejects duplicate pull ids instead of using ambiguous evidence', () => {
    const result = buildPullProgression({
      context,
      pulls: [pull('same-id', 10, 100), pull('same-id', 20, 200)],
      metrics: [],
    });

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-input',
      context,
      conflictingPullIds: ['same-id'],
    });
  });

  it('does not classify one observation as stable progress', () => {
    const result = buildPullProgression({
      context,
      pulls: [pull('only-pull', 10, 100)],
      metrics: [{ id: 'damage', direction: 'higher-is-better' }],
    });

    if (result.status !== 'ready') {
      throw new Error('expected a ready progression');
    }

    expect(result.metrics[0]).toMatchObject({
      baselineValue: 100,
      latestValue: 100,
      netDelta: null,
      classification: 'unknown',
    });
  });

  it('copies context and evidence so later caller mutations cannot rewrite the storyboard', () => {
    const mutableContext = { ...context };
    const mutableEvidence = { timestamp: 10, phase: 'opening', note: 'original' };
    const mutableMetrics = { damage: 100 };
    const mutablePulls = [
      {
        id: 'pull-a',
        startedAt: 0,
        context: mutableContext,
        metrics: mutableMetrics,
        evidence: [mutableEvidence],
      },
    ];
    const mutableDefinitions = [{ id: 'damage', direction: 'higher-is-better' as const }];
    const result = buildPullProgression({
      context: mutableContext,
      pulls: mutablePulls,
      metrics: mutableDefinitions,
    });

    mutableContext.partition = 'pts-pc-na';
    mutableContext.classId = 'templar';
    mutableEvidence.note = 'rewritten';
    mutableMetrics.damage = 900;
    mutablePulls[0].id = 'rewritten-pull';
    mutableDefinitions[0].id = 'rewritten-metric';

    if (result.status !== 'ready') {
      throw new Error('expected a ready progression');
    }

    expect(result.context).toEqual(context);
    expect(JSON.parse(JSON.stringify(result.context))).toEqual(context);
    expect(result.orderedPullIds).toEqual(['pull-a']);
    expect(result.metrics[0].id).toBe('damage');
    expect(result.metrics[0].points[0].value).toBe(100);
    expect(result.metrics[0].points[0].evidence[0].note).toBe('original');
  });
});
