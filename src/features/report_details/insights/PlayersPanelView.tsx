import { Box, Typography, Grid, Card, CardContent, Avatar, Alert, Chip } from '@mui/material';
import React from 'react';

import { ReportActorFragment } from '../../../graphql/generated';
import { PlayerInfo } from '../../../store/events_data/actions';
import { PlayerGear } from '../../../types/playerDetails';
import { detectBuildIssues } from '../../../utils/detectBuildIssues';
import { resolveActorName } from '../../../utils/resolveActorName';

interface PlayersPanelViewProps {
  playerActors: ReportActorFragment[];
  eventPlayers: Record<string, PlayerInfo>;
  mundusBuffsByPlayer: Record<string, Array<{ name: string; id: number }>>;
  aurasByPlayer: Record<string, Array<{ name: string; id: number; stacks?: number }>>;
  isLoading?: boolean;
}

const PlayersPanelView: React.FC<PlayersPanelViewProps> = ({
  playerActors,
  eventPlayers,
  mundusBuffsByPlayer,
  aurasByPlayer,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Players
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Loading player data...
        </Typography>
      </Box>
    );
  }

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
            <Box key={actor.id} display="flex" flexWrap="wrap" gap={1}>
              <Card variant="outlined" className="u-hover-lift u-fade-in-up">
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
                            variant="rounded"
                            sx={{ width: 32, height: 32, border: '1px solid var(--border)' }}
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
                              variant="rounded"
                              sx={{ width: 32, height: 32, border: '1px solid var(--border)' }}
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
                              variant="outlined"
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
                            variant="outlined"
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

export default PlayersPanelView;
