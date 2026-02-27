/**
 * Utilities for detecting and classifying ESO combat potion types.
 *
 * Detection strategy (two complementary paths):
 *
 * Path A – combatantinfo snapshot (used by detectPotionType):
 *   Checks the aura list captured at fight start for buff ID clusters that are
 *   exclusive to specific potion types (Tri-Stat, Heroism, etc.).
 *
 * Path B – live event stream (used by classifyPotionEventsFromBuffStream):
 *   Anchors on self-applied resource-restore events whose abilityGameID is in
 *   POTION_RESOURCE_RESTORE_IDS.  Each anchor event is classified by comparing
 *   the buff events that fire at the same millisecond (±150 ms).  Because ESO
 *   Logs does not expose a "Potion Cooldown Timer" buff, these resource-restore
 *   IDs are the most reliable real-world signals for potion use.
 *
 *   First use:  'applybuff' events fire alongside the resource restore and
 *               reveal the potion type via buff-ID clusters.
 *   Subsequent: Buffs are still active (refresh only), so no new 'applybuff'
 *               fires.  The type is inferred from the resource-restore ID pair
 *               (stamina + magicka together → heroism / tri-stat) or from the
 *               per-player type cached from the first use.
 *
 * Both paths share the same classification helpers and PotionType enum.
 */

import {
  HEROISM_POTION_BUFF_IDS,
  MAGICKA_POTION_RESTORE_EFFECT,
  POTION_MAGICKA_RESTORE_IDS,
  POTION_RESOURCE_RESTORE_IDS,
  POTION_STAMINA_RESTORE_IDS,
  POTION_TIMER_IDS,
  STAMINA_POTION_RESTORE_EFFECT,
  TRI_STAT_POTION_BUFF_GROUP_A,
  TRI_STAT_POTION_BUFF_GROUP_B,
} from '../types/abilities';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export type PotionType =
  | 'tri-stat'
  | 'heroism'
  | 'weapon-power'
  | 'spell-power'
  | 'magicka'
  | 'stamina'
  | 'health'
  | 'unknown'
  | 'none';

/** Which resource(s) a potion restored. */
export type ResourceRestored = 'health' | 'magicka' | 'stamina' | 'all' | 'none';

/**
 * Per-player potion classification derived from the live fight event stream
 * (as produced by {@link classifyPotionEventsFromBuffStream}).
 */
export interface PotionStreamResult {
  /** Classified potion type determined from co-occurring buff events. */
  type: PotionType;
  /**
   * How many distinct potion activations were detected for this player during
   * the fight (= number of Potion Timer `applybuff` events, deduplicated by
   * a 200 ms same-tick window).
   */
  count: number;
  /** What resource(s) the potion primarily restored. */
  resourceRestored: ResourceRestored;
}

// --------------------------------------------------------------------------
// Major Heroism aura IDs (appear when a Heroism potion is active).
// This buff is provided by a small number of sources; its presence alongside
// other potion buff clusters is a strong signal.
// --------------------------------------------------------------------------
const MAJOR_HEROISM_IDS = new Set([
  61709, 63705, 63707, 65133, 87234, 92775, 94165, 94172, 94179, 111377, 111380, 150974, 193747,
  194148, 194149, 213946, 236448,
]);

// Minimum self-applied resource change (absolute value) to be considered a
// potion restore rather than passive regen, proc, or channel tick.
const MIN_POTION_RESOURCE_CHANGE = 500;

// Window (ms) around a resource-restore anchor event to collect associated
// applybuff/refreshbuff events for potion-type classification.
// Empirically, potion buff events are atomically co-emitted (delta=0) with their
// resource restore. The first unrelated buff seen in fight data was at +317 ms.
// 5 ms provides a safe margin for any ESO Logs same-tick batching jitter.
const BUFF_CLUSTER_WINDOW_MS = 5;

// --------------------------------------------------------------------------
// Detection helpers
// --------------------------------------------------------------------------

/** Returns true when ANY of the provided IDs appear in the aura list. */
function hasAuraById(
  auras: Array<{ name: string; id: number }>,
  idSet: ReadonlySet<number>,
): boolean {
  return auras.some((a) => idSet.has(a.id));
}

/** Returns true when the aura list contains an entry whose name matches the pattern. */
function hasAuraByName(auras: Array<{ name: string; id: number }>, nameRegexp: RegExp): boolean {
  return auras.some((a) => nameRegexp.test(a.name ?? ''));
}

/**
 * Returns true when at least `threshold` of the IDs in `group` are present
 * in `buffIdSet`.
 */
function hasBufCluster(
  buffIdSet: ReadonlySet<number>,
  group: ReadonlySet<number>,
  threshold = 2,
): boolean {
  let count = 0;
  for (const id of group) {
    if (buffIdSet.has(id)) count++;
    if (count >= threshold) return true;
  }
  return false;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Detects what type of combat potion a player used based on their aura list.
 *
 * When `potionUse` is 0 and no recognisable potion buff cluster is present in
 * the aura list the function returns `'none'`.  When a type cannot be
 * determined `'unknown'` is returned.
 *
 * Note: ESO Logs does not expose a reliable "Potion Cooldown Timer" buff, so
 * this function works purely from buff presence rather than gating on a timer
 * ID.  For in-fight uses prefer Path B ({@link classifyPotionEventsFromBuffStream}).
 *
 * @param auras     - The player's aura list from the WCL payload.
 * @param potionUse - Number of potions used (from `PlayerDetailsEntry.potionUse`).
 */
export function detectPotionType(
  auras: Array<{ name: string; id: number; stacks?: number }> | undefined,
  potionUse: number,
): PotionType {
  // When no aura data is available fall back to the potionUse count alone.
  if (!auras || auras.length === 0) {
    return potionUse === 0 ? 'none' : 'unknown';
  }

  const auraIdSet = new Set(auras.map((a) => a.id));

  // Check for any recognisable potion buff cluster even when potionUse === 0
  // (ESO Logs often returns 0 for this field even when potions were consumed).
  const hasTriStatGroupA = hasBufCluster(auraIdSet, TRI_STAT_POTION_BUFF_GROUP_A, 2);
  const hasTriStatGroupB = hasBufCluster(auraIdSet, TRI_STAT_POTION_BUFF_GROUP_B, 2);
  const hasHeroismBuff =
    hasAuraById(auras, HEROISM_POTION_BUFF_IDS) ||
    hasAuraById(auras, MAJOR_HEROISM_IDS) ||
    hasAuraByName(auras, /^Major Heroism$/i);

  const hasMajorBrutality = hasAuraByName(auras, /^Major Brutality$/i);
  const hasMajorSavagery = hasAuraByName(auras, /^Major Savagery$/i);
  const hasMajorSorcery = hasAuraByName(auras, /^Major Sorcery$/i);
  const hasMajorProphecy = hasAuraByName(auras, /^Major Prophecy$/i);

  const hasPotionSignal =
    potionUse > 0 ||
    hasTriStatGroupA ||
    hasTriStatGroupB ||
    hasHeroismBuff ||
    // Legacy IDs kept for backward compatibility (always empty sets now):
    hasAuraById(auras, STAMINA_POTION_RESTORE_EFFECT) ||
    hasAuraById(auras, MAGICKA_POTION_RESTORE_EFFECT) ||
    hasAuraById(auras, POTION_TIMER_IDS);

  if (!hasPotionSignal) return 'none';

  // --- Stage 1: Tri-Stat potion buff clusters (highest confidence) ---------

  if (hasTriStatGroupA || hasTriStatGroupB) return 'tri-stat';

  // --- Stage 2: Heroism potion -----------------------------------------------

  if (hasHeroismBuff) return 'heroism';

  // --- Stage 3: legacy exclusive IDs (kept for any legacy data) -------------

  // Stamina Potion Restore Effect
  if (hasAuraById(auras, STAMINA_POTION_RESTORE_EFFECT)) return 'stamina';
  // Magicka Potion Restore Effect
  if (hasAuraById(auras, MAGICKA_POTION_RESTORE_EFFECT)) return 'magicka';

  // --- Stage 4: well-known buff combos (good confidence) -------------------

  if (hasMajorBrutality && hasMajorSavagery) return 'weapon-power';
  if (hasMajorSorcery && hasMajorProphecy) return 'spell-power';

  // --- Stage 5: single-buff name patterns (lower confidence) ---------------

  if (hasAuraByName(auras, /stamina.?potion|restore.?stamina.*potion/i)) return 'stamina';
  if (hasAuraByName(auras, /magicka.?potion|restore.?magicka.*potion/i)) return 'magicka';
  if (hasAuraByName(auras, /health.?potion|restore.?health.*potion/i)) return 'health';

  // Potions were used but we couldn't classify the type from the aura data.
  return 'unknown';
}

// --------------------------------------------------------------------------
// Event-stream classification (Path B)
// --------------------------------------------------------------------------

/**
 * Merges timestamps that are less than `minGapMs` apart into a single entry
 * (the same game tick can fire multiple resource-change events for the same
 * potion use).
 */
function deduplicateTimestamps(timestamps: number[], minGapMs: number): number[] {
  const sorted = [...timestamps].sort((a, b) => a - b);
  const unique: number[] = [];
  for (const ts of sorted) {
    if (unique.length === 0 || ts - unique[unique.length - 1] > minGapMs) {
      unique.push(ts);
    }
  }
  return unique;
}

/**
 * Classifies a single potion activation given the set of buff ability IDs that
 * appeared within {@link BUFF_CLUSTER_WINDOW_MS} ms of the anchor resource
 * event, and the set of potion restore ability IDs that fired at the same
 * millisecond for the same player.
 *
 * Falls back to inferring from the restore IDs when no informative buff was
 * applied (e.g. on a "refresh" use where the buff was already active).
 */
function classifyFromClusters(
  buffIds: ReadonlySet<number>,
  buffNames: ReadonlySet<string>,
  restoreIds: ReadonlySet<number>,
): PotionType {
  // ── highest confidence: Tri-Stat buff clusters ─────────────────────────
  if (hasBufCluster(buffIds, TRI_STAT_POTION_BUFF_GROUP_A, 2)) return 'tri-stat';
  if (hasBufCluster(buffIds, TRI_STAT_POTION_BUFF_GROUP_B, 2)) return 'tri-stat';

  // ── Tri-Stat by resource pair (Variant A exclusive IDs: 68409 stamina + 68407 magicka) ─
  // Note: 45223 (Heroism magicka) is intentionally NOT included here — it belongs
  // to heroism-type potions and is handled by the 45225+45223 check below.
  if (restoreIds.has(68409) && restoreIds.has(68407)) return 'tri-stat';

  // ── Heroism: Lorkhan's Tears identify via magicka + stamina restore pair ─
  // (45223=Restore Magicka + 45225=Restore Stamina fired together)
  if (restoreIds.has(45223) && restoreIds.has(45225)) return 'heroism';

  // ── Heroism via buff IDs ─────────────────────────────────────────────────
  for (const id of HEROISM_POTION_BUFF_IDS) {
    if (buffIds.has(id)) return 'heroism';
  }
  // Major Heroism by name (Minor Heroism intentionally excluded — see HEROISM_POTION_BUFF_IDS)
  for (const name of buffNames) {
    if (/^Major Heroism$/i.test(name)) return 'heroism';
  }

  // ── Spell Power: Major Sorcery + Major Prophecy ─────────────────────────
  if (buffNames.has('Major Sorcery') && buffNames.has('Major Prophecy')) return 'spell-power';

  // ── Weapon Power: Major Brutality + Major Savagery ──────────────────────
  if (buffNames.has('Major Brutality') && buffNames.has('Major Savagery')) return 'weapon-power';

  // ── Infer from resource restore IDs alone ───────────────────────────────
  if (
    restoreIds.has(45225) || // Restore Stamina (stamina-type variants)
    restoreIds.has(17328) // Restore Stamina (lower-stat variant)
  ) {
    return 'stamina';
  }
  if (restoreIds.has(45223) || restoreIds.has(68407)) return 'magicka';

  return 'unknown';
}

/**
 * Infers the resource(s) restored by a potion from its classified type and
 * the restore IDs actually observed.
 */
function deriveResourceRestoredFromType(
  potionType: PotionType,
  restoreIds: ReadonlySet<number>,
): ResourceRestored {
  if (potionType === 'tri-stat' || potionType === 'heroism') return 'all';

  const hasStamina = [...restoreIds].some((id) => POTION_STAMINA_RESTORE_IDS.has(id));
  const hasMagicka = [...restoreIds].some((id) => POTION_MAGICKA_RESTORE_IDS.has(id));
  if (hasStamina && hasMagicka) return 'all';
  if (hasStamina) return 'stamina';
  if (hasMagicka) return 'magicka';

  switch (potionType) {
    case 'weapon-power':
      return 'stamina';
    case 'spell-power':
      return 'magicka';
    case 'stamina':
      return 'stamina';
    case 'magicka':
      return 'magicka';
    case 'health':
      return 'health';
    default:
      return 'none';
  }
}

/**
 * Classifies each player's potion usage from the live fight event stream.
 *
 * **Anchor strategy** (replaces the old POTION_TIMER_IDS approach):
 * ESO Logs does not expose a "Potion Cooldown Timer" buff.  Instead, this
 * function anchors on self-applied resource-change events whose `abilityGameID`
 * is in {@link POTION_RESOURCE_RESTORE_IDS}  (e.g. 45225 = Restore Stamina,
 * 17328 = Restore Stamina, 45223 = Restore Magicka, etc.).  These IDs are
 * exclusive to potion use in the ESO Logs data.
 *
 * **First vs subsequent uses**:
 * On the first use `applybuff` events co-occur at the same millisecond and
 * reveal the potion type via buff-ID clusters.  On subsequent uses the buff is
 * already active (refresh) and no new `applybuff` fires, so the type is
 * inferred from the resource-restore ID pair or cached from the first use.
 *
 * @param buffEvents     - Friendly applybuff/refreshbuff events from the fight.
 * @param resourceEvents - Resource-change events from the fight.
 * @param abilitiesById  - Ability lookup map: id → `{ name? }`.
 * @param windowMs       - (unused, kept for API compatibility) Legacy parameter
 *                         from the old timer-based algorithm; detection now uses
 *                         a fixed {@link BUFF_CLUSTER_WINDOW_MS} window.
 * @returns              A record keyed by stringified player ID.
 */
export function classifyPotionEventsFromBuffStream(
  buffEvents: ReadonlyArray<{
    timestamp: number;
    type: string;
    targetID: number;
    abilityGameID: number;
  }>,
  resourceEvents: ReadonlyArray<{
    timestamp: number;
    type: string;
    targetID: number;
    sourceID?: number;
    abilityGameID: number;
    resourceChange: number;
    resourceChangeType: number;
  }>,
  abilitiesById: Readonly<Record<string | number, { name?: string | null }>>,
  _windowMs = 1000,
): Record<string, PotionStreamResult> {
  const result: Record<string, PotionStreamResult> = {};

  // ── Step 1: collect potion anchor events (self-applied resource restores) ─
  //
  // "Self-applied" means sourceID === targetID.  When sourceID is absent (as in
  // some legacy test fixtures) we accept the event unconditionally.
  const potionRestoresByPlayer = new Map<number, number[]>();
  for (const ev of resourceEvents) {
    if (
      ev.type === 'resourcechange' &&
      POTION_RESOURCE_RESTORE_IDS.has(ev.abilityGameID) &&
      Math.abs(ev.resourceChange) >= MIN_POTION_RESOURCE_CHANGE &&
      (ev.sourceID === undefined || ev.sourceID === ev.targetID)
    ) {
      const list = potionRestoresByPlayer.get(ev.targetID);
      if (list) {
        list.push(ev.timestamp);
      } else {
        potionRestoresByPlayer.set(ev.targetID, [ev.timestamp]);
      }
    }
  }

  if (potionRestoresByPlayer.size === 0) return result;

  // ── Step 2: pre-index buff events by targetID ────────────────────────────
  const buffsByPlayer = new Map<
    number,
    Array<{ timestamp: number; abilityGameID: number; type: string }>
  >();
  for (const ev of buffEvents) {
    if (ev.type === 'applybuff' || ev.type === 'refreshbuff') {
      const list = buffsByPlayer.get(ev.targetID);
      if (list) {
        list.push(ev);
      } else {
        buffsByPlayer.set(ev.targetID, [ev]);
      }
    }
  }

  // ── Step 3: pre-index resource events by targetID ────────────────────────
  const resourcesByPlayer = new Map<
    number,
    Array<{ timestamp: number; abilityGameID: number; resourceChange: number }>
  >();
  for (const ev of resourceEvents) {
    if (
      ev.type === 'resourcechange' &&
      (ev.sourceID === undefined || ev.sourceID === ev.targetID)
    ) {
      const list = resourcesByPlayer.get(ev.targetID);
      if (list) {
        list.push(ev);
      } else {
        resourcesByPlayer.set(ev.targetID, [ev]);
      }
    }
  }

  // ── Step 4: classify each player ─────────────────────────────────────────
  for (const [playerId, rawTimestamps] of potionRestoresByPlayer) {
    const uniqueTimestamps = deduplicateTimestamps(rawTimestamps, 200);
    const count = uniqueTimestamps.length;

    const playerBuffs = buffsByPlayer.get(playerId) ?? [];
    const playerRestores = resourcesByPlayer.get(playerId) ?? [];

    // Try to classify each use; take the first non-unknown result and cache it.
    let cachedType: PotionType | null = null;
    let finalResourceRestored: ResourceRestored = 'none';

    for (const ts of uniqueTimestamps) {
      // Buff IDs applied within BUFF_CLUSTER_WINDOW_MS of this use.
      const buffIds = new Set<number>();
      const buffNames = new Set<string>();
      for (const ev of playerBuffs) {
        if (Math.abs(ev.timestamp - ts) <= BUFF_CLUSTER_WINDOW_MS) {
          buffIds.add(ev.abilityGameID);
          const name = abilitiesById[ev.abilityGameID]?.name;
          if (name) buffNames.add(name);
        }
      }

      // Potion restore IDs (from POTION_RESOURCE_RESTORE_IDS) that fired
      // within BUFF_CLUSTER_WINDOW_MS for this player at this timestamp.
      const restoreIdsAtTs = new Set<number>();
      for (const ev of playerRestores) {
        if (
          Math.abs(ev.timestamp - ts) <= BUFF_CLUSTER_WINDOW_MS &&
          POTION_RESOURCE_RESTORE_IDS.has(ev.abilityGameID) &&
          Math.abs(ev.resourceChange) >= MIN_POTION_RESOURCE_CHANGE
        ) {
          restoreIdsAtTs.add(ev.abilityGameID);
        }
      }

      const type = classifyFromClusters(buffIds, buffNames, restoreIdsAtTs);
      if (type !== 'unknown' && cachedType === null) {
        cachedType = type;
        finalResourceRestored = deriveResourceRestoredFromType(type, restoreIdsAtTs);
      }
    }

    // If no use could be classified from buffs, try to infer from the restore
    // IDs pooled across ALL uses (most reliable for repeated same-potion uses).
    if (cachedType === null) {
      const allRestoreIds = new Set<number>();
      for (const ts of uniqueTimestamps) {
        for (const ev of playerRestores) {
          if (
            Math.abs(ev.timestamp - ts) <= BUFF_CLUSTER_WINDOW_MS &&
            POTION_RESOURCE_RESTORE_IDS.has(ev.abilityGameID)
          ) {
            allRestoreIds.add(ev.abilityGameID);
          }
        }
      }
      cachedType = classifyFromClusters(new Set(), new Set(), allRestoreIds);
      finalResourceRestored = deriveResourceRestoredFromType(cachedType, allRestoreIds);
    }

    result[String(playerId)] = {
      type: cachedType ?? 'unknown',
      count,
      resourceRestored: finalResourceRestored,
    };
  }

  return result;
}

// --------------------------------------------------------------------------
// Display helpers
// --------------------------------------------------------------------------

/**
 * Returns a short (≤5 char) display label for the potion type suitable for
 * compact UI display.
 */
export function abbreviatePotion(potionType: PotionType): string {
  switch (potionType) {
    case 'tri-stat':
      return 'TRI';
    case 'heroism':
      return 'HERO';
    case 'weapon-power':
      return 'WPN';
    case 'spell-power':
      return 'SPL';
    case 'stamina':
      return 'STAM';
    case 'magicka':
      return 'MAG';
    case 'health':
      return 'HP';
    case 'unknown':
      return '?';
    case 'none':
      return 'NONE';
  }
}

/**
 * Returns a CSS colour string for the given potion type, consistent with the
 * palette used for food buffs in `foodDetectionUtils`.
 */
export function getPotionColor(potionType: PotionType): string {
  switch (potionType) {
    case 'tri-stat':
      return '#4CAF50'; // Green – matches tri-stat food
    case 'heroism':
      return '#FFD700'; // Gold – heroism / ultimate generation
    case 'weapon-power':
      return '#FF9800'; // Orange – physical / stamina energy
    case 'spell-power':
      return '#9C27B0'; // Purple – magic energy
    case 'stamina':
      return '#8BC34A'; // Light green – stamina
    case 'magicka':
      return '#3F51B5'; // Blue – magicka, matches magicka food
    case 'health':
      return '#F44336'; // Red – health, matches health food
    case 'unknown':
    case 'none':
      return '#888';
  }
}

/**
 * Returns a human-readable description of the potion type for tooltip display.
 */
export function describePotionType(potionType: PotionType): string {
  switch (potionType) {
    case 'tri-stat':
      return 'Tri-Stat Potion (Health, Magicka & Stamina)';
    case 'heroism':
      return 'Heroism Potion (Major Heroism – boosts Ultimate generation)';
    case 'weapon-power':
      return 'Weapon Power Potion (Major Brutality & Savagery)';
    case 'spell-power':
      return 'Spell Power Potion (Major Sorcery & Prophecy)';
    case 'stamina':
      return 'Stamina Potion';
    case 'magicka':
      return 'Magicka Potion';
    case 'health':
      return 'Health Potion';
    case 'unknown':
      return 'Potion (type undetected)';
    case 'none':
      return 'No potion used';
  }
}
/**
 * Returns a short human-readable description of what resource a potion
 * restored, suitable for tooltip display.
 */
export function describeResourceRestored(resource: ResourceRestored): string {
  switch (resource) {
    case 'health':
      return 'Health';
    case 'magicka':
      return 'Magicka';
    case 'stamina':
      return 'Stamina';
    case 'all':
      return 'Health, Magicka & Stamina';
    case 'none':
      return 'Unknown';
  }
}
