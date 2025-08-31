import { Box, Typography, LinearProgress, Avatar, useTheme } from '@mui/material';
import React from 'react';

export interface BuffUptime {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  isDebuff: boolean;
  applications: number;
  hostilityType: 0 | 1;
}

interface BuffUptimeProgressBarProps {
  buff: BuffUptime;
  reportId: string | null;
  fightId: string | null;
  selectedTargetId: number | null;
}

const createEsoLogsUrl = (
  reportId: string | null,
  fightId: string | null,
  abilityGameID: string,
  selectedTargetId: number | null,
  isDebuff: boolean,
  hostility: 0 | 1
): string => {
  let url = `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=auras&hostility=${hostility}&ability=${abilityGameID}`;

  if (isDebuff) {
    url += `&spells=auras`;
  }

  if (selectedTargetId) {
    url += `&target=${selectedTargetId}`;
  } else if (hostility === 1) {
    url += '&sourceclass=Boss';
  }

  return url;
};

export const BuffUptimeProgressBar: React.FC<BuffUptimeProgressBarProps> = ({
  buff,
  reportId,
  fightId,
  selectedTargetId,
}) => {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(100, buff.uptimePercentage));

  const onClick = React.useCallback((): void => {
    const url = createEsoLogsUrl(
      reportId,
      fightId,
      buff.abilityGameID,
      selectedTargetId,
      buff.isDebuff,
      buff.hostilityType
    );

    window.open(url, '_blank');
  }, [reportId, fightId, buff.abilityGameID, selectedTargetId, buff.isDebuff, buff.hostilityType]);

  return (
    <Box
      sx={{
        width: '100%',
        position: 'relative',
        cursor: 'pointer',
        '&:hover': {
          opacity: 0.9,
        },
      }}
      onClick={onClick}
    >
      {/* Background progress bar */}
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 48,
          borderRadius: 2,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 2,
            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
          },
        }}
      />

      {/* Content overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          px: 2,
          gap: 1.5,
        }}
      >
        {/* Icon */}
        {buff.icon ? (
          <Avatar
            src={`https://assets.rpglogs.com/img/eso/abilities/${buff.icon}.png`}
            alt={buff.abilityName}
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              boxShadow: 1,
              flexShrink: 0,
            }}
            variant="rounded"
          />
        ) : (
          <Avatar
            sx={{
              width: 32,
              height: 32,
              flexShrink: 0,
            }}
            variant="rounded"
          >
            {buff.abilityName.charAt(0)}
          </Avatar>
        )}

        {/* Text content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: 'white',
              textShadow: theme.palette.mode === 'dark' 
                ? '1px 1px 3px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)'
                : '1px 1px 4px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.7), 0 0 20px rgba(0,0,0,0.4)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {buff.abilityName}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.9)',
              textShadow: theme.palette.mode === 'dark' 
                ? '1px 1px 2px rgba(0,0,0,0.8)'
                : '1px 1px 3px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.6)',
            }}
          >
            {buff.applications} applications • {buff.uptime.toFixed(1)}s total
          </Typography>
        </Box>

        {/* Percentage */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: 'white',
            textShadow: theme.palette.mode === 'dark' 
              ? '1px 1px 3px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)'
              : '1px 1px 4px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.7), 0 0 20px rgba(0,0,0,0.4)',
            flexShrink: 0,
          }}
        >
          {Math.round(pct)}%
        </Typography>
      </Box>
    </Box>
  );
};
