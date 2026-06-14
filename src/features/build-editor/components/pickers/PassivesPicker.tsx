/**
 * PassivesPicker — prop-driven passive ability selector.
 *
 * Displays selected passives as icon tiles and opens a categorized
 * PassivePickerDialog for browsing/searching all available passives.
 * No Redux coupling — receives passives array and calls onChange on change.
 *
 * Props:
 *   passives    — array of passive ability IDs
 *   onChange    — called with the new passives array
 *   esoClass    — build's class (for smart suggestions)
 *   races       — build's races (for smart suggestions)
 *   setupSkills — front/back bar skill slots (for smart suggestions)
 */

import {
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import {
  Box,
  ButtonBase,
  Collapse,
  ListSubheader,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { SkillData } from '../../../../data/types/skill-line-types';
import {
  getPassivesByCategory,
  getSkillById,
  getSkillLineIndex,
  searchPassives,
} from '../../../loadout-manager/data/skillLineSkills';
import type { SkillsConfig } from '../../../loadout-manager/types/loadout.types';
import { ESO_CLASSES } from '../../data/esoStaticData';
import { CLASS_COLOR_MAP } from '../../theme/classColorMap';
import { PickerDialog } from '../primitives/PickerDialog';

// ── Constants ─────────────────────────────────────────────────────────────────

const ICON_URL = 'https://assets.rpglogs.com/img/eso/abilities/';
const TILE_SIZE = 44;
const MIN_SEARCH = 2;
const MAX_RESULTS = 100;

/** Resolve an icon value to a full URL, handling both short names and full URLs. */
const resolveIconUrl = (icon: string): string =>
  icon.startsWith('http') ? icon : `${ICON_URL}${icon}.png`;

const PASSIVE_PICKER_TABS = [
  { label: 'Suggested', category: '__suggested__' },
  { label: 'Class', category: 'class' },
  { label: 'Weapon', category: 'weapon' },
  { label: 'Guild', category: 'guild' },
  { label: 'Alliance', category: 'alliance' },
  { label: 'World', category: 'world' },
  { label: 'Armor', category: 'armor' },
  { label: 'Racial', category: 'racial' },
  { label: 'Craft', category: 'craft' },
] as const;

// ── Passive deduplication helper ──────────────────────────────────────────────

function deduplicatePassives(passives: SkillData[]): SkillData[] {
  const seen = new Map<string, SkillData>();
  for (const p of passives) {
    const key = p.name.toLowerCase();
    if (!seen.has(key)) seen.set(key, p);
  }
  return Array.from(seen.values());
}

// ── Smart suggestion algorithm ────────────────────────────────────────────────

interface SuggestionGroup {
  label: string;
  passives: SkillData[];
}

function getSuggestedPassiveGroups(
  esoClass: string | undefined,
  races: string[] | undefined,
  setupSkills: SkillsConfig | undefined,
): SuggestionGroup[] {
  const lineIndex = getSkillLineIndex();
  const groups: SuggestionGroup[] = [];
  const seenLines = new Set<string>();

  // 1. Class passives — match by broadCategory + className
  if (esoClass) {
    const classLines = lineIndex.filter(
      (l) => l.broadCategory === 'class' && l.className.toLowerCase() === esoClass.toLowerCase(),
    );
    for (const line of classLines) {
      if (seenLines.has(line.name)) continue;
      seenLines.add(line.name);
      const passives = deduplicatePassives(getPassivesByCategory(line.name));
      if (passives.length > 0) groups.push({ label: line.name, passives });
    }
  }

  // 2. Racial passives — match by broadCategory + name
  const race = races?.[0];
  if (race) {
    const raceLine = lineIndex.find(
      (l) => l.broadCategory === 'racial' && l.name.toLowerCase() === race.toLowerCase(),
    );
    if (raceLine && !seenLines.has(raceLine.name)) {
      seenLines.add(raceLine.name);
      const passives = deduplicatePassives(getPassivesByCategory(raceLine.name));
      if (passives.length > 0) groups.push({ label: raceLine.name, passives });
    }
  }

  // 3. Weapon/skill-line passives from slotted active skills on front/back bars
  if (setupSkills) {
    const allSlotIds = [
      ...Object.values(setupSkills[0] ?? {}),
      ...Object.values(setupSkills[1] ?? {}),
    ].filter((id): id is number => typeof id === 'number' && id > 0);

    for (const skillId of allSlotIds) {
      const skill = getSkillById(skillId);
      if (!skill?.category) continue;
      if (seenLines.has(skill.category)) continue;
      const lineInfo = lineIndex.find((l) => l.name === skill.category);
      if (!lineInfo) continue;
      // Skip class/racial — already covered above
      if (lineInfo.broadCategory === 'class' || lineInfo.broadCategory === 'racial') continue;
      seenLines.add(skill.category);
      const passives = deduplicatePassives(getPassivesByCategory(skill.category));
      if (passives.length > 0) groups.push({ label: skill.category, passives });
    }
  }

  return groups;
}

// ── Passive Tile (selected display) ──────────────────────────────────────────

interface PassiveTileProps {
  skill: SkillData | undefined;
  id: number;
  onRemove: () => void;
}

const PassiveTile: React.FC<PassiveTileProps> = ({ skill, id, onRemove }) => {
  const isDark = useTheme().palette.mode === 'dark';

  return (
    <Tooltip
      title={
        skill ? (
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 12 }}>{skill.name}</Typography>
            {skill.category && (
              <Typography sx={{ fontSize: 10, opacity: 0.7 }}>{skill.category}</Typography>
            )}
            {skill.description && (
              <Typography sx={{ fontSize: 10, opacity: 0.75, mt: 0.5, lineHeight: 1.4 }}>
                {skill.description}
              </Typography>
            )}
          </Box>
        ) : (
          `Passive #${id}`
        )
      }
      arrow
      placement="top"
    >
      <Box
        sx={{
          position: 'relative',
          width: TILE_SIZE,
          height: TILE_SIZE,
          borderRadius: '10px',
          overflow: 'hidden',
          flexShrink: 0,
          border: `1.5px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.45)`,
          background: isDark
            ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
            : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.04)',
          boxShadow: isDark ? '0 0 10px rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)' : 'none',
          cursor: 'pointer',
          transition: 'all 150ms',
          '&:hover': {
            transform: 'scale(1.08)',
            borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.7)',
          },
          '&:hover .passive-clear': { opacity: 1 },
        }}
      >
        {skill?.icon ? (
          <img
            src={resolveIconUrl(skill.icon)}
            alt={skill.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
          >
            <Typography
              sx={{
                fontSize: 10,
                fontWeight: 700,
                color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                userSelect: 'none',
              }}
            >
              ?
            </Typography>
          </Box>
        )}

        {/* Clear overlay on hover */}
        <Box
          className="passive-clear"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onRemove();
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
          <CloseIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.90)' }} />
        </Box>
      </Box>
    </Tooltip>
  );
};

// ── Add Passive Tile (dashed "+" button) ─────────────────────────────────────

interface AddPassiveTileProps {
  onClick: () => void;
}

const AddPassiveTile: React.FC<AddPassiveTileProps> = ({ onClick }) => {
  const isDark = useTheme().palette.mode === 'dark';

  return (
    <ButtonBase
      onClick={onClick}
      aria-label="Add passive"
      sx={{
        width: TILE_SIZE,
        height: TILE_SIZE,
        borderRadius: '10px',
        border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
        flexShrink: 0,
        transition: 'all 150ms',
        '&:hover': {
          borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.5)',
          background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
          transform: 'scale(1.08)',
        },
      }}
    >
      <AddIcon
        sx={{ fontSize: 18, color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.20)' }}
      />
    </ButtonBase>
  );
};

// ── Passive Line Section (collapsible, inside dialog) ─────────────────────────

interface PassiveLineSectionProps {
  lineName: string;
  selectedIds: Set<number>;
  onToggle: (skill: SkillData) => void;
  onAddAll?: (ids: number[]) => void;
  defaultExpanded?: boolean;
}

const PassiveLineSection: React.FC<PassiveLineSectionProps> = ({
  lineName,
  selectedIds,
  onToggle,
  onAddAll,
  defaultExpanded = false,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [expanded, setExpanded] = useState(defaultExpanded);

  const passives = useMemo(() => deduplicatePassives(getPassivesByCategory(lineName)), [lineName]);

  if (passives.length === 0) return null;

  const unselectedCount = passives.filter((p) => !selectedIds.has(p.id)).length;

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
          {onAddAll && unselectedCount > 0 && (
            <ButtonBase
              onClick={(e) => {
                e.stopPropagation();
                onAddAll(passives.map((p) => p.id));
              }}
              sx={{
                fontSize: 9,
                fontWeight: 700,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                letterSpacing: 0.4,
                color: 'rgba(56,189,248,0.85)',
                border: '1px solid rgba(56,189,248,0.30)',
                borderRadius: '5px',
                px: 0.75,
                py: '2px',
                lineHeight: 1.5,
                '&:hover': {
                  background: 'rgba(56,189,248,0.10)',
                  color: 'rgba(56,189,248,1)',
                },
              }}
            >
              + Add all
            </ButtonBase>
          )}
          <Typography
            sx={{
              fontSize: 10,
              color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
              fontFamily: 'Space Grotesk',
            }}
          >
            {passives.length}
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
        <Stack spacing={0.25} sx={{ px: 0.5, pb: 1, pt: 0.25 }}>
          {passives.map((p) => {
            const selected = selectedIds.has(p.id);
            const accentRgb = '56,189,248';
            const muted = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.45)';
            return (
              <ButtonBase
                key={p.id}
                onClick={() => onToggle(p)}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.25,
                  py: 0.75,
                  px: 1,
                  borderRadius: 1.75,
                  width: '100%',
                  textAlign: 'left',
                  border: `1px solid ${selected ? `rgba(${accentRgb},0.45)` : 'transparent'}`,
                  background: selected
                    ? isDark
                      ? `rgba(${accentRgb},0.10)`
                      : `rgba(${accentRgb},0.06)`
                    : 'transparent',
                  transition: 'all 150ms',
                  '&:hover': {
                    background: selected
                      ? isDark
                        ? `rgba(${accentRgb},0.14)`
                        : `rgba(${accentRgb},0.09)`
                      : isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.035)',
                  },
                }}
              >
                {/* Icon */}
                {p.icon ? (
                  <img
                    src={resolveIconUrl(p.icon)}
                    alt=""
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      flexShrink: 0,
                      objectFit: 'cover',
                      display: 'block',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '8px',
                      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* Name + description */}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.name}
                    </Typography>
                    {p.maxRank && p.maxRank > 1 && (
                      <Typography
                        component="span"
                        sx={{
                          flexShrink: 0,
                          fontSize: 8.5,
                          fontWeight: 700,
                          color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.30)',
                          lineHeight: 1.4,
                        }}
                      >
                        ×{p.maxRank}
                      </Typography>
                    )}
                  </Stack>
                  {p.description ? (
                    <Typography
                      sx={{
                        fontSize: 10,
                        color: muted,
                        lineHeight: 1.4,
                        mt: 0.25,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }}
                    >
                      {p.description}
                    </Typography>
                  ) : (
                    <Typography
                      sx={{ fontSize: 10, color: muted, lineHeight: 1.4, mt: 0.25, fontStyle: 'italic' }}
                    >
                      Passive ability
                    </Typography>
                  )}
                </Box>

                {/* Selected indicator */}
                {selected && (
                  <Stack
                    direction="row"
                    spacing={0.25}
                    sx={{ alignItems: 'center', flexShrink: 0, color: `rgba(${accentRgb},1)` }}
                  >
                    <CheckIcon sx={{ fontSize: 12 }} />
                    <Typography
                      sx={{
                        fontSize: 8.5,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                      }}
                    >
                      SELECTED
                    </Typography>
                  </Stack>
                )}
              </ButtonBase>
            );
          })}
        </Stack>
      </Collapse>
    </Box>
  );
};

// ── Passive Picker Dialog ─────────────────────────────────────────────────────

interface PassivePickerDialogProps {
  open: boolean;
  onClose: () => void;
  selectedIds: Set<number>;
  onToggle: (skillId: number) => void;
  onAddMany: (ids: number[]) => void;
  esoClass?: string;
  races?: string[];
  setupSkills?: SkillsConfig;
}

const PassivePickerDialog: React.FC<PassivePickerDialogProps> = ({
  open,
  onClose,
  selectedIds,
  onToggle,
  onAddMany,
  esoClass,
  races,
  setupSkills,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');

  const lineIndex = useMemo(() => getSkillLineIndex(), []);

  const linesByTab = useMemo(
    () =>
      PASSIVE_PICKER_TABS.map((tab) => lineIndex.filter((l) => l.broadCategory === tab.category)),
    [lineIndex],
  );

  // Class tab is now at index 1
  const classLinesByClass = useMemo(() => {
    const classLines = linesByTab[1];
    return ESO_CLASSES.map((cls) => ({
      cls,
      lines: classLines.filter((l) => l.className === cls.label),
    })).filter((g) => g.lines.length > 0);
  }, [linesByTab]);

  const suggestedGroups = useMemo(
    () => getSuggestedPassiveGroups(esoClass, races, setupSkills),
    [esoClass, races, setupSkills],
  );

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const searchResults = useMemo(() => {
    if (search.trim().length < MIN_SEARCH) return [];
    return deduplicatePassives(searchPassives(search, MAX_RESULTS));
  }, [search]);

  const isSearching = search.trim().length >= MIN_SEARCH;

  const handleToggle = useCallback(
    (skill: SkillData) => {
      onToggle(skill.id);
    },
    [onToggle],
  );

  const handleAddAll = useCallback(
    (ids: number[]) => {
      onAddMany(ids);
    },
    [onAddMany],
  );

  return (
    <PickerDialog
      open={open}
      onClose={onClose}
      title="Select Passives"
      badge={selectedIds.size > 0 ? `${selectedIds.size} selected` : undefined}
    >
      <PickerDialog.Search
        value={search}
        onChange={setSearch}
        placeholder="Search passives..."
        resultCount={isSearching ? searchResults.length : undefined}
        autoFocus={!isMobile}
      />

      {isSearching ? (
        <PickerDialog.Body empty={searchResults.length === 0} emptyMessage="No passives found">
          <Stack spacing={0.5}>
            {searchResults.map((skill) => {
              const selected = selectedIds.has(skill.id);
              const muted = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.45)';
              const accentRgb = '56,189,248';
              return (
                <ButtonBase
                  key={skill.id}
                  onClick={() => handleToggle(skill)}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.25,
                    py: 0.75,
                    px: 1,
                    borderRadius: 1.75,
                    width: '100%',
                    textAlign: 'left',
                    border: `1px solid ${selected ? `rgba(${accentRgb},0.45)` : 'transparent'}`,
                    background: selected
                      ? isDark
                        ? `rgba(${accentRgb},0.10)`
                        : `rgba(${accentRgb},0.06)`
                      : 'transparent',
                    transition: 'all 150ms',
                    '&:hover': {
                      background: selected
                        ? isDark
                          ? `rgba(${accentRgb},0.14)`
                          : `rgba(${accentRgb},0.09)`
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
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 9,
                        flexShrink: 0,
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                        objectFit: 'cover',
                        display: 'block',
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
                        bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{ alignItems: 'center', minWidth: 0 }}
                    >
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
                          color: muted,
                          border: `1px solid ${alpha(isDark ? '#fff' : '#000', 0.18)}`,
                          borderRadius: '4px',
                          px: 0.5,
                          py: '1px',
                          lineHeight: 1.4,
                        }}
                      >
                        PASSIVE
                      </Box>
                      {skill.maxRank && skill.maxRank > 1 && (
                        <Box
                          component="span"
                          sx={{
                            flexShrink: 0,
                            fontSize: 8.5,
                            fontWeight: 700,
                            letterSpacing: 0.4,
                            fontFamily: 'Space Grotesk, Inter, system-ui',
                            color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.30)',
                            lineHeight: 1.4,
                          }}
                        >
                          ×{skill.maxRank}
                        </Box>
                      )}
                    </Stack>
                    {skill.category && (
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
                        {skill.category}
                      </Typography>
                    )}
                    {skill.description && (
                      <Typography
                        sx={{
                          fontSize: 10,
                          color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)',
                          lineHeight: 1.4,
                          mt: 0.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical' as const,
                          overflow: 'hidden',
                        }}
                      >
                        {skill.description}
                      </Typography>
                    )}
                  </Box>
                  {selected && (
                    <Stack
                      direction="row"
                      spacing={0.25}
                      sx={{
                        alignItems: 'center',
                        flexShrink: 0,
                        color: `rgba(${accentRgb},1)`,
                      }}
                    >
                      <CheckIcon sx={{ fontSize: 12 }} />
                      <Typography
                        sx={{
                          fontSize: 8.5,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          fontFamily: 'Space Grotesk, Inter, system-ui',
                        }}
                      >
                        SELECTED
                      </Typography>
                    </Stack>
                  )}
                </ButtonBase>
              );
            })}
          </Stack>
        </PickerDialog.Body>
      ) : (
        <>
          {/* Browse mode: category tabs + skill lines */}
          <PickerDialog.Tabs>
            {PASSIVE_PICKER_TABS.map((tab, idx) => (
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
          </PickerDialog.Tabs>

          <PickerDialog.Body>
            {activeTab === 0 ? (
              // Suggested tab
              suggestedGroups.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    py: 5,
                    color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                  }}
                >
                  <LightbulbIcon sx={{ fontSize: 32, opacity: 0.4 }} />
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      textAlign: 'center',
                      maxWidth: 220,
                      lineHeight: 1.5,
                    }}
                  >
                    Set your class, race, and skill bar to get smart passive suggestions
                  </Typography>
                </Box>
              ) : (
                suggestedGroups.map((group) => (
                  <PassiveLineSection
                    key={group.label}
                    lineName={group.label}
                    selectedIds={selectedIds}
                    onToggle={handleToggle}
                    onAddAll={handleAddAll}
                    defaultExpanded
                  />
                ))
              )
            ) : activeTab === 1 ? (
              // Class tab
              classLinesByClass.map(({ cls, lines }) => {
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
                      <PassiveLineSection
                        key={line.name}
                        lineName={line.name}
                        selectedIds={selectedIds}
                        onToggle={handleToggle}
                      />
                    ))}
                  </Box>
                );
              })
            ) : (
              // All other category tabs
              linesByTab[activeTab].map((line) => (
                <PassiveLineSection
                  key={line.name}
                  lineName={line.name}
                  selectedIds={selectedIds}
                  onToggle={handleToggle}
                />
              ))
            )}
          </PickerDialog.Body>
        </>
      )}
    </PickerDialog>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export interface PassivesPickerProps {
  passives: number[];
  onChange: (passives: number[]) => void;
  esoClass?: string;
  races?: string[];
  setupSkills?: SkillsConfig;
}

export const PassivesPicker: React.FC<PassivesPickerProps> = ({
  passives,
  onChange,
  esoClass,
  races,
  setupSkills,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedIds = useMemo(() => new Set(passives), [passives]);

  const handleToggle = useCallback(
    (skillId: number) => {
      if (selectedIds.has(skillId)) {
        onChange(passives.filter((id) => id !== skillId));
      } else {
        onChange([...passives, skillId]);
      }
    },
    [passives, selectedIds, onChange],
  );

  const handleAddMany = useCallback(
    (ids: number[]) => {
      const toAdd = ids.filter((id) => !selectedIds.has(id));
      if (toAdd.length > 0) onChange([...passives, ...toAdd]);
    },
    [passives, selectedIds, onChange],
  );

  return (
    <>
      <Stack spacing={1.5}>
        {/* Header */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              fontFamily: 'Space Grotesk, Inter, system-ui',
              color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.50)',
            }}
          >
            Selected Passives ({passives.length})
          </Typography>
        </Stack>

        {/* Selected passives grid + add tile */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {passives.map((id) => {
            const skill = getSkillById(id);
            return <PassiveTile key={id} skill={skill} id={id} onRemove={() => handleToggle(id)} />;
          })}
          <AddPassiveTile onClick={() => setDialogOpen(true)} />
        </Box>

        {/* Glass empty state */}
        {passives.length === 0 && (
          <Box
            sx={{
              color: 'text.disabled',
              textAlign: 'center',
              py: 2,
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
              border: `1px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 3,
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontStyle: 'italic' }}
            >
              Click + to browse and add passives
            </Typography>
          </Box>
        )}
      </Stack>

      <PassivePickerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        selectedIds={selectedIds}
        onToggle={handleToggle}
        onAddMany={handleAddMany}
        esoClass={esoClass}
        races={races}
        setupSkills={setupSkills}
      />
    </>
  );
};
