/**
 * BuildCompletionHeader
 * Top bar with editable build name, progress ring, Import/Save/Share buttons,
 * and the addon import dialog.
 */

import {
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  ContentCopyOutlined,
  FileDownloadOutlined,
  FileUploadOutlined,
  Groups as GroupsIcon,
  LinkOutlined,
  MoreVert as MoreVertIcon,
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
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem as MuiMenuItem,
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
import { tempBuildApi } from '@/features/build-editor/api/temp-build-api';
import { PublishBuildDialog } from '@/features/build-hub/components/PublishBuildDialog';
import { saveBuild, updateSavedBuild } from '@/store/saved_builds';
import { attachBuildToSlot, selectSavedRosters } from '@/store/saved_rosters';
import type { RootState } from '@/store/storeWithHistory';
import { encodeBuildToURL } from '@/utils/buildEncoding';
import { snapshotBuildToSlot } from '@/utils/rosterBuildBridge';

import { ESO_CLASSES } from '../data/esoStaticData';
import { useBuildCompleteness } from '../hooks/useBuildCompleteness';
import { selectActiveSetupIndex, selectBuild, selectIsDirty } from '../store/buildEditorSelectors';
import {
  BUILD_EDITOR_STORAGE_KEY,
  loadBuild,
  markSaved,
  setAddonImportString,
  setBuildDescription,
  setBuildName,
} from '../store/buildEditorSlice';
import { BE_TOKENS } from '../theme/buildEditorTokens';
import { exportBuildToCSPSLua } from '../utils/cspsExport';
import {
  parseCSPSInput,
  convertCSPSCharacterToBuild,
  type CSPSCharacterOption,
} from '../utils/cspsImport';

import { AddToRosterDialog } from './AddToRosterDialog';
import { glassInputSx } from './primitives/glassInputSx';

// ─── Module-scope sx factories ────────────────────────────────────────────
// Shared between the 4 dialogs below. Blur reduced from 20px → 10px per
// M9 in the perf audit. Only allocates when isDark flips.
const dialogPaperSx = (isDark: boolean): Record<string, unknown> => ({
  background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(248, 250, 252, 0.98)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
  borderRadius: 3,
});

export const BuildCompletionHeader: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { enqueueSnackbar } = useSnackbar();
  const { isLoggedIn, accessToken } = useAuth();

  // Use the shared narrow selectors. This component still re-renders on
  // every keystroke (it owns the controlled name/description inputs and
  // passes `build` as a prop to AddToRosterDialog), but the re-render no
  // longer cascades into the 11 section components because the parent
  // (BuildEditorLayout) no longer subscribes to `build`.
  const build = useSelector(selectBuild);
  const isDirty = useSelector(selectIsDirty);
  const activeSetupIndex = useSelector(selectActiveSetupIndex);
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

  // Human-readable class label for the identity badge
  const classLabel = React.useMemo(
    () => ESO_CLASSES.find((c) => c.id === build.esoClass)?.label ?? build.esoClass,
    [build.esoClass],
  );
  const completeness = useBuildCompleteness();
  const savedRostersCount = useSelector((s: RootState) => selectSavedRosters(s).length);
  const [importOpen, setImportOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exportString, setExportString] = React.useState('');
  const [isExporting, setIsExporting] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [addToRosterOpen, setAddToRosterOpen] = React.useState(false);
  const [encodedBuildData, setEncodedBuildData] = React.useState('');
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isCreatingLink, setIsCreatingLink] = React.useState(false);
  const isMedium = useMediaQuery(theme.breakpoints.down('lg'));
  const [moreAnchor, setMoreAnchor] = React.useState<null | HTMLElement>(null);
  const [tempLinkDialogOpen, setTempLinkDialogOpen] = React.useState(false);
  const [tempLink, setTempLink] = React.useState('');
  const [tempLinkExpiry, setTempLinkExpiry] = React.useState('');

  // CSPS import state
  const [cspsCharacters, setCspsCharacters] = React.useState<CSPSCharacterOption[]>([]);
  const [selectedCharIndex, setSelectedCharIndex] = React.useState(0);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [importParsed, setImportParsed] = React.useState(false);

  // CSPS export state
  const [cspsExportOpen, setCspsExportOpen] = React.useState(false);
  const [exportLua, setExportLua] = React.useState('');

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

  const handleGetLink = (): void => {
    if (!build.name.trim()) {
      enqueueSnackbar('Please enter a build name before getting a link.', { variant: 'warning' });
      return;
    }
    setIsCreatingLink(true);
    void encodeBuildToURL(build).then((encoded) => {
      if (!encoded) {
        setIsCreatingLink(false);
        enqueueSnackbar('Could not encode build.', { variant: 'error' });
        return;
      }
      void tempBuildApi
        .create(encoded)
        .then((result) => {
          setIsCreatingLink(false);
          const url = `${window.location.origin}${import.meta.env.BASE_URL}b/${result.id}`;
          setTempLink(url);
          setTempLinkExpiry(result.expires_at);
          setTempLinkDialogOpen(true);
        })
        .catch((err: unknown) => {
          setIsCreatingLink(false);
          const message = err instanceof Error ? err.message : String(err);
          enqueueSnackbar(message || 'Could not create temporary link.', { variant: 'error' });
        });
    });
  };

  const handleGuestPublishRedirect = (): void => {
    enqueueSnackbar('Log in to publish your build to the Build Hub.', { variant: 'info' });
  };

  const handleExportClick = (): void => {
    setIsExporting(true);
    void encodeBuildToURL(build).then((encoded) => {
      setIsExporting(false);
      if (!encoded) {
        enqueueSnackbar('Could not encode build for export.', { variant: 'error' });
        return;
      }
      setExportString(encoded);
      setExportOpen(true);
    });
  };

  const handleCopyExport = (): void => {
    navigator.clipboard
      .writeText(exportString)
      .then(() => enqueueSnackbar('Build data copied to clipboard!', { variant: 'info' }))
      .catch(() => enqueueSnackbar('Could not copy to clipboard.', { variant: 'error' }));
  };

  const handleDownloadExport = (): void => {
    const fileName = `${(build.name || 'untitled-build')
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()}.esobuild`;
    const blob = new Blob([exportString], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    enqueueSnackbar(`Exported as ${fileName}`, { variant: 'success' });
  };

  // ── CSPS Import handlers ─────────────────────────────────────────────
  const handleImportParse = (): void => {
    setImportError(null);
    try {
      const result = parseCSPSInput(build.addonImportString);

      if (result.format === 'export-code' && result.directBuild) {
        dispatch(loadBuild(result.directBuild));
        setImportOpen(false);
        setCspsCharacters([]);
        setImportParsed(false);
        setImportError(null);
        enqueueSnackbar(`Imported build from CSPS export code (${result.directBuild.esoClass}).`, {
          variant: 'success',
          autoHideDuration: 6000,
        });
        return;
      }

      setCspsCharacters(result.characters);
      setSelectedCharIndex(0);
      setImportParsed(true);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to parse CSPS data.');
      setImportParsed(false);
    }
  };

  const handleImportLoad = (): void => {
    const character = cspsCharacters[selectedCharIndex];
    if (!character) return;
    try {
      const imported = convertCSPSCharacterToBuild(character);
      dispatch(loadBuild(imported));
      setImportOpen(false);
      setCspsCharacters([]);
      setImportParsed(false);
      setImportError(null);
      enqueueSnackbar(
        `Imported "${character.name}" — set your class, role, and gear to complete the build.`,
        { variant: 'success', autoHideDuration: 6000 },
      );
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to convert CSPS data.');
    }
  };

  const handleImportClose = (): void => {
    setImportOpen(false);
    setCspsCharacters([]);
    setImportParsed(false);
    setImportError(null);
  };

  // ── CSPS Export handlers ────────────────────────────────────────────
  const handleCspsExportOpen = (): void => {
    try {
      const lua = exportBuildToCSPSLua(build);
      setExportLua(lua);
      setCspsExportOpen(true);
    } catch {
      enqueueSnackbar('Could not export build to CSPS format.', { variant: 'error' });
    }
  };

  // ── Shared button styles ──────────────────────────────────────────────
  // Memoized so the spread into 10+ call sites below produces stable
  // object references across re-renders. Only re-allocates when isMobile
  // or isDark flips (theme toggle / viewport resize).
  const pillBase = React.useMemo(
    () =>
      ({
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
      }) as const,
    [isMobile],
  );

  const outlinedPill = React.useMemo(
    () =>
      ({
        ...pillBase,
        borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)',
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        '&:hover': {
          borderColor: 'var(--be-accent, #38bdf8)',
          background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
        },
      }) as const,
    [pillBase, isDark],
  );

  // Shared 1px vertical divider color — appears ~6 times in the action strip.
  const dividerSx = React.useMemo(
    () => ({ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }),
    [isDark],
  );

  // Shared slotProps.paper for the 4 dialogs below. Stable reference means
  // MUI doesn't re-hash the sx on every Build Name keystroke.
  const dialogSlotProps = React.useMemo(() => ({ paper: { sx: dialogPaperSx(isDark) } }), [isDark]);

  return (
    <Box
      sx={{
        viewTransitionName: 'build-hero',
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, md: 2 },
        px: { xs: 1.5, md: 3 },
        py: { xs: 1, md: 1.5 },
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        backgroundColor: isDark ? 'rgba(11, 18, 32, 0.88)' : 'rgba(248, 250, 252, 0.92)',
        backgroundImage:
          'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.07) 0%, transparent 55%)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        flexWrap: 'nowrap',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Build name + short description — single glass container */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          maxWidth: 480,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            background: isDark ? BE_TOKENS.input.dark.bg : BE_TOKENS.input.light.bg,
            borderRadius: '10px',
            border: `1px solid ${isDark ? BE_TOKENS.input.dark.border : BE_TOKENS.input.light.border}`,
            transition: 'border-color 0.2s ease',
            '&:hover': {
              borderColor: isDark
                ? BE_TOKENS.input.dark.hoverBorder
                : BE_TOKENS.input.light.hoverBorder,
            },
            '&:focus-within': {
              borderColor: 'var(--be-accent, #38bdf8)',
            },
          }}
        >
          <input
            placeholder="Untitled Build"
            value={build.name}
            onChange={(e) => dispatch(setBuildName(e.target.value))}
            maxLength={80}
            aria-label="Build name"
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontWeight: 700,
              fontSize: isMobile ? 16 : 19,
              letterSpacing: '-0.3px',
              color: isDark ? '#e2e8f0' : '#0f172a',
              padding: isMobile ? '8px 12px' : '8px 12px 0',
              boxSizing: 'border-box',
            }}
          />
          {/* Description hidden on mobile — saves header height and avoids 16px font
              making the header taller than necessary. Editable via desktop or the
              Settings section which surfaces the field on all viewports. */}
          {!isMobile && (
            <input
              placeholder="Short description (one line summarizing this build)"
              value={build.shortDescription}
              onChange={(e) => dispatch(setBuildDescription(e.target.value))}
              maxLength={140}
              aria-label="Build short description"
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontWeight: 400,
                fontSize: 12,
                color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)',
                padding: '2px 12px 6px',
                boxSizing: 'border-box',
              }}
            />
          )}
        </Box>
      </Box>

      {/* Class + completion badge — combined element */}
      <Tooltip title={`${classLabel} · ${completeness}% complete`}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            flexShrink: 0,
            borderRadius: '10px',
            overflow: 'hidden',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'}`,
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
            height: 36,
          }}
          role="progressbar"
          aria-valuenow={completeness}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${classLabel} build, ${completeness}% complete`}
        >
          {/* Class name */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 1.5,
              height: '100%',
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontSize: { xs: 11, md: 12 },
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--be-accent, #38bdf8)',
              whiteSpace: 'nowrap',
            }}
          >
            {classLabel}
          </Box>
          {/* Progress fill + percentage */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 1,
              height: '100%',
              position: 'relative',
              minWidth: 42,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontSize: 12,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color:
                completeness >= 80
                  ? isDark
                    ? '#fff'
                    : '#fff'
                  : isDark
                    ? 'rgba(255,255,255,0.7)'
                    : 'rgba(0,0,0,0.6)',
              borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            {/* Fill bar behind the number */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: `${completeness}%`,
                background: `var(--be-accent, #38bdf8)`,
                opacity: completeness >= 80 ? 0.85 : 0.15,
                transition: 'width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease',
                borderRadius: completeness >= 100 ? '0 9px 9px 0' : 0,
              }}
            />
            <Box component="span" sx={{ position: 'relative', zIndex: 1 }}>
              {completeness}%
            </Box>
          </Box>
        </Box>
      </Tooltip>

      {/* ── Roster context — shown when editing from a roster slot ── */}
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

      {/* ── Action buttons ─────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.5, md: 1 },
          ml: 'auto',
          flexShrink: 0,
        }}
      >
        {/* ── Transfer segment: Import | Export (icon-only, hidden on medium/mobile) ── */}
        {!isMedium && (
          <Box
            sx={{
              display: 'flex',
              borderRadius: '10px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'}`,
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
              overflow: 'hidden',
              transition: 'border-color 0.2s ease',
              '&:hover': {
                borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)',
              },
            }}
          >
            <Tooltip title="Import build from addon">
              <IconButton
                size="small"
                onClick={() => setImportOpen(true)}
                aria-label="Import build from addon"
                sx={{
                  borderRadius: 0,
                  width: 34,
                  height: 34,
                  color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
                  },
                }}
              >
                <FileUploadOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={dividerSx} />
            <Tooltip title="Export build data">
              <IconButton
                size="small"
                onClick={handleExportClick}
                disabled={isExporting}
                aria-label="Export build data"
                sx={{
                  borderRadius: 0,
                  width: 34,
                  height: 34,
                  color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
                  },
                }}
              >
                {isExporting ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <FileDownloadOutlined sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* ── Preview segment: Share | View (icon-only, hidden on medium/mobile) ── */}
        {!isMedium && (
          <Box
            sx={{
              display: 'flex',
              borderRadius: '10px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'}`,
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
              overflow: 'hidden',
              transition: 'border-color 0.2s ease',
              '&:hover': {
                borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)',
              },
            }}
          >
            <Tooltip title="Copy share link to clipboard">
              <IconButton
                size="small"
                onClick={handleShare}
                aria-label="Share build"
                sx={{
                  borderRadius: 0,
                  width: 34,
                  height: 34,
                  color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
                  },
                }}
              >
                <ShareOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={dividerSx} />
            <Tooltip title="View build in read-only mode">
              <IconButton
                size="small"
                onClick={handleView}
                aria-label="View build in read-only mode"
                sx={{
                  borderRadius: 0,
                  width: 34,
                  height: 34,
                  color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
                  },
                }}
              >
                <VisibilityOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* ── Primary action strip: Save | Get Link | Roster | Publish ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            borderRadius: '12px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'}`,
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            overflow: 'hidden',
            boxShadow: isDark
              ? '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          {/* Save */}
          <Tooltip title={isDirty ? 'Save build' : 'Build saved'}>
            <Button
              size="small"
              onClick={handleSave}
              aria-label={isDirty ? 'Save build' : 'Build saved'}
              sx={{
                borderRadius: 0,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 13,
                px: 1.5,
                minWidth: 0,
                height: 36,
                transition: 'all 0.15s ease',
                color: isDirty
                  ? isDark
                    ? 'rgba(255,255,255,0.9)'
                    : 'rgba(0,0,0,0.8)'
                  : isDark
                    ? 'rgba(255,255,255,0.45)'
                    : 'rgba(0,0,0,0.4)',
                background: isDirty
                  ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)'
                  : 'transparent',
                '&:hover': {
                  background: isDirty
                    ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.22)'
                    : isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.05)',
                  color: isDirty
                    ? isDark
                      ? '#fff'
                      : '#0b1220'
                    : isDark
                      ? 'rgba(255,255,255,0.85)'
                      : 'rgba(0,0,0,0.75)',
                },
              }}
            >
              <SaveOutlined sx={{ fontSize: 16, mr: 0.5 }} />
              {isDirty ? 'Save' : 'Saved'}
            </Button>
          </Tooltip>

          {/* Get Link and Roster hidden on mobile — accessible via "More actions" menu.
              This reduces the action strip to Save | Publish on mobile, fitting
              without wrapping and revealing more header content above the fold (M4). */}
          {!isMobile && (
            <>
              <Divider orientation="vertical" flexItem sx={dividerSx} />

              {/* Get Link (guest only) */}
              {!isLoggedIn && (
                <>
                  <Tooltip title="Save and get a shareable short link (expires in 5 days)">
                    <Button
                      size="small"
                      onClick={handleGetLink}
                      disabled={isCreatingLink}
                      aria-label="Get shareable link"
                      sx={{
                        borderRadius: 0,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: 13,
                        px: 1.5,
                        minWidth: 0,
                        height: 36,
                        color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                          color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
                        },
                      }}
                    >
                      {isCreatingLink ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <>
                          <LinkOutlined sx={{ fontSize: 16, mr: 0.5 }} />
                          Link
                        </>
                      )}
                    </Button>
                  </Tooltip>
                  <Divider orientation="vertical" flexItem sx={dividerSx} />
                </>
              )}

              {/* Roster */}
              <Tooltip
                title={
                  savedRostersCount === 0
                    ? 'Create a roster in the Roster Builder first'
                    : 'Attach this build to a roster slot'
                }
              >
                <Box component="span" sx={{ display: 'flex' }}>
                  <Button
                    size="small"
                    onClick={() => setAddToRosterOpen(true)}
                    aria-label="Add build to roster"
                    sx={{
                      borderRadius: 0,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: 13,
                      px: 1.5,
                      minWidth: 0,
                      height: 36,
                      color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
                      },
                    }}
                  >
                    <GroupsIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    Roster
                  </Button>
                </Box>
              </Tooltip>
            </>
          )}

          {/* Publish — accent end-cap, desktop only. Mobile: in More menu below. */}
          {!isMobile && (
            <>
              <Divider orientation="vertical" flexItem sx={dividerSx} />

              <Tooltip title={isLoggedIn ? 'Publish to Build Hub' : 'Log in to publish your build'}>
                <Box component="span" sx={{ display: 'flex' }}>
                  <Button
                    size="small"
                    onClick={isLoggedIn ? handlePublishClick : handleGuestPublishRedirect}
                    disabled={isPublishing}
                    aria-label={
                      isLoggedIn ? 'Publish build to Build Hub' : 'Log in to publish your build'
                    }
                    sx={{
                      borderRadius: 0,
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: 13,
                      px: 1.75,
                      minWidth: 0,
                      height: 36,
                      color: '#fff',
                      background: 'var(--be-accent, #38bdf8)',
                      transition: 'all 0.18s ease',
                      '&:hover:not(:disabled)': {
                        filter: 'brightness(1.25)',
                        boxShadow: '0 0 16px rgba(var(--be-accent-rgb, 56, 189, 248), 0.45)',
                      },
                      '&.Mui-disabled': {
                        background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)',
                        color: 'rgba(255,255,255,0.5)',
                      },
                    }}
                  >
                    {isPublishing ? (
                      <CircularProgress size={14} sx={{ color: '#fff' }} />
                    ) : (
                      <>
                        <PublishOutlined sx={{ fontSize: 16, mr: 0.5 }} />
                        Publish
                      </>
                    )}
                  </Button>
                </Box>
              </Tooltip>
            </>
          )}
        </Box>

        {/* ── Overflow menu — visible only on medium/mobile viewports ── */}
        {isMedium && (
          <>
            <Tooltip title="More actions">
              <IconButton
                size="small"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => setMoreAnchor(e.currentTarget)}
                aria-label="More actions"
                sx={{
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'}`,
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  borderRadius: '10px',
                  width: 36,
                  height: 36,
                  '&:hover': {
                    borderColor: 'var(--be-accent, #38bdf8)',
                    background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
                  },
                }}
              >
                <MoreVertIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={moreAnchor}
              open={Boolean(moreAnchor)}
              onClose={() => setMoreAnchor(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              slotProps={{
                paper: {
                  sx: {
                    background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                    borderRadius: 2,
                    minWidth: 180,
                  },
                },
              }}
            >
              <MuiMenuItem
                onClick={() => {
                  setMoreAnchor(null);
                  setImportOpen(true);
                }}
              >
                <ListItemIcon>
                  <FileUploadOutlined sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText>Import</ListItemText>
              </MuiMenuItem>
              <MuiMenuItem
                onClick={() => {
                  setMoreAnchor(null);
                  handleExportClick();
                }}
                disabled={isExporting}
              >
                <ListItemIcon>
                  <FileDownloadOutlined sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText>{isExporting ? 'Encoding\u2026' : 'Export'}</ListItemText>
              </MuiMenuItem>
              <MuiMenuItem
                onClick={() => {
                  setMoreAnchor(null);
                  handleCspsExportOpen();
                }}
              >
                <ListItemIcon>
                  <SyncAltIcon sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText>Export to CSPS</ListItemText>
              </MuiMenuItem>
              <Divider />
              {/* Publish — shown in More menu on mobile since it's stripped from inline strip */}
              {isMobile && (
                <>
                  <MuiMenuItem
                    onClick={() => {
                      setMoreAnchor(null);
                      if (isLoggedIn) {
                        handlePublishClick();
                      } else {
                        handleGuestPublishRedirect();
                      }
                    }}
                    disabled={isPublishing}
                  >
                    <ListItemIcon>
                      <PublishOutlined sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText>{isPublishing ? 'Publishing…' : 'Publish to Hub'}</ListItemText>
                  </MuiMenuItem>
                  <Divider />
                </>
              )}
              <MuiMenuItem
                onClick={() => {
                  setMoreAnchor(null);
                  handleShare();
                }}
              >
                <ListItemIcon>
                  <ShareOutlined sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText>Share</ListItemText>
              </MuiMenuItem>
              <MuiMenuItem
                onClick={() => {
                  setMoreAnchor(null);
                  handleView();
                }}
              >
                <ListItemIcon>
                  <VisibilityOutlined sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText>View</ListItemText>
              </MuiMenuItem>
            </Menu>
          </>
        )}
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

      {/* CSPS Import dialog — lazy-mounted so React doesn't build its
          subtree on every Build Name keystroke */}
      {importOpen && (
        <Dialog
          open
          onClose={handleImportClose}
          maxWidth="sm"
          fullWidth
          slotProps={dialogSlotProps}
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
              onClick={handleImportClose}
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
              sx={{
                color: 'text.secondary',
                display: 'block',
                mb: 2,
                fontSize: 12,
                fontFamily: 'Space Grotesk, Inter, system-ui',
              }}
            >
              Paste a <strong>Caro&apos;s Skill Point Saver</strong> export code or SavedVariables
              file content to import skills, attributes, champion points, and gear into your build.
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                placeholder="Paste CSPS export code or SavedVariables content here…"
                value={build.addonImportString}
                onChange={(e) => {
                  dispatch(setAddonImportString(e.target.value));
                  if (importParsed) {
                    setImportParsed(false);
                    setCspsCharacters([]);
                    setImportError(null);
                  }
                }}
                multiline
                minRows={3}
                maxRows={8}
                autoFocus
                sx={glassInputSx(isDark)}
              />

              {importError && (
                <Alert
                  severity="error"
                  sx={{
                    py: 0.25,
                    fontSize: 11,
                    borderRadius: 2,
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                  }}
                >
                  {importError}
                </Alert>
              )}

              {importParsed && cspsCharacters.length > 0 && (
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mb: 1,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      color: 'text.secondary',
                    }}
                  >
                    {cspsCharacters.length === 1
                      ? 'Found 1 character:'
                      : `Found ${cspsCharacters.length} characters — select one to import:`}
                  </Typography>
                  <Stack spacing={0.5}>
                    {cspsCharacters.map((char, idx) => (
                      <Button
                        key={char.compositeKey}
                        variant={idx === selectedCharIndex ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setSelectedCharIndex(idx)}
                        sx={{
                          textTransform: 'none',
                          justifyContent: 'flex-start',
                          fontFamily: 'Space Grotesk, Inter, system-ui',
                          fontSize: 12,
                          borderRadius: 2,
                          ...(idx === selectedCharIndex
                            ? {
                                background:
                                  'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.85), rgba(var(--be-accent-rgb, 56, 189, 248), 0.65))',
                                color: isDark ? '#fff' : '#0b1220',
                              }
                            : {
                                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                              }),
                        }}
                      >
                        <Box component="span" sx={{ fontWeight: 700, mr: 1 }}>
                          {char.name}
                        </Box>
                        <Box component="span" sx={{ opacity: 0.7, fontSize: 10 }}>
                          {char.accountName}
                          {char.profileCount > 0 && ` · ${char.profileCount} profiles`}
                        </Box>
                      </Button>
                    ))}
                  </Stack>
                </Box>
              )}

              <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleImportClose}
                  sx={outlinedPill}
                >
                  Cancel
                </Button>
                {!importParsed ? (
                  <Button
                    variant="contained"
                    size="small"
                    disabled={build.addonImportString.length < 10}
                    onClick={handleImportParse}
                    sx={{
                      ...pillBase,
                      background:
                        'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.85), rgba(var(--be-accent-rgb, 56, 189, 248), 0.65))',
                      '&.Mui-disabled': {
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      },
                    }}
                  >
                    Parse
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    disabled={cspsCharacters.length === 0}
                    onClick={handleImportLoad}
                    sx={{
                      ...pillBase,
                      background:
                        'linear-gradient(135deg, rgba(34, 197, 94, 0.85), rgba(22, 163, 74, 0.75))',
                      '&.Mui-disabled': {
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      },
                    }}
                  >
                    Load Build
                  </Button>
                )}
              </Stack>
            </Stack>
          </DialogContent>
        </Dialog>
      )}

      {/* Export dialog — lazy-mounted */}
      {exportOpen && (
        <Dialog
          open
          onClose={() => setExportOpen(false)}
          maxWidth="sm"
          fullWidth
          slotProps={dialogSlotProps}
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
            Export Build
            <IconButton
              onClick={() => setExportOpen(false)}
              size="small"
              aria-label="Close export dialog"
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mb: 2,
                fontSize: 12,
                fontFamily: 'Space Grotesk, Inter, system-ui',
              }}
            >
              Copy the encoded build string below or download it as a file. This data includes your
              full build configuration — class, gear, skills, champion points, and consumables.
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                value={exportString}
                multiline
                minRows={3}
                maxRows={8}
                slotProps={{ input: { readOnly: true } }}
                onFocus={(e) => e.target.select()}
                sx={glassInputSx(isDark)}
              />
              <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownloadOutlined sx={{ fontSize: 14 }} />}
                  onClick={handleDownloadExport}
                  sx={outlinedPill}
                >
                  Download .esobuild
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<ContentCopyOutlined sx={{ fontSize: 14 }} />}
                  onClick={handleCopyExport}
                  sx={{
                    ...pillBase,
                    background:
                      'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.9), rgba(var(--be-accent-rgb, 56, 189, 248), 0.7))',
                    border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.5)',
                    boxShadow: '0 0 12px rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)',
                    color: isDark ? '#fff' : '#0b1220',
                    '&:hover': {
                      boxShadow: '0 0 18px rgba(var(--be-accent-rgb, 56, 189, 248), 0.35)',
                    },
                  }}
                >
                  Copy to Clipboard
                </Button>
              </Stack>
            </Stack>
          </DialogContent>
        </Dialog>
      )}

      {/* CSPS Export dialog — lazy-mounted */}
      {cspsExportOpen && (
        <Dialog
          open
          onClose={() => setCspsExportOpen(false)}
          maxWidth="sm"
          fullWidth
          slotProps={dialogSlotProps}
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
            Export to CSPS
            <IconButton
              onClick={() => setCspsExportOpen(false)}
              size="small"
              aria-label="Close CSPS export dialog"
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mb: 2,
                fontSize: 12,
                fontFamily: 'Space Grotesk, Inter, system-ui',
              }}
            >
              Your build as a <strong>Caro&apos;s Skill Point Saver</strong> SavedVariables file.
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                value={exportLua}
                multiline
                minRows={6}
                maxRows={12}
                slotProps={{ input: { readOnly: true } }}
                sx={{
                  ...glassInputSx(isDark),
                  '& textarea': { fontFamily: 'monospace', fontSize: 11 },
                }}
              />
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setCspsExportOpen(false)}
                  sx={outlinedPill}
                >
                  Close
                </Button>
                <Tooltip title="Copy to clipboard">
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<ContentCopyOutlined sx={{ fontSize: 14 }} />}
                    onClick={() => {
                      navigator.clipboard
                        .writeText(exportLua)
                        .then(() =>
                          enqueueSnackbar('Copied CSPS Lua to clipboard!', { variant: 'info' }),
                        )
                        .catch(() => enqueueSnackbar('Could not copy.', { variant: 'error' }));
                    }}
                    sx={pillBase}
                  >
                    Copy
                  </Button>
                </Tooltip>
                <Tooltip title="Download as .lua file">
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<FileDownloadOutlined sx={{ fontSize: 14 }} />}
                    onClick={() => {
                      const fileName = `CSPSSavedVariables_${(build.name || 'build')
                        .replace(/[^a-zA-Z0-9-_ ]/g, '')
                        .replace(/\s+/g, '-')
                        .toLowerCase()}.lua`;
                      const blob = new Blob([exportLua], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = fileName;
                      a.click();
                      URL.revokeObjectURL(url);
                      enqueueSnackbar(`Downloaded ${fileName}`, { variant: 'success' });
                    }}
                    sx={pillBase}
                  >
                    Download
                  </Button>
                </Tooltip>
              </Stack>
            </Stack>
          </DialogContent>
        </Dialog>
      )}

      {/* Temp link dialog — shown after creating a guest build link.
          Lazy-mounted. */}
      {tempLinkDialogOpen && (
        <Dialog
          open
          onClose={() => setTempLinkDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          slotProps={dialogSlotProps}
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
            Build Link Created
            <IconButton
              onClick={() => setTempLinkDialogOpen(false)}
              size="small"
              aria-label="Close link dialog"
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mb: 2,
                fontSize: 12,
                fontFamily: 'Space Grotesk, Inter, system-ui',
              }}
            >
              Share this link with anyone — no login required to view.
              {tempLinkExpiry && (
                <>
                  {' '}
                  This link expires on{' '}
                  <strong>
                    {new Date(tempLinkExpiry + 'Z').toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </strong>
                  .
                </>
              )}
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                value={tempLink}
                slotProps={{ input: { readOnly: true } }}
                onFocus={(e) => e.target.select()}
                sx={glassInputSx(isDark)}
              />
              <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
              >
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<ContentCopyOutlined sx={{ fontSize: 14 }} />}
                  onClick={() => {
                    navigator.clipboard
                      .writeText(tempLink)
                      .then(() => enqueueSnackbar('Link copied to clipboard!', { variant: 'info' }))
                      .catch(() => enqueueSnackbar('Could not copy link.', { variant: 'error' }));
                  }}
                  sx={{
                    ...pillBase,
                    background:
                      'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.9), rgba(var(--be-accent-rgb, 56, 189, 248), 0.7))',
                    border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.5)',
                    boxShadow: '0 0 12px rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)',
                    color: isDark ? '#fff' : '#0b1220',
                    '&:hover': {
                      boxShadow: '0 0 18px rgba(var(--be-accent-rgb, 56, 189, 248), 0.35)',
                    },
                  }}
                >
                  Copy Link
                </Button>
              </Stack>
            </Stack>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};
