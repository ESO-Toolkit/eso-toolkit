import { Avatar } from '@mui/material';
import React from 'react';

import { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import { resolveActorName } from '../utils/resolveActorName';

export interface PlayerIconProps {
  player: PlayerDetailsWithRole;
}

export const PlayerIcon: React.FC<PlayerIconProps> = ({ player }) => {
  return player.icon ? (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/icons/${player.icon}.png`}
      alt={String(resolveActorName(player))}
      sx={{ mr: 2.5 }}
    />
  ) : (
    <Avatar sx={{ mr: 2.5 }} />
  );
};
