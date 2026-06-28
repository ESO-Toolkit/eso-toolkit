import type { ReportActorFragment } from '@/graphql/gql/graphql';
import type { CombatantInfoEvent } from '@/types/combatlogEvents';

import type { PlayerDetailsWithRole } from './playerDataSlice';

export const hasPlayerEntries = (
  players: Record<string | number, PlayerDetailsWithRole> | null | undefined,
): players is Record<string | number, PlayerDetailsWithRole> =>
  Boolean(players && Object.keys(players).length > 0);

interface RoleDetectionResultLike {
  role: string;
}

interface BuildFallbackPlayersInput {
  friendlyPlayerIds?: readonly (number | null | undefined)[];
  actorsById: Record<string | number, ReportActorFragment>;
  combatantInfoEvents: readonly CombatantInfoEvent[];
  rolesByPlayerId?: Record<number, RoleDetectionResultLike>;
}

const normalizeDisplayName = (displayName: string | null | undefined): string => {
  if (!displayName || displayName === 'nil') {
    return '';
  }
  return displayName;
};

const toBroadRole = (role: string | undefined): PlayerDetailsWithRole['role'] => {
  switch (role) {
    case 'main_tank':
    case 'off_tank':
      return 'tank';
    case 'group_healer':
    case 'shield_healer':
    case 'buff_healer':
      return 'healer';
    default:
      return 'dps';
  }
};

const getCandidatePlayerIds = ({
  friendlyPlayerIds,
  combatantInfoEvents,
}: Pick<BuildFallbackPlayersInput, 'friendlyPlayerIds' | 'combatantInfoEvents'>): Set<number> => {
  const ids = new Set<number>();

  friendlyPlayerIds?.forEach((id) => {
    if (typeof id === 'number') {
      ids.add(id);
    }
  });

  if (ids.size > 0) {
    return ids;
  }

  combatantInfoEvents.forEach((event) => {
    if (event.type === 'combatantinfo' && typeof event.sourceID === 'number') {
      ids.add(event.sourceID);
    }
  });

  return ids;
};

const getLatestCombatantInfoByPlayer = (
  combatantInfoEvents: readonly CombatantInfoEvent[],
  playerIds: Set<number>,
): Map<number, CombatantInfoEvent> => {
  const latestByPlayer = new Map<number, CombatantInfoEvent>();

  combatantInfoEvents.forEach((event) => {
    if (event.type !== 'combatantinfo' || !playerIds.has(event.sourceID)) {
      return;
    }

    const current = latestByPlayer.get(event.sourceID);
    if (!current || (event.timestamp ?? 0) >= (current.timestamp ?? 0)) {
      latestByPlayer.set(event.sourceID, event);
    }
  });

  return latestByPlayer;
};

export const buildFallbackPlayersFromMasterData = ({
  friendlyPlayerIds,
  actorsById,
  combatantInfoEvents,
  rolesByPlayerId = {},
}: BuildFallbackPlayersInput): Record<string | number, PlayerDetailsWithRole> => {
  const candidatePlayerIds = getCandidatePlayerIds({ friendlyPlayerIds, combatantInfoEvents });
  if (candidatePlayerIds.size === 0) {
    return {};
  }

  const latestCombatantInfoByPlayer = getLatestCombatantInfoByPlayer(
    combatantInfoEvents,
    candidatePlayerIds,
  );
  const playersById: Record<string | number, PlayerDetailsWithRole> = {};

  candidatePlayerIds.forEach((playerId) => {
    const actor = actorsById[playerId] ?? actorsById[String(playerId)];
    if (!actor || actor.type !== 'Player') {
      return;
    }

    const latestCombatantInfo = latestCombatantInfoByPlayer.get(playerId);
    const className = actor.subType ?? 'Unknown';

    playersById[playerId] = {
      name: actor.name ?? `Player ${playerId}`,
      id: playerId,
      guid: typeof actor.gameID === 'number' ? actor.gameID : playerId,
      type: className,
      server: actor.server ?? '',
      displayName: normalizeDisplayName(actor.displayName),
      anonymous: Boolean(actor.anonymous),
      icon: actor.icon ?? '',
      specs: actor.subType ? [{ spec: actor.subType, count: 1 }] : [],
      minItemLevel: undefined,
      maxItemLevel: undefined,
      potionUse: 0,
      healthstoneUse: 0,
      combatantInfo: {
        stats: [],
        talents: [],
        gear: latestCombatantInfo?.gear ?? [],
      },
      role: toBroadRole(rolesByPlayerId[playerId]?.role),
    };
  });

  return playersById;
};
