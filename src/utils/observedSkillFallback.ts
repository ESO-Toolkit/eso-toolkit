import type { ReportAbilityFragment } from '@/graphql/gql/graphql';
import {
  BLUE_CHAMPION_POINTS,
  GREEN_CHAMPION_POINTS,
  HEALTH_AND_REGEN_FOOD,
  HEALTH_FOOD,
  INCREASE_MAX_HEALTH_AND_MAGICKA,
  INCREASE_MAX_HEALTH_AND_STAMINA,
  INCREASE_MAX_MAGICKA_AND_STAMINA,
  KnownAbilities,
  MAGICKA_FOOD,
  MAX_STAMINA_AND_MAGICKA_RECOVERY,
  MundusStones,
  POTION_RESOURCE_RESTORE_IDS,
  RED_CHAMPION_POINTS,
  STAMINA_FOOD,
  SYNERGY_ABILITY_IDS,
  TRI_STAT_FOOD,
  WITCHES_BREW,
} from '@/types/abilities';
import type {
  BuffEvent,
  DamageEvent,
  DebuffEvent,
  HealEvent,
  ResourceChangeEvent,
  UnifiedCastEvent,
} from '@/types/combatlogEvents';
import type { PlayerGear, PlayerTalent } from '@/types/playerDetails';

type AbilityLookup = Record<string | number, ReportAbilityFragment>;

type EvidenceKind = 'cast' | 'damage' | 'debuff' | 'heal' | 'buff' | 'resource';

interface ObservedSkillCandidate {
  abilityId: number;
  name: string;
  icon: string;
  normalizedName: string;
  firstTimestamp: number;
  bestEvidenceRank: number;
  count: number;
}

interface DeriveObservedPlayerSkillsInput {
  playerId: string | number;
  abilitiesById: AbilityLookup;
  gear?: readonly PlayerGear[];
  castEvents?: readonly UnifiedCastEvent[];
  damageEvents?: readonly DamageEvent[];
  friendlyBuffEvents?: readonly BuffEvent[];
  debuffEvents?: readonly DebuffEvent[];
  healingEvents?: readonly HealEvent[];
  resourceEvents?: readonly ResourceChangeEvent[];
  limit?: number;
}

const BASIC_ABILITY_IDS = new Set<number>([
  KnownAbilities.SWAP_WEAPONS,
  KnownAbilities.RESURRECT,
  KnownAbilities.LIGHT_ATTACK_ONE_HANDED,
  KnownAbilities.HEAVY_ATTACK_ONE_HANDED,
  KnownAbilities.HEAVY_ATTACK_ONE_HANDED_2,
  KnownAbilities.HEAVY_ATTACK_ONE_HANDED_3,
  KnownAbilities.LIGHT_ATTACK_TWO_HANDED,
  KnownAbilities.HEAVY_ATTACK_TWO_HANDED,
  KnownAbilities.HEAVY_ATTACK_TWO_HANDED_2,
  KnownAbilities.HEAVY_ATTACK_TWO_HANDED_3,
  KnownAbilities.LIGHT_ATTACK_DUAL_WIELD,
  KnownAbilities.HEAVY_ATTACK_DUAL_WIELD,
  KnownAbilities.HEAVY_ATTACK_DUAL_WIELD_2,
  KnownAbilities.HEAVY_ATTACK_DUAL_WIELD_3,
  KnownAbilities.HEAVY_ATTACK_DUAL_WIELD_4,
  KnownAbilities.LIGHT_ATTACK_BOW,
  KnownAbilities.HEAVY_ATTACK_BOW,
  KnownAbilities.HEAVY_ATTACK_BOW_2,
  KnownAbilities.HEAVY_ATTACK_BOW_3,
  KnownAbilities.LIGHT_ATTACK_INFERNO,
  KnownAbilities.HEAVY_ATTACK_INFERNO,
  KnownAbilities.HEAVY_ATTACK_INFERNO_2,
  KnownAbilities.HEAVY_ATTACK_INFERNO_3,
  KnownAbilities.LIGHT_ATTACK_ICE,
  KnownAbilities.HEAVY_ATTACK_ICE,
  KnownAbilities.HEAVY_ATTACK_ICE_2,
  KnownAbilities.HEAVY_ATTACK_ICE_3,
  KnownAbilities.LIGHT_ATTACK_LIGHTNING,
  KnownAbilities.HEAVY_ATTACK_LIGHTNING,
  KnownAbilities.HEAVY_ATTACK_LIGHTNING_2,
  KnownAbilities.LIGHT_ATTACK_RESTORATION,
  KnownAbilities.HEAVY_ATTACK_RESTORATION,
  KnownAbilities.HEAVY_ATTACK_RESTORATION_2,
  KnownAbilities.HEAVY_ATTACK_RESTORATION_3,
  KnownAbilities.LIGHT_ATTACK_UNARMED,
]);

const EXCLUDED_ABILITY_IDS = new Set<number>([
  ...BASIC_ABILITY_IDS,
  ...SYNERGY_ABILITY_IDS,
  ...POTION_RESOURCE_RESTORE_IDS,
  ...TRI_STAT_FOOD,
  ...HEALTH_AND_REGEN_FOOD,
  ...HEALTH_FOOD,
  ...MAGICKA_FOOD,
  ...STAMINA_FOOD,
  ...INCREASE_MAX_HEALTH_AND_STAMINA,
  ...INCREASE_MAX_HEALTH_AND_MAGICKA,
  ...INCREASE_MAX_MAGICKA_AND_STAMINA,
  ...MAX_STAMINA_AND_MAGICKA_RECOVERY,
  ...WITCHES_BREW,
  ...RED_CHAMPION_POINTS,
  ...BLUE_CHAMPION_POINTS,
  ...GREEN_CHAMPION_POINTS,
  ...Object.values(MundusStones).filter((value): value is number => typeof value === 'number'),
]);

const EXCLUDED_EXACT_NAMES = new Set(
  [
    'bash',
    'abyssal ink',
    'berserker',
    'block',
    'break free',
    'burning',
    'chill',
    'concussion',
    'crux',
    'diseased',
    'dodge',
    'dodge roll',
    'fiery weapon',
    'grave robber',
    'health recovery',
    'hemorrhaging',
    'mark of hircine',
    'off balance',
    'overcharged',
    'poisoned',
    'poisoned weapon',
    'restore magicka',
    'restore stamina',
    'sliver assault',
    'sunderer',
    'sundered',
    'weapon swap',
  ].map((name) => name.toLowerCase()),
);

const EXCLUDED_NAME_PATTERNS = [
  /^light attack\b/i,
  /^heavy attack\b/i,
  /^major\s+/i,
  /^minor\s+/i,
  /\bsynergy\b/i,
  /\bset bonus\b/i,
  /\bfood\b/i,
  /\bdrink\b/i,
  /\bmundus\b/i,
];

const EVIDENCE_RANK: Record<EvidenceKind, number> = {
  cast: 0,
  damage: 1,
  debuff: 2,
  heal: 3,
  buff: 4,
  resource: 5,
};

function normalizeName(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getAbility(abilitiesById: AbilityLookup, abilityId: number): ReportAbilityFragment | null {
  return abilitiesById[abilityId] ?? abilitiesById[String(abilityId)] ?? null;
}

function getGearSetNames(gear: readonly PlayerGear[] | undefined): Set<string> {
  const names = new Set<string>();

  gear?.forEach((piece) => {
    const setName = normalizeName(piece.setName);
    if (setName) {
      names.add(setName);
      names.add(setName.replace(/^perfected\s+/, ''));
    }

    const itemName = normalizeName(piece.name);
    if (itemName) {
      names.add(itemName);
      names.add(itemName.replace(/^perfected\s+/, ''));
    }
  });

  return names;
}

function isGenericIcon(icon: string | null | undefined): boolean {
  if (!icon) {
    return true;
  }

  return (
    icon === 'ability_mage_065' ||
    icon.startsWith('passive_') ||
    icon.startsWith('crafting_') ||
    icon.startsWith('vision_') ||
    icon.startsWith('ava_artifact_')
  );
}

function shouldExcludeAbility(
  abilityId: number,
  ability: ReportAbilityFragment | null,
  gearNames: Set<string>,
  evidenceKind: EvidenceKind,
): boolean {
  if (EXCLUDED_ABILITY_IDS.has(abilityId)) {
    return true;
  }

  const rawName = ability?.name ?? '';
  const normalizedName = normalizeName(rawName);
  if (!normalizedName) {
    return true;
  }

  if (EXCLUDED_EXACT_NAMES.has(normalizedName)) {
    return true;
  }

  if (EXCLUDED_NAME_PATTERNS.some((pattern) => pattern.test(rawName))) {
    return true;
  }

  if (gearNames.has(normalizedName)) {
    return true;
  }

  const icon = ability?.icon ?? '';
  if (icon.startsWith('passive_')) {
    return true;
  }

  if (evidenceKind !== 'cast' && isGenericIcon(icon)) {
    return true;
  }

  return false;
}

function addCandidate(
  candidates: Map<string, ObservedSkillCandidate>,
  input: {
    abilityId: number;
    timestamp: number;
    evidenceKind: EvidenceKind;
    abilitiesById: AbilityLookup;
    gearNames: Set<string>;
  },
): void {
  const ability = getAbility(input.abilitiesById, input.abilityId);
  if (shouldExcludeAbility(input.abilityId, ability, input.gearNames, input.evidenceKind)) {
    return;
  }

  const name = ability?.name?.trim();
  if (!name) {
    return;
  }

  const normalizedName = normalizeName(name);
  const existing = candidates.get(normalizedName);
  const rank = EVIDENCE_RANK[input.evidenceKind];
  const icon = ability?.icon ?? '';

  if (!existing) {
    candidates.set(normalizedName, {
      abilityId: input.abilityId,
      name,
      icon,
      normalizedName,
      firstTimestamp: input.timestamp,
      bestEvidenceRank: rank,
      count: 1,
    });
    return;
  }

  existing.count += 1;
  existing.firstTimestamp = Math.min(existing.firstTimestamp, input.timestamp);

  const shouldReplace =
    rank < existing.bestEvidenceRank ||
    (rank === existing.bestEvidenceRank && isGenericIcon(existing.icon) && !isGenericIcon(icon));

  if (shouldReplace) {
    existing.abilityId = input.abilityId;
    existing.name = name;
    existing.icon = icon;
    existing.bestEvidenceRank = rank;
  }
}

export function deriveObservedPlayerSkills({
  playerId,
  abilitiesById,
  gear,
  castEvents = [],
  damageEvents = [],
  friendlyBuffEvents = [],
  debuffEvents = [],
  healingEvents = [],
  resourceEvents = [],
  limit = 12,
}: DeriveObservedPlayerSkillsInput): PlayerTalent[] {
  const playerIdString = String(playerId);
  const gearNames = getGearSetNames(gear);
  const candidates = new Map<string, ObservedSkillCandidate>();

  const add = (abilityId: number, timestamp: number, evidenceKind: EvidenceKind): void => {
    addCandidate(candidates, {
      abilityId,
      timestamp,
      evidenceKind,
      abilitiesById,
      gearNames,
    });
  };

  castEvents.forEach((event) => {
    if (String(event.sourceID) === playerIdString && typeof event.abilityGameID === 'number') {
      add(event.abilityGameID, event.timestamp, 'cast');
    }
  });

  damageEvents.forEach((event) => {
    if (
      String(event.sourceID) === playerIdString &&
      event.sourceIsFriendly &&
      !event.targetIsFriendly &&
      typeof event.abilityGameID === 'number'
    ) {
      add(event.abilityGameID, event.timestamp, 'damage');
    }
  });

  debuffEvents.forEach((event) => {
    if (String(event.sourceID) === playerIdString && typeof event.abilityGameID === 'number') {
      add(event.abilityGameID, event.timestamp, 'debuff');
    }
  });

  healingEvents.forEach((event) => {
    if (String(event.sourceID) === playerIdString && typeof event.abilityGameID === 'number') {
      add(event.abilityGameID, event.timestamp, 'heal');
    }
  });

  friendlyBuffEvents.forEach((event) => {
    if (String(event.sourceID) === playerIdString && typeof event.abilityGameID === 'number') {
      add(event.abilityGameID, event.timestamp, 'buff');
    }
  });

  resourceEvents.forEach((event) => {
    if (String(event.sourceID) === playerIdString && typeof event.abilityGameID === 'number') {
      add(event.abilityGameID, event.timestamp, 'resource');
    }
  });

  return Array.from(candidates.values())
    .sort(
      (a, b) =>
        a.bestEvidenceRank - b.bestEvidenceRank ||
        a.firstTimestamp - b.firstTimestamp ||
        b.count - a.count ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit)
    .map((candidate) => ({
      guid: candidate.abilityId,
      name: candidate.name,
      abilityIcon: candidate.icon,
      type: 0,
      flags: 0,
    }));
}
