import {
  ExpandMore as ExpandMoreIcon,
  Tune as TuneIcon,
  RestartAlt as ResetIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Chip,
  Dialog,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
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
import { encodeRosterToURL } from '../utils/rosterEncoding';
import { copyToClipboard } from '../utils/safeClipboard';
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
      // iOS Safari zooms when an input's font-size is below 16px — bump on phones.
      '@media (max-width: 600px)': {
        '& .MuiInputBase-input': { fontSize: 16 },
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
  /** Update the whole multi-trial overrides map (keyed by trialId). */
  onUpdateTrialOverrides: (overrides: Record<string, TrialBuildOverrides> | undefined) => void;
}

export const PerFightBuilds: React.FC<PerFightBuildsProps> = React.memo(
  ({ roster, onUpdateTrialOverrides }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const overridesMap = roster.trialOverrides;

    // Trials this roster is tagged "Built for", resolved to encounter-data ids.
    // This is the EDITABLE set — every tagged trial gets a rail row (incl. empty).
    const scopedTrialIds = useMemo<string[]>(() => {
      const ids = (roster.trials ?? [])
        .map((tag) => resolveTrialId(tag))
        .filter((id): id is string => Boolean(id));
      return Array.from(new Set(ids));
    }, [roster.trials]);

    // Rail rows: the tagged trials (or all 15 when untagged), PLUS any trial that
    // already has overrides but lost its tag (so customized work is never hidden).
    const railTrials = useMemo<readonly Trial[]>(() => {
      const base = scopedTrialIds.length === 0 ? TRIAL_ENCOUNTERS.map((t) => t.id) : scopedTrialIds;
      const ids = [...base];
      if (overridesMap) {
        for (const id of Object.keys(overridesMap)) {
          if (!ids.includes(id)) ids.push(id);
        }
      }
      return ids.map((id) => getTrialById(id)).filter((t): t is Trial => Boolean(t));
    }, [scopedTrialIds, overridesMap]);

    // Ephemeral selection — which trial is being edited (NOT persisted).
    const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null);
    // Per-trial last-viewed encounter so switching trials restores context.
    const encounterMemory = useRef<Record<string, string | null>>({});
    const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

    // Default the selection to the first rail trial when none is chosen / it vanished.
    useEffect(() => {
      if (railTrials.length === 0) {
        if (selectedTrialId !== null) setSelectedTrialId(null);
        return;
      }
      if (!selectedTrialId || !railTrials.some((t) => t.id === selectedTrialId)) {
        setSelectedTrialId(railTrials[0].id);
      }
    }, [railTrials, selectedTrialId]);

    const selectedTrial = useMemo<Trial | undefined>(
      () => (selectedTrialId ? getTrialById(selectedTrialId) : undefined),
      [selectedTrialId],
    );
    const selectedTrialOverrides = selectedTrialId ? overridesMap?.[selectedTrialId] : undefined;

    // Players list derived from roster
    const players = useMemo(() => getPlayersFromRoster(roster), [roster]);

    // Override-count per trial (for rail badges) + the active trial's overridden encounters.
    const overrideCountByTrial = useMemo(() => {
      const counts: Record<string, number> = {};
      if (overridesMap) {
        for (const [trialId, t] of Object.entries(overridesMap)) {
          counts[trialId] = Object.values(t.encounterBuilds).filter((eo) =>
            encounterHasOverrides(eo),
          ).length;
        }
      }
      return counts;
    }, [overridesMap]);

    const overriddenEncounterIds = useMemo(() => {
      const ids = new Set<string>();
      if (selectedTrialOverrides?.encounterBuilds) {
        for (const [encId, overrides] of Object.entries(selectedTrialOverrides.encounterBuilds)) {
          if (encounterHasOverrides(overrides)) ids.add(encId);
        }
      }
      return ids;
    }, [selectedTrialOverrides?.encounterBuilds]);

    const totalOverrideCount = useMemo(
      () => Object.values(overrideCountByTrial).reduce((a, b) => a + b, 0),
      [overrideCountByTrial],
    );
    const trialsWithOverrides = useMemo(
      () => Object.values(overrideCountByTrial).filter((c) => c > 0).length,
      [overrideCountByTrial],
    );

    // ── Map mutation helpers (immutable, prune empties) ──
    const writeTrial = useCallback(
      (trialId: string, next: TrialBuildOverrides | undefined) => {
        const map = { ...(overridesMap ?? {}) };
        const stillHasData =
          next && (Object.keys(next.encounterBuilds).length > 0 || next.useSameBuildForAll);
        if (next && stillHasData) {
          map[trialId] = next;
        } else {
          delete map[trialId];
        }
        onUpdateTrialOverrides(Object.keys(map).length > 0 ? map : undefined);
      },
      [overridesMap, onUpdateTrialOverrides],
    );

    // Switch which trial is being edited, restoring its last-viewed encounter.
    const handleSelectTrial = useCallback((trialId: string) => {
      setSelectedTrialId(trialId);
      setSelectedEncounterId(encounterMemory.current[trialId] ?? null);
    }, []);

    const handleSelectEncounter = useCallback(
      (encId: string | null) => {
        setSelectedEncounterId(encId);
        if (selectedTrialId) encounterMemory.current[selectedTrialId] = encId;
      },
      [selectedTrialId],
    );

    // Toggle "same build for all" for a trial without entering it.
    const handleToggleSameBuild = useCallback(
      (trialId: string) => {
        const existing = overridesMap?.[trialId];
        const next: TrialBuildOverrides = existing
          ? { ...existing, useSameBuildForAll: !existing.useSameBuildForAll }
          : { ...createDefaultTrialOverrides(trialId), useSameBuildForAll: false };
        // createDefaultTrialOverrides defaults useSameBuildForAll=true; the toggle
        // intent from an empty trial is "enable per-fight", i.e. sameBuild=false.
        writeTrial(trialId, next);
      },
      [overridesMap, writeTrial],
    );

    // Handle player override update for selected encounter, within the active trial.
    const handlePlayerOverrideUpdate = useCallback(
      (playerKey: PlayerKey, override: PlayerOverride | undefined) => {
        if (!selectedTrialId || !selectedEncounterId) return;
        const trial =
          overridesMap?.[selectedTrialId] ?? createDefaultTrialOverrides(selectedTrialId);
        const currentEncounter = trial.encounterBuilds[selectedEncounterId] ?? { slots: {} };
        const updatedEncounter = setPlayerOverride(currentEncounter, playerKey, override);
        const updatedBuilds = { ...trial.encounterBuilds };
        if (encounterHasOverrides(updatedEncounter)) {
          updatedBuilds[selectedEncounterId] = updatedEncounter;
        } else {
          delete updatedBuilds[selectedEncounterId];
        }
        // Editing per-fight builds implies per-fight mode.
        writeTrial(selectedTrialId, {
          ...trial,
          useSameBuildForAll: false,
          encounterBuilds: updatedBuilds,
        });
      },
      [overridesMap, selectedTrialId, selectedEncounterId, writeTrial],
    );

    const currentEncounterOverrides = selectedEncounterId
      ? selectedTrialOverrides?.encounterBuilds[selectedEncounterId]
      : undefined;
    const selectedEncounterInfo = selectedTrial?.encounters.find(
      (e) => e.id === selectedEncounterId,
    );

    // Roving-tablist keyboard nav for the desktop rail.
    const railRefs = useRef<(HTMLElement | null)[]>([]);
    const handleRailKeyDown = useCallback(
      (e: React.KeyboardEvent, index: number) => {
        let next = index;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (index + 1) % railTrials.length;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft')
          next = (index - 1 + railTrials.length) % railTrials.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = railTrials.length - 1;
        else return;
        e.preventDefault();
        const trial = railTrials[next];
        if (trial) {
          handleSelectTrial(trial.id);
          railRefs.current[next]?.focus();
        }
      },
      [railTrials, handleSelectTrial],
    );

    // Mobile trial bottom-sheet open state.
    const [sheetOpen, setSheetOpen] = useState(false);

    // Copy a deep link to the currently-viewed fight on the read-only /rv page.
    const [copied, setCopied] = useState(false);
    const handleCopyFightLink = useCallback(() => {
      void encodeRosterToURL(roster).then(async (encoded) => {
        if (!encoded) return;
        const basePath = window.location.pathname.replace(/\/roster-builder(\/.*)?$/, '');
        let url = `${window.location.origin}${basePath}/rv?r=${encoded}`;
        if (selectedTrialId) url += `&trial=${encodeURIComponent(selectedTrialId)}`;
        if (selectedEncounterId) url += `&encounter=${encodeURIComponent(selectedEncounterId)}`;
        const ok = await copyToClipboard(url);
        if (ok) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        }
      });
    }, [roster, selectedTrialId, selectedEncounterId]);

    const showRail = railTrials.length > 1;
    const headerBadge =
      totalOverrideCount > 0
        ? `${totalOverrideCount} fight${totalOverrideCount > 1 ? 's' : ''}${
            trialsWithOverrides > 1 ? ` · ${trialsWithOverrides} trials` : ''
          }`
        : null;

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
          {headerBadge && (
            <Chip
              label={headerBadge}
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
          {railTrials.length === 0 ? (
            <Typography
              sx={{ fontSize: '0.75rem', color: 'text.disabled', textAlign: 'center', py: 1 }}
            >
              Tag this roster with one or more trials in the “Built for (Trials)” picker above to
              enable per-fight build customization.
            </Typography>
          ) : (
            <Box
              sx={{
                display: 'grid',
                // minmax(0, …) lets the content track shrink below its intrinsic
                // width so the encounter timeline scrolls internally instead of
                // blowing the pane out past the viewport on mobile.
                gridTemplateColumns:
                  showRail && !isMobile ? '210px minmax(0, 1fr)' : 'minmax(0, 1fr)',
                gap: 1.5,
                alignItems: 'start',
              }}
            >
              {/* MASTER — desktop trial rail */}
              {showRail && !isMobile && (
                <Box
                  role="tablist"
                  aria-label="Trials"
                  aria-orientation="vertical"
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    maxHeight: 360,
                    overflowY: 'auto',
                    pr: 0.5,
                  }}
                >
                  {railTrials.map((trial, index) => {
                    const count = overrideCountByTrial[trial.id] ?? 0;
                    const sameBuild = overridesMap?.[trial.id]?.useSameBuildForAll ?? false;
                    const active = trial.id === selectedTrialId;
                    return (
                      <Box
                        key={trial.id}
                        ref={(el: HTMLElement | null) => {
                          railRefs.current[index] = el;
                        }}
                        role="tab"
                        aria-selected={active}
                        aria-controls={`pft-panel-${trial.id}`}
                        id={`pft-tab-${trial.id}`}
                        tabIndex={active ? 0 : -1}
                        onClick={() => handleSelectTrial(trial.id)}
                        onKeyDown={(e) => handleRailKeyDown(e, index)}
                        sx={{
                          cursor: 'pointer',
                          position: 'relative',
                          borderRadius: '8px',
                          px: 1,
                          py: 0.75,
                          pl: 1.25,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          borderLeft: active ? '3px solid #38bdf8' : '3px solid transparent',
                          backgroundColor: active
                            ? isDark
                              ? 'rgba(56,189,248,0.12)'
                              : 'rgba(56,189,248,0.10)'
                            : 'transparent',
                          transition: 'background-color 0.15s ease',
                          '&:hover': {
                            backgroundColor: active
                              ? isDark
                                ? 'rgba(56,189,248,0.16)'
                                : 'rgba(56,189,248,0.14)'
                              : isDark
                                ? 'rgba(255,255,255,0.04)'
                                : 'rgba(0,0,0,0.03)',
                          },
                          '&:focus-visible': {
                            outline: '2px solid #38bdf8',
                            outlineOffset: '-2px',
                          },
                        }}
                      >
                        <Chip
                          label={trial.shortName}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.55rem',
                            fontWeight: 700,
                            minWidth: 30,
                            backgroundColor: isDark
                              ? 'rgba(96,165,250,0.12)'
                              : 'rgba(37,99,235,0.08)',
                            color: isDark ? '#bfdbfe' : '#1d4ed8',
                          }}
                        />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            sx={{
                              fontSize: '0.72rem',
                              fontWeight: active ? 700 : 600,
                              lineHeight: 1.15,
                              color: active ? 'text.primary' : 'text.secondary',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {trial.name}
                          </Typography>
                          <Typography
                            sx={{ fontSize: '0.6rem', color: 'text.disabled', lineHeight: 1.1 }}
                          >
                            {count > 0
                              ? `${count} fight${count > 1 ? 's' : ''}`
                              : sameBuild
                                ? 'same build'
                                : 'no edits'}
                          </Typography>
                        </Box>
                        {count > 0 && (
                          <Box
                            aria-hidden
                            sx={{
                              minWidth: 16,
                              height: 16,
                              px: 0.5,
                              borderRadius: '8px',
                              fontSize: '0.55rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: isDark
                                ? 'rgba(34,197,94,0.18)'
                                : 'rgba(34,197,94,0.14)',
                              color: '#22c55e',
                            }}
                          >
                            {count}
                          </Box>
                        )}
                        <Tooltip title="Same build for every fight" arrow>
                          <IconButton
                            size="small"
                            aria-label={`Toggle same build for all fights in ${trial.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSameBuild(trial.id);
                            }}
                            sx={{ p: 0.25 }}
                          >
                            <Box
                              component="span"
                              sx={{
                                fontSize: '0.7rem',
                                color: sameBuild ? '#38bdf8' : 'text.disabled',
                                fontWeight: 700,
                              }}
                            >
                              {sameBuild ? '≣' : '≡'}
                            </Box>
                          </IconButton>
                        </Tooltip>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* MASTER — mobile trigger bar */}
              {showRail && isMobile && selectedTrial && (
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => setSheetOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSheetOpen(true);
                    }
                  }}
                  sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    borderRadius: '10px',
                    px: 1.25,
                    py: 1,
                    border: isDark
                      ? '1px solid rgba(255,255,255,0.1)'
                      : '1px solid rgba(0,0,0,0.12)',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    '&:focus-visible': { outline: '2px solid #38bdf8', outlineOffset: '2px' },
                  }}
                >
                  <Chip
                    label={selectedTrial.shortName}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      backgroundColor: isDark ? 'rgba(96,165,250,0.12)' : 'rgba(37,99,235,0.08)',
                      color: isDark ? '#bfdbfe' : '#1d4ed8',
                    }}
                  />
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, flex: 1, minWidth: 0 }}>
                    {selectedTrial.name}
                  </Typography>
                  {(overrideCountByTrial[selectedTrial.id] ?? 0) > 0 && (
                    <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', flexShrink: 0 }}>
                      {overrideCountByTrial[selectedTrial.id]} fight
                      {overrideCountByTrial[selectedTrial.id] > 1 ? 's' : ''}
                    </Typography>
                  )}
                  <ExpandMoreIcon
                    sx={{ fontSize: '1.1rem', color: 'text.disabled', flexShrink: 0 }}
                  />
                </Box>
              )}

              {/* DETAIL pane — minWidth:0 so it can shrink within the grid track */}
              <Box
                role="tabpanel"
                id={selectedTrialId ? `pft-panel-${selectedTrialId}` : undefined}
                aria-labelledby={selectedTrialId ? `pft-tab-${selectedTrialId}` : undefined}
                sx={{ minWidth: 0 }}
              >
                <Stack spacing={2} sx={{ minWidth: 0 }}>
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
                          onSelectEncounter={handleSelectEncounter}
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
                            backgroundColor: isDark
                              ? 'rgba(255,255,255,0.015)'
                              : 'rgba(0,0,0,0.01)',
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
                                color: isDark
                                  ? 'rgba(59, 130, 246, 0.7)'
                                  : 'rgba(59, 130, 246, 0.8)',
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
                                  override={getPlayerOverride(
                                    currentEncounterOverrides,
                                    player.key,
                                  )}
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
                                color: isDark
                                  ? 'rgba(168, 85, 247, 0.7)'
                                  : 'rgba(168, 85, 247, 0.8)',
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
                                  override={getPlayerOverride(
                                    currentEncounterOverrides,
                                    player.key,
                                  )}
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
                                  override={getPlayerOverride(
                                    currentEncounterOverrides,
                                    player.key,
                                  )}
                                  onUpdate={(override) =>
                                    handlePlayerOverrideUpdate(player.key, override)
                                  }
                                  isDark={isDark}
                                />
                              ))}
                          </Stack>
                        </Paper>
                      )}

                      {/* Deep-link to this fight + hint */}
                      {selectedEncounterId ? (
                        <Tooltip title="Copy a read-only link that opens this exact fight" arrow>
                          <Box
                            role="button"
                            tabIndex={0}
                            onClick={handleCopyFightLink}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleCopyFightLink();
                              }
                            }}
                            sx={{
                              alignSelf: 'flex-start',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: copied ? '#22c55e' : '#38bdf8',
                              px: 1,
                              py: 0.5,
                              borderRadius: '8px',
                              '&:hover': {
                                backgroundColor: isDark
                                  ? 'rgba(56,189,248,0.08)'
                                  : 'rgba(56,189,248,0.06)',
                              },
                              '&:focus-visible': {
                                outline: '2px solid #38bdf8',
                                outlineOffset: '2px',
                              },
                            }}
                          >
                            {copied ? <CheckIcon sx={{ fontSize: '0.85rem' }} /> : null}
                            {copied ? 'Link copied' : '🔗 Copy link to this fight'}
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: 'text.disabled',
                            textAlign: 'center',
                            py: 2,
                            fontStyle: 'italic',
                          }}
                        >
                          Click an encounter in the timeline above to customize builds for that
                          fight
                        </Typography>
                      )}
                    </>
                  )}
                </Stack>
              </Box>
            </Box>
          )}

          {/* MOBILE — trial bottom sheet (content-height, anchored to the bottom) */}
          <Dialog
            open={sheetOpen && isMobile}
            onClose={() => setSheetOpen(false)}
            aria-labelledby="pft-sheet-title"
            slotProps={{
              paper: {
                sx: {
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  m: 0,
                  width: '100%',
                  maxWidth: '100%',
                  maxHeight: '85dvh',
                  borderRadius: '20px 20px 0 0',
                  background: isDark ? 'rgba(15,23,42,0.98)' : 'rgba(255,255,255,0.98)',
                  backdropFilter: 'blur(16px)',
                  // Respect the iOS home-indicator safe area.
                  pb: 'env(safe-area-inset-bottom)',
                },
              },
            }}
          >
            <Box sx={{ px: 2, pt: 1.25, pb: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  mx: 'auto',
                  mb: 1.5,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Typography
                  id="pft-sheet-title"
                  sx={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 700,
                    fontSize: '1rem',
                    flex: 1,
                  }}
                >
                  Choose a trial
                </Typography>
                <IconButton
                  aria-label="Close trial picker"
                  onClick={() => setSheetOpen(false)}
                  size="small"
                  sx={{ color: 'text.secondary' }}
                >
                  <CloseIcon sx={{ fontSize: '1.1rem' }} />
                </IconButton>
              </Box>
              <Stack spacing={0.75} sx={{ overflowY: 'auto' }}>
                {railTrials.map((trial) => {
                  const count = overrideCountByTrial[trial.id] ?? 0;
                  const sameBuild = overridesMap?.[trial.id]?.useSameBuildForAll ?? false;
                  const active = trial.id === selectedTrialId;
                  return (
                    <Box
                      key={trial.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={active}
                      onClick={() => {
                        handleSelectTrial(trial.id);
                        setSheetOpen(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectTrial(trial.id);
                          setSheetOpen(false);
                        }
                      }}
                      sx={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        minHeight: 52,
                        px: 1.25,
                        borderRadius: '12px',
                        borderLeft: active ? '3px solid #38bdf8' : '3px solid transparent',
                        backgroundColor: active
                          ? isDark
                            ? 'rgba(56,189,248,0.12)'
                            : 'rgba(56,189,248,0.10)'
                          : isDark
                            ? 'rgba(255,255,255,0.03)'
                            : 'rgba(0,0,0,0.02)',
                        '&:focus-visible': { outline: '2px solid #38bdf8', outlineOffset: '2px' },
                      }}
                    >
                      <Chip
                        label={trial.shortName}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          flexShrink: 0,
                          backgroundColor: isDark
                            ? 'rgba(96,165,250,0.12)'
                            : 'rgba(37,99,235,0.08)',
                          color: isDark ? '#bfdbfe' : '#1d4ed8',
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {trial.name}
                      </Typography>
                      <Typography
                        sx={{ fontSize: '0.7rem', color: 'text.disabled', flexShrink: 0 }}
                      >
                        {count > 0
                          ? `${count} fight${count > 1 ? 's' : ''}`
                          : sameBuild
                            ? 'same build'
                            : 'no edits'}
                      </Typography>
                      <Tooltip title="Same build for every fight" arrow>
                        <IconButton
                          aria-label={`Toggle same build for all fights in ${trial.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSameBuild(trial.id);
                          }}
                          sx={{ flexShrink: 0 }}
                        >
                          <Box
                            component="span"
                            sx={{
                              fontSize: '0.95rem',
                              color: sameBuild ? '#38bdf8' : 'text.disabled',
                              fontWeight: 700,
                            }}
                          >
                            {sameBuild ? '≣' : '≡'}
                          </Box>
                        </IconButton>
                      </Tooltip>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </Dialog>
        </AccordionDetails>
      </Accordion>
    );
  },
);

PerFightBuilds.displayName = 'PerFightBuilds';
