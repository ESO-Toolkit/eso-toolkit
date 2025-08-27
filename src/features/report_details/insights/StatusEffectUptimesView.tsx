import { Box, Typography, List, ListItem, Skeleton } from '@mui/material';
import React from 'react';

import { BuffUptime, BuffUptimeProgressBar } from './BuffUptimeProgressBar';

interface StatusEffectUptimesViewProps {
  selectedTargetId: number | null;
  statusEffectUptimes: BuffUptime[] | undefined;
  isLoading: boolean;
  reportId: string | null;
  fightId: string | null;
}

export const StatusEffectUptimesView: React.FC<StatusEffectUptimesViewProps> = ({
  selectedTargetId,
  statusEffectUptimes,
  isLoading,
  reportId,
  fightId,
}) => {
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
          : 'Shows status effects applied to all targets'}
        {selectedTargetId && '. Click on a status effect to view in ESO Logs'}.
      </Typography>

      {statusEffectUptimes && statusEffectUptimes.length > 0 ? (
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          <List disablePadding>
            {statusEffectUptimes.map((statusEffect) => {
              return (
                <ListItem
                  key={statusEffect.abilityGameID}
                  sx={{
                    py: 1,
                    '&:hover': {
                      backgroundColor:
                        reportId && fightId && selectedTargetId ? 'action.hover' : 'transparent',
                    },
                  }}
                  divider
                >
                  <BuffUptimeProgressBar
                    buff={statusEffect}
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
          {selectedTargetId
            ? 'No status effects found for the selected target.'
            : 'No status effects found.'}
        </Typography>
      )}
    </Box>
  );
};
