import { Box, Typography, Grid, Card, CardContent, Avatar, Chip } from '@mui/material';
import { Alert } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../store/storeWithHistory';
import { PlayerGear } from '../types/playerDetails';
import { detectBuildIssues } from '../utils/detectBuildIssues';

// This panel now uses report actors from masterData

const PlayersPanel: React.FC = () => {
  // Get report actors from masterData
  const actorsById = useSelector((state: RootState) => state.masterData.actorsById);
  const abilitiesById = useSelector((state: RootState) => state.masterData.abilitiesById);
  const events = useSelector((state: RootState) => state.events.events);
  // Get player details (gear/talents) from masterData
  // Player details are stored in events.players, keyed by actor id
  const eventPlayers = useSelector((state: RootState) => state.events.players);

  // Filter for Player actors only
  const playerActors = Object.values(actorsById).filter((actor) => actor.type === 'Player');

  // Calculate unique mundus buffs per player
  const mundusBuffsByPlayer = React.useMemo(() => {
    const result: Record<string, Set<string>> = {};

    if (!events || !abilitiesById) return result;

    // Initialize sets for each player
    playerActors.forEach((actor) => {
      if (actor.id) {
        result[String(actor.id)] = new Set();
      }
    });

    // Look through all events for applybuff events
    events.forEach((event) => {
      if (event.type === 'applybuff' && event.abilityGameID && event.targetID) {
        const ability = abilitiesById[event.abilityGameID];
        if (ability?.name && ability.name.toLowerCase().includes('mundus')) {
          const playerId = String(event.targetID);
          if (result[playerId]) {
            result[playerId].add(ability.name);
          }
        }
      }
    });

    return result;
  }, [events, abilitiesById, playerActors]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Players
      </Typography>
      <Grid container spacing={2}>
        {playerActors.map((actor) => {
          // Get player details from events.players by actor id
          const player = actor.id ? eventPlayers[String(actor.id)] : undefined;

          if (!player) {
            return null;
          }

          const talents = player?.combatantInfo?.talents ?? [];
          const gear = player?.combatantInfo?.gear ?? [];
          const buildIssues = detectBuildIssues(gear);
          return (
            <Box display="flex" flexWrap="wrap" gap={1}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    {actor.icon ? (
                      <Avatar
                        src={`https://assets.rpglogs.com/img/eso/icons/${actor.icon}.png`}
                        alt={actor.name ?? undefined}
                        sx={{ mr: 2 }}
                      />
                    ) : (
                      <Avatar sx={{ mr: 2 }} />
                    )}
                    <Box>
                      <Typography variant="subtitle1">{actor.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {actor.subType}
                      </Typography>
                    </Box>
                  </Box>
                  {/* Build Issues Section */}
                  {buildIssues.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      <strong>Build Issues Detected:</strong>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {buildIssues.map((issue, idx) => (
                          <li key={idx}>{issue.message}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                  {talents.length > 0 && (
                    <Box mb={1}>
                      <Typography variant="body2" fontWeight="bold">
                        Talents:
                      </Typography>
                      {/* Display talents in two rows, split after the sixth element */}
                      <Box display="flex" flexWrap="wrap" gap={1} mb={1}>
                        {talents.slice(0, 6).map((talent, idx) => (
                          <Avatar
                            key={idx}
                            src={`https://assets.rpglogs.com/img/eso/abilities/${talent.abilityIcon}.png`}
                            alt={talent.name}
                            sx={{ width: 32, height: 32, border: '1px solid #ccc' }}
                            title={talent.name}
                          />
                        ))}
                      </Box>
                      {talents.length > 6 && (
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {talents.slice(6).map((talent, idx) => (
                            <Avatar
                              key={idx}
                              src={`https://assets.rpglogs.com/img/eso/abilities/${talent.abilityIcon}.png`}
                              alt={talent.name}
                              sx={{ width: 32, height: 32, border: '1px solid #ccc' }}
                              title={talent.name}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  )}
                  {gear.length > 0 && (
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        Gear Sets:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {(() => {
                          // Group gear by setName
                          const setCounts: Record<string, number> = {};
                          gear.forEach((g: PlayerGear) => {
                            if (g.setName) {
                              setCounts[g.setName] = (setCounts[g.setName] || 0) + 1;
                            }
                          });
                          return Object.entries(setCounts).map(([setName, count], idx) => (
                            <Chip key={idx} label={`${count} ${setName}`} size="small" />
                          ));
                        })()}
                      </Box>
                    </Box>
                  )}
                  {/* Mundus Buffs Section */}
                  {actor.id && mundusBuffsByPlayer[String(actor.id)]?.size > 0 && (
                    <Box mt={1}>
                      <Typography variant="body2" fontWeight="bold">
                        Mundus Buffs:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {Array.from(mundusBuffsByPlayer[String(actor.id)]).map((buffName, idx) => (
                          <Chip key={idx} label={String(buffName)} size="small" color="primary" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Grid>
    </Box>
  );
};

export default PlayersPanel;
