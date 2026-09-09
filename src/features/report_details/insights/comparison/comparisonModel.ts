/** A transport- and UI-independent contract for Analyzer/Insights comparisons. */
export type Confidence = 'high' | 'medium' | 'low' | 'unknown';

export type EncounterKind = 'encounter' | 'training-dummy';
export type AnalysisRole = 'damage' | 'healer' | 'tank' | 'unknown';

export interface AnalysisContext {
  /** ESO live-server partition. Different partitions must never be compared. */
  readonly partition: string;
  /** ESO update identity. Analyses from different updates must never be compared. */
  readonly esoUpdate: string;
  readonly encounterKind: EncounterKind;
  readonly encounterId: string;
  /** The exact encounter definition/content version used to produce the analysis. */
  readonly encounterVersion: string;
  readonly difficulty: string;
  readonly role: AnalysisRole;
  readonly classId: string;
  readonly buildBracket: string;
}

export interface BaselinePeriod {
  readonly startAt: string;
  readonly endAt: string;
}

export interface Provenance {
  readonly source: string;
  readonly collectedAt: string;
  /** The source window from which the comparison baseline was selected. */
  readonly baselinePeriod: BaselinePeriod;
  /** When the source backing this analysis was last refreshed. */
  readonly refreshedAt: string;
}

export interface IdentifiedProvenance {
  readonly pullId: string;
  readonly occurredAt: string;
  readonly provenance: Provenance;
}

/** A metric is intentionally not represented by a sentinel numeric value when unknown. */
export type MetricValue =
  | { readonly kind: 'observed'; readonly value: number }
  | { readonly kind: 'unknown'; readonly reason: string };

export interface PullAnalysis {
  readonly pullId: string;
  readonly occurredAt: string;
  readonly context: AnalysisContext;
  readonly metrics: Readonly<Record<string, MetricValue>>;
  readonly provenance: Provenance;
  readonly confidence: Confidence;
}

/**
 * Numeric summary plus accounting for unavailable input samples. Null statistics mean that no
 * finite observations were available; they never stand in for zero.
 */
export interface SampleDistribution {
  readonly sampleCount: number;
  readonly observedSampleCount: number;
  readonly unknownSampleCount: number;
  readonly invalidSampleCount: number;
  readonly minimum: number | null;
  readonly maximum: number | null;
  readonly mean: number | null;
  readonly median: number | null;
}

export type MetricComparison =
  | {
      readonly metric: string;
      readonly status: 'available';
      readonly baseline: number;
      readonly candidate: number;
      readonly delta: number;
      readonly baselineDistribution: SampleDistribution;
    }
  | {
      readonly metric: string;
      readonly status: 'unknown';
      readonly reason: string;
      readonly baselineDistribution: SampleDistribution;
    }
  | {
      readonly metric: string;
      readonly status: 'unavailable';
      readonly reason: 'insufficient-baseline-samples';
      readonly requiredObservedSamples: number;
      readonly observedBaselineSamples: number;
      readonly baselineDistribution: SampleDistribution;
    };

type ContextMismatchReason =
  | 'cross-partition'
  | 'cross-eso-update'
  | 'cross-encounter-kind'
  | 'cross-encounter-id'
  | 'cross-encounter-version'
  | 'cross-difficulty'
  | 'cross-role'
  | 'cross-class'
  | 'cross-build-bracket';

export type ComparisonResult =
  | {
      readonly status: 'available';
      readonly context: AnalysisContext;
      readonly confidence: Confidence;
      readonly provenance: {
        readonly baseline: IdentifiedProvenance;
        readonly candidate: IdentifiedProvenance;
      };
      readonly metrics: readonly MetricComparison[];
    }
  | {
      readonly status: 'unavailable';
      readonly reason: ContextMismatchReason | 'same-pull' | 'invalid-analysis';
      readonly message: string;
    };

export interface CohortComparisonOptions {
  /**
   * An explicit caller-owned sampling policy. This contract does not infer an encounter-specific
   * threshold: pass the cohort size to require complete coverage, or a lower number when partial
   * coverage is acceptable to the caller.
   */
  readonly minimumObservedBaselineSamples: number;
}

export type CohortComparisonResult =
  | {
      readonly status: 'available';
      readonly context: AnalysisContext;
      readonly candidate: PullAnalysis;
      readonly cohortSize: number;
      readonly minimumObservedBaselineSamples: number;
      readonly confidence: Confidence;
      readonly metrics: readonly MetricComparison[];
      readonly provenance: {
        readonly candidate: IdentifiedProvenance;
        readonly cohort: readonly IdentifiedProvenance[];
      };
    }
  | {
      readonly status: 'unavailable';
      readonly reason:
        | 'empty-cohort'
        | 'candidate-in-cohort'
        | 'duplicate-cohort-pull'
        | 'invalid-options'
        | 'invalid-analysis'
        | ContextMismatchReason;
      readonly message: string;
    };

const confidenceRank: Readonly<Record<Confidence, number>> = {
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

const freezeSnapshot = <Value extends object>(value: Value): Value => Object.freeze(value) as Value;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isValidObservedMetricValue = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && !Object.is(value, -0);

const isValidTimestamp = (value: unknown): value is string =>
  isNonEmptyString(value) && Number.isFinite(Date.parse(value));

const isConfidence = (value: unknown): value is Confidence =>
  typeof value === 'string' && Object.hasOwn(confidenceRank, value);

const validateContext = (context: unknown): string | null => {
  if (!isRecord(context)) return 'Analysis context is missing.';
  if (!isNonEmptyString(context.partition)) return 'Analysis partition is invalid.';
  if (!isNonEmptyString(context.esoUpdate)) return 'Analysis ESO update is invalid.';
  if (context.encounterKind !== 'encounter' && context.encounterKind !== 'training-dummy')
    return 'Analysis encounter kind is invalid.';
  if (!isNonEmptyString(context.encounterId)) return 'Analysis encounter identity is invalid.';
  if (!isNonEmptyString(context.encounterVersion)) return 'Analysis encounter version is invalid.';
  if (!isNonEmptyString(context.difficulty)) return 'Analysis difficulty is invalid.';
  if (
    context.role !== 'damage' &&
    context.role !== 'healer' &&
    context.role !== 'tank' &&
    context.role !== 'unknown'
  )
    return 'Analysis role is invalid.';
  if (!isNonEmptyString(context.classId)) return 'Analysis class is invalid.';
  if (!isNonEmptyString(context.buildBracket)) return 'Analysis build bracket is invalid.';
  return null;
};

const validateProvenance = (provenance: unknown): string | null => {
  if (!isRecord(provenance)) return 'Analysis provenance is missing.';
  if (!isNonEmptyString(provenance.source)) return 'Analysis provenance source is invalid.';
  if (!isValidTimestamp(provenance.collectedAt)) return 'Analysis collection time is invalid.';
  if (!isValidTimestamp(provenance.refreshedAt)) return 'Analysis refresh time is invalid.';
  if (!isRecord(provenance.baselinePeriod)) return 'Analysis baseline period is missing.';

  const { startAt, endAt } = provenance.baselinePeriod;
  if (!isValidTimestamp(startAt) || !isValidTimestamp(endAt))
    return 'Analysis baseline period is invalid.';
  if (Date.parse(endAt) <= Date.parse(startAt))
    return 'Analysis baseline period must have positive duration.';
  return null;
};

const validateMetric = (name: string, metric: unknown): string | null => {
  if (!isRecord(metric)) return `Analysis metric "${name}" is invalid.`;
  if (metric.kind === 'observed') {
    return typeof metric.value !== 'number'
      ? `Analysis metric "${name}" observed value is invalid.`
      : isValidObservedMetricValue(metric.value)
        ? null
        : `Analysis metric "${name}" observed value must be a finite nonnegative number.`;
  }
  if (metric.kind === 'unknown') {
    return isNonEmptyString(metric.reason)
      ? null
      : `Analysis metric "${name}" unknown reason is invalid.`;
  }
  return `Analysis metric "${name}" has an invalid kind.`;
};

const validateMetrics = (metrics: unknown): string | null => {
  if (!isRecord(metrics)) return 'Analysis metrics are missing.';
  if (Object.keys(metrics).length === 0) return 'Analysis metrics are empty.';
  for (const [name, metric] of Object.entries(metrics)) {
    if (!isNonEmptyString(name)) return 'Analysis metric identity is invalid.';
    const invalidMetricReason = validateMetric(name, metric);
    if (invalidMetricReason) return invalidMetricReason;
  }
  return null;
};

const validateAnalysis = (analysis: unknown): string | null => {
  if (!isRecord(analysis)) return 'Analysis is missing.';
  if (!isNonEmptyString(analysis.pullId)) return 'Analysis pull identity is invalid.';
  if (!isValidTimestamp(analysis.occurredAt)) return 'Analysis occurrence time is invalid.';
  if (!isConfidence(analysis.confidence)) return 'Analysis confidence is invalid.';
  return (
    validateContext(analysis.context) ??
    validateProvenance(analysis.provenance) ??
    validateMetrics(analysis.metrics)
  );
};

const getLowestConfidence = (values: readonly Confidence[]): Confidence => {
  const [first, ...remaining] = values;
  if (!first) return 'unknown';

  return remaining.reduce<Confidence>(
    (lowest, value) => (confidenceRank[value] < confidenceRank[lowest] ? value : lowest),
    first,
  );
};

const getContextMismatch = (
  expected: AnalysisContext,
  actual: AnalysisContext,
): ContextMismatchReason | null => {
  if (expected.partition !== actual.partition) return 'cross-partition';
  if (expected.esoUpdate !== actual.esoUpdate) return 'cross-eso-update';
  if (expected.encounterKind !== actual.encounterKind) return 'cross-encounter-kind';
  if (expected.encounterId !== actual.encounterId) return 'cross-encounter-id';
  if (expected.encounterVersion !== actual.encounterVersion) return 'cross-encounter-version';
  if (expected.difficulty !== actual.difficulty) return 'cross-difficulty';
  if (expected.role !== actual.role) return 'cross-role';
  if (expected.classId !== actual.classId) return 'cross-class';
  if (expected.buildBracket !== actual.buildBracket) return 'cross-build-bracket';
  return null;
};

const mismatchMessage = (reason: ContextMismatchReason): string => {
  switch (reason) {
    case 'cross-partition':
      return 'Analyses from different ESO partitions cannot be compared.';
    case 'cross-eso-update':
      return 'Analyses from different ESO updates cannot be compared.';
    case 'cross-encounter-kind':
      return 'Encounter and training-dummy analyses cannot be compared.';
    case 'cross-encounter-id':
      return 'Analyses from different encounters cannot be compared.';
    case 'cross-encounter-version':
      return 'Analyses from different encounter versions cannot be compared.';
    case 'cross-difficulty':
      return 'Analyses from different difficulties cannot be compared.';
    case 'cross-role':
      return 'Analyses from different roles cannot be compared.';
    case 'cross-class':
      return 'Analyses from different classes cannot be compared.';
    case 'cross-build-bracket':
      return 'Analyses from different build brackets cannot be compared.';
  }
};

const identifyProvenance = (analysis: PullAnalysis): IdentifiedProvenance =>
  freezeSnapshot({
    pullId: analysis.pullId,
    occurredAt: analysis.occurredAt,
    provenance: freezeSnapshot({
      source: analysis.provenance.source,
      collectedAt: analysis.provenance.collectedAt,
      baselinePeriod: freezeSnapshot({
        startAt: analysis.provenance.baselinePeriod.startAt,
        endAt: analysis.provenance.baselinePeriod.endAt,
      }),
      refreshedAt: analysis.provenance.refreshedAt,
    }),
  });

const snapshotContext = (context: AnalysisContext): AnalysisContext =>
  freezeSnapshot({
    partition: context.partition,
    esoUpdate: context.esoUpdate,
    encounterKind: context.encounterKind,
    encounterId: context.encounterId,
    encounterVersion: context.encounterVersion,
    difficulty: context.difficulty,
    role: context.role,
    classId: context.classId,
    buildBracket: context.buildBracket,
  });

const snapshotPull = (analysis: PullAnalysis): PullAnalysis =>
  freezeSnapshot({
    pullId: analysis.pullId,
    occurredAt: analysis.occurredAt,
    context: snapshotContext(analysis.context),
    metrics: freezeSnapshot(
      Object.fromEntries(
        Object.entries(analysis.metrics).map(([name, metric]) => [
          name,
          metric.kind === 'observed'
            ? freezeSnapshot({ kind: 'observed' as const, value: metric.value })
            : freezeSnapshot({ kind: 'unknown' as const, reason: metric.reason }),
        ]),
      ),
    ),
    provenance: identifyProvenance(analysis).provenance,
    confidence: analysis.confidence,
  });

const getMetricKeys = (analyses: readonly PullAnalysis[]): string[] => {
  return [...new Set(analyses.flatMap((analysis) => Object.keys(analysis.metrics)))].sort();
};

const isObservedMetric = (
  metric: MetricValue | undefined,
): metric is Extract<MetricValue, { kind: 'observed' }> =>
  metric?.kind === 'observed' && isValidObservedMetricValue(metric.value);

const normalizeZero = (value: number): number => (Object.is(value, -0) ? 0 : value);

const getFiniteMean = (values: readonly number[]): number | null => {
  if (values.length === 0) return null;
  const maximumMagnitude = values.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0);
  if (maximumMagnitude === 0) return 0;

  const scaledMean =
    values.reduce((sum, value) => sum + value / maximumMagnitude, 0) / values.length;
  const boundedScaledMean = Math.max(-1, Math.min(1, scaledMean));
  const mean = boundedScaledMean * maximumMagnitude;
  return Number.isFinite(mean) ? normalizeZero(mean) : null;
};

const getFiniteMedian = (sortedValues: readonly number[]): number | null => {
  if (sortedValues.length === 0) return null;
  const middle = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 !== 0) return sortedValues[middle];

  const median = sortedValues[middle - 1] / 2 + sortedValues[middle] / 2;
  return Number.isFinite(median) ? normalizeZero(median) : null;
};

const buildDistribution = (metrics: readonly (MetricValue | undefined)[]): SampleDistribution => {
  const observedValues = metrics.filter(isObservedMetric).map((metric) => metric.value);
  const sortedValues = [...observedValues].sort((left, right) => left - right);
  const observedSampleCount = sortedValues.length;

  return freezeSnapshot({
    sampleCount: metrics.length,
    observedSampleCount,
    unknownSampleCount: metrics.filter((metric) => !metric || metric.kind === 'unknown').length,
    invalidSampleCount: metrics.filter(
      (metric) => metric?.kind === 'observed' && !isObservedMetric(metric),
    ).length,
    minimum: sortedValues[0] ?? null,
    maximum: sortedValues.at(-1) ?? null,
    mean: getFiniteMean(sortedValues),
    median: getFiniteMedian(sortedValues),
  });
};

const invalidMetricReason = (metric: MetricValue | undefined): string | null => {
  if (!metric) return 'Metric was not measured in this analysis.';
  if (metric.kind === 'unknown')
    return isNonEmptyString(metric.reason)
      ? metric.reason
      : 'Metric availability reason is invalid.';
  if (!Number.isFinite(metric.value)) return 'Metric was not a finite number.';
  if (metric.value < 0 || Object.is(metric.value, -0))
    return 'Metric must be a nonnegative number.';
  return null;
};

const comparePairMetric = (
  metric: string,
  baseline: MetricValue | undefined,
  candidate: MetricValue | undefined,
): MetricComparison => {
  const baselineDistribution = buildDistribution([baseline]);
  const baselineReason = invalidMetricReason(baseline);
  if (baselineReason)
    return { metric, status: 'unknown', reason: baselineReason, baselineDistribution };

  const candidateReason = invalidMetricReason(candidate);
  if (candidateReason)
    return { metric, status: 'unknown', reason: candidateReason, baselineDistribution };

  if (!isObservedMetric(baseline) || !isObservedMetric(candidate)) {
    return {
      metric,
      status: 'unknown',
      reason: 'Metric was not a finite number.',
      baselineDistribution,
    };
  }

  const delta = candidate.value - baseline.value;
  if (!Number.isFinite(delta)) {
    return {
      metric,
      status: 'unknown',
      reason: 'Metric delta was not a finite number.',
      baselineDistribution,
    };
  }
  return {
    metric,
    status: 'available',
    baseline: baseline.value,
    candidate: candidate.value,
    delta,
    baselineDistribution,
  };
};

const validateMinimumSampleCount = (minimumObservedBaselineSamples: number): string | null => {
  if (!Number.isSafeInteger(minimumObservedBaselineSamples) || minimumObservedBaselineSamples < 1) {
    return 'minimumObservedBaselineSamples must be a positive safe integer.';
  }
  return null;
};

const getMinimumObservedBaselineSamples = (
  options: unknown,
): { readonly value: number } | { readonly error: string } => {
  if (!isRecord(options)) {
    return { error: 'Cohort comparison options are invalid.' };
  }
  const { minimumObservedBaselineSamples } = options;
  if (typeof minimumObservedBaselineSamples !== 'number') {
    return { error: 'minimumObservedBaselineSamples must be a positive safe integer.' };
  }
  const validationError = validateMinimumSampleCount(minimumObservedBaselineSamples);
  return validationError ? { error: validationError } : { value: minimumObservedBaselineSamples };
};

/** Compares two pulls only when their ESO partition, update, and encounter definition match exactly. */
export const comparePulls = (baseline: PullAnalysis, candidate: PullAnalysis): ComparisonResult => {
  const invalidBaselineReason = validateAnalysis(baseline);
  const invalidCandidateReason = validateAnalysis(candidate);
  if (invalidBaselineReason || invalidCandidateReason) {
    return freezeSnapshot({
      status: 'unavailable' as const,
      reason: 'invalid-analysis' as const,
      message: invalidBaselineReason ?? invalidCandidateReason ?? 'Analysis is invalid.',
    });
  }
  if (baseline.pullId === candidate.pullId) {
    return freezeSnapshot({
      status: 'unavailable',
      reason: 'same-pull',
      message: 'A pull cannot be compared with itself.',
    });
  }
  const mismatch = getContextMismatch(baseline.context, candidate.context);
  if (mismatch) {
    return freezeSnapshot({
      status: 'unavailable' as const,
      reason: mismatch,
      message: mismatchMessage(mismatch),
    });
  }

  return freezeSnapshot({
    status: 'available',
    context: snapshotContext(baseline.context),
    confidence: getLowestConfidence([baseline.confidence, candidate.confidence]),
    provenance: freezeSnapshot({
      baseline: identifyProvenance(baseline),
      candidate: identifyProvenance(candidate),
    }),
    metrics: freezeSnapshot(
      getMetricKeys([baseline, candidate]).map((metric) =>
        freezeSnapshot(
          comparePairMetric(metric, baseline.metrics[metric], candidate.metrics[metric]),
        ),
      ),
    ),
  });
};

/**
 * Compares a pull with a context-compatible cohort. The caller supplies the minimum sample count,
 * keeping encounter-specific eligibility rules outside this generic comparison contract.
 */
export const compareWithCohort = (
  candidate: PullAnalysis,
  cohort: readonly PullAnalysis[],
  options: CohortComparisonOptions,
): CohortComparisonResult => {
  const minimumObservedBaselineSamplesResult = getMinimumObservedBaselineSamples(options);
  if ('error' in minimumObservedBaselineSamplesResult) {
    return freezeSnapshot({
      status: 'unavailable' as const,
      reason: 'invalid-options' as const,
      message: minimumObservedBaselineSamplesResult.error,
    });
  }
  const minimumObservedBaselineSamples = minimumObservedBaselineSamplesResult.value;
  const invalidCandidateReason = validateAnalysis(candidate);
  if (invalidCandidateReason) {
    return freezeSnapshot({
      status: 'unavailable' as const,
      reason: 'invalid-analysis' as const,
      message: invalidCandidateReason,
    });
  }
  if (!Array.isArray(cohort)) {
    return freezeSnapshot({
      status: 'unavailable' as const,
      reason: 'invalid-analysis' as const,
      message: 'Analysis cohort is invalid.',
    });
  }
  for (const analysis of cohort) {
    const invalidCohortReason = validateAnalysis(analysis);
    if (invalidCohortReason) {
      return freezeSnapshot({
        status: 'unavailable' as const,
        reason: 'invalid-analysis' as const,
        message: invalidCohortReason,
      });
    }
  }
  if (cohort.length === 0) {
    return freezeSnapshot({
      status: 'unavailable',
      reason: 'empty-cohort',
      message: 'No comparable cohort data is available.',
    });
  }
  if (cohort.some((analysis) => analysis.pullId === candidate.pullId)) {
    return freezeSnapshot({
      status: 'unavailable',
      reason: 'candidate-in-cohort',
      message: 'The candidate pull cannot also be a cohort baseline sample.',
    });
  }
  const cohortPullIds = new Set<string>();
  for (const analysis of cohort) {
    if (cohortPullIds.has(analysis.pullId)) {
      return freezeSnapshot({
        status: 'unavailable',
        reason: 'duplicate-cohort-pull',
        message: `The cohort contains duplicate pull identity "${analysis.pullId}".`,
      });
    }
    cohortPullIds.add(analysis.pullId);
  }
  for (const analysis of cohort) {
    const mismatch = getContextMismatch(candidate.context, analysis.context);
    if (mismatch) {
      return freezeSnapshot({
        status: 'unavailable' as const,
        reason: mismatch,
        message: mismatchMessage(mismatch),
      });
    }
  }

  const metrics: MetricComparison[] = getMetricKeys([candidate, ...cohort]).map((metric) => {
    const baselineDistribution = buildDistribution(
      cohort.map((analysis) => analysis.metrics[metric]),
    );
    const candidateMetric = candidate.metrics[metric];
    const candidateReason = invalidMetricReason(candidateMetric);
    if (candidateReason) {
      return { metric, status: 'unknown', reason: candidateReason, baselineDistribution };
    }
    if (baselineDistribution.observedSampleCount < minimumObservedBaselineSamples) {
      return {
        metric,
        status: 'unavailable',
        reason: 'insufficient-baseline-samples',
        requiredObservedSamples: minimumObservedBaselineSamples,
        observedBaselineSamples: baselineDistribution.observedSampleCount,
        baselineDistribution,
      };
    }

    if (!isObservedMetric(candidateMetric) || baselineDistribution.mean === null) {
      return {
        metric,
        status: 'unknown',
        reason: 'Metric was not a finite number.',
        baselineDistribution,
      };
    }

    const delta = candidateMetric.value - baselineDistribution.mean;
    if (!Number.isFinite(delta)) {
      return {
        metric,
        status: 'unknown',
        reason: 'Metric delta was not a finite number.',
        baselineDistribution,
      };
    }
    return {
      metric,
      status: 'available',
      baseline: baselineDistribution.mean,
      candidate: candidateMetric.value,
      delta,
      baselineDistribution,
    };
  });

  const candidateSnapshot = snapshotPull(candidate);
  return freezeSnapshot({
    status: 'available',
    context: candidateSnapshot.context,
    candidate: candidateSnapshot,
    cohortSize: cohort.length,
    minimumObservedBaselineSamples,
    confidence: getLowestConfidence([
      candidate.confidence,
      ...cohort.map((analysis) => analysis.confidence),
    ]),
    metrics: freezeSnapshot(metrics.map(freezeSnapshot)),
    provenance: freezeSnapshot({
      candidate: identifyProvenance(candidate),
      cohort: freezeSnapshot(cohort.map(identifyProvenance)),
    }),
  });
};
