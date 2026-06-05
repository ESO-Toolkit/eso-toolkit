/**
 * SkillBarPicker — prop-driven version of SkillsSection.
 *
 * Renders two ESO skill bars (front + back) with a shared skill-picker dialog.
 * No Redux coupling — takes skills via props and calls onChange on mutation.
 * SkillsSection wraps this with useSelector / dispatch.
 */

import {
  CheckCircleRounded as CheckCircleIcon,
  Close as CloseIcon,
  ExpandMore as ExpandIcon,
  FilterList as FilterListIcon,
  InfoOutlined as InfoIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Box,
  ButtonBase,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  ListSubheader,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { SkillData } from '../../../../data/types/skill-line-types';
import {
  getSkillById,
  getSkillLineIndex,
  getSkillsByCategory,
  preloadSkillData,
  searchSkills,
} from '../../../loadout-manager/data/skillLineSkills';
import type { SkillsConfig } from '../../../loadout-manager/types/loadout.types';
import { CLASS_SKILL_LINES, ESO_CLASSES } from '../../data/esoStaticData';
import { CLASS_COLOR_MAP } from '../../theme/classColorMap';

// ── Constants ───────────────────────────────────────────────────────────────

const SKILL_SLOTS = [3, 4, 5, 6, 7];
const ULTIMATE_SLOT = 8;
const ALL_SLOTS = [...SKILL_SLOTS, ULTIMATE_SLOT];
const MIN_SEARCH = 2;
const MAX_RESULTS = 100;

const TILE_SIZE = 58;
const ULT_SIZE = 66;

const SLOT_LABELS: Record<number, string> = {
  3: '1',
  4: '2',
  5: '3',
  6: '4',
  7: '5',
  8: 'U',
};

const ICON_URL = 'https://assets.rpglogs.com/img/eso/abilities/';

/** Resolve an icon value to a full URL, handling both short names and full URLs. */
const resolveIconUrl = (icon: string): string =>
  icon.startsWith('http') ? icon : `${ICON_URL}${icon}.png`;

const countFilled = (bar: Record<number, number>): number =>
  ALL_SLOTS.filter((s) => bar[s] !== undefined && bar[s] > 0).length;

// ── Picker Types & Helpers ──────────────────────────────────────────────────

interface SkillGroup {
  base: SkillData;
  morphs: SkillData[];
}

/** Resolve the base ability id for a skill, falling back to its own id. */
const getBaseId = (s: SkillData): number => s.baseSkillId ?? s.baseAbilityId ?? s.id;

/** A skill is a morph when it points at a base ability other than itself. */
const isMorphSkill = (s: SkillData): boolean => getBaseId(s) !== s.id;

/** Collapse whitespace/newlines into a single-line summary for inline display. */
const summarizeDescription = (desc?: string): string =>
  desc ? desc.replace(/\s+/g, ' ').trim() : '';

const PICKER_TABS = [
  { label: 'Class', category: 'class' },
  { label: 'Weapon', category: 'weapon' },
  { label: 'Guild', category: 'guild' },
  { label: 'Alliance', category: 'alliance' },
  { label: 'World', category: 'world' },
] as const;

function groupSkillsByBase(skills: SkillData[]): SkillGroup[] {
  const map = new Map<number, { base?: SkillData; morphs: SkillData[] }>();
  for (const skill of skills) {
    const baseId = skill.baseSkillId ?? skill.baseAbilityId ?? skill.id;
    if (!map.has(baseId)) map.set(baseId, { morphs: [] });
    const g = map.get(baseId)!;
    if (skill.id === baseId) g.base = skill;
    else g.morphs.push(skill);
  }
  const result: SkillGroup[] = [];
  for (const g of map.values()) {
    if (g.base) result.push({ base: g.base, morphs: g.morphs });
    else if (g.morphs.length > 0) result.push({ base: g.morphs[0], morphs: g.morphs.slice(1) });
  }
  return result;
}

// ── Picker Skill Option Row ──────────────────────────────────────────────────

interface SkillOptionRowProps {
  skill: SkillData;
  onSelect: (skill: SkillData) => void;
  /** Whether this option is a morph (vs. the base ability). */
  isMorph: boolean;
  /** Whether this skill is the one currently slotted for the target slot. */
  isCurrent?: boolean;
  /** Slightly indent + lighten morph rows so they read as children of the base. */
  indented?: boolean;
}

/**
 * A fully-labeled, selectable skill option. Shows the icon alongside the skill
 * name, a BASE/MORPH badge, a "slotted" marker, and a one-line description so
 * users never have to identify a morph from its icon alone. An info button
 * opens the complete tooltip text (tooltips are unreliable on touch devices).
 */
const SkillOptionRow: React.FC<SkillOptionRowProps> = ({
  skill,
  onSelect,
  isMorph,
  isCurrent = false,
  indented = false,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const isUlt = skill.isUltimate;
  const accentRgb = isUlt ? '255,179,0' : '56,189,248';
  const [infoEl, setInfoEl] = useState<HTMLElement | null>(null);

  const summary = summarizeDescription(skill.description);
  const muted = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.45)';

  const badgeColor = isMorph
    ? isDark
      ? '#7dd3fc'
      : '#0284c7'
    : isDark
      ? 'rgba(255,255,255,0.55)'
      : 'rgba(0,0,0,0.50)';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
      <ButtonBase
        onClick={() => onSelect(skill)}
        aria-label={`${skill.name}${isMorph ? ' (morph)' : ' (base ability)'}${
          isCurrent ? ' — currently slotted' : ''
        }`}
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          py: 0.75,
          px: 1,
          borderRadius: 1.75,
          textAlign: 'left',
          border: `1px solid ${isCurrent ? `rgba(${accentRgb},0.55)` : 'transparent'}`,
          background: isCurrent ? `rgba(${accentRgb},${isDark ? 0.14 : 0.08})` : 'transparent',
          transition: 'all 150ms',
          '&:hover': {
            background: isCurrent
              ? `rgba(${accentRgb},${isDark ? 0.18 : 0.11})`
              : isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.035)',
          },
        }}
      >
        {skill.icon ? (
          <img
            src={resolveIconUrl(skill.icon)}
            alt=""
            loading="lazy"
            style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              flexShrink: 0,
              objectFit: 'cover',
              display: 'block',
              opacity: indented ? 0.96 : 1,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '9px',
              flexShrink: 0,
              bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }}
          />
        )}

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {skill.name}
            </Typography>
            <Box
              component="span"
              sx={{
                flexShrink: 0,
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: 0.6,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                color: badgeColor,
                border: `1px solid ${alpha(badgeColor, 0.4)}`,
                borderRadius: '4px',
                px: 0.5,
                py: '1px',
                lineHeight: 1.4,
              }}
            >
              {isMorph ? 'MORPH' : 'BASE'}
            </Box>
            {isCurrent && (
              <Stack
                direction="row"
                spacing={0.25}
                sx={{ alignItems: 'center', flexShrink: 0, color: `rgba(${accentRgb},1)` }}
              >
                <CheckCircleIcon sx={{ fontSize: 12 }} />
                <Typography
                  sx={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                  }}
                >
                  SLOTTED
                </Typography>
              </Stack>
            )}
          </Stack>
          {summary && (
            <Typography
              sx={{
                fontSize: 10.5,
                color: muted,
                lineHeight: 1.35,
                mt: 0.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {summary}
            </Typography>
          )}
        </Box>
      </ButtonBase>

      {skill.description && (
        <>
          <IconButton
            size="small"
            aria-label={`More about ${skill.name}`}
            onClick={(e) => setInfoEl(e.currentTarget)}
            sx={{
              flexShrink: 0,
              color: infoEl
                ? `rgba(${accentRgb},1)`
                : isDark
                  ? 'rgba(255,255,255,0.35)'
                  : 'rgba(0,0,0,0.30)',
              '&:hover': { color: `rgba(${accentRgb},1)` },
            }}
          >
            <InfoIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Popover
            open={Boolean(infoEl)}
            anchorEl={infoEl}
            onClose={() => setInfoEl(null)}
            anchorOrigin={{ vertical: 'center', horizontal: 'left' }}
            transformOrigin={{ vertical: 'center', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: {
                  maxWidth: 300,
                  p: 1.5,
                  borderRadius: '12px',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                  background: isDark ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.98)',
                  backdropFilter: 'blur(12px)',
                },
              },
            }}
          >
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.75 }}>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                }}
              >
                {skill.name}
              </Typography>
              <Box
                component="span"
                sx={{
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  color: badgeColor,
                  border: `1px solid ${alpha(badgeColor, 0.4)}`,
                  borderRadius: '4px',
                  px: 0.5,
                  py: '1px',
                }}
              >
                {isMorph ? 'MORPH' : 'BASE'}
              </Box>
            </Stack>
            {skill.category && (
              <Typography
                sx={{
                  fontSize: 10,
                  color: muted,
                  mb: 0.5,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                }}
              >
                {skill.category}
                {skill.isUltimate ? ' · Ultimate' : ''}
              </Typography>
            )}
            <Typography
              sx={{
                fontSize: 11.5,
                lineHeight: 1.5,
                color: isDark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.72)',
                whiteSpace: 'pre-line',
              }}
            >
              {skill.description}
            </Typography>
          </Popover>
        </>
      )}
    </Box>
  );
};

// ── Skill Line Section (collapsible) ────────────────────────────────────────

interface SkillLineSectionProps {
  lineName: string;
  isUltimate: boolean;
  onSelect: (skill: SkillData) => void;
  defaultExpanded?: boolean;
  /** Ability id currently slotted in the target slot, for highlighting. */
  currentAbilityId?: number;
}

const SkillLineSection: React.FC<SkillLineSectionProps> = ({
  lineName,
  isUltimate,
  onSelect,
  defaultExpanded = false,
  currentAbilityId,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [expanded, setExpanded] = useState(defaultExpanded);

  const skills = useMemo(() => getSkillsByCategory(lineName), [lineName]);
  const filtered = useMemo(
    () => skills.filter((s) => (isUltimate ? s.isUltimate : !s.isUltimate)),
    [skills, isUltimate],
  );
  const groups = useMemo(() => groupSkillsByBase(filtered), [filtered]);

  if (groups.length === 0) return null;

  return (
    <Box>
      <ButtonBase
        onClick={() => setExpanded(!expanded)}
        sx={{
          width: '100%',
          py: 0.75,
          px: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 1.5,
          '&:hover': {
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          },
        }}
      >
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: isDark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.75)',
          }}
        >
          {lineName}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Typography
            sx={{
              fontSize: 10,
              color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
              fontFamily: 'Space Grotesk',
            }}
          >
            {groups.length}
          </Typography>
          <ExpandIcon
            sx={{
              fontSize: 16,
              transition: 'transform 0.2s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
            }}
          />
        </Stack>
      </ButtonBase>

      <Collapse in={expanded} unmountOnExit>
        <Stack spacing={1.5} sx={{ pl: 1, pr: 0.5, pb: 1.5, pt: 0.5 }}>
          {groups.map((group) => (
            <Box key={group.base.id}>
              <SkillOptionRow
                skill={group.base}
                onSelect={onSelect}
                isMorph={isMorphSkill(group.base)}
                isCurrent={group.base.id === currentAbilityId}
              />
              {group.morphs.length > 0 && (
                <Stack
                  spacing={0.25}
                  sx={{
                    ml: 2.5,
                    pl: 1,
                    mt: 0.25,
                    borderLeft: `1.5px solid ${
                      isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'
                    }`,
                  }}
                >
                  {group.morphs.map((m) => (
                    <SkillOptionRow
                      key={m.id}
                      skill={m}
                      onSelect={onSelect}
                      isMorph
                      indented
                      isCurrent={m.id === currentAbilityId}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
};

// ── Skill Picker Dialog ─────────────────────────────────────────────────────

interface SkillPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (skill: SkillData) => void;
  isUltimate: boolean;
  slotLabel: string;
  selectedClassLineIds: readonly (string | null)[];
  /** Ability id currently slotted in the target slot, for highlighting. */
  currentAbilityId?: number;
}

const SkillPickerDialog: React.FC<SkillPickerDialogProps> = ({
  open,
  onClose,
  onSelect,
  isUltimate,
  slotLabel,
  selectedClassLineIds,
  currentAbilityId,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');

  const lineIndex = useMemo(() => getSkillLineIndex(), []);

  const linesByTab = useMemo(
    () => PICKER_TABS.map((tab) => lineIndex.filter((l) => l.broadCategory === tab.category)),
    [lineIndex],
  );

  const classLinesByClass = useMemo(() => {
    const classLines = linesByTab[0];
    return ESO_CLASSES.map((cls) => ({
      cls,
      lines: classLines.filter((l) => l.className === cls.label),
    })).filter((g) => g.lines.length > 0);
  }, [linesByTab]);

  const selectedLineNames = useMemo(() => {
    const names = new Set<string>();
    for (const id of selectedClassLineIds) {
      if (!id) continue;
      const def = CLASS_SKILL_LINES.find((l) => l.id === id);
      if (def) names.add(def.label);
    }
    return names;
  }, [selectedClassLineIds]);

  const hasSelectedLines = selectedLineNames.size > 0;

  const [myBuildOnly, setMyBuildOnly] = useState(hasSelectedLines);

  useEffect(() => {
    if (open) {
      setSearch('');
      setMyBuildOnly(hasSelectedLines);
    }
  }, [open, hasSelectedLines]);

  const filteredClassLinesByClass = useMemo(() => {
    if (!myBuildOnly || selectedLineNames.size === 0) return classLinesByClass;
    return classLinesByClass
      .map(({ cls, lines }) => ({
        cls,
        lines: lines.filter((l) => selectedLineNames.has(l.name)),
      }))
      .filter(({ lines }) => lines.length > 0);
  }, [myBuildOnly, selectedLineNames, classLinesByClass]);

  const searchResults = useMemo(() => {
    if (search.trim().length < MIN_SEARCH) return [];
    return searchSkills(search, MAX_RESULTS).filter((s) =>
      isUltimate ? s.isUltimate : !s.isUltimate,
    );
  }, [search, isUltimate]);

  const isSearching = search.trim().length >= MIN_SEARCH;

  const handleSelect = useCallback(
    (skill: SkillData) => {
      onSelect(skill);
      setSearch('');
    },
    [onSelect],
  );

  const handleClose = useCallback(() => {
    onClose();
    setSearch('');
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      className="glass-dialog"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '20px',
            background: isDark
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
            backgroundColor: 'transparent',
            border: isDark ? '1px solid #1f2937' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.25)' : '0 4px 12px rgba(15,23,42,0.06)',
            maxHeight: '90vh',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontFamily: 'Space Grotesk, Inter, system-ui',
          fontSize: '1rem',
          pb: 1,
          background: isDark
            ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
            : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {isUltimate ? 'Assign Ultimate' : `Assign Skill \u00b7 Slot ${slotLabel}`}
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ px: 2, pb: 1.5 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills..."
            size="small"
            fullWidth
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, opacity: 0.4 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderRadius: 2,
                fontSize: 13,
              },
            }}
          />
        </Box>

        {isSearching ? (
          <Box sx={{ px: 2, pb: 2, maxHeight: 400, overflowY: 'auto' }}>
            {searchResults.length === 0 ? (
              <Typography
                sx={{
                  fontSize: 12,
                  color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                  textAlign: 'center',
                  py: 3,
                }}
              >
                No {isUltimate ? 'ultimates' : 'skills'} found
              </Typography>
            ) : (
              <Stack spacing={0.25}>
                {searchResults.map((skill) => (
                  <SkillOptionRow
                    key={skill.id}
                    skill={skill}
                    onSelect={handleSelect}
                    isMorph={isMorphSkill(skill)}
                    isCurrent={skill.id === currentAbilityId}
                  />
                ))}
              </Stack>
            )}
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 2,
                pb: 1.5,
                overflowX: 'auto',
              }}
            >
              {PICKER_TABS.map((tab, idx) => (
                <ButtonBase
                  key={tab.category}
                  onClick={() => setActiveTab(idx)}
                  sx={{
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 1.5,
                    fontSize: 11,
                    fontWeight: activeTab === idx ? 700 : 500,
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    letterSpacing: 0.3,
                    flexShrink: 0,
                    color:
                      activeTab === idx
                        ? isDark
                          ? '#fff'
                          : '#0f172a'
                        : isDark
                          ? 'rgba(255,255,255,0.45)'
                          : 'rgba(0,0,0,0.45)',
                    background:
                      activeTab === idx
                        ? isDark
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(0,0,0,0.06)'
                        : 'transparent',
                    border: `1px solid ${
                      activeTab === idx
                        ? isDark
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(0,0,0,0.10)'
                        : 'transparent'
                    }`,
                    transition: 'all 0.15s',
                    '&:hover': {
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    },
                  }}
                >
                  {tab.label}
                </ButtonBase>
              ))}

              {activeTab === 0 && hasSelectedLines && (
                <>
                  <Box sx={{ flex: 1, minWidth: 4 }} />
                  <Tooltip
                    title={
                      myBuildOnly
                        ? 'Showing your 3 selected class lines · click to show all'
                        : 'Show only your selected class lines'
                    }
                    arrow
                    placement="top"
                  >
                    <ButtonBase
                      onClick={() => setMyBuildOnly((v) => !v)}
                      aria-pressed={myBuildOnly}
                      sx={{
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 1.5,
                        fontSize: 11,
                        fontWeight: myBuildOnly ? 700 : 500,
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                        letterSpacing: 0.3,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.4,
                        color: myBuildOnly
                          ? isDark
                            ? '#38bdf8'
                            : '#0284c7'
                          : isDark
                            ? 'rgba(255,255,255,0.40)'
                            : 'rgba(0,0,0,0.40)',
                        background: myBuildOnly
                          ? isDark
                            ? 'rgba(56,189,248,0.10)'
                            : 'rgba(2,132,199,0.06)'
                          : 'transparent',
                        border: `1px solid ${
                          myBuildOnly
                            ? isDark
                              ? 'rgba(56,189,248,0.28)'
                              : 'rgba(2,132,199,0.22)'
                            : 'transparent'
                        }`,
                        transition: 'all 0.15s',
                        '&:hover': {
                          background: myBuildOnly
                            ? isDark
                              ? 'rgba(56,189,248,0.16)'
                              : 'rgba(2,132,199,0.10)'
                            : isDark
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(0,0,0,0.04)',
                        },
                      }}
                    >
                      <FilterListIcon sx={{ fontSize: 12 }} />
                      My Lines
                    </ButtonBase>
                  </Tooltip>
                </>
              )}
            </Box>

            <Box sx={{ maxHeight: 400, overflowY: 'auto', px: 1, pb: 1 }}>
              {activeTab === 0
                ? filteredClassLinesByClass.map(({ cls, lines }) => {
                    const clsColor = CLASS_COLOR_MAP[cls.id].accent;
                    return (
                      <Box key={cls.id}>
                        <ListSubheader
                          disableSticky
                          sx={{
                            fontSize: 9,
                            fontWeight: 700,
                            fontFamily: 'Space Grotesk, Inter, system-ui',
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                            color: clsColor,
                            lineHeight: '28px',
                            background: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: clsColor,
                              boxShadow: `0 0 5px ${alpha(clsColor, 0.6)}`,
                              flexShrink: 0,
                            }}
                          />
                          {cls.label}
                        </ListSubheader>
                        {lines.map((line) => (
                          <SkillLineSection
                            key={line.name}
                            lineName={line.name}
                            isUltimate={isUltimate}
                            onSelect={handleSelect}
                            defaultExpanded={myBuildOnly && selectedLineNames.has(line.name)}
                            currentAbilityId={currentAbilityId}
                          />
                        ))}
                      </Box>
                    );
                  })
                : linesByTab[activeTab].map((line) => (
                    <SkillLineSection
                      key={line.name}
                      lineName={line.name}
                      isUltimate={isUltimate}
                      onSelect={handleSelect}
                      currentAbilityId={currentAbilityId}
                    />
                  ))}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ── Skill Slot Tile ─────────────────────────────────────────────────────────

interface SkillSlotTileProps {
  slotIndex: number;
  abilityId: number | undefined;
  onOpenPicker: () => void;
  onRemove: () => void;
}

const SkillSlotTile: React.FC<SkillSlotTileProps> = ({
  slotIndex,
  abilityId,
  onOpenPicker,
  onRemove,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const isUlt = slotIndex === ULTIMATE_SLOT;
  preloadSkillData();
  const skill = abilityId ? getSkillById(abilityId) : null;
  const size = isUlt ? ULT_SIZE : TILE_SIZE;
  const label = SLOT_LABELS[slotIndex] ?? String(slotIndex);

  const accentA = (a: number): string =>
    isUlt ? `rgba(255,179,0,${a})` : `rgba(var(--be-accent-rgb, 56,189,248),${a})`;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        flex: isUlt ? undefined : 1,
        maxWidth: isUlt ? ULT_SIZE : TILE_SIZE + 16,
        minWidth: isUlt ? ULT_SIZE : TILE_SIZE,
      }}
    >
      <Tooltip
        title={
          skill
            ? `${skill.name}${skill.category ? ` \u00b7 ${skill.category}` : ''}`
            : `Slot ${label}${isUlt ? ' (Ultimate)' : ''} \u2014 click to assign`
        }
        arrow
        placement="top"
      >
        <Box
          role="button"
          tabIndex={0}
          aria-label={
            skill
              ? `${isUlt ? 'Ultimate' : `Skill slot ${label}`}: ${skill.name} — click to change`
              : `${isUlt ? 'Ultimate slot' : `Skill slot ${label}`} — click to assign`
          }
          onClick={onOpenPicker}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenPicker();
            }
          }}
          sx={{
            position: 'relative',
            width: size,
            height: size,
            borderRadius: isUlt ? '14px' : '12px',
            cursor: 'pointer',
            overflow: 'hidden',
            flexShrink: 0,
            border: `${isUlt ? 2 : 1.5}px solid ${
              skill ? accentA(0.45) : isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'
            }`,
            background: skill
              ? isDark
                ? accentA(0.08)
                : accentA(0.04)
              : isDark
                ? 'rgba(255,255,255,0.025)'
                : 'rgba(0,0,0,0.015)',
            boxShadow: skill
              ? isDark
                ? `0 0 14px ${accentA(0.12)}, inset 0 1px 0 rgba(255,255,255,0.04)`
                : 'inset 0 1px 0 rgba(255,255,255,0.5)'
              : isDark
                ? 'inset 0 1px 0 rgba(255,255,255,0.025)'
                : 'inset 0 1px 0 rgba(255,255,255,0.4)',
            transition: 'all 180ms ease',
            '&:focus-visible': {
              outline: '2px solid var(--be-accent, #38bdf8)',
              outlineOffset: '2px',
            },
            '&:hover': {
              transform: 'scale(1.08)',
              borderColor: accentA(0.7),
              background: isDark ? accentA(0.14) : accentA(0.08),
              boxShadow: isDark
                ? `0 6px 20px rgba(0,0,0,0.30), 0 0 18px ${accentA(0.16)}`
                : '0 6px 16px rgba(0,0,0,0.08)',
            },
            '&:hover .skill-clear': { opacity: 1 },
            // Always show clear on touch devices
            '@media (hover: none)': {
              '& .skill-clear': { opacity: skill ? 1 : 0 },
            },
          }}
        >
          {skill?.icon ? (
            <img
              src={resolveIconUrl(skill.icon)}
              alt={skill.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <Typography
                sx={{
                  fontSize: isUlt ? 16 : 13,
                  fontWeight: 800,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  letterSpacing: 0.4,
                  color: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.13)',
                  lineHeight: 1,
                  userSelect: 'none',
                }}
              >
                {label}
              </Typography>
            </Box>
          )}

          {skill && (
            <Box
              className="skill-clear"
              role="button"
              aria-label={`Remove ${skill.name}`}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onRemove();
              }}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove();
                }
              }}
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.60)',
                opacity: 0,
                transition: 'opacity 150ms',
                cursor: 'pointer',
              }}
            >
              <CloseIcon sx={{ fontSize: isUlt ? 22 : 17, color: 'rgba(255,255,255,0.90)' }} />
            </Box>
          )}
        </Box>
      </Tooltip>

      {skill && (
        <Typography
          sx={{
            fontSize: '0.58rem',
            fontWeight: 600,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: isDark ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.45)',
            lineHeight: 1.15,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
            maxWidth: size + 8,
            userSelect: 'none',
          }}
        >
          {skill.name}
        </Typography>
      )}
    </Box>
  );
};

// ── Skill Bar ───────────────────────────────────────────────────────────────

interface SkillBarProps {
  label: string;
  bar: Record<number, number>;
  onOpenPicker: (slotIndex: number) => void;
  onRemove: (slotIndex: number) => void;
}

const SkillBarRow: React.FC<SkillBarProps> = ({ label, bar, onOpenPicker, onRemove }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const filled = countFilled(bar);

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5, px: 0.5 }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            fontSize: '0.65rem',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            background: isDark
              ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            px: 0.75,
            py: 0.15,
            borderRadius: '999px',
            bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.62rem',
              fontWeight: 600,
              fontFamily: 'Space Grotesk',
            }}
          >
            {filled} / 6
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: { xs: 0.75, sm: 1.25 },
          py: 1.5,
          px: 1.5,
          borderRadius: 3,
          background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          rowGap: 1,
        }}
      >
        {SKILL_SLOTS.map((slot) => (
          <SkillSlotTile
            key={slot}
            slotIndex={slot}
            abilityId={bar[slot]}
            onOpenPicker={() => onOpenPicker(slot)}
            onRemove={() => onRemove(slot)}
          />
        ))}

        <Box
          sx={{
            width: 1.5,
            height: ULT_SIZE * 0.7,
            borderRadius: 1,
            flexShrink: 0,
            alignSelf: 'center',
            background: isDark
              ? 'linear-gradient(180deg, transparent 0%, rgba(255,179,0, 0.40) 50%, transparent 100%)'
              : 'linear-gradient(180deg, transparent 0%, rgba(255,179,0, 0.25) 50%, transparent 100%)',
          }}
        />

        <SkillSlotTile
          slotIndex={ULTIMATE_SLOT}
          abilityId={bar[ULTIMATE_SLOT]}
          onOpenPicker={() => onOpenPicker(ULTIMATE_SLOT)}
          onRemove={() => onRemove(ULTIMATE_SLOT)}
        />
      </Box>
    </Box>
  );
};

// ── Public Props ────────────────────────────────────────────────────────────

export interface SkillBarPickerProps {
  skills: SkillsConfig;
  selectedClassLineIds: readonly (string | null)[];
  onChange: (updated: SkillsConfig) => void;
}

// ── Main ────────────────────────────────────────────────────────────────────

export const SkillBarPicker: React.FC<SkillBarPickerProps> = ({
  skills,
  selectedClassLineIds,
  onChange,
}) => {
  const isDark = useTheme().palette.mode === 'dark';

  const [picker, setPicker] = useState<{
    open: boolean;
    barIndex: 0 | 1;
    slotIndex: number;
  }>({ open: false, barIndex: 0, slotIndex: 3 });

  const handleSelect = useCallback(
    (barIndex: 0 | 1, slotIndex: number, abilityId: number): void => {
      onChange({
        ...skills,
        [barIndex]: { ...skills[barIndex], [slotIndex]: abilityId },
      });
    },
    [onChange, skills],
  );

  const handleRemove = useCallback(
    (barIndex: 0 | 1, slotIndex: number): void => {
      const bar = { ...skills[barIndex] };
      delete bar[slotIndex];
      onChange({ ...skills, [barIndex]: bar });
    },
    [onChange, skills],
  );

  const handlePickerSelect = useCallback(
    (skill: SkillData) => {
      handleSelect(picker.barIndex, picker.slotIndex, skill.id);
      setPicker((prev) => ({ ...prev, open: false }));
    },
    [handleSelect, picker.barIndex, picker.slotIndex],
  );

  return (
    <>
      <Stack spacing={2.5} sx={{ height: '100%' }}>
        <SkillBarRow
          label="Front Bar"
          bar={skills[0] ?? {}}
          onOpenPicker={(slotIndex) => setPicker({ open: true, barIndex: 0, slotIndex })}
          onRemove={(slotIndex) => handleRemove(0, slotIndex)}
        />

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 0.5 }}>
          <Box
            sx={{
              flex: 1,
              height: 1,
              background: isDark
                ? 'linear-gradient(90deg, transparent 0%, rgba(var(--be-accent-rgb, 56,189,248), 0.20) 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(var(--be-accent-rgb, 56,189,248), 0.12) 100%)',
            }}
          />
          <Typography
            sx={{
              fontSize: '0.56rem',
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: 'uppercase',
              fontFamily: 'Space Grotesk, Inter, system-ui',
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.30)',
              flexShrink: 0,
              userSelect: 'none',
            }}
          >
            weapon swap
          </Typography>
          <Box
            sx={{
              flex: 1,
              height: 1,
              background: isDark
                ? 'linear-gradient(90deg, rgba(var(--be-accent-rgb, 56,189,248), 0.20) 0%, transparent 100%)'
                : 'linear-gradient(90deg, rgba(var(--be-accent-rgb, 56,189,248), 0.12) 0%, transparent 100%)',
            }}
          />
        </Stack>

        <SkillBarRow
          label="Back Bar"
          bar={skills[1] ?? {}}
          onOpenPicker={(slotIndex) => setPicker({ open: true, barIndex: 1, slotIndex })}
          onRemove={(slotIndex) => handleRemove(1, slotIndex)}
        />
      </Stack>

      <SkillPickerDialog
        open={picker.open}
        onClose={() => setPicker((prev) => ({ ...prev, open: false }))}
        onSelect={handlePickerSelect}
        isUltimate={picker.slotIndex === ULTIMATE_SLOT}
        slotLabel={SLOT_LABELS[picker.slotIndex] ?? String(picker.slotIndex)}
        selectedClassLineIds={selectedClassLineIds}
        currentAbilityId={skills[picker.barIndex]?.[picker.slotIndex]}
      />
    </>
  );
};
