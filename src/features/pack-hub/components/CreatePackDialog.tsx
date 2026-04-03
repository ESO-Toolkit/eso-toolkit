import { ArrowBack, ArrowForward, Close, Extension } from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import React from 'react';

import { packHubApi } from '../api/pack-hub-api';
import type { HubPack, PackAddonEntry } from '../types/pack-hub.types';

import { PackAddonsStep } from './pack-addons-step';
import { PackDetailsStep } from './pack-details-step';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreatePackDialogProps {
  open: boolean;
  token: string;
  onClose: () => void;
  onCreated: () => void;
  editingPack?: HubPack;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_LABELS = ['Pack Details', 'Add-ons'] as const;

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const CreatePackDialog: React.FC<CreatePackDialogProps> = ({
  open,
  token,
  onClose,
  onCreated,
  editingPack,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const isEditMode = !!editingPack;

  // ── State ──
  const [step, setStep] = React.useState(0);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [packType, setPackType] = React.useState<string>('addon-pack');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [addons, setAddons] = React.useState<PackAddonEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [titleTouched, setTitleTouched] = React.useState(false);

  // ── Palette ──
  const accentColor = '#c4a44a';
  const accentAlt = '#d4b45a';
  const accentGradient = `linear-gradient(135deg, ${accentColor} 0%, ${accentAlt} 100%)`;

  // ── Glassmorphism tokens ──
  const panelBg = isDark
    ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(3, 7, 18, 0.88) 100%)'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.94) 100%)';
  const panelBorder = isDark
    ? `1px solid ${alpha('#c4a44a', 0.12)}`
    : `1px solid ${alpha('#0f172a', 0.08)}`;
  const panelShadow = isDark
    ? '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.04)'
    : '0 4px 24px rgba(15, 23, 42, 0.08)';

  const shimmer = {
    '@keyframes shimmer': {
      '0%': { backgroundPosition: '-200% center' },
      '100%': { backgroundPosition: '200% center' },
    },
  };

  // ── Handlers ──
  const handleTagToggle = (tag: string): void => {
    if (selectedTags.includes(tag)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
    } else if (selectedTags.length < 5) {
      setSelectedTags((prev) => [...prev, tag]);
    }
  };

  const handlePublish = async (): Promise<void> => {
    if (addons.length === 0) {
      setError('Add at least one addon to your pack.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        pack_type: packType,
        addons,
        tags: selectedTags,
        is_anonymous: isAnonymous,
      };
      if (isEditMode) {
        await packHubApi.update(editingPack.id, payload, token);
      } else {
        await packHubApi.create(payload, token);
      }
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : isEditMode ? 'Failed to update' : 'Failed to create',
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step validation ──
  const canProceedStep0 = !!title.trim();
  const canPublish = addons.length > 0;

  // ── Reset / pre-fill on open ──
  React.useEffect(() => {
    if (open) {
      if (editingPack) {
        setTitle(editingPack.title);
        setDescription(editingPack.description ?? '');
        setPackType(editingPack.pack_type);
        setSelectedTags(editingPack.tags ?? []);
        setIsAnonymous(editingPack.is_anonymous ?? false);
        setAddons(editingPack.addons ?? []);
        setStep(0);
      } else {
        setTitle('');
        setDescription('');
        setPackType('addon-pack');
        setSelectedTags([]);
        setIsAnonymous(false);
        setAddons([]);
        setStep(0);
      }
      setError(null);
      setTitleTouched(false);
    }
  }, [open, editingPack]);

  // ===========================================================================
  // Stepper dots
  // ===========================================================================

  const renderStepper = (): React.ReactElement => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
      }}
    >
      {STEP_LABELS.map((label, i) => (
        <Tooltip key={label} title={label}>
          <Box
            onClick={() => {
              if (i === 0 || canProceedStep0) setStep(i);
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: i === 0 || canProceedStep0 ? 'pointer' : 'default',
              py: 0.5,
              px: 1,
              borderRadius: '8px',
              transition: 'all 0.2s',
              bgcolor: step === i ? alpha(accentColor, 0.1) : 'transparent',
              '&:hover': {
                bgcolor: alpha(accentColor, 0.06),
              },
            }}
          >
            <Box
              sx={{
                width: step === i ? 18 : 7,
                height: 7,
                borderRadius: 4,
                bgcolor:
                  step === i ? accentColor : isDark ? alpha('#fff', 0.12) : alpha('#000', 0.12),
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: step === i ? `0 0 8px ${alpha(accentColor, 0.4)}` : 'none',
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                fontWeight: step === i ? 700 : 500,
                color: step === i ? accentColor : 'text.disabled',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );

  // ===========================================================================
  // Main Render
  // ===========================================================================

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      disableEscapeKeyDown={loading}
      TransitionComponent={Fade}
      transitionDuration={{ enter: 250, exit: 200 }}
      PaperProps={{
        sx: {
          background: panelBg,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: panelBorder,
          borderRadius: isMobile ? 0 : '14px',
          boxShadow: panelShadow,
          overflow: 'hidden',
          minHeight: isMobile ? '100dvh' : undefined,
          maxHeight: isMobile ? '100dvh' : '85vh',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: accentGradient,
            zIndex: 1,
            ...shimmer,
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s linear infinite',
          },
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.35)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          },
        },
      }}
    >
      {/* ── Title ── */}
      <DialogTitle
        sx={{
          py: 2,
          px: { xs: 2.5, sm: 3 },
          borderBottom: panelBorder,
          background: isDark
            ? `linear-gradient(135deg, ${alpha(accentColor, 0.05)} 0%, transparent 100%)`
            : 'transparent',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '11px',
              background: `linear-gradient(135deg, ${alpha(accentColor, 0.18)} 0%, ${alpha(accentAlt, 0.1)} 100%)`,
              border: `1px solid ${alpha(accentColor, 0.25)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              flexShrink: 0,
              '&:hover': {
                transform: 'scale(1.06)',
                boxShadow: `0 0 14px ${alpha(accentColor, 0.2)}`,
              },
            }}
          >
            <Extension sx={{ color: accentColor, fontSize: 20 }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontWeight: 600,
                fontSize: '1.05rem',
                background: accentGradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1.3,
              }}
            >
              {isEditMode ? 'Edit Pack' : 'Create Addon Pack'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.6 }}>
              {isEditMode
                ? 'Update your pack details and addons'
                : 'Share your curated addon collection'}
            </Typography>
          </Box>

          <IconButton
            onClick={onClose}
            disabled={loading}
            size="small"
            aria-label="Close dialog"
            sx={{
              color: 'text.secondary',
              opacity: 0.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                opacity: 1,
                backgroundColor: alpha(accentColor, 0.08),
              },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Stack>

        <Box sx={{ mt: 1.5 }}>{renderStepper()}</Box>
      </DialogTitle>

      {/* ── Content ── */}
      <DialogContent
        sx={{
          flex: 1,
          px: { xs: 2.5, sm: 3 },
          pt: { xs: 2, sm: 2 },
          pb: { xs: 2, sm: 2.5 },
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 5 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: alpha('#fff', 0.1),
            borderRadius: 3,
          },
        }}
      >
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <PackDetailsStep
              title={title}
              description={description}
              packType={packType}
              selectedTags={selectedTags}
              isAnonymous={isAnonymous}
              titleTouched={titleTouched}
              isDark={isDark}
              accentColor={accentColor}
              onTitleChange={setTitle}
              onTitleBlur={() => setTitleTouched(true)}
              onDescriptionChange={setDescription}
              onPackTypeChange={setPackType}
              onTagToggle={handleTagToggle}
              onAnonymousChange={setIsAnonymous}
            />
          ) : (
            <PackAddonsStep
              addons={addons}
              isDark={isDark}
              accentColor={accentColor}
              error={error}
              onAddonsChange={setAddons}
              onError={setError}
            />
          )}
        </AnimatePresence>
      </DialogContent>

      {/* ── Actions ── */}
      <DialogActions
        sx={{
          px: { xs: 2.5, sm: 3 },
          py: 1.75,
          borderTop: panelBorder,
          background: isDark
            ? `linear-gradient(180deg, ${alpha('#0f172a', 0.6)} 0%, ${alpha('#0b1220', 0.8)} 100%)`
            : alpha('#f8fafc', 0.6),
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          gap: 1,
          justifyContent: 'space-between',
        }}
      >
        <Box>
          {step === 1 && (
            <Button
              onClick={() => setStep(0)}
              startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
              disabled={loading}
              sx={{
                borderRadius: 2,
                px: 2,
                color: 'text.secondary',
                fontWeight: 500,
                textTransform: 'none',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: alpha(accentColor, 0.06) },
              }}
            >
              Back
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={onClose}
            disabled={loading}
            sx={{
              borderRadius: 2,
              px: 2.5,
              color: 'text.secondary',
              fontWeight: 500,
              textTransform: 'none',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: alpha('#fff', 0.04),
              },
            }}
          >
            Cancel
          </Button>

          {step === 0 ? (
            <Button
              onClick={() => setStep(1)}
              disabled={!canProceedStep0}
              endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
              variant="contained"
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1,
                background: accentGradient,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.9rem',
                color: '#0b1220',
                boxShadow: `0 4px 14px ${alpha(accentColor, 0.25)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: `0 6px 20px ${alpha(accentColor, 0.4)}`,
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  opacity: 0.5,
                  background: accentGradient,
                  color: alpha('#0b1220', 0.6),
                },
              }}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={() => void handlePublish()}
              disabled={loading || !canPublish}
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1,
                background: accentGradient,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.9rem',
                color: '#0b1220',
                boxShadow: `0 4px 14px ${alpha(accentColor, 0.25)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: `0 6px 20px ${alpha(accentColor, 0.4)}`,
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  opacity: 0.5,
                  background: accentGradient,
                  color: alpha('#0b1220', 0.6),
                },
              }}
            >
              {loading
                ? isEditMode
                  ? 'Updating…'
                  : 'Creating…'
                : isEditMode
                  ? 'Update Pack'
                  : 'Create Pack'}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};
