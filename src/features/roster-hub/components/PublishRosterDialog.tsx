import {
  Add as AddIcon,
  PublishRounded,
  Add,
  CheckCircle,
  ExpandLess,
  ExpandMore,
  Extension,
  RemoveCircleOutline,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';

import { packsApi } from '../../build-hub/api/packs-api';
import type { Pack, PackAddonEntry, PackIndexItem } from '../../build-hub/api/packs-api';
import { TRIALS } from '../../loadout-manager/data/trialConfigs';
import {
  type EsouiAddonSearchResult,
  packHubApi,
  searchEsouiAddons,
} from '../../pack-hub/api/pack-hub-api';
import { rosterHubApi } from '../api/roster-hub-api';
import type {
  HubRoster,
  RecommendedAddonEntry,
  RecommendedAddons,
} from '../types/roster-hub.types';
import { TAG_COLORS } from '../types/roster-hub.types';

interface PublishRosterDialogProps {
  open: boolean;
  rosterData: string; // compact encoded roster from encodeRosterToURL
  onClose: () => void;
  onPublished: () => void;
  token: string;
  /** When provided, the dialog operates in edit mode — updates the existing hub roster. */
  editingRoster?: HubRoster;
}

const HUB_TRIALS = TRIALS.filter((t) => t.type === 'trial');
const MAX_TAGS = 5;

type Difficulty = 'vet' | 'normal';
const EXTRA_PRESET_TAGS = ['score-push', 'farm'] as const;

/** Convert a pack addon entry to the roster recommendation format. */
function packAddonToRecommended(addon: PackAddonEntry): RecommendedAddonEntry {
  return {
    esouiId: addon.esouiId,
    name: addon.name,
    required: addon.required,
    note: addon.note,
  };
}

export const PublishRosterDialog: React.FC<PublishRosterDialogProps> = ({
  open,
  rosterData,
  onClose,
  onPublished,
  token,
  editingRoster,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isEditMode = !!editingRoster;
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [trialId, setTrialId] = React.useState('');
  const [difficulty, setDifficulty] = React.useState<Difficulty | null>(null);
  const [hmEnabled, setHmEnabled] = React.useState(false);
  const [extraTags, setExtraTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');
  const [addingCustom, setAddingCustom] = React.useState(false);
  const customInputRef = React.useRef<HTMLInputElement>(null);
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Compose the final tags array from difficulty + hm + extras
  const selectedTags = React.useMemo(() => {
    const tags: string[] = [];
    if (difficulty) tags.push(difficulty);
    if (difficulty === 'vet' && hmEnabled) tags.push('hm');
    tags.push(...extraTags);
    return tags;
  }, [difficulty, hmEnabled, extraTags]);

  // ── Addon recommendation state ──
  const [addonSectionOpen, setAddonSectionOpen] = React.useState(false);
  const [addonTab, setAddonTab] = React.useState<0 | 1>(0); // 0 = Browse, 1 = Create New
  const [packs, setPacks] = React.useState<PackIndexItem[]>([]);
  const [packsLoading, setPacksLoading] = React.useState(false);
  const [selectedPackId, setSelectedPackId] = React.useState<string | null>(null);
  const [selectedPack, setSelectedPack] = React.useState<Pack | null>(null);
  const [packDetailLoading, setPackDetailLoading] = React.useState(false);
  const [addonList, setAddonList] = React.useState<RecommendedAddonEntry[]>([]);
  const [enabledAddons, setEnabledAddons] = React.useState<Set<number>>(new Set());
  const [customAddonName, setCustomAddonName] = React.useState('');
  const [customAddonId, setCustomAddonId] = React.useState('');

  // ── Create New pack state ──
  const [newPackTitle, setNewPackTitle] = React.useState('');
  const [newPackDescription, setNewPackDescription] = React.useState('');
  const [newPackAddons, setNewPackAddons] = React.useState<RecommendedAddonEntry[]>([]);
  const [newPackCreating, setNewPackCreating] = React.useState(false);
  const [newPackError, setNewPackError] = React.useState<string | null>(null);
  const [addonSearchQuery, setAddonSearchQuery] = React.useState('');
  const [addonSearchResults, setAddonSearchResults] = React.useState<EsouiAddonSearchResult[]>([]);
  const [addonSearchLoading, setAddonSearchLoading] = React.useState(false);

  const handleTrialChange = (e: SelectChangeEvent): void => {
    setTrialId(e.target.value);
  };

  const handleDifficultyChange = (d: Difficulty): void => {
    setDifficulty((prev) => (prev === d ? null : d));
    if (d !== 'vet') setHmEnabled(false);
  };

  const addTag = (tag: string): void => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || selectedTags.includes(trimmed) || selectedTags.length >= MAX_TAGS) return;
    setExtraTags((prev) => [...prev, trimmed]);
  };

  const removeTag = (tag: string): void => {
    // Handle removing difficulty/hm via the chip × button
    if (tag === 'vet' || tag === 'normal') {
      setDifficulty(null);
      setHmEnabled(false);
      return;
    }
    if (tag === 'hm') {
      setHmEnabled(false);
      return;
    }
    setExtraTags((prev) => prev.filter((t) => t !== tag));
  };

  const loadPacks = React.useCallback(() => {
    setPacksLoading(true);
    packsApi
      .list()
      .then((res) => setPacks(res.items))
      .catch(() => {
        /* silently ignore — packs are optional */
      })
      .finally(() => setPacksLoading(false));
  }, []);

  // Fetch pack list when addon section is first opened
  React.useEffect(() => {
    if (addonSectionOpen && packs.length === 0 && !packsLoading) {
      loadPacks();
    }
  }, [addonSectionOpen, packs.length, packsLoading, loadPacks]);

  // Fetch full pack when a pack is selected
  React.useEffect(() => {
    if (!selectedPackId) {
      setSelectedPack(null);
      setAddonList([]);
      setEnabledAddons(new Set());
      return;
    }
    let cancelled = false;
    setPackDetailLoading(true);
    packsApi
      .get(selectedPackId)
      .then((pack) => {
        if (cancelled) return;
        setSelectedPack(pack);
        const addons = pack.addons.map(packAddonToRecommended);
        setAddonList(addons);
        setEnabledAddons(new Set(addons.map((a) => a.esouiId)));
      })
      .catch(() => {
        if (cancelled) return;
        setSelectedPack(null);
        setAddonList([]);
        setEnabledAddons(new Set());
      })
      .finally(() => {
        if (!cancelled) setPackDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPackId]);

  const handleToggleAddon = (esouiId: number): void => {
    setEnabledAddons((prev) => {
      const next = new Set(prev);
      if (next.has(esouiId)) {
        next.delete(esouiId);
      } else {
        next.add(esouiId);
      }
      return next;
    });
  };

  const handleAddCustomAddon = (): void => {
    const id = parseInt(customAddonId, 10);
    const name = customAddonName.trim();
    if (!name || isNaN(id) || id <= 0) return;
    if (addonList.some((a) => a.esouiId === id)) return;
    setAddonList((prev) => [...prev, { esouiId: id, name, required: false }]);
    setEnabledAddons((prev) => new Set([...prev, id]));
    setCustomAddonName('');
    setCustomAddonId('');
  };

  const handleRemoveAddon = (esouiId: number): void => {
    setAddonList((prev) => prev.filter((a) => a.esouiId !== esouiId));
    setEnabledAddons((prev) => {
      const next = new Set(prev);
      next.delete(esouiId);
      return next;
    });
  };

  const handleToggleRequired = (esouiId: number): void => {
    setAddonList((prev) =>
      prev.map((a) => (a.esouiId === esouiId ? { ...a, required: !a.required } : a)),
    );
  };

  // ── ESOUI addon search (debounced) ──
  React.useEffect(() => {
    if (addonSearchQuery.trim().length < 2) {
      setAddonSearchResults([]);
      setAddonSearchLoading(false);
      return;
    }
    let cancelled = false;
    setAddonSearchLoading(true);
    const timer = setTimeout(() => {
      searchEsouiAddons(addonSearchQuery.trim())
        .then((results) => {
          if (!cancelled) setAddonSearchResults(results);
        })
        .catch(() => {
          if (!cancelled) setAddonSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setAddonSearchLoading(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      cancelled = true;
    };
  }, [addonSearchQuery]);

  const handleAddSearchedAddon = (result: EsouiAddonSearchResult): void => {
    if (newPackAddons.some((a) => a.esouiId === result.id)) return;
    setNewPackAddons((prev) => [...prev, { esouiId: result.id, name: result.title, required: false }]);
    setAddonSearchQuery('');
    setAddonSearchResults([]);
  };

  const handleRemoveNewPackAddon = (esouiId: number): void => {
    setNewPackAddons((prev) => prev.filter((a) => a.esouiId !== esouiId));
  };

  const handleToggleNewPackRequired = (esouiId: number): void => {
    setNewPackAddons((prev) =>
      prev.map((a) => (a.esouiId === esouiId ? { ...a, required: !a.required } : a)),
    );
  };

  const handleCreatePack = async (): Promise<void> => {
    if (!newPackTitle.trim()) {
      setNewPackError('Please enter a pack title.');
      return;
    }
    if (newPackAddons.length === 0) {
      setNewPackError('Add at least one addon.');
      return;
    }
    setNewPackCreating(true);
    setNewPackError(null);
    try {
      const { pack } = await packHubApi.create(
        {
          title: newPackTitle.trim(),
          description: newPackDescription.trim(),
          pack_type: 'roster-pack',
          addons: newPackAddons.map((a) => ({
            esouiId: a.esouiId,
            name: a.name,
            required: a.required,
          })),
        },
        token,
      );
      // Auto-select the newly created pack
      setAddonList(newPackAddons);
      setEnabledAddons(new Set(newPackAddons.map((a) => a.esouiId)));
      setSelectedPackId(pack.id);
      // Reset create form and switch to Browse tab
      setNewPackTitle('');
      setNewPackDescription('');
      setNewPackAddons([]);
      setCustomAddonName('');
      setCustomAddonId('');
      setAddonTab(0);
      // Refresh the pack list so the new pack appears
      loadPacks();
    } catch (err) {
      setNewPackError(err instanceof Error ? err.message : 'Failed to create pack');
    } finally {
      setNewPackCreating(false);
    }
  };

  /** Build the recommended_addons payload. */
  const buildRecommendedAddons = (): RecommendedAddons | null => {
    const active = addonList.filter((a) => enabledAddons.has(a.esouiId));
    if (active.length === 0) return null;
    return {
      packId: selectedPackId ?? undefined,
      packTitle: selectedPack?.name,
      addons: active,
    };
  };

  const handlePublish = async (): Promise<void> => {
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }
    if (!trialId) {
      setError('Please select a trial.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        trial_id: trialId,
        roster_data: rosterData,
        tags: selectedTags,
        is_anonymous: isAnonymous,
        recommended_addons: buildRecommendedAddons(),
      };
      if (isEditMode) {
        await rosterHubApi.update(editingRoster.id, payload, token);
      } else {
        await rosterHubApi.create(payload, token);
      }
      onPublished();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : isEditMode ? 'Failed to update' : 'Failed to publish',
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset / pre-fill on open
  React.useEffect(() => {
    if (open) {
      if (editingRoster) {
        setTitle(editingRoster.title);
        setDescription(editingRoster.description ?? '');
        setTrialId(editingRoster.trial_id ?? '');
        // Hydrate difficulty/hm/extras from flat tags array
        const tags = editingRoster.tags ?? [];
        if (tags.includes('vet')) setDifficulty('vet');
        else if (tags.includes('normal')) setDifficulty('normal');
        else setDifficulty(null);
        setHmEnabled(tags.includes('hm'));
        setExtraTags(tags.filter((t) => t !== 'vet' && t !== 'normal' && t !== 'hm'));
        setTagInput('');
        setIsAnonymous(editingRoster.is_anonymous ?? false);
        // Restore addon recommendations
        if (editingRoster.recommended_addons) {
          setAddonSectionOpen(true);
          setSelectedPackId(editingRoster.recommended_addons.packId ?? null);
          setAddonList(editingRoster.recommended_addons.addons);
          setEnabledAddons(new Set(editingRoster.recommended_addons.addons.map((a) => a.esouiId)));
        } else {
          setAddonSectionOpen(false);
          setSelectedPackId(null);
          setAddonList([]);
          setEnabledAddons(new Set());
        }
      } else {
        setTitle('');
        setDescription('');
        setTrialId('');
        setDifficulty(null);
        setHmEnabled(false);
        setExtraTags([]);
        setTagInput('');
        setIsAnonymous(false);
        setAddonSectionOpen(false);
        setAddonTab(0);
        setSelectedPackId(null);
        setSelectedPack(null);
        setAddonList([]);
        setEnabledAddons(new Set());
        setCustomAddonName('');
        setCustomAddonId('');
        setNewPackTitle('');
        setNewPackDescription('');
        setNewPackAddons([]);
        setNewPackError(null);
        setAddonSearchQuery('');
        setAddonSearchResults([]);
      }
      setError(null);
    }
  }, [open, editingRoster]);

  const atTagLimit = selectedTags.length >= MAX_TAGS;
  const activeAddonCount = addonList.filter((a) => enabledAddons.has(a.esouiId)).length;

  // ── Panel tokens (matching PlayerCardModal info modal) ──────────────
  const accent = '#38bdf8';

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      fontSize: 13,
      borderRadius: '10px',
      transition: 'border-color 0.2s ease',
      '& fieldset': {
        borderColor: isDark ? 'rgb(31, 41, 55)' : 'rgba(0, 0, 0, 0.12)',
      },
      '&:hover fieldset': {
        borderColor: isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(0, 0, 0, 0.25)',
      },
      '&.Mui-focused fieldset': {
        borderColor: accent,
        borderWidth: 2,
      },
      '&.Mui-focused': {
        boxShadow: `0 0 0 3px ${alpha(accent, 0.15)}`,
      },
    },
    '& .MuiInputLabel-root': { fontSize: 13 },
    '& .MuiFormHelperText-root': { fontSize: 11, opacity: 0.6 },
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}
      className="glass-dialog"
      PaperProps={{
        sx: {
          background: isDark
            ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
          backgroundColor: 'transparent',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: isDark ? '1px solid #1f2937' : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.25)' : '0 4px 12px rgba(15,23,42,0.06)',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          py: 2,
          px: { xs: 2.5, sm: 3 },
          borderBottom: isDark ? '1px solid #1f2937' : '1px solid rgba(0, 0, 0, 0.08)',
          background: 'transparent',
          color: isDark ? '#e5e7eb' : '#1e293b',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: isDark ? alpha(accent, 0.12) : alpha(accent, 0.08),
              border: `1px solid ${isDark ? alpha(accent, 0.2) : alpha(accent, 0.15)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PublishRounded sx={{ fontSize: 20, color: accent }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}>
              {isEditMode ? 'Edit Published Roster' : 'Publish to Roster Hub'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
              {isEditMode
                ? 'Update your roster details below'
                : 'Share your roster with the community'}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          px: { xs: 2.5, sm: 3 },
          '&&': { pt: 3 },
          pb: 2.5,
          background: 'transparent',
          color: isDark ? '#e5e7eb' : '#1e293b',
        }}
      >
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 100 } }}
          helperText={`${title.length}/100`}
          required
          fullWidth
          size="small"
          error={!!error && !title.trim()}
          aria-required="true"
          aria-invalid={!!error && !title.trim()}
          sx={inputSx}
        />

        <TextField
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          helperText={`${description.length}/500`}
          multiline
          rows={2}
          fullWidth
          size="small"
          sx={inputSx}
        />

        <FormControl size="small" required fullWidth error={!!error && !trialId} sx={inputSx}>
          <InputLabel id="publish-trial-label">Trial</InputLabel>
          <Select
            labelId="publish-trial-label"
            value={trialId}
            label="Trial"
            onChange={handleTrialChange}
          >
            {HUB_TRIALS.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* ── Tags Section ──────────────────────────────────────────────── */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: '10px',
            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
            border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: atTagLimit ? 'warning.main' : 'text.secondary',
              display: 'block',
              mb: 1,
            }}
          >
            Tags ({selectedTags.length}/{MAX_TAGS}){atTagLimit ? ' — limit reached' : ''}
          </Typography>

          {/* ── Unified chip flow: difficulty toggle → presets → selected → +custom ── */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
            {/* ── Segmented difficulty toggle ── */}
            {(() => {
              const cNorm = TAG_COLORS.normal;
              const cVet = TAG_COLORS.vet;
              const cHm = TAG_COLORS.hm;
              const segBtn = (
                label: string,
                isActive: boolean,
                color: string,
                onClick: () => void,
                pos: 'left' | 'mid' | 'right' | 'solo',
              ) => {
                const radiusMap = {
                  left: '20px 0 0 20px',
                  mid: '0',
                  right: '0 20px 20px 0',
                  solo: '20px',
                };
                return (
                  <Box
                    key={label}
                    onClick={onClick}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase',
                      borderRadius: radiusMap[pos],
                      position: 'relative',
                      zIndex: isActive ? 2 : 1,
                      userSelect: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      color: isActive ? color : isDark ? `${color}90` : `${color}80`,
                      background: isActive
                        ? `linear-gradient(135deg, ${color}35 0%, ${color}20 50%, ${color}10 100%)`
                        : 'transparent',
                      boxShadow: isActive
                        ? isDark
                          ? `0 0 16px ${color}25, inset 0 1px 0 rgba(255,255,255,0.1)`
                          : `0 0 8px ${color}18`
                        : 'none',
                      textShadow: isActive && isDark ? `0 0 12px ${color}50` : 'none',
                      '&:hover': {
                        color,
                        background: isActive
                          ? `linear-gradient(135deg, ${color}40 0%, ${color}25 50%, ${color}14 100%)`
                          : `linear-gradient(135deg, ${color}18 0%, ${color}0a 100%)`,
                        ...(isActive
                          ? {
                              boxShadow: isDark
                                ? `0 0 20px ${color}35, inset 0 1px 0 rgba(255,255,255,0.15)`
                                : `0 0 12px ${color}25`,
                            }
                          : {}),
                      },
                    }}
                  >
                    {label}
                  </Box>
                );
              };
              const showHm = difficulty === 'vet';
              return (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 30,
                    borderRadius: '20px',
                    border: isDark
                      ? '1px solid rgba(255,255,255,0.1)'
                      : '1px solid rgba(0,0,0,0.1)',
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)'
                      : 'linear-gradient(135deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.01) 100%)',
                    backdropFilter: 'blur(8px)',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isDark
                      ? '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
                      : '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  {segBtn(
                    'Normal',
                    difficulty === 'normal',
                    cNorm,
                    () => handleDifficultyChange('normal'),
                    'left',
                  )}
                  {/* Divider line */}
                  <Box
                    sx={{
                      width: '1px',
                      height: 16,
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      flexShrink: 0,
                    }}
                  />
                  {segBtn(
                    'Veteran',
                    difficulty === 'vet',
                    cVet,
                    () => handleDifficultyChange('vet'),
                    showHm ? 'mid' : 'right',
                  )}
                  {showHm && (
                    <>
                      <Box
                        sx={{
                          width: '1px',
                          height: 16,
                          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          flexShrink: 0,
                        }}
                      />
                      {segBtn('HM', hmEnabled, cHm, () => setHmEnabled((prev) => !prev), 'right')}
                    </>
                  )}
                </Box>
              );
            })()}

            {/* Divider dot */}
            <Box
              sx={{
                width: 3,
                height: 3,
                borderRadius: '50%',
                bgcolor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
              }}
            />

            {/* Preset tag suggestions (not yet selected) */}
            {EXTRA_PRESET_TAGS.filter((tag) => !extraTags.includes(tag)).map((tag) => {
              const isDisabled = atTagLimit;
              const c = TAG_COLORS[tag] ?? '#888';
              return (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onClick={isDisabled ? undefined : () => addTag(tag)}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.68rem',
                    height: 26,
                    borderRadius: '28px',
                    cursor: isDisabled ? 'default' : 'pointer',
                    opacity: isDisabled ? 0.3 : 1,
                    transition: 'all 0.3s ease',
                    background: isDark
                      ? `linear-gradient(135deg, ${c}12 0%, ${c}08 100%)`
                      : `linear-gradient(135deg, ${c}0a 0%, ${c}05 100%)`,
                    border: `1px solid ${c}30`,
                    color: c,
                    backdropFilter: 'blur(6px)',
                    '& .MuiChip-label': { opacity: 0.7 },
                    '&:hover': isDisabled
                      ? {}
                      : {
                          background: isDark
                            ? `linear-gradient(135deg, ${c}28 0%, ${c}18 100%)`
                            : `linear-gradient(135deg, ${c}1a 0%, ${c}0d 100%)`,
                          borderColor: `${c}55`,
                          boxShadow: `0 2px 8px ${c}1a`,
                          transform: 'translateY(-1px)',
                          '& .MuiChip-label': { opacity: 1 },
                        },
                  }}
                />
              );
            })}

            {/* "+ Custom" chip / inline input */}
            {!atTagLimit &&
              (addingCustom ? (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 26,
                    borderRadius: '28px',
                    border: isDark
                      ? '1px solid rgba(56, 189, 248, 0.4)'
                      : '1px solid rgba(56, 189, 248, 0.5)',
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0.06) 100%)'
                      : 'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(56,189,248,0.03) 100%)',
                    boxShadow: isDark
                      ? '0 0 12px rgba(56,189,248,0.15)'
                      : '0 0 8px rgba(56,189,248,0.1)',
                    px: 1.25,
                    gap: 0.5,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <AddIcon sx={{ fontSize: 14, color: accent, opacity: 0.6 }} />
                  <input
                    ref={customInputRef}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value.replace(/,/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addTag(tagInput);
                        setTagInput('');
                      } else if (e.key === 'Escape') {
                        setTagInput('');
                        setAddingCustom(false);
                      }
                    }}
                    onBlur={() => {
                      if (tagInput.trim()) {
                        addTag(tagInput);
                      }
                      setTagInput('');
                      setAddingCustom(false);
                    }}
                    placeholder="type & enter"
                    maxLength={30}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: isDark ? '#e5e7eb' : '#1e293b',
                      fontSize: '0.72rem',
                      fontWeight: 500,
                      width: 90,
                      fontFamily: 'inherit',
                    }}
                  />
                </Box>
              ) : (
                <Chip
                  icon={<AddIcon sx={{ fontSize: 15 }} />}
                  label="Custom"
                  size="small"
                  onClick={() => {
                    setAddingCustom(true);
                    setTimeout(() => customInputRef.current?.focus(), 0);
                  }}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.68rem',
                    height: 26,
                    borderRadius: '28px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(56,189,248,0.10) 0%, rgba(56,189,248,0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(56,189,248,0.06) 0%, rgba(56,189,248,0.02) 100%)',
                    border: isDark
                      ? '1px dashed rgba(56,189,248,0.3)'
                      : '1px dashed rgba(56,189,248,0.35)',
                    color: isDark ? 'rgba(56,189,248,0.7)' : 'rgba(56,189,248,0.8)',
                    '& .MuiChip-icon': {
                      color: isDark ? 'rgba(56,189,248,0.5)' : 'rgba(56,189,248,0.6)',
                    },
                    '&:hover': {
                      background: isDark
                        ? 'linear-gradient(135deg, rgba(56,189,248,0.20) 0%, rgba(56,189,248,0.10) 100%)'
                        : 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0.06) 100%)',
                      borderColor: isDark ? 'rgba(56,189,248,0.5)' : 'rgba(56,189,248,0.6)',
                      color: accent,
                      boxShadow: '0 2px 8px rgba(56,189,248,0.15)',
                      transform: 'translateY(-1px)',
                      '& .MuiChip-icon': { color: accent },
                    },
                  }}
                />
              ))}
          </Box>

          {/* ── Selected tags (removable) ── */}
          {selectedTags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {selectedTags.map((tag) => {
                const c = TAG_COLORS[tag] ?? (isDark ? '#94a3b8' : '#64748b');
                return (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onDelete={() => removeTag(tag)}
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 26,
                      borderRadius: '28px',
                      background: `linear-gradient(135deg, ${c}40 0%, ${c}26 50%, ${c}14 100%)`,
                      border: `1px solid ${c}4d`,
                      color: c,
                      boxShadow: isDark
                        ? `0 2px 8px ${c}25, inset 0 1px 0 rgba(255,255,255,0.1)`
                        : `0 1px 4px ${c}20`,
                      '& .MuiChip-label': {
                        textShadow: isDark ? `0 0 8px ${c}40` : 'none',
                      },
                      '& .MuiChip-deleteIcon': {
                        color: `${c}80`,
                        '&:hover': { color: c },
                      },
                    }}
                  />
                );
              })}
            </Box>
          )}
        </Box>

        {/* ── Addon Recommendations Section ── */}
        <Paper
          variant="outlined"
          sx={{
            borderColor: addonSectionOpen ? '#c4a44a55' : undefined,
            borderRadius: 2,
            overflow: 'hidden',
            transition: 'border-color 0.2s',
          }}
        >
          <Box
            onClick={() => setAddonSectionOpen((prev) => !prev)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1.25,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
              transition: 'background-color 0.15s',
            }}
          >
            <Extension sx={{ fontSize: 18, color: '#c4a44a' }} />
            <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
              Addon Recommendations
              {activeAddonCount > 0 && (
                <Chip
                  label={activeAddonCount}
                  size="small"
                  sx={{
                    ml: 1,
                    height: 20,
                    fontSize: '0.7rem',
                    bgcolor: '#c4a44a22',
                    color: '#c4a44a',
                    fontWeight: 700,
                  }}
                />
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
              {addonSectionOpen ? '' : 'optional'}
            </Typography>
            {addonSectionOpen ? (
              <ExpandLess sx={{ fontSize: 20, color: 'text.secondary' }} />
            ) : (
              <ExpandMore sx={{ fontSize: 20, color: 'text.secondary' }} />
            )}
          </Box>

          <Collapse in={addonSectionOpen}>
            <Tabs
              value={addonTab}
              onChange={(_e: React.SyntheticEvent, v: number) => {
                setAddonTab(v as 0 | 1);
                setCustomAddonName('');
                setCustomAddonId('');
              }}
              variant="fullWidth"
              sx={{
                minHeight: 36,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiTab-root': { minHeight: 36, fontSize: '0.78rem', textTransform: 'none' },
                '& .Mui-selected': { color: '#c4a44a' },
                '& .MuiTabs-indicator': { bgcolor: '#c4a44a' },
              }}
            >
              <Tab label="Browse Packs" />
              <Tab label="Create New" />
            </Tabs>

            {/* ── Browse tab ── */}
            {addonTab === 0 && (
              <Box sx={{ px: 2, pb: 2, pt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Pick a curated pack or customize individual addons.
                </Typography>

                {/* Pack selector */}
                <Autocomplete
                  size="small"
                  options={packs}
                  loading={packsLoading}
                  value={packs.find((p) => p.id === selectedPackId) ?? null}
                  getOptionLabel={(p) => p.name}
                  renderOption={(props, p) => (
                    <li {...props} key={p.id}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {p.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.addonCount} addons · {p.description.slice(0, 60)}
                          {p.description.length > 60 ? '…' : ''}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  onChange={(_e, value) => setSelectedPackId(value?.id ?? null)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Start from a curated pack"
                      placeholder="Search packs…"
                    />
                  )}
                  noOptionsText={packsLoading ? 'Loading packs…' : 'No packs available'}
                />

                {packDetailLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                    <CircularProgress size={20} sx={{ color: '#c4a44a' }} />
                  </Box>
                )}

                {/* Addon list with toggles */}
                {addonList.length > 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                      maxHeight: 240,
                      overflowY: 'auto',
                      '&::-webkit-scrollbar': { width: 6 },
                      '&::-webkit-scrollbar-thumb': {
                        bgcolor: 'rgba(255,255,255,0.15)',
                        borderRadius: 3,
                      },
                    }}
                  >
                    {addonList.map((addon) => {
                      const isEnabled = enabledAddons.has(addon.esouiId);
                      return (
                        <Box
                          key={addon.esouiId}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            py: 0.5,
                            px: 1,
                            borderRadius: 1,
                            bgcolor: isEnabled ? '#c4a44a0a' : 'transparent',
                            borderLeft: isEnabled ? '3px solid #c4a44a' : '3px solid transparent',
                            transition: 'all 0.15s',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <Checkbox
                            checked={isEnabled}
                            onChange={() => handleToggleAddon(addon.esouiId)}
                            size="small"
                            sx={{
                              p: 0.5,
                              color: '#c4a44a55',
                              '&.Mui-checked': { color: '#c4a44a' },
                            }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              noWrap
                              sx={{ opacity: isEnabled ? 1 : 0.5 }}
                            >
                              {addon.name}
                            </Typography>
                            {addon.note && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                sx={{ opacity: isEnabled ? 0.7 : 0.4 }}
                              >
                                {addon.note}
                              </Typography>
                            )}
                          </Box>
                          <Tooltip title={addon.required ? 'Mark as optional' : 'Mark as required'}>
                            <Chip
                              label={addon.required ? 'Required' : 'Optional'}
                              size="small"
                              onClick={() => handleToggleRequired(addon.esouiId)}
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                bgcolor: addon.required ? '#c4a44a22' : 'transparent',
                                color: addon.required ? '#c4a44a' : 'text.secondary',
                                border: addon.required ? '1px solid #c4a44a55' : '1px solid',
                                borderColor: addon.required ? '#c4a44a55' : 'divider',
                                '&:hover': {
                                  bgcolor: addon.required ? '#c4a44a33' : 'action.hover',
                                },
                              }}
                            />
                          </Tooltip>
                          {/* Only allow removing addons that were manually added (not from a pack) */}
                          {selectedPack &&
                          selectedPack.addons.some((pa) => pa.esouiId === addon.esouiId) ? null : (
                            <Tooltip title="Remove addon">
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveAddon(addon.esouiId)}
                                sx={{ p: 0.5, color: 'text.disabled' }}
                              >
                                <RemoveCircleOutline sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {/* Add custom addon */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <TextField
                    size="small"
                    label="Addon name"
                    value={customAddonName}
                    onChange={(e) => setCustomAddonName(e.target.value)}
                    sx={{ flex: 2 }}
                    placeholder="e.g. RaidNotifier"
                  />
                  <TextField
                    size="small"
                    label="ESOUI ID"
                    value={customAddonId}
                    onChange={(e) => setCustomAddonId(e.target.value.replace(/\D/g, ''))}
                    sx={{ flex: 1 }}
                    placeholder="e.g. 1355"
                  />
                  <Tooltip title="Add custom addon">
                    <span>
                      <IconButton
                        size="small"
                        onClick={handleAddCustomAddon}
                        disabled={!customAddonName.trim() || !customAddonId}
                        sx={{
                          bgcolor: '#c4a44a22',
                          color: '#c4a44a',
                          '&:hover': { bgcolor: '#c4a44a33' },
                          '&.Mui-disabled': { color: 'text.disabled', bgcolor: 'transparent' },
                        }}
                      >
                        <Add sx={{ fontSize: 20 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>

                {activeAddonCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                    <CheckCircle sx={{ fontSize: 14, color: '#22c55e' }} />
                    <Typography variant="caption" color="text.secondary">
                      {activeAddonCount} addon{activeAddonCount !== 1 ? 's' : ''} will be recommended
                      to viewers
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* ── Create New tab ── */}
            {addonTab === 1 && (
              <Box sx={{ px: 2, pb: 2, pt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Create a reusable addon pack that others can use too.
                </Typography>

                <TextField
                  size="small"
                  label="Pack Title"
                  value={newPackTitle}
                  onChange={(e) => setNewPackTitle(e.target.value)}
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                  helperText={`${newPackTitle.length}/100`}
                  required
                  fullWidth
                />

                <TextField
                  size="small"
                  label="Description (optional)"
                  value={newPackDescription}
                  onChange={(e) => setNewPackDescription(e.target.value)}
                  slotProps={{ htmlInput: { maxLength: 500 } }}
                  multiline
                  rows={2}
                  fullWidth
                />

                {/* ESOUI addon search */}
                <Autocomplete
                  size="small"
                  freeSolo
                  options={addonSearchResults}
                  loading={addonSearchLoading}
                  inputValue={addonSearchQuery}
                  onInputChange={(_e, value) => setAddonSearchQuery(value)}
                  getOptionLabel={(o) => (typeof o === 'string' ? o : o.title)}
                  filterOptions={(x) => x}
                  renderOption={(props, o) => {
                    if (typeof o === 'string') return null;
                    const alreadyAdded = newPackAddons.some((a) => a.esouiId === o.id);
                    return (
                      <li
                        {...props}
                        key={o.id}
                        style={{ opacity: alreadyAdded ? 0.4 : 1, pointerEvents: alreadyAdded ? 'none' : undefined }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {o.title}
                            {alreadyAdded && (
                              <Chip label="Added" size="small" sx={{ ml: 1, height: 18, fontSize: '0.6rem' }} />
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            by {o.author} · {o.category} · {o.downloads} downloads
                          </Typography>
                        </Box>
                      </li>
                    );
                  }}
                  onChange={(_e, value) => {
                    if (value && typeof value !== 'string') handleAddSearchedAddon(value);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search ESOUI addons"
                      placeholder="Type addon name…"
                    />
                  )}
                  noOptionsText={
                    addonSearchQuery.length < 2
                      ? 'Type at least 2 characters'
                      : addonSearchLoading
                        ? 'Searching…'
                        : 'No results'
                  }
                />

                {/* New pack addon list */}
                {newPackAddons.length > 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                      maxHeight: 200,
                      overflowY: 'auto',
                      '&::-webkit-scrollbar': { width: 6 },
                      '&::-webkit-scrollbar-thumb': {
                        bgcolor: 'rgba(255,255,255,0.15)',
                        borderRadius: 3,
                      },
                    }}
                  >
                    {newPackAddons.map((addon) => (
                      <Box
                        key={addon.esouiId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          bgcolor: '#c4a44a0a',
                          borderLeft: '3px solid #c4a44a',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {addon.name}
                          </Typography>
                        </Box>
                        <Tooltip title={addon.required ? 'Mark as optional' : 'Mark as required'}>
                          <Chip
                            label={addon.required ? 'Required' : 'Optional'}
                            size="small"
                            onClick={() => handleToggleNewPackRequired(addon.esouiId)}
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              bgcolor: addon.required ? '#c4a44a22' : 'transparent',
                              color: addon.required ? '#c4a44a' : 'text.secondary',
                              border: addon.required ? '1px solid #c4a44a55' : '1px solid',
                              borderColor: addon.required ? '#c4a44a55' : 'divider',
                              '&:hover': {
                                bgcolor: addon.required ? '#c4a44a33' : 'action.hover',
                              },
                            }}
                          />
                        </Tooltip>
                        <Tooltip title="Remove">
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveNewPackAddon(addon.esouiId)}
                            sx={{ p: 0.5, color: 'text.disabled' }}
                          >
                            <RemoveCircleOutline sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Manual addon entry (fallback for addons not on ESOUI search) */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <TextField
                    size="small"
                    label="Addon name"
                    value={customAddonName}
                    onChange={(e) => setCustomAddonName(e.target.value)}
                    sx={{ flex: 2 }}
                    placeholder="e.g. RaidNotifier"
                  />
                  <TextField
                    size="small"
                    label="ESOUI ID"
                    value={customAddonId}
                    onChange={(e) => setCustomAddonId(e.target.value.replace(/\D/g, ''))}
                    sx={{ flex: 1 }}
                    placeholder="e.g. 1355"
                  />
                  <Tooltip title="Add addon manually">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => {
                          const id = parseInt(customAddonId, 10);
                          const name = customAddonName.trim();
                          if (!name || isNaN(id) || id <= 0) return;
                          if (newPackAddons.some((a) => a.esouiId === id)) return;
                          setNewPackAddons((prev) => [...prev, { esouiId: id, name, required: false }]);
                          setCustomAddonName('');
                          setCustomAddonId('');
                        }}
                        disabled={!customAddonName.trim() || !customAddonId}
                        sx={{
                          bgcolor: '#c4a44a22',
                          color: '#c4a44a',
                          '&:hover': { bgcolor: '#c4a44a33' },
                          '&.Mui-disabled': { color: 'text.disabled', bgcolor: 'transparent' },
                        }}
                      >
                        <Add sx={{ fontSize: 20 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>

                {newPackError && (
                  <Alert severity="error" onClose={() => setNewPackError(null)}>
                    {newPackError}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  size="small"
                  onClick={() => void handleCreatePack()}
                  disabled={newPackCreating || !newPackTitle.trim() || newPackAddons.length === 0}
                  startIcon={
                    newPackCreating ? <CircularProgress size={16} color="inherit" /> : <Extension />
                  }
                  sx={{
                    alignSelf: 'flex-end',
                    background: 'linear-gradient(135deg, #c4a44a 0%, #d4b45a 100%)',
                    color: '#0b1220',
                    fontWeight: 700,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #d4b45a 0%, #e4c46a 100%)',
                    },
                  }}
                >
                  {newPackCreating ? 'Creating…' : `Create Pack (${newPackAddons.length} addons)`}
                </Button>
              </Box>
            )}
          </Collapse>
        </Paper>

        <FormControlLabel
          control={
            <Switch
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
              Publish anonymously
            </Typography>
          }
          sx={{ mt: -0.5, ml: 0.5 }}
        />

        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{
              borderRadius: '10px',
              bgcolor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              '& .MuiAlert-icon': { color: '#ef4444' },
            }}
          >
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2.5, sm: 3 },
          py: 1.5,
          borderTop: isDark ? '1px solid #1f2937' : '1px solid rgba(0, 0, 0, 0.08)',
          background: 'transparent',
          color: isDark ? '#e5e7eb' : '#1e293b',
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{
            color: 'text.secondary',
            fontSize: '0.82rem',
            '&:hover': {
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => void handlePublish()}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.82rem',
            px: 2.5,
            background: `linear-gradient(135deg, ${accent} 0%, #2563eb 100%)`,
            boxShadow: `0 4px 12px ${alpha(accent, 0.2)}`,
            '&:hover': {
              background: `linear-gradient(135deg, #5cc8f9 0%, #3b82f6 100%)`,
              boxShadow: `0 6px 16px ${alpha(accent, 0.3)}`,
            },
            '&.Mui-disabled': {
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            },
          }}
        >
          {loading ? (isEditMode ? 'Updating…' : 'Publishing…') : isEditMode ? 'Update' : 'Publish'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
