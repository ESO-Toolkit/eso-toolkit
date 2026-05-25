/**
 * Role Detection — Main Entry Point
 *
 * Detects player roles (Main Tank, Off Tank, Parse DPS, Support DPS,
 * Group Healer, Shield Healer) from ESO combat log data.
 *
 * Usage:
 *   const result = detectRoles(events, context);
 *   for (const player of result.results) {
 *     console.log(`${player.playerName}: ${ROLE_LABELS[player.role]} (${player.confidence}%)`);
 *   }
 */

import { classifyPlayers } from './classifyPlayers';
import { extractSignals, FightContext, RoleDetectionEvents } from './extractSignals';
import { FightRoleDetectionResult } from './types';

export { ROLE_LABELS, DetectedRole } from './types';
export type { FightContext, RoleDetectionEvents } from './extractSignals';
export type { FightRoleDetectionResult, PlayerRoleResult, PlayerRoleSignals } from './types';

/**
 * Detect roles for all players in a fight.
 *
 * @param events - The combat log events for the fight, pre-filtered by type
 * @param context - Fight metadata (duration, player IDs, boss ID)
 * @returns Classification result for each player
 */
export function detectRoles(
  events: RoleDetectionEvents,
  context: FightContext,
): FightRoleDetectionResult {
  const fightDurationMs = context.endTime - context.startTime;

  // Phase 1: Extract signals
  const signals = extractSignals(events, context);

  // Phase 2: Classify
  const results = classifyPlayers(signals, fightDurationMs);

  return {
    fightId: context.fightId,
    fightDurationMs,
    playerCount: context.friendlyPlayerIds.length,
    results,
  };
}
