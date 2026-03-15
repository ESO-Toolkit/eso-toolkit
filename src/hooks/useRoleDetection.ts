import { useMemo } from 'react';

import {
  detectRoles,
  DetectedRole,
  ROLE_LABELS,
  type FightContext,
  type FightRoleDetectionResult,
  type PlayerRoleResult,
  type RoleDetectionEvents,
} from '@/features/role_detection';
import type { FightFragment, ReportActorFragment } from '@/graphql/gql/graphql';
import type {
  ApplyBuffEvent,
  ApplyDebuffEvent,
  BuffEvent,
  CastEvent,
  CombatantInfoEvent,
  DamageEvent,
  DebuffEvent,
  HealEvent,
  RemoveDebuffEvent,
  UnifiedCastEvent,
} from '@/types/combatlogEvents';

export { DetectedRole, ROLE_LABELS };

/** Broad role category for backward compatibility with existing UI filters. */
export type BroadRole = 'tank' | 'healer' | 'dps';

/** Maps a DetectedRole to the broad role category used by existing filters / stat chips. */
export function toBroadRole(role: DetectedRole): BroadRole {
  switch (role) {
    case DetectedRole.MainTank:
    case DetectedRole.OffTank:
      return 'tank';
    case DetectedRole.GroupHealer:
    case DetectedRole.ShieldHealer:
    case DetectedRole.BuffHealer:
      return 'healer';
    case DetectedRole.ParseDPS:
    case DetectedRole.SupportDPS:
      return 'dps';
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

/** Role emoji for the detected sub-roles. */
export function getRoleEmoji(role: DetectedRole): string {
  switch (role) {
    case DetectedRole.MainTank:
      return '🛡️';
    case DetectedRole.OffTank:
      return '🔰';
    case DetectedRole.ParseDPS:
      return '⚔️';
    case DetectedRole.SupportDPS:
      return '🎯';
    case DetectedRole.GroupHealer:
      return '❤️';
    case DetectedRole.ShieldHealer:
      return '🔮';
    case DetectedRole.BuffHealer:
      return '✨';
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export interface RoleDetectionInput {
  fight: FightFragment | null | undefined;
  actorsById: Record<string | number, ReportActorFragment>;
  damageEvents: DamageEvent[];
  healingEvents: HealEvent[];
  castEvents: UnifiedCastEvent[];
  debuffEvents: DebuffEvent[];
  friendlyBuffEvents: BuffEvent[];
  hostileBuffEvents: BuffEvent[];
  combatantInfoEvents: CombatantInfoEvent[];
}

export interface RoleDetectionOutput {
  /** Per-player detected role results keyed by player ID */
  rolesByPlayerId: Record<number, PlayerRoleResult>;
  /** Full detection result (null if input data insufficient) */
  detectionResult: FightRoleDetectionResult | null;
}

/**
 * Hook that runs role detection on already-fetched event data.
 * Returns detected roles keyed by player ID.
 */
export function useRoleDetection({
  fight,
  actorsById,
  damageEvents,
  healingEvents,
  castEvents,
  debuffEvents,
  friendlyBuffEvents,
  hostileBuffEvents,
  combatantInfoEvents,
}: RoleDetectionInput): RoleDetectionOutput {
  return useMemo(() => {
    if (!fight || !fight.friendlyPlayers || fight.friendlyPlayers.length === 0) {
      return { rolesByPlayerId: {}, detectionResult: null };
    }

    // Filter event unions to the specific sub-types needed by role detection
    const filteredCastEvents = castEvents.filter((e): e is CastEvent => e.type === 'cast');
    const applyDebuffEvents = debuffEvents.filter(
      (e): e is ApplyDebuffEvent => e.type === 'applydebuff',
    );
    const removeDebuffEvents = debuffEvents.filter(
      (e): e is RemoveDebuffEvent => e.type === 'removedebuff',
    );
    const allBuffs = [...friendlyBuffEvents, ...hostileBuffEvents];
    const applyBuffEvents = allBuffs.filter((e): e is ApplyBuffEvent => e.type === 'applybuff');

    const events: RoleDetectionEvents = {
      damageEvents,
      healEvents: healingEvents,
      castEvents: filteredCastEvents,
      applyDebuffEvents,
      removeDebuffEvents,
      applyBuffEvents,
      combatantInfoEvents,
    };

    // Build player names map from actorsById
    const playerNames = new Map<number, string>();
    const friendlyPlayerIds: number[] = [];
    for (const raw of fight.friendlyPlayers) {
      if (raw == null) continue;
      friendlyPlayerIds.push(raw);
      const actor = actorsById[raw];
      if (actor?.name) {
        playerNames.set(raw, actor.name);
      }
    }

    // Build enemy NPC IDs
    const enemyNpcIds: number[] = [];
    for (const npc of fight.enemyNPCs ?? []) {
      if (npc?.id != null) {
        enemyNpcIds.push(npc.id);
      }
    }

    const context: FightContext = {
      fightId: fight.id,
      startTime: fight.startTime,
      endTime: fight.endTime,
      friendlyPlayerIds,
      enemyNpcIds,
      primaryBossId: enemyNpcIds.length > 0 ? enemyNpcIds[0] : null,
      playerNames,
    };

    const result = detectRoles(events, context);

    const rolesByPlayerId: Record<number, PlayerRoleResult> = {};
    for (const pr of result.results) {
      rolesByPlayerId[pr.playerId] = pr;
    }

    return { rolesByPlayerId, detectionResult: result };
  }, [
    fight,
    actorsById,
    damageEvents,
    healingEvents,
    castEvents,
    debuffEvents,
    friendlyBuffEvents,
    hostileBuffEvents,
    combatantInfoEvents,
  ]);
}
