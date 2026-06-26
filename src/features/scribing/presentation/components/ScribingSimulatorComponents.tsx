/**
 * Presentational components for the Scribing Simulator.
 *
 * Pure, prop-driven pieces built around the page's three-rune identity: a
 * grimoire chooser, a per-slot script picker, the live "altar" preview of the
 * resulting scribed skill, and the build controls. Icons resolve straight from
 * the ESO Logs CDN via each grimoire's icon filename, so they render without a
 * loaded report.
 */

import {
  Casino as RandomIcon,
  RestartAlt as ResetIcon,
  IosShare as ShareIcon,
  Search as SearchIcon,
  Check as CheckIcon,
  InfoOutlined as InfoIcon,
  GpsFixed as FocusIcon,
  AutoAwesome as SignatureIcon,
  Shield as AffixIcon,
  AutoStories as GrimoireIcon,
  AutoFixHigh as InkIcon,
  ExpandMore as ExpandIcon,
  type SvgIconComponent,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
  type SxProps,
  type Theme,
} from '@mui/material';
import React from 'react';

import { abilityIconUrl } from '@/utils/abilityIconCorrections';

import type { ScribedSkillResult, ScribingSlot } from '../../application/scribingEngine';
import type { AffixScript, FocusScript, Grimoire, SignatureScript } from '../../shared/types';

import {
  SLOT_COLORS,
  SLOT_LABELS,
  SLOT_ORDER,
  SLOT_ROLE,
  glassPanelSx,
  resourceMeta,
  skillLineColor,
  statChipSx,
} from './scribingStyles';

type AnyScript = FocusScript | SignatureScript | AffixScript;

/** Re-exported for the feature barrel / external consumers. */
export { skillLineColor };

/** Per-slot glyph — the three runes that compose a scribed skill. */
const SLOT_ICON: Record<ScribingSlot, SvgIconComponent> = {
  focus: FocusIcon,
  signature: SignatureIcon,
  affix: AffixIcon,
};

/**
 * Roving-tabindex keyboard navigation for an ARIA radiogroup/listbox: moves DOM
 * focus to the next/previous (or first/last) item of `role` within the same
 * container. Returns the focused element so callers can react (e.g. select it).
 */
function focusRovingSibling(
  current: HTMLElement,
  role: 'radio' | 'option',
  dir: 1 | -1 | 'first' | 'last',
): HTMLElement | null {
  const container = current.closest('[role="radiogroup"], [role="listbox"]');
  if (!container) return null;
  const items = Array.from(container.querySelectorAll<HTMLElement>(`[role="${role}"]`));
  const idx = items.indexOf(current);
  if (idx === -1 || items.length === 0) return null;
  let next: number;
  if (dir === 'first') next = 0;
  else if (dir === 'last') next = items.length - 1;
  else next = (idx + dir + items.length) % items.length;
  const el = items[next] ?? null;
  el?.focus();
  return el;
}

const ARROW_DIR: Record<string, 1 | -1 | 'first' | 'last'> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
  Home: 'first',
  End: 'last',
};

/** A CDN ability icon resolved from a filename — independent of report data. */
export const ScribingIcon: React.FC<{
  icon?: string;
  name: string;
  size?: number;
  abilityId?: number;
  ring?: string;
}> = ({ icon, name, size = 40, abilityId, ring }) => {
  const src = abilityIconUrl(icon, abilityId);
  return (
    <Avatar
      src={src}
      alt={name}
      variant="rounded"
      sx={{
        width: size,
        height: size,
        borderRadius: 1.75,
        bgcolor: 'transparent',
        boxShadow: ring
          ? `0 0 0 1px ${alpha(ring, 0.6)}, 0 6px 18px ${alpha(ring, 0.3)}`
          : src
            ? 2
            : 0,
        '& img': { objectFit: 'contain' },
      }}
    >
      {name.charAt(0)}
    </Avatar>
  );
};

// ---------------------------------------------------------------------------
// Hero stat chip
// ---------------------------------------------------------------------------

export const StatChip: React.FC<{ icon?: React.ReactNode; label: string; accent?: string }> = ({
  icon,
  label,
  accent,
}) => {
  const theme = useTheme();
  return (
    <Box component="span" sx={statChipSx(theme, accent)}>
      {icon && (
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            color: accent ?? 'primary.main',
            '& svg': { fontSize: 16 },
          }}
        >
          {icon}
        </Box>
      )}
      {label}
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Inscription progress — the three-rune triad (0–3 slots filled)
// ---------------------------------------------------------------------------

export const InscriptionProgress: React.FC<{ filled: Record<ScribingSlot, boolean> }> = ({
  filled,
}) => {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const count = SLOT_ORDER.filter((s) => filled[s]).length;
  return (
    <Box
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
      role="img"
      aria-label={`${count} of 3 scripts inscribed`}
    >
      {SLOT_ORDER.map((slot) => {
        const on = filled[slot];
        const c = SLOT_COLORS[slot];
        const Icon = SLOT_ICON[slot];
        return (
          <Box
            key={slot}
            sx={{
              width: 24,
              height: 24,
              borderRadius: '8px',
              display: 'grid',
              placeItems: 'center',
              border: '1px solid',
              borderColor: on ? alpha(c, 0.7) : alpha(theme.palette.divider, 0.7),
              color: on ? c : 'text.disabled',
              bgcolor: on ? alpha(c, dark ? 0.16 : 0.1) : 'transparent',
              boxShadow: on ? `0 0 10px ${alpha(c, 0.4)}` : 'none',
              transition: 'all .2s ease',
              '& svg': { fontSize: 14 },
            }}
          >
            <Icon />
          </Box>
        );
      })}
    </Box>
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
  const dark = theme.palette.mode === 'dark';
  // Roving tabindex: only the checked radio (or the first, if none) is tabbable.
  const tabbableId = grimoires.some((g) => g.id === selectedId) ? selectedId : grimoires[0]?.id;
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
            data-id={g.id}
            tabIndex={g.id === tabbableId ? 0 : -1}
            onClick={() => onSelect(g.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(g.id);
                return;
              }
              const dir = ARROW_DIR[e.key];
              if (dir !== undefined) {
                e.preventDefault();
                // ARIA radiogroup: arrow keys move focus and check the radio.
                const el = focusRovingSibling(e.currentTarget, 'radio', dir);
                if (el?.dataset.id) onSelect(el.dataset.id);
              }
            }}
            sx={{
              position: 'relative',
              cursor: 'pointer',
              p: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderRadius: '14px',
              border: '1px solid',
              borderColor: selected ? alpha(accent, 0.85) : alpha(theme.palette.divider, 0.55),
              background: selected
                ? `linear-gradient(135deg, ${alpha(accent, dark ? 0.22 : 0.14)} 0%, ${alpha(
                    accent,
                    dark ? 0.05 : 0.03,
                  )} 100%)`
                : dark
                  ? alpha('#ffffff', 0.02)
                  : alpha('#0f172a', 0.015),
              boxShadow: selected
                ? `0 0 0 1px ${alpha(accent, 0.5)}, 0 8px 22px ${alpha(accent, 0.22)}`
                : 'none',
              transition: 'transform .15s ease, border-color .15s ease, box-shadow .15s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: alpha(accent, 0.7),
                boxShadow: `0 8px 22px ${alpha(accent, 0.18)}`,
              },
              '&:focus-visible': { outline: `2px solid ${accent}`, outlineOffset: 2 },
            }}
          >
            <ScribingIcon
              icon={g.icon}
              name={g.name}
              size={36}
              ring={selected ? accent : undefined}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: selected ? 700 : 500, lineHeight: 1.2 }}
              >
                {g.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: accent, fontWeight: 600, letterSpacing: 0.2 }}
                noWrap
              >
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
// Script slot picker — a "rune slot"
// ---------------------------------------------------------------------------

export interface ScriptSlotPickerProps {
  slot: ScribingSlot;
  scripts: AnyScript[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  disabled?: boolean;
  /**
   * xs-only accordion. When `onToggleExpanded` is provided the picker collapses
   * on small screens and its header becomes a toggle, so the bench stays short
   * and only one option list scrolls with the page. When omitted (e.g. unit
   * tests, or md+), the picker is always expanded — preserving the full listbox.
   */
  expanded?: boolean;
  onToggleExpanded?: () => void;
}

export const ScriptSlotPicker: React.FC<ScriptSlotPickerProps> = ({
  slot,
  scripts,
  selectedId,
  onSelect,
  disabled = false,
  expanded,
  onToggleExpanded,
}) => {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [query, setQuery] = React.useState('');
  const accent = SLOT_COLORS[slot];
  const SlotGlyph = SLOT_ICON[slot];
  const selectedScript = scripts.find((s) => s.id === selectedId);
  const listboxId = React.useId();

  // Only collapse on small screens, and only when the parent coordinates the
  // open slot (single-open accordion). md+ keeps every picker open.
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const collapsible = isMobile && onToggleExpanded != null;
  const open = !collapsible || expanded === true;

  // Clear the search whenever the script list changes (e.g. a new grimoire). The
  // search box is only rendered for long lists, so without this a stale query
  // could keep filtering — and hiding valid options — after the box disappears.
  React.useEffect(() => {
    setQuery('');
  }, [scripts]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scripts;
    return scripts.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }, [scripts, query]);

  const showSearch = scripts.length > 6;
  // Roving tabindex target: the selected option if it's visible, else the first.
  const tabbableId = filtered.some((s) => s.id === selectedId) ? selectedId : filtered[0]?.id;

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: '14px',
        border: '1px solid',
        borderColor: selectedScript
          ? alpha(accent, 0.55)
          : disabled
            ? alpha(theme.palette.divider, 0.4)
            : alpha(theme.palette.divider, 0.6),
        background: dark ? alpha('#ffffff', 0.025) : alpha('#0f172a', 0.015),
        boxShadow: selectedScript ? `0 6px 18px ${alpha(accent, 0.16)}` : 'none',
        overflow: 'hidden',
        opacity: disabled ? 0.7 : 1,
        transition: 'border-color .15s ease, box-shadow .15s ease',
      }}
    >
      {/* Slot header — a glyph "rune well" + the slot's role (a toggle on xs) */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: open ? '1px solid' : 'none',
          borderColor: alpha(theme.palette.divider, 0.5),
          background: `linear-gradient(90deg, ${alpha(accent, dark ? 0.12 : 0.08)} 0%, transparent 70%)`,
        }}
      >
        <Box
          {...(collapsible
            ? {
                role: 'button',
                tabIndex: 0,
                'aria-expanded': open,
                'aria-controls': listboxId,
                onClick: onToggleExpanded,
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleExpanded?.();
                  }
                },
              }
            : {})}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexGrow: 1,
            minWidth: 0,
            borderRadius: '8px',
            cursor: collapsible ? 'pointer' : 'default',
            '&:focus-visible': collapsible
              ? { outline: `2px solid ${accent}`, outlineOffset: 2 }
              : undefined,
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: 30,
              height: 30,
              flexShrink: 0,
              borderRadius: '9px',
              display: 'grid',
              placeItems: 'center',
              color: accent,
              border: '1px solid',
              borderColor: alpha(accent, 0.5),
              bgcolor: alpha(accent, dark ? 0.16 : 0.1),
              boxShadow: selectedScript ? `0 0 12px ${alpha(accent, 0.45)}` : 'none',
              '& svg': { fontSize: 17 },
            }}
          >
            <SlotGlyph />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                lineHeight: 1.1,
                fontFamily: 'Space Grotesk, Inter, system-ui',
              }}
            >
              {SLOT_LABELS[slot]} Script
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: selectedScript ? accent : 'text.secondary', display: 'block' }}
              noWrap
            >
              {/* Collapsed on mobile → show the chosen script as the summary. */}
              {collapsible && !open && selectedScript ? selectedScript.name : SLOT_ROLE[slot]}
            </Typography>
          </Box>
          {collapsible && (
            <ExpandIcon
              aria-hidden
              sx={{
                fontSize: 20,
                color: 'text.secondary',
                flexShrink: 0,
                transition: 'transform .2s ease',
                transform: open ? 'rotate(180deg)' : 'none',
              }}
            />
          )}
        </Box>
        {selectedId && (
          <Button
            size="small"
            onClick={() => onSelect(undefined)}
            sx={{ minWidth: 0, px: 1, py: 0, fontSize: '0.7rem', flexShrink: 0 }}
          >
            Clear
          </Button>
        )}
        <Chip
          size="small"
          label={`${scripts.length}`}
          aria-label={`${scripts.length} available`}
          sx={{
            flexShrink: 0,
            height: 20,
            minWidth: 28,
            fontWeight: 700,
            bgcolor: alpha(accent, dark ? 0.2 : 0.14),
            color: accent,
            border: '1px solid',
            borderColor: alpha(accent, 0.35),
          }}
        />
      </Box>

      <Collapse in={open} timeout="auto">
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
                // Placeholders aren't a reliable accessible name — give the field
                // a durable label for screen readers.
                htmlInput: { 'aria-label': `Search ${SLOT_LABELS[slot]} scripts` },
              }}
            />
          </Box>
        )}

        <Box
          id={listboxId}
          role="listbox"
          aria-label={`${SLOT_LABELS[slot]} script options`}
          sx={{
            maxHeight: { xs: 'none', md: 244 },
            overflowY: { xs: 'visible', md: 'auto' },
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
                  // Fold name + effect + unlock into the option's accessible name
                  // so screen-reader users get everything without a nested control.
                  aria-label={`${s.name}. ${s.description}${
                    s.acquisition ? `. How to unlock: ${s.acquisition}` : ''
                  }`}
                  tabIndex={s.id === tabbableId ? 0 : -1}
                  onClick={() => onSelect(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(s.id);
                      return;
                    }
                    const dir = ARROW_DIR[e.key];
                    // In a listbox arrow keys move focus only; selection is explicit.
                    if (dir !== undefined) {
                      e.preventDefault();
                      focusRovingSibling(e.currentTarget, 'option', dir);
                    }
                  }}
                  sx={{
                    cursor: 'pointer',
                    px: 1,
                    py: 0.75,
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: selected ? alpha(accent, 0.6) : 'transparent',
                    background: selected
                      ? `linear-gradient(90deg, ${alpha(accent, dark ? 0.2 : 0.14)}, ${alpha(accent, 0.04)})`
                      : 'transparent',
                    boxShadow: selected ? `inset 3px 0 0 ${accent}` : 'none',
                    transition: 'background .12s ease, border-color .12s ease',
                    '&:hover': { background: alpha(accent, 0.08) },
                    '&:focus-visible': { outline: `2px solid ${accent}`, outlineOffset: 1 },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {selected && <CheckIcon sx={{ fontSize: 16, color: accent, flexShrink: 0 }} />}
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
                      // Pointer-only affordance: tappable on touch (enterTouchDelay
                      // 0 so a tap reveals it immediately) and hoverable on desktop,
                      // with stopPropagation so it never selects the option. Kept
                      // OUT of the tab order + a11y tree (tabIndex -1, aria-hidden):
                      // the acquisition is already in the option's aria-label, so
                      // keyboard/screen-reader users get it without a nested control.
                      <Tooltip
                        title={s.acquisition}
                        arrow
                        enterTouchDelay={0}
                        leaveTouchDelay={6000}
                      >
                        <IconButton
                          aria-hidden
                          tabIndex={-1}
                          size="small"
                          disableRipple
                          onClick={(e) => e.stopPropagation()}
                          sx={{ ml: 'auto', p: 0.5, color: 'text.disabled' }}
                        >
                          <InfoIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', display: 'block', textWrap: 'pretty' }}
                  >
                    {s.description}
                  </Typography>
                </Box>
              );
            })}
        </Box>
      </Collapse>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Scribed-skill preview — the "altar"
// ---------------------------------------------------------------------------

export interface ScribedSkillCardProps {
  result: ScribedSkillResult | null;
}

export const ScribedSkillCard: React.FC<ScribedSkillCardProps> = ({ result }) => {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  if (!result) {
    return (
      <Box
        sx={{
          ...glassPanelSx(theme),
          p: 4,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 56,
            height: 56,
            mx: 'auto',
            mb: 1.5,
            borderRadius: '16px',
            display: 'grid',
            placeItems: 'center',
            color: 'primary.main',
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.4),
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            '& svg': { fontSize: 28 },
          }}
        >
          <GrimoireIcon />
        </Box>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          Choose a grimoire to begin scribing.
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          Your scribed skill will materialise here.
        </Typography>
      </Box>
    );
  }

  const accent = skillLineColor(result.skillLine);
  const resource = resourceMeta(result.resourceType);
  const bySlot = new Map(result.effects.map((e) => [e.slot, e]));
  const filledCount = result.effects.length;
  // The skill icon's glow grows as the build nears completion (luminous ink).
  const glow = 0.12 + filledCount * 0.07;

  return (
    <Box
      // Re-key on the composed identity so the card cross-fades ("materialises")
      // whenever the resulting skill changes. Global reduced-motion CSS disables
      // the animation for users who opt out.
      key={`${result.skillName}|${result.effects.map((e) => e.id).join('-')}`}
      sx={{
        ...glassPanelSx(theme, { accent }),
        overflow: 'hidden',
        '@keyframes scribeIn': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        animation: 'scribeIn .26s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 16,
          right: 16,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${alpha(accent, dark ? 0.8 : 0.5)}, transparent)`,
          pointerEvents: 'none',
        },
      }}
    >
      {/* Header band with a luminous radial glow behind the icon */}
      <Box
        sx={{
          position: 'relative',
          p: 2,
          display: 'flex',
          gap: 1.5,
          alignItems: 'center',
          background: `radial-gradient(120% 140% at 0% 0%, ${alpha(accent, glow)} 0%, transparent 55%)`,
        }}
      >
        <ScribingIcon
          icon={result.icon}
          name={result.skillName}
          size={54}
          abilityId={result.abilityId}
          ring={accent}
        />
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              lineHeight: 1.15,
              fontFamily: 'Space Grotesk, Inter, system-ui',
            }}
            noWrap
          >
            {result.skillName}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
            {result.skillLine && (
              <Chip
                size="small"
                label={result.skillLine}
                sx={{
                  bgcolor: alpha(accent, 0.2),
                  color: accent,
                  fontWeight: 700,
                  height: 20,
                  border: '1px solid',
                  borderColor: alpha(accent, 0.35),
                }}
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
        <MetaChip label="Resource" value={resource.label} dotColor={resource.color} />
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

      {/* Script breakdown — the three inscription lines */}
      <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {SLOT_ORDER.map((slot) => {
          const e = bySlot.get(slot);
          const color = SLOT_COLORS[slot];
          const SlotGlyph = SLOT_ICON[slot];
          return (
            <Box
              key={slot}
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'flex-start',
                p: 1,
                borderRadius: '10px',
                border: '1px solid',
                borderColor: e ? alpha(color, 0.4) : alpha(theme.palette.divider, 0.45),
                borderStyle: e ? 'solid' : 'dashed',
                background: e
                  ? `linear-gradient(90deg, ${alpha(color, dark ? 0.12 : 0.08)}, transparent 80%)`
                  : 'transparent',
                opacity: e ? 1 : 0.65,
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 26,
                  height: 26,
                  flexShrink: 0,
                  borderRadius: '8px',
                  display: 'grid',
                  placeItems: 'center',
                  color: e ? color : 'text.disabled',
                  border: '1px solid',
                  borderColor: e ? alpha(color, 0.5) : alpha(theme.palette.divider, 0.5),
                  bgcolor: e ? alpha(color, dark ? 0.16 : 0.1) : 'transparent',
                  boxShadow: e ? `0 0 10px ${alpha(color, 0.35)}` : 'none',
                  '& svg': { fontSize: 14 },
                }}
              >
                <SlotGlyph />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{ color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}
                >
                  {SLOT_LABELS[slot]}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {e
                    ? e.name
                    : `Choose ${/^[aeiou]/i.test(SLOT_LABELS[slot]) ? 'an' : 'a'} ${SLOT_LABELS[
                        slot
                      ].toLowerCase()} script`}
                </Typography>
                {e && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
                  >
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
          py: 1.25,
          borderTop: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.5),
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
          background: result.isComplete
            ? `linear-gradient(90deg, ${alpha(theme.palette.success.main, dark ? 0.12 : 0.08)}, transparent 70%)`
            : 'transparent',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', textWrap: 'pretty' }}>
            {result.isComplete
              ? 'A complete scribed skill — slot it at the Scribing Altar.'
              : 'The Focus script sets the skill’s final name and cost.'}
          </Typography>
          <Chip
            size="small"
            label={result.isComplete ? 'Complete' : `${filledCount}/3 scripts`}
            color={result.isComplete ? 'success' : 'default'}
            variant="outlined"
            sx={{ ml: 'auto', height: 20, fontWeight: 700, flexShrink: 0 }}
          />
        </Box>
        {result.isComplete && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <InkIcon aria-hidden sx={{ fontSize: 14, color: '#f59e0b', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', textWrap: 'pretty' }}>
              Costs 3 Luminous Ink · Scribing Altar, The Scholarium.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const MetaChip: React.FC<{ label: string; value: string; dotColor?: string }> = ({
  label,
  value,
  dotColor,
}) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        px: 1,
        py: 0.4,
        borderRadius: '8px',
        bgcolor: alpha(theme.palette.text.primary, 0.06),
        display: 'flex',
        gap: 0.6,
        alignItems: 'center',
      }}
    >
      {dotColor && (
        <Box
          aria-hidden
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: dotColor,
            boxShadow: `0 0 6px ${alpha(dotColor, 0.6)}`,
          }}
        />
      )}
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

/**
 * Hero "key": a compact legend introducing the three-rune slot system before the
 * user reaches the pickers. Shown only on md+ as the masthead's right-column
 * anchor (the altar's InscriptionProgress carries the live state on mobile).
 */
export const RuneTriadLegend: React.FC = () => {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.14em', lineHeight: 1 }}
      >
        Three runes, one skill
      </Typography>
      <Stack spacing={0.75}>
        {SLOT_ORDER.map((slot) => {
          const c = SLOT_COLORS[slot];
          const Glyph = SLOT_ICON[slot];
          return (
            <Box key={slot} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                aria-hidden
                sx={{
                  width: 26,
                  height: 26,
                  flexShrink: 0,
                  borderRadius: '8px',
                  display: 'grid',
                  placeItems: 'center',
                  color: c,
                  border: '1px solid',
                  borderColor: alpha(c, 0.55),
                  bgcolor: alpha(c, dark ? 0.16 : 0.1),
                  boxShadow: `0 0 10px ${alpha(c, 0.3)}`,
                  '& svg': { fontSize: 14 },
                }}
              >
                <Glyph />
              </Box>
              <Typography variant="body2" sx={{ color: c, fontWeight: 700 }}>
                {SLOT_LABELS[slot]}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export interface PrimaryScribeActionProps {
  onRandomize: () => void;
  disabled?: boolean;
  sx?: SxProps<Theme>;
}

/** The one prominent CTA: roll a random complete build. */
export const PrimaryScribeAction: React.FC<PrimaryScribeActionProps> = ({
  onRandomize,
  disabled = false,
  sx,
}) => {
  const theme = useTheme();
  return (
    <Button
      variant="contained"
      startIcon={<RandomIcon />}
      onClick={onRandomize}
      disabled={disabled}
      sx={[
        {
          borderRadius: '999px',
          fontWeight: 700,
          px: 3,
          py: 1,
          fontSize: '0.95rem',
          boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
          '&:hover': { boxShadow: `0 10px 28px ${alpha(theme.palette.primary.main, 0.5)}` },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      Surprise me
    </Button>
  );
};

export interface BuildUtilityRailProps {
  onReset: () => void;
  onShare: () => void;
  /** Drives the Share tooltip + icon swap; the button's accessible name stays "Share build". */
  shareLabel: string;
  disabled?: boolean;
}

/** Demoted utility actions (Reset / Share) as a compact, grouped icon rail. */
export const BuildUtilityRail: React.FC<BuildUtilityRailProps> = ({
  onReset,
  onShare,
  shareLabel,
  disabled = false,
}) => {
  const theme = useTheme();
  const copied = shareLabel !== 'Share build';
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        p: 0.5,
        flexShrink: 0,
        borderRadius: '12px',
        border: '1px solid',
        borderColor: alpha(theme.palette.divider, 0.7),
        bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.4 : 0.5),
      }}
    >
      <Tooltip title="Reset scripts" arrow>
        <span>
          <IconButton
            aria-label="Reset scripts"
            onClick={onReset}
            disabled={disabled}
            sx={{ width: 38, height: 38, borderRadius: '9px' }}
          >
            <ResetIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Divider
        orientation="vertical"
        flexItem
        sx={{ my: 0.75, borderColor: alpha(theme.palette.divider, 0.7) }}
      />
      <Tooltip title={shareLabel} arrow>
        <span>
          <IconButton
            aria-label="Share build"
            onClick={onShare}
            disabled={disabled}
            sx={{
              width: 38,
              height: 38,
              borderRadius: '9px',
              color: copied ? 'success.main' : undefined,
            }}
          >
            {copied ? <CheckIcon fontSize="small" /> : <ShareIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

export interface SimulatorControlsProps {
  onRandomize: () => void;
  onReset: () => void;
  onShare: () => void;
  shareLabel: string;
  disabled?: boolean;
}

/** Composed controls (primary + utility rail) — retained for external consumers. */
export const SimulatorControls: React.FC<SimulatorControlsProps> = ({
  onRandomize,
  onReset,
  onShare,
  shareLabel,
  disabled = false,
}) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
    <PrimaryScribeAction onRandomize={onRandomize} disabled={disabled} />
    <BuildUtilityRail
      onReset={onReset}
      onShare={onShare}
      shareLabel={shareLabel}
      disabled={disabled}
    />
  </Stack>
);
