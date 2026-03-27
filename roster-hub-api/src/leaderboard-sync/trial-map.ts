/**
 * Maps ESO Logs zone/encounter data to Roster Hub trial IDs.
 *
 * Zone names from the ESO Logs API need to match the `trial_id` abbreviations
 * used in the Roster Hub (e.g., "Rockgrove" → "RG"). Each trial also specifies
 * which encounter ID to use for #1 ranking — typically the final/hardest boss.
 */

export interface TrialMapping {
  /** Roster Hub trial_id (e.g., "RG") */
  trialId: string;
  /** Human-readable name */
  displayName: string;
  /** ESO Logs encounter IDs to rank on (primary = first; try in order) */
  encounterIds: number[];
  /** Veteran difficulty ID (usually 101 for vet) */
  difficulty: number;
}

/**
 * ESO Logs zone name (lowercased) → trial mapping.
 *
 * Encounter IDs are sourced from the ESO Logs API (`worldData.zones[].encounters[].id`).
 * When the zone has multiple bosses, we use the final boss encounter since that's where
 * #1 rankings are most meaningful. The first encounterIds entry is preferred; subsequent
 * entries are fallbacks.
 *
 * Difficulty 101 = Veteran for all trials.
 */
const TRIAL_MAPPINGS: TrialMapping[] = [
  { trialId: 'AA', displayName: 'Aetherian Archive', encounterIds: [14], difficulty: 101 },
  { trialId: 'HRC', displayName: 'Hel Ra Citadel', encounterIds: [15], difficulty: 101 },
  { trialId: 'SO', displayName: 'Sanctum Ophidia', encounterIds: [16], difficulty: 101 },
  { trialId: 'MOL', displayName: 'Maw of Lorkhaj', encounterIds: [17], difficulty: 101 },
  { trialId: 'HOF', displayName: 'Halls of Fabrication', encounterIds: [18], difficulty: 101 },
  { trialId: 'AS', displayName: 'Asylum Sanctorium', encounterIds: [19], difficulty: 101 },
  { trialId: 'CR', displayName: 'Cloudrest', encounterIds: [20], difficulty: 101 },
  { trialId: 'SS', displayName: 'Sunspire', encounterIds: [21], difficulty: 101 },
  { trialId: 'KA', displayName: "Kyne's Aegis", encounterIds: [22], difficulty: 101 },
  { trialId: 'RG', displayName: 'Rockgrove', encounterIds: [23], difficulty: 101 },
  { trialId: 'DSR', displayName: 'Dreadsail Reef', encounterIds: [24], difficulty: 101 },
  { trialId: 'SE', displayName: "Sanity's Edge", encounterIds: [25], difficulty: 101 },
  { trialId: 'LC', displayName: 'Lucent Citadel', encounterIds: [26], difficulty: 101 },
  { trialId: 'OAC', displayName: 'Oathsworn Citadel', encounterIds: [27], difficulty: 101 },
];

/** All configured trials */
export function getTrialMappings(): readonly TrialMapping[] {
  return TRIAL_MAPPINGS;
}

/**
 * Build a lookup from ESO Logs zone name (lowercased) → trial mapping.
 * Used after fetching zone data from the API to match against our known trials.
 */
const ZONE_NAME_INDEX = new Map<string, TrialMapping>(
  TRIAL_MAPPINGS.map((t) => [t.displayName.toLowerCase(), t]),
);

export function findTrialByZoneName(zoneName: string): TrialMapping | undefined {
  return ZONE_NAME_INDEX.get(zoneName.toLowerCase());
}
