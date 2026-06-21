/**
 * Presentational components for the Scribing Simulator.
 *
 * Pure, prop-driven pieces: a grimoire chooser, a per-slot script picker, and a
 * faithful in-game-style preview of the resulting scribed skill. Icons resolve
 * straight from the ESO Logs CDN via the grimoire's icon filename, so they work
 * without a loaded report.
 */

import {
  AutoAwesome as RandomIcon,
  RestartAlt as ResetIcon,
  Share as ShareIcon,
  Search as SearchIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Chip,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import React from 'react';

import { abilityIconUrl } from '@/utils/abilityIconCorrections';

import type { ScribedSkillResult, ScribingSlot } from '../../application/scribingEngine';
import type { AffixScript, FocusScript, Grimoire, SignatureScript } from '../../shared/types';

type AnyScript = FocusScript | SignatureScript | AffixScript;

/** Accent colour per scribing skill line, for chips and selection highlights. */
const SKILL_LINE_COLORS: Readonly<Record<string, string>> = {
  'Soul Magic': '#a855f7',
  'Destruction Staff': '#f97316',
  'Restoration Staff': '#22c55e',
  'Two Handed': '#f59e0b',
  'One Hand and Shield': '#3b82f6',
  'Dual Wield': '#ef4444',
  Bow: '#14b8a6',
  'Mages Guild': '#8b5cf6',
  'Fighters Guild': '#b45309',
  Assault: '#dc2626',
  Support: '#eab308',
};

export function skillLineColor(line?: string): string {
  return (line && SKILL_LINE_COLORS[line]) || '#38bdf8';
}

const SLOT_COLORS: Record<ScribingSlot, string> = {
  focus: '#f97316',
  signature: '#38bdf8',
  affix: '#22c55e',
};

const SLOT_LABELS: Record<ScribingSlot, string> = {
  focus: 'Focus',
  signature: 'Signature',
  affix: 'Affix',
};

/** A CDN ability icon resolved from a filename — independent of report data. */
export const ScribingIcon: React.FC<{
  icon?: string;
  name: string;
  size?: number;
  abilityId?: number;
}> = ({ icon, name, size = 40, abilityId }) => {
  const src = abilityIconUrl(icon, abilityId);
  return (
    <Avatar
      src={src}
      alt={name}
      variant="rounded"
      sx={{
        width: size,
        height: size,
        borderRadius: 1.5,
        bgcolor: 'transparent',
        boxShadow: src ? 2 : 0,
        '& img': { objectFit: 'contain' },
      }}
    >
      {name.charAt(0)}
    </Avatar>
  );
};

// ---------------------------------------------------------------------------
// Grimoire chooser
// ---------------------------------------------------------------------------

export interface GrimoireGridProps {
  grimoires: Grimoire[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export const GrimoireGrid: React.FC<GrimoireGridProps> = ({ grimoires, selectedId, onSelect }) => {
  const theme = useTheme();
  return (
    <Box
      role="radiogroup"
      aria-label="Grimoire"
      sx={{
        display: 'grid',
        // minmax(0, 1fr) lets cells shrink below their content's intrinsic
        // width so long names truncate instead of overflowing the column.
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))' },
        gap: 1,
      }}
    >
      {grimoires.map((g) => {
        const selected = g.id === selectedId;
        const accent = skillLineColor(g.skillLine);
        return (
          <Box
            key={g.id}
            role="radio"
            aria-checked={selected}
            tabIndex={0}
            onClick={() => onSelect(g.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(g.id);
              }
            }}
            sx={{
              cursor: 'pointer',
              p: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderRadius: 2,
              border: '1px solid',
              borderColor: selected ? accent : alpha(theme.palette.divider, 0.6),
              bgcolor: selected
                ? alpha(accent, theme.palette.mode === 'dark' ? 0.18 : 0.1)
                : alpha(theme.palette.background.paper, 0.4),
              boxShadow: selected ? `0 0 0 1px ${accent}` : 'none',
              transition: 'border-color .15s, background-color .15s, box-shadow .15s',
              '&:hover': { borderColor: accent },
              '&:focus-visible': { outline: `2px solid ${accent}`, outlineOffset: 2 },
            }}
          >
            <ScribingIcon icon={g.icon} name={g.name} size={34} />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: selected ? 700 : 500, lineHeight: 1.2 }}
              >
                {g.name}
              </Typography>
              <Typography variant="caption" sx={{ color: accent, fontWeight: 600 }} noWrap>
                {g.skillLine ?? 'Grimoire'}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Script slot picker
// ---------------------------------------------------------------------------

export interface ScriptSlotPickerProps {
  slot: ScribingSlot;
  scripts: AnyScript[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  disabled?: boolean;
}

export const ScriptSlotPicker: React.FC<ScriptSlotPickerProps> = ({
  slot,
  scripts,
  selectedId,
  onSelect,
  disabled = false,
}) => {
  const theme = useTheme();
  const [query, setQuery] = React.useState('');
  const accent = SLOT_COLORS[slot];

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scripts;
    return scripts.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }, [scripts, query]);

  const showSearch = scripts.length > 6;

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: alpha(theme.palette.divider, 0.6),
        bgcolor: alpha(theme.palette.background.paper, 0.35),
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.5),
          borderLeft: `3px solid ${accent}`,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flexGrow: 1 }}>
          {SLOT_LABELS[slot]} Script
        </Typography>
        <Chip
          size="small"
          label={`${scripts.length} available`}
          sx={{ bgcolor: alpha(accent, 0.15), color: accent, fontWeight: 600 }}
        />
      </Box>

      {showSearch && (
        <Box sx={{ px: 1.5, pt: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={`Search ${SLOT_LABELS[slot].toLowerCase()} scripts…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
      )}

      <Box
        role="listbox"
        aria-label={`${SLOT_LABELS[slot]} script options`}
        sx={{
          maxHeight: 240,
          overflowY: 'auto',
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        {disabled && (
          <Typography variant="body2" sx={{ color: 'text.secondary', p: 1 }}>
            Select a grimoire first.
          </Typography>
        )}
        {!disabled && filtered.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', p: 1 }}>
            No matching scripts.
          </Typography>
        )}
        {!disabled &&
          filtered.map((s) => {
            const selected = s.id === selectedId;
            return (
              <Box
                key={s.id}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                onClick={() => onSelect(selected ? undefined : s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(selected ? undefined : s.id);
                  }
                }}
                sx={{
                  cursor: 'pointer',
                  px: 1,
                  py: 0.75,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: selected ? accent : 'transparent',
                  bgcolor: selected ? alpha(accent, 0.12) : 'transparent',
                  '&:hover': { bgcolor: alpha(accent, 0.08) },
                  '&:focus-visible': { outline: `2px solid ${accent}`, outlineOffset: 1 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {selected && <CheckIcon sx={{ fontSize: 16, color: accent }} />}
                  <Typography variant="body2" sx={{ fontWeight: selected ? 700 : 600 }}>
                    {s.name}
                  </Typography>
                  {s.category && (
                    <Chip
                      size="small"
                      label={s.category}
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        bgcolor: alpha(theme.palette.text.primary, 0.08),
                      }}
                    />
                  )}
                  {s.acquisition && (
                    <Tooltip title={s.acquisition} arrow>
                      <Typography
                        variant="caption"
                        sx={{ ml: 'auto', color: 'text.disabled', cursor: 'help' }}
                      >
                        ⓘ
                      </Typography>
                    </Tooltip>
                  )}
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {s.description}
                </Typography>
              </Box>
            );
          })}
      </Box>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Scribed-skill preview (faithful tooltip)
// ---------------------------------------------------------------------------

const RESOURCE_LABELS: Record<string, string> = {
  magicka: 'Magicka',
  stamina: 'Stamina',
  health: 'Health',
  hybrid: 'Highest resource',
};

export interface ScribedSkillCardProps {
  result: ScribedSkillResult | null;
}

export const ScribedSkillCard: React.FC<ScribedSkillCardProps> = ({ result }) => {
  const theme = useTheme();

  if (!result) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body1">Choose a grimoire to preview a scribed skill.</Typography>
      </Box>
    );
  }

  const accent = skillLineColor(result.skillLine);
  const resourceLabel = RESOURCE_LABELS[result.resourceType] ?? result.resourceType;
  const slots: ScribingSlot[] = ['focus', 'signature', 'affix'];
  const bySlot = new Map(result.effects.map((e) => [e.slot, e]));

  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: alpha(accent, 0.5),
        background: `linear-gradient(180deg, ${alpha(accent, theme.palette.mode === 'dark' ? 0.16 : 0.08)} 0%, ${alpha(
          theme.palette.background.paper,
          theme.palette.mode === 'dark' ? 0.6 : 0.9,
        )} 38%)`,
        boxShadow: `0 8px 30px ${alpha(accent, 0.18)}`,
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <ScribingIcon
          icon={result.icon}
          name={result.skillName}
          size={52}
          abilityId={result.abilityId}
        />
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15 }} noWrap>
            {result.skillName}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
            {result.skillLine && (
              <Chip
                size="small"
                label={result.skillLine}
                sx={{ bgcolor: alpha(accent, 0.2), color: accent, fontWeight: 700, height: 20 }}
              />
            )}
            <Chip
              size="small"
              label={`Scribed · ${result.grimoireName}`}
              variant="outlined"
              sx={{ height: 20 }}
            />
          </Stack>
        </Box>
      </Box>

      {/* Meta row */}
      <Box sx={{ px: 2, pb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        <MetaChip label="Resource" value={resourceLabel} />
        {result.targetType && <MetaChip label="Target" value={result.targetType} />}
        {result.castType && <MetaChip label="Cast" value={result.castType} />}
      </Box>

      {/* Base effect */}
      {result.baseEffect && (
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {result.baseEffect}
          </Typography>
        </Box>
      )}

      {/* Script breakdown */}
      <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {slots.map((slot) => {
          const e = bySlot.get(slot);
          const color = SLOT_COLORS[slot];
          return (
            <Box
              key={slot}
              sx={{
                display: 'flex',
                gap: 1,
                p: 1,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: e ? alpha(color, 0.4) : alpha(theme.palette.divider, 0.5),
                bgcolor: e ? alpha(color, 0.06) : 'transparent',
                opacity: e ? 1 : 0.6,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  borderRadius: 1,
                  bgcolor: color,
                  flexShrink: 0,
                  alignSelf: 'stretch',
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{ color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  {SLOT_LABELS[slot]}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {e ? e.name : `Choose a ${SLOT_LABELS[slot].toLowerCase()} script`}
                </Typography>
                {e && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {e.effect}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 2,
          py: 1,
          borderTop: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.5),
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          The Focus script sets the skill’s final name, resource and cost.
        </Typography>
        {result.isComplete && (
          <Chip
            size="small"
            label="Complete"
            color="success"
            variant="outlined"
            sx={{ ml: 'auto', height: 20 }}
          />
        )}
      </Box>
    </Box>
  );
};

const MetaChip: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: alpha(theme.palette.text.primary, 0.06),
        display: 'flex',
        gap: 0.5,
        alignItems: 'baseline',
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export interface SimulatorControlsProps {
  onRandomize: () => void;
  onReset: () => void;
  onShare: () => void;
  shareLabel: string;
  disabled?: boolean;
}

export const SimulatorControls: React.FC<SimulatorControlsProps> = ({
  onRandomize,
  onReset,
  onShare,
  shareLabel,
  disabled = false,
}) => (
  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
    <Button
      variant="contained"
      startIcon={<RandomIcon />}
      onClick={onRandomize}
      disabled={disabled}
    >
      Surprise me
    </Button>
    <Button variant="outlined" startIcon={<ResetIcon />} onClick={onReset} disabled={disabled}>
      Reset scripts
    </Button>
    <Button variant="outlined" startIcon={<ShareIcon />} onClick={onShare} disabled={disabled}>
      {shareLabel}
    </Button>
  </Stack>
);
