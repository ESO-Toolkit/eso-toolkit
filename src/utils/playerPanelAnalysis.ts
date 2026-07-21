/**
 * Combined per-player analysis for the report Players tab — the pure core of
 * the `calculatePlayerPanelAnalysis` worker task.
 *
 * These four computations (public class detection, bar-swap analysis,
 * max-resource scan, build-issue detection) were ~the entire main-thread burst
 * when opening or switching a fight: each is O(players × events) or does full
 * event-array passes, and they previously ran inside PlayersPanel useMemos,
 * blocking paint. They are combined into ONE task because the worker pool
 * structured-clones `task.data` per execute() across interchangeable workers —
 * one task means the (large) event arrays are cloned once, not four times.
 *
 * Pure and synchronous by design: the panel calls it directly on the main
 * thread for small fights (clone overhead would exceed the compute), and the
 * worker calls the same function for large ones — identical output shape.
 */

import {
  analyzeBarSwaps,
  type BarSwapAnalysisResult,
} from '../features/parse_analysis/utils/parseAnalysisUtils';
import type { CombatantAura, CombatantInfoEvent } from '../types/combatlogEvents';
import type { PlayerGear, PlayerTalent } from '../types/playerDetails';

import type { BuffLookupData } from './BuffLookupUtils';
import {
  analyzePlayerClassFromEvents,
  createSkillLineAbilityMapping,
  type ClassAnalysisResult,
} from './classDetectionUtils';
import { detectBuildIssues, type BuildIssue } from './detectBuildIssues';

// The bar-swap analyzer lives with the parse-analysis feature; its cast-event
// walk is pure and worker-safe.

/** Minimal structural shape of any event carrying unit resource snapshots. */
interface ResourceBearingEvent {
  type: string;
  timestamp: number;
  sourceID?: number;
  targetID?: number;
  sourceResources?: { maxHitPoints?: number; maxStamina?: number; maxMagicka?: number };
  targetResources?: { maxHitPoints?: number; maxStamina?: number; maxMagicka?: number };
}

export interface PlayerPanelAnalysisPlayer {
  id: number;
  role: 'dps' | 'tank' | 'healer';
  talents?: PlayerTalent[];
  /** Gear pre-filtered to real items (id !== 0), as the panel already does. */
  gear: PlayerGear[];
}

export interface PlayerPanelAnalysisInput {
  fightStartTime: number;
  fightEndTime: number;
  players: PlayerPanelAnalysisPlayer[];
  /* eslint-disable @typescript-eslint/no-explicit-any -- the analysis functions
     define their own event parameter types; this module forwards the arrays
     verbatim and must not force every caller through re-casts. */
  castEvents: any[];
  damageEvents: any[];
  healingEvents: any[];
  resourceEvents: any[];
  /* eslint-enable @typescript-eslint/no-explicit-any */
  combatantInfoEvents: CombatantInfoEvent[];
  friendlyBuffEvents: Parameters<typeof analyzePlayerClassFromEvents>[5];
  debuffEvents: Parameters<typeof analyzePlayerClassFromEvents>[6];
  abilitiesById: Parameters<typeof analyzePlayerClassFromEvents>[1];
  friendlyBuffLookup: BuffLookupData;
}

export interface PlayerMaxResources {
  health: number;
  stamina: number;
  magicka: number;
}

export interface PlayerPanelAnalysisResult {
  /** Echo of the analyzed fight window — consumers MUST match it against the
   *  current fight before using the maps, or a fight switch would briefly show
   *  the previous fight's analysis (player ids overlap across fights). */
  fightStartTime: number;
  fightEndTime: number;
  publicClassAnalysisByPlayer: Record<string, ClassAnalysisResult>;
  barSwapByPlayer: Record<string, BarSwapAnalysisResult>;
  maxResourcesByPlayer: Record<string, PlayerMaxResources>;
  buildIssuesByPlayer: Record<string, BuildIssue[]>;
}

/**
 * Events-total heuristic for the sync-vs-worker decision: below this, the
 * structured-clone cost of shipping the arrays to a worker exceeds the compute
 * itself, so the panel computes inline. Roughly a short solo/dummy fight.
 */
export const PLAYER_PANEL_ANALYSIS_SYNC_THRESHOLD = 20_000;

export function computePlayerPanelAnalysis(
  input: PlayerPanelAnalysisInput,
): PlayerPanelAnalysisResult {
  const {
    fightStartTime,
    fightEndTime,
    players,
    castEvents,
    damageEvents,
    healingEvents,
    resourceEvents,
    combatantInfoEvents,
    friendlyBuffEvents,
    debuffEvents,
    abilitiesById,
    friendlyBuffLookup,
  } = input;

  const publicClassAnalysisByPlayer: Record<string, ClassAnalysisResult> = {};
  const barSwapByPlayer: Record<string, BarSwapAnalysisResult> = {};
  const maxResourcesByPlayer: Record<string, PlayerMaxResources> = {};
  const buildIssuesByPlayer: Record<string, BuildIssue[]> = {};

  // ── Max resources: one pass over each resource-bearing stream ─────────────
  for (const player of players) {
    maxResourcesByPlayer[String(player.id)] = { health: 0, stamina: 0, magicka: 0 };
  }
  const updatePlayerResources = (
    playerId: string,
    resources: ResourceBearingEvent['sourceResources'],
  ): void => {
    const entry = maxResourcesByPlayer[playerId];
    if (!entry || !resources) return;
    if (resources.maxHitPoints) entry.health = Math.max(entry.health, resources.maxHitPoints);
    if (resources.maxStamina) entry.stamina = Math.max(entry.stamina, resources.maxStamina);
    if (resources.maxMagicka) entry.magicka = Math.max(entry.magicka, resources.maxMagicka);
  };
  const scanResourceStream = (events: ResourceBearingEvent[], type: string): void => {
    for (const event of events) {
      if (event.type !== type) continue;
      if (event.timestamp < fightStartTime || event.timestamp > fightEndTime) continue;
      if (event.sourceID && event.sourceResources) {
        updatePlayerResources(String(event.sourceID), event.sourceResources);
      }
      if (event.targetID && event.targetResources) {
        updatePlayerResources(String(event.targetID), event.targetResources);
      }
    }
  };
  scanResourceStream(resourceEvents ?? [], 'resourcechange');
  scanResourceStream(damageEvents ?? [], 'damage');
  scanResourceStream(healingEvents ?? [], 'heal');

  // ── Per-player analyses ──────────────────────────────────────────────────
  // Shared precompute — previously rebuilt per memo run; here once per task.
  const classMapping = abilitiesById ? createSkillLineAbilityMapping(abilitiesById) : undefined;
  const emptyBuffLookup: BuffLookupData = { buffIntervals: {} };

  for (const player of players) {
    const playerId = String(player.id);

    barSwapByPlayer[playerId] = analyzeBarSwaps(
      castEvents,
      player.id,
      fightStartTime,
      fightEndTime,
    );

    if (abilitiesById) {
      publicClassAnalysisByPlayer[playerId] = analyzePlayerClassFromEvents(
        playerId,
        abilitiesById,
        combatantInfoEvents,
        castEvents,
        damageEvents,
        friendlyBuffEvents,
        debuffEvents,
        player.talents,
        classMapping,
      );
    }

    const resourceSnapshot = maxResourcesByPlayer[playerId];
    const playerResourceProfile = resourceSnapshot
      ? { stamina: resourceSnapshot.stamina, magicka: resourceSnapshot.magicka }
      : undefined;

    const playerAuras: CombatantAura[] = [];
    const playerCombatantInfo = combatantInfoEvents?.find((event) => event.sourceID === player.id);
    if (playerCombatantInfo?.auras) {
      playerAuras.push(...playerCombatantInfo.auras);
    }

    buildIssuesByPlayer[playerId] = detectBuildIssues(
      player.gear,
      friendlyBuffLookup || emptyBuffLookup,
      fightStartTime,
      fightEndTime,
      playerAuras,
      player.role,
      damageEvents,
      player.id,
      playerResourceProfile,
    );
  }

  return {
    fightStartTime,
    fightEndTime,
    publicClassAnalysisByPlayer,
    barSwapByPlayer,
    maxResourcesByPlayer,
    buildIssuesByPlayer,
  };
}
