import { Box, Typography, Grid, Card, CardContent, Avatar, Alert, Chip } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../../../store/storeWithHistory';
import { MundusStones } from '../../../types/abilities';
import { CombatantInfoEvent } from '../../../types/combatlogEvents';
import { PlayerGear } from '../../../types/playerDetails';
import { detectBuildIssues } from '../../../utils/detectBuildIssues';
import { resolveActorName } from '../../../utils/resolveActorName';

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

  // Calculate unique mundus buffs per player using MundusStones enum from combatantinfo auras
  const mundusBuffsByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number }>> = {};

    if (!events || !abilitiesById) return result;

    // Get all mundus stone ability IDs from the enum
    const mundusStoneIds = Object.values(MundusStones) as number[];

    // Initialize arrays for each player
    playerActors.forEach((actor) => {
      if (actor.id) {
        const playerId = String(actor.id);
        result[playerId] = [];

        // Find the latest combatantinfo event for this player
        const combatantInfoEvents = events
          .filter((event): event is CombatantInfoEvent => {
            const eventData = event;
            return (
              eventData.type === 'combatantinfo' &&
              'sourceID' in eventData &&
              String(eventData.sourceID) === playerId
            );
          })
          .sort((a, b) => {
            return (b.timestamp || 0) - (a.timestamp || 0);
          }); // Most recent first

        const latestCombatantInfo = combatantInfoEvents[0];
        if (latestCombatantInfo && latestCombatantInfo.auras) {
          // Check each aura to see if it's a mundus stone
          latestCombatantInfo.auras.forEach((aura) => {
            if (mundusStoneIds.includes(aura.ability)) {
              const ability = abilitiesById[aura.ability];
              const mundusName = ability?.name || aura.name || `Unknown Mundus (${aura.ability})`;

              // Only add if not already present
              if (!result[playerId].some((buff) => buff.id === aura.ability)) {
                result[playerId].push({
                  name: mundusName,
                  id: aura.ability,
                });
              }
            }
          });
        }
      }
    });

    return result;
  }, [events, abilitiesById, playerActors]);

  // Calculate all auras per player from combatantinfo events
  const aurasByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number; stacks?: number }>> = {};

    if (!events || !abilitiesById) return result;

    // Initialize arrays for each player
    playerActors.forEach((actor) => {
      if (actor.id) {
        const playerId = String(actor.id);
        result[playerId] = [];

        // Find the latest combatantinfo event for this player
        const combatantInfoEvents = events
          .filter((event): event is CombatantInfoEvent => {
            const eventData = event;
            return (
              eventData.type === 'combatantinfo' &&
              'sourceID' in eventData &&
              String(eventData.sourceID) === playerId
            );
          })
          .sort((a, b) => {
            return (b.timestamp || 0) - (a.timestamp || 0);
          }); // Most recent first

        const latestCombatantInfo = combatantInfoEvents[0];
        if (latestCombatantInfo && latestCombatantInfo.auras) {
          // Get all auras for this player
          latestCombatantInfo.auras.forEach((aura) => {
            const ability = abilitiesById[aura.ability];
            const auraName = ability?.name || aura.name || `Unknown Aura (${aura.ability})`;

            result[playerId].push({
              name: auraName,
              id: aura.ability,
              stacks: aura.stacks,
            });
          });

          // Sort auras by name for consistent display
          result[playerId].sort((a, b) => a.name.localeCompare(b.name));
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
                        alt={String(resolveActorName(actor))}
                        sx={{ mr: 2 }}
                      />
                    ) : (
                      <Avatar sx={{ mr: 2 }} />
                    )}
                    <Box>
                      <Typography variant="subtitle1">{resolveActorName(actor)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {actor.subType}
                      </Typography>
                    </Box>
                  </Box>
                  {/* Build Issues Section */}
                  {buildIssues.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Build Issues Detected:
                      </Typography>
                      <Box component="ul" sx={{ margin: 0, paddingLeft: 2, listStyleType: 'disc' }}>
                        {buildIssues.map((issue, idx) => (
                          <Typography component="li" key={idx} variant="body2">
                            {issue.message}
                          </Typography>
                        ))}
                      </Box>
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
                            title={`${talent.name} (ID: ${talent.guid})`}
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
                              title={`${talent.name} (ID: ${talent.guid})`}
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
                          // Group gear by setName and collect setIDs
                          const setData: Record<string, { count: number; setID: number }> = {};
                          gear.forEach((g: PlayerGear) => {
                            if (g.setName) {
                              if (!setData[g.setName]) {
                                setData[g.setName] = { count: 0, setID: g.setID };
                              }
                              setData[g.setName].count += 1;
                            }
                          });
                          return Object.entries(setData).map(([setName, data], idx) => (
                            <Chip
                              key={idx}
                              label={`${data.count} ${setName}`}
                              size="small"
                              title={`Set ID: ${data.setID}`}
                            />
                          ));
                        })()}
                      </Box>
                    </Box>
                  )}
                  {/* Mundus Buffs Section */}
                  {actor.id && mundusBuffsByPlayer[String(actor.id)]?.length > 0 && (
                    <Box mt={1}>
                      <Typography variant="body2" fontWeight="bold">
                        Mundus Buffs:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {mundusBuffsByPlayer[String(actor.id)].map((buff, idx) => (
                          <Chip
                            key={idx}
                            label={buff.name}
                            size="small"
                            color="primary"
                            title={`Ability ID: ${buff.id}`}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {/* All Auras Section */}
                  {actor.id && aurasByPlayer[String(actor.id)]?.length > 0 && (
                    <Box mt={1}>
                      <Typography variant="body2" fontWeight="bold">
                        Active Auras ({aurasByPlayer[String(actor.id)].length}):
                      </Typography>
                      <Box
                        display="flex"
                        flexWrap="wrap"
                        gap={1}
                        sx={{ maxHeight: '120px', overflowY: 'auto' }}
                      >
                        {aurasByPlayer[String(actor.id)].map((aura, idx) => (
                          <Chip
                            key={idx}
                            label={
                              aura.stacks && aura.stacks > 1
                                ? `${aura.name} (${aura.stacks})`
                                : aura.name
                            }
                            size="small"
                            variant="outlined"
                            title={`Ability ID: ${aura.id}${aura.stacks ? ` | Stacks: ${aura.stacks}` : ''}`}
                          />
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
