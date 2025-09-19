import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SkullIcon from '@mui/icons-material/Dangerous';
import PersonIcon from '@mui/icons-material/Person';
import {
  Alert,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
} from '@mui/material';
import React from 'react';

import { useCurrentFight } from '../../../hooks';
import { useDeathEvents } from '../../../hooks/events/useDeathEvents';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { useReportMasterData } from '../../../hooks/useReportMasterData';
import { timestampToFightTime } from '../../../utils/fightTimeUtils';
import { resolveActorName } from '../../../utils/resolveActorName';
import { BaseWidget, WidgetProps } from '../components/BaseWidget';

/**
 * Widget that displays the cause of death for members of the fight
 */
export const DeathCauseWidget: React.FC<WidgetProps> = ({ onRemove }) => {
  const { fight, isFightLoading } = useCurrentFight();
  const { deathEvents, isDeathEventsLoading } = useDeathEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { playerData, isPlayerDataLoading } = usePlayerData();

  const isLoading =
    isFightLoading || isDeathEventsLoading || isMasterDataLoading || isPlayerDataLoading;

  // Process death events to extract death causes
  const deathCauses = React.useMemo(() => {
    if (!fight?.startTime || !fight?.endTime) return [];

    // Filter to player deaths only
    const playerDeaths = deathEvents.filter((event) => {
      if (event.type !== 'death') return false;
      const targetId = String(event.targetID ?? '');
      const targetActor = reportMasterData.actorsById[targetId];
      return targetActor?.type === 'Player';
    });

    return playerDeaths
      .map((deathEvent) => {
        const targetId = String(deathEvent.targetID ?? '');
        const targetActor = reportMasterData.actorsById[targetId];
        const playerName = resolveActorName(targetActor, targetId);

        // Get role information
        const role = playerData?.playersById?.[targetId]?.role || 'dps';

        // Get killing blow information
        const killingAbility = deathEvent.abilityGameID
          ? reportMasterData.abilitiesById[deathEvent.abilityGameID]
          : null;
        const killingAbilityName = killingAbility?.name || 'Unknown';

        // Get source of death (who killed them)
        const sourceId = String(deathEvent.sourceID ?? '');
        const sourceActor = reportMasterData.actorsById[sourceId];
        const sourceName = resolveActorName(sourceActor, sourceId);

        // Determine if it was a boss kill or player kill
        const sourceType = sourceActor?.type || 'Unknown';

        const deathTime = timestampToFightTime(deathEvent.timestamp, fight);

        return {
          playerId: targetId,
          playerName,
          role,
          timestamp: deathEvent.timestamp,
          deathTime,
          killingAbilityName,
          killingAbilityId: deathEvent.abilityGameID,
          sourceName,
          sourceType,
          amount: deathEvent.amount || 0,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp); // Sort by time of death
  }, [
    deathEvents,
    fight,
    reportMasterData.actorsById,
    reportMasterData.abilitiesById,
    playerData?.playersById,
  ]);

  const totalDeaths = deathCauses.length;
  const uniquePlayers = new Set(deathCauses.map((d) => d.playerId)).size;

  // Group deaths by cause for summary
  const deathsByCause = React.useMemo(() => {
    const grouped = new Map<string, number>();
    deathCauses.forEach((death) => {
      const key = `${death.killingAbilityName} (${death.sourceName})`;
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .slice(0, 5); // Top 5 causes
  }, [deathCauses]);

  const getRoleColor = (role: string): 'primary' | 'success' | 'secondary' => {
    switch (role) {
      case 'tank':
        return 'primary';
      case 'healer':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getSourceTypeColor = (sourceType: string): string => {
    switch (sourceType) {
      case 'Boss':
        return 'error.main';
      case 'NPC':
        return 'warning.main';
      case 'Player':
        return 'info.main';
      default:
        return 'text.secondary';
    }
  };

  return (
    <BaseWidget title="Death Causes" onRemove={onRemove} isLoading={isLoading}>
      {!fight ? (
        <Typography variant="body2" color="text.secondary">
          No fight data available
        </Typography>
      ) : totalDeaths === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
          <CheckCircleIcon fontSize="small" />
          <Typography variant="body2">No player deaths detected! 🎉</Typography>
        </Box>
      ) : (
        <Box>
          <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
            <Typography variant="body2">
              {totalDeaths} death{totalDeaths !== 1 ? 's' : ''} affecting {uniquePlayers} player
              {uniquePlayers !== 1 ? 's' : ''}
            </Typography>
          </Alert>

          {/* Top causes summary */}
          {deathsByCause.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                Top Death Causes:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {deathsByCause.map(([cause, count]) => (
                  <Chip
                    key={cause}
                    label={`${cause}: ${count}`}
                    size="small"
                    color="error"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
            {deathCauses.map((death, index) => (
              <ListItem key={`${death.playerId}-${death.timestamp}`} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <SkullIcon fontSize="small" sx={{ color: 'error.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {death.playerName}
                      </Typography>
                      <Chip
                        label={death.role}
                        size="small"
                        color={getRoleColor(death.role)}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: '0.75rem' }}
                      >
                        at {death.deathTime}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.75rem',
                          color: 'error.main',
                          fontWeight: 500,
                        }}
                      >
                        {death.killingAbilityName}
                        {death.amount > 0 && ` (${death.amount.toLocaleString()} damage)`}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.7rem',
                          color: getSourceTypeColor(death.sourceType),
                        }}
                      >
                        by {death.sourceName} ({death.sourceType})
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </BaseWidget>
  );
};
