import TimelineIcon from '@mui/icons-material/Timeline';
import {
  Box,
  Typography,
  List,
  ListItem,
  Skeleton,
  Button,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import React from 'react';

import { BuffUptimeProgressBar, BuffUptime } from './BuffUptimeProgressBar';

interface BuffUptimesViewProps {
  buffUptimes: BuffUptime[];
  isLoading: boolean;
  showAllBuffs: boolean;
  onToggleShowAll: (showAll: boolean) => void;
  reportId: string | null;
  fightId: string | null;
  selectedTargetId: number | null;
  onOpenTimeline?: () => void;
  canOpenTimeline?: boolean;
}

export const BuffUptimesView: React.FC<BuffUptimesViewProps> = ({
  buffUptimes,
  isLoading,
  showAllBuffs,
  onToggleShowAll,
  reportId,
  fightId,
  selectedTargetId,
  onOpenTimeline,
  canOpenTimeline = false,
}) => {
  const descriptionId = React.useId();

  if (isLoading) {
    return (
      <Box sx={{ mt: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6">Buff Uptimes</Typography>
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rounded" width={120} height={32} />
            <Skeleton variant="circular" width={36} height={36} />
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Shows average buff uptimes across friendly players
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
        <Typography variant="h6">Buff Uptimes</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" onClick={() => onToggleShowAll(!showAllBuffs)}>
            {showAllBuffs ? 'Show Important Only' : 'Show All Buffs'}
          </Button>
          <Tooltip title="View buff uptimes timeline">
            <span>
              <IconButton
                aria-label="Open buff uptimes timeline"
                aria-describedby={descriptionId}
                size="small"
                color="primary"
                onClick={onOpenTimeline}
                disabled={!canOpenTimeline}
              >
                <TimelineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} id={descriptionId}>
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
                    pl: 0.5,
                    '&:hover': {
                      backgroundColor: reportId && fightId ? 'action.hover' : 'transparent',
                    },
                  }}
                  divider
                >
                  <BuffUptimeProgressBar
                    buff={buff}
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
          {showAllBuffs
            ? 'No friendly buff events found.'
            : 'No important buff events found. Try showing all buffs.'}
        </Typography>
      )}
    </Box>
  );
};
