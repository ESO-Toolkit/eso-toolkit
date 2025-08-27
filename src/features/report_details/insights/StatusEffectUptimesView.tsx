import { Box, Typography, List, ListItem, Skeleton } from '@mui/material';
import React from 'react';

import { BuffUptimeProgressBar, BuffUptime } from './BuffUptimeProgressBar';

export interface StatusEffectUptime extends BuffUptime {
  isDebuff: boolean;
}

interface StatusEffectUptimesViewProps {
  selectedTargetId: string | null;
  statusEffectUptimes: StatusEffectUptime[];
  isLoading: boolean;
  reportId: string | null;
  fightId: string | null;
  bossTargetIds: string[] | null;
}

const createEsoLogsUrl = (
  reportId: string,
  fightId: string,
  abilityGameID: string,
  selectedTargetId: string,
  isDebuff: boolean
): string => {
  const hostility = isDebuff ? '1' : '0';
  const spells = isDebuff ? 'debuffs' : 'buffs';
  return `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=auras&hostility=${hostility}&ability=${abilityGameID}&spells=${spells}&target=${selectedTargetId}`;
};

export const StatusEffectUptimesView: React.FC<StatusEffectUptimesViewProps> = ({
  selectedTargetId,
  statusEffectUptimes,
  isLoading,
  reportId,
  fightId,
  bossTargetIds,
}) => {
  const handleStatusEffectClick = (abilityGameID: string, isDebuff: boolean): void => {
    if (reportId && fightId && selectedTargetId) {
      const url = createEsoLogsUrl(reportId, fightId, abilityGameID, selectedTargetId, isDebuff);
      window.open(url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Status Effect Uptimes
        </Typography>
        <Skeleton variant="rectangular" width="100%" height={40} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Status Effect Uptimes
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {selectedTargetId
          ? 'Shows status effects applied to the selected target'
          : bossTargetIds && bossTargetIds.length > 0
          ? 'Shows average status effect uptimes across all boss targets'
          : 'Shows status effects applied to all targets'}
        {selectedTargetId && '. Click on a status effect to view in ESO Logs'}.
      </Typography>

      {statusEffectUptimes.length > 0 ? (
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          <List disablePadding>
            {statusEffectUptimes.map((statusEffect) => {
              return (
                <ListItem
                  key={statusEffect.abilityGameID}
                  sx={{
                    py: 1,
                    '&:hover': {
                      backgroundColor: reportId && fightId && selectedTargetId ? 'action.hover' : 'transparent',
                    },
                  }}
                  divider
                >
                  <BuffUptimeProgressBar
                    buff={statusEffect}
                    clickable={!!(reportId && fightId && selectedTargetId)}
                    onClick={() => handleStatusEffectClick(statusEffect.abilityGameID, statusEffect.isDebuff)}
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {selectedTargetId
            ? 'No status effects found for the selected target.'
            : bossTargetIds && bossTargetIds.length > 0
            ? 'No status effects found for boss targets.'
            : 'No status effects found.'}
        </Typography>
      )}
    </Box>
  );
};
