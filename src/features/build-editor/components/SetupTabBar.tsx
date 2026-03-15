/**
 * SetupTabBar
 * Horizontal setup switcher at the bottom of the build editor.
 * Shows setup tabs with an animated active indicator.
 */

import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { Box, ButtonBase, IconButton, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { addSetup, deleteSetup, setActiveSetupIndex } from '../store/buildEditorSlice';

export const SetupTabBar: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const prefersReduced = useReducedMotion();

  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: { xs: 1.5, md: 2 },
        py: 1,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        background: isDark ? 'rgba(11, 18, 32, 0.85)' : 'rgba(248, 250, 252, 0.9)',
        backdropFilter: 'blur(12px)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        // Add bottom padding on mobile for nav rail
        pb: isMobile ? 8 : 1,
      }}
      role="tablist"
      aria-label="Build setups"
    >
      {build.setups.map((setup, i) => {
        const active = i === activeSetupIndex;
        return (
          <Box key={setup.id} sx={{ position: 'relative', flexShrink: 0 }}>
            <ButtonBase
              role="tab"
              aria-selected={active}
              aria-label={`Setup: ${setup.name}`}
              onClick={() => dispatch(setActiveSetupIndex(i))}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 2,
                py: 1,
                borderRadius: 2,
                background: active
                  ? isDark
                    ? 'rgba(56, 189, 248, 0.12)'
                    : 'rgba(15, 23, 42, 0.07)'
                  : 'transparent',
                color: active ? 'var(--be-accent, #38bdf8)' : 'text.secondary',
                transition: 'all 0.15s',
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                '&:hover': {
                  background: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.04)',
                },
              }}
            >
              {/* Active dot */}
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: active
                    ? 'var(--be-accent, #38bdf8)'
                    : isDark
                      ? alpha('#fff', 0.2)
                      : alpha('#000', 0.15),
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                fontWeight="inherit"
                color="inherit"
                sx={{ fontSize: 13 }}
              >
                {setup.name}
              </Typography>

              {/* Delete button (only if >1 setup) */}
              {active && build.setups.length > 1 && (
                <IconButton
                  size="small"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    dispatch(deleteSetup(i));
                  }}
                  aria-label={`Delete ${setup.name}`}
                  sx={{
                    p: 0.25,
                    ml: 0.25,
                    color: 'text.disabled',
                    '&:hover': { color: 'error.main' },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              )}
            </ButtonBase>

            {/* Animated underline indicator */}
            {active && (
              <motion.div
                layoutId="setup-active-indicator"
                transition={
                  prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }
                }
                style={{
                  position: 'absolute',
                  bottom: -1,
                  left: 8,
                  right: 8,
                  height: 2,
                  borderRadius: 1,
                  background: 'var(--be-accent, #38bdf8)',
                }}
              />
            )}
          </Box>
        );
      })}

      {/* Add setup */}
      <Tooltip title={build.setups.length >= 5 ? 'Max 5 setups' : 'Add setup'}>
        <Box>
          <IconButton
            size="small"
            onClick={() => dispatch(addSetup())}
            disabled={build.setups.length >= 5}
            aria-label="Add setup"
            sx={{
              width: 32,
              height: 32,
              background: isDark
                ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.1)'
                : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.06)',
              '&:hover': {
                background: isDark
                  ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.2)'
                  : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.1)',
              },
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Tooltip>
    </Box>
  );
};
