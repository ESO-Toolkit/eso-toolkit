import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { Alert, Box, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import React from 'react';

import { useCurrentFight } from '../../../hooks';
import { useCombatantInfoEvents } from '../../../hooks/events/useCombatantInfoEvents';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { useBuffLookupTask } from '../../../hooks/workerTasks/useBuffLookupTask';
import { BuildIssue, detectBuildIssues } from '../../../utils/detectBuildIssues';
import { BaseWidget, WidgetProps } from '../components/BaseWidget';

/**
 * Widget that displays build issues for all players in the current fight
 */
export const BuildIssuesWidget: React.FC<WidgetProps> = ({ onRemove }) => {
  const { fight, isFightLoading } = useCurrentFight();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();
  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask();

  const buildIssuesByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ issue: any; role: string }>> = {};

    if (!playerData?.playersById || !fight?.startTime || !fight?.endTime) {
      return result;
    }

    Object.values(playerData.playersById).forEach((player) => {
      if (!player?.id) return;

      const playerId = String(player.id);

      // Find combatant info for this player
      const combatantInfo = combatantInfoEvents.find((event) => event.sourceID === player.id);

      const gear = combatantInfo?.gear ?? [];
      const auras = combatantInfo?.auras ?? [];

      // Determine player role
      const role = player.role || 'dps';

      const emptyBuffLookup = { buffIntervals: {} };
      const buildIssues = detectBuildIssues(
        gear,
        buffLookupData || emptyBuffLookup,
        fight.startTime,
        fight.endTime,
        auras,
        role as 'dps' | 'tank' | 'healer',
      );

      if (buildIssues.length > 0) {
        result[playerId] = buildIssues.map((issue) => ({ issue, role }));
      }
    });

    return result;
  }, [
    playerData?.playersById,
    buffLookupData,
    combatantInfoEvents,
    fight?.startTime,
    fight?.endTime,
  ]);

  const totalIssues = Object.values(buildIssuesByPlayer).reduce(
    (sum, issues) => sum + issues.length,
    0,
  );
  const playersWithIssues = Object.keys(buildIssuesByPlayer).length;

  const isLoading =
    isFightLoading || isPlayerDataLoading || isCombatantInfoEventsLoading || isBuffLookupLoading;

  const getIssueIcon = (issue: BuildIssue): React.ReactNode => {
    if ('gearLevel' in issue && issue.gearLevel < 160) {
      return <ErrorIcon color="error" fontSize="small" />;
    }
    if ('gearQuality' in issue || 'enchantQuality' in issue) {
      return <WarningIcon color="warning" fontSize="small" />;
    }
    if ('buffName' in issue) {
      return <WarningIcon color="warning" fontSize="small" />;
    }
    return <WarningIcon color="warning" fontSize="small" />;
  };

  const getIssueColor = (issue: BuildIssue): string => {
    if ('gearLevel' in issue && issue.gearLevel < 160) {
      return 'error.main';
    }
    return 'warning.main';
  };

  return (
    <BaseWidget title="Build Issues" onRemove={onRemove} isLoading={isLoading}>
      {!fight ? (
        <Typography variant="body2" color="text.secondary">
          No fight data available
        </Typography>
      ) : totalIssues === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
          <CheckCircleIcon fontSize="small" />
          <Typography variant="body2">No build issues detected</Typography>
        </Box>
      ) : (
        <Box>
          <Alert severity={totalIssues > 5 ? 'error' : 'warning'} sx={{ mb: 2, py: 0.5 }}>
            <Typography variant="body2">
              {totalIssues} issue{totalIssues !== 1 ? 's' : ''} found across {playersWithIssues}{' '}
              player{playersWithIssues !== 1 ? 's' : ''}
            </Typography>
          </Alert>

          <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
            {Object.entries(buildIssuesByPlayer).map(([playerId, playerIssues]) => {
              const player = playerData?.playersById?.[playerId];
              const playerName = player?.name || `Player ${playerId}`;

              return playerIssues.map(({ issue }, index) => (
                <ListItem key={`${playerId}-${index}`} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>{getIssueIcon(issue)}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {playerName}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.75rem',
                          color: getIssueColor(issue),
                        }}
                      >
                        {issue.message}
                      </Typography>
                    }
                  />
                </ListItem>
              ));
            })}
          </List>
        </Box>
      )}
    </BaseWidget>
  );
};
