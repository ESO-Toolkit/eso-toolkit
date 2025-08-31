import { Box, Typography, List, ListItem, Skeleton, Button, Stack } from '@mui/material';
import React from 'react';

import { BuffUptimeProgressBar, BuffUptime } from './BuffUptimeProgressBar';

interface DebuffUptimesViewProps {
  selectedTargetId: number | null;
  debuffUptimes: BuffUptime[];
  isLoading: boolean;
  showAllDebuffs: boolean;
  onToggleShowAll: (showAll: boolean) => void;
  reportId: string | null;
  fightId: string | null;
}

export const DebuffUptimesView: React.FC<DebuffUptimesViewProps> = ({
  selectedTargetId,
  debuffUptimes,
  isLoading,
  showAllDebuffs,
  onToggleShowAll,
  reportId,
  fightId,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ mt: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Debuff Uptimes</Typography>
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
        <Typography variant="h6">Debuff Uptimes</Typography>
        <Button variant="outlined" size="small" onClick={() => onToggleShowAll(!showAllDebuffs)}>
          {showAllDebuffs ? 'Show Important Only' : 'Show All Debuffs'}
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {selectedTargetId
          ? 'Shows debuffs applied by friendly players to the selected target'
          : 'Shows debuffs applied by friendly players to all targets'}
        {!showAllDebuffs && ' (filtered to important debuffs only)'}.
        {reportId && fightId && ' Click on a debuff to view in ESO Logs.'}
      </Typography>

      {debuffUptimes.length > 0 ? (
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          <List disablePadding>
            {debuffUptimes.map((debuff) => {
              return (
                <ListItem
                  key={debuff.abilityGameID}
                  sx={{
                    py: 1,
                    pl: 0.5,
                    '&:hover': {
                      backgroundColor: reportId && fightId ? 'action.hover' : 'transparent',
                    },
                  }}
                  divider
                >
                  <BuffUptimeProgressBar
                    buff={debuff}
                    reportId={reportId}
                    fightId={fightId}
                    selectedTargetId={selectedTargetId}
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {showAllDebuffs
            ? selectedTargetId
              ? 'No friendly debuff events found for the selected target.'
              : 'No friendly debuff events found.'
            : selectedTargetId
              ? 'No important debuff events found for the selected target. Try showing all debuffs.'
              : 'No important debuff events found. Try showing all debuffs.'}
        </Typography>
      )}
    </Box>
  );
};
