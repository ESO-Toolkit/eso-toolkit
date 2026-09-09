/**
 * Pure, context-scoped data for the Insights pull storyboard.  This module
 * deliberately does not decide which metrics are good for a particular
 * encounter; callers must provide that direction with the metric definition.
 */

export interface ProgressionContext {
  readonly esoUpdate: string;
  readonly partition: string;
  readonly encounterId: string;
  readonly encounterVersion: string;
  readonly difficulty: string;
  /** Character role is part of the comparison cohort. */
  readonly role: string;
  /** Class is part of the comparison cohort. */
  readonly className: string;
  /** Build bracket prevents cross-build comparisons. */
  readonly buildBracket: string;
}

export interface EvidenceReference {
  /** Timestamp relative to the report, retained for evidence drilldowns. */
  readonly timestamp: number;
  readonly phase?: string;
  readonly actorId?: number | string;
  readonly eventId?: string;
  readonly note?: string;
}

export interface PullSnapshot {
  readonly id: string;
  readonly startedAt: number;
  readonly context: ProgressionContext;
  /** A missing or non-finite value is unknown, never a zero. */
  readonly metrics: Readonly<Record<string, number | null | undefined>>;
  readonly evidence: readonly EvidenceReference[];
}

export type ProgressionDirection = 'higher-is-better' | 'lower-is-better';

export interface ProgressionMetricDefinition {
  readonly id: string;
  readonly direction: ProgressionDirection;
  /** Absolute deltas within this tolerance are stable. Defaults to zero. */
  readonly stabilityTolerance?: number;
}

export type ProgressionClassification = 'improved' | 'regressed' | 'stable' | 'unknown';

export interface ProgressionPoint {
  readonly pullId: string;
  readonly startedAt: number;
  readonly value: number | null;
  readonly evidence: readonly EvidenceReference[];
}

export interface ProgressionTransition {
  readonly fromPullId: string;
  readonly toPullId: string;
  readonly delta: number | null;
  readonly classification: ProgressionClassification;
  readonly fromEvidence: readonly EvidenceReference[];
  readonly toEvidence: readonly EvidenceReference[];
}

export interface ProgressionMetric {
  readonly id: string;
  readonly direction: ProgressionDirection;
  readonly points: readonly ProgressionPoint[];
  readonly transitions: readonly ProgressionTransition[];
  readonly baselineValue: number | null;
  readonly latestValue: number | null;
  readonly netDelta: number | null;
  readonly classification: ProgressionClassification;
}

export interface PullProgressionInput {
  /** The one update/partition/encounter/version/difficulty being compared. */
  readonly context: ProgressionContext;
  readonly pulls: readonly PullSnapshot[];
  readonly metrics: readonly ProgressionMetricDefinition[];
}

export interface PullProgressionReady {
  readonly status: 'ready';
  readonly context: ProgressionContext;
  readonly orderedPullIds: readonly string[];
  readonly metrics: readonly ProgressionMetric[];
}

export interface PullProgressionUnavailable {
  readonly status: 'unavailable';
  readonly reason:
    | 'invalid-context'
    | 'invalid-pull-timestamp'
    | 'invalid-evidence-timestamp'
    | 'invalid-metric-definition'
    | 'invalid-input'
    | 'mixed-context'
    | 'no-pulls'
    | 'no-metrics';
  readonly context: ProgressionContext;
  readonly conflictingPullIds: readonly string[];
  /** Present when a metric definition cannot be interpreted safely. */
  readonly invalidMetricIds?: readonly string[];
}

export type PullProgression = PullProgressionReady | PullProgressionUnavailable;

interface OrderedPull {
  readonly pull: PullSnapshot;
  readonly originalIndex: number;
}

type UnknownRecord = Readonly<Record<string, unknown>>;

const contextFields = [
  'esoUpdate',
  'partition',
  'encounterId',
  'encounterVersion',
  'difficulty',
  'role',
  'className',
  'buildBracket',
] as const;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRequiredText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const copyContext = (value: unknown): ProgressionContext => {
  const context = isRecord(value) ? value : {};
  const copied = Object.fromEntries(
    contextFields.map((field) => [field, typeof context[field] === 'string' ? context[field] : '']),
  ) as Record<(typeof contextFields)[number], string>;

  return copied;
};

const isValidContext = (value: unknown): value is ProgressionContext =>
  isRecord(value) && contextFields.every((field) => isRequiredText(value[field]));

const contextsMatch = (left: ProgressionContext, right: ProgressionContext): boolean =>
  left.esoUpdate === right.esoUpdate &&
  left.partition === right.partition &&
  left.encounterId === right.encounterId &&
  left.encounterVersion === right.encounterVersion &&
  left.difficulty === right.difficulty &&
  left.role === right.role &&
  left.className === right.className &&
  left.buildBracket === right.buildBracket;

const canonicalizeZero = (value: number): number => (Object.is(value, -0) ? 0 : value);

const copyEvidence = (evidence: readonly EvidenceReference[]): readonly EvidenceReference[] =>
  evidence.map((reference) => ({ ...reference, timestamp: canonicalizeZero(reference.timestamp) }));

const knownValue = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? canonicalizeZero(value) : null;

const finiteDelta = (current: number | null, previous: number | null): number | null => {
  if (current === null || previous === null) {
    return null;
  }

  const delta = current - previous;
  return Number.isFinite(delta) ? canonicalizeZero(delta) : null;
};

const isProgressionDirection = (value: unknown): value is ProgressionDirection =>
  value === 'higher-is-better' || value === 'lower-is-better';

const classifyDelta = (
  delta: number | null,
  direction: ProgressionDirection,
  tolerance: number,
): ProgressionClassification => {
  if (delta === null) {
    return 'unknown';
  }

  if (Math.abs(delta) <= tolerance) {
    return 'stable';
  }

  const directionalDelta = direction === 'higher-is-better' ? delta : -delta;
  return directionalDelta > 0 ? 'improved' : 'regressed';
};

const isValidTolerance = (value: unknown): boolean =>
  value === undefined || (typeof value === 'number' && Number.isFinite(value) && value >= 0);

const normalizeTolerance = (value: number | undefined): number =>
  value === undefined ? 0 : canonicalizeZero(value);

const isMetricRecord = (
  value: unknown,
): value is Readonly<Record<string, number | null | undefined>> =>
  isRecord(value) &&
  Object.values(value).every(
    (metric) => metric === undefined || metric === null || typeof metric === 'number',
  );

const isEvidenceReferenceShape = (value: unknown): value is EvidenceReference => {
  if (!isRecord(value) || typeof value.timestamp !== 'number') {
    return false;
  }

  return (
    (value.phase === undefined || typeof value.phase === 'string') &&
    (value.actorId === undefined ||
      typeof value.actorId === 'string' ||
      (typeof value.actorId === 'number' && Number.isFinite(value.actorId))) &&
    (value.eventId === undefined || typeof value.eventId === 'string') &&
    (value.note === undefined || typeof value.note === 'string')
  );
};

const isPullShape = (value: unknown): value is PullSnapshot =>
  isRecord(value) &&
  isRequiredText(value.id) &&
  typeof value.startedAt === 'number' &&
  isValidContext(value.context) &&
  isMetricRecord(value.metrics) &&
  Array.isArray(value.evidence) &&
  value.evidence.every(isEvidenceReferenceShape);

const validPullIds = (pulls: readonly unknown[]): readonly string[] =>
  pulls.flatMap((pull) => (isRecord(pull) && isRequiredText(pull.id) ? [pull.id] : []));

const unavailable = (
  reason: PullProgressionUnavailable['reason'],
  context: unknown,
  conflictingPullIds: readonly string[],
  invalidMetricIds?: readonly string[],
): PullProgressionUnavailable => ({
  status: 'unavailable',
  reason,
  context: copyContext(context),
  conflictingPullIds: [...conflictingPullIds],
  ...(invalidMetricIds === undefined ? {} : { invalidMetricIds: [...invalidMetricIds] }),
});

const buildMetric = (
  definition: ProgressionMetricDefinition,
  pulls: readonly OrderedPull[],
): ProgressionMetric => {
  const tolerance = normalizeTolerance(definition.stabilityTolerance);
  const points = pulls.map(({ pull }) => ({
    pullId: pull.id,
    startedAt: canonicalizeZero(pull.startedAt),
    value: knownValue(pull.metrics[definition.id]),
    evidence: copyEvidence(pull.evidence),
  }));
  const transitions = points.slice(1).map((point, index) => {
    const previous = points[index];
    const delta = finiteDelta(point.value, previous.value);

    return {
      fromPullId: previous.pullId,
      toPullId: point.pullId,
      delta,
      classification: classifyDelta(delta, definition.direction, tolerance),
      fromEvidence: previous.evidence,
      toEvidence: point.evidence,
    };
  });
  const baselineValue = points[0]?.value ?? null;
  const latestValue = points.at(-1)?.value ?? null;
  // A lone observation is evidence, not a claim that the player is stable.
  const netDelta =
    points.length < 2 || baselineValue === null || latestValue === null
      ? null
      : finiteDelta(latestValue, baselineValue);

  return {
    id: definition.id,
    direction: definition.direction,
    points,
    transitions,
    baselineValue,
    latestValue,
    netDelta,
    classification: classifyDelta(netDelta, definition.direction, tolerance),
  };
};

/**
 * Produces a stable timestamp-ordered storyboard only when every pull belongs
 * to the declared comparison context. It validates untrusted runtime input and
 * returns an explicit unavailable state instead of throwing or mixing cohorts.
 */
export const buildPullProgression = (input: PullProgressionInput): PullProgression => {
  if (!isRecord(input)) {
    return unavailable('invalid-input', undefined, []);
  }

  const context = input.context;
  const rawPulls = input.pulls;
  const rawMetrics = input.metrics;
  if (!Array.isArray(rawPulls) || !Array.isArray(rawMetrics)) {
    return unavailable(
      'invalid-input',
      context,
      Array.isArray(rawPulls) ? validPullIds(rawPulls) : [],
    );
  }

  const pullIds = validPullIds(rawPulls);
  if (!isValidContext(context)) {
    return unavailable('invalid-context', context, pullIds);
  }

  if (!rawPulls.every(isPullShape)) {
    return unavailable('invalid-input', context, pullIds);
  }

  const pulls = rawPulls as readonly PullSnapshot[];
  // Pull histories can be large enough that repeatedly scanning the prefix for
  // a duplicate turns otherwise linear validation into quadratic work.
  const seenPullIds = new Set<string>();
  const duplicatePullIds = pulls.flatMap((pull) => {
    if (seenPullIds.has(pull.id)) {
      return [pull.id];
    }

    seenPullIds.add(pull.id);
    return [];
  });
  if (duplicatePullIds.length > 0) {
    return unavailable('invalid-input', context, duplicatePullIds);
  }

  const invalidTimestampPullIds = pulls
    .filter((pull) => !Number.isFinite(pull.startedAt) || pull.startedAt < 0)
    .map((pull) => pull.id);

  if (invalidTimestampPullIds.length > 0) {
    return unavailable('invalid-pull-timestamp', context, invalidTimestampPullIds);
  }

  const invalidEvidenceTimestampPullIds = pulls
    .filter((pull) =>
      pull.evidence.some(
        (evidence) => !Number.isFinite(evidence.timestamp) || evidence.timestamp < 0,
      ),
    )
    .map((pull) => pull.id);

  if (invalidEvidenceTimestampPullIds.length > 0) {
    return unavailable('invalid-evidence-timestamp', context, invalidEvidenceTimestampPullIds);
  }

  const metricIdCounts = new Map<string, number>();
  for (const metric of rawMetrics) {
    if (isRecord(metric) && isRequiredText(metric.id)) {
      metricIdCounts.set(metric.id, (metricIdCounts.get(metric.id) ?? 0) + 1);
    }
  }
  const invalidMetricIds = rawMetrics
    .filter(
      (metric) =>
        !isRecord(metric) ||
        !isRequiredText(metric.id) ||
        metricIdCounts.get(metric.id)! > 1 ||
        !isProgressionDirection(metric.direction) ||
        !isValidTolerance(metric.stabilityTolerance),
    )
    .map((metric) => (isRecord(metric) && typeof metric.id === 'string' ? metric.id : '<invalid>'));

  if (invalidMetricIds.length > 0) {
    return unavailable('invalid-metric-definition', context, [], invalidMetricIds);
  }

  const conflictingPullIds = pulls
    .filter((pull) => !contextsMatch(context, pull.context))
    .map((pull) => pull.id);

  if (conflictingPullIds.length > 0) {
    return unavailable('mixed-context', context, conflictingPullIds);
  }

  // A storyboard needs at least one observed pull and one explicitly selected
  // metric. Returning an empty ready state would make unavailable evidence look
  // like a completed analysis.
  if (pulls.length === 0) {
    return unavailable('no-pulls', context, []);
  }

  if (rawMetrics.length === 0) {
    return unavailable('no-metrics', context, []);
  }

  const orderedPulls = pulls
    .map((pull, originalIndex) => ({ pull, originalIndex }))
    .sort(
      (left, right) =>
        left.pull.startedAt - right.pull.startedAt || left.originalIndex - right.originalIndex,
    );

  return {
    status: 'ready',
    context: copyContext(context),
    orderedPullIds: orderedPulls.map(({ pull }) => pull.id),
    metrics: (rawMetrics as readonly ProgressionMetricDefinition[]).map((metric) =>
      buildMetric(metric, orderedPulls),
    ),
  };
};
