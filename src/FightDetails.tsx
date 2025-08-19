import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, LinearProgress } from '@mui/material';
import { FightFragment, useGetReportEventsLazyQuery } from './graphql/generated';
import { useAuth } from './AuthContext';
import { createEsoLogsClient } from './esologsClient';
import abilitiesJson from './data/abilities.json';
import { Event } from './types/events';
import { useDispatch, useSelector } from 'react-redux';
import { setAbilities } from './store/abilitiesSlice';
import { RootState } from './store';

// Utility: Calculate buff uptimes
function calculateBuffUptimes(
  events: Event[],
  fight: FightFragment | undefined,
  abilities: Record<string, any>
) {
  const buffUptimes: Record<string, number> = {};
  const buffNames: Record<string, string> = {};
  if (events && events.length > 0 && fight) {
    const buffIntervals: Record<string, Array<{ start: number; end: number }>> = {};
    const fightStart = Number(fight.startTime);
    const fightEnd = Number(fight.endTime);
    const activeBuffs: Record<string, number> = {};
    events.forEach((event) => {
      const eventType = (event.type || event._type || event.eventType || '').toLowerCase();
      let abilityGameID =
        event.abilityGameID || event.abilityId || event.buffId || event.id || 'unknown';
      if (abilityGameID === 'unknown' && event.ability && typeof event.ability === 'object') {
        abilityGameID = event.ability.gameID || event.ability.id || 'unknown';
      } else if (
        abilityGameID === 'unknown' &&
        (typeof event.ability === 'string' || typeof event.ability === 'number')
      ) {
        abilityGameID = event.ability;
      }
      if (abilityGameID === 'unknown') return;
      if (eventType === 'applybuff') {
        activeBuffs[String(abilityGameID)] = Number(event.timestamp);
      } else if (eventType === 'removebuff' && activeBuffs[String(abilityGameID)] != null) {
        const start = activeBuffs[String(abilityGameID)];
        const end = Number(event.timestamp);
        if (!buffIntervals[String(abilityGameID)]) buffIntervals[String(abilityGameID)] = [];
        buffIntervals[String(abilityGameID)].push({ start, end });
        delete activeBuffs[String(abilityGameID)];
      }
    });
    // If any buffs are still active at fight end, close them
    Object.keys(activeBuffs).forEach((abilityGameID) => {
      const start = activeBuffs[abilityGameID];
      const end = fightEnd;
      if (!buffIntervals[abilityGameID]) buffIntervals[abilityGameID] = [];
      buffIntervals[abilityGameID].push({ start, end });
    });
    // Calculate uptime percentages
    Object.keys(buffIntervals).forEach((abilityGameID) => {
      const intervals = buffIntervals[abilityGameID];
      const totalBuffTime = intervals.reduce(
        (sum, interval) => sum + (interval.end - interval.start),
        0
      );
      const uptimePercent = (totalBuffTime / (fightEnd - fightStart)) * 100;
      buffUptimes[abilityGameID] = uptimePercent;
      buffNames[abilityGameID] = abilities[abilityGameID]?.name || abilityGameID;
    });
  }
  return { buffUptimes, buffNames };
}

// Utility: Find missing ability IDs
function findMissingAbilityIds(events: Event[], abilities: Record<string, any>) {
  const referencedIds = new Set<string>();
  for (const event of events) {
    const eventType = (event.type || event._type || event.eventType || '').toLowerCase();
    if (eventType === 'applybuff' || eventType === 'removebuff') {
      let abilityGameID =
        event.abilityGameID || event.abilityId || event.buffId || event.id || 'unknown';
      if (abilityGameID === 'unknown' && event.ability && typeof event.ability === 'object') {
        abilityGameID = event.ability.gameID || event.ability.id || 'unknown';
      } else if (
        abilityGameID === 'unknown' &&
        (typeof event.ability === 'string' || typeof event.ability === 'number')
      ) {
        abilityGameID = event.ability;
      }
      if (abilityGameID !== 'unknown') {
        referencedIds.add(String(abilityGameID));
      }
    }
  }
  return Array.from(referencedIds).filter((id) => !abilities[id]);
}

interface FightDetailsProps {
  fight: FightFragment;
  reportCode: string;
}

const FightDetails: React.FC<FightDetailsProps> = ({ fight, reportCode }) => {
  const { accessToken } = useAuth();
  const client = React.useMemo(() => createEsoLogsClient(accessToken || ''), [accessToken]);
  const [events, setEvents] = React.useState<any[]>([]);
  const [fetchEvents, { data }] = useGetReportEventsLazyQuery();
  const dispatch = useDispatch();
  const reduxAbilities = useSelector((state: RootState) => state.abilities.abilities);
  const abilities: Record<string, any> = React.useMemo(
    () => ({ ...abilitiesJson, ...reduxAbilities }),
    [reduxAbilities]
  );

  React.useEffect(() => {
    let isMounted = true;
    async function fetchMissingAbilities() {
      const missingIds = findMissingAbilityIds(events, abilities);
      if (missingIds.length === 0) return;
      const fetched: Record<string, any> = {};
      for (const id of missingIds) {
        try {
          const { data } = await client.query({
            query: require('./graphql/generated').GetAbilityDocument,
            variables: { id: Number(id) },
            fetchPolicy: 'network-only',
          });
          if (data?.gameData?.ability) {
            fetched[id] = data.gameData.ability;
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to fetch ability ${id}:`, err);
        }
      }
      if (isMounted && Object.keys(fetched).length > 0) {
        dispatch(setAbilities(fetched));
      }
    }
    if (events.length > 0) {
      fetchMissingAbilities();
    }
    return () => {
      isMounted = false;
    };
  }, [client, events, abilities, dispatch]);

  React.useEffect(() => {
    if (fight && fight.id && fight.startTime && reportCode) {
      fetchEvents({
        variables: {
          code: reportCode,
          fightIds: [Number(fight.id)],
        },
        context: {
          headers: {
            Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
          },
        },
      });
    }
  }, [fight, fetchEvents, accessToken, reportCode]);

  React.useEffect(() => {
    if (data && data.reportData?.report?.events?.data) {
      setEvents(data.reportData.report.events.data);
      // Debug: log first 5 events to inspect structure
      if (data.reportData.report.events.data.length > 0) {
        // eslint-disable-next-line no-console
        console.log('Sample events:', data.reportData.report.events.data.slice(0, 5));
      }
    }
  }, [data]);

  const { buffUptimes } = calculateBuffUptimes(events, fight, abilities);

  return (
    <Box mt={2}>
      <Typography variant="h6">Buff Uptime Percentages</Typography>
      {Object.keys(buffUptimes).length > 0 ? (
        <List>
          {Object.entries(buffUptimes)
            .sort((a, b) => b[1] - a[1])
            .map(([abilityGameID, percent]) => (
              <ListItem key={abilityGameID} divider>
                <ListItemText
                  primary={
                    abilities[abilityGameID]?.name
                      ? `${abilities[abilityGameID].name} (${abilityGameID})`
                      : `Buff ${abilityGameID}`
                  }
                  secondary={`Uptime: ${percent.toFixed(2)}%`}
                />
                <Box sx={{ width: 200, ml: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={percent}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
              </ListItem>
            ))}
        </List>
      ) : (
        <Typography>No buff events found. Check event structure in console log.</Typography>
      )}
      {events && events.length > 0 && (
        <Box mt={2}>
          <Typography variant="h6">Events</Typography>
          <List>
            {events.map((event, idx) => (
              <ListItem key={idx} divider>
                <ListItemText
                  primary={event.type || JSON.stringify(event)}
                  secondary={JSON.stringify(event, null, 2)}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default FightDetails;
