/**
 * Domain model for durable, reviewable Analyzer findings.
 *
 * This module deliberately has no store or UI dependency.  Consumers can persist the
 * model they need, while the sharing projection keeps player identities out of a
 * recipient payload unless an authorized raid lead explicitly opts in.
 */

export type FindingRole = 'tank' | 'healer' | 'damage-dealer' | 'unknown';

export type FindingConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

export type FindingProvenanceKind =
  | 'authoritative-rule'
  | 'configurable-definition'
  | 'game-rule'
  | 'peer-benchmark'
  | 'fixed-heuristic';

export type FindingResolutionStatus =
  'open' | 'acknowledged' | 'in-progress' | 'resolved' | 'reopened';

export interface FindingActor {
  /** Stable player identifier from the report, never suitable for default sharing. */
  id: string;
  displayName: string;
  role?: FindingRole;
}

export interface FindingPhaseEvidence {
  timestampMs: number;
  phaseId?: string;
  phaseName?: string;
  eventId?: string;
  observation: string;
  actor?: FindingActor;
}

export interface FindingConfidence {
  level: FindingConfidenceLevel;
  rationale: string;
}

export interface FindingProvenance {
  kind: FindingProvenanceKind;
  source: string;
  sourceReference?: string;
  observedAt: string;
}

export interface FindingRecommendation {
  action: string;
  expectedOutcome?: string;
}

export interface FindingAssignee {
  kind: 'player' | 'role' | 'team';
  id?: string;
  displayName?: string;
  role?: FindingRole;
}

export interface FindingOwnershipTransition {
  at: string;
  from?: FindingAssignee;
  to?: FindingAssignee;
  reason?: string;
}

export interface FindingResolutionEvent {
  id: string;
  at: string;
  status: Exclude<FindingResolutionStatus, 'open'>;
  previousStatus: FindingResolutionStatus;
  note: string;
  changedBy?: FindingActor;
}

export interface PinnedFindingSeed {
  id: string;
  whatHappened: string;
  whyItMatters: string;
  evidence: readonly FindingPhaseEvidence[];
  confidence: FindingConfidence;
  provenance: FindingProvenance;
  recommendedAction: FindingRecommendation;
}

export interface PinnedFinding extends PinnedFindingSeed {
  /** Random, finding-local namespace used only to derive non-identifying share ids. */
  shareNamespace: string;
  pin: {
    status: 'pinned' | 'unpinned';
    /** Original pin time; retained after unpinning to validate lifecycle history. */
    pinnedAt: string;
    changedAt: string;
  };
  ownership: {
    current?: FindingAssignee;
    history: readonly FindingOwnershipTransition[];
  };
  resolutionHistory: readonly FindingResolutionEvent[];
}

export interface FindingShareRecipient {
  audience: 'raid-lead' | 'team' | 'external';
  /** Player ids and names may be included only for an explicitly authorized raid lead. */
  allowPlayerIdentifiers?: boolean;
}

export interface SharedFindingActor {
  role?: FindingRole;
}

export interface SharedFindingPhaseEvidence extends Omit<FindingPhaseEvidence, 'actor'> {
  actor?: FindingActor | SharedFindingActor;
}

export interface SharedFindingAssignee {
  kind: 'player' | 'role' | 'team';
  id?: string;
  displayName?: string;
  role?: FindingRole;
}

export interface SharedFindingResolutionEvent extends Omit<FindingResolutionEvent, 'changedBy'> {
  changedBy?: FindingActor | SharedFindingActor;
}

export interface SharedPinnedFinding extends Omit<
  PinnedFinding,
  'evidence' | 'ownership' | 'resolutionHistory' | 'shareNamespace'
> {
  evidence: readonly SharedFindingPhaseEvidence[];
  ownership: {
    current?: SharedFindingAssignee;
    history: ReadonlyArray<{
      at: string;
      from?: SharedFindingAssignee;
      to?: SharedFindingAssignee;
      reason?: string;
    }>;
  };
  resolutionHistory: readonly SharedFindingResolutionEvent[];
  sharedWith: {
    audience: FindingShareRecipient['audience'];
    includesPlayerIdentifiers: boolean;
  };
}

const findingRoles = new Set<FindingRole>(['tank', 'healer', 'damage-dealer', 'unknown']);
const confidenceLevels = new Set<FindingConfidenceLevel>(['high', 'medium', 'low', 'unknown']);
const provenanceKinds = new Set<FindingProvenanceKind>([
  'authoritative-rule',
  'configurable-definition',
  'game-rule',
  'peer-benchmark',
  'fixed-heuristic',
]);
const assigneeKinds = new Set<FindingAssignee['kind']>(['player', 'role', 'team']);
const resolutionStatuses = new Set<FindingResolutionStatus>([
  'open',
  'acknowledged',
  'in-progress',
  'resolved',
  'reopened',
]);
const shareAudiences = new Set<FindingShareRecipient['audience']>([
  'raid-lead',
  'team',
  'external',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const validateRequiredText = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return value;
};

const validateOptionalText = (value: unknown, fieldName: string): string | undefined =>
  value === undefined ? undefined : validateRequiredText(value, fieldName);

const validateRole = (value: unknown, fieldName: string): FindingRole => {
  if (typeof value !== 'string' || !findingRoles.has(value as FindingRole)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return value as FindingRole;
};

const cloneActor = (actor: unknown, fieldName: string): FindingActor | undefined => {
  if (actor === undefined) {
    return undefined;
  }
  if (!isRecord(actor)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  const role = validateOptionalText(actor.role, `${fieldName} role`);
  return {
    id: validateRequiredText(actor.id, `${fieldName} id`),
    displayName: validateRequiredText(actor.displayName, `${fieldName} displayName`),
    ...(role === undefined ? {} : { role: validateRole(role, `${fieldName} role`) }),
  };
};

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2}))?$/;

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const validateIsoDate = (value: unknown, fieldName: string): string => {
  if (
    typeof value !== 'string' ||
    !ISO_DATE_PATTERN.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error(`Invalid ISO date for ${fieldName}: ${String(value)}`);
  }

  const dateParts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!dateParts) {
    throw new Error(`Invalid ISO date for ${fieldName}: ${value}`);
  }

  const [, yearText, monthText, dayText] = dateParts;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ];

  if (!daysInMonth || day < 1 || day > daysInMonth) {
    throw new Error(`Invalid ISO date for ${fieldName}: ${value}`);
  }

  return value;
};

const normalizeTimestampMs = (timestampMs: unknown): number => {
  if (typeof timestampMs !== 'number' || !Number.isFinite(timestampMs) || timestampMs < 0) {
    throw new Error(`Invalid evidence timestampMs: ${String(timestampMs)}`);
  }

  return Object.is(timestampMs, -0) ? 0 : timestampMs;
};

const SHARE_NAMESPACE_PATTERN = /^[0-9a-f]{32}$/;

const createShareNamespace = (): string => {
  const bytes = new Uint8Array(16);
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure random generation is unavailable for finding sharing');
  }

  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const validateShareNamespace = (namespace: string): string => {
  if (typeof namespace !== 'string' || !SHARE_NAMESPACE_PATTERN.test(namespace)) {
    throw new Error('Invalid finding share namespace');
  }

  return namespace;
};

const cloneEvidence = (evidence: unknown): FindingPhaseEvidence => {
  if (!isRecord(evidence)) {
    throw new Error('Invalid finding evidence');
  }

  const phaseId = validateOptionalText(evidence.phaseId, 'evidence phaseId');
  const phaseName = validateOptionalText(evidence.phaseName, 'evidence phaseName');
  const eventId = validateOptionalText(evidence.eventId, 'evidence eventId');
  const actor = cloneActor(evidence.actor, 'evidence actor');
  return {
    timestampMs: normalizeTimestampMs(evidence.timestampMs),
    observation: validateRequiredText(evidence.observation, 'evidence observation'),
    ...(phaseId === undefined ? {} : { phaseId }),
    ...(phaseName === undefined ? {} : { phaseName }),
    ...(eventId === undefined ? {} : { eventId }),
    ...(actor === undefined ? {} : { actor }),
  };
};

const cloneAssignee = (assignee: unknown): FindingAssignee | undefined => {
  if (assignee === undefined) {
    return undefined;
  }
  if (
    !isRecord(assignee) ||
    typeof assignee.kind !== 'string' ||
    !assigneeKinds.has(assignee.kind as FindingAssignee['kind'])
  ) {
    throw new Error('Invalid finding assignee');
  }

  const id = validateOptionalText(assignee.id, 'assignee id');
  const displayName = validateOptionalText(assignee.displayName, 'assignee displayName');
  const role = validateOptionalText(assignee.role, 'assignee role');
  return {
    kind: assignee.kind as FindingAssignee['kind'],
    ...(id === undefined ? {} : { id }),
    ...(displayName === undefined ? {} : { displayName }),
    ...(role === undefined ? {} : { role: validateRole(role, 'assignee role') }),
  };
};

const assigneesEqual = (
  left: FindingAssignee | undefined,
  right: FindingAssignee | undefined,
): boolean =>
  left?.kind === right?.kind &&
  left?.id === right?.id &&
  left?.displayName === right?.displayName &&
  left?.role === right?.role;

const cloneConfidence = (confidence: unknown): FindingConfidence => {
  if (
    !isRecord(confidence) ||
    typeof confidence.level !== 'string' ||
    !confidenceLevels.has(confidence.level as FindingConfidenceLevel)
  ) {
    throw new Error('Invalid finding confidence');
  }

  return {
    level: confidence.level as FindingConfidenceLevel,
    rationale: validateRequiredText(confidence.rationale, 'confidence rationale'),
  };
};

const cloneProvenance = (provenance: unknown): FindingProvenance => {
  if (
    !isRecord(provenance) ||
    typeof provenance.kind !== 'string' ||
    !provenanceKinds.has(provenance.kind as FindingProvenanceKind)
  ) {
    throw new Error('Invalid finding provenance');
  }

  const sourceReference = validateOptionalText(
    provenance.sourceReference,
    'provenance sourceReference',
  );
  return {
    kind: provenance.kind as FindingProvenanceKind,
    source: validateRequiredText(provenance.source, 'provenance source'),
    observedAt: validateIsoDate(provenance.observedAt, 'provenance observedAt'),
    ...(sourceReference === undefined ? {} : { sourceReference }),
  };
};

const cloneRecommendation = (recommendation: unknown): FindingRecommendation => {
  if (!isRecord(recommendation)) {
    throw new Error('Invalid finding recommendation');
  }

  const expectedOutcome = validateOptionalText(
    recommendation.expectedOutcome,
    'recommendation expectedOutcome',
  );
  return {
    action: validateRequiredText(recommendation.action, 'recommendation action'),
    ...(expectedOutcome === undefined ? {} : { expectedOutcome }),
  };
};

const cloneResolutionInput = (event: unknown): Omit<FindingResolutionEvent, 'previousStatus'> => {
  if (
    !isRecord(event) ||
    typeof event.status !== 'string' ||
    event.status === 'open' ||
    !resolutionStatuses.has(event.status as FindingResolutionStatus)
  ) {
    throw new Error('Invalid finding resolution event');
  }

  const changedBy = cloneActor(event.changedBy, 'resolution event changedBy');
  return {
    id: validateRequiredText(event.id, 'resolution event id'),
    at: validateIsoDate(event.at, 'resolution event at'),
    status: event.status as Exclude<FindingResolutionStatus, 'open'>,
    note: validateRequiredText(event.note, 'resolution event note'),
    ...(changedBy === undefined ? {} : { changedBy }),
  };
};

const cloneResolution = (event: unknown): FindingResolutionEvent => {
  if (
    !isRecord(event) ||
    typeof event.previousStatus !== 'string' ||
    !resolutionStatuses.has(event.previousStatus as FindingResolutionStatus)
  ) {
    throw new Error('Invalid finding resolution event');
  }

  return {
    ...cloneResolutionInput(event),
    previousStatus: event.previousStatus as FindingResolutionStatus,
  };
};

const cloneOwnershipTransition = (transition: unknown): FindingOwnershipTransition => {
  if (!isRecord(transition)) {
    throw new Error('Invalid ownership transition');
  }

  const from = cloneAssignee(transition.from);
  const to = cloneAssignee(transition.to);
  const reason = validateOptionalText(transition.reason, 'ownership transition reason');
  return {
    at: validateIsoDate(transition.at, 'ownership transition at'),
    ...(from === undefined ? {} : { from }),
    ...(to === undefined ? {} : { to }),
    ...(reason === undefined ? {} : { reason }),
  };
};

const cloneFindingSeed = (seed: unknown): PinnedFindingSeed => {
  if (!isRecord(seed) || !Array.isArray(seed.evidence) || seed.evidence.length === 0) {
    throw new Error('Invalid pinned finding');
  }

  return {
    id: validateRequiredText(seed.id, 'finding id'),
    whatHappened: validateRequiredText(seed.whatHappened, 'finding whatHappened'),
    whyItMatters: validateRequiredText(seed.whyItMatters, 'finding whyItMatters'),
    evidence: seed.evidence.map(cloneEvidence),
    confidence: cloneConfidence(seed.confidence),
    provenance: cloneProvenance(seed.provenance),
    recommendedAction: cloneRecommendation(seed.recommendedAction),
  };
};

const cloneFinding = (finding: PinnedFinding): PinnedFinding => {
  if (
    !isRecord(finding) ||
    !isRecord(finding.pin) ||
    !isRecord(finding.ownership) ||
    !Array.isArray(finding.ownership.history) ||
    !Array.isArray(finding.resolutionHistory) ||
    (finding.pin.status !== 'pinned' && finding.pin.status !== 'unpinned')
  ) {
    throw new Error('Invalid pinned finding');
  }

  const seed = cloneFindingSeed(finding);
  const current = cloneAssignee(finding.ownership.current);
  const pinnedAt = validateIsoDate(finding.pin.pinnedAt, 'pin pinnedAt');
  const changedAt = validateIsoDate(finding.pin.changedAt, 'pin changedAt');
  if (Date.parse(changedAt) < Date.parse(pinnedAt)) {
    throw new Error('Backdated pin change');
  }

  return {
    ...seed,
    shareNamespace: validateShareNamespace(finding.shareNamespace),
    pin: { status: finding.pin.status, pinnedAt, changedAt },
    ownership: {
      ...(current === undefined ? {} : { current }),
      history: finding.ownership.history.map(cloneOwnershipTransition),
    },
    resolutionHistory: finding.resolutionHistory.map(cloneResolution),
  };
};

const validResolutionTransitions: Record<
  FindingResolutionStatus,
  readonly Exclude<FindingResolutionStatus, 'open'>[]
> = {
  open: ['acknowledged', 'in-progress'],
  acknowledged: ['in-progress', 'resolved'],
  'in-progress': ['acknowledged', 'resolved'],
  resolved: ['reopened'],
  reopened: ['acknowledged', 'in-progress'],
};

const isValidResolutionTransition = (
  previous: FindingResolutionStatus,
  next: Exclude<FindingResolutionStatus, 'open'>,
): boolean => validResolutionTransitions[previous]?.includes(next) ?? false;

interface ValidatedHistory<T> {
  lastAtMs: number;
  current: T;
}

const validateOwnershipLineage = (
  finding: PinnedFinding,
): ValidatedHistory<FindingAssignee | undefined> => {
  let current: FindingAssignee | undefined;
  let lastAtMs = Date.parse(validateIsoDate(finding.pin.pinnedAt, 'pin pinnedAt'));

  finding.ownership.history.forEach((transition) => {
    const at = validateIsoDate(transition.at, 'ownership transition at');
    const atMs = Date.parse(at);
    if (atMs < lastAtMs) {
      throw new Error('Backdated ownership transition');
    }
    if (!assigneesEqual(transition.from, current)) {
      throw new Error('Invalid ownership lineage');
    }

    current = transition.to;
    lastAtMs = atMs;
  });

  if (!assigneesEqual(finding.ownership.current, current)) {
    throw new Error('Invalid ownership lineage');
  }

  return { current, lastAtMs };
};

const validateResolutionLineage = (
  finding: PinnedFinding,
): ValidatedHistory<FindingResolutionStatus> => {
  const seenIds = new Set<string>();
  let current: FindingResolutionStatus = 'open';
  let lastAtMs = Date.parse(validateIsoDate(finding.pin.pinnedAt, 'pin pinnedAt'));

  finding.resolutionHistory.forEach((event) => {
    const at = validateIsoDate(event.at, 'resolution event at');
    const atMs = Date.parse(at);
    if (atMs < lastAtMs) {
      throw new Error('Backdated resolution event');
    }
    if (seenIds.has(event.id)) {
      throw new Error(`Duplicate resolution id: ${event.id}`);
    }
    if (event.previousStatus !== current || !isValidResolutionTransition(current, event.status)) {
      throw new Error(`Invalid resolution lineage for ${event.id}`);
    }

    seenIds.add(event.id);
    current = event.status;
    lastAtMs = atMs;
  });

  return { current, lastAtMs };
};

/** Pins a finding without attaching it to a particular storage mechanism. */
export const pinFinding = (seed: PinnedFindingSeed, pinnedAt: string): PinnedFinding => {
  const detachedSeed = cloneFindingSeed(seed);
  const validatedPinnedAt = validateIsoDate(pinnedAt, 'pin changedAt');

  return {
    ...detachedSeed,
    shareNamespace: createShareNamespace(),
    pin: { status: 'pinned', pinnedAt: validatedPinnedAt, changedAt: validatedPinnedAt },
    ownership: { history: [] },
    resolutionHistory: [],
  };
};

/** Retains the finding and lineage so an unpin is reversible/auditable. */
export const unpinFinding = (finding: PinnedFinding, unpinnedAt: string): PinnedFinding => {
  const detached = cloneFinding(finding);
  const ownership = validateOwnershipLineage(detached);
  const resolution = validateResolutionLineage(detached);
  const changedAt = validateIsoDate(unpinnedAt, 'pin changedAt');
  if (
    Date.parse(changedAt) < Date.parse(detached.pin.changedAt) ||
    Date.parse(changedAt) < ownership.lastAtMs ||
    Date.parse(changedAt) < resolution.lastAtMs
  ) {
    throw new Error('Backdated pin change');
  }

  return {
    ...detached,
    pin: { status: 'unpinned', pinnedAt: detached.pin.pinnedAt, changedAt },
  };
};

/** Appends a transition instead of replacing the ownership history. */
export const assignFinding = (
  finding: PinnedFinding,
  assignee: FindingAssignee | undefined,
  at: string,
  reason?: string,
): PinnedFinding => {
  const validatedAt = validateIsoDate(at, 'ownership transition at');
  const detached = cloneFinding(finding);
  const ownership = validateOwnershipLineage(detached);
  if (Date.parse(validatedAt) < ownership.lastAtMs) {
    throw new Error('Backdated ownership transition');
  }
  const validatedAssignee = cloneAssignee(assignee);
  const validatedReason = validateOptionalText(reason, 'ownership transition reason');
  const transition: FindingOwnershipTransition = {
    at: validatedAt,
    ...(detached.ownership.current ? { from: { ...detached.ownership.current } } : {}),
    ...(validatedAssignee ? { to: validatedAssignee } : {}),
    ...(validatedReason ? { reason: validatedReason } : {}),
  };

  return {
    ...detached,
    ownership: {
      ...(validatedAssignee ? { current: validatedAssignee } : {}),
      history: [...detached.ownership.history, transition],
    },
  };
};

/** Appends an immutable resolution event and records the state it followed. */
export const appendResolution = (
  finding: PinnedFinding,
  event: Omit<FindingResolutionEvent, 'previousStatus'>,
): PinnedFinding => {
  const validatedEvent = cloneResolutionInput(event);
  const validatedAt = validatedEvent.at;
  const detached = cloneFinding(finding);
  const resolution = validateResolutionLineage(detached);
  if (detached.resolutionHistory.some((existing) => existing.id === validatedEvent.id)) {
    throw new Error(`Duplicate resolution id: ${validatedEvent.id}`);
  }
  if (Date.parse(validatedAt) < resolution.lastAtMs) {
    throw new Error('Backdated resolution event');
  }
  if (!isValidResolutionTransition(resolution.current, validatedEvent.status)) {
    throw new Error(
      `Invalid resolution transition: ${resolution.current} -> ${validatedEvent.status}`,
    );
  }
  const appended: FindingResolutionEvent = {
    ...validatedEvent,
    at: validatedAt,
    previousStatus: resolution.current,
  };

  return {
    ...detached,
    resolutionHistory: [...detached.resolutionHistory, appended],
  };
};

const redactActor = (
  actor: FindingActor | undefined,
): FindingActor | SharedFindingActor | undefined => {
  if (!actor) {
    return undefined;
  }

  return actor.role ? { role: actor.role } : {};
};

const redactAssignee = (
  assignee: FindingAssignee | undefined,
): SharedFindingAssignee | undefined => {
  if (!assignee) {
    return undefined;
  }

  return {
    kind: assignee.kind,
    ...(assignee.role ? { role: assignee.role } : {}),
  };
};

const addActorIdentifiers = (identifiers: Set<string>, actor: FindingActor | undefined): void => {
  if (actor) {
    identifiers.add(actor.id);
    identifiers.add(actor.displayName);
  }
};

const addAssigneeIdentifiers = (
  identifiers: Set<string>,
  assignee: FindingAssignee | undefined,
): void => {
  if (assignee?.id) {
    identifiers.add(assignee.id);
  }
  if (assignee?.displayName) {
    identifiers.add(assignee.displayName);
  }
};

const identityIdentifiersFor = (finding: PinnedFinding): readonly string[] => {
  const identifiers = new Set<string>();

  identifiers.add(finding.id);
  finding.resolutionHistory.forEach((event) => identifiers.add(event.id));
  finding.evidence.forEach((evidence) => addActorIdentifiers(identifiers, evidence.actor));
  finding.resolutionHistory.forEach((event) => addActorIdentifiers(identifiers, event.changedBy));
  addAssigneeIdentifiers(identifiers, finding.ownership.current);
  finding.ownership.history.forEach((transition) => {
    addAssigneeIdentifiers(identifiers, transition.from);
    addAssigneeIdentifiers(identifiers, transition.to);
  });

  return [...identifiers].filter(Boolean).sort((left, right) => right.length - left.length);
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const redactText = (value: string, identityIdentifiers: readonly string[]): string => {
  if (identityIdentifiers.length === 0) {
    return value;
  }

  const identifiersPattern = identityIdentifiers.map(escapeRegExp).join('|');
  return value.replace(new RegExp(identifiersPattern, 'giu'), '[player]');
};

interface ShareIdContext {
  namespace: string;
  pseudonymById: ReadonlyMap<string, string>;
}

const createShareIdContext = (finding: PinnedFinding, namespace: string): ShareIdContext => {
  const pseudonymById = new Map<string, string>();
  const durableIds = [finding.id, ...finding.resolutionHistory.map((event) => event.id)];

  durableIds.forEach((id) => {
    if (pseudonymById.has(id)) {
      return;
    }

    pseudonymById.set(id, `ordinal-${pseudonymById.size + 1}`);
  });

  return { namespace: validateShareNamespace(namespace), pseudonymById };
};

const shareId = (value: string, namespace: string, context: ShareIdContext): string => {
  const pseudonym = context.pseudonymById.get(value);
  if (!pseudonym) {
    throw new Error('Missing finding-local pseudonym for durable share id');
  }

  return `shared-${context.namespace}-${namespace}-${pseudonym}`;
};

const validateShareRecipient = (recipient: unknown): FindingShareRecipient => {
  if (!isRecord(recipient) || typeof recipient.audience !== 'string') {
    throw new Error('Invalid finding share recipient');
  }
  if (!shareAudiences.has(recipient.audience as FindingShareRecipient['audience'])) {
    throw new Error('Invalid finding share recipient audience');
  }
  if (
    recipient.allowPlayerIdentifiers !== undefined &&
    typeof recipient.allowPlayerIdentifiers !== 'boolean'
  ) {
    throw new Error('Invalid finding share recipient allowPlayerIdentifiers');
  }

  return {
    audience: recipient.audience as FindingShareRecipient['audience'],
    ...(recipient.allowPlayerIdentifiers === undefined
      ? {}
      : { allowPlayerIdentifiers: recipient.allowPlayerIdentifiers }),
  };
};

/**
 * Produces a recipient payload. Player ids and names stay redacted for team and external
 * recipients; only an explicitly authorized raid lead may receive them.
 */
export const sharePinnedFinding = (
  finding: PinnedFinding,
  recipient: FindingShareRecipient,
): SharedPinnedFinding => {
  const detached = cloneFinding(finding);
  validateOwnershipLineage(detached);
  validateResolutionLineage(detached);
  const validatedRecipient = validateShareRecipient(recipient);
  const { shareNamespace, ...shareableFinding } = detached;
  const shareIdContext = createShareIdContext(detached, shareNamespace);
  const includesPlayerIdentifiers =
    validatedRecipient.audience === 'raid-lead' &&
    validatedRecipient.allowPlayerIdentifiers === true;

  if (includesPlayerIdentifiers) {
    const durableIdentifiers = [
      detached.id,
      ...detached.resolutionHistory.map((event) => event.id),
    ];
    return {
      ...shareableFinding,
      id: shareId(detached.id, 'finding', shareIdContext),
      whatHappened: redactText(detached.whatHappened, durableIdentifiers),
      whyItMatters: redactText(detached.whyItMatters, durableIdentifiers),
      evidence: detached.evidence.map((evidence) => ({
        ...evidence,
        ...(evidence.phaseId ? { phaseId: redactText(evidence.phaseId, durableIdentifiers) } : {}),
        ...(evidence.phaseName
          ? { phaseName: redactText(evidence.phaseName, durableIdentifiers) }
          : {}),
        ...(evidence.eventId ? { eventId: redactText(evidence.eventId, durableIdentifiers) } : {}),
        observation: redactText(evidence.observation, durableIdentifiers),
        ...(evidence.actor ? { actor: { ...evidence.actor } } : {}),
      })),
      confidence: {
        ...detached.confidence,
        rationale: redactText(detached.confidence.rationale, durableIdentifiers),
      },
      provenance: {
        ...detached.provenance,
        source: redactText(detached.provenance.source, durableIdentifiers),
        ...(detached.provenance.sourceReference
          ? {
              sourceReference: redactText(detached.provenance.sourceReference, durableIdentifiers),
            }
          : {}),
      },
      recommendedAction: {
        action: redactText(detached.recommendedAction.action, durableIdentifiers),
        ...(detached.recommendedAction.expectedOutcome
          ? {
              expectedOutcome: redactText(
                detached.recommendedAction.expectedOutcome,
                durableIdentifiers,
              ),
            }
          : {}),
      },
      ownership: {
        current: detached.ownership.current && { ...detached.ownership.current },
        history: detached.ownership.history.map((transition) => ({
          ...transition,
          ...(transition.from ? { from: { ...transition.from } } : {}),
          ...(transition.to ? { to: { ...transition.to } } : {}),
          ...(transition.reason
            ? { reason: redactText(transition.reason, durableIdentifiers) }
            : {}),
        })),
      },
      resolutionHistory: detached.resolutionHistory.map((event) => ({
        ...event,
        id: shareId(event.id, 'resolution', shareIdContext),
        note: redactText(event.note, durableIdentifiers),
        ...(event.changedBy ? { changedBy: { ...event.changedBy } } : {}),
      })),
      sharedWith: { audience: validatedRecipient.audience, includesPlayerIdentifiers },
    };
  }

  const identityIdentifiers = identityIdentifiersFor(detached);
  return {
    ...shareableFinding,
    id: shareId(detached.id, 'finding', shareIdContext),
    whatHappened: redactText(detached.whatHappened, identityIdentifiers),
    whyItMatters: redactText(detached.whyItMatters, identityIdentifiers),
    evidence: detached.evidence.map((evidence) => ({
      ...evidence,
      ...(evidence.phaseId ? { phaseId: redactText(evidence.phaseId, identityIdentifiers) } : {}),
      ...(evidence.phaseName
        ? { phaseName: redactText(evidence.phaseName, identityIdentifiers) }
        : {}),
      ...(evidence.eventId ? { eventId: redactText(evidence.eventId, identityIdentifiers) } : {}),
      observation: redactText(evidence.observation, identityIdentifiers),
      ...(evidence.actor ? { actor: redactActor(evidence.actor) } : {}),
    })),
    confidence: {
      ...detached.confidence,
      rationale: redactText(detached.confidence.rationale, identityIdentifiers),
    },
    provenance: {
      ...detached.provenance,
      source: redactText(detached.provenance.source, identityIdentifiers),
      ...(detached.provenance.sourceReference
        ? { sourceReference: redactText(detached.provenance.sourceReference, identityIdentifiers) }
        : {}),
    },
    recommendedAction: {
      action: redactText(detached.recommendedAction.action, identityIdentifiers),
      ...(detached.recommendedAction.expectedOutcome
        ? {
            expectedOutcome: redactText(
              detached.recommendedAction.expectedOutcome,
              identityIdentifiers,
            ),
          }
        : {}),
    },
    ownership: {
      current: redactAssignee(detached.ownership.current),
      history: detached.ownership.history.map((transition) => ({
        ...transition,
        from: redactAssignee(transition.from),
        to: redactAssignee(transition.to),
        ...(transition.reason
          ? { reason: redactText(transition.reason, identityIdentifiers) }
          : {}),
      })),
    },
    resolutionHistory: detached.resolutionHistory.map((event) => ({
      ...event,
      id: shareId(event.id, 'resolution', shareIdContext),
      note: redactText(event.note, identityIdentifiers),
      ...(event.changedBy ? { changedBy: redactActor(event.changedBy) } : {}),
    })),
    sharedWith: { audience: validatedRecipient.audience, includesPlayerIdentifiers },
  };
};
