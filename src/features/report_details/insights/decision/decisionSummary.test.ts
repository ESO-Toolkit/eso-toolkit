import {
  buildPrioritizedDecisionSummary,
  type DecisionSummaryCandidateInput,
  type DecisionSummaryRequest,
} from './decisionSummary';

const selectedScope = {
  partitionId: 'pc-na-live',
  update: 'U50',
  encounterId: 'trial.boss-a',
  encounterVersion: '2026.09',
  encounterKind: 'encounter',
  difficulty: 'veteran',
  role: 'damage',
  esoClass: 'arcanist',
  buildBracket: 'two-bar-dps',
} as const;

const emptyScope = {
  partitionId: '',
  update: '',
  encounterId: '',
  encounterVersion: '',
  encounterKind: 'encounter',
  difficulty: '',
  role: '',
  esoClass: '',
  buildBracket: '',
} as const;

const completeEvidence = {
  timestampMs: 42_000,
  phase: 'execute',
  provenance: {
    kind: 'game-rule',
    ruleId: 'interrupt-window',
    source: 'encounter-definition:trial.boss-a@2026.09',
  },
  context: 'target=Storm Atronach',
} as const;

const completeCandidate: DecisionSummaryCandidateInput = {
  id: 'late-interrupt',
  scope: selectedScope,
  availability: 'available',
  whatHappened: 'The interrupt arrived after the cast completed.',
  whyItMatters: 'The completed cast created avoidable incoming damage.',
  evidence: completeEvidence,
  recommendedNextAction: 'Assign an interrupt before the next cast window.',
  confidence: { state: 'known', score: 0.8 },
  observedBehavior: 'Interrupt completed after the cast.',
  expectedBehavior: 'Interrupt completes before the cast.',
  estimatedImpact: 12_500,
  responsible: { actorName: 'Ari', role: 'interrupt' },
  priority: 2,
};

const request = (candidates: readonly DecisionSummaryCandidateInput[]): DecisionSummaryRequest => ({
  scope: selectedScope,
  candidates,
});

describe('buildPrioritizedDecisionSummary', () => {
  it('surfaces a complete immutable decision with every required field', () => {
    const result = buildPrioritizedDecisionSummary(request([completeCandidate]));

    expect(result.rejected).toEqual([]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'late-interrupt',
      scope: selectedScope,
      whatHappened: completeCandidate.whatHappened,
      whyItMatters: completeCandidate.whyItMatters,
      evidence: completeEvidence,
      recommendedNextAction: completeCandidate.recommendedNextAction,
      confidence: completeCandidate.confidence,
      observedBehavior: completeCandidate.observedBehavior,
      expectedBehavior: completeCandidate.expectedBehavior,
      estimatedImpact: 12_500,
      responsible: completeCandidate.responsible,
      priority: { rank: 2, stableOrder: 0 },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.items)).toBe(true);
    expect(Object.isFrozen(result.items[0])).toBe(true);
    expect(Object.isFrozen(result.items[0].evidence)).toBe(true);
    expect(Object.isFrozen(result.items[0].priority)).toBe(true);
    expect(result.items[0].scope).not.toBe(selectedScope);
    expect(result.items[0].evidence).not.toBe(completeEvidence);
    expect(result.items[0].confidence).not.toBe(completeCandidate.confidence);
    expect(result.items[0].responsible).not.toBe(completeCandidate.responsible);
  });

  it('fails closed for incomplete and unavailable evidence', () => {
    const incomplete: DecisionSummaryCandidateInput = {
      ...completeCandidate,
      id: 'missing-expected-behavior',
      expectedBehavior: undefined,
    };
    const unavailable: DecisionSummaryCandidateInput = {
      ...completeCandidate,
      id: 'source-unavailable',
      availability: 'unavailable',
    };

    const result = buildPrioritizedDecisionSummary(request([incomplete, unavailable]));

    expect(result.items).toEqual([]);
    expect(result.rejected).toEqual([
      {
        candidateId: 'missing-expected-behavior',
        reason: 'incomplete-evidence',
        outcome: 'blocked',
      },
      { candidateId: 'source-unavailable', reason: 'unavailable-evidence', outcome: 'warning' },
    ]);
  });

  it('preserves an explicit unknown confidence rather than inventing a score', () => {
    const result = buildPrioritizedDecisionSummary(
      request([
        {
          ...completeCandidate,
          confidence: { state: 'unknown', reason: 'The source did not record certainty.' },
        },
      ]),
    );

    expect(result.rejected).toEqual([]);
    expect(result.items[0].confidence).toEqual({
      state: 'unknown',
      reason: 'The source did not record certainty.',
    });
  });

  it('orders by caller-supplied priority rank and preserves source order for ties', () => {
    const result = buildPrioritizedDecisionSummary(
      request([
        { ...completeCandidate, id: 'second-tie', priority: 1 },
        { ...completeCandidate, id: 'first-tie', priority: 1 },
        { ...completeCandidate, id: 'later-rank', priority: 3 },
      ]),
    );

    expect(result.items.map((item) => item.id)).toEqual(['second-tie', 'first-tie', 'later-rank']);
    expect(result.items.map((item) => item.priority.stableOrder)).toEqual([0, 1, 2]);
  });

  it.each([
    ['data partition', { partitionId: 'pc-eu-live' }],
    ['ESO update', { update: 'U51' }],
    ['encounter identity', { encounterId: 'trial.boss-b' }],
    ['encounter version', { encounterVersion: '2026.10' }],
    ['encounter kind', { encounterKind: 'training-dummy' }],
    ['difficulty', { difficulty: 'hard-mode' }],
    ['role', { role: 'healing' }],
    ['class', { esoClass: 'templar' }],
    ['build bracket', { buildBracket: 'one-bar-dps' }],
  ] as const)('blocks a candidate from a mismatched %s context dimension', (_dimension, change) => {
    const candidateId = `mismatched-${_dimension.replaceAll(' ', '-')}`;
    const result = buildPrioritizedDecisionSummary(
      request([
        completeCandidate,
        { ...completeCandidate, id: candidateId, scope: { ...selectedScope, ...change } },
      ]),
    );

    expect(result.items.map((item) => item.id)).toEqual(['late-interrupt']);
    expect(result.rejected).toEqual([
      { candidateId, reason: 'context-mismatch', outcome: 'blocked' },
    ]);
  });

  it('blocks malformed candidate contexts instead of silently omitting them', () => {
    const result = buildPrioritizedDecisionSummary(
      request([
        {
          ...completeCandidate,
          id: 'missing-build-bracket',
          scope: { ...selectedScope, buildBracket: '' },
        },
      ]),
    );

    expect(result.items).toEqual([]);
    expect(result.rejected).toEqual([
      { candidateId: 'missing-build-bracket', reason: 'invalid-evidence', outcome: 'blocked' },
    ]);
  });

  it('rejects every candidate with a duplicate id in the selected context', () => {
    const result = buildPrioritizedDecisionSummary(
      request([
        completeCandidate,
        { ...completeCandidate, whatHappened: 'A conflicting duplicate decision.' },
      ]),
    );

    expect(result.items).toEqual([]);
    expect(result.rejected).toEqual([
      { candidateId: 'late-interrupt', reason: 'duplicate-candidate', outcome: 'blocked' },
      { candidateId: 'late-interrupt', reason: 'duplicate-candidate', outcome: 'blocked' },
    ]);
  });

  it('retains zero timestamp and impact but rejects negative and non-finite values', () => {
    const result = buildPrioritizedDecisionSummary(
      request([
        {
          ...completeCandidate,
          id: 'zero-is-evidence',
          evidence: { ...completeEvidence, timestampMs: 0 },
          estimatedImpact: 0,
        },
        {
          ...completeCandidate,
          id: 'negative-timestamp',
          evidence: { ...completeEvidence, timestampMs: -1 },
        },
        { ...completeCandidate, id: 'negative-impact', estimatedImpact: -1 },
        { ...completeCandidate, id: 'nan-impact', estimatedImpact: Number.NaN },
        {
          ...completeCandidate,
          id: 'infinite-timestamp',
          evidence: { ...completeEvidence, timestampMs: Number.POSITIVE_INFINITY },
        },
      ]),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].evidence.timestampMs).toBe(0);
    expect(result.items[0].estimatedImpact).toBe(0);
    expect(result.rejected.map((rejection) => rejection.reason)).toEqual([
      'invalid-evidence',
      'invalid-evidence',
      'invalid-evidence',
      'invalid-evidence',
    ]);
  });

  it('fails closed for malformed runtime request and candidate boundaries', () => {
    const malformedCandidateRequest = {
      scope: selectedScope,
      candidates: [null, completeCandidate],
    } as unknown as DecisionSummaryRequest;
    const malformedCandidateListRequest = {
      scope: selectedScope,
      candidates: null,
    } as unknown as DecisionSummaryRequest;
    const malformedRequest = null as unknown as DecisionSummaryRequest;

    expect(buildPrioritizedDecisionSummary(malformedCandidateRequest)).toEqual({
      scope: selectedScope,
      items: [expect.objectContaining({ id: 'late-interrupt' })],
      rejected: [{ candidateId: null, reason: 'invalid-evidence', outcome: 'blocked' }],
    });
    expect(buildPrioritizedDecisionSummary(malformedCandidateListRequest)).toEqual({
      scope: emptyScope,
      items: [],
      rejected: [],
    });
    expect(buildPrioritizedDecisionSummary(malformedRequest)).toEqual({
      scope: emptyScope,
      items: [],
      rejected: [],
    });
  });

  it('marks malformed present evidence metadata as invalid rather than incomplete', () => {
    const result = buildPrioritizedDecisionSummary(
      request([
        {
          ...completeCandidate,
          id: 'invalid-phase',
          evidence: { ...completeEvidence, phase: ' ' },
        },
        {
          ...completeCandidate,
          id: 'invalid-provenance',
          evidence: { ...completeEvidence, provenance: { kind: 'peer-benchmark' } },
        },
        {
          ...completeCandidate,
          id: 'invalid-context',
          evidence: { ...completeEvidence, context: ' ' },
        },
        {
          ...completeCandidate,
          id: 'invalid-confidence',
          confidence: { state: 'known', score: Number.NaN },
        },
        {
          ...completeCandidate,
          id: 'invalid-responsible',
          responsible: { actorId: ' ' },
        },
      ]),
    );

    expect(result.items).toEqual([]);
    expect(result.rejected).toEqual([
      { candidateId: 'invalid-phase', reason: 'invalid-evidence', outcome: 'blocked' },
      { candidateId: 'invalid-provenance', reason: 'invalid-evidence', outcome: 'blocked' },
      { candidateId: 'invalid-context', reason: 'invalid-evidence', outcome: 'blocked' },
      { candidateId: 'invalid-confidence', reason: 'invalid-evidence', outcome: 'blocked' },
      { candidateId: 'invalid-responsible', reason: 'invalid-evidence', outcome: 'blocked' },
    ]);
  });

  it('accepts each provenance source kind with the required context', () => {
    const result = buildPrioritizedDecisionSummary(
      request([
        completeCandidate,
        {
          ...completeCandidate,
          id: 'fixed-heuristic',
          evidence: {
            ...completeEvidence,
            provenance: {
              kind: 'fixed-heuristic',
              heuristicId: 'interrupt-priority',
              source: 'maintainer-heuristics:v2',
            },
          },
        },
        {
          ...completeCandidate,
          id: 'peer-benchmark',
          evidence: {
            ...completeEvidence,
            provenance: {
              kind: 'peer-benchmark',
              baselineSource: 'eso-logs:peer-cohort',
              baselinePeriod: '2026-Q3',
              sampleSize: 128,
              distribution: 'p25=0.8,p50=0.92,p75=0.98',
              refreshedAt: '2026-09-01T00:00:00Z',
              confidence: { state: 'known', score: 0.9 },
              provisional: false,
            },
          },
        },
      ]),
    );

    expect(result.rejected).toEqual([]);
    expect(result.items.map((item) => item.evidence.provenance.kind)).toEqual([
      'game-rule',
      'fixed-heuristic',
      'peer-benchmark',
    ]);
  });

  it.each([
    ['missing baseline period', { baselinePeriod: '' }],
    ['missing sample size', { sampleSize: 0 }],
    ['missing distribution', { distribution: '' }],
    ['invalid refresh date', { refreshedAt: 'not-a-date' }],
    ['missing confidence', { confidence: undefined }],
    ['missing provisional state', { provisional: undefined }],
  ])('rejects peer benchmarks with %s', (_label, change) => {
    const peerProvenance = {
      kind: 'peer-benchmark' as const,
      baselineSource: 'eso-logs:peer-cohort',
      baselinePeriod: '2026-Q3',
      sampleSize: 128,
      distribution: 'p25=0.8,p50=0.92,p75=0.98',
      refreshedAt: '2026-09-01T00:00:00Z',
      confidence: { state: 'known' as const, score: 0.9 },
      provisional: false,
    };
    const result = buildPrioritizedDecisionSummary(
      request([
        {
          ...completeCandidate,
          id: `incomplete-peer-${_label}`,
          evidence: { ...completeEvidence, provenance: { ...peerProvenance, ...change } },
        },
      ]),
    );

    expect(result.items).toEqual([]);
    expect(result.rejected).toEqual([
      expect.objectContaining({ reason: 'invalid-evidence', outcome: 'blocked' }),
    ]);
  });

  it('retains positive zero and rejects negative zero numeric evidence', () => {
    const result = buildPrioritizedDecisionSummary(
      request([
        {
          ...completeCandidate,
          id: 'positive-zero',
          evidence: { ...completeEvidence, timestampMs: 0 },
          confidence: { state: 'known', score: 0 },
          estimatedImpact: 0,
          priority: 0,
        },
        {
          ...completeCandidate,
          id: 'negative-zero-timestamp',
          evidence: { ...completeEvidence, timestampMs: -0 },
        },
        {
          ...completeCandidate,
          id: 'negative-zero-confidence',
          confidence: { state: 'known', score: -0 },
        },
        { ...completeCandidate, id: 'negative-zero-impact', estimatedImpact: -0 },
        { ...completeCandidate, id: 'negative-zero-priority', priority: -0 },
      ]),
    );

    expect(result.items).toHaveLength(1);
    expect(Object.is(result.items[0].evidence.timestampMs, -0)).toBe(false);
    expect(Object.is((result.items[0].confidence as { score: number }).score, -0)).toBe(false);
    expect(Object.is(result.items[0].estimatedImpact, -0)).toBe(false);
    expect(Object.is(result.items[0].priority.rank, -0)).toBe(false);
    expect(result.rejected.map((rejection) => rejection.reason)).toEqual([
      'invalid-evidence',
      'invalid-evidence',
      'invalid-evidence',
      'invalid-evidence',
    ]);
  });
});
