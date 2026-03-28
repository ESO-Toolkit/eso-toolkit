import {
  Add,
  CheckCircle,
  ExpandLess,
  ExpandMore,
  Extension,
  RemoveCircleOutline,
} from '@mui/icons-material';
import {
  Alert,
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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

import { packsApi } from '../../build-hub/api/packs-api';
import type { Pack, PackAddonEntry, PackIndexItem } from '../../build-hub/api/packs-api';
import { TRIALS } from '../../loadout-manager/data/trialConfigs';
import { rosterHubApi } from '../api/roster-hub-api';
import type { HubRoster, RecommendedAddonEntry, RecommendedAddons } from '../types/roster-hub.types';
import { PRESET_TAGS, TAG_COLORS } from '../types/roster-hub.types';

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
  const isEditMode = !!editingRoster;
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [trialId, setTrialId] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ── Addon recommendation state ──
  const [addonSectionOpen, setAddonSectionOpen] = React.useState(false);
  const [packs, setPacks] = React.useState<PackIndexItem[]>([]);
  const [packsLoading, setPacksLoading] = React.useState(false);
  const [selectedPackId, setSelectedPackId] = React.useState<string | null>(null);
  const [selectedPack, setSelectedPack] = React.useState<Pack | null>(null);
  const [packDetailLoading, setPackDetailLoading] = React.useState(false);
  const [addonList, setAddonList] = React.useState<RecommendedAddonEntry[]>([]);
  const [enabledAddons, setEnabledAddons] = React.useState<Set<number>>(new Set());
  const [customAddonName, setCustomAddonName] = React.useState('');
  const [customAddonId, setCustomAddonId] = React.useState('');

  const handleTrialChange = (e: SelectChangeEvent): void => {
    setTrialId(e.target.value);
  };

  const handleTagToggle = (tag: string): void => {
    if (selectedTags.includes(tag)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
    } else if (selectedTags.length < MAX_TAGS) {
      setSelectedTags((prev) => [...prev, tag]);
    }
  };

  // Fetch pack list when addon section is first opened
  React.useEffect(() => {
    if (addonSectionOpen && packs.length === 0 && !packsLoading) {
      setPacksLoading(true);
      packsApi
        .list()
        .then((res) => setPacks(res.items))
        .catch(() => {
          /* silently ignore — packs are optional */
        })
        .finally(() => setPacksLoading(false));
    }
  }, [addonSectionOpen, packs.length, packsLoading]);

  // Fetch full pack when a pack is selected
  React.useEffect(() => {
    if (!selectedPackId) {
      setSelectedPack(null);
      setAddonList([]);
      setEnabledAddons(new Set());
      return;
    }
    setPackDetailLoading(true);
    packsApi
      .get(selectedPackId)
      .then((pack) => {
        setSelectedPack(pack);
        const addons = pack.addons.map(packAddonToRecommended);
        setAddonList(addons);
        setEnabledAddons(new Set(addons.map((a) => a.esouiId)));
      })
      .catch(() => {
        setSelectedPack(null);
        setAddonList([]);
        setEnabledAddons(new Set());
      })
      .finally(() => setPackDetailLoading(false));
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

  /** Build the recommended_addons payload. */
  const buildRecommendedAddons = (): RecommendedAddons | null => {
    const active = addonList.filter((a) => enabledAddons.has(a.esouiId));
    if (active.length === 0) return null;
    return {
      packId: selectedPackId ?? undefined,
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
        setSelectedTags(editingRoster.tags ?? []);
        setIsAnonymous(editingRoster.is_anonymous ?? false);
        // Restore addon recommendations
        if (editingRoster.recommended_addons) {
          setAddonSectionOpen(true);
          setSelectedPackId(editingRoster.recommended_addons.packId ?? null);
          setAddonList(editingRoster.recommended_addons.addons);
          setEnabledAddons(
            new Set(editingRoster.recommended_addons.addons.map((a) => a.esouiId)),
          );
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
        setSelectedTags([]);
        setIsAnonymous(false);
        setAddonSectionOpen(false);
        setSelectedPackId(null);
        setSelectedPack(null);
        setAddonList([]);
        setEnabledAddons(new Set());
        setCustomAddonName('');
        setCustomAddonId('');
      }
      setError(null);
    }
  }, [open, editingRoster]);

  const atTagLimit = selectedTags.length >= MAX_TAGS;
  const activeAddonCount = addonList.filter((a) => enabledAddons.has(a.esouiId)).length;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>{isEditMode ? 'Edit Published Roster' : 'Publish to Roster Hub'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
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
        />

        <TextField
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          helperText={`${description.length}/500`}
          multiline
          rows={3}
          fullWidth
          size="small"
        />

        <FormControl size="small" required fullWidth error={!!error && !trialId}>
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

        <div>
          <Typography
            variant="caption"
            color={atTagLimit ? 'warning.main' : 'text.secondary'}
            gutterBottom
            display="block"
          >
            Tags ({selectedTags.length}/{MAX_TAGS}){atTagLimit ? ' — limit reached' : ''}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5, mt: 0.5 }}>
            {PRESET_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              const isDisabled = !isSelected && atTagLimit;
              const accent = TAG_COLORS[tag] ?? '#888';
              return (
                <Tooltip key={tag} title={isDisabled ? `Remove a tag first (max ${MAX_TAGS})` : ''}>
                  <span>
                    <Chip
                      label={tag}
                      size="small"
                      onClick={isDisabled ? undefined : () => handleTagToggle(tag)}
                      variant={isSelected ? 'filled' : 'outlined'}
                      aria-pressed={isSelected}
                      role="checkbox"
                      sx={{
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.5 : 1,
                        transition: 'all 0.15s ease',
                        ...(isSelected
                          ? {
                              bgcolor: accent,
                              color: '#fff',
                              borderColor: accent,
                              '&:hover': { bgcolor: accent, filter: 'brightness(0.9)' },
                            }
                          : {
                              borderColor: `${accent}55`,
                              color: accent,
                              '&:hover': isDisabled
                                ? {}
                                : { bgcolor: `${accent}18`, borderColor: accent },
                            }),
                      }}
                    />
                  </span>
                </Tooltip>
              );
            })}
          </Stack>
        </div>

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
            <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                Recommend addons that viewers should install for this roster. Pick a curated pack or
                customize individual addons.
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
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    mt: 0.5,
                  }}
                >
                  <CheckCircle sx={{ fontSize: 14, color: '#22c55e' }} />
                  <Typography variant="caption" color="text.secondary">
                    {activeAddonCount} addon{activeAddonCount !== 1 ? 's' : ''} will be recommended
                    to viewers
                  </Typography>
                </Box>
              )}
            </Box>
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
            <Typography variant="body2" color="text.secondary">
              Publish anonymously
            </Typography>
          }
          sx={{ mt: 0.5 }}
        />

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={() => void handlePublish()}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {loading ? (isEditMode ? 'Updating…' : 'Publishing…') : isEditMode ? 'Update' : 'Publish'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
