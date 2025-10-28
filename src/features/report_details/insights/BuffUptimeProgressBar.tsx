import { Box, Typography, LinearProgress, Avatar, useTheme, Chip } from '@mui/material';
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
  uniqueKey: string; // Unique identifier to differentiate between stacks
  dotAbilityIds?: number[]; // Optional DOT ability IDs for Touch of Z'en stacks
  stackLevel?: number; // Current selected stack level for Touch of Z'en abilities
  maxStacks?: number; // Maximum stacks available for this ability
  allStacksData?: Array<{
    stackLevel: number;
    totalDuration: number;
    uptime: number;
    uptimePercentage: number;
    applications: number;
  }>; // All stack data for Touch of Z'en to enable switching
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
  hostility: 0 | 1,
  dotAbilityIds?: number[],
): string => {
  let url = `https://www.esologs.com/reports/${reportId}?fight=${fightId}`;

  if (dotAbilityIds && dotAbilityIds.length > 0) {
    // For Touch of Z'en stacks, use the pins format to filter by all DOT abilities
    // Format: pins=2$Off$#244F4B$expression$ability.id IN (id1,id2,id3,...)
    const abilityList = dotAbilityIds.join('%2C'); // URL encode commas
    const pinsExpression = `2%24Off%24%23244F4B%24expression%24ability.id%20IN%20%28${abilityList}%29`;
    url += `&type=auras&spells=debuffs&hostility=1&pins=${pinsExpression}`;
  } else {
    // For regular abilities, use the standard auras view
    url += `&type=auras&hostility=${hostility}&ability=${abilityGameID}`;

    if (isDebuff) {
      url += `&spells=auras`;
    }
  }

  if (selectedTargetId) {
    if (isDebuff) {
      // ESO Logs expects debuff recipients as the "source" query param, so swap the ids here.
      url += `&source=${selectedTargetId}`;
    } else {
      url += `&target=${selectedTargetId}`;
    }
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

  // State to track currently selected stack for Touch of Z'en
  const [selectedStack, setSelectedStack] = React.useState(buff.stackLevel || buff.maxStacks || 5);

  // Get current data based on selected stack
  const currentData = React.useMemo(() => {
    if (buff.allStacksData) {
      const stackData = buff.allStacksData.find((stack) => stack.stackLevel === selectedStack);
      return stackData || buff.allStacksData[buff.allStacksData.length - 1]; // Fallback to highest stack
    }
    return {
      totalDuration: buff.totalDuration,
      uptime: buff.uptime,
      uptimePercentage: buff.uptimePercentage,
      applications: buff.applications,
    };
  }, [buff, selectedStack]);

  const pct = Math.max(0, Math.min(100, currentData.uptimePercentage));

  const onMainClick = React.useCallback((): void => {
    const url = createEsoLogsUrl(
      reportId,
      fightId,
      buff.abilityGameID,
      selectedTargetId,
      buff.isDebuff,
      buff.hostilityType,
      buff.dotAbilityIds,
    );

    window.open(url, '_blank');
  }, [
    reportId,
    fightId,
    buff.abilityGameID,
    selectedTargetId,
    buff.isDebuff,
    buff.hostilityType,
    buff.dotAbilityIds,
  ]);

  const onStackClick = React.useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation(); // Prevent the main click from firing
      if (buff.allStacksData && buff.maxStacks) {
        const nextStack = selectedStack >= buff.maxStacks ? 1 : selectedStack + 1;
        setSelectedStack(nextStack);
      }
    },
    [buff.allStacksData, buff.maxStacks, selectedStack],
  );

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
      onClick={onMainClick}
    >
      {/* Background progress bar */}
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 48,
          borderRadius: 2,
          bgcolor:
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(203, 213, 225, 0.3)',
          border: theme.palette.mode === 'dark' ? 'none' : '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow:
            theme.palette.mode === 'dark'
              ? 'inset 0 1px 3px rgba(0, 0, 0, 0.5)'
              : 'inset 0 1px 2px rgba(15, 23, 42, 0.1)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 2,
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)'
                : 'linear-gradient(90deg, #67e8f9 0%, #93c5fd 25%, #c4b5fd 75%, #f9a8d4 100%)',
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 2px 8px rgba(59, 130, 246, 0.3), 0 0 20px rgba(139, 92, 246, 0.2)'
                : '0 1px 3px rgba(103, 232, 249, 0.3), 0 0 8px rgba(147, 197, 253, 0.2)',
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
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b',
              textShadow:
                theme.palette.mode === 'dark'
                  ? '1px 1px 3px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5), 2px 2px 4px rgba(0,0,0,0.7)'
                  : '1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              mb: 0.25,
            }}
          >
            {buff.abilityName}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color:
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(30, 41, 59, 0.8)',
              textShadow:
                theme.palette.mode === 'dark'
                  ? '1px 1px 2px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)'
                  : '1px 1px 1px rgba(255,255,255,0.7), 0 0 3px rgba(255,255,255,0.5)',
              fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {currentData.applications} applications • {currentData.uptime.toFixed(1)}s total
            </Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              {currentData.applications} apps • {currentData.uptime.toFixed(1)}s total
            </Box>
          </Typography>
        </Box>

        {/* Right side: Stack badge and Percentage */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {buff.maxStacks && (
            <Chip
              label={`${selectedStack}/${buff.maxStacks}`}
              icon={
                buff.allStacksData ? (
                  <Box
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      backgroundColor:
                        theme.palette.mode === 'dark' ? '#fbbf24' : 'rgba(255,255,255,0.9)',
                      mr: 0.5,
                      boxShadow: '0 0 3px rgba(0,0,0,0.3)',
                    }}
                  />
                ) : undefined
              }
              size="small"
              onClick={onStackClick}
              sx={{
                height: 24,
                fontSize: '0.7rem',
                fontWeight: 700,
                background:
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #d97706 0%, #dc2626 100%)'
                    : 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                border: 'none',
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 2px 8px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255,255,255,0.25)'
                    : '0 2px 6px rgba(96, 165, 250, 0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
                backdropFilter: 'blur(8px)',
                cursor: buff.allStacksData ? 'pointer' : 'default',
                transition: 'all 0.15s ease-in-out',
                '&:hover': buff.allStacksData
                  ? {
                      transform: 'scale(1.08)',
                      boxShadow:
                        theme.palette.mode === 'dark'
                          ? '0 4px 12px rgba(59, 130, 246, 0.6), inset 0 1px 0 rgba(255,255,255,0.35)'
                          : '0 3px 8px rgba(96, 165, 250, 0.5), inset 0 1px 0 rgba(255,255,255,0.6)',
                    }
                  : {},
                '&:active': buff.allStacksData
                  ? {
                      transform: 'scale(0.95)',
                    }
                  : {},
                '& .MuiChip-label': {
                  px: buff.allStacksData ? 1 : 1.5,
                  textShadow: theme.palette.mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.6)' : 'none',
                  fontWeight: 800,
                },
                '& .MuiChip-icon': {
                  marginLeft: '4px',
                  marginRight: '-2px',
                },
              }}
            />
          )}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b',
              textShadow:
                theme.palette.mode === 'dark'
                  ? '1px 1px 3px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5), 2px 2px 4px rgba(0,0,0,0.7)'
                  : '1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6)',
            }}
          >
            {Math.round(pct)}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
