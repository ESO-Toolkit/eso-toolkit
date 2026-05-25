import { Avatar, Box } from '@mui/material';
import React from 'react';

import { usePlayerAvatarUrl } from '../contexts/PlayerAvatarsContext';
import { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import { resolveActorName } from '../utils/resolveActorName';
import { RoleIndicator } from '../utils/roleColors';

export interface PlayerIconProps {
  player: PlayerDetailsWithRole;
}

export const PlayerIcon: React.FC<PlayerIconProps> = ({ player }) => {
  const customAvatar = usePlayerAvatarUrl(player.displayName, player.server);

  const classIconSrc = player.icon
    ? `https://assets.rpglogs.com/img/eso/icons/${player.icon}.png`
    : undefined;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative', mr: 2.5 }}>
      {customAvatar ? (
        <Avatar
          src={customAvatar}
          alt={String(resolveActorName(player))}
          sx={{ width: 40, height: 40 }}
        />
      ) : classIconSrc ? (
        <Avatar
          src={classIconSrc}
          alt={String(resolveActorName(player))}
          sx={{ width: 40, height: 40 }}
        />
      ) : (
        <Avatar alt="" sx={{ width: 40, height: 40 }} />
      )}
      {/* Class icon badge when showing custom avatar */}
      {customAvatar && classIconSrc && (
        <Box
          sx={{
            position: 'absolute',
            top: -4,
            right: -4,
            zIndex: 2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '1.5px solid',
            borderColor: 'background.paper',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          <img
            src={classIconSrc}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Box>
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
