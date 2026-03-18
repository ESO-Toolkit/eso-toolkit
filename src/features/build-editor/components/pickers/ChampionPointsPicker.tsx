/**
 * ChampionPointsPicker — prop-driven version of ChampionSection.
 *
 * Three-tree CP picker with slottable perks and passive star allocation.
 * No Redux coupling — takes cp via props and calls onChange on mutation.
 * ChampionSection wraps this with useSelector / dispatch.
 */

import { Box, ButtonBase, Divider, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useMemo, useState } from 'react';

import { CHAMPION_POINT_ABILITIES, ChampionPointTree } from '@/types/champion-points';

import { CP_PASSIVES_BY_TREE, type CPPassive } from '../../data/championPassives';
import type { BuildChampionPoints, ChampionTree } from '../../types/build.types';

// ─── Tree config ──────────────────────────────────────────────────────────────

interface TreeConfig {
  key: keyof BuildChampionPoints;
  label: string;
  color: string;
  colorRgb: string;
  cpTree: ChampionPointTree;
  icon: string;
}

const TREES: TreeConfig[] = [
  {
    key: 'warfare',
    label: 'Warfare',
    color: '#42a5f5',
    colorRgb: '66, 165, 245',
    cpTree: ChampionPointTree.Warfare,
    icon: '⚔',
  },
  {
    key: 'fitness',
    label: 'Fitness',
    color: '#ef5350',
    colorRgb: '239, 83, 80',
    cpTree: ChampionPointTree.Fitness,
    icon: '🛡',
  },
  {
    key: 'craft',
    label: 'Craft',
    color: '#66bb6a',
    colorRgb: '102, 187, 106',
    cpTree: ChampionPointTree.Craft,
    icon: '⚒',
  },
];

const getSlottableByTree = (
  tree: ChampionPointTree,
): NonNullable<(typeof CHAMPION_POINT_ABILITIES)[keyof typeof CHAMPION_POINT_ABILITIES]>[] =>
  Object.values(CHAMPION_POINT_ABILITIES).filter(
    (e) => e != null && e.tree === tree,
  ) as NonNullable<(typeof CHAMPION_POINT_ABILITIES)[keyof typeof CHAMPION_POINT_ABILITIES]>[];

// ─── Champion Slot Card ─────────────────────────────────────────────────────

interface CPSlotProps {
  treeKey: keyof BuildChampionPoints;
  slotIndex: number;
  cpId: number | null;
  tree: TreeConfig;
  options: ReturnType<typeof getSlottableByTree>;
  onSlotChange: (
    treeKey: keyof BuildChampionPoints,
    slotIndex: number,
    cpId: number | null,
  ) => void;
}

const CPSlot: React.FC<CPSlotProps> = ({
  treeKey,
  slotIndex,
  cpId,
  tree,
  options,
  onSlotChange,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const entry =
    cpId != null ? CHAMPION_POINT_ABILITIES[cpId as keyof typeof CHAMPION_POINT_ABILITIES] : null;

  const handleClick = (): void => {
    if (!options.length) return;
    const currentIdx = cpId != null ? options.findIndex((e) => e.id === cpId) : -1;
    const nextIdx = (currentIdx + 1) % (options.length + 1);
    const nextId = nextIdx < options.length ? (options[nextIdx].id as number) : null;
    onSlotChange(treeKey, slotIndex, nextId);
  };

  return (
    <Tooltip title={entry ? entry.name : 'Click to cycle champion perks'} placement="top" arrow>
      <Box
        onClick={handleClick}
        sx={{
          flex: '1 1 calc(50% - 6px)',
          minHeight: 68,
          borderRadius: 2.5,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 1.5,
          py: 1,
          background: cpId
            ? isDark
              ? `linear-gradient(135deg, rgba(${tree.colorRgb}, 0.14) 0%, rgba(${tree.colorRgb}, 0.04) 100%)`
              : `linear-gradient(135deg, rgba(${tree.colorRgb}, 0.10) 0%, rgba(${tree.colorRgb}, 0.02) 100%)`
            : isDark
              ? 'rgba(255, 255, 255, 0.025)'
              : 'rgba(0, 0, 0, 0.018)',
          cursor: 'pointer',
          border: `1.5px ${cpId ? 'solid' : 'dashed'} ${
            cpId
              ? isDark
                ? `rgba(${tree.colorRgb}, 0.40)`
                : `rgba(${tree.colorRgb}, 0.28)`
              : isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.06)'
          }`,
          boxShadow: cpId
            ? `0 4px 16px rgba(${tree.colorRgb}, 0.10), inset 0 1px 0 rgba(${tree.colorRgb}, 0.08)`
            : isDark
              ? 'inset 0 1px 0 rgba(255,255,255,0.02)'
              : 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            background: cpId
              ? isDark
                ? `rgba(${tree.colorRgb}, 0.22)`
                : `rgba(${tree.colorRgb}, 0.14)`
              : isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.035)',
            borderStyle: 'solid',
            borderColor: isDark ? `rgba(${tree.colorRgb}, 0.50)` : `rgba(${tree.colorRgb}, 0.35)`,
            boxShadow: `0 6px 20px rgba(${tree.colorRgb}, 0.14)`,
            transform: 'translateY(-1px)',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '15%',
            bottom: '15%',
            width: 3,
            borderRadius: '0 3px 3px 0',
            background: cpId
              ? tree.color
              : isDark
                ? `rgba(${tree.colorRgb}, 0.25)`
                : `rgba(${tree.colorRgb}, 0.18)`,
            boxShadow: cpId ? `0 0 8px rgba(${tree.colorRgb}, 0.40)` : 'none',
            transition: 'all 0.2s',
          },
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            flexShrink: 0,
            transform: 'rotate(45deg)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: cpId
              ? isDark
                ? `linear-gradient(135deg, rgba(${tree.colorRgb}, 0.30) 0%, rgba(${tree.colorRgb}, 0.12) 100%)`
                : `linear-gradient(135deg, rgba(${tree.colorRgb}, 0.22) 0%, rgba(${tree.colorRgb}, 0.08) 100%)`
              : isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.04)',
            border: `1px solid ${
              cpId
                ? `rgba(${tree.colorRgb}, ${isDark ? 0.5 : 0.35})`
                : isDark
                  ? 'rgba(255,255,255,0.10)'
                  : 'rgba(0,0,0,0.08)'
            }`,
            boxShadow: cpId ? `0 0 10px rgba(${tree.colorRgb}, 0.20)` : 'none',
            transition: 'all 0.2s',
          }}
        >
          <Typography
            sx={{
              transform: 'rotate(-45deg)',
              fontWeight: 800,
              fontSize: 11,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              color: cpId ? tree.color : isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.22)',
              lineHeight: 1,
              textShadow: cpId ? `0 0 6px rgba(${tree.colorRgb}, 0.4)` : 'none',
            }}
          >
            {slotIndex + 1}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {entry ? (
            <Typography
              variant="caption"
              fontWeight={700}
              display="block"
              noWrap
              sx={{
                color: tree.color,
                fontSize: 12,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                textShadow: `0 0 8px rgba(${tree.colorRgb}, 0.3)`,
                lineHeight: 1.3,
              }}
            >
              {entry.name}
            </Typography>
          ) : (
            <Typography
              variant="caption"
              display="block"
              sx={{
                color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.28)',
                fontSize: 11,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontStyle: 'italic',
              }}
            >
              Empty slot
            </Typography>
          )}
        </Box>
      </Box>
    </Tooltip>
  );
};

// ─── Passive Row ──────────────────────────────────────────────────────────────

interface PassiveRowProps {
  treeKey: keyof BuildChampionPoints;
  passive: CPPassive;
  points: number;
  treeColor: string;
  treeColorRgb: string;
  onPassiveChange: (treeKey: keyof BuildChampionPoints, cpId: string, points: number) => void;
}

const PassiveRow: React.FC<PassiveRowProps> = ({
  treeKey,
  passive,
  points,
  treeColor,
  treeColorRgb,
  onPassiveChange,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pct = (points / passive.maxPoints) * 100;

  const adjust = (delta: number): void => {
    onPassiveChange(treeKey, passive.id, Math.max(0, Math.min(passive.maxPoints, points + delta)));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.5,
        px: 1,
        borderRadius: 1.5,
        position: 'relative',
        transition: 'all 0.15s ease',
        '&:hover': {
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          fontWeight={600}
          display="block"
          noWrap
          sx={{
            fontSize: 11,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: points > 0 ? 'text.primary' : 'text.secondary',
          }}
        >
          {passive.name}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        <ButtonBase
          onClick={() => adjust(-1)}
          disabled={points === 0}
          aria-label={`Decrease ${passive.name}`}
          sx={{
            width: 28,
            height: 28,
            borderRadius: '6px',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            fontWeight: 700,
            fontSize: 12,
            transition: 'all 0.12s',
            '&:hover:not(:disabled)': {
              background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
            },
            '&:disabled': { opacity: 0.2, border: '1px solid transparent' },
          }}
        >
          −
        </ButtonBase>

        <Box sx={{ display: 'flex', gap: '1.5px', alignItems: 'center', mx: 0.25 }}>
          {passive.maxPoints <= 1 ? (
            <Box
              sx={{
                width: 28,
                height: 6,
                borderRadius: 3,
                background:
                  points > 0 ? treeColor : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                boxShadow: points > 0 ? `0 0 6px rgba(${treeColorRgb}, 0.35)` : 'none',
                transition: 'all 0.2s',
              }}
            />
          ) : (
            <Box
              sx={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${pct}%`,
                  borderRadius: 2,
                  background: `linear-gradient(90deg, rgba(${treeColorRgb}, 0.70) 0%, ${treeColor} 100%)`,
                  boxShadow: points > 0 ? `0 0 4px rgba(${treeColorRgb}, 0.30)` : 'none',
                  transition: 'width 0.2s ease',
                }}
              />
            </Box>
          )}
        </Box>

        <Typography
          variant="caption"
          sx={{
            minWidth: 26,
            textAlign: 'center',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: points > 0 ? treeColor : 'text.disabled',
            fontSize: 10,
          }}
        >
          {points}/{passive.maxPoints}
        </Typography>

        <ButtonBase
          onClick={() => adjust(1)}
          disabled={points === passive.maxPoints}
          aria-label={`Increase ${passive.name}`}
          sx={{
            width: 20,
            height: 20,
            borderRadius: '6px',
            background: isDark ? `rgba(${treeColorRgb}, 0.14)` : `rgba(${treeColorRgb}, 0.10)`,
            border: `1px solid rgba(${treeColorRgb}, 0.30)`,
            color: treeColor,
            fontWeight: 700,
            fontSize: 12,
            transition: 'all 0.12s',
            '&:hover:not(:disabled)': {
              background: isDark ? `rgba(${treeColorRgb}, 0.24)` : `rgba(${treeColorRgb}, 0.18)`,
              boxShadow: `0 0 6px rgba(${treeColorRgb}, 0.20)`,
            },
            '&:disabled': { opacity: 0.2, border: '1px solid transparent' },
          }}
        >
          +
        </ButtonBase>
      </Box>
    </Box>
  );
};

// ─── Tree Panel ──────────────────────────────────────────────────────────────

interface TreePanelProps {
  tree: TreeConfig;
  cp: BuildChampionPoints;
  onSlotChange: (
    treeKey: keyof BuildChampionPoints,
    slotIndex: number,
    cpId: number | null,
  ) => void;
  onPassiveChange: (treeKey: keyof BuildChampionPoints, cpId: string, points: number) => void;
}

const TreePanel: React.FC<TreePanelProps> = ({ tree, cp, onSlotChange, onPassiveChange }) => {
  const cpTree: ChampionTree | undefined = cp[tree.key];
  const slottable = useMemo(() => getSlottableByTree(tree.cpTree), [tree.cpTree]);
  const passives = CP_PASSIVES_BY_TREE[tree.key];
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!cpTree) return null;

  const totalAllocated = passives.reduce((sum, p) => sum + (cpTree.passives[p.id] ?? 0), 0);
  const totalMax = passives.reduce((sum, p) => sum + p.maxPoints, 0);

  return (
    <Stack spacing={2}>
      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.38)',
              fontFamily: 'Space Grotesk, Inter, system-ui',
            }}
          >
            Active Perks
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: 10,
              color: tree.color,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              opacity: 0.7,
            }}
          >
            {cpTree.slots.filter(Boolean).length}/4 slotted
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {cpTree.slots.map((cpId, i) => (
            <CPSlot
              key={i}
              treeKey={tree.key}
              slotIndex={i}
              cpId={cpId}
              tree={tree}
              options={slottable}
              onSlotChange={onSlotChange}
            />
          ))}
        </Box>
      </Box>

      <Divider sx={{ opacity: 0.15, borderColor: `rgba(${tree.colorRgb}, 0.30)` }} />

      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 0.75,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.38)',
              fontFamily: 'Space Grotesk, Inter, system-ui',
            }}
          >
            Passive Stars
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: 10,
              color: totalAllocated > 0 ? tree.color : 'text.disabled',
              fontFamily: 'Space Grotesk, Inter, system-ui',
            }}
          >
            {totalAllocated}/{totalMax}
          </Typography>
        </Box>

        <Box
          sx={{
            height: 3,
            borderRadius: 2,
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            overflow: 'hidden',
            mb: 1,
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${totalMax > 0 ? (totalAllocated / totalMax) * 100 : 0}%`,
              borderRadius: 2,
              background: `linear-gradient(90deg, rgba(${tree.colorRgb}, 0.50) 0%, ${tree.color} 100%)`,
              boxShadow: totalAllocated > 0 ? `0 0 6px rgba(${tree.colorRgb}, 0.30)` : 'none',
              transition: 'width 0.3s ease',
            }}
          />
        </Box>

        <Stack spacing={0.15}>
          {passives.map((p) => (
            <PassiveRow
              key={p.id}
              treeKey={tree.key}
              passive={p}
              points={cpTree.passives[p.id] ?? 0}
              treeColor={tree.color}
              treeColorRgb={tree.colorRgb}
              onPassiveChange={onPassiveChange}
            />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
};

// ─── Public Props ──────────────────────────────────────────────────────────────

export interface ChampionPointsPickerProps {
  cp: BuildChampionPoints;
  onChange: (updated: BuildChampionPoints) => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const ChampionPointsPicker: React.FC<ChampionPointsPickerProps> = ({ cp, onChange }) => {
  const [activeTree, setActiveTree] = useState<keyof BuildChampionPoints>('warfare');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const currentTree = TREES.find((t) => t.key === activeTree)!;
  const activeIndex = TREES.findIndex((t) => t.key === activeTree);

  const handleSlotChange = (
    treeKey: keyof BuildChampionPoints,
    slotIndex: number,
    cpId: number | null,
  ): void => {
    const tree = cp[treeKey];
    const newSlots = [...tree.slots] as ChampionTree['slots'];
    newSlots[slotIndex] = cpId;
    onChange({ ...cp, [treeKey]: { ...tree, slots: newSlots } });
  };

  const handlePassiveChange = (
    treeKey: keyof BuildChampionPoints,
    cpId: string,
    points: number,
  ): void => {
    const tree = cp[treeKey];
    onChange({
      ...cp,
      [treeKey]: { ...tree, passives: { ...tree.passives, [cpId]: points } },
    });
  };

  return (
    <Stack spacing={2}>
      {/* ── Segmented tree selector ── */}
      <Box
        role="tablist"
        aria-label="Champion point trees"
        sx={{
          display: 'flex',
          position: 'relative',
          borderRadius: 2,
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
          p: '3px',
          overflow: 'hidden',
        }}
      >
        {/* Sliding highlight */}
        <Box
          sx={{
            position: 'absolute',
            top: 3,
            bottom: 3,
            left: `calc(${(activeIndex / 3) * 100}% + 3px)`,
            width: 'calc(33.333% - 2px)',
            borderRadius: 1.5,
            background: isDark
              ? `linear-gradient(135deg, rgba(${currentTree.colorRgb}, 0.18) 0%, rgba(${currentTree.colorRgb}, 0.06) 100%)`
              : `linear-gradient(135deg, rgba(${currentTree.colorRgb}, 0.14) 0%, rgba(${currentTree.colorRgb}, 0.04) 100%)`,
            border: `1px solid rgba(${currentTree.colorRgb}, ${isDark ? 0.3 : 0.2})`,
            boxShadow: `0 0 12px rgba(${currentTree.colorRgb}, 0.12), inset 0 1px 0 rgba(${currentTree.colorRgb}, 0.08)`,
            transition:
              'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.25s, border-color 0.25s, box-shadow 0.25s',
            zIndex: 0,
          }}
        />

        {TREES.map((t) => {
          const isActive = activeTree === t.key;
          return (
            <Box
              key={t.key}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTree(t.key)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTree(t.key);
                }
              }}
              sx={{
                flex: 1,
                py: 0.75,
                cursor: 'pointer',
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.75,
                borderRadius: 1.5,
                transition: 'all 0.2s',
                userSelect: 'none',
                '&:focus-visible': {
                  outline: `2px solid rgba(${t.colorRgb}, 0.7)`,
                  outlineOffset: -2,
                },
                '&:hover': {
                  background: isActive
                    ? 'transparent'
                    : isDark
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(0,0,0,0.03)',
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  lineHeight: 1,
                  filter: isActive ? `drop-shadow(0 0 4px rgba(${t.colorRgb}, 0.5))` : 'none',
                  transition: 'filter 0.2s',
                }}
              >
                {t.icon}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? t.color : 'text.secondary',
                  fontSize: 12,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  letterSpacing: isActive ? 0.3 : 0,
                  textShadow: isActive ? `0 0 8px rgba(${t.colorRgb}, 0.4)` : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {t.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* ── Active tree content ── */}
      <TreePanel
        tree={currentTree}
        cp={cp}
        onSlotChange={handleSlotChange}
        onPassiveChange={handlePassiveChange}
      />
    </Stack>
  );
};
