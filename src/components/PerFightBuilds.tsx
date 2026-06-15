import {
  ExpandMore as ExpandMoreIcon,
  Tune as TuneIcon,
  RestartAlt as ResetIcon,
  Edit as EditIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import { KnownSetIDs } from '../types/abilities';
import type { RaidRoster } from '../types/roster';
import { ALL_5PIECE_SETS, MONSTER_SETS, SupportUltimate } from '../types/roster';
import type {
  TrialBuildOverrides,
  EncounterOverrides,
  PlayerOverride,
  Trial,
} from '../types/trial-encounters';
import {
  TRIAL_ENCOUNTERS,
  getTrialById,
  resolveTrialId,
  createDefaultTrialOverrides,
  encounterHasOverrides,
  isOverrideEmpty,
} from '../types/trial-encounters';
import { getSetDisplayName, findSetIdByName } from '../utils/setNameUtils';
import type { SlotKey } from '../utils/slotKey';
import { makeSlotKey } from '../utils/slotKey';

import { EncounterTimeline } from './EncounterTimeline';

// ─── Set option lists ───────────────────────────────────────────

const ALL_5PIECE_OPTIONS: readonly string[] = (() => {
  return Array.from(ALL_5PIECE_SETS)
    .map((id) => getSetDisplayName(id))
    .sort();
})();

const ALL_MONSTER_OPTIONS: readonly string[] = (() => {
  return Array.from(MONSTER_SETS)
    .map((id) => getSetDisplayName(id))
    .sort();
})();

const ULTIMATE_OPTIONS = [
  SupportUltimate.WARHORN,
  SupportUltimate.COLOSSUS,
  SupportUltimate.BARRIER,
  SupportUltimate.ATRONACH,
];

// ─── Player identifier helpers ──────────────────────────────────

type PlayerKey = SlotKey;

interface PlayerInfo {
  key: PlayerKey;
  label: string;
  name: string;
  role: 'tank' | 'healer' | 'dps';
  currentSet1?: string;
  currentSet2?: string;
  currentMonster?: string;
  currentUltimate?: string | null;
}

function getPlayersFromRoster(roster: RaidRoster): PlayerInfo[] {
  const players: PlayerInfo[] = [];

  // Tanks
  roster.tanks.forEach((tank, i) => {
    players.push({
      key: makeSlotKey('tank', i),
      label: tank.roleLabel || `Tank ${i + 1}`,
      name: tank.playerName || `Tank ${i + 1}`,
      role: 'tank',
      currentSet1: tank.gearSets.set1 ? getSetDisplayName(tank.gearSets.set1) : undefined,
      currentSet2: tank.gearSets.set2 ? getSetDisplayName(tank.gearSets.set2) : undefined,
      currentMonster: tank.gearSets.monsterSet
        ? getSetDisplayName(tank.gearSets.monsterSet)
        : undefined,
      currentUltimate: tank.ultimate,
    });
  });

  // Healers
  roster.healers.forEach((healer, i) => {
    players.push({
      key: makeSlotKey('healer', i),
      label: healer.roleLabel || `Healer ${i + 1}`,
      name: healer.playerName || `Healer ${i + 1}`,
      role: 'healer',
      currentSet1: healer.set1 ? getSetDisplayName(healer.set1) : undefined,
      currentSet2: healer.set2 ? getSetDisplayName(healer.set2) : undefined,
      currentMonster: healer.monsterSet ? getSetDisplayName(healer.monsterSet) : undefined,
      currentUltimate: healer.ultimate,
    });
  });

  // DPS
  for (const slot of roster.dpsSlots) {
    players.push({
      key: makeSlotKey('dps', slot.slotNumber - 1),
      label: slot.roleLabel || `DD${slot.slotNumber}`,
      name: slot.playerName || `DD ${slot.slotNumber}`,
      role: 'dps',
      currentSet1: slot.set1 ? getSetDisplayName(slot.set1) : undefined,
      currentSet2: slot.set2 ? getSetDisplayName(slot.set2) : undefined,
      currentMonster: slot.monsterSet ? getSetDisplayName(slot.monsterSet) : undefined,
      currentUltimate: slot.ultimate,
    });
  }

  return players;
}

function getPlayerOverride(
  encounterOverrides: EncounterOverrides | undefined,
  playerKey: PlayerKey,
): PlayerOverride | undefined {
  if (!encounterOverrides) return undefined;
  return encounterOverrides.slots[playerKey];
}

function setPlayerOverride(
  encounterOverrides: EncounterOverrides,
  playerKey: PlayerKey,
  override: PlayerOverride | undefined,
): EncounterOverrides {
  const newSlots = { ...encounterOverrides.slots };
  if (override && !isOverrideEmpty(override)) {
    newSlots[playerKey] = override;
  } else {
    delete newSlots[playerKey];
  }
  return { slots: newSlots };
}

// ─── Role color helpers ─────────────────────────────────────────

const ROLE_BORDER_COLORS = {
  tank: { light: 'rgba(59, 130, 246, 0.3)', dark: 'rgba(59, 130, 246, 0.4)' },
  healer: { light: 'rgba(168, 85, 247, 0.3)', dark: 'rgba(168, 85, 247, 0.4)' },
  dps: { light: 'rgba(239, 68, 68, 0.3)', dark: 'rgba(239, 68, 68, 0.4)' },
};

// ─── Override editor for a single player ────────────────────────

interface PlayerOverrideEditorProps {
  player: PlayerInfo;
  override: PlayerOverride | undefined;
  onUpdate: (override: PlayerOverride | undefined) => void;
  isDark: boolean;
}

const PlayerOverrideEditor: React.FC<PlayerOverrideEditorProps> = React.memo(
  ({ player, override, onUpdate, isDark }) => {
    const [isEditing, setIsEditing] = useState(false);
    const hasOverride = !isOverrideEmpty(override);

    const glassSx = {
      '& .MuiOutlinedInput-root': {
        borderRadius: '8px',
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        '& fieldset': {
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
        },
      },
    };

    const handleFieldChange = useCallback(
      (field: keyof PlayerOverride, value: number | string | null | undefined) => {
        const current = override ?? {};
        const updated = { ...current, [field]: value };
        // Clean up undefined fields
        if (updated.set1 == null) delete updated.set1;
        if (updated.set2 == null) delete updated.set2;
        if (updated.monsterSet == null) delete updated.monsterSet;
        if (updated.ultimate === undefined) delete updated.ultimate;
        if (!updated.notes) delete updated.notes;
        onUpdate(isOverrideEmpty(updated) ? undefined : updated);
      },
      [override, onUpdate],
    );

    const handleReset = useCallback(() => {
      onUpdate(undefined);
      setIsEditing(false);
    }, [onUpdate]);

    const roleBorder = ROLE_BORDER_COLORS[player.role];

    return (
      <Box
        sx={{
          p: 1,
          borderRadius: '8px',
          border: `1px solid ${
            hasOverride ? '#22c55e' : isDark ? roleBorder.dark : roleBorder.light
          }`,
          backgroundColor: hasOverride
            ? isDark
              ? 'rgba(34, 197, 94, 0.06)'
              : 'rgba(34, 197, 94, 0.04)'
            : isDark
              ? 'rgba(255,255,255,0.02)'
              : 'rgba(0,0,0,0.01)',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Header row */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                whiteSpace: 'nowrap',
              }}
            >
              {player.name}
            </Typography>
            <Chip
              label={player.label}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.55rem',
                fontWeight: 600,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }}
            />
            {hasOverride && (
              <Chip
                label="Modified"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.5rem',
                  fontWeight: 700,
                  backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.12)',
                  color: '#22c55e',
                }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.25 }}>
            {hasOverride && (
              <Tooltip title="Reset to base build">
                <IconButton
                  size="small"
                  onClick={handleReset}
                  sx={{ p: 0.25 }}
                  aria-label="Reset to base build"
                >
                  <ResetIcon sx={{ fontSize: '0.85rem' }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={isEditing ? 'Done editing' : 'Edit overrides'}>
              <IconButton
                size="small"
                onClick={() => setIsEditing(!isEditing)}
                sx={{ p: 0.25 }}
                aria-label={isEditing ? 'Done editing' : 'Edit overrides'}
              >
                {isEditing ? (
                  <CheckIcon sx={{ fontSize: '0.85rem', color: '#22c55e' }} />
                ) : (
                  <EditIcon sx={{ fontSize: '0.85rem' }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Base build summary (always visible) */}
        {!isEditing && (
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
            {(hasOverride
              ? [
                  override?.set1 != null
                    ? getSetDisplayName(override.set1 as KnownSetIDs)
                    : player.currentSet1,
                  override?.set2 != null
                    ? getSetDisplayName(override.set2 as KnownSetIDs)
                    : player.currentSet2,
                  override?.monsterSet != null
                    ? getSetDisplayName(override.monsterSet as KnownSetIDs)
                    : player.currentMonster,
                ]
              : [player.currentSet1, player.currentSet2, player.currentMonster]
            )
              .filter(Boolean)
              .map((name, i) => (
                <Chip
                  key={i}
                  label={name}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: '0.55rem',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  }}
                />
              ))}
            {!player.currentSet1 &&
              !player.currentSet2 &&
              !player.currentMonster &&
              !hasOverride && (
                <Typography
                  sx={{ fontSize: '0.6rem', color: 'text.disabled', fontStyle: 'italic' }}
                >
                  No gear assigned in base build
                </Typography>
              )}
          </Box>
        )}

        {/* Inline editor (expanded) */}
        {isEditing && (
          <Box sx={{ mt: 1 }}>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 30%', minWidth: 150 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={ALL_5PIECE_OPTIONS as string[]}
                    value={
                      override?.set1 != null
                        ? getSetDisplayName(override.set1 as KnownSetIDs)
                        : player.currentSet1 || ''
                    }
                    onChange={(_, value) => {
                      const setId = value ? findSetIdByName(value) : undefined;
                      handleFieldChange('set1', setId as number | undefined);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Set 1 (5pc)"
                        placeholder={player.currentSet1 || 'Base build'}
                        sx={glassSx}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ flex: '1 1 30%', minWidth: 150 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={ALL_5PIECE_OPTIONS as string[]}
                    value={
                      override?.set2 != null
                        ? getSetDisplayName(override.set2 as KnownSetIDs)
                        : player.currentSet2 || ''
                    }
                    onChange={(_, value) => {
                      const setId = value ? findSetIdByName(value) : undefined;
                      handleFieldChange('set2', setId as number | undefined);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Set 2 (5pc)"
                        placeholder={player.currentSet2 || 'Base build'}
                        sx={glassSx}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ flex: '1 1 30%', minWidth: 150 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={ALL_MONSTER_OPTIONS as string[]}
                    value={
                      override?.monsterSet != null
                        ? getSetDisplayName(override.monsterSet as KnownSetIDs)
                        : player.currentMonster || ''
                    }
                    onChange={(_, value) => {
                      const setId = value ? findSetIdByName(value) : undefined;
                      handleFieldChange('monsterSet', setId as number | undefined);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Monster / Mythic"
                        placeholder={player.currentMonster || 'Base build'}
                        sx={glassSx}
                      />
                    )}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 45%', minWidth: 150 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={ULTIMATE_OPTIONS}
                    value={
                      override?.ultimate !== undefined
                        ? (override.ultimate ?? '')
                        : (player.currentUltimate ?? '')
                    }
                    onChange={(_, value) => {
                      handleFieldChange('ultimate', value || null);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Ultimate"
                        placeholder={player.currentUltimate || 'Base build'}
                        sx={glassSx}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ flex: '1 1 45%', minWidth: 150 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Fight Notes"
                    value={override?.notes || ''}
                    onChange={(e) => handleFieldChange('notes', e.target.value || undefined)}
                    placeholder="e.g., Switch to defensive"
                    sx={glassSx}
                  />
                </Box>
              </Box>
            </Stack>
          </Box>
        )}
      </Box>
    );
  },
);

PlayerOverrideEditor.displayName = 'PlayerOverrideEditor';

// ─── Main component ─────────────────────────────────────────────

interface PerFightBuildsProps {
  roster: RaidRoster;
  onUpdateTrialOverrides: (overrides: TrialBuildOverrides | undefined) => void;
}

export const PerFightBuilds: React.FC<PerFightBuildsProps> = React.memo(
  ({ roster, onUpdateTrialOverrides }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const trialOverrides = roster.trialOverrides;
    const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

    // Current trial data
    const selectedTrial = useMemo<Trial | undefined>(
      () => (trialOverrides?.trialId ? getTrialById(trialOverrides.trialId) : undefined),
      [trialOverrides?.trialId],
    );

    // Trials this roster is tagged "Built for" (top-level picker), resolved to
    // encounter-data trial ids. Drives which trials the Per-Fight Builds selector
    // offers, so the two selectors stay in sync.
    const scopedTrialIds = useMemo<string[]>(() => {
      const ids = (roster.trials ?? [])
        .map((tag) => resolveTrialId(tag))
        .filter((id): id is string => Boolean(id));
      // Dedupe while preserving order.
      return Array.from(new Set(ids));
    }, [roster.trials]);

    // The trials shown in the dropdown: scoped to the "Built for" tags when any
    // are set, otherwise the full list (backward compatible / untagged rosters).
    const trialOptions = useMemo<readonly Trial[]>(() => {
      if (scopedTrialIds.length === 0) return TRIAL_ENCOUNTERS;
      const scoped = scopedTrialIds
        .map((id) => getTrialById(id))
        .filter((t): t is Trial => Boolean(t));
      // If a per-fight trial is already selected but isn't in the tag set
      // (e.g. tags changed after customizing), keep it visible so its work isn't hidden.
      if (selectedTrial && !scoped.some((t) => t.id === selectedTrial.id)) {
        return [selectedTrial, ...scoped];
      }
      return scoped;
    }, [scopedTrialIds, selectedTrial]);

    // Auto-select the trial when exactly one is tagged and nothing is chosen yet,
    // so the encounter timeline appears without a redundant second pick. Guarded by
    // a ref keyed on the scoped-trial set so it fires once per change — otherwise an
    // explicit "None" pick would be re-selected immediately, making "None" a dead option.
    const autoSelectedForRef = useRef<string | null>(null);
    useEffect(() => {
      const key = scopedTrialIds.join('|');
      if (autoSelectedForRef.current === key) return; // already handled this set
      autoSelectedForRef.current = key; // mark as seen regardless of outcome
      if (scopedTrialIds.length !== 1) return; // only auto-pick the unambiguous case
      if (trialOverrides?.trialId) return; // user already has a selection
      onUpdateTrialOverrides(createDefaultTrialOverrides(scopedTrialIds[0]));
    }, [scopedTrialIds, trialOverrides?.trialId, onUpdateTrialOverrides]);

    // Players list derived from roster
    const players = useMemo(() => getPlayersFromRoster(roster), [roster]);

    // Set of encounter IDs that have overrides
    const overriddenEncounterIds = useMemo(() => {
      if (!trialOverrides?.encounterBuilds) return new Set<string>();
      const ids = new Set<string>();
      for (const [encId, overrides] of Object.entries(trialOverrides.encounterBuilds)) {
        if (encounterHasOverrides(overrides)) {
          ids.add(encId);
        }
      }
      return ids;
    }, [trialOverrides?.encounterBuilds]);

    // Total override count for the badge
    const totalOverrideCount = overriddenEncounterIds.size;

    // Handle trial selection
    const handleTrialChange = useCallback(
      (trialId: string) => {
        if (!trialId) {
          onUpdateTrialOverrides(undefined);
          setSelectedEncounterId(null);
          return;
        }
        onUpdateTrialOverrides(createDefaultTrialOverrides(trialId));
        setSelectedEncounterId(null);
      },
      [onUpdateTrialOverrides],
    );

    // Handle player override update for selected encounter
    const handlePlayerOverrideUpdate = useCallback(
      (playerKey: PlayerKey, override: PlayerOverride | undefined) => {
        if (!trialOverrides || !selectedEncounterId) return;
        const currentEncounter = trialOverrides.encounterBuilds[selectedEncounterId] ?? {
          slots: {},
        };
        const updatedEncounter = setPlayerOverride(currentEncounter, playerKey, override);
        const updatedBuilds = { ...trialOverrides.encounterBuilds };

        if (encounterHasOverrides(updatedEncounter)) {
          updatedBuilds[selectedEncounterId] = updatedEncounter;
        } else {
          delete updatedBuilds[selectedEncounterId];
        }

        onUpdateTrialOverrides({
          ...trialOverrides,
          encounterBuilds: updatedBuilds,
        });
      },
      [trialOverrides, selectedEncounterId, onUpdateTrialOverrides],
    );

    // Current encounter overrides
    const currentEncounterOverrides = selectedEncounterId
      ? trialOverrides?.encounterBuilds[selectedEncounterId]
      : undefined;

    // Selected encounter info
    const selectedEncounterInfo = selectedTrial?.encounters.find(
      (e) => e.id === selectedEncounterId,
    );

    return (
      <Accordion
        disableGutters
        sx={{
          background: 'transparent',
          boxShadow: 'none',
          '&:before': { display: 'none' },
          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          borderRadius: '12px !important',
          overflow: 'hidden',
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ fontSize: '1rem' }} />}
          sx={{
            minHeight: 44,
            px: 1.5,
            '& .MuiAccordionSummary-content': { my: 0.75, gap: 1, alignItems: 'center' },
            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
          }}
        >
          <TuneIcon
            sx={{
              fontSize: '1rem',
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
            }}
          />
          <Box>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                lineHeight: 1,
                mb: 0.25,
              }}
            >
              Advanced
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700,
                fontSize: '0.85rem',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                background: isDark
                  ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
                  : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Per-Fight Builds
            </Typography>
          </Box>
          {totalOverrideCount > 0 && (
            <Chip
              label={`${totalOverrideCount} fight${totalOverrideCount > 1 ? 's' : ''} customized`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.55rem',
                fontWeight: 700,
                ml: 'auto',
                mr: 1,
                backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e',
              }}
            />
          )}
        </AccordionSummary>

        <AccordionDetails sx={{ px: 1.5, pt: 1.5, pb: 2 }}>
          <Stack spacing={2}>
            {/* Trial selector — scoped to the roster's "Built for" trials when set */}
            {scopedTrialIds.length > 0 && (
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: -0.5 }}>
                Showing the {scopedTrialIds.length === 1 ? 'trial' : 'trials'} this roster is{' '}
                <strong>built for</strong>. Add more in the “Built for (Trials)” picker above.
              </Typography>
            )}
            <FormControl fullWidth size="small">
              <InputLabel>Select Trial</InputLabel>
              <Select
                value={trialOverrides?.trialId || ''}
                onChange={(e) => handleTrialChange(e.target.value)}
                label="Select Trial"
                sx={{
                  borderRadius: '10px',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  '& fieldset': {
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
                  },
                }}
              >
                <MenuItem value="">
                  <em>None — No per-fight customization</em>
                </MenuItem>
                {trialOptions.map((trial) => (
                  <MenuItem key={trial.id} value={trial.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={trial.shortName}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          minWidth: 32,
                        }}
                      />
                      <span>{trial.name}</span>
                      <Typography
                        component="span"
                        sx={{ fontSize: '0.7rem', color: 'text.disabled', ml: 'auto' }}
                      >
                        {trial.encounters.filter((e) => e.type === 'boss').length} bosses
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Encounter timeline (shown immediately when trial is selected) */}
            {selectedTrial && (
              <>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '10px',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                    border: isDark
                      ? '1px solid rgba(255,255,255,0.04)'
                      : '1px solid rgba(0,0,0,0.04)',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'text.disabled',
                      mb: 1,
                    }}
                  >
                    {selectedTrial.name} — Select an encounter to customize
                  </Typography>
                  <EncounterTimeline
                    encounters={selectedTrial.encounters}
                    selectedEncounterId={selectedEncounterId}
                    onSelectEncounter={setSelectedEncounterId}
                    overriddenEncounters={overriddenEncounterIds}
                  />
                </Box>

                {/* Per-fight override editor */}
                {selectedEncounterId && selectedEncounterInfo && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: isDark
                        ? '1px solid rgba(255,255,255,0.06)'
                        : '1px solid rgba(0,0,0,0.06)',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)',
                    }}
                  >
                    {/* Encounter header */}
                    <Box sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip
                          label={
                            selectedEncounterInfo.type === 'boss'
                              ? 'Boss'
                              : selectedEncounterInfo.type === 'mini_boss'
                                ? 'Mini-Boss'
                                : 'Trash'
                          }
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.55rem',
                            fontWeight: 700,
                            backgroundColor:
                              selectedEncounterInfo.type === 'boss'
                                ? 'rgba(239, 68, 68, 0.12)'
                                : selectedEncounterInfo.type === 'mini_boss'
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : 'rgba(59, 130, 246, 0.08)',
                            color:
                              selectedEncounterInfo.type === 'boss'
                                ? '#ef4444'
                                : selectedEncounterInfo.type === 'mini_boss'
                                  ? '#f59e0b'
                                  : '#3b82f6',
                          }}
                        />
                        <Typography
                          sx={{
                            fontFamily: '"Space Grotesk", sans-serif',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {selectedEncounterInfo.name}
                        </Typography>
                      </Box>
                      {selectedEncounterInfo.description && (
                        <Typography
                          sx={{
                            fontSize: '0.7rem',
                            color: 'text.secondary',
                            ml: 0.5,
                          }}
                        >
                          {selectedEncounterInfo.description}
                        </Typography>
                      )}
                    </Box>

                    {/* Player override list */}
                    <Stack spacing={0.75}>
                      {/* Section: Tanks */}
                      <Typography
                        sx={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: isDark ? 'rgba(59, 130, 246, 0.7)' : 'rgba(59, 130, 246, 0.8)',
                          mt: 0.5,
                        }}
                      >
                        Tanks
                      </Typography>
                      {players
                        .filter((p) => p.role === 'tank')
                        .map((player) => (
                          <PlayerOverrideEditor
                            key={player.key}
                            player={player}
                            override={getPlayerOverride(currentEncounterOverrides, player.key)}
                            onUpdate={(override) =>
                              handlePlayerOverrideUpdate(player.key, override)
                            }
                            isDark={isDark}
                          />
                        ))}

                      {/* Section: Healers */}
                      <Typography
                        sx={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: isDark ? 'rgba(168, 85, 247, 0.7)' : 'rgba(168, 85, 247, 0.8)',
                          mt: 1,
                        }}
                      >
                        Healers
                      </Typography>
                      {players
                        .filter((p) => p.role === 'healer')
                        .map((player) => (
                          <PlayerOverrideEditor
                            key={player.key}
                            player={player}
                            override={getPlayerOverride(currentEncounterOverrides, player.key)}
                            onUpdate={(override) =>
                              handlePlayerOverrideUpdate(player.key, override)
                            }
                            isDark={isDark}
                          />
                        ))}

                      {/* Section: DPS */}
                      <Typography
                        sx={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: isDark ? 'rgba(239, 68, 68, 0.7)' : 'rgba(239, 68, 68, 0.8)',
                          mt: 1,
                        }}
                      >
                        Damage Dealers
                      </Typography>
                      {players
                        .filter((p) => p.role === 'dps')
                        .map((player) => (
                          <PlayerOverrideEditor
                            key={player.key}
                            player={player}
                            override={getPlayerOverride(currentEncounterOverrides, player.key)}
                            onUpdate={(override) =>
                              handlePlayerOverrideUpdate(player.key, override)
                            }
                            isDark={isDark}
                          />
                        ))}
                    </Stack>
                  </Paper>
                )}

                {/* Hint when no encounter is selected */}
                {!selectedEncounterId && (
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: 'text.disabled',
                      textAlign: 'center',
                      py: 2,
                      fontStyle: 'italic',
                    }}
                  >
                    Click an encounter in the timeline above to customize builds for that fight
                  </Typography>
                )}
              </>
            )}

            {!selectedTrial && (
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: 'text.disabled',
                  textAlign: 'center',
                  py: 1,
                }}
              >
                Select a trial above to enable per-fight build customization
              </Typography>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  },
);

PerFightBuilds.displayName = 'PerFightBuilds';
