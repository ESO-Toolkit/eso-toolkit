import {
  comparePulls,
  compareWithCohort,
  type AnalysisContext,
  type PullAnalysis,
} from './comparisonModel';

const context: AnalysisContext = {
  partition: 'live-46',
  encounterKind: 'encounter',
  encounterId: 'trial-1',
  encounterVersion: '2026-09',
  difficulty: 'veteran-hard-mode',
  role: 'damage',
  classId: 'arcanist',
  buildBracket: 'magicka-ranged',
};

const provenance = {
  source: 'ESO Logs',
  collectedAt: '2026-09-01T11:00:00.000Z',
  baselinePeriod: {
    startAt: '2026-08-01T00:00:00.000Z',
    endAt: '2026-08-31T23:59:59.999Z',
  },
  refreshedAt: '2026-09-01T11:05:00.000Z',
};

const pull = (overrides: Partial<PullAnalysis> = {}): PullAnalysis => ({
  pullId: 'pull-1',
  occurredAt: '2026-09-01T10:00:00.000Z',
  context,
  metrics: { dps: { kind: 'observed', value: 100 } },
  provenance,
  confidence: 'high',
  ...overrides,
});

describe('Analyzer/Insights comparison contract', () => {
  it('calculates a provenance- and confidence-preserving A/B delta with distribution metadata', () => {
    const baseline = pull({ confidence: 'medium' });
    const candidate = pull({
      pullId: 'pull-2',
      confidence: 'low',
      metrics: { dps: { kind: 'observed', value: 125 } },
      provenance: {
        ...provenance,
        source: 'ESO Logs export',
        collectedAt: '2026-09-02T11:00:00.000Z',
        refreshedAt: '2026-09-02T11:05:00.000Z',
      },
    });

    const result = comparePulls(baseline, candidate);

    expect(result).toMatchObject({ status: 'available', confidence: 'low' });
    if (result.status === 'available') {
      expect(result.provenance).toEqual({
        baseline: {
          pullId: baseline.pullId,
          occurredAt: baseline.occurredAt,
          provenance: baseline.provenance,
        },
        candidate: {
          pullId: candidate.pullId,
          occurredAt: candidate.occurredAt,
          provenance: candidate.provenance,
        },
      });
      expect(result.metrics).toEqual([
        {
          metric: 'dps',
          status: 'available',
          baseline: 100,
          candidate: 125,
          delta: 25,
          baselineDistribution: {
            sampleCount: 1,
            observedSampleCount: 1,
            unknownSampleCount: 0,
            invalidSampleCount: 0,
            minimum: 100,
            maximum: 100,
            mean: 100,
            median: 100,
          },
        },
      ]);
    }
  });

  it.each([
    ['partition', 'pts-46', 'cross-partition'],
    ['encounterKind', 'training-dummy', 'cross-encounter-kind'],
    ['encounterId', 'trial-2', 'cross-encounter-id'],
    ['encounterVersion', '2026-10', 'cross-encounter-version'],
    ['difficulty', 'normal', 'cross-difficulty'],
    ['role', 'healer', 'cross-role'],
    ['classId', 'templar', 'cross-class'],
    ['buildBracket', 'stamina-melee', 'cross-build-bracket'],
  ] as const)(
    'blocks a %s mismatch for both A/B and cohort comparisons',
    (field, value, reason) => {
      const mismatchedContext = { ...context, [field]: value } as AnalysisContext;

      expect(
        comparePulls(pull(), pull({ pullId: 'candidate', context: mismatchedContext })),
      ).toMatchObject({ status: 'unavailable', reason });
      expect(
        compareWithCohort(pull(), [pull({ pullId: 'cohort-1', context: mismatchedContext })], {
          minimumObservedBaselineSamples: 1,
        }),
      ).toMatchObject({ status: 'unavailable', reason });
    },
  );

  it('rejects self-comparison, candidate leakage, and duplicate cohort pull identities', () => {
    expect(comparePulls(pull(), pull())).toMatchObject({
      status: 'unavailable',
      reason: 'same-pull',
    });
    expect(
      compareWithCohort(pull(), [pull()], { minimumObservedBaselineSamples: 1 }),
    ).toMatchObject({ status: 'unavailable', reason: 'candidate-in-cohort' });
    expect(
      compareWithCohort(pull(), [pull({ pullId: 'cohort-1' }), pull({ pullId: 'cohort-1' })], {
        minimumObservedBaselineSamples: 1,
      }),
    ).toMatchObject({ status: 'unavailable', reason: 'duplicate-cohort-pull' });
  });

  it('returns an unavailable metric for an insufficient baseline rather than zero-filling it', () => {
    const result = compareWithCohort(
      pull({ metrics: { dps: { kind: 'observed', value: 130 } } }),
      [
        pull({ pullId: 'cohort-observed', metrics: { dps: { kind: 'observed', value: 100 } } }),
        pull({
          pullId: 'cohort-unknown',
          metrics: { dps: { kind: 'unknown', reason: 'Incomplete event stream' } },
        }),
      ],
      { minimumObservedBaselineSamples: 2 },
    );

    expect(result).toMatchObject({ status: 'available', cohortSize: 2 });
    if (result.status === 'available') {
      expect(result.metrics).toEqual([
        {
          metric: 'dps',
          status: 'unavailable',
          reason: 'insufficient-baseline-samples',
          requiredObservedSamples: 2,
          observedBaselineSamples: 1,
          baselineDistribution: {
            sampleCount: 2,
            observedSampleCount: 1,
            unknownSampleCount: 1,
            invalidSampleCount: 0,
            minimum: 100,
            maximum: 100,
            mean: 100,
            median: 100,
          },
        },
      ]);
    }
  });

  it('retains cohort provenance, lowest confidence, and deterministic distribution metadata', () => {
    const candidate = pull({
      confidence: 'high',
      metrics: { dps: { kind: 'observed', value: 130 } },
    });
    const cohort = [
      pull({
        pullId: 'cohort-1',
        confidence: 'medium',
        metrics: { dps: { kind: 'observed', value: 100 } },
      }),
      pull({
        pullId: 'cohort-2',
        confidence: 'low',
        metrics: { dps: { kind: 'observed', value: 120 } },
      }),
      pull({
        pullId: 'cohort-3',
        confidence: 'high',
        metrics: { dps: { kind: 'observed', value: 160 } },
      }),
    ];

    const result = compareWithCohort(candidate, cohort, { minimumObservedBaselineSamples: 2 });

    expect(result).toMatchObject({
      status: 'available',
      cohortSize: 3,
      minimumObservedBaselineSamples: 2,
      confidence: 'low',
    });
    if (result.status === 'available') {
      expect(result.provenance).toEqual({
        candidate: {
          pullId: candidate.pullId,
          occurredAt: candidate.occurredAt,
          provenance: candidate.provenance,
        },
        cohort: cohort.map((analysis) => ({
          pullId: analysis.pullId,
          occurredAt: analysis.occurredAt,
          provenance: analysis.provenance,
        })),
      });
      expect(result.metrics).toMatchObject([
        {
          metric: 'dps',
          status: 'available',
          candidate: 130,
          baselineDistribution: {
            sampleCount: 3,
            observedSampleCount: 3,
            unknownSampleCount: 0,
            invalidSampleCount: 0,
            minimum: 100,
            maximum: 160,
            median: 120,
          },
        },
      ]);
      const [metric] = result.metrics;
      if (metric?.status === 'available') {
        expect(metric.baseline).toBeCloseTo(380 / 3);
        expect(metric.delta).toBeCloseTo(130 - 380 / 3);
        expect(metric.baselineDistribution.mean).toBeCloseTo(380 / 3);
      }
    }
  });

  it('keeps unknown metrics and an empty cohort distinct from numeric zero', () => {
    const unknown = pull({
      pullId: 'candidate',
      metrics: { dps: { kind: 'unknown', reason: 'Incomplete event stream' } },
    });
    const pair = comparePulls(pull(), unknown);
    expect(pair).toMatchObject({ status: 'available' });
    if (pair.status === 'available') {
      expect(pair.metrics[0]).toMatchObject({
        metric: 'dps',
        status: 'unknown',
        reason: 'Incomplete event stream',
      });
    }

    expect(compareWithCohort(pull(), [], { minimumObservedBaselineSamples: 1 })).toMatchObject({
      status: 'unavailable',
      reason: 'empty-cohort',
    });
  });

  it('keeps mean and median finite for maximum-magnitude observations', () => {
    const candidate = pull({
      pullId: 'candidate',
      metrics: { dps: { kind: 'observed', value: Number.MAX_VALUE } },
    });
    const result = compareWithCohort(
      candidate,
      [
        pull({
          pullId: 'cohort-1',
          metrics: { dps: { kind: 'observed', value: Number.MAX_VALUE } },
        }),
        pull({
          pullId: 'cohort-2',
          metrics: { dps: { kind: 'observed', value: Number.MAX_VALUE } },
        }),
      ],
      { minimumObservedBaselineSamples: 2 },
    );

    expect(result).toMatchObject({ status: 'available' });
    if (result.status === 'available') {
      expect(result.metrics[0]).toMatchObject({
        status: 'available',
        baseline: Number.MAX_VALUE,
        candidate: Number.MAX_VALUE,
        delta: 0,
        baselineDistribution: {
          mean: Number.MAX_VALUE,
          median: Number.MAX_VALUE,
        },
      });
    }
  });

  it.each([
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['negative infinity', Number.NEGATIVE_INFINITY],
    ['negative value', -1],
    ['negative zero', -0],
  ] as const)(
    'fails closed without throwing for a malformed observed %s in every comparison position',
    (_description, invalidValue) => {
      const malformedMetrics = {
        dps: { kind: 'observed', value: invalidValue },
      } as unknown as PullAnalysis['metrics'];
      const malformed = pull({ pullId: 'malformed', metrics: malformedMetrics });
      const expected = {
        status: 'unavailable',
        reason: 'invalid-analysis',
        message: 'Analysis metric "dps" observed value must be a finite nonnegative number.',
      };

      expect(() => comparePulls(malformed, pull({ pullId: 'candidate' }))).not.toThrow();
      expect(comparePulls(malformed, pull({ pullId: 'candidate' }))).toMatchObject(expected);
      expect(() => comparePulls(pull(), malformed)).not.toThrow();
      expect(comparePulls(pull(), malformed)).toMatchObject(expected);

      expect(() =>
        compareWithCohort(malformed, [pull({ pullId: 'cohort-1' })], {
          minimumObservedBaselineSamples: 1,
        }),
      ).not.toThrow();
      expect(
        compareWithCohort(malformed, [pull({ pullId: 'cohort-1' })], {
          minimumObservedBaselineSamples: 1,
        }),
      ).toMatchObject(expected);
      expect(() =>
        compareWithCohort(pull(), [malformed], { minimumObservedBaselineSamples: 1 }),
      ).not.toThrow();
      expect(
        compareWithCohort(pull(), [malformed], { minimumObservedBaselineSamples: 1 }),
      ).toMatchObject(expected);
    },
  );

  it('retains ordinary zero as an observed cohort metric', () => {
    const result = compareWithCohort(
      pull({ pullId: 'candidate', metrics: { dps: { kind: 'observed', value: 0 } } }),
      [
        pull({
          pullId: 'cohort-observed',
          metrics: { dps: { kind: 'observed', value: 100 } },
        }),
      ],
      { minimumObservedBaselineSamples: 1 },
    );

    expect(result).toMatchObject({ status: 'available' });
    if (result.status === 'available') {
      expect(result.metrics[0]).toMatchObject({
        status: 'available',
        baseline: 100,
        candidate: 0,
        delta: -100,
        baselineDistribution: {
          sampleCount: 1,
          observedSampleCount: 1,
          unknownSampleCount: 0,
          invalidSampleCount: 0,
        },
      });
      const [metric] = result.metrics;
      expect(metric?.status).toBe('available');
      if (metric?.status === 'available') {
        expect(Object.is(metric.candidate, -0)).toBe(false);
      }
    }
  });

  it.each([
    [
      'confidence',
      pull({ confidence: 'unverified' as unknown as PullAnalysis['confidence'] }),
      'Analysis confidence is invalid.',
    ],
    [
      'context',
      pull({ context: { ...context, encounterKind: 'invalid' } as unknown as AnalysisContext }),
      'Analysis encounter kind is invalid.',
    ],
    [
      'provenance',
      pull({
        provenance: {
          ...provenance,
          baselinePeriod: {
            ...provenance.baselinePeriod,
            endAt: provenance.baselinePeriod.startAt,
          },
        },
      }),
      'Analysis baseline period must have positive duration.',
    ],
  ] as const)('fails closed when runtime %s metadata is invalid', (_field, malformed, message) => {
    expect(comparePulls(pull(), malformed)).toMatchObject({
      status: 'unavailable',
      reason: 'invalid-analysis',
      message,
    });
    expect(
      compareWithCohort(pull(), [malformed], { minimumObservedBaselineSamples: 1 }),
    ).toMatchObject({
      status: 'unavailable',
      reason: 'invalid-analysis',
      message,
    });
  });

  it.each([
    [
      'missing metrics',
      pull({ metrics: undefined as unknown as PullAnalysis['metrics'] }),
      'Analysis metrics are missing.',
    ],
    [
      'array metrics',
      pull({ metrics: [] as unknown as PullAnalysis['metrics'] }),
      'Analysis metrics are missing.',
    ],
    [
      'non-record metric',
      pull({ metrics: { dps: null } as unknown as PullAnalysis['metrics'] }),
      'Analysis metric "dps" is invalid.',
    ],
    [
      'invalid metric kind',
      pull({
        metrics: { dps: { kind: 'estimated', value: 100 } } as unknown as PullAnalysis['metrics'],
      }),
      'Analysis metric "dps" has an invalid kind.',
    ],
    [
      'missing observed value',
      pull({ metrics: { dps: { kind: 'observed' } } as unknown as PullAnalysis['metrics'] }),
      'Analysis metric "dps" observed value is invalid.',
    ],
    [
      'non-number observed value',
      pull({
        metrics: { dps: { kind: 'observed', value: '100' } } as unknown as PullAnalysis['metrics'],
      }),
      'Analysis metric "dps" observed value is invalid.',
    ],
  ] as const)(
    'fails closed without throwing when runtime %s are invalid',
    (_field, malformed, message) => {
      expect(() => comparePulls(pull(), malformed)).not.toThrow();
      expect(comparePulls(pull(), malformed)).toMatchObject({
        status: 'unavailable',
        reason: 'invalid-analysis',
        message,
      });
      expect(() =>
        compareWithCohort(pull(), [malformed], { minimumObservedBaselineSamples: 1 }),
      ).not.toThrow();
      expect(
        compareWithCohort(pull(), [malformed], { minimumObservedBaselineSamples: 1 }),
      ).toMatchObject({
        status: 'unavailable',
        reason: 'invalid-analysis',
        message,
      });
      expect(() =>
        compareWithCohort(malformed, [pull({ pullId: 'cohort-1' })], {
          minimumObservedBaselineSamples: 1,
        }),
      ).not.toThrow();
      expect(
        compareWithCohort(malformed, [pull({ pullId: 'cohort-1' })], {
          minimumObservedBaselineSamples: 1,
        }),
      ).toMatchObject({
        status: 'unavailable',
        reason: 'invalid-analysis',
        message,
      });
    },
  );

  it.each([undefined, null, [], {}, { minimumObservedBaselineSamples: 0 }])(
    'fails closed for malformed cohort options without throwing',
    (options) => {
      expect(() =>
        compareWithCohort(
          pull(),
          [pull({ pullId: 'cohort-1' })],
          options as unknown as { minimumObservedBaselineSamples: number },
        ),
      ).not.toThrow();
      expect(
        compareWithCohort(
          pull(),
          [pull({ pullId: 'cohort-1' })],
          options as unknown as { minimumObservedBaselineSamples: number },
        ),
      ).toMatchObject({ status: 'unavailable', reason: 'invalid-options' });
    },
  );

  it.each([undefined, null, {}, 'cohort'])(
    'fails closed for a non-array cohort without throwing',
    (cohort) => {
      expect(() =>
        compareWithCohort(pull(), cohort as unknown as readonly PullAnalysis[], {
          minimumObservedBaselineSamples: 1,
        }),
      ).not.toThrow();
      expect(
        compareWithCohort(pull(), cohort as unknown as readonly PullAnalysis[], {
          minimumObservedBaselineSamples: 1,
        }),
      ).toMatchObject({
        status: 'unavailable',
        reason: 'invalid-analysis',
        message: 'Analysis cohort is invalid.',
      });
    },
  );

  it('returns frozen detached snapshots rather than mutable input references', () => {
    const candidateContext = { ...context };
    const candidateProvenance = {
      ...provenance,
      baselinePeriod: { ...provenance.baselinePeriod },
    };
    const candidateMetrics = { dps: { kind: 'observed' as const, value: 130 } };
    const candidate = pull({
      pullId: 'candidate',
      context: candidateContext,
      provenance: candidateProvenance,
      metrics: candidateMetrics,
    });
    const result = compareWithCohort(candidate, [pull({ pullId: 'cohort-1' })], {
      minimumObservedBaselineSamples: 1,
    });

    expect(result).toMatchObject({ status: 'available' });
    if (result.status === 'available') {
      expect(result.context).not.toBe(candidateContext);
      expect(result.candidate).not.toBe(candidate);
      expect(result.candidate.provenance).not.toBe(candidateProvenance);
      expect(result.provenance.candidate).not.toBe(candidate.provenance);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.candidate)).toBe(true);
      expect(Object.isFrozen(result.candidate.metrics)).toBe(true);
      expect(Object.isFrozen(result.metrics)).toBe(true);
      expect(Object.isFrozen(result.metrics[0])).toBe(true);
      expect(Object.isFrozen(result.provenance.candidate)).toBe(true);
      expect(Object.isFrozen(result.provenance.candidate.provenance)).toBe(true);

      candidateContext.partition = 'tampered';
      candidateProvenance.source = 'tampered';
      candidateProvenance.baselinePeriod.startAt = '2020-01-01T00:00:00.000Z';
      candidateMetrics.dps.value = 999;

      expect(result.context.partition).toBe('live-46');
      expect(result.candidate.provenance.source).toBe('ESO Logs');
      expect(result.provenance.candidate.provenance.baselinePeriod.startAt).toBe(
        '2026-08-01T00:00:00.000Z',
      );
      expect(result.candidate.metrics.dps).toEqual({ kind: 'observed', value: 130 });
    }
  });
});
