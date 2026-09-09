import {
  EXECUTION_RULE_SCHEMA_VERSION,
  evaluateExecutionRules,
  validateExecutionRuleSet,
  type ExecutionObservation,
  type ExecutionRuleDefinition,
  type ExecutionRuleScope,
  type ExecutionRuleSet,
} from './executionRules';

const scope: ExecutionRuleScope = {
  eso: { update: 'U46', partition: 'live-na' },
  encounter: { id: 'lucent-citadel', version: '2025.06', kind: 'encounter', difficulty: 'veteran' },
};

const avoidableDamage: ExecutionRuleDefinition = {
  id: 'avoidable-beam',
  title: 'Avoid beam damage',
  category: 'avoidable-damage',
  scope,
  provenance: { kind: 'configurable', source: 'Raid lead configuration', revision: '1' },
  expected: { summary: 'Move out of the beam before it deals damage.' },
  scoring: { whenMet: 2, whenViolated: -5 },
  configuration: { abilityIds: [12345] },
};

const missedInterrupt: ExecutionRuleDefinition = {
  id: 'interrupt-channel',
  title: 'Interrupt the channel',
  category: 'missed-interrupt',
  scope,
  provenance: { kind: 'authoritative', source: 'ESO encounter data', revision: '2025.06' },
  expected: { summary: 'Interrupt the priority channel.' },
  scoring: { whenMet: 3, whenViolated: -8 },
  configuration: { abilityIds: [67890] },
};

const ruleSet = (
  rules: readonly ExecutionRuleDefinition[] = [avoidableDamage, missedInterrupt],
): ExecutionRuleSet => ({
  schemaVersion: EXECUTION_RULE_SCHEMA_VERSION,
  scope,
  rules,
});

const observation = (overrides: Partial<ExecutionObservation> = {}): ExecutionObservation => ({
  ruleId: 'avoidable-beam',
  state: 'violated',
  actor: { id: 42, name: 'Talen' },
  role: 'damage',
  phase: { id: 'burn', label: 'Burn phase' },
  timestamp: 0,
  evidence: [
    {
      timestamp: 0,
      source: 'combat-log',
      description: 'Beam hit Talen at pull.',
      eventId: 'event-0',
    },
  ],
  observed: { summary: 'Player remained in the beam.', value: true },
  expected: { summary: 'Player leaves the beam before impact.', value: false },
  estimatedImpact: { value: 10123, unit: 'damage', description: 'Damage attributed to the beam.' },
  confidence: 'high',
  ...overrides,
});

describe('evaluateExecutionRules', () => {
  it('preserves actor, role, phase, timestamp-zero evidence, behavior, impact, and confidence', () => {
    const result = evaluateExecutionRules(ruleSet([avoidableDamage]), scope, [observation()]);

    expect(result).toMatchObject({ status: 'available' });
    if (result.status !== 'available') {
      return;
    }

    expect(result.outcomes[0]).toMatchObject({ status: 'violated', scoreContribution: -5 });
    expect(result.outcomes[0].findings[0]).toMatchObject({
      actor: { id: 42, name: 'Talen' },
      role: 'damage',
      phase: { id: 'burn', label: 'Burn phase' },
      timestamp: 0,
      evidence: [expect.objectContaining({ timestamp: 0, eventId: 'event-0' })],
      observed: { summary: 'Player remained in the beam.', value: true },
      expected: { summary: 'Move out of the beam before it deals damage.' },
      estimatedImpact: {
        value: 10123,
        unit: 'damage',
        description: 'Damage attributed to the beam.',
      },
      confidence: 'high',
      scoreContribution: -5,
    });
  });

  it('isolates rules across every partition and encounter identity dimension', () => {
    const mismatchedScopes: readonly ExecutionRuleScope[] = [
      { ...scope, eso: { ...scope.eso, update: 'U47' } },
      { ...scope, eso: { ...scope.eso, partition: 'pts-na' } },
      { ...scope, encounter: { ...scope.encounter, id: 'sanctum-ophidia' } },
      { ...scope, encounter: { ...scope.encounter, version: '2025.07' } },
      { ...scope, encounter: { ...scope.encounter, kind: 'training-dummy' } },
      { ...scope, encounter: { ...scope.encounter, difficulty: 'normal' } },
    ];

    for (const mismatchedScope of mismatchedScopes) {
      expect(evaluateExecutionRules(ruleSet(), mismatchedScope, [observation()])).toMatchObject({
        status: 'unavailable',
        reason: 'context-mismatch',
      });
    }
  });

  it('keeps unknown observations and absent rule observations unknown instead of zero-scoring them', () => {
    const result = evaluateExecutionRules(ruleSet(), scope, [
      observation({ state: 'unknown', confidence: 'unknown' }),
    ]);

    expect(result).toMatchObject({ status: 'available' });
    if (result.status !== 'available') {
      return;
    }

    expect(
      result.outcomes.map((outcome) => [
        outcome.rule.id,
        outcome.status,
        outcome.scoreContribution,
      ]),
    ).toEqual([
      ['avoidable-beam', 'unknown', null],
      ['interrupt-channel', 'unknown', null],
    ]);
    expect(result.unknownRuleIds).toEqual(['avoidable-beam', 'interrupt-channel']);
    expect(result.score).toEqual({ status: 'unknown', value: null, knownContribution: 0 });
  });

  it('marks a mixed known and unknown rule outcome partial while retaining only the known contribution', () => {
    const result = evaluateExecutionRules(ruleSet([avoidableDamage]), scope, [
      observation({ state: 'violated' }),
      observation({ state: 'unknown', timestamp: 1500, confidence: 'unknown' }),
    ]);

    expect(result).toMatchObject({ status: 'available' });
    if (result.status !== 'available') {
      return;
    }

    expect(result.outcomes[0]).toMatchObject({ status: 'partial', scoreContribution: null });
    expect(result.score).toEqual({ status: 'partial', value: null, knownContribution: -5 });
  });

  it('uses the configured expected behavior and never turns unknown confidence into a confident score', () => {
    const result = evaluateExecutionRules(ruleSet([avoidableDamage]), scope, [
      observation({
        confidence: 'unknown',
        expected: { summary: 'Untrusted parser expectation.' },
      }),
    ]);

    expect(result).toMatchObject({ status: 'available' });
    if (result.status !== 'available') return;

    expect(result.outcomes[0]).toMatchObject({ status: 'unknown', scoreContribution: null });
    expect(result.outcomes[0].findings[0]).toMatchObject({
      state: 'unknown',
      confidence: 'unknown',
      expected: avoidableDamage.expected,
      scoreContribution: null,
    });
    expect(result.score).toEqual({ status: 'unknown', value: null, knownContribution: 0 });
  });

  it.each([observation({ timestamp: null }), observation({ evidence: [] })])(
    'rejects known observations without timestamped evidence',
    (invalidObservation) => {
      expect(
        evaluateExecutionRules(ruleSet([avoidableDamage]), scope, [invalidObservation]),
      ).toMatchObject({
        status: 'unavailable',
        reason: 'invalid-observation',
      });
    },
  );

  it.each([
    observation({ timestamp: -1 }),
    observation({ evidence: [{ ...observation().evidence[0], timestamp: -1 }] }),
    observation({
      estimatedImpact: { value: -1, unit: 'damage', description: 'Invalid signed magnitude.' },
    }),
  ])('rejects negative runtime timestamps and impact magnitudes', (invalidObservation) => {
    expect(
      evaluateExecutionRules(ruleSet([avoidableDamage]), scope, [invalidObservation]),
    ).toMatchObject({
      status: 'unavailable',
      reason: 'invalid-observation',
    });
  });

  it('accepts zero timestamps and a zero estimated-impact magnitude', () => {
    const result = evaluateExecutionRules(ruleSet([avoidableDamage]), scope, [
      observation({
        timestamp: 0,
        evidence: [{ ...observation().evidence[0], timestamp: 0 }],
        estimatedImpact: { value: 0, unit: 'damage', description: 'No measurable damage.' },
      }),
    ]);

    expect(result).toMatchObject({ status: 'available' });
    if (result.status !== 'available') return;
    expect(result.outcomes[0].findings[0]).toMatchObject({
      timestamp: 0,
      evidence: [expect.objectContaining({ timestamp: 0 })],
      estimatedImpact: { value: 0 },
    });
  });

  it.each([true, { raw: 'actor-id' }])('rejects invalid runtime actor ids: %p', (invalidId) => {
    const result = evaluateExecutionRules(ruleSet([avoidableDamage]), scope, [
      observation({ actor: { id: invalidId as unknown as string } }),
    ]);

    expect(result).toMatchObject({ status: 'unavailable', reason: 'invalid-observation' });
  });

  it('uses only configurable input rules and exposes deterministic per-observation score contributions', () => {
    const result = evaluateExecutionRules(ruleSet(), scope, [
      observation({ state: 'met' }),
      observation({ ruleId: 'interrupt-channel', state: 'violated', timestamp: 4500 }),
    ]);

    expect(result).toMatchObject({ status: 'available' });
    if (result.status !== 'available') {
      return;
    }

    expect(result.outcomes.map((outcome) => outcome.scoreContribution)).toEqual([2, -8]);
    expect(result.outcomes.map((outcome) => outcome.rule.provenance)).toEqual([
      avoidableDamage.provenance,
      missedInterrupt.provenance,
    ]);
    expect(result.score).toEqual({ status: 'complete', value: -6, knownContribution: -6 });
  });

  it('rejects malformed runtime rule sets and observations without throwing', () => {
    const malformedRuleSet = {
      schemaVersion: EXECUTION_RULE_SCHEMA_VERSION,
      scope,
      rules: [{ ...avoidableDamage, provenance: null }],
    } as unknown as ExecutionRuleSet;

    expect(validateExecutionRuleSet(null)).toEqual({
      valid: false,
      detail: 'Execution rule set must be an object.',
    });
    expect(validateExecutionRuleSet(malformedRuleSet)).toMatchObject({ valid: false });
    expect(evaluateExecutionRules(malformedRuleSet, scope, [])).toMatchObject({
      status: 'unavailable',
      reason: 'invalid-rule-set',
    });
    expect(
      evaluateExecutionRules(ruleSet([avoidableDamage]), scope, [
        null as unknown as ExecutionObservation,
      ]),
    ).toMatchObject({ status: 'unavailable', reason: 'invalid-observation' });
    expect(
      evaluateExecutionRules(
        ruleSet([avoidableDamage]),
        scope,
        null as unknown as readonly ExecutionObservation[],
      ),
    ).toMatchObject({ status: 'unavailable', reason: 'invalid-observation' });
  });

  it.each([
    { kind: 'unverified', source: 'External data' },
    { kind: 'authoritative', source: '   ' },
    { kind: 'configurable', source: 'Raid lead configuration', revision: '' },
  ])('rejects ambiguous or incomplete rule provenance: %p', (provenance) => {
    const invalidRule = {
      ...avoidableDamage,
      provenance,
    } as unknown as ExecutionRuleDefinition;

    expect(validateExecutionRuleSet(ruleSet([invalidRule]))).toMatchObject({
      valid: false,
      detail: expect.stringContaining('provenance'),
    });
  });

  it.each([
    { value: Number.POSITIVE_INFINITY },
    { nested: { value: Number.NaN } },
    { parser: () => 'not data' },
  ])('rejects non-JSON or non-finite rule configuration: %p', (configuration) => {
    const invalidRule = {
      ...avoidableDamage,
      configuration,
    } as unknown as ExecutionRuleDefinition;

    expect(validateExecutionRuleSet(ruleSet([invalidRule]))).toMatchObject({
      valid: false,
      detail: expect.stringContaining('finite, acyclic JSON'),
    });
  });

  it('rejects finite score contributions whose per-rule or total sum overflows', () => {
    const maximalRule: ExecutionRuleDefinition = {
      ...avoidableDamage,
      scoring: { whenMet: Number.MAX_VALUE, whenViolated: -Number.MAX_VALUE },
    };
    expect(
      evaluateExecutionRules(ruleSet([maximalRule]), scope, [
        observation({ state: 'met' }),
        observation({ state: 'met', timestamp: 1 }),
      ]),
    ).toMatchObject({ status: 'unavailable', reason: 'score-overflow' });

    const secondMaximalRule: ExecutionRuleDefinition = {
      ...maximalRule,
      id: 'second-maximal-rule',
    };
    expect(
      evaluateExecutionRules(ruleSet([maximalRule, secondMaximalRule]), scope, [
        observation({ state: 'met' }),
        observation({ ruleId: secondMaximalRule.id, state: 'met', timestamp: 1 }),
      ]),
    ).toMatchObject({ status: 'unavailable', reason: 'score-overflow' });
  });

  it('supports every configurable execution category without embedding encounter rules', () => {
    const categories = [
      'avoidable-damage',
      'missed-interrupt',
      'priority-target-failure',
      'mechanic-compliance',
      'nonlethal-mistake',
    ] as const;
    const configuredRules = categories.map((category) => ({
      ...avoidableDamage,
      id: `configured-${category}`,
      title: `Configured ${category}`,
      category,
      provenance: { kind: 'configurable' as const, source: 'External configuration' },
    }));

    const result = evaluateExecutionRules(ruleSet(configuredRules), scope, []);

    expect(result).toMatchObject({ status: 'available' });
    if (result.status !== 'available') {
      return;
    }

    expect(result.outcomes.map((outcome) => outcome.rule.category)).toEqual(categories);
    expect(result.score).toEqual({ status: 'unknown', value: null, knownContribution: 0 });
  });

  it('rejects internally mismatched rule definitions rather than applying them to a nearby version', () => {
    const versionedRule: ExecutionRuleDefinition = {
      ...avoidableDamage,
      scope: { ...scope, encounter: { ...scope.encounter, version: '2025.07' } },
    };

    expect(evaluateExecutionRules(ruleSet([versionedRule]), scope, [])).toMatchObject({
      status: 'unavailable',
      reason: 'invalid-rule-set',
    });
  });

  it('does not apply any implicit rules when a scope has no configured definitions', () => {
    expect(evaluateExecutionRules(ruleSet([]), scope, [])).toMatchObject({
      status: 'unavailable',
      reason: 'no-rules-configured',
    });
  });
});
