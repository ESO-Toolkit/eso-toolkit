import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Add,
  ArrowBack,
  ArrowForward,
  Close,
  DragIndicator,
  Extension,
  RemoveCircleOutlined,
  VisibilityOff,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  IconButton,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

import { type EsouiAddonSearchResult, packHubApi, searchEsouiAddons } from '../api/pack-hub-api';
import type { HubPack, PackAddonEntry, PackType } from '../types/pack-hub.types';
import { PACK_TAG_COLORS, PACK_TYPE_LABELS, PRESET_PACK_TAGS } from '../types/pack-hub.types';

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

const MAX_TAGS = 5;
const PACK_TYPES = ['addon-pack', 'build-pack', 'roster-pack'] as const;
const STEP_LABELS = ['Pack Details', 'Add-ons'] as const;

// ---------------------------------------------------------------------------
// Glassmorphic Input sx helper
// ---------------------------------------------------------------------------

const glassInputSx = (isDark: boolean, accent: string): Record<string, unknown> => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    backgroundColor: isDark ? alpha('#0f172a', 0.8) : '#ffffff',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '& fieldset': {
      borderColor: isDark ? alpha('#38bdf8', 0.15) : alpha('#0f172a', 0.12),
      transition: 'border-color 0.3s ease',
    },
    '&:hover fieldset': {
      borderColor: isDark ? alpha('#38bdf8', 0.35) : alpha('#0f172a', 0.25),
    },
    '&.Mui-focused fieldset': {
      borderColor: accent,
      borderWidth: 2,
    },
    '&.Mui-focused': {
      boxShadow: `0 0 0 3px ${alpha(accent, 0.12)}`,
    },
  },
  '& .MuiInputLabel-root': {
    color: isDark ? '#94a3b8' : '#64748b',
    fontWeight: 400,
    '&.Mui-focused': { color: accent },
  },
});

// ---------------------------------------------------------------------------
// Sortable Addon Row
// ---------------------------------------------------------------------------

interface SortableAddonProps {
  addon: PackAddonEntry;
  isDark: boolean;
  onToggleRequired: (id: number) => void;
  onRemove: (id: number) => void;
}

const SortableAddonRow: React.FC<SortableAddonProps> = ({
  addon,
  isDark,
  onToggleRequired,
  onRemove,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: addon.esouiId,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative' as const,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 30, height: 0, marginBottom: 0, overflow: 'hidden' }}
      transition={{ duration: 0.2 }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          py: 0.85,
          px: 1.5,
          borderRadius: '10px',
          mb: 0.5,
          bgcolor: isDragging
            ? isDark
              ? alpha('#c4a44a', 0.12)
              : alpha('#c4a44a', 0.08)
            : isDark
              ? alpha('#fff', 0.02)
              : alpha('#000', 0.02),
          border: `1px solid ${isDragging ? alpha('#c4a44a', 0.3) : 'transparent'}`,
          boxShadow: isDragging
            ? `0 8px 24px ${alpha('#000', 0.3)}, 0 0 0 1px ${alpha('#c4a44a', 0.2)}`
            : 'none',
          transition: 'background-color 0.15s, border-color 0.15s, box-shadow 0.2s',
          '&:hover': {
            bgcolor: isDark ? alpha('#fff', 0.04) : alpha('#000', 0.04),
          },
        }}
      >
        {/* Drag handle */}
        <Box
          {...attributes}
          {...listeners}
          sx={{
            cursor: isDragging ? 'grabbing' : 'grab',
            display: 'flex',
            alignItems: 'center',
            color: 'text.disabled',
            opacity: 0.5,
            transition: 'opacity 0.15s',
            '&:hover': { opacity: 1, color: '#c4a44a' },
            flexShrink: 0,
          }}
        >
          <DragIndicator sx={{ fontSize: 16 }} />
        </Box>

        {/* Status dot */}
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: addon.required ? '#c4a44a' : alpha('#94a3b8', 0.4),
            boxShadow: addon.required ? `0 0 6px ${alpha('#c4a44a', 0.5)}` : 'none',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
        />

        {/* Name + note */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ lineHeight: 1.3 }}>
            {addon.name}
          </Typography>
          {addon.note && (
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ opacity: 0.7, lineHeight: 1.2 }}
            >
              {addon.note}
            </Typography>
          )}
        </Box>

        {/* ESOUI ID */}
        <Typography
          variant="caption"
          sx={{
            flexShrink: 0,
            fontSize: '0.62rem',
            fontFamily: 'monospace',
            color: isDark ? alpha('#38bdf8', 0.5) : alpha('#0f172a', 0.4),
          }}
        >
          #{addon.esouiId}
        </Typography>

        {/* Required/Optional toggle */}
        <Tooltip title={addon.required ? 'Mark as optional' : 'Mark as required'}>
          <Chip
            label={addon.required ? 'Required' : 'Optional'}
            size="small"
            onClick={() => onToggleRequired(addon.esouiId)}
            sx={{
              height: 22,
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'all 0.15s ease',
              bgcolor: addon.required ? alpha('#c4a44a', 0.15) : 'transparent',
              color: addon.required ? '#c4a44a' : 'text.disabled',
              border: `1px solid ${addon.required ? alpha('#c4a44a', 0.35) : isDark ? alpha('#fff', 0.08) : alpha('#000', 0.1)}`,
              '&:hover': {
                bgcolor: addon.required ? alpha('#c4a44a', 0.25) : alpha('#fff', 0.06),
              },
            }}
          />
        </Tooltip>

        {/* Remove */}
        <Tooltip title="Remove">
          <IconButton
            size="small"
            onClick={() => onRemove(addon.esouiId)}
            sx={{
              p: 0.4,
              color: 'text.disabled',
              transition: 'all 0.15s',
              '&:hover': { color: '#ef4444', bgcolor: alpha('#ef4444', 0.08) },
            }}
          >
            <RemoveCircleOutlined sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Character count progress bar
// ---------------------------------------------------------------------------

const CharProgress: React.FC<{ current: number; max: number; accent: string }> = ({
  current,
  max,
  accent,
}) => {
  const pct = Math.min((current / max) * 100, 100);
  const isNearLimit = pct > 85;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
      <Box
        sx={{
          flex: 1,
          height: 2,
          borderRadius: 1,
          bgcolor: alpha('#fff', 0.06),
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 1,
            bgcolor: isNearLimit ? '#f59e0b' : accent,
            transition: 'width 0.3s ease, background-color 0.3s',
          }}
        />
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.6rem',
          fontFamily: 'monospace',
          color: isNearLimit ? '#f59e0b' : 'text.disabled',
          minWidth: 38,
          textAlign: 'right',
        }}
      >
        {current}/{max}
      </Typography>
    </Box>
  );
};

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
  const [packType, setPackType] = React.useState<PackType>('addon-pack');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [addons, setAddons] = React.useState<PackAddonEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [titleTouched, setTitleTouched] = React.useState(false);

  // Addon search
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<EsouiAddonSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
    } else if (selectedTags.length < MAX_TAGS) {
      setSelectedTags((prev) => [...prev, tag]);
    }
  };

  const handleAddFromSearch = (result: EsouiAddonSearchResult | null): void => {
    if (!result) return;
    if (addons.some((a) => a.esouiId === result.id)) {
      setError(`"${result.title}" is already in this pack.`);
      return;
    }
    setAddons((prev) => [...prev, { esouiId: result.id, name: result.title, required: true }]);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  };

  // Debounced ESOUI search
  const handleSearchInput = (_event: unknown, value: string): void => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(() => {
      void searchEsouiAddons(value.trim())
        .then((results) => {
          setSearchResults(results);
          setSearchLoading(false);
        })
        .catch(() => {
          setSearchResults([]);
          setSearchLoading(false);
        });
    }, 400);
  };

  const handleRemoveAddon = (esouiId: number): void => {
    setAddons((prev) => prev.filter((a) => a.esouiId !== esouiId));
  };

  const handleToggleRequired = (esouiId: number): void => {
    setAddons((prev) =>
      prev.map((a) => (a.esouiId === esouiId ? { ...a, required: !a.required } : a)),
    );
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setAddons((prev) => {
        const oldIdx = prev.findIndex((a) => a.esouiId === active.id);
        const newIdx = prev.findIndex((a) => a.esouiId === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
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
  const titleError = titleTouched && !title.trim();
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
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
      setTitleTouched(false);
    }
  }, [open, editingPack]);

  // Cleanup search timer
  React.useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const atTagLimit = selectedTags.length >= MAX_TAGS;
  const requiredCount = addons.filter((a) => a.required).length;
  const optionalCount = addons.length - requiredCount;

  // ===========================================================================
  // Step 0 — Pack Details
  // ===========================================================================

  const renderStep0 = (): React.ReactElement => (
    <motion.div
      key="step-0"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        {/* Title */}
        <Box>
          <TextField
            label="Pack Name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTitleTouched(true)}
            slotProps={{ htmlInput: { maxLength: 100 } }}
            required
            fullWidth
            size="small"
            autoFocus
            error={titleError}
            helperText={titleError ? 'Give your pack a name' : undefined}
            placeholder="e.g. Trial Essentials, PvP Toolkit"
            sx={glassInputSx(isDark, accentColor)}
          />
          <CharProgress current={title.length} max={100} accent={accentColor} />
        </Box>

        {/* Description */}
        <Box>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            multiline
            rows={3}
            fullWidth
            size="small"
            placeholder="What is this pack for? Who should use it?"
            sx={glassInputSx(isDark, accentColor)}
          />
          <CharProgress current={description.length} max={500} accent={accentColor} />
        </Box>

        {/* Pack type */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.65rem',
              color: 'text.secondary',
              mb: 0.75,
              display: 'block',
            }}
          >
            Pack Type
          </Typography>
          <Select
            size="small"
            value={packType}
            onChange={(e: SelectChangeEvent<PackType>) => setPackType(e.target.value)}
            fullWidth
            sx={{
              borderRadius: 2,
              backgroundColor: isDark ? alpha('#0f172a', 0.8) : '#ffffff',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? alpha('#38bdf8', 0.15) : alpha('#0f172a', 0.12),
                transition: 'border-color 0.3s',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? alpha('#38bdf8', 0.35) : alpha('#0f172a', 0.25),
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: accentColor,
              },
            }}
          >
            {PACK_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {PACK_TYPE_LABELS[t]}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Tags */}
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              mb: 0.75,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.65rem',
                color: 'text.secondary',
              }}
            >
              Tags
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                color: atTagLimit ? '#f59e0b' : 'text.disabled',
                transition: 'color 0.2s',
              }}
            >
              {selectedTags.length}/{MAX_TAGS}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
            {PRESET_PACK_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              const isDisabled = !isSelected && atTagLimit;
              const accent = PACK_TAG_COLORS[tag] ?? '#888';
              return (
                <Tooltip key={tag} title={isDisabled ? `Remove a tag first (max ${MAX_TAGS})` : ''}>
                  <span>
                    <Chip
                      label={tag}
                      size="small"
                      onClick={isDisabled ? undefined : () => handleTagToggle(tag)}
                      variant={isSelected ? 'filled' : 'outlined'}
                      sx={{
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.35 : 1,
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.72rem',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                        ...(isSelected
                          ? {
                              bgcolor: accent,
                              color: '#fff',
                              borderColor: accent,
                              boxShadow: `0 0 10px ${alpha(accent, 0.35)}`,
                              '&:hover': { bgcolor: accent, filter: 'brightness(0.9)' },
                            }
                          : {
                              borderColor: isDark ? alpha(accent, 0.3) : alpha(accent, 0.4),
                              color: accent,
                              '&:hover': isDisabled
                                ? {}
                                : {
                                    bgcolor: alpha(accent, 0.1),
                                    borderColor: accent,
                                    transform: 'scale(1.04)',
                                  },
                            }),
                      }}
                    />
                  </span>
                </Tooltip>
              );
            })}
          </Box>
        </Box>

        {/* Anonymous toggle */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 1.25,
            px: 1.5,
            borderRadius: '10px',
            bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
            border: `1px solid ${isDark ? alpha('#fff', 0.06) : alpha('#000', 0.06)}`,
          }}
        >
          <VisibilityOff sx={{ fontSize: 18, color: 'text.disabled' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
              Publish anonymously
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.2 }}>
              Your name won&apos;t appear on this pack
            </Typography>
          </Box>
          <Switch
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            size="small"
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: accentColor,
                '& + .MuiSwitch-track': {
                  bgcolor: alpha(accentColor, 0.4),
                },
              },
            }}
          />
        </Box>
      </Stack>
    </motion.div>
  );

  // ===========================================================================
  // Step 1 — Addon List Builder
  // ===========================================================================

  const renderStep1 = (): React.ReactElement => (
    <motion.div
      key="step-1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        {/* Header bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Extension sx={{ fontSize: 18, color: accentColor }} />
            <Typography variant="body2" fontWeight={700}>
              Addons
            </Typography>
            {addons.length > 0 && (
              <Chip
                label={addons.length}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  bgcolor: alpha(accentColor, 0.12),
                  color: accentColor,
                  border: `1px solid ${alpha(accentColor, 0.25)}`,
                }}
              />
            )}
          </Box>
          {addons.length > 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>
              {requiredCount} required · {optionalCount} optional
            </Typography>
          )}
        </Box>

        {/* Addon list or empty state */}
        <Box
          sx={{
            borderRadius: '12px',
            border: `1px solid ${addons.length > 0 ? alpha(accentColor, 0.2) : isDark ? alpha('#fff', 0.06) : alpha('#000', 0.06)}`,
            overflow: 'hidden',
            transition: 'border-color 0.3s',
          }}
        >
          {addons.length === 0 ? (
            /* ─── Empty state ─── */
            <Box
              sx={{
                py: 4,
                px: 3,
                textAlign: 'center',
                bgcolor: isDark ? alpha('#fff', 0.015) : alpha('#000', 0.015),
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '14px',
                  mx: 'auto',
                  mb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${alpha(accentColor, 0.12)} 0%, ${alpha(accentColor, 0.04)} 100%)`,
                  border: `1px solid ${alpha(accentColor, 0.2)}`,
                }}
              >
                <Extension sx={{ fontSize: 24, color: alpha(accentColor, 0.6) }} />
              </Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                No addons yet
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.5 }}>
                Use the form below to add addons to your pack.
                <br />
                You can drag to reorder them after adding.
              </Typography>
            </Box>
          ) : (
            /* ─── Sortable addon list ─── */
            <Box
              sx={{
                maxHeight: 240,
                overflowY: 'auto',
                p: 0.5,
                '&::-webkit-scrollbar': { width: 5 },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: alpha('#fff', 0.12),
                  borderRadius: 3,
                },
              }}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={addons.map((a) => a.esouiId)}
                  strategy={verticalListSortingStrategy}
                >
                  <AnimatePresence initial={false}>
                    {addons.map((addon) => (
                      <SortableAddonRow
                        key={addon.esouiId}
                        addon={addon}
                        isDark={isDark}
                        onToggleRequired={handleToggleRequired}
                        onRemove={handleRemoveAddon}
                      />
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>
            </Box>
          )}

          {/* ─── Addon search autocomplete ─── */}
          <Box
            sx={{
              borderTop: `1px solid ${isDark ? alpha('#fff', 0.06) : alpha('#000', 0.06)}`,
              p: 1.5,
              bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
            }}
          >
            <Autocomplete<EsouiAddonSearchResult, false>
              options={searchResults}
              getOptionLabel={(opt) => opt.title}
              filterOptions={(x) => x} // disable client-side filter — server handles it
              inputValue={searchQuery}
              onInputChange={handleSearchInput}
              onChange={(_e, value) => handleAddFromSearch(value)}
              value={null}
              loading={searchLoading}
              loadingText="Searching ESOUI…"
              noOptionsText={
                searchQuery.length < 2 ? 'Type to search ESOUI addons…' : 'No addons found'
              }
              getOptionDisabled={(opt) => addons.some((a) => a.esouiId === opt.id)}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              blurOnSelect
              clearOnBlur={false}
              size="small"
              renderOption={(props, option) => {
                const alreadyAdded = addons.some((a) => a.esouiId === option.id);
                return (
                  <Box
                    component="li"
                    {...props}
                    key={option.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 0.75,
                      px: 1.5,
                      opacity: alreadyAdded ? 0.4 : 1,
                      '&:hover': {
                        bgcolor: `${alpha(accentColor, 0.08)} !important`,
                      },
                    }}
                  >
                    <Add
                      sx={{
                        fontSize: 16,
                        color: alreadyAdded ? 'text.disabled' : accentColor,
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {option.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        by {option.author}
                        {option.category ? ` · ${option.category}` : ''}
                        {option.downloads ? ` · ${option.downloads} downloads` : ''}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.58rem',
                        fontFamily: 'monospace',
                        color: 'text.disabled',
                        flexShrink: 0,
                      }}
                    >
                      #{option.id}
                    </Typography>
                    {alreadyAdded && (
                      <Chip
                        label="Added"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.58rem',
                          fontWeight: 700,
                          bgcolor: alpha(accentColor, 0.12),
                          color: accentColor,
                        }}
                      />
                    )}
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search ESOUI addons…"
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          {searchLoading ? (
                            <CircularProgress size={16} sx={{ color: accentColor, mr: 0.5 }} />
                          ) : (
                            <Extension sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} />
                          )}
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      bgcolor: isDark ? alpha('#0f172a', 0.6) : '#fff',
                      transition: 'all 0.2s',
                      '& fieldset': {
                        borderColor: isDark ? alpha('#c4a44a', 0.15) : alpha('#000', 0.1),
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: accentColor,
                      },
                      '&.Mui-focused': {
                        boxShadow: `0 0 0 3px ${alpha(accentColor, 0.1)}`,
                      },
                    },
                  }}
                />
              )}
              slotProps={{
                paper: {
                  sx: {
                    bgcolor: isDark ? '#0f172a' : '#fff',
                    border: `1px solid ${isDark ? alpha('#c4a44a', 0.15) : alpha('#000', 0.1)}`,
                    borderRadius: '10px',
                    mt: 0.5,
                    boxShadow: isDark
                      ? `0 8px 24px ${alpha('#000', 0.5)}`
                      : '0 4px 16px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    '& .MuiAutocomplete-listbox': {
                      py: 0.5,
                      maxHeight: 240,
                    },
                  },
                },
              }}
            />
          </Box>
        </Box>

        {/* Error */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{
              borderRadius: '10px',
              bgcolor: isDark ? alpha('#ef4444', 0.1) : alpha('#fef2f2', 0.95),
              border: `1px solid ${alpha('#ef4444', 0.3)}`,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            {error}
          </Alert>
        )}
      </Stack>
    </motion.div>
  );

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
          // Animated gold shimmer top edge
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
          {/* Icon badge */}
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

          {/* Title text */}
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

          {/* Close X */}
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

        {/* Stepper */}
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
        <AnimatePresence mode="wait">{step === 0 ? renderStep0() : renderStep1()}</AnimatePresence>
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
        {/* Left side — Back button (step 1 only) */}
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

        {/* Right side — Cancel + Next/Publish */}
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
