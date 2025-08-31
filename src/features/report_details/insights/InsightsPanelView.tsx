import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import React from 'react';

import { AbilityIcon } from '../../../components/AbilityIcon';
import { FightFragment } from '../../../graphql/generated';

import { BuffUptimesPanel } from './BuffUptimesPanel';
import { DamageBreakdownPanel } from './DamageBreakdownPanel';
import { DamageTypeBreakdownPanel } from './DamageTypeBreakdownPanel';
import { DebuffUptimesPanel } from './DebuffUptimesPanel';
import { StatusEffectUptimesPanel } from './StatusEffectUptimesPanel';

interface InsightsPanelViewProps {
  fight: FightFragment;
  durationSeconds: number;
  abilityEquipped: Record<string, string[]>;
  buffActors: Record<string, Set<string>>;
  firstDamageDealer: string | null;
  isLoading: boolean;
}

const ABILITY_DATA = [
  // Glacial Colossus icon is missing in some master data sets; provide explicit fallback icon filename
  { name: 'Colossus', id: '122388', icon: 'ability_necromancer_006_a' },
  { name: 'Atronach', id: '23495' },
  { name: 'Barrier', id: '40237', icon: 'ability_ava_006_b' },
  { name: 'Horn', id: '40223' },
];

const CHAMPION_POINT_DATA = [
  { name: 'Enlivening Overflow', emoji: '⚡' },
  { name: 'From the Brink', emoji: '🛡️' },
];

export const InsightsPanelView: React.FC<InsightsPanelViewProps> = ({
  fight,
  durationSeconds,
  abilityEquipped,
  buffActors,
  firstDamageDealer,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <>
        <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={20} />
            <Typography variant="h6">Loading Fight Insights...</Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Box sx={{ mt: 2 }}>
              <Skeleton variant="text" width="40%" height={20} />
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} variant="text" width="80%" height={20} sx={{ mt: 1 }} />
              ))}
            </Box>
            <Box sx={{ mt: 2 }}>
              <Skeleton variant="text" width="40%" height={20} />
              {[...Array(2)].map((_, index) => (
                <Skeleton key={index} variant="text" width="80%" height={20} sx={{ mt: 1 }} />
              ))}
            </Box>
          </Box>
        </Paper>

        <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={16} />
            <Typography variant="h6">Loading Status Effects & Uptimes Analysis...</Typography>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="rectangular" width="100%" height={40} />
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 3 }} />
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 3 }} />
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
          </Box>
        </Paper>

        <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={16} />
            <Typography variant="h6">Loading Damage Analysis...</Typography>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="rectangular" width="100%" height={40} />
            <Skeleton variant="rectangular" width="100%" height={300} sx={{ mt: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 3 }} />
            <Skeleton variant="rectangular" width="100%" height={250} sx={{ mt: 2 }} />
          </Box>
        </Paper>
      </>
    );
  }
  return (
    <>
      {/* Main insights grid layout */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {/* Fight Insights Header - Full Width */}
        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Fight Insights
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 1,
                  boxShadow: 1,
                }}
              >
                ⏱️
              </Box>
              <Typography sx={{ '& strong': { fontWeight: 100 }, '& span': { fontWeight: 400 } }}>
                <strong>Duration: </strong><span>{durationSeconds.toFixed(1)} seconds</span>
              </Typography>
            </Box>

            {firstDamageDealer && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 1,
                    boxShadow: 1,
                  }}
                >
                  🎯
                </Box>
                <Typography sx={{ '& strong': { fontWeight: 100 }, '& span': { fontWeight: 400 } }}>
                  <strong>First Damage Dealer: </strong><span>{firstDamageDealer}</span>
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 2.5 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 300 }}>
                Abilities Equipped:
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
                gap: 1 
              }}>
                {ABILITY_DATA.map((ability) => {
                  const equippedBy = abilityEquipped[ability.name] || [];
                  const hasPlayers = equippedBy.length > 0;
                  
                  return (
                    <Box 
                      key={ability.name}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 0.75,
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 1,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        height: '100%',
                      }}
                    >
                      <Box 
                        sx={{
                          width: 40,
                          height: 40,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: 1,
                          overflow: 'hidden'
                        }}
                      >
                        <AbilityIcon
                          abilityId={ability.id}
                          fallbackIcon={'icon' in ability ? ability.icon : undefined}
                        />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 400, 
                            color: '#fff',
                            lineHeight: 1.1,
                            mb: 0.25,
                            fontSize: '0.75rem'
                          }}
                        >
                          {ability.name}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            display: 'block',
                            color: hasPlayers ? '#a0a0a0' : 'rgba(255, 255, 255, 0.5)',
                            fontSize: '0.65rem',
                            lineHeight: 1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {hasPlayers ? equippedBy.join(', ') : 'Not equipped'}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 0, fontWeight: 300 }}>
                Champion Points Equipped:
              </Typography>
              <List dense>
                {CHAMPION_POINT_DATA.map((cp) => (
                  <ListItem
                    key={cp.name}
                    sx={{ pl: 0, display: 'flex', alignItems: 'center', gap: 1.5 }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                      }}
                    >
                      {cp.emoji}
                    </Box>
                    <ListItemText 
                      primary={cp.name}
                      primaryTypographyProps={{ fontWeight: 600 }}
                      secondary={
                        buffActors[cp.name]?.size
                          ? Array.from(buffActors[cp.name]).join(', ')
                          : 'None'
                      }
                      sx={{ '& .MuiListItemText-secondary': { fontSize: '0.75rem', color: '#a0a0a0' } }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Paper>
        </Box>
        {/* All panels in flexbox with 2 items per row */}

        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <StatusEffectUptimesPanel fight={fight} />
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <BuffUptimesPanel fight={fight} />
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <DebuffUptimesPanel fight={fight} />
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <DamageBreakdownPanel fight={fight} />
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <DamageTypeBreakdownPanel fight={fight} />
          </Paper>
        </Box>
      </Box>
    </>
  );
};
