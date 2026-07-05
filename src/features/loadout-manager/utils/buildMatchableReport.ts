/**
 * Build the minimal `MatchableReport` the ESOTK Companion matcher needs from the store's
 * player roster + report registry entry. Extracted so every companion consumer (the
 * Players-tab panel and the crit-damage graph) builds an identical report and therefore
 * matches each snapshot to the same actor.
 */

import type { PlayerDetailsWithRole } from '@/store/player_data/playerDataSlice';
import type { selectReportRegistryEntryForContext } from '@/store/report/reportSelectors';

import type { MatchableReport } from './esotkCompanionMatcher';

export function buildMatchableReport(
  playersById: Record<string | number, PlayerDetailsWithRole>,
  reportEntry: ReturnType<typeof selectReportRegistryEntryForContext>,
): MatchableReport | null {
  const data = reportEntry?.data;
  if (!data?.startTime) return null;

  const actors = Object.values(playersById)
    .filter((player) => player.id !== undefined && player.name)
    .map((player) => ({
      id: player.id,
      name: player.name,
      server: player.server,
    }));
  if (actors.length === 0) return null;

  const fights =
    reportEntry?.fightIds
      .map((fightId) => reportEntry.fightsById[fightId])
      .filter((fight): fight is NonNullable<typeof fight> => Boolean(fight))
      .map((fight) => ({
        id: fight.id,
        startTime: fight.startTime,
        endTime: fight.endTime,
        zoneId: fight.gameZone?.id,
      })) ?? [];

  return {
    startTime: data.startTime,
    endTime: data.endTime,
    actors,
    fights,
  };
}
