/**
 * SkillBarPicker — prop-driven version of SkillsSection.
 *
 * Renders two ESO skill bars (front + back) with a shared skill-picker dialog.
 * No Redux coupling — takes skills via props and calls onChange on mutation.
 * SkillsSection wraps this with useSelector / dispatch.
 */

import { Close as CloseIcon, FilterList as FilterListIcon } from '@mui/icons-material';
import { Box, ButtonBase, ListSubheader, Stack, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { LazySkillTooltip } from '../../../../components/LazySkillTooltip';
import type { SkillData } from '../../../../data/types/skill-line-types';
import { groupSkillsByBase } from '../../../../utils/groupSkillsByBase';
import { buildTooltipProps } from '../../../../utils/skillTooltipMapper';
import {
  getSkillById,
  getSkillLineIndex,
  getSkillsByCategory,
  searchSkills,
} from '../../../loadout-manager/data/skillLineSkills';
import type { SkillsConfig } from '../../../loadout-manager/types/loadout.types';
import { CLASS_SKILL_LINES, ESO_CLASSES } from '../../data/esoStaticData';
import { CLASS_COLOR_MAP } from '../../theme/classColorMap';
import { CollapsibleSection } from '../primitives/CollapsibleSection';
import { PickerDialog } from '../primitives/PickerDialog';
import { PickerTabBar } from '../primitives/PickerTabBar';

// ── Constants ───────────────────────────────────────────────────────────────

const SKILL_SLOTS = [3, 4, 5, 6, 7];
const ULTIMATE_SLOT = 8;
const ALL_SLOTS = [...SKILL_SLOTS, ULTIMATE_SLOT];
const MIN_SEARCH = 2;
const MAX_RESULTS = 100;

const TILE_SIZE = 58;
const ULT_SIZE = 66;
const TILE_SIZE_MOBILE = 46;
const ULT_SIZE_MOBILE = 52;
const PICKER_TILE = 44;

const SLOT_LABELS: Record<number, string> = {
  3: '1',
  4: '2',
  5: '3',
  6: '4',
  7: '5',
  8: 'U',
};

const ICON_URL = 'https://eso-hub.com/storage/icons/';

const countFilled = (bar: Record<number, number>): number =>
  ALL_SLOTS.filter((s) => bar[s] !== undefined && bar[s] > 0).length;

// ── Picker Types & Helpers ──────────────────────────────────────────────────

const PICKER_TABS = [
  { key: 'class' as const, label: 'Class' },
  { key: 'weapon' as const, label: 'Weapon' },
  { key: 'guild' as const, label: 'Guild' },
  { key: 'alliance' as const, label: 'Alliance' },
  { key: 'world' as const, label: 'World' },
];

// ── Picker Skill Tile ───────────────────────────────────────────────────────

interface PickerTileProps {
  skill: SkillData;
  onSelect: (skill: SkillData) => void;
  isMorph?: boolean;
}

const PickerTile: React.FC<PickerTileProps> = ({ skill, onSelect, isMorph }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [imgBroken, setImgBroken] = useState(false);
  const isUlt = skill.isUltimate;
  const accent = isUlt ? 'rgba(255,179,0,' : 'rgba(56,189,248,';

  const richTooltip = useMemo(() => {
    const props = buildTooltipProps({ abilityId: skill.id, abilityName: skill.name });
    if (props) return <LazySkillTooltip {...props} />;
    return (
      <Box>
        <Typography sx={{ fontWeight: 600, fontSize: 12 }}>{skill.name}</Typography>
        {isMorph && <Typography sx={{ fontSize: 10, opacity: 0.7 }}>Morph</Typography>}
        {skill.category && (
          <Typography sx={{ fontSize: 10, opacity: 0.7 }}>{skill.category}</Typography>
        )}
      </Box>
    );
  }, [skill.id, skill.name, skill.category, isMorph]);

  return (
    <Tooltip
      title={richTooltip}
      arrow
      placement="top"
      enterDelay={300}
      enterTouchDelay={0}
      leaveTouchDelay={3000}
    >
      <ButtonBase
        onClick={() => onSelect(skill)}
        aria-label={`${skill.name}${isMorph ? ' (morph)' : ''}`}
        sx={{
          width: PICKER_TILE,
          height: PICKER_TILE,
          borderRadius: isMorph ? '8px' : '10px',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          overflow: 'hidden',
          flexShrink: 0,
          transition: 'all 150ms',
          '&:hover': {
            borderColor: `${accent}0.6)`,
            background: `${accent}0.10)`,
            transform: 'scale(1.08)',
            boxShadow: `0 0 12px ${accent}0.15)`,
          },
        }}
      >
        {skill.icon && !imgBroken ? (
          <img
            src={`${ICON_URL}${skill.icon}.png`}
            alt={skill.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setImgBroken(true)}
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

// ── Skill Line Section (collapsible) ────────────────────────────────────────

interface SkillLineSectionProps {
  lineName: string;
  isUltimate: boolean;
  onSelect: (skill: SkillData) => void;
  defaultExpanded?: boolean;
}

const SkillLineSection: React.FC<SkillLineSectionProps> = ({
  lineName,
  isUltimate,
  onSelect,
  defaultExpanded = false,
}) => {
  const skills = useMemo(() => getSkillsByCategory(lineName), [lineName]);
  const filtered = useMemo(
    () => skills.filter((s) => (isUltimate ? s.isUltimate : !s.isUltimate)),
    [skills, isUltimate],
  );
  const groups = useMemo(() => groupSkillsByBase(filtered), [filtered]);

  if (groups.length === 0) return null;

  return (
    <CollapsibleSection label={lineName} count={groups.length} defaultExpanded={defaultExpanded}>
      <Stack spacing={1.25} sx={{ pl: 1.5, pr: 0.5, pb: 1.5, pt: 0.5 }}>
        {groups.map((group) => (
          <Box key={group.base.id}>
            <Typography
              sx={{
                fontSize: 10,
                fontWeight: 600,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                color: 'text.secondary',
                mb: 0.5,
                letterSpacing: 0.3,
              }}
            >
              {group.base.name}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <PickerTile skill={group.base} onSelect={onSelect} />
              {group.morphs.map((m) => (
                <PickerTile key={m.id} skill={m} onSelect={onSelect} isMorph />
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </CollapsibleSection>
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
}

const SkillPickerDialog: React.FC<SkillPickerDialogProps> = ({
  open,
  onClose,
  onSelect,
  isUltimate,
  slotLabel,
  selectedClassLineIds,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [activeTab, setActiveTab] = useState<string>('class');
  const [search, setSearch] = useState('');

  const lineIndex = useMemo(() => getSkillLineIndex(), []);

  const linesByTab = useMemo(
    () => PICKER_TABS.map((tab) => lineIndex.filter((l) => l.broadCategory === tab.key)),
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

  const activeTabIndex = PICKER_TABS.findIndex((t) => t.key === activeTab);

  return (
    <PickerDialog
      open={open}
      onClose={handleClose}
      title={isUltimate ? 'Assign Ultimate' : `Assign Skill · Slot ${slotLabel}`}
    >
      <PickerDialog.Search
        value={search}
        onChange={setSearch}
        placeholder="Search skills..."
        resultCount={isSearching ? searchResults.length : undefined}
      />

      {isSearching ? (
        <PickerDialog.Body
          empty={searchResults.length === 0}
          emptyMessage={`No ${isUltimate ? 'ultimates' : 'skills'} found`}
        >
          <Stack spacing={0.5} sx={{ px: 1 }}>
            {searchResults.map((skill) => (
              <ButtonBase
                key={skill.id}
                onClick={() => handleSelect(skill)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  py: 0.75,
                  px: 1,
                  borderRadius: 1.5,
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.12s ease',
                  '&:hover': {
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  },
                }}
              >
                {skill.icon ? (
                  <img
                    src={`${ICON_URL}${skill.icon}.png`}
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
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = 'none';
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
            ))}
          </Stack>
        </PickerDialog.Body>
      ) : (
        <>
          <PickerDialog.Tabs>
            <PickerTabBar tabs={PICKER_TABS} activeKey={activeTab} onChange={setActiveTab} />

            {activeTab === 'class' && hasSelectedLines && (
              <>
                <Box sx={{ flex: 1, minWidth: 4 }} />
                <Tooltip
                  title={
                    myBuildOnly
                      ? 'Showing your 3 selected class lines \u00b7 click to show all'
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
          </PickerDialog.Tabs>

          <PickerDialog.Body>
            {activeTab === 'class'
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
                        />
                      ))}
                    </Box>
                  );
                })
              : linesByTab[activeTabIndex >= 0 ? activeTabIndex : 0].map((line) => (
                  <SkillLineSection
                    key={line.name}
                    lineName={line.name}
                    isUltimate={isUltimate}
                    onSelect={handleSelect}
                  />
                ))}
          </PickerDialog.Body>
        </>
      )}
    </PickerDialog>
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [imgBroken, setImgBroken] = useState(false);
  const isUlt = slotIndex === ULTIMATE_SLOT;
  const skill = abilityId ? getSkillById(abilityId) : null;
  const size = isUlt
    ? isMobile ? ULT_SIZE_MOBILE : ULT_SIZE
    : isMobile ? TILE_SIZE_MOBILE : TILE_SIZE;
  const label = SLOT_LABELS[slotIndex] ?? String(slotIndex);

  const accentA = (a: number): string =>
    isUlt ? `rgba(255,179,0,${a})` : `rgba(var(--be-accent-rgb, 56,189,248),${a})`;

  const tooltipContent = useMemo(() => {
    if (!skill) return `Slot ${label}${isUlt ? ' (Ultimate)' : ''} \u2014 click to assign`;
    const props = buildTooltipProps({ abilityId: skill.id, abilityName: skill.name });
    if (props) return <LazySkillTooltip {...props} />;
    return `${skill.name}${skill.category ? ` \u00b7 ${skill.category}` : ''}`;
  }, [skill, label, isUlt]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        flex: isUlt ? undefined : 1,
        maxWidth: isUlt ? size : size + 16,
        minWidth: isUlt ? size : size,
      }}
    >
      <Tooltip
        title={tooltipContent}
        arrow
        placement="top"
        enterDelay={300}
        enterTouchDelay={0}
        leaveTouchDelay={3000}
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
            '@media (hover: none)': {
              '& .skill-clear': { opacity: skill ? 1 : 0 },
            },
          }}
        >
          {skill?.icon && !imgBroken ? (
            <img
              src={`${ICON_URL}${skill.icon}.png`}
              alt={skill.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={() => setImgBroken(true)}
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
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const filled = countFilled(bar);

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5, px: 0.5 }}
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
            color="text.secondary"
            sx={{ fontSize: '0.62rem', fontWeight: 600, fontFamily: 'Space Grotesk' }}
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
          gap: isMobile ? 0.5 : 1.25,
          py: isMobile ? 1 : 1.5,
          px: isMobile ? 1 : 1.5,
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
            height: (isMobile ? ULT_SIZE_MOBILE : ULT_SIZE) * 0.7,
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

        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
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
      />
    </>
  );
};
