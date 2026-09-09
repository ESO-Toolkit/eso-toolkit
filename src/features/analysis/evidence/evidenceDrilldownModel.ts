/**
 * Framework-independent, validated evidence data for analysis drilldowns.
 *
 * This module deliberately models evidence only. It neither evaluates encounter
 * rules nor supplies presentation text.
 */

export type EvidenceConfidence = number | 'unknown';

export type EvidenceDrilldownEntryInput = Readonly<{
  id: string;
  encounterId: string;
  partitionId: string;
  actorId: string;
  role: string;
  phaseId: string;
  timestamp: number;
  observed: string;
  expected: string;
  estimatedImpact: number;
  confidence: EvidenceConfidence;
  scoreContribution: number;
}>;

export type EvidenceDrilldownInput = Readonly<{
  fight: Readonly<{
    startTimestamp: number;
    endTimestamp: number;
  }>;
  entries: readonly EvidenceDrilldownEntryInput[];
}>;

export type EvidenceDrilldownEntry = Readonly<{
  id: string;
  scope: Readonly<{
    encounterId: string;
    partitionId: string;
    actorId: string;
    role: string;
    phaseId: string;
  }>;
  /** The timestamp used for ordering and rendering, clipped to the fight bounds. */
  timestamp: number;
  /** The reported timestamp before clipping, retained for auditability. */
  originalTimestamp: number;
  timestampWasClipped: boolean;
  behavior: Readonly<{
    observed: string;
    expected: string;
  }>;
  estimatedImpact: number;
  confidence: EvidenceConfidence;
  /** The direct contribution supplied by the evidence producer; no rule is inferred. */
  scoreContribution: number;
}>;

export type EvidenceDrilldownSnapshot = Readonly<{
  fight: Readonly<{
    startTimestamp: number;
    endTimestamp: number;
  }>;
  entries: readonly EvidenceDrilldownEntry[];
  /** The deterministic sum of the direct per-entry score contributions. */
  scoreContributionTotal: number;
}>;

type UnknownRecord = Record<string, unknown>;

const INPUT_KEYS = ['fight', 'entries'] as const;
const FIGHT_KEYS = ['startTimestamp', 'endTimestamp'] as const;
const ENTRY_KEYS = [
  'id',
  'encounterId',
  'partitionId',
  'actorId',
  'role',
  'phaseId',
  'timestamp',
  'observed',
  'expected',
  'estimatedImpact',
  'confidence',
  'scoreContribution',
] as const;

const isPlainRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

const hasExactKeys = (record: UnknownRecord, expectedKeys: readonly string[]): boolean => {
  const keys = Reflect.ownKeys(record);
  return (
    keys.length === expectedKeys.length &&
    expectedKeys.every((expectedKey) => keys.includes(expectedKey))
  );
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isConfidence = (value: unknown): value is EvidenceConfidence =>
  value === 'unknown' || (isFiniteNumber(value) && value >= 0 && value <= 1);

const compareStrings = (left: string, right: string): number => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

const compareEntries = (left: EvidenceDrilldownEntry, right: EvidenceDrilldownEntry): number => {
  const numericDifference = left.timestamp - right.timestamp;
  if (numericDifference !== 0) return numericDifference;

  const stringFields: Array<keyof EvidenceDrilldownEntry['scope']> = [
    'encounterId',
    'partitionId',
    'actorId',
    'role',
    'phaseId',
  ];

  for (const field of stringFields) {
    const comparison = compareStrings(left.scope[field], right.scope[field]);
    if (comparison !== 0) return comparison;
  }

  return compareStrings(left.id, right.id);
};

const toEntry = (
  value: unknown,
  fight: EvidenceDrilldownSnapshot['fight'],
): EvidenceDrilldownEntry | null => {
  if (!isPlainRecord(value) || !hasExactKeys(value, ENTRY_KEYS)) return null;

  const {
    id,
    encounterId,
    partitionId,
    actorId,
    role,
    phaseId,
    timestamp,
    observed,
    expected,
    estimatedImpact,
    confidence,
    scoreContribution,
  } = value;

  if (
    !isNonEmptyString(id) ||
    !isNonEmptyString(encounterId) ||
    !isNonEmptyString(partitionId) ||
    !isNonEmptyString(actorId) ||
    !isNonEmptyString(role) ||
    !isNonEmptyString(phaseId) ||
    !isFiniteNumber(timestamp) ||
    !isNonEmptyString(observed) ||
    !isNonEmptyString(expected) ||
    !isFiniteNumber(estimatedImpact) ||
    !isConfidence(confidence) ||
    !isFiniteNumber(scoreContribution)
  ) {
    return null;
  }

  const clippedTimestamp = Math.min(Math.max(timestamp, fight.startTimestamp), fight.endTimestamp);

  return {
    id,
    scope: { encounterId, partitionId, actorId, role, phaseId },
    timestamp: clippedTimestamp,
    originalTimestamp: timestamp,
    timestampWasClipped: clippedTimestamp !== timestamp,
    behavior: { observed, expected },
    estimatedImpact,
    confidence,
    scoreContribution,
  };
};

const freezeSnapshot = (snapshot: EvidenceDrilldownSnapshot): EvidenceDrilldownSnapshot => {
  for (const entry of snapshot.entries) {
    Object.freeze(entry.scope);
    Object.freeze(entry.behavior);
    Object.freeze(entry);
  }

  Object.freeze(snapshot.fight);
  Object.freeze(snapshot.entries);
  return Object.freeze(snapshot);
};

/**
 * Returns a detached immutable snapshot, or null when any runtime value is malformed.
 */
export const createEvidenceDrilldownSnapshot = (
  input: unknown,
): EvidenceDrilldownSnapshot | null => {
  try {
    if (!isPlainRecord(input) || !hasExactKeys(input, INPUT_KEYS) || !isPlainRecord(input.fight)) {
      return null;
    }

    if (!hasExactKeys(input.fight, FIGHT_KEYS) || !Array.isArray(input.entries)) return null;

    const { startTimestamp, endTimestamp } = input.fight;
    if (
      !isFiniteNumber(startTimestamp) ||
      !isFiniteNumber(endTimestamp) ||
      endTimestamp <= startTimestamp
    ) {
      return null;
    }

    const fight = { startTimestamp, endTimestamp };
    const seenIds = new Set<string>();
    const entries: EvidenceDrilldownEntry[] = [];

    for (const candidate of input.entries) {
      const entry = toEntry(candidate, fight);
      if (entry === null || seenIds.has(entry.id)) return null;
      seenIds.add(entry.id);
      entries.push(entry);
    }

    entries.sort(compareEntries);
    const scoreContributionTotal = entries.reduce(
      (total, entry) => total + entry.scoreContribution,
      0,
    );
    if (!isFiniteNumber(scoreContributionTotal)) return null;

    return freezeSnapshot({ fight, entries, scoreContributionTotal });
  } catch {
    return null;
  }
};
