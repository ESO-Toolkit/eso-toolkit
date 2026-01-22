import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  Box,
  Typography,
  LinearProgress,
  Avatar,
  useTheme,
  Chip,
  IconButton,
  Collapse,
} from '@mui/material';
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
    groupAverageUptimePercentage?: number; // Per-stack group average for stagger
  }>; // All stack data for Touch of Z'en to enable switching
  groupAverageUptimePercentage?: number; // Group average uptime percentage for delta calculation
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
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Helper function to get stack gradient
  const getStackGradient = React.useCallback(
    (stackLevel: number): string => {
      const isDark = theme.palette.mode === 'dark';
      // Use gradients from primary (red) through warm colors to blue/purple
      // Matches the app's color scheme and the single-bar gradient style
      const gradients = isDark
        ? [
            // Stack 1: Red gradient
            'linear-gradient(90deg, rgba(211, 47, 47, 0.7) 0%, rgba(244, 67, 54, 0.75) 100%)',
            // Stack 2: Orange gradient
            'linear-gradient(90deg, rgba(255, 87, 34, 0.75) 0%, rgba(255, 112, 67, 0.8) 100%)',
            // Stack 3: Amber gradient
            'linear-gradient(90deg, rgba(255, 152, 0, 0.8) 0%, rgba(255, 179, 0, 0.85) 100%)',
            // Stack 4: Blue gradient (from single bar)
            'linear-gradient(90deg, rgba(59, 130, 246, 0.8) 0%, rgba(96, 165, 250, 0.85) 100%)',
            // Stack 5: Purple gradient (from single bar)
            'linear-gradient(90deg, rgba(139, 92, 246, 0.85) 0%, rgba(167, 139, 250, 0.9) 100%)',
          ]
        : [
            // Stack 1: Light red gradient
            'linear-gradient(90deg, rgba(211, 47, 47, 0.5) 0%, rgba(244, 67, 54, 0.6) 100%)',
            // Stack 2: Light orange gradient
            'linear-gradient(90deg, rgba(255, 87, 34, 0.55) 0%, rgba(255, 112, 67, 0.65) 100%)',
            // Stack 3: Light amber gradient
            'linear-gradient(90deg, rgba(255, 152, 0, 0.6) 0%, rgba(255, 179, 0, 0.7) 100%)',
            // Stack 4: Cyan gradient (from single bar)
            'linear-gradient(90deg, rgba(103, 232, 249, 0.65) 0%, rgba(147, 197, 253, 0.75) 100%)',
            // Stack 5: Light purple gradient (from single bar)
            'linear-gradient(90deg, rgba(196, 181, 253, 0.7) 0%, rgba(216, 180, 254, 0.8) 100%)',
          ];
      return gradients[Math.min(stackLevel - 1, gradients.length - 1)];
    },
    [theme.palette.mode],
  );

  // Get current data for text display (use highest stack for multi-stack abilities)
  const currentData = React.useMemo(() => {
    if (buff.allStacksData && buff.allStacksData.length > 0) {
      // Use the highest stack level for display
      return buff.allStacksData[buff.allStacksData.length - 1];
    }
    return {
      totalDuration: buff.totalDuration,
      uptime: buff.uptime,
      uptimePercentage: buff.uptimePercentage,
      applications: buff.applications,
      groupAverageUptimePercentage: buff.groupAverageUptimePercentage,
    };
  }, [buff]);

  const pct = Math.max(0, Math.min(100, currentData.uptimePercentage));

  // Calculate delta from group average if available
  // For stacked abilities (e.g., Stagger), use the per-stack group average from currentData
  // Otherwise, use the buff-level group average
  const delta = React.useMemo(() => {
    const groupAverage =
      currentData.groupAverageUptimePercentage ?? buff.groupAverageUptimePercentage;
    if (groupAverage !== undefined) {
      return currentData.uptimePercentage - groupAverage;
    }
    return null;
  }, [
    currentData.uptimePercentage,
    currentData.groupAverageUptimePercentage,
    buff.groupAverageUptimePercentage,
  ]);

  const onMainClick = React.useCallback(
    (e?: React.MouseEvent): void => {
      // If multi-stack, toggle expansion instead of opening link
      if (buff.allStacksData && buff.allStacksData.length > 0) {
        if (e) e.stopPropagation();
        setIsExpanded((prev) => !prev);
        return;
      }

      // For single-stack abilities, open ESO Logs link
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
    },
    [
      reportId,
      fightId,
      buff.abilityGameID,
      selectedTargetId,
      buff.isDebuff,
      buff.hostilityType,
      buff.dotAbilityIds,
      buff.allStacksData,
    ],
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
      {/* Progress bars container */}
      <Box
        sx={{
          position: 'relative',
          height: buff.allStacksData ? 56 : 48, // Taller for multi-stack abilities
          borderRadius: 2,
          bgcolor:
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(203, 213, 225, 0.3)',
          border: theme.palette.mode === 'dark' ? 'none' : '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow:
            theme.palette.mode === 'dark'
              ? 'inset 0 1px 3px rgba(0, 0, 0, 0.5)'
              : 'inset 0 1px 2px rgba(15, 23, 42, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Multi-stack progress bars (if available) */}
        {buff.allStacksData
          ? buff.allStacksData
              .slice()
              .sort((a, b) => a.stackLevel - b.stackLevel) // Sort lowest to highest so highest renders last (on top)
              .map((stackData) => {
                const stackPct = Math.max(0, Math.min(100, stackData.uptimePercentage));
                return (
                  <Box
                    key={stackData.stackLevel}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${stackPct}%`,
                      background: getStackGradient(stackData.stackLevel),
                      borderRadius: 2,
                      boxShadow:
                        theme.palette.mode === 'dark'
                          ? '0 1px 4px rgba(0, 0, 0, 0.3)'
                          : '0 1px 2px rgba(0, 0, 0, 0.1)',
                      transition: 'width 0.3s ease-in-out, background 0.3s ease-in-out',
                    }}
                  />
                );
              })
          : // Single progress bar (non-stacked abilities)
            null}
        {!buff.allStacksData && (
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: '100%',
              borderRadius: 2,
              bgcolor: 'transparent',
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
        )}
      </Box>

      {/* Content overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: buff.allStacksData ? 56 : 48, // Match the progress bar container height
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

        {/* Right side: Percentage */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
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
          {/* Delta indicator - only show if groupAverage is provided */}
          {delta !== null && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                ml: 0.5,
              }}
            >
              {/* Show neutral indicator for very close to average (within ±2%) */}
              {Math.abs(delta) < 2 ? (
                <>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
                      textShadow:
                        theme.palette.mode === 'dark'
                          ? '1px 1px 2px rgba(0,0,0,0.8)'
                          : '1px 1px 1px rgba(255,255,255,0.9)',
                    }}
                  >
                    ≈
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      color: theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
                      textShadow:
                        theme.palette.mode === 'dark'
                          ? '1px 1px 2px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'
                          : '1px 1px 1px rgba(255,255,255,0.9), 0 0 3px rgba(255,255,255,0.7)',
                    }}
                  >
                    {delta > 0 ? '+' : ''}
                    {Math.round(delta)}%
                  </Typography>
                </>
              ) : (
                <>
                  {delta > 0 ? (
                    <TrendingUpIcon
                      sx={{
                        fontSize: '1rem',
                        color: '#10b981',
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                      }}
                    />
                  ) : (
                    <TrendingDownIcon
                      sx={{
                        fontSize: '1rem',
                        color: '#ef4444',
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                      }}
                    />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      color: delta > 0 ? '#10b981' : '#ef4444',
                      textShadow:
                        theme.palette.mode === 'dark'
                          ? '1px 1px 2px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'
                          : '1px 1px 1px rgba(255,255,255,0.9), 0 0 3px rgba(255,255,255,0.7)',
                    }}
                  >
                    {delta > 0 ? '+' : ''}
                    {Math.round(delta)}%
                  </Typography>
                </>
              )}
            </Box>
          )}
          {/* Expand/Collapse icon for multi-stack */}
          {buff.allStacksData && buff.allStacksData.length > 0 && (
            <IconButton
              size="small"
              sx={{
                ml: 0.5,
                padding: 0.5,
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease-in-out',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Segmented stack labels (below bar for multi-stack abilities when collapsed) */}
      {buff.allStacksData && buff.allStacksData.length > 0 && !isExpanded && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            mt: 0.5,
            flexWrap: 'wrap',
          }}
        >
          {buff.allStacksData.map((stackData, index) => (
            <React.Fragment key={stackData.stackLevel}>
              {index > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.mode === 'dark' ? '#64748b' : '#94a3b8',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                  }}
                >
                  |
                </Typography>
              )}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '2px',
                    background: getStackGradient(stackData.stackLevel),
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: theme.palette.mode === 'dark' ? '#e2e8f0' : '#475569',
                  }}
                >
                  S{stackData.stackLevel}: {Math.round(stackData.uptimePercentage)}%
                </Typography>
              </Box>
            </React.Fragment>
          ))}
        </Box>
      )}

      {/* Expanded view - individual bars for each stack (highest on top) */}
      {buff.allStacksData && (
        <Collapse in={isExpanded} timeout={300}>
          <Box sx={{ width: '100%', mt: 1 }}>
            {buff.allStacksData
              .slice()
              .sort((a, b) => b.uptimePercentage - a.uptimePercentage) // Sort highest first
              .map((stackData) => {
              const stackPct = Math.max(0, Math.min(100, stackData.uptimePercentage));
              const stackDelta =
                stackData.groupAverageUptimePercentage !== undefined
                  ? stackData.uptimePercentage - stackData.groupAverageUptimePercentage
                  : null;

              return (
                <Box
                  key={stackData.stackLevel}
                  sx={{
                    width: '100%',
                    mb: 0.75,
                    cursor: 'pointer',
                    animation: 'fadeIn 0.3s ease-in-out',
                    '@keyframes fadeIn': {
                      from: {
                        opacity: 0,
                        transform: 'translateY(-10px)',
                      },
                      to: {
                        opacity: 1,
                        transform: 'translateY(0)',
                      },
                    },
                    '&:hover': {
                      opacity: 0.9,
                    },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
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
                  }}
                >
                  {/* Individual stack progress bar */}
                  <Box
                    sx={{
                      position: 'relative',
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(203, 213, 225, 0.2)',
                      border:
                        theme.palette.mode === 'dark'
                          ? 'none'
                          : '1px solid rgba(15, 23, 42, 0.08)',
                      boxShadow:
                        theme.palette.mode === 'dark'
                          ? 'inset 0 1px 2px rgba(0, 0, 0, 0.3)'
                          : 'inset 0 1px 1px rgba(15, 23, 42, 0.05)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Progress fill */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${stackPct}%`,
                        background: getStackGradient(stackData.stackLevel),
                        borderRadius: 1.5,
                        transition: 'width 0.3s ease-in-out',
                      }}
                    />

                    {/* Content overlay */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        px: 1.5,
                        gap: 1,
                      }}
                    >
                      {/* Stack indicator */}
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '2px',
                          background: getStackGradient(stackData.stackLevel),
                          flexShrink: 0,
                          border:
                            theme.palette.mode === 'dark'
                              ? '1px solid rgba(255,255,255,0.2)'
                              : '1px solid rgba(0,0,0,0.1)',
                        }}
                      />

                      {/* Stack label */}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b',
                          textShadow:
                            theme.palette.mode === 'dark'
                              ? '1px 1px 2px rgba(0,0,0,0.8)'
                              : '1px 1px 1px rgba(255,255,255,0.8)',
                          flex: 1,
                        }}
                      >
                        Stack {stackData.stackLevel}
                      </Typography>

                      {/* Applications */}
                      <Typography
                        variant="caption"
                        sx={{
                          color:
                            theme.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.7)'
                              : 'rgba(30, 41, 59, 0.7)',
                          textShadow:
                            theme.palette.mode === 'dark'
                              ? '1px 1px 1px rgba(0,0,0,0.8)'
                              : '1px 1px 1px rgba(255,255,255,0.7)',
                          fontSize: '0.7rem',
                        }}
                      >
                        {stackData.applications}x
                      </Typography>

                      {/* Percentage */}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b',
                          textShadow:
                            theme.palette.mode === 'dark'
                              ? '1px 1px 2px rgba(0,0,0,0.8)'
                              : '1px 1px 1px rgba(255,255,255,0.8)',
                        }}
                      >
                        {Math.round(stackPct)}%
                      </Typography>

                      {/* Delta indicator */}
                      {stackDelta !== null && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          {Math.abs(stackDelta) < 2 ? (
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                color: theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
                              }}
                            >
                              ≈
                            </Typography>
                          ) : (
                            <>
                              {stackDelta > 0 ? (
                                <TrendingUpIcon
                                  sx={{
                                    fontSize: '0.9rem',
                                    color: '#10b981',
                                  }}
                                />
                              ) : (
                                <TrendingDownIcon
                                  sx={{
                                    fontSize: '0.9rem',
                                    color: '#ef4444',
                                  }}
                                />
                              )}
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.65rem',
                                  color: stackDelta > 0 ? '#10b981' : '#ef4444',
                                }}
                              >
                                {stackDelta > 0 ? '+' : ''}
                                {Math.round(stackDelta)}%
                              </Typography>
                            </>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};
