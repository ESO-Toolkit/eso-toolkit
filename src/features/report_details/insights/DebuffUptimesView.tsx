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
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6">Debuff Uptimes</Typography>
          <Skeleton variant="rounded" width={120} height={32} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Shows average debuff uptimes against hostile targets
        </Typography>
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {[...Array(5)].map((_, index) => (
            <Box
              key={index}
              sx={{
                py: 1.5,
                pl: 0.5,
                pr: 1.5,
                borderBottom: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <Box sx={{ width: '100%' }}>
                <Box
                  sx={{
                    position: 'relative',
                    height: 48,
                    borderRadius: 2,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(203, 213, 225, 0.3)',
                    border: (theme) =>
                      theme.palette.mode === 'dark' ? 'none' : '1px solid rgba(15, 23, 42, 0.08)',
                    boxShadow: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'inset 0 1px 3px rgba(0, 0, 0, 0.5)'
                        : 'inset 0 1px 2px rgba(15, 23, 42, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                  }}
                >
                  {/* Icon placeholder */}
                  <Skeleton variant="rounded" width={32} height={32} />

                  {/* Text content */}
                  <Box sx={{ flex: 1, minWidth: 0, ml: 1.5 }}>
                    <Skeleton variant="text" width="60%" height={16} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                      <Skeleton variant="text" width="40px" height={12} />
                      <Skeleton variant="text" width="40px" height={12} />
                    </Box>
                  </Box>

                  {/* Percentage and stack badge */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Skeleton variant="rounded" width={32} height={20} />
                    <Skeleton variant="text" width="40px" height={20} />
                  </Box>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
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
            {debuffUptimes.map((debuff, idx) => {
              return (
                <ListItem
                  key={idx}
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
