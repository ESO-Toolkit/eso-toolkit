/**
 * A data-only contract for encounter execution rules. Product code must supply
 * a versioned rule set; this module intentionally contains no encounter rules.
 */
export const EXECUTION_RULE_SCHEMA_VERSION = 1 as const;

export type ExecutionRuleCategory =
  | 'avoidable-damage'
  | 'missed-interrupt'
  | 'priority-target-failure'
  | 'mechanic-compliance'
  | 'nonlethal-mistake';

export type ExecutionRole = 'tank' | 'healer' | 'damage' | 'support' | 'unknown';

export type Confidence = 'high' | 'medium' | 'low' | 'unknown';

export interface EsoPartition {
  readonly update: string;
  readonly partition: string;
}

export interface EncounterIdentity {
  readonly id: string;
  readonly version: string;
  readonly kind: 'encounter' | 'training-dummy';
  readonly difficulty?: string;
}

export interface ExecutionRuleScope {
  readonly eso: EsoPartition;
  readonly encounter: EncounterIdentity;
}

export interface ExecutionActor {
  readonly id: string | number;
  readonly name?: string;
}

export interface ExecutionPhase {
  readonly id: string;
  readonly label: string;
}

export interface BehaviorDescription {
  readonly summary: string;
  readonly value?: string | number | boolean | null;
}

export interface ExecutionEvidence {
  readonly timestamp: number;
  readonly source: 'combat-log' | 'authoritative-encounter-data' | 'configured-definition';
  readonly description: string;
  readonly eventId?: string;
}

export interface EstimatedImpact {
  readonly value: number | null;
  readonly unit: 'damage' | 'duration-ms' | 'count' | 'score' | 'unknown';
  readonly description: string;
}

export interface RuleProvenance {
  /** Authoritative data is verified; configurable rules must remain visibly configurable in UI. */
  readonly kind: 'authoritative' | 'configurable';
  readonly source: string;
  readonly revision?: string;
}

export interface RuleScoring {
  readonly whenMet: number;
  readonly whenViolated: number;
}

export interface ExecutionRuleDefinition {
  readonly id: string;
  readonly title: string;
  readonly category: ExecutionRuleCategory;
  readonly scope: ExecutionRuleScope;
  readonly provenance: RuleProvenance;
  readonly expected: BehaviorDescription;
  readonly scoring: RuleScoring;
  /** Rule-specific configuration interpreted by a separately versioned parser. */
  readonly configuration: Readonly<Record<string, unknown>>;
}

export interface ExecutionRuleSet {
  readonly schemaVersion: typeof EXECUTION_RULE_SCHEMA_VERSION;
  readonly scope: ExecutionRuleScope;
  readonly rules: readonly ExecutionRuleDefinition[];
}

export type ObservationState = 'met' | 'violated' | 'unknown';

export interface ExecutionObservation {
  readonly ruleId: string;
  readonly state: ObservationState;
  readonly actor: ExecutionActor | null;
  readonly role: ExecutionRole;
  readonly phase: ExecutionPhase | null;
  /** The primary event timestamp, retained independently from the evidence list. */
  readonly timestamp: number | null;
  readonly evidence: readonly ExecutionEvidence[];
  readonly observed: BehaviorDescription;
  readonly expected: BehaviorDescription;
  readonly estimatedImpact: EstimatedImpact | null;
  readonly confidence: Confidence;
}

export type RuleOutcomeStatus = ObservationState | 'partial';

export interface ExecutionFinding {
  readonly ruleId: string;
  readonly category: ExecutionRuleCategory;
  readonly state: ObservationState;
  readonly actor: ExecutionActor | null;
  readonly role: ExecutionRole;
  readonly phase: ExecutionPhase | null;
  readonly timestamp: number | null;
  readonly evidence: readonly ExecutionEvidence[];
  readonly observed: BehaviorDescription;
  readonly expected: BehaviorDescription;
  readonly estimatedImpact: EstimatedImpact | null;
  readonly confidence: Confidence;
  /** Null deliberately prevents unknown observations from being displayed as a zero score. */
  readonly scoreContribution: number | null;
}

export interface ExecutionRuleOutcome {
  readonly rule: ExecutionRuleDefinition;
  readonly status: RuleOutcomeStatus;
  readonly findings: readonly ExecutionFinding[];
  readonly scoreContribution: number | null;
}

export interface ExecutionScore {
  readonly status: 'complete' | 'partial' | 'unknown';
  /** Only present when every configured rule has known observations. */
  readonly value: number | null;
  /** The contribution from known observations, useful for transparent partial displays. */
  readonly knownContribution: number;
}

export type UnavailableReason =
  | 'invalid-rule-set'
  | 'no-rules-configured'
  | 'context-mismatch'
  | 'unknown-rule-observation'
  | 'invalid-observation'
  | 'score-overflow';

export interface AvailableExecutionRuleEvaluation {
  readonly status: 'available';
  readonly scope: ExecutionRuleScope;
  readonly outcomes: readonly ExecutionRuleOutcome[];
  readonly unknownRuleIds: readonly string[];
  readonly score: ExecutionScore;
}

export interface UnavailableExecutionRuleEvaluation {
  readonly status: 'unavailable';
  readonly reason: UnavailableReason;
  readonly detail: string;
  readonly outcomes: readonly [];
}

export type ExecutionRuleEvaluation =
  AvailableExecutionRuleEvaluation | UnavailableExecutionRuleEvaluation;

export interface ExecutionRuleSetValidation {
  readonly valid: boolean;
  readonly detail?: string;
}

const validCategories = new Set<ExecutionRuleCategory>([
  'avoidable-damage',
  'missed-interrupt',
  'priority-target-failure',
  'mechanic-compliance',
  'nonlethal-mistake',
]);

const validEncounterKinds = new Set<EncounterIdentity['kind']>(['encounter', 'training-dummy']);
const validRoles = new Set<ExecutionRole>(['tank', 'healer', 'damage', 'support', 'unknown']);
const validConfidence = new Set<Confidence>(['high', 'medium', 'low', 'unknown']);
const validObservationStates = new Set<ObservationState>(['met', 'violated', 'unknown']);
const validImpactUnits = new Set<EstimatedImpact['unit']>([
  'damage',
  'duration-ms',
  'count',
  'score',
  'unknown',
]);
const validEvidenceSources = new Set<ExecutionEvidence['source']>([
  'combat-log',
  'authoritative-encounter-data',
  'configured-definition',
]);

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isJsonValue = (value: unknown, ancestors = new Set<object>()): boolean => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    if (ancestors.has(value)) return false;
    ancestors.add(value);
    const valid = value.every((entry) => isJsonValue(entry, ancestors));
    ancestors.delete(value);
    return valid;
  }

  if (!isRecord(value)) return false;
  if (ancestors.has(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;

  ancestors.add(value);
  const valid = Object.values(value).every((entry) => isJsonValue(entry, ancestors));
  ancestors.delete(value);
  return valid;
};

/** Validates the exact ESO/encounter boundary used to select a rule set. */
export const isValidExecutionRuleScope = (value: unknown): value is ExecutionRuleScope => {
  if (!isRecord(value) || !isRecord(value.eso) || !isRecord(value.encounter)) return false;

  return (
    hasText(value.eso.update) &&
    hasText(value.eso.partition) &&
    hasText(value.encounter.id) &&
    hasText(value.encounter.version) &&
    validEncounterKinds.has(value.encounter.kind as EncounterIdentity['kind']) &&
    (value.encounter.difficulty === undefined || hasText(value.encounter.difficulty))
  );
};

const isValidBehavior = (value: unknown): value is BehaviorDescription => {
  if (!isRecord(value) || !hasText(value.summary)) return false;
  const behaviorValue = value.value;
  return (
    behaviorValue === undefined ||
    behaviorValue === null ||
    typeof behaviorValue === 'string' ||
    typeof behaviorValue === 'boolean' ||
    (typeof behaviorValue === 'number' && Number.isFinite(behaviorValue))
  );
};

const scopesMatch = (left: ExecutionRuleScope, right: ExecutionRuleScope): boolean =>
  left.eso.update === right.eso.update &&
  left.eso.partition === right.eso.partition &&
  left.encounter.id === right.encounter.id &&
  left.encounter.version === right.encounter.version &&
  left.encounter.kind === right.encounter.kind &&
  left.encounter.difficulty === right.encounter.difficulty;

const unavailable = (
  reason: UnavailableReason,
  detail: string,
): UnavailableExecutionRuleEvaluation => ({
  status: 'unavailable',
  reason,
  detail,
  outcomes: [],
});

/**
 * Verifies that a caller-provided ruleset is self-consistent before it is used
 * against report data. There are deliberately no fallback or implicit rules.
 */
export const validateExecutionRuleSet = (ruleSet: unknown): ExecutionRuleSetValidation => {
  if (!isRecord(ruleSet)) {
    return { valid: false, detail: 'Execution rule set must be an object.' };
  }

  if (ruleSet.schemaVersion !== EXECUTION_RULE_SCHEMA_VERSION) {
    return { valid: false, detail: 'Unsupported execution-rule schema version.' };
  }

  if (!isValidExecutionRuleScope(ruleSet.scope)) {
    return {
      valid: false,
      detail: 'Rule set scope must include ESO update, partition, encounter, and version.',
    };
  }

  if (!Array.isArray(ruleSet.rules)) {
    return { valid: false, detail: 'Execution rule set rules must be an array.' };
  }

  const identifiers = new Set<string>();
  for (const rule of ruleSet.rules) {
    if (!isRecord(rule)) {
      return { valid: false, detail: 'Every rule must be an object.' };
    }
    if (!hasText(rule.id) || identifiers.has(rule.id)) {
      return { valid: false, detail: 'Every rule requires a unique non-empty id.' };
    }
    identifiers.add(rule.id);

    if (
      !validCategories.has(rule.category as ExecutionRuleCategory) ||
      !hasText(rule.title) ||
      !isValidBehavior(rule.expected)
    ) {
      return {
        valid: false,
        detail: `Rule ${rule.id} has an invalid category, title, or expected behavior.`,
      };
    }

    if (!isValidExecutionRuleScope(rule.scope) || !scopesMatch(rule.scope, ruleSet.scope)) {
      return {
        valid: false,
        detail: `Rule ${rule.id} does not match the versioned rule-set scope.`,
      };
    }

    if (
      !isRecord(rule.provenance) ||
      (rule.provenance.kind !== 'authoritative' && rule.provenance.kind !== 'configurable') ||
      !hasText(rule.provenance.source) ||
      (rule.provenance.revision !== undefined && !hasText(rule.provenance.revision))
    ) {
      return {
        valid: false,
        detail: `Rule ${rule.id} must declare authoritative or configurable provenance.`,
      };
    }

    if (
      !isRecord(rule.scoring) ||
      !Number.isFinite(rule.scoring.whenMet) ||
      !Number.isFinite(rule.scoring.whenViolated)
    ) {
      return { valid: false, detail: `Rule ${rule.id} has non-finite score contributions.` };
    }

    if (!isRecord(rule.configuration) || !isJsonValue(rule.configuration)) {
      return {
        valid: false,
        detail: `Rule ${rule.id} configuration must be a finite, acyclic JSON object.`,
      };
    }
  }

  return { valid: true };
};

const validateObservation = (observation: unknown): string | null => {
  if (!isRecord(observation)) return 'Observation must be an object.';

  if (
    !hasText(observation.ruleId) ||
    !validObservationStates.has(observation.state as ObservationState) ||
    !validRoles.has(observation.role as ExecutionRole) ||
    !validConfidence.has(observation.confidence as Confidence)
  ) {
    return 'Observation is missing a rule id, state, actor role, or confidence state.';
  }

  if (
    observation.timestamp !== null &&
    (typeof observation.timestamp !== 'number' ||
      !Number.isFinite(observation.timestamp) ||
      observation.timestamp < 0)
  ) {
    return 'Observation timestamp must be finite and non-negative when present.';
  }

  if (
    observation.actor !== null &&
    !(
      (isRecord(observation.actor) &&
        typeof observation.actor.id === 'string' &&
        hasText(observation.actor.id)) ||
      (isRecord(observation.actor) &&
        typeof observation.actor.id === 'number' &&
        Number.isFinite(observation.actor.id))
    )
  ) {
    return 'Observation actor id must be a non-empty string or finite number when present.';
  }

  if (
    isRecord(observation.actor) &&
    observation.actor.name !== undefined &&
    !hasText(observation.actor.name)
  ) {
    return 'Observation actor name must be non-empty when present.';
  }

  if (
    observation.phase !== null &&
    (!isRecord(observation.phase) ||
      !hasText(observation.phase.id) ||
      !hasText(observation.phase.label))
  ) {
    return 'Observation phase must include an id and label when present.';
  }

  if (!isValidBehavior(observation.observed) || !isValidBehavior(observation.expected)) {
    return 'Observation must preserve both observed and expected behavior.';
  }

  if (
    observation.estimatedImpact !== null &&
    (!isRecord(observation.estimatedImpact) ||
      !hasText(observation.estimatedImpact.description) ||
      !validImpactUnits.has(observation.estimatedImpact.unit as EstimatedImpact['unit']) ||
      (observation.estimatedImpact.value !== null &&
        (typeof observation.estimatedImpact.value !== 'number' ||
          !Number.isFinite(observation.estimatedImpact.value) ||
          observation.estimatedImpact.value < 0)))
  ) {
    return 'Estimated impact must have a supported unit, description, and finite non-negative value when known.';
  }

  if (!Array.isArray(observation.evidence)) {
    return 'Observation evidence must be an array.';
  }

  for (const evidence of observation.evidence) {
    if (
      !isRecord(evidence) ||
      typeof evidence.timestamp !== 'number' ||
      !Number.isFinite(evidence.timestamp) ||
      evidence.timestamp < 0 ||
      !hasText(evidence.description) ||
      !validEvidenceSources.has(evidence.source as ExecutionEvidence['source']) ||
      (evidence.eventId !== undefined && !hasText(evidence.eventId))
    ) {
      return 'Evidence must contain a finite non-negative timestamp, supported source, and description.';
    }
  }

  if (
    observation.state !== 'unknown' &&
    (observation.timestamp === null || observation.evidence.length === 0)
  ) {
    return 'Known observations must retain a primary timestamp and supporting evidence.';
  }

  return null;
};

const contributionFor = (rule: ExecutionRuleDefinition, state: ObservationState): number | null => {
  if (state === 'unknown') {
    return null;
  }

  return state === 'met' ? rule.scoring.whenMet : rule.scoring.whenViolated;
};

const sumContributions = (contributions: readonly number[]): number | null => {
  let sum = 0;
  for (const contribution of contributions) {
    sum += contribution;
    if (!Number.isFinite(sum)) return null;
  }
  return Object.is(sum, -0) ? 0 : sum;
};

const outcomeStatusFor = (findings: readonly ExecutionFinding[]): RuleOutcomeStatus => {
  if (findings.length === 0 || findings.every((finding) => finding.state === 'unknown')) {
    return 'unknown';
  }

  if (findings.some((finding) => finding.state === 'unknown')) {
    return 'partial';
  }

  return findings.some((finding) => finding.state === 'violated') ? 'violated' : 'met';
};

/**
 * Evaluates observations produced by an encounter-specific parser. A ruleset
 * can only be used for its exact ESO partition and encounter/version.
 */
export const evaluateExecutionRules = (
  ruleSet: ExecutionRuleSet,
  reportScope: ExecutionRuleScope,
  observations: readonly ExecutionObservation[],
): ExecutionRuleEvaluation => {
  const validation = validateExecutionRuleSet(ruleSet);
  if (!validation.valid) {
    return unavailable('invalid-rule-set', validation.detail ?? 'Invalid execution rule set.');
  }

  if (ruleSet.rules.length === 0) {
    return unavailable(
      'no-rules-configured',
      'No encounter execution rules are configured for this scope.',
    );
  }

  if (!isValidExecutionRuleScope(reportScope)) {
    return unavailable('context-mismatch', 'Report execution scope is invalid or incomplete.');
  }

  if (!scopesMatch(ruleSet.scope, reportScope)) {
    return unavailable(
      'context-mismatch',
      'Execution rules cannot be applied across ESO partitions or encounter versions.',
    );
  }

  if (!Array.isArray(observations)) {
    return unavailable('invalid-observation', 'Execution observations must be an array.');
  }

  const rulesById = new Map(ruleSet.rules.map((rule) => [rule.id, rule]));
  for (const observation of observations) {
    const error = validateObservation(observation);
    if (error !== null) {
      return unavailable('invalid-observation', error);
    }

    if (!rulesById.has(observation.ruleId)) {
      return unavailable(
        'unknown-rule-observation',
        `Observation references unknown rule ${observation.ruleId}.`,
      );
    }
  }

  const observationsByRule = new Map<string, ExecutionObservation[]>();
  for (const observation of observations) {
    const existing = observationsByRule.get(observation.ruleId);
    if (existing === undefined) {
      observationsByRule.set(observation.ruleId, [observation]);
    } else {
      existing.push(observation);
    }
  }

  let scoreOverflowRuleId: string | null = null;
  const outcomes = ruleSet.rules.map<ExecutionRuleOutcome>((rule) => {
    const findings = (observationsByRule.get(rule.id) ?? []).map<ExecutionFinding>(
      (observation) => {
        const state: ObservationState =
          observation.confidence === 'unknown' ? 'unknown' : observation.state;

        return {
          ruleId: rule.id,
          category: rule.category,
          state,
          actor: observation.actor,
          role: observation.role,
          phase: observation.phase,
          timestamp: observation.timestamp,
          evidence: observation.evidence,
          observed: observation.observed,
          expected: rule.expected,
          estimatedImpact: observation.estimatedImpact,
          confidence: observation.confidence,
          scoreContribution: contributionFor(rule, state),
        };
      },
    );

    const knownContributions = findings
      .map((finding) => finding.scoreContribution)
      .filter((contribution): contribution is number => contribution !== null);

    const scoreContribution =
      findings.length === 0 || findings.some((finding) => finding.scoreContribution === null)
        ? null
        : sumContributions(knownContributions);
    if (
      scoreContribution === null &&
      findings.length > 0 &&
      findings.every((finding) => finding.scoreContribution !== null)
    ) {
      scoreOverflowRuleId = rule.id;
    }

    return {
      rule,
      status: outcomeStatusFor(findings),
      findings,
      scoreContribution,
    };
  });

  if (scoreOverflowRuleId !== null) {
    return unavailable(
      'score-overflow',
      `Known score contributions overflowed for rule ${scoreOverflowRuleId}.`,
    );
  }

  const unknownRuleIds = outcomes
    .filter((outcome) => outcome.status === 'unknown' || outcome.status === 'partial')
    .map((outcome) => outcome.rule.id);
  const knownContribution = sumContributions(
    outcomes.flatMap((outcome) =>
      outcome.findings.flatMap((finding) =>
        finding.scoreContribution === null ? [] : [finding.scoreContribution],
      ),
    ),
  );
  if (knownContribution === null) {
    return unavailable('score-overflow', 'Known score contributions overflowed the total score.');
  }
  const scoreStatus: ExecutionScore['status'] =
    unknownRuleIds.length === 0
      ? 'complete'
      : outcomes.every((outcome) =>
            outcome.findings.every((finding) => finding.state === 'unknown'),
          )
        ? 'unknown'
        : 'partial';

  return {
    status: 'available',
    scope: ruleSet.scope,
    outcomes,
    unknownRuleIds,
    score: {
      status: scoreStatus,
      value: scoreStatus === 'complete' ? knownContribution : null,
      knownContribution,
    },
  };
};
