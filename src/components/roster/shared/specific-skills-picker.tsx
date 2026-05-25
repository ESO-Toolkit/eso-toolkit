/**
 * SpecificSkillsPicker — visual skill picker for "required skills" in roster slot cards.
 *
 * Inspired by the build editor's SkillBarPicker. Shows selected skills as icon tiles
 * with a picker dialog to browse/search all skills. Stores ability IDs (numbers).
 */

import {
  Add as AddIcon,
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

import type { SkillData } from '@/data/types/skill-line-types';
import { ESO_CLASSES } from '@/features/build-editor/data/esoStaticData';
import { CLASS_COLOR_MAP } from '@/features/build-editor/theme/classColorMap';
import {
  getSkillById,
  getSkillLineIndex,
  getSkillsByCategory,
  searchSkills,
} from '@/features/loadout-manager/data/skillLineSkills';

// ── Constants ────────────────────────────────────────────────────────────────

const TILE_SIZE = 44;
const MIN_SEARCH = 2;
const MAX_RESULTS = 100;
const ICON_URL = 'https://eso-hub.com/storage/icons/';

/** Resolve an icon value to a full URL, handling both short names and full URLs. */
const resolveIconUrl = (icon: string): string =>
  icon.startsWith('http') ? icon : `${ICON_URL}${icon}.png`;

const PICKER_TABS = [
  { label: 'Class', category: 'class' },
  { label: 'Weapon', category: 'weapon' },
  { label: 'Guild', category: 'guild' },
  { label: 'Alliance', category: 'alliance' },
  { label: 'World', category: 'world' },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

interface SkillGroup {
  base: SkillData;
  morphs: SkillData[];
}

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

// ── Skill Tile (selected skill display) ──────────────────────────────────────

interface SkillTileProps {
  skill: SkillData;
  onRemove: () => void;
}

const SkillTile: React.FC<SkillTileProps> = ({ skill, onRemove }) => {
  const isDark = useTheme().palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        maxWidth: TILE_SIZE + 16,
      }}
    >
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
        <Box
          sx={{
            position: 'relative',
            width: TILE_SIZE,
            height: TILE_SIZE,
            borderRadius: '10px',
            cursor: 'pointer',
            overflow: 'hidden',
            flexShrink: 0,
            border: `1.5px solid ${isDark ? 'rgba(56,189,248,0.45)' : 'rgba(56,189,248,0.35)'}`,
            background: isDark ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.04)',
            boxShadow: isDark
              ? '0 0 14px rgba(56,189,248,0.12), inset 0 1px 0 rgba(255,255,255,0.04)'
              : 'inset 0 1px 0 rgba(255,255,255,0.5)',
            transition: 'all 180ms ease',
            '&:hover': {
              transform: 'scale(1.08)',
              borderColor: 'rgba(56,189,248,0.7)',
            },
            '&:hover .skill-clear': { opacity: 1 },
          }}
        >
          {skill.icon ? (
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
                  fontSize: 11,
                  fontWeight: 800,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  color: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.13)',
                  userSelect: 'none',
                }}
              >
                ?
              </Typography>
            </Box>
          )}

          <Box
            className="skill-clear"
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
              backdropFilter: 'blur(2px)',
              opacity: 0,
              transition: 'opacity 150ms',
              cursor: 'pointer',
            }}
          >
            <CloseIcon sx={{ fontSize: 17, color: 'rgba(255,255,255,0.90)' }} />
          </Box>
        </Box>
      </Tooltip>

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
          maxWidth: TILE_SIZE + 8,
          userSelect: 'none',
        }}
      >
        {skill.name}
      </Typography>
    </Box>
  );
};

// ── Picker Tile (in the dialog) ──────────────────────────────────────────────

interface PickerTileProps {
  skill: SkillData;
  onSelect: (skill: SkillData) => void;
  isMorph?: boolean;
  isSelected?: boolean;
}

const PickerTile: React.FC<PickerTileProps> = ({ skill, onSelect, isMorph, isSelected }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const accent = 'rgba(56,189,248,';

  return (
    <Tooltip
      title={
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 12 }}>{skill.name}</Typography>
          {isMorph && <Typography sx={{ fontSize: 10, opacity: 0.7 }}>Morph</Typography>}
          {skill.category && (
            <Typography sx={{ fontSize: 10, opacity: 0.7 }}>{skill.category}</Typography>
          )}
          {isSelected && (
            <Typography sx={{ fontSize: 10, opacity: 0.7, fontStyle: 'italic' }}>
              Already added
            </Typography>
          )}
        </Box>
      }
      arrow
      placement="top"
    >
      <ButtonBase
        onClick={() => !isSelected && onSelect(skill)}
        aria-label={`${skill.name}${isMorph ? ' (morph)' : ''}${isSelected ? ' (already added)' : ''}`}
        sx={{
          width: TILE_SIZE,
          height: TILE_SIZE,
          borderRadius: isMorph ? '8px' : '10px',
          border: `1.5px solid ${
            isSelected
              ? isDark
                ? 'rgba(56,189,248,0.5)'
                : 'rgba(56,189,248,0.4)'
              : isDark
                ? 'rgba(255,255,255,0.10)'
                : 'rgba(0,0,0,0.08)'
          }`,
          background: isSelected
            ? isDark
              ? 'rgba(56,189,248,0.15)'
              : 'rgba(56,189,248,0.08)'
            : isDark
              ? 'rgba(255,255,255,0.03)'
              : 'rgba(0,0,0,0.02)',
          overflow: 'hidden',
          flexShrink: 0,
          transition: 'all 150ms',
          opacity: isSelected ? 0.5 : 1,
          cursor: isSelected ? 'default' : 'pointer',
          '&:hover': isSelected
            ? {}
            : {
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
      </ButtonBase>
    </Tooltip>
  );
};

// ── Skill Line Section (collapsible in dialog) ──────────────────────────────

interface SkillLineSectionProps {
  lineName: string;
  onSelect: (skill: SkillData) => void;
  selectedIds: Set<number>;
  defaultExpanded?: boolean;
}

const SkillLineSection: React.FC<SkillLineSectionProps> = ({
  lineName,
  onSelect,
  selectedIds,
  defaultExpanded = false,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [expanded, setExpanded] = useState(defaultExpanded);

  const skills = useMemo(() => getSkillsByCategory(lineName), [lineName]);
  // Show only active skills (non-passive, non-ultimate) for required skills
  const filtered = useMemo(() => skills.filter((s) => !s.isUltimate && !s.isPassive), [skills]);
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
        <Stack spacing={1.25} sx={{ pl: 1.5, pr: 0.5, pb: 1.5, pt: 0.5 }}>
          {groups.map((group) => (
            <Box key={group.base.id}>
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)',
                  mb: 0.5,
                  letterSpacing: 0.3,
                }}
              >
                {group.base.name}
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <PickerTile
                  skill={group.base}
                  onSelect={onSelect}
                  isSelected={selectedIds.has(group.base.id)}
                />
                {group.morphs.map((m) => (
                  <PickerTile
                    key={m.id}
                    skill={m}
                    onSelect={onSelect}
                    isMorph
                    isSelected={selectedIds.has(m.id)}
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
};

// ── Picker Dialog ────────────────────────────────────────────────────────────

interface PickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (skill: SkillData) => void;
  selectedIds: Set<number>;
}

const PickerDialog: React.FC<PickerDialogProps> = ({ open, onClose, onSelect, selectedIds }) => {
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
    return ESO_CLASSES.filter((cls) => cls.id !== 'any-class')
      .map((cls) => ({
        cls,
        lines: classLines.filter((l) => l.className === cls.label),
      }))
      .filter((g) => g.lines.length > 0);
  }, [linesByTab]);

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const searchResults = useMemo(() => {
    if (search.trim().length < MIN_SEARCH) return [];
    return searchSkills(search, MAX_RESULTS).filter((s) => !s.isPassive);
  }, [search]);

  const isSearching = search.trim().length >= MIN_SEARCH;

  const handleSelect = useCallback(
    (skill: SkillData) => {
      onSelect(skill);
    },
    [onSelect],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            backdropFilter: 'blur(24px)',
            background: isDark ? 'rgba(12,12,22,0.96)' : 'rgba(255,255,255,0.97)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
            boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.55)' : '0 24px 64px rgba(0,0,0,0.12)',
            maxHeight: '80vh',
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
        Add Required Skill
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
                No skills found
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {searchResults.map((skill) => {
                  const alreadyAdded = selectedIds.has(skill.id);
                  return (
                    <ButtonBase
                      key={skill.id}
                      onClick={() => !alreadyAdded && handleSelect(skill)}
                      disabled={alreadyAdded}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        py: 0.75,
                        px: 1,
                        borderRadius: 1.5,
                        width: '100%',
                        textAlign: 'left',
                        opacity: alreadyAdded ? 0.4 : 1,
                        '&:hover': alreadyAdded
                          ? {}
                          : {
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
                      <Box sx={{ minWidth: 0 }}>
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
                            {skill.isUltimate ? ' \u00b7 Ultimate' : ''}
                          </Typography>
                        )}
                      </Box>
                    </ButtonBase>
                  );
                })}
              </Stack>
            )}
          </Box>
        ) : (
          <>
            {/* Category tabs */}
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
            </Box>

            {/* Skill line sections */}
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
                          <SkillLineSection
                            key={line.name}
                            lineName={line.name}
                            onSelect={handleSelect}
                            selectedIds={selectedIds}
                          />
                        ))}
                      </Box>
                    );
                  })
                : linesByTab[activeTab].map((line) => (
                    <SkillLineSection
                      key={line.name}
                      lineName={line.name}
                      onSelect={handleSelect}
                      selectedIds={selectedIds}
                    />
                  ))}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ── Public Component ─────────────────────────────────────────────────────────

export interface SpecificSkillsPickerProps {
  value: number[];
  onChange: (ids: number[]) => void;
}

export const SpecificSkillsPicker: React.FC<SpecificSkillsPickerProps> = ({ value, onChange }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedIds = useMemo(() => new Set(value), [value]);

  const skills = useMemo(
    () => value.map((id) => getSkillById(id)).filter((s): s is SkillData => s != null),
    [value],
  );

  const handleAdd = useCallback(
    (skill: SkillData) => {
      if (!selectedIds.has(skill.id)) {
        onChange([...value, skill.id]);
      }
    },
    [value, selectedIds, onChange],
  );

  const handleRemove = useCallback(
    (id: number) => {
      onChange(value.filter((v) => v !== id));
    },
    [value, onChange],
  );

  return (
    <Stack spacing={1}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          fontFamily: 'Space Grotesk, Inter, system-ui',
          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
        }}
      >
        Required Skills
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: { xs: 0.75, sm: 1 },
          flexWrap: 'wrap',
          py: skills.length > 0 ? 1 : 0,
          px: skills.length > 0 ? 1 : 0,
          borderRadius: 3,
          background:
            skills.length > 0
              ? isDark
                ? 'rgba(255,255,255,0.015)'
                : 'rgba(0,0,0,0.012)'
              : 'transparent',
          border:
            skills.length > 0
              ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`
              : 'none',
        }}
      >
        {skills.map((skill) => (
          <SkillTile key={skill.id} skill={skill} onRemove={() => handleRemove(skill.id)} />
        ))}

        {/* Add button */}
        <Tooltip title="Add a required skill" arrow placement="top">
          <ButtonBase
            onClick={() => setDialogOpen(true)}
            aria-label="Add required skill"
            sx={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              borderRadius: '10px',
              border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 180ms ease',
              '&:hover': {
                borderColor: isDark ? 'rgba(56,189,248,0.5)' : 'rgba(56,189,248,0.4)',
                background: isDark ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.04)',
                transform: 'scale(1.08)',
              },
            }}
          >
            <AddIcon
              sx={{
                fontSize: 20,
                color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
              }}
            />
          </ButtonBase>
        </Tooltip>
      </Box>

      <PickerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSelect={handleAdd}
        selectedIds={selectedIds}
      />
    </Stack>
  );
};
