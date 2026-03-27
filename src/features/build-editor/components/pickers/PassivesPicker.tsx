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

import { Add as AddIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { Box, ButtonBase, ListSubheader, Stack, Tooltip, Typography } from '@mui/material';
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
import { CollapsibleSection } from '../primitives/CollapsibleSection';
import { PickerDialog } from '../primitives/PickerDialog';
import { PickerTabBar } from '../primitives/PickerTabBar';

// ── Constants ─────────────────────────────────────────────────────────────────

const ICON_URL = 'https://eso-hub.com/storage/icons/';
const TILE_SIZE = 44;
const MIN_SEARCH = 2;
const MAX_RESULTS = 100;

const PASSIVE_PICKER_TABS = [
  { key: 'class' as const, label: 'Class' },
  { key: 'weapon' as const, label: 'Weapon' },
  { key: 'guild' as const, label: 'Guild' },
  { key: 'alliance' as const, label: 'Alliance' },
  { key: 'world' as const, label: 'World' },
  { key: 'armor' as const, label: 'Armor' },
];

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
  const [imgBroken, setImgBroken] = useState(false);

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
        {skill?.icon && !imgBroken ? (
          <img
            src={`${ICON_URL}${skill.icon}.png`}
            alt={skill.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setImgBroken(true)}
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

        <Box
          className="passive-clear"
          role="button"
          tabIndex={0}
          aria-label={skill ? `Remove ${skill.name}` : `Remove passive #${id}`}
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
  const [imgBroken, setImgBroken] = useState(false);
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

// ── Passive Line Section (inside dialog, uses CollapsibleSection) ────────────

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
  const passives = useMemo(() => deduplicatePassives(getPassivesByCategory(lineName)), [lineName]);

  if (passives.length === 0) return null;

  return (
    <CollapsibleSection label={lineName} count={passives.length} defaultExpanded={defaultExpanded}>
      <Stack
        direction="row"
        spacing={0.75}
        flexWrap="wrap"
        useFlexGap
        sx={{ pl: 1.5, pr: 0.5, pb: 1.5, pt: 0.5 }}
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
    </CollapsibleSection>
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
  const [activeTab, setActiveTab] = useState<string>('class');
  const [search, setSearch] = useState('');

  const lineIndex = useMemo(() => getSkillLineIndex(), []);

  const linesByTab = useMemo(
    () => PASSIVE_PICKER_TABS.map((tab) => lineIndex.filter((l) => l.broadCategory === tab.key)),
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

  const activeTabIndex = PASSIVE_PICKER_TABS.findIndex((t) => t.key === activeTab);

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
      />

      {isSearching ? (
        <PickerDialog.Body empty={searchResults.length === 0} emptyMessage="No passives found">
          <Stack spacing={0.5} sx={{ px: 1 }}>
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
        </PickerDialog.Body>
      ) : (
        <>
          <PickerDialog.Tabs>
            <PickerTabBar
              tabs={PASSIVE_PICKER_TABS}
              activeKey={activeTab}
              onChange={setActiveTab}
            />
          </PickerDialog.Tabs>

          <PickerDialog.Body>
            {activeTab === 'class'
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
              : linesByTab[activeTabIndex >= 0 ? activeTabIndex : 0].map((line) => (
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
        <Stack direction="row" alignItems="center" justifyContent="space-between">
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

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {passives.map((id) => {
            const skill = getSkillById(id);
            return <PassiveTile key={id} skill={skill} id={id} onRemove={() => handleToggle(id)} />;
          })}
          <AddPassiveTile onClick={() => setDialogOpen(true)} />
        </Box>

        {passives.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 2,
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
              border: `1px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 3,
            }}
          >
            <Typography
              variant="caption"
              color="text.disabled"
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
