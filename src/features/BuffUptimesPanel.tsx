import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  ListItemButton,
} from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../store/storeWithHistory';

interface BuffUptimesPanelProps {
  fight: { startTime?: number; endTime?: number };
}

const BuffUptimesPanel: React.FC<BuffUptimesPanelProps> = ({ fight }) => {
  const events = useSelector((state: RootState) => state.events.events);
  const characters = useSelector((state: RootState) => state.events.characters);
  const players = useSelector((state: RootState) => state.events.players);
  const masterData = useSelector((state: RootState) => state.masterData);

  // Get all Player actors from masterData
  const playerActorIds = React.useMemo(() => {
    return Object.values(masterData.actorsById)
      .filter(
        (actor): actor is import('../graphql/generated').ReportActorFragment =>
          actor && actor.type === 'Player'
      )
      .map((actor) => String(actor.id));
  }, [masterData.actorsById]);

  const [expandedBuff, setExpandedBuff] = React.useState<string | null>(null);

  // Memoized calculation of buff uptimes and details
  const { buffUptimes, buffDetails } = React.useMemo(() => {
    const buffUptimes: Record<string, number> = {};
    const buffDetails: Record<string, Record<string, Array<{ start: number; end: number }>>> = {};
    if (events && events.length > 0 && fight && fight.startTime != null && fight.endTime != null) {
      const fightStart = Number(fight.startTime);
      const fightEnd = Number(fight.endTime);
      const fightDuration = fightEnd - fightStart;
      const activeBuffs: Record<string, Record<string, number>> = {};
      events.forEach((event) => {
        const eventType = (event.type || event._type || event.eventType || '').toLowerCase();
        const abilityGameID =
          event.abilityGameID || event.abilityId || event.buffId || event.id || 'unknown';

        switch (event.type) {
          case 'applybuff':
          case 'removebuff':
            break;
          default:
            return;
        }

        const ability = masterData.abilitiesById[event.abilityGameID || ''];

        // Not a buff
        if (ability.type !== '2') {
          return;
        }

        const targetId = String(event.targetID ?? event.target ?? 'unknown');
        if (!activeBuffs[abilityGameID]) activeBuffs[abilityGameID] = {};
        if (!buffDetails[abilityGameID]) buffDetails[abilityGameID] = {};
        if (!buffDetails[abilityGameID][targetId]) buffDetails[abilityGameID][targetId] = [];
        if (eventType === 'applybuff') {
          activeBuffs[abilityGameID][targetId] = Number(event.timestamp);
        } else if (eventType === 'removebuff' && activeBuffs[abilityGameID][targetId] != null) {
          const start = activeBuffs[abilityGameID][targetId];
          const end = Number(event.timestamp);
          buffDetails[abilityGameID][targetId].push({ start, end });
          delete activeBuffs[abilityGameID][targetId];
        }
      });
      // If any buffs are still active at fight end, close them
      Object.keys(activeBuffs).forEach((abilityGameID) => {
        Object.keys(activeBuffs[abilityGameID]).forEach((targetId) => {
          const start = activeBuffs[abilityGameID][targetId];
          const end = fightEnd;
          buffDetails[abilityGameID][targetId].push({ start, end });
        });
      });
      // Calculate uptime percentages using only Player actors
      Object.keys(buffDetails).forEach((abilityGameID) => {
        let totalBuffTime = 0;
        Object.entries(buffDetails[abilityGameID]).forEach(([targetId, intervals]) => {
          if (playerActorIds.includes(targetId)) {
            totalBuffTime += intervals.reduce(
              (sum, interval) => sum + (interval.end - interval.start),
              0
            );
          }
        });
        // Each player should have fightDuration worth of buff for 100%
        const denominator = playerActorIds.length * fightDuration;
        const uptimePercent = denominator > 0 ? (totalBuffTime / denominator) * 100 : 0;
        buffUptimes[abilityGameID] = uptimePercent;
      });
    }
    return { buffUptimes, buffDetails };
  }, [events, fight, masterData.abilitiesById, playerActorIds]);

  return (
    <Box>
      <Typography variant="h6">Buff Uptime Percentages</Typography>
      {Object.keys(buffUptimes).length > 0 ? (
        <List>
          {Object.keys(buffUptimes)
            .sort((a, b) => buffUptimes[b] - buffUptimes[a])
            .map((abilityGameID) => {
              const ability = masterData.abilitiesById[abilityGameID];
              // Calculate total time when ANY target had the buff
              const intervalsByTarget = buffDetails[abilityGameID] || {};
              const allIntervals: Array<{ start: number; end: number }> = [];
              Object.values(intervalsByTarget).forEach((intervals) => {
                allIntervals.push(...intervals);
              });
              // Merge overlapping intervals
              allIntervals.sort((a, b) => a.start - b.start);
              const merged: Array<{ start: number; end: number }> = [];
              for (const interval of allIntervals) {
                if (!merged.length || merged[merged.length - 1].end < interval.start) {
                  merged.push({ ...interval });
                } else {
                  merged[merged.length - 1].end = Math.max(
                    merged[merged.length - 1].end,
                    interval.end
                  );
                }
              }
              const fightStart = Number(fight?.startTime ?? 0);
              const fightEnd = Number(fight?.endTime ?? 1);
              const totalBuffTime = merged.reduce(
                (sum, interval) => sum + (interval.end - interval.start),
                0
              );
              const uptimePercent =
                fightEnd - fightStart > 0 ? (totalBuffTime / (fightEnd - fightStart)) * 100 : 0;

              // Calculate average uptime per target
              const targetUptimes: number[] = Object.values(intervalsByTarget).map((intervals) => {
                const targetBuffTime = intervals.reduce(
                  (sum, interval) => sum + (interval.end - interval.start),
                  0
                );
                return fightEnd - fightStart > 0
                  ? (targetBuffTime / (fightEnd - fightStart)) * 100
                  : 0;
              });
              const avgTargetUptime =
                targetUptimes.length > 0
                  ? targetUptimes.reduce((a, b) => a + b, 0) / targetUptimes.length
                  : 0;

              return (
                <React.Fragment key={abilityGameID}>
                  <ListItem divider>
                    <ListItemButton
                      onClick={() =>
                        setExpandedBuff(expandedBuff === abilityGameID ? null : abilityGameID)
                      }
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <>
                          {ability?.icon && (
                            <img
                              src={`https://assets.rpglogs.com/img/eso/abilities/${String(ability.icon)}.png`}
                              alt={ability?.name || `Buff ${abilityGameID}`}
                              style={{ width: 32, height: 32, marginRight: 12, borderRadius: 4 }}
                            />
                          )}
                          <ListItemText
                            primary={
                              ability?.name
                                ? `${ability.name} (${abilityGameID})`
                                : `Buff ${abilityGameID}`
                            }
                            secondary={`Total Uptime: ${uptimePercent.toFixed(2)}% | Avg per Target: ${avgTargetUptime.toFixed(2)}%`}
                          />
                        </>
                      </Box>
                      <Box sx={{ width: 200, ml: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={uptimePercent}
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                      </Box>
                    </ListItemButton>
                  </ListItem>
                  {expandedBuff === abilityGameID && (
                    <Box sx={{ pl: 4, pb: 2 }}>
                      <Typography variant="subtitle1">Buff Uptime Details by Target</Typography>
                      <List>
                        {Object.entries(buffDetails[abilityGameID] || {})
                          .filter(([targetId]) => playerActorIds.includes(targetId))
                          .map(([targetId, intervals]) => {
                            const fightStart = Number(fight?.startTime ?? 0);
                            const fightEnd = Number(fight?.endTime ?? 1);
                            const totalBuffTime = intervals.reduce(
                              (sum, interval) => sum + (interval.end - interval.start),
                              0
                            );
                            const uptimePercent =
                              fightEnd - fightStart > 0
                                ? (totalBuffTime / (fightEnd - fightStart)) * 100
                                : 0;
                            let targetName = `Target: ${targetId}`;
                            // Try to resolve player name/displayName from Redux state
                            if (players[targetId]) {
                              const playerName = players[targetId].name;
                              const displayName = players[targetId].displayName;
                              targetName = displayName
                                ? `${playerName} (${displayName})`
                                : `${playerName}`;
                            } else {
                              // fallback to character lookup if available
                              const charId = Number(targetId);
                              if (characters[charId]) {
                                const charName = characters[charId].name;
                                const displayName = characters[charId].displayName;
                                targetName = displayName
                                  ? `${charName} (${displayName})`
                                  : `${charName}`;
                              }
                            }
                            return (
                              <ListItem key={targetId}>
                                <ListItemText
                                  primary={targetName}
                                  secondary={`Uptime: ${uptimePercent.toFixed(2)}%`}
                                />
                                <Box sx={{ width: 200, ml: 2 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={uptimePercent}
                                    sx={{ height: 10, borderRadius: 5 }}
                                  />
                                </Box>
                              </ListItem>
                            );
                          })}
                      </List>
                    </Box>
                  )}
                </React.Fragment>
              );
            })}
        </List>
      ) : (
        <Typography>No buff events found. Check event structure in console log.</Typography>
      )}
    </Box>
  );
};

export default BuffUptimesPanel;
