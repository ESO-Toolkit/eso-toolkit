import {
  evaluateExecutionRules,
  isValidExecutionRuleScope,
  validateExecutionRuleSet,
  type ExecutionObservation,
  type ExecutionRuleEvaluation,
  type ExecutionRuleScope,
  type ExecutionRuleSet,
} from './executionRules';

/**
 * A validated, immutable collection of externally supplied rule definitions.
 * The engine deliberately has no encounter-specific fallback definitions.
 */
export interface EncounterExecutionRuleRegistry {
  readonly ruleSets: readonly ExecutionRuleSet[];
}

export interface ReadyEncounterExecutionRuleRegistry {
  readonly status: 'ready';
  readonly registry: EncounterExecutionRuleRegistry;
}

export interface InvalidEncounterExecutionRuleRegistry {
  readonly status: 'unavailable';
  readonly reason: 'invalid-registry';
  readonly detail: string;
}

export type EncounterExecutionRuleRegistryResult =
  ReadyEncounterExecutionRuleRegistry | InvalidEncounterExecutionRuleRegistry;

export type EncounterExecutionEngineUnavailableReason =
  'invalid-registry' | 'invalid-report-scope' | 'unconfigured-scope' | 'context-mismatch';

export interface UnavailableEncounterExecutionRuleEvaluation {
  readonly status: 'unavailable';
  readonly reason: EncounterExecutionEngineUnavailableReason;
  readonly detail: string;
  readonly outcomes: readonly [];
}

export type EncounterExecutionRuleEvaluation =
  ExecutionRuleEvaluation | UnavailableEncounterExecutionRuleEvaluation;

const registryLookups = new WeakMap<
  EncounterExecutionRuleRegistry,
  ReadonlyMap<string, ExecutionRuleSet>
>();

const scopeKey = (scope: ExecutionRuleScope): string =>
  JSON.stringify([
    scope.eso.update,
    scope.eso.partition,
    scope.encounter.id,
    scope.encounter.version,
    scope.encounter.kind,
    scope.encounter.difficulty ?? null,
  ]);

const cloneConfigurationValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(cloneConfigurationValue));
  }

  if (value !== null && typeof value === 'object') {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, cloneConfigurationValue(entry)]),
      ),
    );
  }

  return value;
};

const cloneScope = (scope: ExecutionRuleScope): ExecutionRuleScope =>
  Object.freeze({
    eso: Object.freeze({ ...scope.eso }),
    encounter: Object.freeze({ ...scope.encounter }),
  });

const cloneRuleSet = (ruleSet: ExecutionRuleSet): ExecutionRuleSet => {
  const ruleSetScope = cloneScope(ruleSet.scope);
  const rules = ruleSet.rules.map((rule) =>
    Object.freeze({
      ...rule,
      scope: cloneScope(rule.scope),
      provenance: Object.freeze({ ...rule.provenance }),
      expected: Object.freeze({ ...rule.expected }),
      scoring: Object.freeze({ ...rule.scoring }),
      configuration: cloneConfigurationValue(rule.configuration) as Readonly<
        Record<string, unknown>
      >,
    }),
  );

  return Object.freeze({
    schemaVersion: ruleSet.schemaVersion,
    scope: ruleSetScope,
    rules: Object.freeze(rules),
  });
};

const unavailable = (
  reason: EncounterExecutionEngineUnavailableReason,
  detail: string,
): UnavailableEncounterExecutionRuleEvaluation => ({
  status: 'unavailable',
  reason,
  detail,
  outcomes: [],
});

/**
 * Takes only schema-validated, versioned definitions and snapshots them. An
 * invalid or duplicate scope makes the whole registry unavailable rather than
 * selecting an arbitrary rule set.
 */
export const createEncounterExecutionRuleRegistry = (
  ruleSets: unknown,
): EncounterExecutionRuleRegistryResult => {
  if (!Array.isArray(ruleSets)) {
    return {
      status: 'unavailable',
      reason: 'invalid-registry',
      detail: 'Encounter execution-rule registry must be an array of rule sets.',
    };
  }

  const scopes = new Set<string>();
  const snapshots: ExecutionRuleSet[] = [];

  for (const [index, candidate] of ruleSets.entries()) {
    const validation = validateExecutionRuleSet(candidate);
    if (!validation.valid) {
      return {
        status: 'unavailable',
        reason: 'invalid-registry',
        detail: `Rule set ${index} is invalid: ${validation.detail ?? 'Unknown validation error.'}`,
      };
    }

    const validRuleSet = candidate as ExecutionRuleSet;
    const key = scopeKey(validRuleSet.scope);
    if (scopes.has(key)) {
      return {
        status: 'unavailable',
        reason: 'invalid-registry',
        detail: `Rule set ${index} duplicates an exact ESO and encounter scope.`,
      };
    }

    scopes.add(key);
    snapshots.push(cloneRuleSet(validRuleSet));
  }

  const registry: EncounterExecutionRuleRegistry = Object.freeze({
    ruleSets: Object.freeze(snapshots),
  });
  registryLookups.set(
    registry,
    new Map(registry.ruleSets.map((ruleSet) => [scopeKey(ruleSet.scope), ruleSet])),
  );

  return { status: 'ready', registry };
};

const sharesEncounterIdentity = (
  ruleSet: ExecutionRuleSet,
  reportScope: ExecutionRuleScope,
): boolean => ruleSet.scope.encounter.id === reportScope.encounter.id;

/**
 * Selects an exact configured scope, then delegates to the schema evaluator.
 * Combat events are intentionally not interpreted here: an encounter parser
 * must explicitly produce observations for an authoritative or configurable
 * definition before a finding can be scored.
 */
export const evaluateEncounterExecutionRules = (
  registry: EncounterExecutionRuleRegistry,
  reportScope: unknown,
  observations: readonly ExecutionObservation[],
): EncounterExecutionRuleEvaluation => {
  const lookup = registryLookups.get(registry);
  if (lookup === undefined) {
    return unavailable(
      'invalid-registry',
      'Encounter execution-rule registry was not created by the validated registry factory.',
    );
  }

  if (!isValidExecutionRuleScope(reportScope)) {
    return unavailable(
      'invalid-report-scope',
      'Report scope must include a finite ESO update, partition, encounter, and version.',
    );
  }

  const ruleSet = lookup.get(scopeKey(reportScope));
  if (ruleSet !== undefined) {
    return evaluateExecutionRules(ruleSet, reportScope, observations);
  }

  if (registry.ruleSets.some((candidate) => sharesEncounterIdentity(candidate, reportScope))) {
    return unavailable(
      'context-mismatch',
      'A rule set exists for this encounter but not for this exact ESO update, partition, version, kind, and difficulty.',
    );
  }

  return unavailable(
    'unconfigured-scope',
    'No execution-rule definition is configured for this exact ESO and encounter scope.',
  );
};
