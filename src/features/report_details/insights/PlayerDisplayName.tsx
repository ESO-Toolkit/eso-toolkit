import { Box, Tooltip, Typography } from '@mui/material';
import React from 'react';

import { OneLineAutoFit } from '../../../components/OneLineAutoFit';

interface PlayerDisplayNameProps {
  displayName: string;
  characterName?: string | null;
}

export const PlayerDisplayName: React.FC<PlayerDisplayNameProps> = ({
  displayName,
  characterName,
}) => {
  const normalizedDisplayName = displayName.trim();
  const trimmedCharacterName = characterName?.trim() ?? '';
  const shouldShowCharacterName =
    trimmedCharacterName.length > 0 &&
    normalizedDisplayName.localeCompare(trimmedCharacterName, undefined, {
      sensitivity: 'base',
    }) !== 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        minWidth: 0,
      }}
    >
      <OneLineAutoFit minScale={0.8}>
        <Tooltip
          title={shouldShowCharacterName ? trimmedCharacterName : ''}
          placement="top"
          arrow
          slotProps={{
            popper: {
              style: { zIndex: 9999 },
            },
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
              fontSize: '1.15rem',
              fontWeight: 600,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              cursor: 'help',
            }}
          >
            {normalizedDisplayName || displayName}
          </Typography>
        </Tooltip>
      </OneLineAutoFit>
    </Box>
  );
};
