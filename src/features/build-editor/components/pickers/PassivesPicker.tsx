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
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Box,
  ButtonBase,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  InputAdornment,
  ListSubheader,
  Stack,
  TextField,
  Tooltip,
  Typography,
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
    <Tooltip
      title={
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 12 }}>{skill.name}</Typography>
          {skill.category && (
            <Typography sx={{ fontSize: 10, opacity: 0.7 }}>{skill.category}</Typography>
          )}
        </Box>
      }
      arrow
      placement="top"
    >
      <ButtonBase
        onClick={() => onToggle(skill)}
        aria-label={`${skill.name}${isSelected ? ' (selected)' : ''}`}
        aria-pressed={isSelected}
        sx={{
          position: 'relative',
          width: TILE_SIZE,
          height: TILE_SIZE,
          borderRadius: '10px',
          border: `1.5px solid ${
            isSelected ? `${accent}0.55)` : isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'
          }`,
          background: isSelected
            ? `${accent}0.12)`
            : isDark
              ? 'rgba(255,255,255,0.03)'
              : 'rgba(0,0,0,0.02)',
          overflow: 'hidden',
          flexShrink: 0,
          transition: 'all 150ms',
          boxShadow: isSelected ? `0 0 10px ${accent}0.15)` : 'none',
          '&:hover': {
            borderColor: `${accent}0.6)`,
            background: `${accent}0.10)`,
            transform: 'scale(1.08)',
            boxShadow: `0 0 12px ${accent}0.15)`,
          },
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
        )}

        {isSelected && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.45)',
            }}
          >
            <CheckIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Box>
        )}
      </ButtonBase>
    </Tooltip>
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
  const isDark = useTheme().palette.mode === 'dark';
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
    <Dialog
      open={open}
      onClose={onClose}
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDark
            ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
            : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Select Passives
        {selectedIds.size > 0 && (
          <Typography
            component="span"
            sx={{
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Space Grotesk',
              color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)',
              WebkitTextFillColor: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)',
            }}
          >
            {selectedIds.size} selected
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ px: 2, pb: 1.5 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search passives..."
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
                No passives found
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {searchResults.map((skill) => {
                  const selected = selectedIds.has(skill.id);
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
                        borderRadius: 1.5,
                        width: '100%',
                        textAlign: 'left',
                        background: selected
                          ? isDark
                            ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
                            : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.04)'
                          : 'transparent',
                        '&:hover': {
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        },
                      }}
                    >
                      {skill.icon ? (
                        <img
                          src={resolveIconUrl(skill.icon)}
                          alt=""
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            flexShrink: 0,
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                            objectFit: 'cover',
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '6px',
                            bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: 'Space Grotesk, Inter, system-ui',
                            lineHeight: 1.3,
                          }}
                        >
                          {skill.name}
                        </Typography>
                        {skill.category && (
                          <Typography
                            sx={{
                              fontSize: 10,
                              color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)',
                              lineHeight: 1.2,
                            }}
                          >
                            {skill.category}
                          </Typography>
                        )}
                      </Box>
                      {selected && (
                        <CheckIcon
                          sx={{ fontSize: 16, color: 'var(--be-accent, #38bdf8)', flexShrink: 0 }}
                        />
                      )}
                    </ButtonBase>
                  );
                })}
              </Stack>
            )}
          </Box>
        ) : (
          <>
            {/* Browse mode: category tabs + skill lines */}
            <Box sx={{ display: 'flex', gap: 0.5, px: 2, pb: 1.5, overflowX: 'auto' }}>
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
            </Box>

            <Box sx={{ maxHeight: 400, overflowY: 'auto', px: 1, pb: 1 }}>
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
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
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
