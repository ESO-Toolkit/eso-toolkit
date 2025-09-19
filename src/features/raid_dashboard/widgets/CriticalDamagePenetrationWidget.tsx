import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Alert,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  LinearProgress,
} from '@mui/material';
import React from 'react';

import { useCurrentFight } from '../../../hooks';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { useCriticalDamageTask } from '../../../hooks/workerTasks/useCriticalDamageTask';
import { BaseWidget, WidgetProps } from '../components/BaseWidget';

// Constants for thresholds
const CRITICAL_DAMAGE_CAP = 125; // 125% critical damage cap
const TIME_AT_CAP_THRESHOLD = 70; // Consider it an issue if below 70% of time at cap
const EFFECTIVE_CRIT_THRESHOLD = 120; // Consider it an issue if effective crit damage is below 120%

/**
 * Widget that displays if critical damage or penetration are falling below optimal levels
 */
export const CriticalDamagePenetrationWidget: React.FC<WidgetProps> = ({ onRemove }) => {
  const { fight, isFightLoading } = useCurrentFight();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { criticalDamageData, isCriticalDamageLoading, criticalDamageError } =
    useCriticalDamageTask();

  const isLoading = isFightLoading || isPlayerDataLoading || isCriticalDamageLoading;

  // Analyze critical damage issues
  const criticalDamageIssues = React.useMemo(() => {
    const issues: Array<{
      playerId: number;
      playerName: string;
      issueType: 'low_effective' | 'low_time_at_cap' | 'no_data';
      value?: number;
      message: string;
    }> = [];

    if (!criticalDamageData?.playerDataMap || !playerData?.playersById) {
      return issues;
    }

    Object.values(playerData.playersById).forEach((player) => {
      if (!player?.id) return;

      const critData = criticalDamageData.playerDataMap[player.id];

      if (!critData) {
        issues.push({
          playerId: player.id,
          playerName: player.name,
          issueType: 'no_data',
          message: 'No critical damage data available',
        });
        return;
      }

      // Check effective critical damage
      if (critData.effectiveCriticalDamage < EFFECTIVE_CRIT_THRESHOLD) {
        issues.push({
          playerId: player.id,
          playerName: player.name,
          issueType: 'low_effective',
          value: critData.effectiveCriticalDamage,
          message: `Low effective critical damage: ${critData.effectiveCriticalDamage.toFixed(1)}% (target: ${EFFECTIVE_CRIT_THRESHOLD}%+)`,
        });
      }

      // Check time at cap
      if (critData.timeAtCapPercentage < TIME_AT_CAP_THRESHOLD) {
        issues.push({
          playerId: player.id,
          playerName: player.name,
          issueType: 'low_time_at_cap',
          value: critData.timeAtCapPercentage,
          message: `Low time at critical damage cap: ${critData.timeAtCapPercentage.toFixed(0)}% (target: ${TIME_AT_CAP_THRESHOLD}%+)`,
        });
      }
    });

    return issues;
  }, [criticalDamageData?.playerDataMap, playerData?.playersById]);

  const getIssueIcon = (issueType: string): React.ReactNode => {
    switch (issueType) {
      case 'low_effective':
      case 'low_time_at_cap':
        return <TrendingDownIcon color="warning" fontSize="small" />;
      case 'no_data':
        return <WarningIcon color="error" fontSize="small" />;
      default:
        return <WarningIcon color="warning" fontSize="small" />;
    }
  };

  const getIssueColor = (issueType: string): string => {
    switch (issueType) {
      case 'low_effective':
      case 'low_time_at_cap':
        return 'warning.main';
      case 'no_data':
        return 'error.main';
      default:
        return 'warning.main';
    }
  };

  const getSeverity = (): string => {
    if (criticalDamageIssues.length === 0) return 'success';
    const hasNoDataIssues = criticalDamageIssues.some((issue) => issue.issueType === 'no_data');
    const hasLowEffectiveIssues = criticalDamageIssues.some(
      (issue) => issue.issueType === 'low_effective',
    );

    if (hasNoDataIssues || hasLowEffectiveIssues) return 'error';
    return 'warning';
  };

  return (
    <BaseWidget
      title="Critical Damage Analysis"
      onRemove={onRemove}
      isLoading={isLoading}
      error={criticalDamageError}
    >
      {!fight ? (
        <Typography variant="body2" color="text.secondary">
          No fight data available
        </Typography>
      ) : criticalDamageIssues.length === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
          <CheckCircleIcon fontSize="small" />
          <Typography variant="body2">All players meeting critical damage thresholds</Typography>
        </Box>
      ) : (
        <Box>
          <Alert
            severity={getSeverity() as 'success' | 'error' | 'warning'}
            sx={{ mb: 2, py: 0.5 }}
          >
            <Typography variant="body2">
              {criticalDamageIssues.length} critical damage issue
              {criticalDamageIssues.length !== 1 ? 's' : ''} detected
            </Typography>
          </Alert>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Thresholds: {EFFECTIVE_CRIT_THRESHOLD}% effective, {TIME_AT_CAP_THRESHOLD}% time at
              cap
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Critical damage cap: {CRITICAL_DAMAGE_CAP}%
            </Typography>
          </Box>

          <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
            {criticalDamageIssues.map((issue, index) => (
              <ListItem key={`${issue.playerId}-${index}`} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>{getIssueIcon(issue.issueType)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {issue.playerName}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Box
                        component="span"
                        sx={{
                          fontSize: '0.75rem',
                          color: getIssueColor(issue.issueType),
                          display: 'block',
                        }}
                      >
                        {issue.message}
                      </Box>
                      {issue.value !== undefined && issue.issueType === 'low_time_at_cap' && (
                        <LinearProgress
                          variant="determinate"
                          value={issue.value}
                          sx={{
                            mt: 0.5,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: issue.value < 50 ? 'error.main' : 'warning.main',
                            },
                          }}
                        />
                      )}
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
