/**
 * A deliberately small, evidence-only decision model. It does not infer encounter
 * rules, target benchmarks, or expected values: those must be supplied by a caller.
 */

export interface DecisionScope {
  /** Stable ESO game-data partition id (region/platform/ruleset), never a display name. */
  readonly partitionId: string;
  /** ESO update which produced the candidate data, for example "U50". */
  readonly update: string;
  /** Stable encounter or training-dummy identity, never an actor name. */
  readonly encounterId: string;
  /** Version of the authoritative/configured encounter definition used to produce the candidate. */
  readonly encounterVersion: string;
  /** Distinguishes real encounters from training dummies. */
  readonly encounterKind: 'encounter' | 'training-dummy';
  /** Encounter difficulty partition, including an explicit unknown value when applicable. */
  readonly difficulty: string;
  /** Player role bracket used for the candidate. */
  readonly role: string;
  /** ESO class bracket used for the candidate. */
  readonly esoClass: string;
  /** Documented build grouping, for example "two-bar-dps". */
  readonly buildBracket: string;
}

export interface DecisionEvidence {
  readonly timestampMs: number;
  readonly phase: string;
  readonly provenance: string;
  readonly context: string;
}

export type DecisionConfidence =
  Readonly<{ state: 'known'; score: number }> | Readonly<{ state: 'unknown'; reason: string }>;

export interface ResponsibleParty {
  readonly actorId?: string;
  readonly actorName?: string;
  readonly role?: string;
}

/**
 * Untrusted candidate data. Every property is optional so callers can safely pass
 * partially available analysis; incomplete candidates are rejected rather than
 * promoted to a decision item.
 */
export interface DecisionSummaryCandidateInput {
  readonly id?: unknown;
  readonly scope?: unknown;
  readonly availability?: unknown;
  readonly whatHappened?: unknown;
  readonly whyItMatters?: unknown;
  readonly evidence?: unknown;
  readonly recommendedNextAction?: unknown;
  readonly confidence?: unknown;
  readonly observedBehavior?: unknown;
  readonly expectedBehavior?: unknown;
  readonly estimatedImpact?: unknown;
  readonly responsible?: unknown;
  readonly priority?: unknown;
}

export interface DecisionSummaryItem {
  readonly id: string;
  readonly scope: Readonly<DecisionScope>;
  readonly whatHappened: string;
  readonly whyItMatters: string;
  readonly evidence: Readonly<DecisionEvidence>;
  readonly recommendedNextAction: string;
  readonly confidence: DecisionConfidence;
  readonly observedBehavior: string;
  readonly expectedBehavior: string;
  readonly estimatedImpact: number;
  readonly responsible: Readonly<ResponsibleParty> | null;
  readonly priority: Readonly<{ rank: number; stableOrder: number }>;
}

export type DecisionSummaryRejectionReason =
  | 'incomplete-evidence'
  | 'invalid-evidence'
  | 'unavailable-evidence'
  | 'context-mismatch'
  | 'duplicate-candidate';

export type DecisionSummaryRejectionOutcome = 'blocked' | 'warning';

export interface DecisionSummaryRejection {
  readonly candidateId: string | null;
  readonly reason: DecisionSummaryRejectionReason;
  /** A visible disposition for callers; rejected candidates are never silently dropped. */
  readonly outcome: DecisionSummaryRejectionOutcome;
}

export interface DecisionSummaryRequest {
  readonly scope: DecisionScope;
  readonly candidates: readonly DecisionSummaryCandidateInput[];
}

export interface DecisionSummary {
  readonly scope: Readonly<DecisionScope>;
  readonly items: readonly DecisionSummaryItem[];
  readonly rejected: readonly DecisionSummaryRejection[];
}

type CompleteDecisionCandidate = DecisionSummaryCandidateInput & {
  readonly id: string;
  readonly scope: DecisionScope;
  readonly availability: 'available';
  readonly whatHappened: string;
  readonly whyItMatters: string;
  readonly evidence: DecisionEvidence;
  readonly recommendedNextAction: string;
  readonly confidence: DecisionConfidence;
  readonly observedBehavior: string;
  readonly expectedBehavior: string;
  readonly estimatedImpact: number;
  readonly responsible?: ResponsibleParty;
  readonly priority: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isNonNegativeFiniteNumber = (value: unknown): value is number =>
  isFiniteNumber(value) && value >= 0 && !Object.is(value, -0);

const isScope = (value: unknown): value is DecisionScope =>
  isRecord(value) &&
  isNonEmptyString(value.partitionId) &&
  isNonEmptyString(value.update) &&
  isNonEmptyString(value.encounterId) &&
  isNonEmptyString(value.encounterVersion) &&
  (value.encounterKind === 'encounter' || value.encounterKind === 'training-dummy') &&
  isNonEmptyString(value.difficulty) &&
  isNonEmptyString(value.role) &&
  isNonEmptyString(value.esoClass) &&
  isNonEmptyString(value.buildBracket);

const scopesMatch = (left: DecisionScope, right: DecisionScope): boolean =>
  left.partitionId === right.partitionId &&
  left.update === right.update &&
  left.encounterId === right.encounterId &&
  left.encounterVersion === right.encounterVersion &&
  left.encounterKind === right.encounterKind &&
  left.difficulty === right.difficulty &&
  left.role === right.role &&
  left.esoClass === right.esoClass &&
  left.buildBracket === right.buildBracket;

const isEvidence = (value: unknown): value is DecisionEvidence =>
  isRecord(value) &&
  isNonNegativeFiniteNumber(value.timestampMs) &&
  isNonEmptyString(value.phase) &&
  isNonEmptyString(value.provenance) &&
  isNonEmptyString(value.context);

const isConfidence = (value: unknown): value is DecisionConfidence => {
  if (!isRecord(value)) {
    return false;
  }

  if (value.state === 'known') {
    return isNonNegativeFiniteNumber(value.score) && value.score <= 1;
  }

  return value.state === 'unknown' && isNonEmptyString(value.reason);
};

const isResponsibleParty = (value: unknown): value is ResponsibleParty => {
  if (!isRecord(value)) {
    return false;
  }

  const fields = [value.actorId, value.actorName, value.role];
  return (
    fields.some(isNonEmptyString) &&
    fields.every((field) => field === undefined || isNonEmptyString(field))
  );
};

const freezeScope = (scope: DecisionScope): Readonly<DecisionScope> =>
  Object.freeze({
    partitionId: scope.partitionId,
    update: scope.update,
    encounterId: scope.encounterId,
    encounterVersion: scope.encounterVersion,
    encounterKind: scope.encounterKind,
    difficulty: scope.difficulty,
    role: scope.role,
    esoClass: scope.esoClass,
    buildBracket: scope.buildBracket,
  });

const freezeEvidence = (evidence: DecisionEvidence): Readonly<DecisionEvidence> =>
  Object.freeze({
    timestampMs: evidence.timestampMs,
    phase: evidence.phase,
    provenance: evidence.provenance,
    context: evidence.context,
  });

const freezeConfidence = (confidence: DecisionConfidence): DecisionConfidence =>
  confidence.state === 'known'
    ? Object.freeze({ state: 'known', score: confidence.score })
    : Object.freeze({ state: 'unknown', reason: confidence.reason });

const freezeResponsibleParty = (
  responsible: ResponsibleParty | undefined,
): Readonly<ResponsibleParty> | null => {
  if (responsible === undefined) {
    return null;
  }

  return Object.freeze({
    ...(responsible.actorId === undefined ? {} : { actorId: responsible.actorId }),
    ...(responsible.actorName === undefined ? {} : { actorName: responsible.actorName }),
    ...(responsible.role === undefined ? {} : { role: responsible.role }),
  });
};

const getCandidateId = (candidate: DecisionSummaryCandidateInput): string | null =>
  isNonEmptyString(candidate.id) ? candidate.id : null;

const isCompleteCandidate = (
  candidate: DecisionSummaryCandidateInput,
): candidate is CompleteDecisionCandidate =>
  isNonEmptyString(candidate.id) &&
  isScope(candidate.scope) &&
  candidate.availability === 'available' &&
  isNonEmptyString(candidate.whatHappened) &&
  isNonEmptyString(candidate.whyItMatters) &&
  isEvidence(candidate.evidence) &&
  isNonEmptyString(candidate.recommendedNextAction) &&
  isConfidence(candidate.confidence) &&
  isNonEmptyString(candidate.observedBehavior) &&
  isNonEmptyString(candidate.expectedBehavior) &&
  isNonNegativeFiniteNumber(candidate.estimatedImpact) &&
  (candidate.responsible === undefined || isResponsibleParty(candidate.responsible)) &&
  isNonNegativeFiniteNumber(candidate.priority);

const hasInvalidPresentMetadata = (candidate: DecisionSummaryCandidateInput): boolean => {
  const stringFields = [
    candidate.id,
    candidate.whatHappened,
    candidate.whyItMatters,
    candidate.recommendedNextAction,
    candidate.observedBehavior,
    candidate.expectedBehavior,
  ];

  return (
    stringFields.some((field) => field !== undefined && !isNonEmptyString(field)) ||
    (candidate.availability !== undefined &&
      candidate.availability !== 'available' &&
      candidate.availability !== 'unavailable') ||
    (candidate.evidence !== undefined && !isEvidence(candidate.evidence)) ||
    (candidate.confidence !== undefined && !isConfidence(candidate.confidence)) ||
    (candidate.estimatedImpact !== undefined &&
      !isNonNegativeFiniteNumber(candidate.estimatedImpact)) ||
    (candidate.responsible !== undefined && !isResponsibleParty(candidate.responsible)) ||
    (candidate.priority !== undefined && !isNonNegativeFiniteNumber(candidate.priority))
  );
};

const rejectionFor = (candidate: DecisionSummaryCandidateInput): DecisionSummaryRejection => {
  if (candidate.availability === 'unavailable') {
    return Object.freeze({
      candidateId: getCandidateId(candidate),
      reason: 'unavailable-evidence',
      outcome: 'warning',
    });
  }

  return Object.freeze({
    candidateId: getCandidateId(candidate),
    reason: hasInvalidPresentMetadata(candidate) ? 'invalid-evidence' : 'incomplete-evidence',
    outcome: 'blocked',
  });
};

const rejectedCandidate = (
  candidate: DecisionSummaryCandidateInput,
  reason: DecisionSummaryRejectionReason,
  outcome: DecisionSummaryRejectionOutcome = 'blocked',
): DecisionSummaryRejection =>
  Object.freeze({ candidateId: getCandidateId(candidate), reason, outcome });

const emptyScope: DecisionScope = {
  partitionId: '',
  update: '',
  encounterId: '',
  encounterVersion: '',
  encounterKind: 'encounter',
  difficulty: '',
  role: '',
  esoClass: '',
  buildBracket: '',
};

const toItem = (complete: CompleteDecisionCandidate, stableOrder: number): DecisionSummaryItem => {
  return Object.freeze({
    id: complete.id,
    scope: freezeScope(complete.scope),
    whatHappened: complete.whatHappened,
    whyItMatters: complete.whyItMatters,
    evidence: freezeEvidence(complete.evidence),
    recommendedNextAction: complete.recommendedNextAction,
    confidence: freezeConfidence(complete.confidence),
    observedBehavior: complete.observedBehavior,
    expectedBehavior: complete.expectedBehavior,
    estimatedImpact: complete.estimatedImpact,
    responsible: freezeResponsibleParty(complete.responsible),
    priority: Object.freeze({ rank: complete.priority, stableOrder }),
  }) as DecisionSummaryItem;
};

/**
 * Produces a stable, ascending-rank decision list for one complete analysis context.
 * Every comparison dimension is an isolation boundary. Candidates that do not apply
 * to the selected context are blocked visibly so callers cannot mistake omissions
 * for an empty, complete summary.
 */
export const buildPrioritizedDecisionSummary = (
  request: DecisionSummaryRequest,
): DecisionSummary => {
  const items: DecisionSummaryItem[] = [];
  const rejected: DecisionSummaryRejection[] = [];

  if (!isRecord(request) || !isScope(request.scope) || !Array.isArray(request.candidates)) {
    return Object.freeze({
      scope: freezeScope(emptyScope),
      items: Object.freeze(items),
      rejected: Object.freeze(rejected),
    });
  }

  const duplicateIds = new Set<string>();
  const candidateIds = new Set<string>();

  request.candidates.forEach((candidate) => {
    if (!isRecord(candidate)) return;

    const candidateInput = candidate as DecisionSummaryCandidateInput;
    if (!isScope(candidateInput.scope) || !scopesMatch(request.scope, candidateInput.scope)) {
      return;
    }

    const candidateId = getCandidateId(candidateInput);
    if (candidateId === null) return;
    if (candidateIds.has(candidateId)) {
      duplicateIds.add(candidateId);
      return;
    }
    candidateIds.add(candidateId);
  });

  request.candidates.forEach((candidate, sourceOrder) => {
    if (!isRecord(candidate)) {
      rejected.push(
        Object.freeze({ candidateId: null, reason: 'invalid-evidence', outcome: 'blocked' }),
      );
      return;
    }

    const candidateInput = candidate as DecisionSummaryCandidateInput;

    if (!isScope(candidateInput.scope)) {
      rejected.push(rejectedCandidate(candidateInput, 'invalid-evidence'));
      return;
    }

    if (!scopesMatch(request.scope, candidateInput.scope)) {
      rejected.push(rejectedCandidate(candidateInput, 'context-mismatch'));
      return;
    }

    const candidateId = getCandidateId(candidateInput);
    if (candidateId !== null && duplicateIds.has(candidateId)) {
      rejected.push(rejectedCandidate(candidateInput, 'duplicate-candidate'));
      return;
    }

    if (!isCompleteCandidate(candidateInput)) {
      rejected.push(rejectionFor(candidateInput));
      return;
    }

    items.push(toItem(candidateInput, sourceOrder));
  });

  items.sort(
    (left, right) =>
      left.priority.rank - right.priority.rank ||
      left.priority.stableOrder - right.priority.stableOrder,
  );

  return Object.freeze({
    scope: freezeScope(request.scope),
    items: Object.freeze(items),
    rejected: Object.freeze(rejected),
  });
};
