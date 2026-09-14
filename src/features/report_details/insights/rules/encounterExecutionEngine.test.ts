import {
  createEncounterExecutionRuleRegistry,
  evaluateEncounterExecutionRules,
  type EncounterExecutionRuleRegistry,
} from './encounterExecutionEngine';
import {
  EXECUTION_RULE_SCHEMA_VERSION,
  type ExecutionObservation,
  type ExecutionRuleDefinition,
  type ExecutionRuleScope,
  type ExecutionRuleSet,
} from './executionRules';

const scope: ExecutionRuleScope = {
  eso: { update: 'U46', partition: 'live-na' },
  encounter: {
    id: 'fixture-encounter',
    version: '2026.09',
    kind: 'encounter',
    difficulty: 'veteran',
  },
};

const configuredRule = (
  ruleScope: ExecutionRuleScope = scope,
  overrides: Partial<ExecutionRuleDefinition> = {},
): ExecutionRuleDefinition => ({
  id: 'configured-rule',
  title: 'Configured fixture expectation',
  category: 'mechanic-compliance',
  scope: ruleScope,
  provenance: {
    kind: 'configurable',
    source: 'Fixture encounter configuration',
    revision: '2026.09',
  },
  expected: { summary: 'Configured expected behavior.', value: 'configured' },
  scoring: { whenMet: 3, whenViolated: -4 },
  configuration: { triggerAbilityIds: [9001], phase: 'execute' },
  ...overrides,
});

const ruleSet = (
  ruleScope: ExecutionRuleScope = scope,
  rules: readonly ExecutionRuleDefinition[] = [configuredRule(ruleScope)],
): ExecutionRuleSet => ({
  schemaVersion: EXECUTION_RULE_SCHEMA_VERSION,
  scope: ruleScope,
  rules,
});

const observation = (overrides: Partial<ExecutionObservation> = {}): ExecutionObservation => ({
  ruleId: 'configured-rule',
  state: 'violated',
  actor: { id: 'player-7', name: 'Ari' },
  role: 'damage',
  phase: { id: 'execute', label: 'Execute' },
  timestamp: 0,
  evidence: [
    {
      timestamp: 0,
      source: 'combat-log',
      description: 'Configured mechanic occurred at pull.',
      eventId: 'fixture-event-0',
    },
  ],
  observed: { summary: 'Observed configured mechanic.', value: 'observed' },
  expected: { summary: 'Parser-provided value must not replace the configured expectation.' },
  estimatedImpact: { value: 7, unit: 'count', description: 'One configured failure.' },
  confidence: 'high',
  ...overrides,
});

const readyRegistry = (ruleSets: readonly ExecutionRuleSet[]): EncounterExecutionRuleRegistry => {
  const result = createEncounterExecutionRuleRegistry(ruleSets);
  expect(result).toMatchObject({ status: 'ready' });
  if (result.status !== 'ready') {
    throw new Error(result.detail);
  }
  return result.registry;
};

describe('encounter execution rule registry', () => {
  it('evaluates only a snapshot of configured definitions and preserves transparent evidence', () => {
    const source = ruleSet();
    const registry = readyRegistry([source]);

    (source.rules as ExecutionRuleDefinition[])[0] = configuredRule(scope, {
      scoring: { whenMet: 999, whenViolated: -999 },
      expected: { summary: 'Mutated caller input.' },
    });
    (
      (source.rules[0].configuration as { triggerAbilityIds: number[] })
        .triggerAbilityIds as number[]
    )[0] = 123456;

    const result = evaluateEncounterExecutionRules(registry, scope, [observation()]);

    expect(result).toMatchObject({ status: 'available' });
    if (result.status !== 'available') return;

    expect(result.score).toEqual({ status: 'complete', value: -4, knownContribution: -4 });
    expect(result.outcomes[0]).toMatchObject({ status: 'violated', scoreContribution: -4 });
    expect(result.outcomes[0].rule.configuration).toEqual({
      triggerAbilityIds: [9001],
      phase: 'execute',
    });
    expect(result.outcomes[0].findings[0]).toMatchObject({
      actor: { id: 'player-7', name: 'Ari' },
      role: 'damage',
      phase: { id: 'execute', label: 'Execute' },
      timestamp: 0,
      evidence: [expect.objectContaining({ eventId: 'fixture-event-0', timestamp: 0 })],
      observed: { summary: 'Observed configured mechanic.', value: 'observed' },
      expected: { summary: 'Configured expected behavior.', value: 'configured' },
      estimatedImpact: { value: 7, unit: 'count', description: 'One configured failure.' },
      confidence: 'high',
      scoreContribution: -4,
    });
  });

  it.each([
    { ...scope, eso: { ...scope.eso, update: 'U47' } },
    { ...scope, eso: { ...scope.eso, partition: 'pts-na' } },
    { ...scope, encounter: { ...scope.encounter, version: '2026.10' } },
    { ...scope, encounter: { ...scope.encounter, kind: 'training-dummy' as const } },
    { ...scope, encounter: { ...scope.encounter, difficulty: 'normal' } },
  ])('fails closed for a nearby but isolated scope: %p', (mismatchedScope) => {
    const result = evaluateEncounterExecutionRules(readyRegistry([ruleSet()]), mismatchedScope, [
      observation(),
    ]);

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'context-mismatch',
      detail:
        'A rule set exists for this encounter but not for this exact ESO update, partition, version, kind, and difficulty.',
      outcomes: [],
    });
  });

  it('selects an exact partition definition and never falls back to a nearby one', () => {
    const ptsScope: ExecutionRuleScope = {
      ...scope,
      eso: { ...scope.eso, partition: 'pts-na' },
    };
    const ptsRule = configuredRule(ptsScope, {
      title: 'PTS-only configured expectation',
      expected: { summary: 'PTS expectation.' },
      scoring: { whenMet: 11, whenViolated: -22 },
    });
    const registry = readyRegistry([ruleSet(), ruleSet(ptsScope, [ptsRule])]);

    const result = evaluateEncounterExecutionRules(registry, ptsScope, [observation()]);

    expect(result).toMatchObject({ status: 'available' });
    if (result.status !== 'available') return;
    expect(result.outcomes[0].rule.title).toBe('PTS-only configured expectation');
    expect(result.outcomes[0].findings[0]).toMatchObject({
      expected: { summary: 'PTS expectation.' },
      scoreContribution: -22,
    });
    expect(result.score).toEqual({ status: 'complete', value: -22, knownContribution: -22 });
  });

  it('does not infer a definition for a different encounter or an empty registry', () => {
    const differentEncounterScope: ExecutionRuleScope = {
      ...scope,
      encounter: { ...scope.encounter, id: 'different-fixture-encounter' },
    };

    expect(
      evaluateEncounterExecutionRules(readyRegistry([ruleSet()]), differentEncounterScope, [
        observation(),
      ]),
    ).toMatchObject({ status: 'unavailable', reason: 'unconfigured-scope', outcomes: [] });
    expect(evaluateEncounterExecutionRules(readyRegistry([]), scope, [])).toMatchObject({
      status: 'unavailable',
      reason: 'unconfigured-scope',
      outcomes: [],
    });
  });

  it('rejects malformed, duplicate, or untrusted registries before a finding can be made', () => {
    const cyclicConfiguration: Record<string, unknown> = {};
    cyclicConfiguration.self = cyclicConfiguration;
    const malformed = ruleSet(scope, [
      configuredRule(scope, { configuration: cyclicConfiguration }),
    ]);

    expect(createEncounterExecutionRuleRegistry([malformed])).toMatchObject({
      status: 'unavailable',
      reason: 'invalid-registry',
      detail: expect.stringContaining('acyclic JSON'),
    });
    expect(createEncounterExecutionRuleRegistry([ruleSet(), ruleSet()])).toMatchObject({
      status: 'unavailable',
      reason: 'invalid-registry',
      detail: expect.stringContaining('duplicates'),
    });
    expect(
      evaluateEncounterExecutionRules({ ruleSets: [ruleSet()] }, scope, [observation()]),
    ).toMatchObject({ status: 'unavailable', reason: 'invalid-registry', outcomes: [] });
  });

  it('keeps unknown confidence and malformed input from creating confident scores', () => {
    const registry = readyRegistry([ruleSet()]);
    const unknownResult = evaluateEncounterExecutionRules(registry, scope, [
      observation({ confidence: 'unknown' }),
    ]);

    expect(unknownResult).toMatchObject({ status: 'available' });
    if (unknownResult.status === 'available') {
      expect(unknownResult.outcomes[0]).toMatchObject({
        status: 'unknown',
        scoreContribution: null,
        findings: [expect.objectContaining({ state: 'unknown', scoreContribution: null })],
      });
      expect(unknownResult.score).toEqual({ status: 'unknown', value: null, knownContribution: 0 });
    }

    expect(
      evaluateEncounterExecutionRules(registry, scope, [null as unknown as ExecutionObservation]),
    ).toMatchObject({ status: 'unavailable', reason: 'invalid-observation', outcomes: [] });
    expect(
      evaluateEncounterExecutionRules(
        registry,
        { ...scope, eso: { ...scope.eso, partition: '' } },
        [],
      ),
    ).toMatchObject({ status: 'unavailable', reason: 'invalid-report-scope', outcomes: [] });
  });
});
