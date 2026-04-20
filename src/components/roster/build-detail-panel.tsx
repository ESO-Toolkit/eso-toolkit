/**
 * BuildDetailPanel — read-only expandable detail panel for roster view (/rv).
 *
 * Replaces the static BuildDataBadges chips with clickable badges that
 * toggle Collapse panels showing skills, CP, gear, food, and passives.
 * All data lookups are static (no API/Redux), suitable for standalone pages.
 */

import { Box, ButtonBase, Chip, Collapse, Tooltip, Typography } from '@mui/material';
import React, { useCallback, useState } from 'react';

import { ESO_CONSUMABLE_LOOKUP } from '../../data/esoConsumables';
import type { BuildChampionPoints } from '../../features/build-editor/types/build.types';
import { getChampionPointById } from '../../features/loadout-manager/data/championPointData';
import { getItemInfo } from '../../features/loadout-manager/data/itemIdMap';
import { getSkillById } from '../../features/loadout-manager/data/skillLineSkills';
import type { SlotType } from '../../features/loadout-manager/data/slotTypes';
import type { GearConfig, SkillsConfig } from '../../features/loadout-manager/types/loadout.types';
import { deriveItemNameForSlot } from '../../features/loadout-manager/utils/itemIconResolver';
import { getChampionPointAbilityName } from '../../types/champion-points';
import { getEsoHubSetUrl, getEsoHubSkillLineUrl } from '../../utils/esoHubLinks';
import { getGearSetTooltipPropsByName } from '../../utils/gearSetTooltipMapper';
import { buildTooltipPropsFromAbilityId } from '../../utils/skillTooltipMapper';
import { GearSetTooltip } from '../GearSetTooltip';
import { LazySkillTooltip as SkillTooltipCard } from '../LazySkillTooltip';

// ── Constants ────────────────────────────────────────────────────────────────

const SKILL_ICON_URL = 'https://eso-hub.com/storage/icons/';

/** Resolve an icon value to a full URL, handling both short names and full URLs. */
const resolveIconUrl = (icon: string): string =>
  icon.startsWith('http') ? icon : `${SKILL_ICON_URL}${icon}.png`;

const TILE = 36;
const ULT_TILE = 42;
const SKILL_SLOTS = [3, 4, 5, 6, 7] as const;
const ULTIMATE_SLOT = 8;

const GEAR_SLOT_NAMES: Record<number, string> = {
  0: 'Head',
  1: 'Neck',
  2: 'Chest',
  3: 'Shoulders',
  4: 'Main Hand',
  5: 'Off Hand',
  6: 'Belt',
  8: 'Legs',
  9: 'Feet',
  11: 'Ring 1',
  12: 'Ring 2',
  16: 'Gloves',
  20: 'Back Main',
  21: 'Back Off',
};
const GEAR_SLOT_ORDER = [0, 2, 3, 16, 6, 8, 9, 1, 11, 12, 4, 5, 20, 21];

/** Maps ESO equipment slot indices to the SlotType used in itemIdMap. */
const SLOT_INDEX_TO_TYPE: Record<number, SlotType> = {
  0: 'head',
  1: 'neck',
  2: 'chest',
  3: 'shoulders',
  4: 'weapon',
  5: 'offhand',
  6: 'waist',
  8: 'legs',
  9: 'feet',
  11: 'ring',
  12: 'ring',
  16: 'hand',
  20: 'weapon',
  21: 'offhand',
};

const WEIGHT_LABELS: Record<string, string> = {
  light: 'L',
  medium: 'M',
  heavy: 'H',
};

// ── Skill Tile ───────────────────────────────────────────────────────────────

const SkillTile: React.FC<{
  abilityId: number;
  isUltimate?: boolean;
  isDarkMode: boolean;
}> = ({ abilityId, isUltimate = false, isDarkMode }) => {
  const skill = abilityId ? getSkillById(abilityId) : null;
  const iconUrl = skill?.icon ? resolveIconUrl(skill.icon) : null;
  const size = isUltimate ? ULT_TILE : TILE;
  const accent = isUltimate ? 'rgba(255,179,0,' : 'rgba(56,189,248,';
  const esoHubUrl = skill?.category ? getEsoHubSkillLineUrl(skill.category) : undefined;

  const richProps = React.useMemo(
    () => (abilityId ? buildTooltipPropsFromAbilityId(abilityId) : null),
    [abilityId],
  );

  const tooltipTitle = richProps ? (
    <SkillTooltipCard
      {...richProps}
      iconUrl={richProps.iconUrl || iconUrl || undefined}
      abilityId={abilityId}
    />
  ) : (
    (skill?.name ?? `Ability #${abilityId}`)
  );

  const tile = (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: isUltimate ? '10px' : '8px',
        overflow: 'hidden',
        flexShrink: 0,
        border: `1.5px solid ${
          skill ? `${accent}0.4)` : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
        }`,
        background: skill
          ? isDarkMode
            ? `${accent}0.06)`
            : `${accent}0.04)`
          : isDarkMode
            ? 'rgba(255,255,255,0.02)'
            : 'rgba(0,0,0,0.015)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.15s ease, border-color 0.15s ease',
        '&:hover': { transform: 'scale(1.06)', borderColor: `${accent}0.6)` },
      }}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={skill?.name ?? ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Typography
          sx={{
            fontSize: '0.5rem',
            color: 'text.disabled',
            fontWeight: 600,
            fontFamily: 'monospace',
          }}
        >
          #{abilityId}
        </Typography>
      )}
    </Box>
  );

  return (
    <Tooltip
      title={tooltipTitle}
      arrow
      placement="top"
      enterTouchDelay={0}
      leaveTouchDelay={3000}
      slotProps={{
        tooltip: {
          sx: richProps
            ? {
                maxWidth: 320,
                p: 0,
                backgroundColor: 'transparent !important',
                border: 'none !important',
                boxShadow: 'none !important',
              }
            : {},
        },
        arrow: richProps ? { sx: { display: 'none' } } : {},
      }}
    >
      {esoHubUrl ? (
        <Box
          component="a"
          href={esoHubUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${skill?.name ?? `Ability #${abilityId}`} on ESO-Hub`}
          title="View on ESO-Hub"
          sx={{ display: 'inline-flex', lineHeight: 0 }}
        >
          {tile}
        </Box>
      ) : (
        tile
      )}
    </Tooltip>
  );
};

// ── Skills Display ───────────────────────────────────────────────────────────

const SkillBarDisplay: React.FC<{
  skills: SkillsConfig;
  isDarkMode: boolean;
}> = ({ skills, isDarkMode }) => {
  const renderBar = (barIndex: 0 | 1, label: string): React.ReactNode => {
    const bar = skills[barIndex] ?? {};
    const hasAbilities = SKILL_SLOTS.some((s) => bar[s]) || bar[ULTIMATE_SLOT];
    if (!hasAbilities) return null;

    return (
      <Box sx={{ mb: 1.5 }}>
        <Typography
          sx={{
            fontSize: '0.55rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'text.disabled',
            mb: 0.5,
          }}
        >
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          {SKILL_SLOTS.map((slot) => {
            const id = bar[slot];
            return id ? (
              <SkillTile key={slot} abilityId={id} isDarkMode={isDarkMode} />
            ) : (
              <Box
                key={slot}
                sx={{
                  width: TILE,
                  height: TILE,
                  borderRadius: '8px',
                  border: `1px dashed ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                }}
              />
            );
          })}
          {/* Divider before ultimate */}
          <Box
            sx={{
              width: '1px',
              height: ULT_TILE - 8,
              mx: 0.25,
              background: isDarkMode ? 'rgba(255,179,0,0.2)' : 'rgba(255,179,0,0.3)',
            }}
          />
          {bar[ULTIMATE_SLOT] ? (
            <SkillTile abilityId={bar[ULTIMATE_SLOT]} isUltimate isDarkMode={isDarkMode} />
          ) : (
            <Box
              sx={{
                width: ULT_TILE,
                height: ULT_TILE,
                borderRadius: '10px',
                border: `1px dashed ${isDarkMode ? 'rgba(255,179,0,0.15)' : 'rgba(255,179,0,0.2)'}`,
              }}
            />
          )}
        </Box>
      </Box>
    );
  };

  return (
    <>
      {renderBar(0, 'Front Bar')}
      {renderBar(1, 'Back Bar')}
    </>
  );
};

// ── CP Display ───────────────────────────────────────────────────────────────

const CP_TREE_CONFIG = [
  { key: 'warfare' as const, label: 'Warfare', color: '#42a5f5' },
  { key: 'fitness' as const, label: 'Fitness', color: '#ef5350' },
  { key: 'craft' as const, label: 'Craft', color: '#66bb6a' },
] as const;

const CPDisplay: React.FC<{
  cpPoints: BuildChampionPoints;
  isDarkMode: boolean;
}> = ({ cpPoints, isDarkMode }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {CP_TREE_CONFIG.map(({ key, label, color }) => {
        const tree = cpPoints[key];
        const filledSlots = tree.slots.filter((s): s is number => s !== null);
        if (filledSlots.length === 0) return null;

        return (
          <Box key={key}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                mb: 0.5,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: color,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color,
                }}
              >
                {label}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {filledSlots.map((cpId, i) => {
                // Try dedicated CP lookup first, then generic skill lookup
                const cpData = getChampionPointById(cpId);
                const name =
                  cpData?.name ??
                  getChampionPointAbilityName(cpId as never) ??
                  getSkillById(cpId)?.name ??
                  `CP #${cpId}`;
                return (
                  <Chip
                    key={`${cpId}-${i}`}
                    label={name}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      backgroundColor: isDarkMode ? `${color}14` : `${color}0a`,
                      color: isDarkMode ? color : color,
                      border: `1px solid ${isDarkMode ? `${color}30` : `${color}25`}`,
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

// ── Gear Display ─────────────────────────────────────────────────────────────

const GearDisplay: React.FC<{
  gear: GearConfig;
  isDarkMode: boolean;
}> = ({ gear, isDarkMode }) => {
  const populatedSlots = GEAR_SLOT_ORDER.filter((slotIdx) => gear[slotIdx]);

  const setPieceCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const slotIdx of populatedSlots) {
      const piece = gear[slotIdx];
      if (!piece) continue;
      const info = getItemInfo(Number(piece.id));
      if (info?.setName) counts.set(info.setName, (counts.get(info.setName) ?? 0) + 1);
    }
    return counts;
  }, [gear, populatedSlots]);

  if (populatedSlots.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.375 }}>
      {populatedSlots.map((slotIdx) => {
        const piece = gear[slotIdx];
        if (!piece) return null;
        const itemId = Number(piece.id);
        const itemInfo = getItemInfo(itemId);
        const slotName = GEAR_SLOT_NAMES[slotIdx] ?? `Slot ${slotIdx}`;
        const itemName = deriveItemNameForSlot(itemId, SLOT_INDEX_TO_TYPE[slotIdx]);
        const setName = itemInfo?.setName;
        const weight = piece.weight ? WEIGHT_LABELS[piece.weight] : null;
        const gearTooltipProps = setName
          ? getGearSetTooltipPropsByName(setName, setPieceCounts.get(setName) ?? 0)
          : null;

        const row = (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              py: 0.25,
              '&:not(:last-child)': {
                borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}`,
              },
            }}
          >
            <Typography
              sx={{
                fontSize: '0.55rem',
                fontWeight: 600,
                color: 'text.disabled',
                width: 58,
                flexShrink: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {slotName}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.65rem',
                fontWeight: 500,
                color: 'text.primary',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {itemName}
            </Typography>
            {setName && (
              <Chip
                component="a"
                href={getEsoHubSetUrl(setName)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                clickable
                label={setName}
                size="small"
                aria-label={`${setName} on ESO-Hub`}
                sx={{
                  height: 16,
                  fontSize: '0.5rem',
                  fontWeight: 500,
                  backgroundColor: isDarkMode ? 'rgba(168,85,247,0.08)' : 'rgba(147,51,234,0.06)',
                  color: isDarkMode ? 'rgba(168,85,247,0.85)' : 'rgba(126,34,206,0.85)',
                  border: `1px solid ${isDarkMode ? 'rgba(168,85,247,0.2)' : 'rgba(147,51,234,0.15)'}`,
                  '& .MuiChip-label': { px: 0.5 },
                  textDecoration: 'none',
                }}
              />
            )}
            {weight && (
              <Chip
                label={weight}
                size="small"
                sx={{
                  height: 16,
                  fontSize: '0.5rem',
                  fontWeight: 700,
                  minWidth: 18,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  color: 'text.secondary',
                  '& .MuiChip-label': { px: 0.375 },
                }}
              />
            )}
          </Box>
        );

        if (!gearTooltipProps) {
          return <React.Fragment key={slotIdx}>{row}</React.Fragment>;
        }

        return (
          <Tooltip
            key={slotIdx}
            title={<GearSetTooltip {...gearTooltipProps} />}
            placement="top"
            enterTouchDelay={0}
            leaveTouchDelay={3000}
            arrow
            slotProps={{
              tooltip: {
                sx: {
                  maxWidth: 320,
                  p: 0,
                  backgroundColor: 'transparent !important',
                  border: 'none !important',
                  boxShadow: 'none !important',
                },
              },
              arrow: { sx: { display: 'none' } },
            }}
          >
            {row}
          </Tooltip>
        );
      })}
    </Box>
  );
};

// ── Passives Display ─────────────────────────────────────────────────────────

const PassivesDisplay: React.FC<{
  passives: number[];
  isDarkMode: boolean;
}> = ({ passives, isDarkMode }) => {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.375 }}>
      {passives.map((id, i) => {
        const skill = getSkillById(id);
        const name = skill?.name ?? `#${id}`;
        const esoHubUrl = skill?.category ? getEsoHubSkillLineUrl(skill.category) : undefined;
        return (
          <Chip
            key={`${id}-${i}`}
            {...(esoHubUrl
              ? {
                  component: 'a',
                  href: esoHubUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  clickable: true,
                  onClick: (e: React.MouseEvent) => e.stopPropagation(),
                  'aria-label': `${name} on ESO-Hub`,
                }
              : {})}
            label={name}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.55rem',
              fontWeight: 500,
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              color: 'text.secondary',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
              '& .MuiChip-label': { px: 0.5 },
              ...(esoHubUrl ? { textDecoration: 'none' } : {}),
            }}
          />
        );
      })}
    </Box>
  );
};

// ── Section Header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <Typography
    sx={{
      fontSize: '0.55rem',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'text.disabled',
      mb: 0.75,
    }}
  >
    {label}
  </Typography>
);

// ── Main Component ───────────────────────────────────────────────────────────

export interface BuildDetailPanelProps {
  food?: { id?: number; name?: string };
  skills?: SkillsConfig;
  passives?: number[];
  cpPoints?: BuildChampionPoints;
  gear?: GearConfig;
  isDarkMode: boolean;
  color: string;
}

type Section = 'food' | 'skills' | 'passives' | 'cp' | 'gear';

export const BuildDetailPanel: React.FC<BuildDetailPanelProps> = ({
  food,
  skills,
  passives,
  cpPoints,
  gear,
  isDarkMode,
}) => {
  const [expanded, setExpanded] = useState<Set<Section>>(new Set());

  const toggle = useCallback((section: Section) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  // Compute badge data
  const foodName =
    food?.id != null ? (ESO_CONSUMABLE_LOOKUP[food.id]?.name ?? food.name) : food?.name;
  const skillCount = skills
    ? Object.keys(skills[0] ?? {}).length + Object.keys(skills[1] ?? {}).length
    : 0;
  const passiveCount = passives?.length ?? 0;
  const hasCp =
    cpPoints &&
    (cpPoints.warfare.slots.some((s) => s !== null) ||
      cpPoints.fitness.slots.some((s) => s !== null) ||
      cpPoints.craft.slots.some((s) => s !== null));
  const hasGear = gear && Object.keys(gear).length > 0;

  if (!foodName && skillCount === 0 && passiveCount === 0 && !hasCp && !hasGear) return null;

  const chipBase = {
    height: 18,
    fontSize: '0.58rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    '& .MuiChip-label': { px: 0.75 },
  };

  const chipDefault = {
    ...chipBase,
    backgroundColor: isDarkMode ? 'rgba(56,189,248,0.06)' : 'rgba(56,189,248,0.05)',
    color: isDarkMode ? 'rgba(56,189,248,0.85)' : 'rgb(3,105,161)',
    border: `1px solid ${isDarkMode ? 'rgba(56,189,248,0.15)' : 'rgba(56,189,248,0.18)'}`,
    '&:hover': {
      backgroundColor: isDarkMode ? 'rgba(56,189,248,0.12)' : 'rgba(56,189,248,0.1)',
      borderColor: isDarkMode ? 'rgba(56,189,248,0.3)' : 'rgba(56,189,248,0.3)',
    },
  };

  const chipActive = {
    ...chipBase,
    backgroundColor: isDarkMode ? 'rgba(56,189,248,0.14)' : 'rgba(56,189,248,0.12)',
    color: isDarkMode ? 'rgba(56,189,248,1)' : 'rgb(2,80,130)',
    border: `1px solid ${isDarkMode ? 'rgba(56,189,248,0.35)' : 'rgba(56,189,248,0.35)'}`,
    boxShadow: isDarkMode ? '0 0 8px rgba(56,189,248,0.1)' : '0 0 6px rgba(56,189,248,0.08)',
  };

  const panelBg = isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)';
  const panelBorder = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const badges: Array<{ key: Section; label: string; show: boolean }> = [
    { key: 'food', label: `Food: ${foodName}`, show: !!foodName },
    { key: 'skills', label: `${skillCount} skills`, show: skillCount > 0 },
    { key: 'cp', label: 'CP', show: !!hasCp },
    { key: 'gear', label: `${hasGear ? Object.keys(gear!).length : 0} gear`, show: !!hasGear },
    { key: 'passives', label: `${passiveCount} passives`, show: passiveCount > 0 },
  ];

  return (
    <Box sx={{ mt: 0.75, pt: 0.75, borderTop: `1px solid ${panelBorder}` }}>
      {/* Badge chips row */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {badges
          .filter((b) => b.show)
          .map((badge) => (
            <ButtonBase
              key={badge.key}
              onClick={() => toggle(badge.key)}
              sx={{ borderRadius: '9px' }}
            >
              <Chip
                label={badge.label}
                size="small"
                sx={expanded.has(badge.key) ? chipActive : chipDefault}
              />
            </ButtonBase>
          ))}
      </Box>

      {/* Expandable sections */}
      <Collapse in={expanded.has('food')} timeout={200} unmountOnExit>
        <Box
          sx={{
            mt: 1,
            p: 1.25,
            borderRadius: '10px',
            backgroundColor: panelBg,
            border: `1px solid ${panelBorder}`,
          }}
        >
          <SectionHeader label="Food / Drink" />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.primary' }}>
            {foodName}
          </Typography>
          {food?.id != null && ESO_CONSUMABLE_LOOKUP[food.id] && (
            <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', mt: 0.25 }}>
              Item ID: {food.id}
            </Typography>
          )}
        </Box>
      </Collapse>

      <Collapse in={expanded.has('skills')} timeout={200} unmountOnExit>
        <Box
          sx={{
            mt: 1,
            p: 1.25,
            borderRadius: '10px',
            backgroundColor: panelBg,
            border: `1px solid ${panelBorder}`,
          }}
        >
          <SectionHeader label="Skill Bars" />
          {skills && <SkillBarDisplay skills={skills} isDarkMode={isDarkMode} />}
        </Box>
      </Collapse>

      <Collapse in={expanded.has('cp')} timeout={200} unmountOnExit>
        <Box
          sx={{
            mt: 1,
            p: 1.25,
            borderRadius: '10px',
            backgroundColor: panelBg,
            border: `1px solid ${panelBorder}`,
          }}
        >
          <SectionHeader label="Champion Points" />
          {cpPoints && <CPDisplay cpPoints={cpPoints} isDarkMode={isDarkMode} />}
        </Box>
      </Collapse>

      <Collapse in={expanded.has('gear')} timeout={200} unmountOnExit>
        <Box
          sx={{
            mt: 1,
            p: 1.25,
            borderRadius: '10px',
            backgroundColor: panelBg,
            border: `1px solid ${panelBorder}`,
          }}
        >
          <SectionHeader label="Equipment" />
          {gear && <GearDisplay gear={gear} isDarkMode={isDarkMode} />}
        </Box>
      </Collapse>

      <Collapse in={expanded.has('passives')} timeout={200} unmountOnExit>
        <Box
          sx={{
            mt: 1,
            p: 1.25,
            borderRadius: '10px',
            backgroundColor: panelBg,
            border: `1px solid ${panelBorder}`,
          }}
        >
          <SectionHeader label="Passives" />
          {passives && <PassivesDisplay passives={passives} isDarkMode={isDarkMode} />}
        </Box>
      </Collapse>
    </Box>
  );
};
