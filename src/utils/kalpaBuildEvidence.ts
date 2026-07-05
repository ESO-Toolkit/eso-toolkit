import type { ESOClass } from '@/features/build-editor/types/build.types';
import type { PlayerDetailsEntry } from '@/types/playerDetails';

import { getRosterHubBaseUrl } from './envUtils';
import { fromBase64Url, inflateBytes } from './rosterEncoding';
import { safeSessionStorageGet, safeSessionStorageSet } from './safeStorage';

export const KALPA_BUILD_EVIDENCE_PARAM = 'kalpaBuildEvidence';
export const KALPA_BUILD_EVIDENCE_DEFLATE_PARAM = 'kalpaBuildEvidenceDeflate';
export const KALPA_BUILD_EVIDENCE_SOURCE = 'kalpa-native-player-info';
const KALPA_BUILD_EVIDENCE_FETCH_TIMEOUT_MS = 8_000;
const MAX_KALPA_BUILD_EVIDENCE_COMPRESSED_BYTES = 256 * 1024;

interface LocationLike {
  search: string;
  hash: string;
}

export interface KalpaPlayerBuildEvidence {
  unitId: string;
  unitOccurrenceId?: string | null;
  characterName?: string | null;
  accountName?: string | null;
  characterId?: string | null;
  classId?: number | null;
  raceId?: number | null;
  level?: number | null;
  championPoints?: number | null;
  className?: string | null;
  classMasteryPassives: number[];
  championPointPassives?: number[];
  /** Full long-term-effect ability ids from the raw PLAYER_INFO (classified client-side). */
  passives?: number[];
  food?: KalpaFoodEvidence;
  mundus?: KalpaMundusEvidence;
  scribedSkills?: KalpaScribedSkillEvidence[];
  evidence: string;
  confidence: string;
}

export interface KalpaFoodEvidence {
  abilityId: number;
  name?: string | null;
  icon?: string | null;
}

export interface KalpaMundusEvidence {
  abilityId: number;
  name?: string | null;
  icon?: string | null;
}

export interface KalpaScribedSkillEvidence {
  abilityId: number;
  name?: string | null;
  icon?: string | null;
  /** Ground-truth equipped scripts, recovered by Kalpa from the raw ABILITY_INFO line. */
  focusScript?: string | null;
  signatureScript?: string | null;
  affixScript?: string | null;
}

export interface KalpaBuildEvidence {
  schemaVersion: number;
  extractorVersion?: number | null;
  source: string;
  reportCode?: string | null;
  players: KalpaPlayerBuildEvidence[];
}

export interface KalpaAnonymousMatchSignals {
  classNames?: Array<string | null | undefined>;
  championPointPassiveIds?: number[];
  scribedSkillIds?: number[];
  excludedPlayers?: Set<KalpaPlayerBuildEvidence>;
}

export function classNameToEsoClass(className?: string | null): ESOClass | undefined {
  switch (className?.trim().toLowerCase()) {
    case 'dragonknight':
      return 'dragonknight';
    case 'sorcerer':
      return 'sorcerer';
    case 'nightblade':
      return 'nightblade';
    case 'templar':
      return 'templar';
    case 'warden':
      return 'warden';
    case 'necromancer':
      return 'necromancer';
    case 'arcanist':
      return 'arcanist';
    default:
      return undefined;
  }
}

const KALPA_RACE_ID_TO_BUILD_RACE: Record<number, string> = {
  1: 'breton',
  2: 'redguard',
  3: 'orc',
  4: 'darkelf',
  5: 'nord',
  6: 'argonian',
  7: 'highelf',
  8: 'woodelf',
  9: 'khajiit',
  10: 'imperial',
};

const KALPA_RACE_ID_TO_LABEL: Record<number, string> = {
  1: 'Breton',
  2: 'Redguard',
  3: 'Orc',
  4: 'Dark Elf',
  5: 'Nord',
  6: 'Argonian',
  7: 'High Elf',
  8: 'Wood Elf',
  9: 'Khajiit',
  10: 'Imperial',
};

export function kalpaRaceIdToBuildRace(raceId?: number | null): string | undefined {
  return typeof raceId === 'number' ? KALPA_RACE_ID_TO_BUILD_RACE[raceId] : undefined;
}

export function kalpaRaceIdToLabel(raceId?: number | null): string | undefined {
  return typeof raceId === 'number' ? KALPA_RACE_ID_TO_LABEL[raceId] : undefined;
}

export function decodeKalpaBuildEvidenceParam(
  encoded?: string | null,
): KalpaBuildEvidence | undefined {
  if (!encoded) return undefined;

  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const percentEncoded = Array.from(
      binary,
      (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`,
    ).join('');
    return validateKalpaBuildEvidence(JSON.parse(decodeURIComponent(percentEncoded)));
  } catch {
    return undefined;
  }
}

export async function decodeKalpaBuildEvidenceDeflateParam(
  encoded?: string | null,
): Promise<KalpaBuildEvidence | undefined> {
  if (!encoded) return undefined;

  try {
    const bytes = fromBase64Url(encoded);
    if (bytes.length > MAX_KALPA_BUILD_EVIDENCE_COMPRESSED_BYTES) return undefined;
    return validateKalpaBuildEvidence(JSON.parse(await inflateBytes(bytes)));
  } catch {
    return undefined;
  }
}

export function getKalpaEvidenceParamFromLocation(
  locationLike: LocationLike = window.location,
): string | null {
  return getLocationQueryParam(KALPA_BUILD_EVIDENCE_PARAM, locationLike);
}

export function getKalpaEvidenceDeflateParamFromLocation(
  locationLike: LocationLike = window.location,
): string | null {
  return getLocationQueryParam(KALPA_BUILD_EVIDENCE_DEFLATE_PARAM, locationLike);
}

function getLocationQueryParam(paramName: string, locationLike: LocationLike): string | null {
  const searchParam = new URLSearchParams(locationLike.search).get(paramName);
  if (searchParam) return searchParam;

  const queryStart = locationLike.hash.indexOf('?');
  if (queryStart < 0) return null;
  return new URLSearchParams(locationLike.hash.slice(queryStart + 1)).get(paramName);
}

export function loadKalpaBuildEvidenceForReport(
  reportCode?: string | null,
  locationLike: LocationLike = window.location,
): KalpaBuildEvidence | undefined {
  if (!reportCode) return undefined;

  const storageKey = storageKeyForReport(reportCode);
  const encodedParam = getKalpaEvidenceParamFromLocation(locationLike);
  const decodedParam = decodeKalpaBuildEvidenceParam(encodedParam);
  if (decodedParam && evidenceBelongsToReport(decodedParam, reportCode)) {
    safeSessionStorageSet(storageKey, JSON.stringify(decodedParam));
    return decodedParam;
  }

  const stored = safeSessionStorageGet(storageKey);
  if (!stored) return undefined;

  try {
    const decodedStored = validateKalpaBuildEvidence(JSON.parse(stored));
    return decodedStored && evidenceBelongsToReport(decodedStored, reportCode)
      ? decodedStored
      : undefined;
  } catch {
    return undefined;
  }
}

export async function fetchKalpaBuildEvidenceForReport(
  reportCode?: string | null,
): Promise<KalpaBuildEvidence | undefined> {
  if (!reportCode) return undefined;

  const local =
    (await loadKalpaBuildEvidenceDeflateForReport(reportCode)) ??
    loadKalpaBuildEvidenceForReport(reportCode);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), KALPA_BUILD_EVIDENCE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${getRosterHubBaseUrl()}/reports/${encodeURIComponent(reportCode)}/build-evidence`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      },
    );
    if (res.status === 404) return local;
    if (!res.ok) return local;

    const evidence = validateKalpaBuildEvidence(await res.json());
    if (!evidence || !evidenceBelongsToReport(evidence, reportCode)) return local;

    safeSessionStorageSet(storageKeyForReport(reportCode), JSON.stringify(evidence));
    return evidence;
  } catch {
    return local;
  } finally {
    window.clearTimeout(timer);
  }
}

async function loadKalpaBuildEvidenceDeflateForReport(
  reportCode: string,
  locationLike: LocationLike = window.location,
): Promise<KalpaBuildEvidence | undefined> {
  const encodedParam = getKalpaEvidenceDeflateParamFromLocation(locationLike);
  const decodedParam = await decodeKalpaBuildEvidenceDeflateParam(encodedParam);
  if (!decodedParam || !evidenceBelongsToReport(decodedParam, reportCode)) return undefined;

  safeSessionStorageSet(storageKeyForReport(reportCode), JSON.stringify(decodedParam));
  return decodedParam;
}

export function findKalpaBuildEvidenceForPlayer(
  evidence: KalpaBuildEvidence | undefined,
  player: PlayerDetailsEntry,
): KalpaPlayerBuildEvidence | undefined {
  if (!evidence?.players?.length) return undefined;

  const playerCharacter = normalizeName(player.name);
  const playerAccount = normalizeAccount(player.displayName);
  const playerCharacterId = normalizeCharacterId(player.guid);

  const exactCharacterId = evidence.players.find((candidate) => {
    const candidateId = normalizeCharacterId(candidate.characterId);
    return candidateId && candidateId === playerCharacterId;
  });
  if (exactCharacterId) return exactCharacterId;

  const both = evidence.players.find((candidate) => {
    const candidateCharacter = normalizeName(candidate.characterName);
    const candidateAccount = normalizeAccount(candidate.accountName);
    return (
      candidateCharacter &&
      candidateAccount &&
      playerCharacter &&
      playerAccount &&
      candidateCharacter === playerCharacter &&
      candidateAccount === playerAccount
    );
  });
  if (both) return both;

  const byAccount = uniqueMatch(evidence.players, (candidate) => {
    const candidateAccount = normalizeAccount(candidate.accountName);
    return Boolean(candidateAccount && playerAccount && candidateAccount === playerAccount);
  });
  if (byAccount) return byAccount;

  return uniqueMatch(evidence.players, (candidate) => {
    const candidateCharacter = normalizeName(candidate.characterName);
    return Boolean(candidateCharacter && playerCharacter && candidateCharacter === playerCharacter);
  });
}

export function findAnonymousKalpaBuildEvidenceForPlayer(
  evidence: KalpaBuildEvidence | undefined,
  signals: KalpaAnonymousMatchSignals,
): KalpaPlayerBuildEvidence | undefined {
  if (!evidence?.players?.length) return undefined;

  const classNames = new Set(
    (signals.classNames ?? [])
      .map((className) => classNameToEsoClass(className))
      .filter((className): className is ESOClass => Boolean(className)),
  );
  if (classNames.size === 0) return undefined;

  const publicCpIds = uniquePositiveNumbers(signals.championPointPassiveIds);
  const publicScribedIds = uniquePositiveNumbers(signals.scribedSkillIds);
  const classMatches = evidence.players
    .filter((candidate) => !signals.excludedPlayers?.has(candidate))
    .filter((candidate) => !hasSidecarIdentity(candidate))
    .filter((candidate) => {
      const candidateClass = classNameToEsoClass(candidate.className);
      return Boolean(candidateClass && classNames.has(candidateClass));
    });

  const hasPublicFingerprint = publicCpIds.length >= 2 || publicScribedIds.length > 0;
  if (hasPublicFingerprint) {
    const matches = classMatches.filter((candidate) => {
      const candidateCpIds = new Set(uniquePositiveNumbers(candidate.championPointPassives));
      const cpOverlap = publicCpIds.filter((id) => candidateCpIds.has(id)).length;
      if (cpOverlap >= 2) return true;

      const candidateScribedIds = new Set(
        (candidate.scribedSkills ?? []).map((skill) => skill.abilityId).filter((id) => id > 0),
      );
      return publicScribedIds.some((id) => candidateScribedIds.has(id));
    });

    return matches.length === 1 ? matches[0] : undefined;
  }

  if (classNames.size !== 1) return undefined;

  const rawPlayerInfoMatches = classMatches.filter(isExactRawPlayerInfoEvidence);
  return rawPlayerInfoMatches.length === 1 ? rawPlayerInfoMatches[0] : undefined;
}

export function redactKalpaPlayerIdentity(
  evidence: KalpaPlayerBuildEvidence,
): KalpaPlayerBuildEvidence {
  return {
    ...evidence,
    characterName: undefined,
    accountName: undefined,
    characterId: undefined,
  };
}

function storageKeyForReport(reportCode: string): string {
  return `kalpa.buildEvidence.${reportCode}`;
}

function evidenceBelongsToReport(evidence: KalpaBuildEvidence, reportCode: string): boolean {
  return !evidence.reportCode || evidence.reportCode === reportCode;
}

function uniqueMatch(
  candidates: KalpaPlayerBuildEvidence[],
  predicate: (candidate: KalpaPlayerBuildEvidence) => boolean,
): KalpaPlayerBuildEvidence | undefined {
  const matches = candidates.filter(predicate);
  return matches.length === 1 ? matches[0] : undefined;
}

function hasSidecarIdentity(candidate: KalpaPlayerBuildEvidence): boolean {
  return Boolean(
    normalizeName(candidate.characterName) ||
    normalizeAccount(candidate.accountName) ||
    normalizeCharacterId(candidate.characterId),
  );
}

function isExactRawPlayerInfoEvidence(candidate: KalpaPlayerBuildEvidence): boolean {
  return candidate.evidence === 'raw-player-info' && candidate.confidence === 'exact';
}

function uniquePositiveNumbers(values: number[] | undefined): number[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.filter((id) => Number.isInteger(id) && id > 0)));
}

function normalizeName(value?: string | null): string {
  return value?.trim().toLowerCase() ?? '';
}

function normalizeAccount(value?: string | null): string {
  return normalizeName(value).replace(/^@/, '');
}

function normalizeCharacterId(value?: string | number | null): string {
  if (value == null) return '';
  const normalized = String(value).trim();
  return normalized && normalized !== '0' ? normalized : '';
}

function validateKalpaBuildEvidence(value: unknown): KalpaBuildEvidence | undefined {
  if (!isRecord(value)) return undefined;
  if (value.schemaVersion !== 1 || value.source !== KALPA_BUILD_EVIDENCE_SOURCE) {
    return undefined;
  }
  if (!Array.isArray(value.players)) return undefined;

  const players = value.players
    .map(validateKalpaPlayerEvidence)
    .filter((player): player is KalpaPlayerBuildEvidence => player != null);

  return {
    schemaVersion: 1,
    extractorVersion: Number.isInteger(value.extractorVersion)
      ? (value.extractorVersion as number)
      : undefined,
    source: KALPA_BUILD_EVIDENCE_SOURCE,
    reportCode: typeof value.reportCode === 'string' ? value.reportCode : undefined,
    players,
  };
}

function validateKalpaPlayerEvidence(value: unknown): KalpaPlayerBuildEvidence | undefined {
  if (!isRecord(value) || typeof value.unitId !== 'string') return undefined;

  const classMasteryPassives = sanitizeNumberArray(value.classMasteryPassives);
  const championPointPassives = sanitizeNumberArray(value.championPointPassives);
  const passives = sanitizeNumberArray(value.passives);
  const food = sanitizeFoodEvidence(value.food);
  const mundus = sanitizeMundusEvidence(value.mundus);
  const scribedSkills = sanitizeScribedSkills(value.scribedSkills);
  const player: KalpaPlayerBuildEvidence = {
    unitId: value.unitId,
    unitOccurrenceId:
      typeof value.unitOccurrenceId === 'string' ? value.unitOccurrenceId : undefined,
    characterName: typeof value.characterName === 'string' ? value.characterName : undefined,
    accountName: typeof value.accountName === 'string' ? value.accountName : undefined,
    characterId: typeof value.characterId === 'string' ? value.characterId : undefined,
    classId: Number.isInteger(value.classId) ? (value.classId as number) : undefined,
    raceId: Number.isInteger(value.raceId) ? (value.raceId as number) : undefined,
    level: Number.isInteger(value.level) ? (value.level as number) : undefined,
    championPoints: Number.isInteger(value.championPoints)
      ? (value.championPoints as number)
      : undefined,
    className: typeof value.className === 'string' ? value.className : undefined,
    classMasteryPassives,
    evidence: typeof value.evidence === 'string' ? value.evidence : '',
    confidence: typeof value.confidence === 'string' ? value.confidence : '',
  };
  if (championPointPassives.length > 0) player.championPointPassives = championPointPassives;
  if (passives.length > 0) player.passives = passives;
  if (food) player.food = food;
  if (mundus) player.mundus = mundus;
  if (scribedSkills.length > 0) player.scribedSkills = scribedSkills;
  return player;
}

function sanitizeFoodEvidence(value: unknown): KalpaFoodEvidence | undefined {
  if (!isRecord(value) || !Number.isInteger(value.abilityId) || (value.abilityId as number) <= 0) {
    return undefined;
  }

  return {
    abilityId: value.abilityId as number,
    name: typeof value.name === 'string' ? value.name : undefined,
    icon: typeof value.icon === 'string' ? value.icon : undefined,
  };
}

function sanitizeMundusEvidence(value: unknown): KalpaMundusEvidence | undefined {
  if (!isRecord(value) || !Number.isInteger(value.abilityId) || (value.abilityId as number) <= 0) {
    return undefined;
  }

  return {
    abilityId: value.abilityId as number,
    name: typeof value.name === 'string' ? value.name : undefined,
    icon: typeof value.icon === 'string' ? value.icon : undefined,
  };
}

function sanitizeScribedSkills(value: unknown): KalpaScribedSkillEvidence[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): KalpaScribedSkillEvidence | undefined => {
      if (!isRecord(entry)) return undefined;
      if (!Number.isInteger(entry.abilityId)) return undefined;
      return {
        abilityId: entry.abilityId as number,
        name: typeof entry.name === 'string' ? entry.name : undefined,
        icon: typeof entry.icon === 'string' ? entry.icon : undefined,
        focusScript: typeof entry.focusScript === 'string' ? entry.focusScript : undefined,
        signatureScript:
          typeof entry.signatureScript === 'string' ? entry.signatureScript : undefined,
        affixScript: typeof entry.affixScript === 'string' ? entry.affixScript : undefined,
      };
    })
    .filter((entry): entry is KalpaScribedSkillEvidence => entry != null);
}

function sanitizeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is number => Number.isInteger(id) && id > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
