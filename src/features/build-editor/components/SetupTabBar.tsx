/**
 * SetupTabBar
 * Glass-style setup switcher with gradient active pill,
 * animated glow underline, and glass add button.
 *
 * UX improvements:
 * - Delete confirmation dialog prevents accidental data loss
 * - Double-click tab label to rename inline
 */

import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { addSetup, deleteSetup, renameSetup, setActiveSetupIndex } from '../store/buildEditorSlice';

export const SetupTabBar: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const prefersReduced = useReducedMotion();

  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);

  // ── Delete confirmation state ────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const handleDeleteConfirm = (): void => {
    if (deleteTarget !== null) {
      dispatch(deleteSetup(deleteTarget));
      setDeleteTarget(null);
    }
  };

  // ── Inline rename state ──────────────────────────────────────────────────
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const startRename = (index: number): void => {
    setRenamingIndex(index);
    setRenameValue(build.setups[index].name);
    // Focus the input after state update
    requestAnimationFrame(() => renameInputRef.current?.select());
  };

  const commitRename = (): void => {
    if (renamingIndex !== null) {
      const trimmed = renameValue.trim();
      if (trimmed) {
        dispatch(renameSetup({ index: renamingIndex, name: trimmed }));
      }
      setRenamingIndex(null);
    }
  };

  const cancelRename = (): void => {
    setRenamingIndex(null);
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: { xs: 1.5, md: 2.5 },
          py: 1.25,
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
          background: isDark ? 'rgba(8, 14, 26, 0.90)' : 'rgba(248, 250, 252, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          pb: isMobile ? 8 : 1.25,
          position: 'relative',
          // Subtle accent gradient bleed from left
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '30%',
            background: isDark
              ? 'linear-gradient(90deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.04) 0%, transparent 100%)'
              : 'linear-gradient(90deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.03) 0%, transparent 100%)',
            pointerEvents: 'none',
          },
        }}
        role="tablist"
        aria-label="Build setups"
      >
        {build.setups.map((setup, i) => {
          const active = i === activeSetupIndex;
          const isRenaming = renamingIndex === i;
          return (
            <Box
              key={setup.id}
              sx={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center' }}
            >
              {isRenaming ? (
                // ── Inline rename input ────────────────────────────────────
                <TextField
                  inputRef={renameInputRef}
                  value={renameValue}
                  size="small"
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') cancelRename();
                  }}
                  inputProps={{ maxLength: 32, 'aria-label': 'Rename setup' }}
                  sx={{
                    width: 120,
                    '& .MuiOutlinedInput-root': {
                      fontSize: 13,
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      fontWeight: 600,
                      borderRadius: '99px',
                      height: 34,
                      px: 1,
                      background: isDark
                        ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)'
                        : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.35)',
                      },
                    },
                  }}
                />
              ) : (
                // ── Regular tab button ─────────────────────────────────────
                <Tooltip title="Double-click to rename" enterDelay={800}>
                  <ButtonBase
                    role="tab"
                    aria-selected={active}
                    aria-label={`Setup: ${setup.name}`}
                    onClick={() => dispatch(setActiveSetupIndex(i))}
                    onDoubleClick={() => startRename(i)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 2,
                      py: 0.85,
                      borderRadius: '99px',
                      background: active
                        ? isDark
                          ? 'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.16) 0%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.06) 100%)'
                          : 'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.10) 0%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.04) 100%)'
                        : 'transparent',
                      border: active
                        ? '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)'
                        : '1px solid transparent',
                      boxShadow: active
                        ? isDark
                          ? '0 0 12px rgba(var(--be-accent-rgb, 56, 189, 248), 0.12), inset 0 1px 0 rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
                          : '0 2px 8px rgba(0,0,0,0.06)'
                        : 'none',
                      color: active ? 'var(--be-accent, #38bdf8)' : 'text.secondary',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontWeight: active ? 700 : 500,
                      fontSize: 13,
                      backdropFilter: active ? 'blur(8px)' : 'none',
                      WebkitBackdropFilter: active ? 'blur(8px)' : 'none',
                      '&:hover': {
                        background: active
                          ? undefined
                          : isDark
                            ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)'
                            : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.04)',
                        border: active
                          ? undefined
                          : '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)',
                      },
                    }}
                  >
                    {/* Active dot with glow */}
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: active
                          ? 'var(--be-accent, #38bdf8)'
                          : isDark
                            ? 'rgba(255,255,255,0.18)'
                            : 'rgba(0,0,0,0.14)',
                        boxShadow: active
                          ? '0 0 6px rgba(var(--be-accent-rgb, 56, 189, 248), 0.6)'
                          : 'none',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight="inherit"
                      color="inherit"
                      sx={{
                        fontSize: 13,
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                        letterSpacing: active ? 0.3 : 0,
                      }}
                    >
                      {setup.name}
                    </Typography>
                  </ButtonBase>
                </Tooltip>
              )}

              {/* Delete button — only on active tab, requires confirmation */}
              {active && build.setups.length > 1 && !isRenaming && (
                <Tooltip title="Delete this setup">
                  <IconButton
                    size="small"
                    onClick={() => setDeleteTarget(i)}
                    aria-label={`Delete ${setup.name}`}
                    sx={{
                      width: 20,
                      height: 20,
                      ml: 0.5,
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                      color: 'text.disabled',
                      transition: 'all 0.15s',
                      '&:hover': {
                        color: 'error.main',
                        background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.3)',
                      },
                      p: 0,
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 11 }} />
                  </IconButton>
                </Tooltip>
              )}

              {/* Animated gradient glow underline */}
              {active && !isRenaming && (
                <motion.div
                  layoutId="setup-active-indicator"
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 400, damping: 30 }
                  }
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    left: 12,
                    right: 12,
                    height: 2,
                    borderRadius: 1,
                    background:
                      'linear-gradient(90deg, transparent, var(--be-accent, #38bdf8), transparent)',
                    boxShadow: '0 0 8px rgba(var(--be-accent-rgb, 56, 189, 248), 0.4)',
                  }}
                />
              )}
            </Box>
          );
        })}

        {/* Add setup — glass circle with accent border */}
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
                  ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
                  : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.05)',
                border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                color: 'var(--be-accent, #38bdf8)',
                transition: 'all 0.2s',
                '&:hover': {
                  background: isDark
                    ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.18)'
                    : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)',
                  borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.40)',
                  boxShadow: '0 0 10px rgba(var(--be-accent-rgb, 56, 189, 248), 0.18)',
                },
                '&.Mui-disabled': {
                  opacity: 0.3,
                  border: '1px solid transparent',
                },
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Tooltip>
      </Box>

      {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            background: isDark ? 'rgba(15, 23, 42, 0.97)' : 'rgba(248, 250, 252, 0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontWeight: 700,
            fontSize: 15,
            pb: 0.5,
          }}
        >
          Delete setup?
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontSize: 13 }}
          >
            <strong>
              {deleteTarget !== null ? (build.setups[deleteTarget]?.name ?? 'this setup') : ''}
            </strong>{' '}
            and all its gear, skills, and champion points will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setDeleteTarget(null)}
            sx={{
              borderRadius: '99px',
              textTransform: 'none',
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            color="error"
            onClick={handleDeleteConfirm}
            sx={{
              borderRadius: '99px',
              textTransform: 'none',
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
