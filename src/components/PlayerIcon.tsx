import { Avatar, Box } from '@mui/material';
import React from 'react';

import { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import { resolveActorName } from '../utils/resolveActorName';
import { RoleIndicator } from '../utils/roleColors';

export interface PlayerIconProps {
  player: PlayerDetailsWithRole;
}

export const PlayerIcon: React.FC<PlayerIconProps> = ({ player }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative', mr: 2.5 }}>
      {player.icon ? (
        <Avatar
          src={`https://assets.rpglogs.com/img/eso/icons/${player.icon}.png`}
          alt={String(resolveActorName(player))}
          sx={{ width: 40, height: 40 }}
        />
      ) : (
        <Avatar sx={{ width: 40, height: 40 }} />
      )}
      <Box
        sx={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RoleIndicator role={player.role} />
      </Box>
    </Box>
  );
};
