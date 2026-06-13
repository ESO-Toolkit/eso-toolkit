/**
 * PassivesPicker — prop-driven passive ability selector.
 *
 * Displays selected passives as icon tiles and opens a categorized
 * PassivePickerDialog for browsing/searching all available passives.
 * No Redux coupling — receives passives array and calls onChange on change.
 *
 * Props:
 *   passives  — array of passive ability IDs
 *   onChange  — called with the new passives array
 */

import {
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandIcon,
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

// ── Picker Tile (inside dialog — multi-select) ────────────────────────────────

interface PickerPassiveTileProps {
  skill: SkillData;
  isSelected: boolean;
  onToggle: (skill: SkillData) => void;
}

const PickerPassiveTile: React.FC<PickerPassiveTileProps> = ({ skill, isSelected, onToggle }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const accent = 'rgba(var(--be-accent-rgb, 56, 189, 248),';

  return (
    <ButtonBase
      onClick={() => onToggle(skill)}
      aria-label={`${skill.name}${isSelected ? ' (selected)' : ''}`}
      aria-pressed={isSelected}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        p: 0.5,
        borderRadius: '12px',
        border: `1.5px solid ${
          isSelected ? `${accent}0.55)` : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
        }`,
        background: isSelected
          ? `${accent}0.10)`
          : isDark
            ? 'rgba(255,255,255,0.02)'
            : 'rgba(0,0,0,0.015)',
        transition: 'all 150ms',
        width: 60,
        '&:hover': {
          borderColor: `${accent}0.6)`,
          background: `${accent}0.08)`,
          transform: 'scale(1.05)',
        },
      }}
    >
      {/* Icon with check/rank badges */}
      <Box
        sx={{
          position: 'relative',
          width: 40,
          height: 40,
          borderRadius: '8px',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {skill.icon ? (
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
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }}
          >
            <Typography
              sx={{
                fontSize: 10,
                color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                userSelect: 'none',
              }}
            >
              ?
            </Typography>
          </Box>
        )}

        {/* Selected check badge */}
        {isSelected && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 1,
              right: 1,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: `${accent}1)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckIcon sx={{ fontSize: 10, color: '#fff' }} />
          </Box>
        )}

        {/* Rank badge */}
        {skill.maxRank && skill.maxRank > 1 && (
          <Box
            sx={{
              position: 'absolute',
              top: 1,
              left: 1,
              background: 'rgba(0,0,0,0.65)',
              borderRadius: '3px',
              px: 0.3,
              py: '1px',
              lineHeight: 1,
            }}
          >
            <Typography
              sx={{
                fontSize: 8,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.75)',
                letterSpacing: 0.3,
              }}
            >
              ×{skill.maxRank}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Name label — always visible, no tooltip needed on mobile */}
      <Typography
        sx={{
          fontSize: 9,
          fontWeight: 600,
          fontFamily: 'Space Grotesk, Inter, system-ui',
          lineHeight: 1.2,
          textAlign: 'center',
          color: isSelected
            ? isDark
              ? `${accent}0.90)`
              : `${accent}1)`
            : isDark
              ? 'rgba(255,255,255,0.60)'
              : 'rgba(0,0,0,0.55)',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          width: '100%',
        }}
      >
        {skill.name}
      </Typography>
    </ButtonBase>
  );
};

// ── Passive Line Section (collapsible, inside dialog) ─────────────────────────

interface PassiveLineSectionProps {
  lineName: string;
  selectedIds: Set<number>;
  onToggle: (skill: SkillData) => void;
  defaultExpanded?: boolean;
}

const PassiveLineSection: React.FC<PassiveLineSectionProps> = ({
  lineName,
  selectedIds,
  onToggle,
  defaultExpanded = false,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [expanded, setExpanded] = useState(defaultExpanded);

  const passives = useMemo(() => deduplicatePassives(getPassivesByCategory(lineName)), [lineName]);

  if (passives.length === 0) return null;

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
        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          sx={{ flexWrap: 'wrap', pl: 1.5, pr: 0.5, pb: 1.5, pt: 0.5 }}
        >
          {passives.map((p) => (
            <PickerPassiveTile
              key={p.id}
              skill={p}
              isSelected={selectedIds.has(p.id)}
              onToggle={onToggle}
            />
          ))}
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
}

const PassivePickerDialog: React.FC<PassivePickerDialogProps> = ({
  open,
  onClose,
  selectedIds,
  onToggle,
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

  const classLinesByClass = useMemo(() => {
    const classLines = linesByTab[0];
    return ESO_CLASSES.map((cls) => ({
      cls,
      lines: classLines.filter((l) => l.className === cls.label),
    })).filter((g) => g.lines.length > 0);
  }, [linesByTab]);

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
                    alignItems: 'center',
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
            {activeTab === 0
              ? classLinesByClass.map(({ cls, lines }) => {
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
              : linesByTab[activeTab].map((line) => (
                  <PassiveLineSection
                    key={line.name}
                    lineName={line.name}
                    selectedIds={selectedIds}
                    onToggle={handleToggle}
                  />
                ))}
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
}

export const PassivesPicker: React.FC<PassivesPickerProps> = ({ passives, onChange }) => {
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
      />
    </>
  );
};
