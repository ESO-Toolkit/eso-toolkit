import { Box, Typography, List, ListItem, ListItemText, LinearProgress } from '@mui/material';
import React from 'react';

import { useCurrentFight, useReportMasterData } from '../../../hooks';
import { useWorkerDebuffLookup } from '../../../hooks/events/useDebuffEvents';
import { KnownAbilities } from '../../../types/abilities';
import { BuffTimeInterval } from '../../../utils/BuffLookupUtils';
import { formatDuration } from '../../../utils/fightDuration';
import { BaseWidget, WidgetProps } from '../components/BaseWidget';

interface TauntInfo {
  enemyId: string;
  enemyName: string;
  totalTauntTime: number;
  totalPossibleTime: number;
  uptimePercentage: number;
  tauntCount: number;
}

export const TauntUptimeWidget: React.FC<WidgetProps> = ({ onRemove }) => {
  const { fight, isFightLoading } = useCurrentFight();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { result: debuffLookupData, isLoading: isDebuffLookupLoading } = useWorkerDebuffLookup();

  const isLoading = isFightLoading || isMasterDataLoading || isDebuffLookupLoading;

  const tauntInfos = React.useMemo((): TauntInfo[] => {
    if (!debuffLookupData || !fight || !reportMasterData?.actorsById) {
      return [];
    }

    const fightDuration = fight.endTime - fight.startTime;
    const tauntIntervals = debuffLookupData.buffIntervals[KnownAbilities.TAUNT.toString()] || [];

    if (tauntIntervals.length === 0) {
      return [];
    }

    // Group taunt intervals by target enemy (the enemy being taunted)
    const tauntsByEnemy = new Map<string, { totalTime: number; tauntCount: number }>();

    tauntIntervals.forEach((interval: BuffTimeInterval) => {
      const enemyId = String(interval.targetID);
      const tauntDuration = interval.end - interval.start;

      if (!tauntsByEnemy.has(enemyId)) {
        tauntsByEnemy.set(enemyId, { totalTime: 0, tauntCount: 0 });
      }

      const enemyTaunts = tauntsByEnemy.get(enemyId);
      if (enemyTaunts) {
        enemyTaunts.totalTime += tauntDuration;
        enemyTaunts.tauntCount += 1;
      }
    });

    // Convert to array and calculate percentages
    const results: TauntInfo[] = [];
    for (const [enemyId, stats] of tauntsByEnemy.entries()) {
      // Try to get enemy name from master data or fallback to ID
      const enemy = reportMasterData.actorsById?.[parseInt(enemyId)];
      const enemyName = enemy?.name || `Enemy ${enemyId}`;

      const uptimePercentage = fightDuration > 0 ? (stats.totalTime / fightDuration) * 100 : 0;

      results.push({
        enemyId,
        enemyName,
        totalTauntTime: stats.totalTime,
        totalPossibleTime: fightDuration,
        uptimePercentage,
        tauntCount: stats.tauntCount,
      });
    }

    // Sort by uptime percentage (highest first)
    results.sort((a, b) => b.uptimePercentage - a.uptimePercentage);

    return results;
  }, [debuffLookupData, fight, reportMasterData?.actorsById]);

  const getUptimeColor = (percentage: number): 'error' | 'warning' | 'success' => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'error';
  };

  return (
    <BaseWidget title="Enemy Taunt Uptime" onRemove={onRemove} isLoading={isLoading}>
      {tauntInfos.length > 0 ? (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Shows how much time each enemy was actively taunted during the fight
          </Typography>

          <List dense>
            {tauntInfos.map((tauntInfo, index) => (
              <ListItem key={tauntInfo.enemyId} sx={{ px: 0 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {tauntInfo.enemyName}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {tauntInfo.uptimePercentage.toFixed(1)}% uptime
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tauntInfo.tauntCount} taunts
                        </Typography>
                      </Box>

                      <LinearProgress
                        variant="determinate"
                        value={Math.min(tauntInfo.uptimePercentage, 100)}
                        color={getUptimeColor(tauntInfo.uptimePercentage)}
                        sx={{ height: 6, borderRadius: 3 }}
                      />

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        {formatDuration(tauntInfo.totalTauntTime)} /{' '}
                        {formatDuration(tauntInfo.totalPossibleTime)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      ) : (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No taunt activity found in this fight.
          </Typography>
        </Box>
      )}
    </BaseWidget>
  );
};
