import type { ESOClass } from '@/features/build-editor/types/build.types';
import type { PlayerDetailsEntry } from '@/types/playerDetails';

import { safeSessionStorageGet, safeSessionStorageSet } from './safeStorage';

export const KALPA_BUILD_EVIDENCE_PARAM = 'kalpaBuildEvidence';
export const KALPA_BUILD_EVIDENCE_SOURCE = 'kalpa-native-player-info';

interface LocationLike {
  search: string;
  hash: string;
}

export interface KalpaPlayerBuildEvidence {
  unitId: string;
  characterName?: string | null;
  accountName?: string | null;
  characterId?: string | null;
  classId?: number | null;
  raceId?: number | null;
  level?: number | null;
  championPoints?: number | null;
  className?: string | null;
  classMasteryPassives: number[];
  frontBarSkillIds: number[];
  backBarSkillIds: number[];
  evidence: string;
  confidence: string;
}

export interface KalpaBuildEvidence {
  schemaVersion: number;
  source: string;
  reportCode?: string | null;
  players: KalpaPlayerBuildEvidence[];
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

export function getKalpaEvidenceParamFromLocation(
  locationLike: LocationLike = window.location,
): string | null {
  const searchParam = new URLSearchParams(locationLike.search).get(KALPA_BUILD_EVIDENCE_PARAM);
  if (searchParam) return searchParam;

  const queryStart = locationLike.hash.indexOf('?');
  if (queryStart < 0) return null;
  return new URLSearchParams(locationLike.hash.slice(queryStart + 1)).get(
    KALPA_BUILD_EVIDENCE_PARAM,
  );
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
    source: KALPA_BUILD_EVIDENCE_SOURCE,
    reportCode: typeof value.reportCode === 'string' ? value.reportCode : undefined,
    players,
  };
}

function validateKalpaPlayerEvidence(value: unknown): KalpaPlayerBuildEvidence | undefined {
  if (!isRecord(value) || typeof value.unitId !== 'string') return undefined;

  const classMasteryPassives = sanitizeNumberArray(value.classMasteryPassives);

  return {
    unitId: value.unitId,
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
    frontBarSkillIds: sanitizeNumberArray(value.frontBarSkillIds),
    backBarSkillIds: sanitizeNumberArray(value.backBarSkillIds),
    evidence: typeof value.evidence === 'string' ? value.evidence : '',
    confidence: typeof value.confidence === 'string' ? value.confidence : '',
  };
}

function sanitizeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is number => Number.isInteger(id) && id > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
