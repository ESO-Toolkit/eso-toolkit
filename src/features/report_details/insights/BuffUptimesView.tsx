import { Box, Typography, List, ListItem, Skeleton, Button, Stack } from '@mui/material';
import React from 'react';

import { BuffUptimeProgressBar, BuffUptime } from './BuffUptimeProgressBar';

interface BuffUptimesViewProps {
  buffUptimes: BuffUptime[];
  isLoading: boolean;
  showAllBuffs: boolean;
  onToggleShowAll: (showAll: boolean) => void;
  reportId: string | null;
  fightId: string | null;
}

const createEsoLogsUrl = (reportId: string, fightId: string, abilityGameID: string): string => {
  return `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=auras&hostility=0&ability=${abilityGameID}&spells=buffs`;
};

export const BuffUptimesView: React.FC<BuffUptimesViewProps> = ({
  buffUptimes,
  isLoading,
  showAllBuffs,
  onToggleShowAll,
  reportId,
  fightId,
}) => {
  const handleBuffClick = (abilityGameID: string): void => {
    if (reportId && fightId) {
      const url = createEsoLogsUrl(reportId, fightId, abilityGameID);
      window.open(url, '_blank');
    }
  };
  if (isLoading) {
    return (
      <Box sx={{ mt: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Buff Uptimes</Typography>
          <Button variant="outlined" size="small" disabled>
            Show Important Only
          </Button>
        </Stack>
        <Skeleton variant="rectangular" width="100%" height={40} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6">Buff Uptimes</Typography>
        <Button variant="outlined" size="small" onClick={() => onToggleShowAll(!showAllBuffs)}>
          {showAllBuffs ? 'Show Important Only' : 'Show All Buffs'}
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Shows average buff uptimes across friendly players
        {!showAllBuffs && ' (filtered to important buffs only)'}. Click on a buff to view in ESO
        Logs.
      </Typography>

      {buffUptimes.length > 0 ? (
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          <List disablePadding>
            {buffUptimes.map((buff) => {
              return (
                <ListItem
                  key={buff.abilityGameID}
                  sx={{
                    py: 1,
                    '&:hover': {
                      backgroundColor: reportId && fightId ? 'action.hover' : 'transparent',
                    },
                  }}
                  divider
                >
                  <BuffUptimeProgressBar
                    buff={buff}
                    clickable={!!(reportId && fightId)}
                    onClick={() => handleBuffClick(buff.abilityGameID)}
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {showAllBuffs
            ? 'No friendly buff events found.'
            : 'No important buff events found. Try showing all buffs.'}
        </Typography>
      )}
    </Box>
  );
};
