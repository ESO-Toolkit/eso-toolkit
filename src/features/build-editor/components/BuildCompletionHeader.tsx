/**
 * BuildCompletionHeader
 * Top bar with editable build name, progress ring, Import/Save/Share buttons,
 * and the addon import dialog.
 */

import {
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  FileUploadOutlined,
  Groups as GroupsIcon,
  PublishOutlined,
  SaveOutlined,
  ShareOutlined,
  SyncAlt as SyncAltIcon,
  VisibilityOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthContext';
import { PublishBuildDialog } from '@/features/build-hub/components/PublishBuildDialog';
import { saveBuild, updateSavedBuild } from '@/store/saved_builds';
import { attachBuildToSlot, selectSavedRosters } from '@/store/saved_rosters';
import type { RootState } from '@/store/storeWithHistory';
import { encodeBuildToURL } from '@/utils/buildEncoding';
import { snapshotBuildToSlot } from '@/utils/rosterBuildBridge';

import { useBuildCompleteness } from '../hooks/useBuildCompleteness';
import {
  BUILD_EDITOR_STORAGE_KEY,
  markSaved,
  setAddonImportString,
  setBuildName,
} from '../store/buildEditorSlice';
import { BE_TOKENS } from '../theme/buildEditorTokens';

import { AddToRosterDialog } from './AddToRosterDialog';
import { glassInputSx } from './primitives/glassInputSx';
import { ProgressRing } from './primitives/ProgressRing';

export const BuildCompletionHeader: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { enqueueSnackbar } = useSnackbar();
  const { isLoggedIn, accessToken } = useAuth();

  const { build, isDirty, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const [searchParams] = useSearchParams();

  // Get the saved build ID from URL params (set when editing an existing saved build)
  const savedBuildId = React.useMemo(() => searchParams.get('id'), [searchParams]);

  // ── Roster context — present when launched via SlotActionPill from Roster Builder
  const rosterContext = React.useMemo(() => {
    const from = searchParams.get('from');
    const slotKey = searchParams.get('slot');
    const rosterId = searchParams.get('rid');
    if (from !== 'roster' || !slotKey) return null;
    return { slotKey, rosterId };
  }, [searchParams]);

  // Look up the roster name for the context banner
  const rosterName = useSelector((s: RootState) => {
    if (!rosterContext?.rosterId) return null;
    return (
      selectSavedRosters(s).find((r) => r.id === rosterContext.rosterId)?.roster.rosterName ?? null
    );
  });

  // Detect if the originating roster was deleted since this editor was opened
  const rosterStillExists = useSelector((s: RootState) =>
    rosterContext?.rosterId
      ? selectSavedRosters(s).some((r) => r.id === rosterContext.rosterId)
      : false,
  );

  // Human-readable slot label (e.g. "dps3" → "DPS 3", "tank1" → "Tank 1")
  const slotLabel = React.useMemo(() => {
    if (!rosterContext) return '';
    const key = rosterContext.slotKey;
    if (key.startsWith('dps')) return `DPS ${key.slice(3)}`;
    if (key.startsWith('tank')) return `Tank ${key.slice(4)}`;
    if (key.startsWith('healer')) return `Healer ${key.slice(6)}`;
    return key;
  }, [rosterContext]);

  const savedBuildExists = useSelector((s: RootState) =>
    savedBuildId ? s.savedBuilds.builds.some((b) => b.id === savedBuildId) : false,
  );
  const completeness = useBuildCompleteness();
  const savedRostersCount = useSelector((s: RootState) => selectSavedRosters(s).length);
  const [importOpen, setImportOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [addToRosterOpen, setAddToRosterOpen] = React.useState(false);
  const [encodedBuildData, setEncodedBuildData] = React.useState('');
  const [isPublishing, setIsPublishing] = React.useState(false);

  const handleSave = (): void => {
    if (!build.name.trim()) {
      enqueueSnackbar('Please enter a build name before saving.', { variant: 'warning' });
      return;
    }
    // Persist to localStorage (quick restore on next visit)
    try {
      localStorage.setItem(BUILD_EDITOR_STORAGE_KEY, JSON.stringify({ build, activeSetupIndex }));
    } catch {
      enqueueSnackbar('Could not save to browser storage.', { variant: 'warning' });
    }
    // Persist to Redux (persisted via redux-persist, powers My Builds page)
    // savedBuildExists guards against silent no-op when the build was deleted in another tab
    if (savedBuildId && savedBuildExists) {
      dispatch(updateSavedBuild({ id: savedBuildId, build }));
    } else {
      dispatch(saveBuild(build));
    }
    dispatch(markSaved());
    enqueueSnackbar('Build saved!', { variant: 'success' });
  };

  const handleShare = (): void => {
    void encodeBuildToURL(build).then((encoded) => {
      if (!encoded) {
        enqueueSnackbar('Could not encode build for sharing.', { variant: 'error' });
        return;
      }
      const url = `${window.location.origin}${import.meta.env.BASE_URL}bv?b=${encoded}`;
      navigator.clipboard
        .writeText(url)
        .then(() => enqueueSnackbar('Share link copied to clipboard!', { variant: 'info' }))
        .catch(() => enqueueSnackbar('Could not copy link.', { variant: 'error' }));
    });
  };

  const handleView = (): void => {
    void encodeBuildToURL(build).then((encoded) => {
      if (!encoded) {
        enqueueSnackbar('Could not encode build.', { variant: 'error' });
        return;
      }
      window.open(`${import.meta.env.BASE_URL}bv?b=${encoded}`, '_blank', 'noopener,noreferrer');
    });
  };

  // ── Roster round-trip: apply changes back to the originating slot ──
  const handleApplyToRoster = (): void => {
    if (!rosterContext?.rosterId || !rosterContext.slotKey) return;
    if (!rosterStillExists) {
      enqueueSnackbar(
        `Roster "${rosterName ?? 'Roster'}" no longer exists — changes could not be applied.`,
        { variant: 'error' },
      );
      return;
    }
    dispatch(
      attachBuildToSlot({
        rosterId: rosterContext.rosterId,
        slotKey: rosterContext.slotKey,
        buildRef: {
          buildId: build.id,
          setupIndex: activeSetupIndex,
          buildName: build.name || 'Untitled Build',
          esoClass: build.esoClass,
          role: build.role,
        },
        inlineData: snapshotBuildToSlot(build, activeSetupIndex),
      }),
    );
    enqueueSnackbar(`Changes applied to ${slotLabel} in "${rosterName ?? 'Roster'}"`, {
      variant: 'success',
    });
    navigate('/roster-builder');
  };

  const handleBackToRoster = (): void => {
    navigate('/roster-builder');
  };

  const handlePublishClick = (): void => {
    if (!build.name.trim()) {
      enqueueSnackbar('Please enter a build name before publishing.', { variant: 'warning' });
      return;
    }
    setIsPublishing(true);
    void encodeBuildToURL(build).then((encoded) => {
      setIsPublishing(false);
      if (!encoded) {
        enqueueSnackbar('Could not encode build for publishing.', { variant: 'error' });
        return;
      }
      setEncodedBuildData(encoded);
      setPublishOpen(true);
    });
  };

  // ── Shared button styles ──────────────────────────────────────────────
  const pillBase = {
    borderRadius: '99px',
    textTransform: 'none' as const,
    fontWeight: 600,
    letterSpacing: 0.2,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    // Mobile: compact icon-only pills; desktop: full labels
    fontSize: isMobile ? 12 : 13,
    px: isMobile ? 1 : 1.75,
    minWidth: isMobile ? 36 : undefined,
  } as const;

  const outlinedPill = {
    ...pillBase,
    borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)',
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    '&:hover': {
      borderColor: 'var(--be-accent, #38bdf8)',
      background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
    },
  } as const;

  // Vertical divider between button groups
  const groupDivider = (
    <Divider
      orientation="vertical"
      flexItem
      sx={{
        mx: 0.5,
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        alignSelf: 'center',
        height: 20,
      }}
    />
  );

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, md: 2 },
        px: { xs: 2, md: 3 },
        py: 1.75,
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        backgroundColor: isDark ? 'rgba(11, 18, 32, 0.88)' : 'rgba(248, 250, 252, 0.92)',
        // Subtle class-accent gradient bleeds from top-left
        backgroundImage:
          'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.07) 0%, transparent 55%)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        flexWrap: 'nowrap',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Build name — heading-style: no visible border until hover/focus */}
      <TextField
        size="small"
        placeholder="Untitled Build"
        value={build.name}
        onChange={(e) => dispatch(setBuildName(e.target.value))}
        inputProps={{ maxLength: 80, 'aria-label': 'Build name' }}
        sx={{
          flex: 1,
          minWidth: 160,
          maxWidth: 480,
          '& .MuiOutlinedInput-root': {
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontWeight: 700,
            fontSize: { xs: 15, md: 19 },
            letterSpacing: '-0.3px',
            background: isDark ? BE_TOKENS.input.dark.bg : BE_TOKENS.input.light.bg,
            borderRadius: '10px',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? BE_TOKENS.input.dark.border : BE_TOKENS.input.light.border,
              transition: 'border-color 0.2s ease',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark
                ? BE_TOKENS.input.dark.hoverBorder
                : BE_TOKENS.input.light.hoverBorder,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--be-accent, #38bdf8)',
              borderWidth: '1px',
            },
          },
        }}
      />

      {/* Class identity badge — only on desktop, only when class is selected */}
      {build.esoClass && !isMobile && (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.6,
            borderRadius: '99px',
            background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)',
            border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.28)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: 'var(--be-accent, #38bdf8)',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            boxShadow: '0 0 8px rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)',
          }}
        >
          {build.esoClass}
        </Box>
      )}

      {/* Progress ring — with glowing halo that brightens as build fills out */}
      <Tooltip title={`Build ${completeness}% complete`}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            borderRadius: '50%',
            boxShadow:
              completeness > 10
                ? '0 0 20px rgba(var(--be-accent-rgb, 56, 189, 248), 0.22), 0 0 40px rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
                : 'none',
            transition: 'box-shadow 0.4s ease',
          }}
        >
          <ProgressRing value={completeness} size={52} showLabel />
        </Box>
      </Tooltip>

      {/* ── Roster context banner — shown when editing from a roster slot ── */}
      {rosterContext && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            flexShrink: 0,
          }}
        >
          <Tooltip title="Return to Roster Builder without applying">
            <Button
              variant="outlined"
              size="small"
              startIcon={!isMobile ? <ArrowBackIcon sx={{ fontSize: 14 }} /> : undefined}
              onClick={handleBackToRoster}
              aria-label="Back to Roster"
              sx={{
                ...pillBase,
                borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)',
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                '&:hover': {
                  borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                },
              }}
            >
              {isMobile ? <ArrowBackIcon sx={{ fontSize: 16 }} /> : 'Back'}
            </Button>
          </Tooltip>
          {rosterContext.rosterId && (
            <Tooltip title={`Apply changes to ${slotLabel} in "${rosterName ?? 'Roster'}"`}>
              <Button
                variant="contained"
                size="small"
                startIcon={!isMobile ? <SyncAltIcon sx={{ fontSize: 14 }} /> : undefined}
                onClick={handleApplyToRoster}
                aria-label="Apply changes to roster slot"
                sx={{
                  ...pillBase,
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(109,40,217,0.8))',
                  border: '1px solid rgba(139,92,246,0.5)',
                  boxShadow: '0 0 12px rgba(139,92,246,0.30)',
                  color: '#fff',
                  '&:hover': {
                    boxShadow: '0 0 18px rgba(139,92,246,0.45)',
                  },
                }}
              >
                {isMobile ? <SyncAltIcon sx={{ fontSize: 16 }} /> : `Apply to ${slotLabel}`}
              </Button>
            </Tooltip>
          )}
          <Divider
            orientation="vertical"
            flexItem
            sx={{
              mx: 0.25,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              alignSelf: 'center',
              height: 20,
            }}
          />
        </Box>
      )}

      {/* ── Action buttons — grouped with dividers ─────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          ml: rosterContext ? 0 : 'auto',
          flexShrink: 0,
        }}
      >
        {/* Group 1: Data — Import + Save */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Import build from addon">
            <Button
              variant="outlined"
              size="small"
              startIcon={!isMobile ? <FileUploadOutlined sx={{ fontSize: 14 }} /> : undefined}
              onClick={() => setImportOpen(true)}
              aria-label="Import build from addon"
              sx={outlinedPill}
            >
              {isMobile ? <FileUploadOutlined sx={{ fontSize: 16 }} /> : 'Import'}
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={!isMobile ? <SaveOutlined sx={{ fontSize: 14 }} /> : undefined}
            onClick={handleSave}
            aria-label={isDirty ? 'Save build' : 'Build saved'}
            sx={{
              ...pillBase,
              minWidth: isMobile ? 36 : 80,
              ...(isDirty
                ? {
                    background:
                      'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.9), rgba(var(--be-accent-rgb, 56, 189, 248), 0.7))',
                    border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.5)',
                    boxShadow: '0 0 12px rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)',
                    color: isDark ? '#fff' : '#0b1220',
                    '&:hover': {
                      boxShadow: '0 0 18px rgba(var(--be-accent-rgb, 56, 189, 248), 0.35)',
                    },
                  }
                : {
                    background: isDark ? 'rgba(34, 197, 94, 0.18)' : 'rgba(5, 150, 105, 0.12)',
                    border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.35)' : 'rgba(5, 150, 105, 0.3)'}`,
                    color: isDark ? '#4ade80' : '#059669',
                    boxShadow: 'none',
                  }),
            }}
          >
            {isMobile ? <SaveOutlined sx={{ fontSize: 16 }} /> : isDirty ? 'Save' : 'Saved'}
          </Button>
        </Box>

        {groupDivider}

        {/* Group 2: Output — Share + View */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Copy share link to clipboard">
            <Button
              variant="outlined"
              size="small"
              startIcon={!isMobile ? <ShareOutlined sx={{ fontSize: 14 }} /> : undefined}
              onClick={handleShare}
              aria-label="Share build"
              sx={outlinedPill}
            >
              {isMobile ? <ShareOutlined sx={{ fontSize: 16 }} /> : 'Share'}
            </Button>
          </Tooltip>
          <Tooltip title="View build in read-only mode">
            <Button
              variant="outlined"
              size="small"
              startIcon={!isMobile ? <VisibilityOutlined sx={{ fontSize: 14 }} /> : undefined}
              onClick={handleView}
              aria-label="View build in read-only mode"
              sx={outlinedPill}
            >
              {isMobile ? <VisibilityOutlined sx={{ fontSize: 16 }} /> : 'View'}
            </Button>
          </Tooltip>
        </Box>

        {groupDivider}

        {/* Group 3: Distribution — Roster + Publish */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip
            title={
              savedRostersCount === 0
                ? 'Create a roster in the Roster Builder first'
                : 'Attach this build to a roster slot'
            }
          >
            <Box component="span">
              <Button
                variant="outlined"
                size="small"
                startIcon={!isMobile ? <GroupsIcon sx={{ fontSize: 14 }} /> : undefined}
                onClick={() => setAddToRosterOpen(true)}
                aria-label="Add build to roster"
                sx={{
                  ...pillBase,
                  borderColor:
                    savedRostersCount > 0
                      ? isDark
                        ? 'rgba(139,92,246,0.4)'
                        : 'rgba(109,40,217,0.25)'
                      : isDark
                        ? 'rgba(255,255,255,0.10)'
                        : 'rgba(0,0,0,0.10)',
                  background:
                    savedRostersCount > 0
                      ? isDark
                        ? 'rgba(139,92,246,0.08)'
                        : 'rgba(109,40,217,0.05)'
                      : isDark
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(0,0,0,0.02)',
                  color:
                    savedRostersCount > 0
                      ? isDark
                        ? 'rgb(167,139,250)'
                        : 'rgb(109,40,217)'
                      : 'text.disabled',
                  '&:hover': {
                    borderColor: 'rgba(139,92,246,0.6)',
                    background: 'rgba(139,92,246,0.12)',
                    color: isDark ? 'rgb(196,181,253)' : 'rgb(109,40,217)',
                  },
                }}
              >
                {isMobile ? <GroupsIcon sx={{ fontSize: 16 }} /> : 'Roster'}
              </Button>
            </Box>
          </Tooltip>
          {isLoggedIn && (
            <Button
              variant="contained"
              size="small"
              startIcon={
                !isMobile ? (
                  isPublishing ? (
                    <CircularProgress size={12} color="inherit" />
                  ) : (
                    <PublishOutlined sx={{ fontSize: 14 }} />
                  )
                ) : undefined
              }
              onClick={handlePublishClick}
              disabled={isPublishing}
              aria-label="Publish build to Build Hub"
              sx={{
                ...pillBase,
                background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                color: '#fff',
                border: 'none',
                boxShadow: '0 0 12px rgba(6,182,212,0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #38bdf8 0%, #22d3ee 100%)',
                  boxShadow: '0 0 18px rgba(6,182,212,0.5)',
                },
                '&.Mui-disabled': {
                  background: 'linear-gradient(135deg, #22d3ee80 0%, #06b6d480 100%)',
                  color: 'rgba(255,255,255,0.7)',
                },
              }}
            >
              {isMobile ? (
                isPublishing ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <PublishOutlined sx={{ fontSize: 16 }} />
                )
              ) : isPublishing ? (
                'Encoding\u2026'
              ) : (
                'Publish'
              )}
            </Button>
          )}
        </Box>
      </Box>

      {/* Publish dialog */}
      {isLoggedIn && accessToken && (
        <PublishBuildDialog
          open={publishOpen}
          buildData={encodedBuildData}
          esoClass={build.esoClass}
          role={build.role}
          gameMode={build.gameMode}
          onClose={() => setPublishOpen(false)}
          onPublished={() => {
            enqueueSnackbar('Build published to the Hub!', { variant: 'success' });
            navigate('/build-hub');
          }}
          token={accessToken}
        />
      )}

      {/* Add to roster dialog */}
      <AddToRosterDialog
        open={addToRosterOpen}
        onClose={() => setAddToRosterOpen(false)}
        build={build}
      />

      {/* Import dialog */}
      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(248, 250, 252, 0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontWeight: 700,
            fontSize: 16,
            pb: 0.5,
          }}
        >
          Import from Addon
          <IconButton
            onClick={() => setImportOpen(false)}
            size="small"
            aria-label="Close import dialog"
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              mb: 2,
              fontSize: 12,
              fontFamily: 'Space Grotesk, Inter, system-ui',
            }}
          >
            Paste an export string from <strong>Combat Metrics</strong> or{' '}
            <strong>Caro&apos;s Skill Point Saver</strong> to auto-populate your build.
          </Typography>
          <Stack spacing={1.5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Paste addon export string here…"
              value={build.addonImportString}
              onChange={(e) => dispatch(setAddonImportString(e.target.value))}
              multiline
              minRows={3}
              maxRows={8}
              autoFocus
              sx={glassInputSx(isDark)}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
              <Button
                variant="outlined"
                size="small"
                onClick={() => setImportOpen(false)}
                sx={outlinedPill}
              >
                Cancel
              </Button>
              <Tooltip title="Addon import coming soon — configure your build manually for now">
                <Box>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={build.addonImportString.length < 10}
                    onClick={() => {
                      enqueueSnackbar(
                        'Addon import coming soon — configure your build manually for now.',
                        { variant: 'info', autoHideDuration: 4000 },
                      );
                    }}
                    sx={{
                      ...pillBase,
                      background:
                        'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.85), rgba(var(--be-accent-rgb, 56, 189, 248), 0.65))',
                      boxShadow: '0 0 10px rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)',
                      '&:hover': {
                        boxShadow: '0 0 16px rgba(var(--be-accent-rgb, 56, 189, 248), 0.30)',
                      },
                      '&.Mui-disabled': {
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        boxShadow: 'none',
                      },
                    }}
                  >
                    Load Build
                  </Button>
                </Box>
              </Tooltip>
            </Stack>
            <Alert
              severity="info"
              sx={{
                py: 0.25,
                fontSize: 11,
                borderRadius: 2,
                background: isDark ? 'rgba(56, 189, 248, 0.06)' : 'rgba(56, 189, 248, 0.04)',
                border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.15)',
                fontFamily: 'Space Grotesk, Inter, system-ui',
              }}
            >
              Addon import is coming soon — configure your build using the sections on the page.
            </Alert>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
