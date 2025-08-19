import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, LinearProgress } from '@mui/material';
import { useGetReportEventsLazyQuery } from './graphql/generated';
import { useAuth } from './AuthContext';
import { useApolloClient } from '@apollo/client';

// Fight type definition
export type Fight = {
  id: string;
  name: string;
  start: string;
  end: string;
};

interface FightDetailsProps {
  fight: Fight | undefined;
  reportCode: string;
}

const FightDetails: React.FC<FightDetailsProps> = ({ fight, reportCode }) => {
  const client = useApolloClient();
  const { accessToken } = useAuth();
  const [events, setEvents] = React.useState<any[]>([]);
  const [fetchEvents, { data, loading, error }] = useGetReportEventsLazyQuery();
  // Fetch all abilities with pagination
  const [abilities, setAbilities] = React.useState<Record<string, any>>({});

  React.useEffect(() => {
    let isMounted = true;
    async function fetchReferencedAbilities() {
      // Collect referenced ability IDs from events
      const referencedIds = new Set<string>();
      for (const event of events) {
        const eventType = (event.type || event._type || event.eventType || '').toLowerCase();
        if (eventType === 'applybuff' || eventType === 'removebuff') {
          const abilityGameID =
            event.abilityGameID ||
            event.ability?.gameID ||
            event.abilityId ||
            event.ability?.id ||
            event.ability ||
            event.buffId ||
            event.id ||
            'unknown';
          if (abilityGameID !== 'unknown') {
            referencedIds.add(String(abilityGameID));
          }
        }
      }
      // Fetch each ability by id
      const abilitiesDict: Record<string, any> = {};
      for (const id of Array.from(referencedIds)) {
        try {
          const { data } = await client.query({
            query: require('./graphql/generated').GetAbilityDocument,
            variables: { id: Number(id) },
            fetchPolicy: 'network-only',
          });
          if (data?.gameData?.ability) {
            abilitiesDict[id] = data.gameData.ability;
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to fetch ability ${id}:`, err);
        }
      }
      if (isMounted) setAbilities(abilitiesDict);
    }
    if (events.length > 0) {
      fetchReferencedAbilities();
    }
    return () => {
      isMounted = false;
    };
  }, [client, events]);

  React.useEffect(() => {
    if (fight && fight.id && fight.start && reportCode) {
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

  // Build a map of abilityGameID to name
  const abilityNameMap: Record<string, string> = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const id in abilities) {
      const ability = abilities[id];
      if (ability && ability.name) {
        map[id] = ability.name;
      }
    }
    return map;
  }, [abilities]);

  // Calculate buff uptimes
  const buffUptimes: Record<string, number> = {};
  const buffNames: Record<string, string> = {};
  if (events && events.length > 0 && fight) {
    // Map: abilityGameID -> array of { start, end }
    const buffIntervals: Record<string, Array<{ start: number; end: number }>> = {};
    const fightStart = Number(fight.start);
    const fightEnd = Number(fight.end);
    // Track currently active buffs: abilityGameID -> startTime
    const activeBuffs: Record<string, number> = {};
    for (const event of events) {
      const eventType = (event.type || event._type || event.eventType || '').toLowerCase();
      if (eventType === 'applybuff') {
        const abilityGameID =
          event.abilityGameID ||
          event.ability?.gameID ||
          event.abilityId ||
          event.ability?.id ||
          event.ability ||
          event.buffId ||
          event.id ||
          'unknown';
        activeBuffs[abilityGameID] = event.timestamp;
        buffNames[abilityGameID] =
          event.ability?.name || event.abilityName || `Buff ${abilityGameID}`;
      }
      if (eventType === 'removebuff') {
        const abilityGameID =
          event.abilityGameID ||
          event.ability?.gameID ||
          event.abilityId ||
          event.ability?.id ||
          event.ability ||
          event.buffId ||
          event.id ||
          'unknown';
        if (activeBuffs[abilityGameID] !== undefined) {
          if (!buffIntervals[abilityGameID]) buffIntervals[abilityGameID] = [];
          buffIntervals[abilityGameID].push({
            start: activeBuffs[abilityGameID],
            end: event.timestamp,
          });
          delete activeBuffs[abilityGameID];
        }
      }
    }
    // Handle buffs still active at fight end
    for (const abilityGameID in activeBuffs) {
      if (!buffIntervals[abilityGameID]) buffIntervals[abilityGameID] = [];
      buffIntervals[abilityGameID].push({ start: activeBuffs[abilityGameID], end: fightEnd });
    }
    // Calculate uptime percentage for each buff
    for (const abilityGameID in buffIntervals) {
      const totalUptime = buffIntervals[abilityGameID].reduce(
        (sum, interval) => sum + (interval.end - interval.start),
        0
      );
      const fightDuration = fightEnd - fightStart;
      buffUptimes[abilityGameID] = fightDuration > 0 ? (totalUptime / fightDuration) * 100 : 0;
    }
  }

  if (!fight) return <Typography>No details found.</Typography>;
  return (
    <Box>
      <Typography>
        <strong>Name:</strong> {fight.name}
      </Typography>
      <Typography>
        <strong>Start Time:</strong> {fight.start}
      </Typography>
      <Typography>
        <strong>End Time:</strong> {fight.end}
      </Typography>
      {loading && <Typography>Loading events...</Typography>}
      {error && <Typography color="error">Error loading events: {error.message}</Typography>}
      {Object.keys(buffUptimes).length > 0 ? (
        <Box mt={2}>
          <Typography variant="h6">Buff Uptime Percentages</Typography>
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
        </Box>
      ) : (
        <Box mt={2}>
          <Typography variant="h6">Buff Uptime Percentages</Typography>
          <Typography>No buff events found. Check event structure in console log.</Typography>
        </Box>
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
