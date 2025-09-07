import {
  Visibility,
  VisibilityOff,
  Person,
  SmartToy,
  Shield,
  Groups,
  FavoriteRounded,
  HeartBroken,
  CenterFocusWeak,
  CenterFocusStrong,
} from '@mui/icons-material';
import { Card, CardContent, Box, Typography, IconButton, Tooltip } from '@mui/material';
import React, { memo } from 'react';

interface ActorCardProps {
  actor: {
    id: number;
    name: string;
    type: 'player' | 'enemy' | 'boss' | 'friendly_npc' | 'pet';
    role?: 'dps' | 'tank' | 'healer';
    position: [number, number, number];
    isAlive: boolean;
  };
  isSelected: boolean;
  isHidden?: boolean;
  isCameraLocked?: boolean;
  onActorClick: (actorId: number) => void;
  onToggleVisibility?: (actorId: number) => void;
  onToggleCameraLock?: (actorId: number) => void;
}

const getActorTypeIcon = (type: string): React.ReactElement => {
  switch (type) {
    case 'player':
      return <Person fontSize="small" color="primary" />;
    case 'boss':
      return <SmartToy fontSize="small" color="error" />;
    case 'enemy':
      return <Shield fontSize="small" color="warning" />;
    case 'friendly_npc':
      return <Groups fontSize="small" color="success" />;
    case 'pet':
      return <SmartToy fontSize="small" style={{ color: '#ff9800' }} />;
    default:
      return <Groups fontSize="small" />;
  }
};

const getStatusIcon = (isAlive: boolean): React.ReactElement => {
  return isAlive ? (
    <FavoriteRounded fontSize="small" color="success" />
  ) : (
    <HeartBroken fontSize="small" color="error" />
  );
};

export const ActorCard = memo<ActorCardProps>(
  ({
    actor,
    isSelected,
    isHidden = false,
    isCameraLocked = false,
    onActorClick,
    onToggleVisibility,
    onToggleCameraLock,
  }) => {
    // Pre-calculate expensive values
    const esoX = Math.round(actor.position[0] * 1000 + 5235);
    const esoY = Math.round(actor.position[2] * 1000 + 5410);
    const displayX = actor.position[0].toFixed(1);
    const displayZ = actor.position[2].toFixed(1);

    return (
      <Card
        variant="outlined"
        sx={(theme) => ({
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          border: isSelected ? '2px solid' : '1px solid',
          borderColor: isSelected ? theme.palette.primary.main : theme.palette.divider,
          backgroundColor: isSelected
            ? theme.palette.mode === 'dark'
              ? 'rgba(56, 189, 248, 0.15)'
              : 'rgba(25, 118, 210, 0.08)'
            : 'transparent',
          opacity: isHidden ? 0.6 : 1,
          '&:hover': {
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 4px 12px rgba(0, 0, 0, 0.25)'
                : '0 2px 8px rgba(15, 23, 42, 0.1)',
            borderColor: theme.palette.primary.main,
            transform: 'translateY(-1px)',
            opacity: isHidden ? 0.8 : 1,
          },
        })}
        onClick={() => onActorClick(actor.id)}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
            <Typography
              variant="body2"
              fontWeight="medium"
              noWrap
              sx={{
                flex: 1,
                mr: 1,
                opacity: isHidden ? 0.5 : 1,
                textDecoration: isHidden ? 'line-through' : 'none',
              }}
            >
              {actor.name}
            </Typography>
            <Box display="flex" gap={0.5} alignItems="center">
              {onToggleVisibility && (
                <Tooltip
                  title={isHidden ? 'Show actor in 3D view' : 'Hide actor from 3D view'}
                  placement="top"
                >
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(actor.id);
                    }}
                    sx={{
                      p: 0.25,
                      minWidth: 'auto',
                      color: isHidden ? 'text.disabled' : 'text.secondary',
                      '& .MuiSvgIcon-root': {
                        fontSize: '1rem',
                      },
                      '&:hover': {
                        color: isHidden ? 'text.secondary' : 'primary.main',
                      },
                    }}
                  >
                    {isHidden ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </Tooltip>
              )}
              {onToggleCameraLock && (
                <Tooltip
                  title={
                    isCameraLocked ? 'Unlock camera from actor' : 'Lock camera to follow actor'
                  }
                  placement="top"
                >
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCameraLock(actor.id);
                    }}
                    sx={{
                      p: 0.25,
                      minWidth: 'auto',
                      color: isCameraLocked ? 'primary.main' : 'text.secondary',
                      '& .MuiSvgIcon-root': {
                        fontSize: '1rem',
                      },
                      '&:hover': {
                        color: isCameraLocked ? 'primary.dark' : 'primary.main',
                      },
                    }}
                  >
                    {isCameraLocked ? <CenterFocusStrong /> : <CenterFocusWeak />}
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={`Type: ${actor.type}`}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getActorTypeIcon(actor.type)}
                </Box>
              </Tooltip>
              <Tooltip title={actor.isAlive ? 'Alive' : 'Dead'}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getStatusIcon(actor.isAlive)}
                </Box>
              </Tooltip>
            </Box>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              ({displayX}, {displayZ})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ESO: ({esoX}, {esoY})
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  },
);

ActorCard.displayName = 'ActorCard';
