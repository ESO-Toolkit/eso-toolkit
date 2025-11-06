/**
 * Performance Overlay Component
 *
 * Displays FPS, memory usage, and slow frame information in an unobtrusive overlay.
 * Only rendered in development mode with zero production impact.
 *
 * @module PerformanceOverlay
 */

import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  IconButton,
  Collapse,
  Divider,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { Html } from '@react-three/drei';
import React, { useState } from 'react';

import { MemoryData } from './MemoryTracker';
import { SlowFrameData } from './SlowFrameLogger';

interface PerformanceOverlayProps {
  /** Current FPS */
  fps: number;
  /** Minimum FPS */
  minFPS: number;
  /** Maximum FPS */
  maxFPS: number;
  /** Average FPS */
  avgFPS: number;
  /** Total frame count */
  frameCount: number;
  /** Memory data (null if not available) */
  memoryData: MemoryData | null;
  /** Slow frame data */
  slowFrameData: SlowFrameData;
  /** Callback to export performance data */
  onExportData?: () => void;
  /** Callback to close the overlay */
  onClose?: () => void;
  /** Whether to use R3F Html wrapper (true when inside Canvas, false when outside) */
  useHtmlWrapper?: boolean;
}

/**
 * Performance Overlay UI Component
 *
 * Displays real-time performance metrics in a compact, draggable overlay:
 * - FPS counter with min/max/avg
 * - Memory usage with trend indicator
 * - Slow frame warnings
 * - Expandable details panel
 * - Data export capability
 */
export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({
  fps,
  minFPS,
  maxFPS,
  avgFPS,
  frameCount,
  memoryData,
  slowFrameData,
  onExportData,
  onClose,
  useHtmlWrapper = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Determine FPS color based on performance
  const getFPSColor = (fps: number): string => {
    if (fps >= 55) return 'success.main';
    if (fps >= 30) return 'warning.main';
    return 'error.main';
  };

  // Determine memory color based on usage
  const getMemoryColor = (percentUsed: number): string => {
    if (percentUsed < 60) return 'success.main';
    if (percentUsed < 80) return 'warning.main';
    return 'error.main';
  };

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Render the overlay content
  const overlayContent = (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        minWidth: 240,
        maxWidth: 400,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'white',
        zIndex: 9999,
        userSelect: 'none',
      }}
    >
      <Stack spacing={0}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Performance Monitor
          </Typography>
          <Box>
            {onExportData && (
              <Tooltip title="Export Data">
                <IconButton
                  size="small"
                  onClick={onExportData}
                  sx={{ color: 'white', mr: 0.5 }}
                  aria-label="Export Data"
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={expanded ? 'Collapse' : 'Expand'}>
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                sx={{
                  color: 'white',
                  mr: 0.5,
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.3s',
                }}
                aria-label={expanded ? 'Collapse' : 'Expand'}
              >
                <ExpandMoreIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {onClose && (
              <Tooltip title="Close">
                <IconButton
                  size="small"
                  onClick={onClose}
                  sx={{ color: 'white' }}
                  aria-label="Close"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Compact Metrics */}
        <Stack spacing={1} sx={{ px: 2, py: 1.5 }}>
          {/* FPS */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedIcon fontSize="small" />
              <Typography variant="body2">FPS</Typography>
            </Box>
            <Typography variant="h6" fontWeight="bold" sx={{ color: getFPSColor(fps) }}>
              {fps}
            </Typography>
          </Box>

          {/* Memory (if available) */}
          {memoryData && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MemoryIcon fontSize="small" />
                <Typography variant="body2">Memory</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ color: getMemoryColor(memoryData.percentUsed) }}>
                  {memoryData.usedMB} MB
                </Typography>
                <Chip
                  label={`${memoryData.percentUsed}%`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    backgroundColor: getMemoryColor(memoryData.percentUsed),
                    color: 'white',
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Slow Frames Warning */}
          {slowFrameData.slowFrameCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon fontSize="small" sx={{ color: 'warning.main' }} />
                <Typography variant="body2">Slow Frames</Typography>
              </Box>
              <Typography variant="body2" color="warning.main">
                {slowFrameData.slowFrameCount}
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Expanded Details */}
        <Collapse in={expanded}>
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
          <Stack spacing={1.5} sx={{ px: 2, py: 1.5 }}>
            {/* FPS Details */}
            <Box>
              <Typography variant="caption" color="grey.400" gutterBottom>
                FPS Statistics
              </Typography>
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Current:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {fps}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Average:</Typography>
                  <Typography variant="body2">{avgFPS}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Min / Max:</Typography>
                  <Typography variant="body2">
                    {minFPS} / {maxFPS}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Frames:</Typography>
                  <Typography variant="body2">{formatNumber(frameCount)}</Typography>
                </Box>
              </Stack>
            </Box>

            {/* Memory Details */}
            {memoryData && (
              <Box>
                <Typography variant="caption" color="grey.400" gutterBottom>
                  Memory Usage
                </Typography>
                <Stack spacing={0.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Used:</Typography>
                    <Typography variant="body2">{memoryData.usedMB} MB</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Total:</Typography>
                    <Typography variant="body2">{memoryData.totalMB} MB</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Limit:</Typography>
                    <Typography variant="body2">{memoryData.limitMB} MB</Typography>
                  </Box>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Typography variant="body2">Trend:</Typography>
                    <Chip
                      label={memoryData.trend}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        backgroundColor:
                          memoryData.trend === 'increasing'
                            ? 'error.main'
                            : memoryData.trend === 'decreasing'
                              ? 'success.main'
                              : 'grey.700',
                        color: 'white',
                      }}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={memoryData.percentUsed}
                    sx={{
                      mt: 1,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getMemoryColor(memoryData.percentUsed),
                      },
                    }}
                  />
                </Stack>
              </Box>
            )}

            {/* Slow Frame Details */}
            {slowFrameData.slowFrameCount > 0 && (
              <Box>
                <Typography variant="caption" color="grey.400" gutterBottom>
                  Slow Frame Analysis
                </Typography>
                <Stack spacing={0.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Count:</Typography>
                    <Typography variant="body2">{slowFrameData.slowFrameCount}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Worst:</Typography>
                    <Typography variant="body2">{slowFrameData.worstFrameTime}ms</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Average:</Typography>
                    <Typography variant="body2">{slowFrameData.avgSlowFrameTime}ms</Typography>
                  </Box>
                  {slowFrameData.recentSlowFrames.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="grey.500">
                        Recent slow frames:
                      </Typography>
                      <Box
                        sx={{
                          mt: 0.5,
                          maxHeight: 100,
                          overflowY: 'auto',
                          fontSize: '0.7rem',
                          fontFamily: 'monospace',
                          color: 'grey.400',
                        }}
                      >
                        {slowFrameData.recentSlowFrames
                          .slice()
                          .reverse()
                          .map((frame, idx) => (
                            <div key={idx}>{frame.frameTime}ms</div>
                          ))}
                      </Box>
                    </Box>
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        </Collapse>

        {/* Footer */}
        <Box
          sx={{
            px: 2,
            py: 0.5,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <Typography variant="caption" color="grey.500" fontSize="0.65rem">
            Development Mode Only
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );

  // Conditionally wrap with Html component if used inside Canvas
  return useHtmlWrapper ? (
    <Html fullscreen transform={false} zIndexRange={[9999, 0]}>
      {overlayContent}
    </Html>
  ) : (
    overlayContent
  );
};
