import {
  assessBaselineEligibility,
  assessRecommendationTrust,
  INSIGHTS_CONTRACT_VERSION,
  validateBaselineContract,
  validateExecutionFinding,
  type BaselineContract,
  type EncounterRuleDefinition,
  type ExecutionFinding,
  type InsightPartition,
} from './insightContracts';

const partition: InsightPartition = {
  eso: { update: 'U50', id: 'pc-na-live' },
  encounter: { id: 'trial.example-boss', type: 'encounter' },
  difficulty: 'veteran',
  build: { role: 'damage', esoClass: 'sorcerer', id: 'two-bar', label: 'Two bar damage' },
};

const baseline: BaselineContract = {
  availability: 'available',
  partition,
  source: { name: 'Verified cohort', version: '2026-09' },
  period: { start: '2026-08-01', end: '2026-08-31' },
  sampleSize: 400,
  distribution: { metric: 'damage per second', unit: 'damage', p50: 120000, p75: 140000 },
  refreshDate: '2026-09-01',
  confidence: 'high',
};

describe('Insights context contract', () => {
  it('accepts a fully-provenanced available baseline', () => {
    expect(validateBaselineContract(baseline)).toEqual({ status: 'eligible', reasons: [] });
  });

  it('never makes an unknown ESO update eligible for peer comparison', () => {
    const unknownUpdate = {
      ...baseline,
      partition: { ...partition, eso: { ...partition.eso, update: 'unknown' } },
    };

    expect(validateBaselineContract(unknownUpdate)).toEqual({
      status: 'blocked',
      reasons: ['Peer baselines require a known ESO update.'],
    });
    expect(assessBaselineEligibility(unknownUpdate.partition, baseline)).toEqual({
      status: 'blocked',
      reasons: ['Observed comparison contexts require a known ESO update.'],
    });
  });

  it('accepts a training-dummy cohort only when its type is explicit', () => {
    const dummyBaseline = {
      ...baseline,
      partition: {
        ...partition,
        encounter: { id: 'dummy.21m', type: 'training-dummy' as const },
      },
    };

    expect(validateBaselineContract(dummyBaseline)).toEqual({ status: 'eligible', reasons: [] });
  });

  it('blocks peer comparisons across ESO data partitions', () => {
    const mismatched = {
      ...baseline,
      partition: { ...partition, eso: { update: 'U51', id: 'pc-eu-live' } },
    };

    expect(assessBaselineEligibility(partition, mismatched)).toEqual({
      status: 'blocked',
      reasons: [
        'ESO update differs from the baseline.',
        'ESO data partition differs from the baseline.',
      ],
    });
  });

  it.each([
    [
      'encounter identity',
      { ...partition, encounter: { id: 'trial.other-boss', type: 'encounter' } },
      'Encounter or training-dummy identity differs from the baseline.',
    ],
    [
      'encounter type',
      { ...partition, encounter: { id: partition.encounter.id, type: 'training-dummy' } },
      'Encounter type differs from the baseline.',
    ],
    [
      'difficulty',
      { ...partition, difficulty: 'hard-mode' },
      'Difficulty differs from the baseline.',
    ],
    [
      'role',
      { ...partition, build: { ...partition.build, role: 'healing' } },
      'Role differs from the baseline build bracket.',
    ],
    [
      'class',
      { ...partition, build: { ...partition.build, esoClass: 'templar' } },
      'Class differs from the baseline build bracket.',
    ],
    [
      'build bracket',
      { ...partition, build: { ...partition.build, id: 'one-bar' } },
      'Build bracket differs from the baseline.',
    ],
  ] as const)(
    'blocks cross-partition peer comparisons by %s',
    (_boundary, baselinePartition, reason) => {
      const mismatched = {
        ...baseline,
        partition: baselinePartition,
      };

      expect(assessBaselineEligibility(partition, mismatched)).toEqual({
        status: 'blocked',
        reasons: [reason],
      });
    },
  );

  it('reports an unavailable peer baseline honestly', () => {
    expect(
      assessRecommendationTrust({
        version: INSIGHTS_CONTRACT_VERSION,
        id: 'peer-dps',
        evidenceKind: 'peer-benchmark',
        partition,
        confidence: 'unknown',
        provisional: false,
        baseline: {
          availability: 'unavailable',
          partition,
          confidence: 'unknown',
          statusReason: 'No cohort.',
        },
      }),
    ).toEqual({ status: 'blocked', reasons: ['No cohort.'] });
  });

  it('blocks malformed available baselines from persisted or API data', () => {
    const malformed = {
      availability: 'available',
      partition,
      source: { name: '' },
      period: { start: 'not-a-date', end: '2026-08-31' },
      sampleSize: Infinity,
      distribution: { metric: '', unit: 'damage', p50: Number.NaN, minimum: 3, maximum: 2 },
      refreshDate: 'not-a-date',
      confidence: 'unknown',
    } as unknown as BaselineContract;

    expect(validateBaselineContract(malformed)).toEqual({
      status: 'blocked',
      reasons: [
        'Available baselines require a source.',
        'Available baselines require a valid measurement period.',
        'Available baselines require a positive whole-number sample size.',
        'Available baseline distributions require a named distribution metric.',
        'Baseline distribution values must be finite.',
        'Baseline distribution minimum cannot exceed maximum.',
        'Available baselines require a valid refresh date.',
        'Available baselines require a known confidence level.',
      ],
    });
  });

  it('does not throw when persisted available data omits required provenance', () => {
    const malformed = {
      availability: 'available',
      partition,
      sampleSize: 0,
      refreshDate: '',
      confidence: 'unknown',
    } as unknown as BaselineContract;

    expect(validateBaselineContract(malformed)).toEqual({
      status: 'blocked',
      reasons: [
        'Available baselines require a source.',
        'Available baselines require a valid measurement period.',
        'Available baselines require a positive whole-number sample size.',
        'Available baselines require a distribution.',
        'Available baselines require a valid refresh date.',
        'Available baselines require a known confidence level.',
      ],
    });
  });

  it('blocks incomplete or invalid partitions and empty distributions', () => {
    const malformed = {
      ...baseline,
      partition: {
        ...partition,
        eso: { update: '', id: partition.eso.id },
        encounter: { ...partition.encounter, type: 'not-an-encounter-type' },
        difficulty: 'not-a-difficulty',
        build: { ...partition.build, role: '' },
      },
      distribution: { metric: 'damage per second', unit: 'damage' },
    } as unknown as BaselineContract;

    expect(validateBaselineContract(malformed)).toEqual({
      status: 'blocked',
      reasons: [
        'Available baselines require a complete comparison partition.',
        'Available baselines require a known difficulty.',
        'Available baseline distributions require at least one statistic.',
      ],
    });
  });

  it('blocks unknown data partitions and non-integral or unordered cohort statistics', () => {
    const malformed = {
      ...baseline,
      partition: { ...partition, eso: { ...partition.eso, id: 'unknown' } },
      sampleSize: 0.5,
      distribution: {
        ...baseline.distribution,
        minimum: 100,
        p25: 90,
        p50: 120,
        p75: 110,
        maximum: 200,
      },
    } as unknown as BaselineContract;

    expect(validateBaselineContract(malformed)).toEqual({
      status: 'blocked',
      reasons: [
        'Peer baselines require a known ESO data partition.',
        'Available baselines require a positive whole-number sample size.',
        'Baseline distribution quantiles must be ordered.',
      ],
    });
  });

  it('blocks a provisional baseline without an explicit reason', () => {
    const malformed = {
      availability: 'provisional',
      partition,
      confidence: 'low',
      statusReason: '   ',
    } as unknown as BaselineContract;

    expect(assessBaselineEligibility(partition, malformed)).toEqual({
      status: 'blocked',
      reasons: ['Provisional baselines require an explanation.'],
    });
  });

  it('preserves a valid provisional reason as a visible comparison warning', () => {
    const provisional: BaselineContract = {
      availability: 'provisional',
      partition,
      confidence: 'low',
      statusReason: 'Cohort refresh is still in progress.',
    };

    expect(assessBaselineEligibility(partition, provisional)).toEqual({
      status: 'warning',
      reasons: ['Cohort refresh is still in progress.'],
    });
  });

  it('does not accept malformed optional provenance on a provisional baseline', () => {
    const malformed = {
      availability: 'provisional',
      partition,
      confidence: 'low',
      statusReason: 'Preliminary cohort.',
      source: { name: '' },
      period: { start: '2026-09-02', end: '2026-09-01' },
      sampleSize: Number.NaN,
      distribution: { metric: 'damage', unit: 'damage', p25: 2, p50: 1 },
      refreshDate: 'not-a-date',
    } as unknown as BaselineContract;

    expect(validateBaselineContract(malformed)).toEqual({
      status: 'blocked',
      reasons: [
        'Provisional baseline source metadata must name its source.',
        'Provisional baseline periods must end on or after their start.',
        'Provisional baseline sample sizes must be positive whole numbers.',
        'Baseline distribution quantiles must be ordered.',
        'Provisional baseline refresh dates must be valid.',
      ],
    });
  });

  it('keeps an unknown-confidence provisional peer baseline explicitly non-eligible', () => {
    const provisional = {
      availability: 'provisional',
      partition,
      confidence: 'unknown',
      statusReason: 'Cohort has not met the minimum sample size.',
    } as const;

    expect(assessBaselineEligibility(partition, provisional)).toEqual({
      status: 'warning',
      reasons: ['Cohort has not met the minimum sample size.'],
    });
    expect(
      assessRecommendationTrust({
        version: INSIGHTS_CONTRACT_VERSION,
        id: 'peer-dps-provisional',
        evidenceKind: 'peer-benchmark',
        partition,
        confidence: 'unknown',
        provisional: true,
        baseline: provisional,
      }),
    ).toEqual({
      status: 'warning',
      reasons: [
        'Cohort has not met the minimum sample size.',
        'This recommendation is provisional.',
        'This recommendation has unknown confidence.',
      ],
    });
  });

  it('blocks malformed runtime partitions instead of throwing during comparison', () => {
    const malformedObserved = {
      eso: null,
      encounter: 'not-an-object',
      difficulty: null,
      build: undefined,
    } as unknown as InsightPartition;
    const malformedBaseline = {
      availability: 'available',
      partition: null,
      confidence: 'high',
    } as unknown as BaselineContract;

    expect(() => assessBaselineEligibility(malformedObserved, baseline)).not.toThrow();
    expect(assessBaselineEligibility(malformedObserved, baseline)).toEqual({
      status: 'blocked',
      reasons: [
        'Observed comparison contexts require a complete comparison partition.',
        'Observed comparison contexts require a known difficulty.',
      ],
    });
    expect(() => validateBaselineContract(malformedBaseline)).not.toThrow();
    expect(validateBaselineContract(malformedBaseline).status).toBe('blocked');
  });

  it('blocks malformed confidence and unit fields from runtime data', () => {
    const malformedBaseline = {
      ...baseline,
      confidence: 'certain',
      distribution: { ...baseline.distribution, unit: 'meters' },
    } as unknown as BaselineContract;
    const malformedFinding = {
      version: INSIGHTS_CONTRACT_VERSION,
      id: 'runtime-fields',
      kind: 'avoidable-damage',
      encounterId: 'trial.example-boss',
      encounterVersion: '2026.09',
      actor: {},
      evidence: [{ timestamp: 0 }],
      observedBehavior: 'Hit observed.',
      estimatedImpact: { unit: 'watts' },
      confidence: 'certain',
      scoreContribution: { explanation: 'Unknown.', confidence: 'certain' },
    } as unknown as ExecutionFinding;

    expect(validateBaselineContract(malformedBaseline)).toEqual({
      status: 'blocked',
      reasons: [
        'Available baseline distributions require a valid distribution unit.',
        'Available baselines require a known confidence level.',
      ],
    });
    expect(validateExecutionFinding(malformedFinding, undefined)).toEqual({
      valid: false,
      reasons: [
        'Execution findings require a valid confidence level.',
        'Estimated impact requires a valid unit.',
        'Score contributions require a valid confidence level.',
      ],
    });
  });

  it('surfaces provisional non-peer recommendations instead of presenting them as settled', () => {
    expect(
      assessRecommendationTrust({
        version: INSIGHTS_CONTRACT_VERSION,
        id: 'heuristic-dps',
        evidenceKind: 'fixed-heuristic',
        partition,
        confidence: 'low',
        provisional: true,
      }),
    ).toEqual({ status: 'warning', reasons: ['This recommendation is provisional.'] });
  });

  it('does not mutate comparison inputs or expose mutable eligibility reasons', () => {
    const observed: InsightPartition = {
      ...partition,
      eso: { ...partition.eso },
      encounter: { ...partition.encounter },
      build: { ...partition.build },
    };
    const comparableBaseline: BaselineContract = {
      ...baseline,
      partition: observed,
      source: { ...baseline.source },
      period: { ...baseline.period },
      distribution: { ...baseline.distribution },
    };
    const result = assessBaselineEligibility(observed, comparableBaseline);

    expect(result).toEqual({ status: 'eligible', reasons: [] });
    expect(observed).toEqual(partition);
    expect(comparableBaseline).toEqual(baseline);
  });

  it('rejects runtime recommendation versions and identifiers', () => {
    const malformed = {
      version: '0.9',
      id: '',
      evidenceKind: 'peer-benchmark',
      partition,
      confidence: 'high',
      provisional: false,
      baseline,
    } as unknown as Parameters<typeof assessRecommendationTrust>[0];

    expect(assessRecommendationTrust(malformed)).toEqual({
      status: 'blocked',
      reasons: ['Recommendations require a known evidence kind.'],
    });
  });

  it('allows a configurable rule but isolates it to its encounter version', () => {
    const finding: ExecutionFinding = {
      version: INSIGHTS_CONTRACT_VERSION,
      id: 'missed-interrupt-1',
      kind: 'missed-interrupt',
      encounterId: 'trial.example-boss',
      encounterVersion: '2026.09',
      ruleId: 'interrupt-cast',
      actor: { id: 42, role: 'damage' },
      evidence: [{ timestamp: 0, phase: 'P1', eventId: 'event-0' }],
      observedBehavior: 'No interrupt was observed.',
      expectedBehavior: 'Interrupt the marked cast.',
      estimatedImpact: { unit: 'other', unknownReason: 'Impact is not modelled.' },
      confidence: 'low',
      scoreContribution: { explanation: 'Not scored until configured.', confidence: 'unknown' },
    };
    const rule: EncounterRuleDefinition = {
      id: 'interrupt-cast',
      encounterId: 'trial.example-boss',
      encounterVersion: '2026.09',
      findingKind: 'missed-interrupt',
      title: 'Configured interrupt',
      expectedBehavior: 'Interrupt the marked cast.',
      sourceStatus: 'configurable',
    };

    expect(validateExecutionFinding(finding, rule)).toEqual({ valid: true, reasons: [] });
    expect(validateExecutionFinding(finding, { ...rule, encounterVersion: '2026.10' })).toEqual({
      valid: false,
      reasons: ['Rule belongs to a different encounter version.'],
    });
  });

  it('rejects unsupported authoritative claims and evidence-free findings', () => {
    const result = validateExecutionFinding(
      {
        version: INSIGHTS_CONTRACT_VERSION,
        id: 'avoidable-1',
        kind: 'avoidable-damage',
        encounterId: 'trial.example-boss',
        encounterVersion: '2026.09',
        ruleId: 'avoidable-hit',
        actor: {},
        evidence: [],
        observedBehavior: 'Hit observed.',
        estimatedImpact: { unit: 'damage', value: 1000 },
        confidence: 'unknown',
        scoreContribution: { explanation: 'Unknown.', confidence: 'unknown' },
      },
      {
        id: 'avoidable-hit',
        encounterId: 'trial.example-boss',
        encounterVersion: '2026.09',
        findingKind: 'avoidable-damage',
        title: 'Unproven',
        expectedBehavior: 'Avoid it.',
        sourceStatus: 'authoritative',
      },
    );

    expect(result).toEqual({
      valid: false,
      reasons: [
        'Execution findings require timestamp evidence.',
        'Unknown-confidence findings require an unknown reason.',
        'Authoritative rules require source metadata.',
      ],
    });
  });

  it('rejects non-finite and negative execution evidence timestamps while preserving zero', () => {
    const finding = {
      version: INSIGHTS_CONTRACT_VERSION,
      id: 'evidence-time',
      kind: 'nonlethal-mistake',
      encounterId: 'trial.example-boss',
      encounterVersion: '2026.09',
      actor: { id: 42, role: 'damage' },
      evidence: [{ timestamp: 0 }, { timestamp: -1 }, { timestamp: Number.NaN }],
      observedBehavior: 'Evidence includes invalid timestamps.',
      estimatedImpact: { unit: 'other', unknownReason: 'Not estimated.' },
      confidence: 'low',
      scoreContribution: { explanation: 'Not scored.', confidence: 'unknown' },
    } satisfies ExecutionFinding;

    expect(validateExecutionFinding(finding, undefined)).toEqual({
      valid: false,
      reasons: ['Execution evidence timestamps must be finite and non-negative.'],
    });
  });
});
