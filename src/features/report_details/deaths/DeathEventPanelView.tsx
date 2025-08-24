import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
} from '@mui/material';
import React from 'react';

import { ReportActorFragment } from '../../../graphql/generated';
import { resolveActorName } from '../../../utils/resolveActorName';

interface AttackEvent {
  abilityName?: string | null;
  abilityId?: number | null;
  sourceName?: string | null;
  sourceID?: number | null;
  timestamp?: number | null;
  type?: string | null;
  amount?: number | null;
  wasBlocked?: boolean | null;
}

interface DeathInfo {
  playerId: string;
  timestamp: number;
  killingBlow: AttackEvent | null;
  lastAttacks: AttackEvent[];
  stamina: number | null;
  maxStamina: number | null;
  wasBlocking: boolean | null;
}

interface DeathEventPanelViewProps {
  deathInfos: DeathInfo[];
  actorsById: Record<string | number, ReportActorFragment>;
  reportId?: string;
  fightId?: number;
  fight: { startTime?: number; endTime?: number };
  isLoading?: boolean;
}

export const DeathEventPanelView: React.FC<DeathEventPanelViewProps> = ({
  deathInfos,
  actorsById,
  reportId,
  fightId,
  fight,
  isLoading = false,
}) => {
  // Helper function to convert timestamp to seconds since fight start
  const formatTimeFromFightStart = (timestamp: number): string => {
    if (!fight?.startTime) {
      return timestamp.toString();
    }
    const totalSeconds = (timestamp - fight.startTime) / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(1);
    return `${minutes}:${seconds.padStart(4, '0')}`;
  };

  // Show loading spinner while data is being fetched
  if (isLoading) {
    return (
      <Box mt={2}>
        <Typography variant="h6">Death Events</Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            py: 4,
          }}
        >
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Loading death event data...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (deathInfos.length === 0) {
    return (
      <Box mt={2}>
        <Typography variant="h6">Death Events</Typography>
        <Typography>No deaths detected in this fight.</Typography>
      </Box>
    );
  }

  return (
    <Box mt={2}>
      <Typography variant="h6">Death Events</Typography>
      {/* Death summary */}
      <Box mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          Death Summary
        </Typography>
        <List sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {Object.entries(
            deathInfos.reduce(
              (acc, info) => {
                acc[info.playerId] = (acc[info.playerId] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            )
          ).map(([playerId, count]) => {
            const actor = actorsById[playerId];
            const playerName = resolveActorName(actor, playerId);
            const link =
              reportId && fightId
                ? `https://www.esologs.com/reports/${reportId}?fight=${fightId}&source=${playerId}&type=deaths`
                : undefined;
            return (
              <ListItem key={playerId} sx={{ width: 'auto', p: 0 }}>
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Chip label={`${playerName}: ${count}`} color="error" clickable />
                  </a>
                ) : (
                  <Chip label={`${playerName}: ${count}`} color="error" />
                )}
              </ListItem>
            );
          })}
        </List>
      </Box>
      <List>
        {deathInfos.map((info, idx) => {
          const actor = actorsById[info.playerId];
          const playerName = resolveActorName(actor, info.playerId);
          // Get source name for killing blow
          const killingBlowSourceActor = info.killingBlow?.sourceID
            ? actorsById[info.killingBlow.sourceID]
            : undefined;
          const killingBlowSourceName = resolveActorName(
            killingBlowSourceActor,
            info.killingBlow?.sourceID,
            info.killingBlow?.sourceName
          );
          return (
            <ListItem key={idx} alignItems="flex-start" divider>
              <Card sx={{ width: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Player: {playerName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Time: {formatTimeFromFightStart(info.timestamp)}
                  </Typography>
                  <Box mt={1}>
                    {info.wasBlocking && (
                      <Chip label={'Blocking'} color={'success'} sx={{ mr: 1 }} />
                    )}
                    <Chip
                      label={
                        info.stamina !== null && info.maxStamina !== null
                          ? `Stamina: ${info.stamina}/${info.maxStamina}`
                          : `Stamina: ${info.stamina ?? 'Unknown'}`
                      }
                      sx={{ mr: 1 }}
                    />
                  </Box>
                  <Box mt={2}>
                    <Typography variant="body2" fontWeight="bold">
                      Killing Blow:
                    </Typography>
                    {info.killingBlow ? (
                      <Typography variant="body2">
                        {info.killingBlow.abilityName || 'Unknown'}
                        {typeof info.killingBlow.abilityId !== 'undefined'
                          ? ` (ID: ${info.killingBlow.abilityId})`
                          : ''}{' '}
                        by {killingBlowSourceName}
                        {typeof info.killingBlow.amount === 'number'
                          ? ` — ${info.killingBlow.amount} damage`
                          : ''}
                      </Typography>
                    ) : (
                      <Typography variant="body2">Unknown</Typography>
                    )}
                  </Box>
                  <Box mt={2}>
                    <Typography variant="body2" fontWeight="bold">
                      Last 3 Attacks:
                    </Typography>
                    {info.lastAttacks.length > 0 ? (
                      <List>
                        {info.lastAttacks.map((attack, i) => {
                          const attackSourceActor = attack.sourceID
                            ? actorsById[attack.sourceID]
                            : undefined;
                          const attackSourceName = resolveActorName(
                            attackSourceActor,
                            attack.sourceID,
                            attack.sourceName
                          );
                          return (
                            <ListItem key={i}>
                              <ListItemText
                                primary={
                                  <>
                                    {attack.abilityName || attack.abilityId || 'Unknown'} by{' '}
                                    {attackSourceName}
                                    {typeof attack.amount === 'number'
                                      ? ` — ${attack.amount} damage`
                                      : ''}
                                    {attack.wasBlocked === true && (
                                      <Chip
                                        label="Blocked"
                                        color="success"
                                        size="small"
                                        sx={{ ml: 1 }}
                                      />
                                    )}
                                  </>
                                }
                                secondary={`Time: ${formatTimeFromFightStart(attack.timestamp ?? 0)}`}
                              />
                            </ListItem>
                          );
                        })}
                        {/* Close ListItem map */}
                      </List>
                    ) : (
                      <Typography variant="body2">None</Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};
