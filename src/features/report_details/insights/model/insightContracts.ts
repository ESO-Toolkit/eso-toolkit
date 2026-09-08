/**
 * Versioned, data-only contracts for trustworthy Insights.
 *
 * These types deliberately contain no encounter mechanics. Consumers must supply
 * a versioned rule definition with provenance before an execution finding can be
 * presented as a game rule; otherwise it remains an explicitly configurable
 * definition. This keeps the contract useful before an authoritative ruleset is
 * available without making unsupported claims about an encounter.
 */

export const INSIGHTS_CONTRACT_VERSION = '1.0' as const;

export type InsightEvidenceKind = 'fixed-heuristic' | 'game-rule' | 'peer-benchmark';
export type Confidence = 'high' | 'medium' | 'low' | 'unknown';
export type BaselineAvailability = 'available' | 'unavailable' | 'provisional';
export type Difficulty = 'normal' | 'veteran' | 'hard-mode' | 'unknown';
export type ExecutionFindingKind =
  | 'avoidable-damage'
  | 'missed-interrupt'
  | 'priority-target-failure'
  | 'mechanic-compliance'
  | 'nonlethal-mistake';

/** A stable ESO game-data partition, never a display label. */
export interface EsoPartition {
  /** ESO update, e.g. "U50". "unknown" is allowed but cannot validate a peer benchmark. */
  readonly update: string;
  /** Region, platform, ruleset, or other authoritative data partition identifier. */
  readonly id: string;
}

export interface EncounterIdentity {
  /** Stable encounter definition id, not an actor name. */
  readonly id: string;
  /** Whether this analysis is a real encounter or a training dummy. */
  readonly type: 'encounter' | 'training-dummy';
  /** Optional source-native encounter/version id useful to an integration. */
  readonly sourceId?: string;
}

export interface BuildBracket {
  readonly role: string;
  readonly esoClass: string;
  /** A consumer-defined, documented build grouping, e.g. "two-bar-dps". */
  readonly id: string;
  readonly label: string;
}

/** The complete applicability partition for a peer comparison. */
export interface InsightPartition {
  readonly eso: EsoPartition;
  readonly encounter: EncounterIdentity;
  readonly difficulty: Difficulty;
  readonly build: BuildBracket;
}

export interface BaselineSource {
  /** Human-readable source name shown with a recommendation. */
  readonly name: string;
  /** Link to the source methodology or authoritative dataset, if publishable. */
  readonly url?: string;
  /** The source's own version or dataset release identifier. */
  readonly version?: string;
}

export interface BaselinePeriod {
  readonly start: string;
  readonly end: string;
}

export interface BaselineDistribution {
  readonly metric: string;
  readonly unit: 'percent' | 'count' | 'milliseconds' | 'damage' | 'score' | 'other';
  /** Quantiles are optional because some sources publish only a range. */
  readonly p25?: number;
  readonly p50?: number;
  readonly p75?: number;
  readonly p95?: number;
  readonly minimum?: number;
  readonly maximum?: number;
}

/** Provenance required before a recommendation is labelled as a peer benchmark. */
interface BaselineContext {
  readonly partition: InsightPartition;
}

/** A complete, directly comparable peer cohort. */
export interface AvailableBaselineContract extends BaselineContext {
  readonly availability: 'available';
  readonly source: BaselineSource;
  readonly period: BaselinePeriod;
  readonly sampleSize: number;
  readonly distribution: BaselineDistribution;
  readonly refreshDate: string;
  readonly confidence: Exclude<Confidence, 'unknown'>;
}

/** Data that may inform a user but cannot be presented as a settled cohort. */
export interface ProvisionalBaselineContract extends BaselineContext {
  readonly availability: 'provisional';
  /** A user-visible explanation of what makes this data provisional. */
  readonly statusReason: string;
  readonly source?: BaselineSource;
  readonly period?: BaselinePeriod;
  readonly sampleSize?: number;
  readonly distribution?: BaselineDistribution;
  readonly refreshDate?: string;
  readonly confidence: Confidence;
}

/** Explicit absence is data, not a zero-valued benchmark. */
export interface UnavailableBaselineContract extends BaselineContext {
  readonly availability: 'unavailable';
  /** A user-visible explanation of why no comparable cohort is available. */
  readonly statusReason: string;
  readonly confidence: 'unknown';
}

/**
 * Availability is discriminated so a caller cannot accidentally construct an
 * "available" benchmark without the provenance needed to show it honestly.
 */
export type BaselineContract =
  AvailableBaselineContract | ProvisionalBaselineContract | UnavailableBaselineContract;

export interface BaselineEligibility {
  readonly status: 'eligible' | 'warning' | 'blocked';
  readonly reasons: readonly string[];
}

const BASELINE_DISTRIBUTION_VALUES = ['p25', 'p50', 'p75', 'p95', 'minimum', 'maximum'] as const;
const CONFIDENCE_VALUES = ['high', 'medium', 'low', 'unknown'] as const;
const BASELINE_DISTRIBUTION_UNITS = [
  'percent',
  'count',
  'milliseconds',
  'damage',
  'score',
  'other',
] as const;
const ESTIMATED_IMPACT_UNITS = ['damage', 'time', 'score', 'other'] as const;
const INSIGHT_EVIDENCE_KINDS = ['fixed-heuristic', 'game-rule', 'peer-benchmark'] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isEncounterType(value: unknown): value is EncounterIdentity['type'] {
  return value === 'encounter' || value === 'training-dummy';
}

function isKnownDifficulty(value: unknown): value is Exclude<Difficulty, 'unknown'> {
  return value === 'normal' || value === 'veteran' || value === 'hard-mode';
}

function isKnownConfidence(value: unknown): value is Confidence {
  return CONFIDENCE_VALUES.includes(value as Confidence);
}

function isKnownBaselineDistributionUnit(value: unknown): value is BaselineDistribution['unit'] {
  return BASELINE_DISTRIBUTION_UNITS.includes(value as BaselineDistribution['unit']);
}

function isKnownEstimatedImpactUnit(value: unknown): value is EstimatedImpact['unit'] {
  return ESTIMATED_IMPACT_UNITS.includes(value as EstimatedImpact['unit']);
}

function isInsightEvidenceKind(value: unknown): value is InsightEvidenceKind {
  return INSIGHT_EVIDENCE_KINDS.includes(value as InsightEvidenceKind);
}

function validateDistribution(distribution: UnknownRecord, prefix: string): string[] {
  const reasons: string[] = [];
  if (!isNonEmpty(distribution.metric)) {
    reasons.push(`${prefix} require a named distribution metric.`);
  }
  if (!isKnownBaselineDistributionUnit(distribution.unit)) {
    reasons.push(`${prefix} require a valid distribution unit.`);
  }

  const values = BASELINE_DISTRIBUTION_VALUES.map((key) => distribution[key]);
  if (values.every((value) => value === undefined)) {
    reasons.push(`${prefix} require at least one statistic.`);
  }
  if (values.some((value) => value !== undefined && !Number.isFinite(value))) {
    reasons.push('Baseline distribution values must be finite.');
  }
  if (
    typeof distribution.minimum === 'number' &&
    typeof distribution.maximum === 'number' &&
    distribution.minimum > distribution.maximum
  ) {
    reasons.push('Baseline distribution minimum cannot exceed maximum.');
  }

  const quantiles = [distribution.p25, distribution.p50, distribution.p75, distribution.p95];
  const finiteQuantiles = quantiles.filter((value): value is number => Number.isFinite(value));
  if (finiteQuantiles.some((value, index) => index > 0 && value < finiteQuantiles[index - 1])) {
    reasons.push('Baseline distribution quantiles must be ordered.');
  }
  return reasons;
}

function validateOptionalProvisionalProvenance(baseline: UnknownRecord): string[] {
  const reasons: string[] = [];
  if (baseline.source !== undefined) {
    if (!isRecord(baseline.source) || !isNonEmpty(baseline.source.name)) {
      reasons.push('Provisional baseline source metadata must name its source.');
    }
  }
  if (baseline.period !== undefined) {
    if (
      !isRecord(baseline.period) ||
      !isValidDate(baseline.period.start) ||
      !isValidDate(baseline.period.end)
    ) {
      reasons.push('Provisional baseline periods must be valid.');
    } else if (Date.parse(baseline.period.end) < Date.parse(baseline.period.start)) {
      reasons.push('Provisional baseline periods must end on or after their start.');
    }
  }
  if (
    baseline.sampleSize !== undefined &&
    (typeof baseline.sampleSize !== 'number' ||
      !Number.isFinite(baseline.sampleSize) ||
      !Number.isInteger(baseline.sampleSize) ||
      baseline.sampleSize <= 0)
  ) {
    reasons.push('Provisional baseline sample sizes must be positive whole numbers.');
  }
  if (baseline.distribution !== undefined) {
    if (!isRecord(baseline.distribution)) {
      reasons.push('Provisional baselines require a valid distribution when one is supplied.');
    } else {
      reasons.push(
        ...validateDistribution(baseline.distribution, 'Provisional baseline distributions'),
      );
    }
  }
  if (baseline.refreshDate !== undefined && !isValidDate(baseline.refreshDate)) {
    reasons.push('Provisional baseline refresh dates must be valid.');
  }
  return reasons;
}

function validateComparisonPartition(partition: unknown): string[] {
  if (!isRecord(partition)) return ['Baselines require a complete comparison partition.'];

  const eso = isRecord(partition.eso) ? partition.eso : undefined;
  const encounter = isRecord(partition.encounter) ? partition.encounter : undefined;
  const build = isRecord(partition.build) ? partition.build : undefined;
  const reasons: string[] = [];
  if (
    !isNonEmpty(eso?.update) ||
    !isNonEmpty(eso?.id) ||
    !isNonEmpty(encounter?.id) ||
    !isEncounterType(encounter?.type) ||
    !isNonEmpty(build?.role) ||
    !isNonEmpty(build?.esoClass) ||
    !isNonEmpty(build?.id) ||
    !isNonEmpty(build?.label)
  ) {
    reasons.push('Baselines require a complete comparison partition.');
  }
  if (eso?.update === 'unknown') {
    reasons.push('Peer baselines require a known ESO update.');
  }
  if (eso?.id === 'unknown') {
    reasons.push('Peer baselines require a known ESO data partition.');
  }
  if (!isKnownDifficulty(partition.difficulty)) {
    reasons.push('Baselines require a known difficulty.');
  }
  return reasons;
}

/**
 * Defends persisted/API data at runtime as well as enforcing the discriminated
 * shape at compile time. A malformed available baseline is never comparable.
 */
export function validateBaselineContract(
  baseline: BaselineContract | undefined,
): BaselineEligibility {
  if (!isRecord(baseline)) {
    return { status: 'blocked', reasons: ['A matching peer baseline is unavailable.'] };
  }

  const partitionReasons = validateComparisonPartition(baseline.partition);
  const availability = baseline.availability;
  if (
    availability !== 'available' &&
    availability !== 'provisional' &&
    availability !== 'unavailable'
  ) {
    return { status: 'blocked', reasons: ['Baselines require a known availability state.'] };
  }
  if (availability === 'unavailable') {
    const reasons = [
      ...partitionReasons,
      isNonEmpty(baseline.statusReason)
        ? baseline.statusReason
        : 'A matching peer baseline is unavailable.',
    ];
    if (baseline.confidence !== 'unknown') {
      reasons.unshift('Unavailable baselines require unknown confidence.');
    }
    return {
      status: 'blocked',
      reasons,
    };
  }
  if (availability === 'provisional') {
    const reasons = [...partitionReasons];
    if (!isNonEmpty(baseline.statusReason))
      reasons.push('Provisional baselines require an explanation.');
    if (!isKnownConfidence(baseline.confidence)) {
      reasons.push('Baselines require a valid confidence level.');
    }
    reasons.push(...validateOptionalProvisionalProvenance(baseline));
    if (reasons.length > 0) return { status: 'blocked', reasons };
    return { status: 'warning', reasons: [baseline.statusReason] };
  }

  const reasons = partitionReasons.map((reason) =>
    reason.replace(/^Baselines/, 'Available baselines'),
  );
  const source = isRecord(baseline.source) ? baseline.source : undefined;
  const period = isRecord(baseline.period) ? baseline.period : undefined;
  const distribution = isRecord(baseline.distribution) ? baseline.distribution : undefined;
  if (!isNonEmpty(source?.name)) reasons.push('Available baselines require a source.');
  if (!period || !isValidDate(period.start) || !isValidDate(period.end)) {
    reasons.push('Available baselines require a valid measurement period.');
  } else if (Date.parse(period.end) < Date.parse(period.start)) {
    reasons.push('Available baseline periods must end on or after their start.');
  }
  if (
    !Number.isFinite(baseline.sampleSize) ||
    !Number.isInteger(baseline.sampleSize) ||
    baseline.sampleSize <= 0
  ) {
    reasons.push('Available baselines require a positive whole-number sample size.');
  }
  if (!distribution) {
    reasons.push('Available baselines require a distribution.');
  } else {
    reasons.push(...validateDistribution(distribution, 'Available baseline distributions'));
  }
  if (!isValidDate(baseline.refreshDate)) {
    reasons.push('Available baselines require a valid refresh date.');
  }
  const confidence = baseline.confidence as unknown;
  if (!isKnownConfidence(confidence) || confidence === 'unknown') {
    reasons.push('Available baselines require a known confidence level.');
  }
  return reasons.length === 0 ? { status: 'eligible', reasons } : { status: 'blocked', reasons };
}

/**
 * Explicitly decide whether a baseline may be compared with an observed pull.
 * Every field in the comparison partition is an isolation boundary: a baseline
 * from a different update, data partition, encounter/dummy, difficulty, role,
 * class, or build bracket must never be used for a peer comparison.
 */
export function assessBaselineEligibility(
  observed: InsightPartition,
  baseline: BaselineContract | undefined,
): BaselineEligibility {
  const validation = validateBaselineContract(baseline);
  if (!baseline || validation.status === 'blocked') return validation;

  const observedReasons = validateComparisonPartition(observed).map((reason) =>
    reason
      .replace(/^Baselines/, 'Observed comparison contexts')
      .replace(/^Peer baselines/, 'Observed comparison contexts'),
  );
  if (observedReasons.length > 0) return { status: 'blocked', reasons: observedReasons };

  const partitionReasons: string[] = [];
  if (observed.eso.update !== baseline.partition.eso.update) {
    partitionReasons.push('ESO update differs from the baseline.');
  }
  if (observed.eso.id !== baseline.partition.eso.id) {
    partitionReasons.push('ESO data partition differs from the baseline.');
  }
  if (partitionReasons.length > 0) return { status: 'blocked', reasons: partitionReasons };

  const comparisonReasons: string[] = [];
  if (observed.encounter.id !== baseline.partition.encounter.id) {
    comparisonReasons.push('Encounter or training-dummy identity differs from the baseline.');
  }
  if (observed.encounter.type !== baseline.partition.encounter.type) {
    comparisonReasons.push('Encounter type differs from the baseline.');
  }
  if (observed.difficulty !== baseline.partition.difficulty) {
    comparisonReasons.push('Difficulty differs from the baseline.');
  }
  if (observed.build.role !== baseline.partition.build.role) {
    comparisonReasons.push('Role differs from the baseline build bracket.');
  }
  if (observed.build.esoClass !== baseline.partition.build.esoClass) {
    comparisonReasons.push('Class differs from the baseline build bracket.');
  }
  if (observed.build.id !== baseline.partition.build.id) {
    comparisonReasons.push('Build bracket differs from the baseline.');
  }
  if (comparisonReasons.length > 0) return { status: 'blocked', reasons: comparisonReasons };

  return validation;
}

export interface RecommendationContract {
  readonly version: typeof INSIGHTS_CONTRACT_VERSION;
  readonly id: string;
  readonly evidenceKind: InsightEvidenceKind;
  readonly partition: InsightPartition;
  /** Required to display a peer benchmark and intentionally optional otherwise. */
  readonly baseline?: BaselineContract;
  readonly confidence: Confidence;
  readonly provisional: boolean;
}

/** Resolves the state a UI must show rather than silently treating missing data as zero. */
export function assessRecommendationTrust(
  recommendation: RecommendationContract,
): BaselineEligibility {
  if (
    !isRecord(recommendation) ||
    recommendation.version !== INSIGHTS_CONTRACT_VERSION ||
    !isNonEmpty(recommendation.id) ||
    !isInsightEvidenceKind(recommendation.evidenceKind)
  ) {
    return { status: 'blocked', reasons: ['Recommendations require a known evidence kind.'] };
  }
  const partitionReasons = validateComparisonPartition(recommendation.partition).map((reason) =>
    reason.replace(/^Baselines/, 'Recommendations').replace(/^Peer baselines/, 'Recommendations'),
  );
  if (partitionReasons.length > 0) return { status: 'blocked', reasons: partitionReasons };
  if (!isKnownConfidence(recommendation.confidence)) {
    return { status: 'blocked', reasons: ['Recommendations require a valid confidence level.'] };
  }
  if (typeof recommendation.provisional !== 'boolean') {
    return {
      status: 'blocked',
      reasons: ['Recommendations require an explicit provisional state.'],
    };
  }

  const recommendationWarnings: string[] = [];
  if (recommendation.provisional)
    recommendationWarnings.push('This recommendation is provisional.');
  if (recommendation.confidence === 'unknown') {
    recommendationWarnings.push('This recommendation has unknown confidence.');
  }
  if (recommendation.evidenceKind !== 'peer-benchmark') {
    return recommendationWarnings.length > 0
      ? { status: 'warning', reasons: recommendationWarnings }
      : { status: 'eligible', reasons: [] };
  }
  const baselineEligibility = assessBaselineEligibility(
    recommendation.partition,
    recommendation.baseline,
  );
  if (baselineEligibility.status === 'blocked') return baselineEligibility;
  return {
    status: recommendationWarnings.length > 0 ? 'warning' : baselineEligibility.status,
    reasons: [...baselineEligibility.reasons, ...recommendationWarnings],
  };
}

export interface RuleSource {
  readonly name: string;
  readonly url?: string;
  readonly version?: string;
}

/**
 * Definitions are intentionally facts about how to evaluate a mechanic, not a
 * library of asserted mechanics. A rule is either traceable to an authoritative
 * source or flagged configurable for an owner to review before use.
 */
export interface EncounterRuleDefinition {
  readonly id: string;
  readonly encounterId: string;
  readonly encounterVersion: string;
  readonly findingKind: ExecutionFindingKind;
  readonly title: string;
  readonly expectedBehavior: string;
  readonly sourceStatus: 'authoritative' | 'configurable';
  readonly source?: RuleSource;
}

export interface ExecutionEvidence {
  readonly timestamp: number;
  readonly phase?: string;
  readonly actorId?: number;
  readonly actorName?: string;
  readonly eventId?: string;
  readonly detail?: string;
}

export interface EstimatedImpact {
  readonly unit: 'damage' | 'time' | 'score' | 'other';
  readonly value?: number;
  readonly lowerBound?: number;
  readonly upperBound?: number;
  /** Use when impact cannot be derived without unsupported assumptions. */
  readonly unknownReason?: string;
}

export interface ScoreContribution {
  /** The displayed calculation term, for example "-2.0 = 1.0 weight × 2 misses". */
  readonly explanation: string;
  readonly weight?: number;
  readonly observedValue?: number;
  readonly points?: number;
  readonly confidence: Confidence;
  readonly unknownReason?: string;
}

export interface ExecutionFinding {
  readonly version: typeof INSIGHTS_CONTRACT_VERSION;
  readonly id: string;
  readonly kind: ExecutionFindingKind;
  readonly encounterId: string;
  readonly encounterVersion: string;
  readonly ruleId?: string;
  readonly actor: Readonly<{ id?: number; name?: string; role?: string }>;
  readonly evidence: readonly ExecutionEvidence[];
  readonly observedBehavior: string;
  readonly expectedBehavior?: string;
  readonly estimatedImpact: EstimatedImpact;
  readonly confidence: Confidence;
  readonly unknownReason?: string;
  readonly scoreContribution: ScoreContribution;
}

export interface ExecutionFindingValidation {
  readonly valid: boolean;
  readonly reasons: readonly string[];
}

/**
 * Prevent cross-encounter or cross-version rule reuse and require evidence for
 * a claimed finding. Configurable rules are valid but deliberately surfaced as
 * such to the consumer through their sourceStatus.
 */
export function validateExecutionFinding(
  finding: ExecutionFinding,
  rule: EncounterRuleDefinition | undefined,
): ExecutionFindingValidation {
  const reasons: string[] = [];
  if (!isRecord(finding)) {
    return { valid: false, reasons: ['Execution findings must be an object.'] };
  }
  const evidence = Array.isArray(finding.evidence) ? finding.evidence : undefined;
  if (!evidence || evidence.length === 0)
    reasons.push('Execution findings require timestamp evidence.');
  if (
    evidence &&
    evidence.some(
      (item) =>
        !isRecord(item) ||
        typeof item.timestamp !== 'number' ||
        !Number.isFinite(item.timestamp) ||
        item.timestamp < 0,
    )
  ) {
    reasons.push('Execution evidence timestamps must be finite and non-negative.');
  }
  if (!isKnownConfidence(finding.confidence)) {
    reasons.push('Execution findings require a valid confidence level.');
  } else if (finding.confidence === 'unknown' && !isNonEmpty(finding.unknownReason)) {
    reasons.push('Unknown-confidence findings require an unknown reason.');
  }
  const estimatedImpact = isRecord(finding.estimatedImpact) ? finding.estimatedImpact : undefined;
  if (!estimatedImpact || !isKnownEstimatedImpactUnit(estimatedImpact.unit)) {
    reasons.push('Estimated impact requires a valid unit.');
  } else if (estimatedImpact.unknownReason && estimatedImpact.value !== undefined) {
    reasons.push('Estimated impact cannot be both known and unknown.');
  }
  const scoreContribution = isRecord(finding.scoreContribution)
    ? finding.scoreContribution
    : undefined;
  if (!scoreContribution || !isKnownConfidence(scoreContribution.confidence)) {
    reasons.push('Score contributions require a valid confidence level.');
  }
  if (finding.ruleId && !rule) reasons.push('Referenced encounter rule was not supplied.');
  if (rule && !isRecord(rule)) {
    reasons.push('Encounter rules must be an object.');
  } else if (rule) {
    if (rule.id !== finding.ruleId) reasons.push('Finding references a different encounter rule.');
    if (rule.encounterId !== finding.encounterId)
      reasons.push('Rule belongs to a different encounter.');
    if (rule.encounterVersion !== finding.encounterVersion) {
      reasons.push('Rule belongs to a different encounter version.');
    }
    if (rule.findingKind !== finding.kind) reasons.push('Rule does not define this finding kind.');
    if (rule.sourceStatus === 'authoritative' && !rule.source) {
      reasons.push('Authoritative rules require source metadata.');
    }
  }
  return { valid: reasons.length === 0, reasons };
}
