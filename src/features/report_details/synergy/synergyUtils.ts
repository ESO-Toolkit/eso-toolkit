import type { ReportAbilityFragment } from '../../../graphql/gql/graphql';
import { SYNERGY_ABILITY_IDS } from '../../../types/abilities';
import type { UnifiedCastEvent } from '../../../types/combatlogEvents';

/** Ability IDs that count toward Alkosh (Roar of Alkosh) uptime. */
export const ALKOSH_SYNERGY_IDS = new Set([85572, 115548, 23196]); // Harvest, Grave Robber, Conduit

/**
 * Check if an ability is a synergy based on its ID.
 */
export function isSynergyAbility(abilityId: number): boolean {
  return SYNERGY_ABILITY_IDS.has(abilityId);
}

/** A single synergy activation record. */
export interface SynergyActivation {
  /** Timestamp of the synergy activation. */
  timestamp: number;
  /** ID of the player who activated (took) the synergy. */
  sourceID: number;
  /** Ability game ID. */
  abilityGameID: number;
  /** Resolved ability name, or null if unknown. */
  abilityName: string | null;
  /** Ability icon URL, or null if unknown. */
  abilityIcon: string | null;
}

/** Synergy usage grouped by ability. */
export interface SynergyByAbility {
  abilityGameID: number;
  abilityName: string | null;
  abilityIcon: string | null;
  totalCount: number;
  activations: SynergyActivation[];
}

/** Synergy usage grouped by player. */
export interface SynergyByPlayer {
  playerID: number;
  /** Character name. */
  playerName: string;
  /** Account display name (e.g. @UserName), or null if unavailable. */
  displayName: string | null;
  totalCount: number;
  synergies: Record<
    number,
    { count: number; abilityName: string | null; abilityIcon: string | null }
  >;
}

/** Aggregated synergy data for the panel. */
export interface SynergyPanelData {
  /** All synergy activations, sorted chronologically. */
  activations: SynergyActivation[];
  /** Synergy counts grouped by player. */
  byPlayer: SynergyByPlayer[];
  /** Synergy counts grouped by ability. */
  byAbility: SynergyByAbility[];
  /** Total synergy activations across all players. */
  totalCount: number;
}

/**
 * Extract synergy activations from cast events.
 *
 * @param castEvents - All cast events for the fight
 * @param abilitiesById - Ability lookup from master data
 * @param actorsById - Actor lookup from master data for player names
 * @param friendlyPlayerIds - IDs of friendly players in the fight
 */
export function extractSynergyData(
  castEvents: UnifiedCastEvent[],
  abilitiesById: Record<string | number, ReportAbilityFragment>,
  actorsById: Record<string | number, { name?: string | null; displayName?: string | null }>,
  friendlyPlayerIds: number[],
): SynergyPanelData {
  const friendlySet = new Set(friendlyPlayerIds);

  // Find all synergy cast events from friendly players
  const activations: SynergyActivation[] = [];
  for (const event of castEvents) {
    if (event.type !== 'cast') continue;
    if (!event.sourceIsFriendly) continue;
    if (!friendlySet.has(event.sourceID)) continue;
    if (!isSynergyAbility(event.abilityGameID)) continue;

    const ability = abilitiesById[event.abilityGameID];
    activations.push({
      timestamp: event.timestamp,
      sourceID: event.sourceID,
      abilityGameID: event.abilityGameID,
      abilityName: ability?.name ?? null,
      abilityIcon: ability?.icon ?? null,
    });
  }

  // Sort chronologically
  activations.sort((a, b) => a.timestamp - b.timestamp);

  // Group by player
  const playerMap = new Map<number, SynergyByPlayer>();
  for (const activation of activations) {
    let entry = playerMap.get(activation.sourceID);
    if (!entry) {
      const actor = actorsById[activation.sourceID];
      entry = {
        playerID: activation.sourceID,
        playerName: actor?.name ?? `Player ${activation.sourceID}`,
        displayName: actor?.displayName && actor.displayName !== 'nil' ? actor.displayName : null,
        totalCount: 0,
        synergies: {},
      };
      playerMap.set(activation.sourceID, entry);
    }
    entry.totalCount++;
    const existing = entry.synergies[activation.abilityGameID];
    if (existing) {
      existing.count++;
    } else {
      entry.synergies[activation.abilityGameID] = {
        count: 1,
        abilityName: activation.abilityName,
        abilityIcon: activation.abilityIcon,
      };
    }
  }

  // Group by ability
  const abilityMap = new Map<number, SynergyByAbility>();
  for (const activation of activations) {
    let entry = abilityMap.get(activation.abilityGameID);
    if (!entry) {
      entry = {
        abilityGameID: activation.abilityGameID,
        abilityName: activation.abilityName,
        abilityIcon: activation.abilityIcon,
        totalCount: 0,
        activations: [],
      };
      abilityMap.set(activation.abilityGameID, entry);
    }
    entry.totalCount++;
    entry.activations.push(activation);
  }

  const byPlayer = Array.from(playerMap.values()).sort((a, b) => b.totalCount - a.totalCount);
  const byAbility = Array.from(abilityMap.values()).sort((a, b) => b.totalCount - a.totalCount);

  return {
    activations,
    byPlayer,
    byAbility,
    totalCount: activations.length,
  };
}

/**
 * Filter synergy panel data to only include activations for the given ability IDs.
 */
export function filterSynergyData(
  data: SynergyPanelData,
  abilityIds: Set<number>,
): SynergyPanelData {
  const activations = data.activations.filter((a) => abilityIds.has(a.abilityGameID));

  // Rebuild byPlayer from filtered activations
  const playerMap = new Map<number, SynergyByPlayer>();
  for (const original of data.byPlayer) {
    const filteredSynergies: SynergyByPlayer['synergies'] = {};
    let count = 0;
    for (const [id, info] of Object.entries(original.synergies)) {
      if (abilityIds.has(Number(id))) {
        filteredSynergies[Number(id)] = info;
        count += info.count;
      }
    }
    if (count > 0) {
      playerMap.set(original.playerID, {
        ...original,
        totalCount: count,
        synergies: filteredSynergies,
      });
    }
  }

  // Rebuild byAbility from filtered activations
  const byAbility = data.byAbility.filter((a) => abilityIds.has(a.abilityGameID));

  const byPlayer = Array.from(playerMap.values()).sort((a, b) => b.totalCount - a.totalCount);

  return {
    activations,
    byPlayer,
    byAbility,
    totalCount: activations.length,
  };
}
