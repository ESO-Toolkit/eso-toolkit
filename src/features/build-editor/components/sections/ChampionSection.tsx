/**
 * Champion Section — three trees (Warfare, Fitness, Craft).
 * Each tree shows 4 slottable CP perks and passive star counters.
 */

import {
  Box,
  ButtonBase,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';
import {
  CHAMPION_POINT_ABILITIES,
  ChampionPointTree,
} from '@/types/champion-points';

import { CP_PASSIVES_BY_TREE, type CPPassive } from '../../data/championPassives';
import {
  setChampionPassive,
  setChampionTreeSlot,
} from '../../store/buildEditorSlice';
import type { BuildChampionPoints } from '../../types/build.types';

// ─── Tree config ──────────────────────────────────────────────────────────────

interface TreeConfig {
  key: keyof BuildChampionPoints;
  label: string;
  color: string;
  cpTree: ChampionPointTree;
}

const TREES: TreeConfig[] = [
  { key: 'warfare', label: 'Warfare', color: '#ef5350', cpTree: ChampionPointTree.Warfare },
  { key: 'fitness', label: 'Fitness', color: '#42a5f5', cpTree: ChampionPointTree.Fitness },
  { key: 'craft', label: 'Craft', color: '#66bb6a', cpTree: ChampionPointTree.Craft },
];

// ─── Slottable perk data per tree ─────────────────────────────────────────────

const getSlottableByTree = (
  tree: ChampionPointTree,
): NonNullable<(typeof CHAMPION_POINT_ABILITIES)[keyof typeof CHAMPION_POINT_ABILITIES]>[] =>
  Object.values(CHAMPION_POINT_ABILITIES).filter(
    (e) => e != null && e.tree === tree,
  ) as NonNullable<(typeof CHAMPION_POINT_ABILITIES)[keyof typeof CHAMPION_POINT_ABILITIES]>[];

// ─── Champion Slot (active perk) ─────────────────────────────────────────────

interface CPSlotProps {
  treeKey: keyof BuildChampionPoints;
  slotIndex: number;
  cpId: number | null;
  treeColor: string;
  options: ReturnType<typeof getSlottableByTree>;
}

const CPSlot: React.FC<CPSlotProps> = ({ treeKey, slotIndex, cpId, treeColor, options }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const entry = cpId != null ? CHAMPION_POINT_ABILITIES[cpId as keyof typeof CHAMPION_POINT_ABILITIES] : null;

  const handleClick = (): void => {
    if (!options.length) return;
    const currentIdx = cpId != null ? options.findIndex((e) => e.id === cpId) : -1;
    const nextIdx = (currentIdx + 1) % (options.length + 1);
    const nextId = nextIdx < options.length ? (options[nextIdx].id as number) : null;
    dispatch(setChampionTreeSlot({ tree: treeKey, slotIndex, cpId: nextId }));
  };

  return (
    <Tooltip title={entry ? entry.name : 'Click to cycle through champion perks'}>
      <Box
        onClick={handleClick}
        sx={{
          flex: '0 0 calc(50% - 4px)',
          minHeight: 52,
          borderRadius: 2,
          border: `1.5px dashed ${cpId ? treeColor : isDark ? alpha('#fff', 0.18) : alpha('#000', 0.15)}`,
          background: cpId
            ? isDark ? alpha(treeColor, 0.1) : alpha(treeColor, 0.06)
            : isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.14s',
          p: 1,
          '&:hover': {
            background: cpId
              ? isDark ? alpha(treeColor, 0.18) : alpha(treeColor, 0.1)
              : isDark ? alpha('#fff', 0.06) : alpha('#000', 0.04),
            borderStyle: 'solid',
          },
        }}
      >
        {entry ? (
          <Typography variant="caption" fontWeight={700} color={treeColor} sx={{ textAlign: 'center', lineHeight: 1.3 }}>
            {entry.name}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.disabled">
            Empty Slot
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

// ─── Passive Row ──────────────────────────────────────────────────────────────

interface PassiveRowProps {
  treeKey: keyof BuildChampionPoints;
  passive: CPPassive;
  points: number;
}

const PassiveRow: React.FC<PassiveRowProps> = ({ treeKey, passive, points }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const adjust = (delta: number): void => {
    dispatch(
      setChampionPassive({
        tree: treeKey,
        cpId: passive.id,
        points: Math.max(0, Math.min(passive.maxPoints, points + delta)),
      }),
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.75,
        px: 1.25,
        borderRadius: 1.5,
        background: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.015),
        '&:hover': {
          background: isDark ? alpha('#fff', 0.04) : alpha('#000', 0.03),
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" fontWeight={600} display="block" noWrap>
          {passive.name}
        </Typography>
        <Typography
          variant="caption"
          color="text.disabled"
          display="block"
          sx={{ fontSize: 10, whiteSpace: 'normal', lineHeight: 1.4 }}
        >
          {passive.description}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        <ButtonBase
          onClick={() => adjust(-1)}
          disabled={points === 0}
          sx={{
            width: 22,
            height: 22,
            borderRadius: '6px',
            background: isDark ? alpha('#fff', 0.07) : alpha('#000', 0.07),
            color: 'text.primary',
            fontWeight: 700,
            fontSize: 13,
            '&:disabled': { opacity: 0.3 },
          }}
        >
          −
        </ButtonBase>
        <Typography
          variant="caption"
          sx={{
            minWidth: 22,
            textAlign: 'center',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: points > 0 ? 'text.primary' : 'text.disabled',
          }}
        >
          {points}
        </Typography>
        <ButtonBase
          onClick={() => adjust(1)}
          disabled={points === passive.maxPoints}
          sx={{
            width: 22,
            height: 22,
            borderRadius: '6px',
            background: isDark ? alpha('#38bdf8', 0.2) : alpha('#0f172a', 0.12),
            color: isDark ? '#38bdf8' : 'text.primary',
            fontWeight: 700,
            fontSize: 13,
            '&:disabled': { opacity: 0.3 },
          }}
        >
          +
        </ButtonBase>
      </Box>
    </Box>
  );
};

// ─── Tree Panel ───────────────────────────────────────────────────────────────

interface TreePanelProps {
  tree: TreeConfig;
}

const TreePanel: React.FC<TreePanelProps> = ({ tree }) => {
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const cpTree = build.setups[activeSetupIndex]?.cp[tree.key];
  const slottable = useMemo(() => getSlottableByTree(tree.cpTree), [tree.cpTree]);
  const passives = CP_PASSIVES_BY_TREE[tree.key];

  if (!cpTree) return null;

  return (
    <Stack spacing={2}>
      {/* 4 Slottable champion perk slots */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>
          Champion Slots
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {cpTree.slots.map((cpId, i) => (
            <CPSlot
              key={i}
              treeKey={tree.key}
              slotIndex={i}
              cpId={cpId}
              treeColor={tree.color}
              options={slottable}
            />
          ))}
        </Box>
      </Box>

      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
        Click a slot to cycle through available champion perks
      </Typography>

      <Divider sx={{ opacity: 0.4 }} />

      {/* Passive stars */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 0.75, display: 'block' }}>
          Passive Stars
        </Typography>
        <Stack spacing={0.25}>
          {passives.map((p) => (
            <PassiveRow
              key={p.id}
              treeKey={tree.key}
              passive={p}
              points={cpTree.passives[p.id] ?? 0}
            />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ChampionSection: React.FC = () => {
  const [activeTree, setActiveTree] = useState<keyof BuildChampionPoints>('warfare');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const currentTree = TREES.find((t) => t.key === activeTree)!;

  return (
    <Stack spacing={2}>
      {/* Tree Tabs */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        {TREES.map((t) => (
          <Box
            key={t.key}
            onClick={() => setActiveTree(t.key)}
            sx={{
              flex: 1,
              py: 1,
              px: 1.5,
              borderRadius: 2,
              cursor: 'pointer',
              textAlign: 'center',
              border: `2px solid ${activeTree === t.key ? t.color : 'transparent'}`,
              background:
                activeTree === t.key
                  ? isDark ? alpha(t.color, 0.15) : alpha(t.color, 0.1)
                  : isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
              transition: 'all 0.15s',
              '&:hover': {
                background: isDark ? alpha(t.color, 0.1) : alpha(t.color, 0.07),
              },
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ color: activeTree === t.key ? t.color : 'text.secondary' }}
            >
              {t.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <TreePanel tree={currentTree} />
    </Stack>
  );
};
