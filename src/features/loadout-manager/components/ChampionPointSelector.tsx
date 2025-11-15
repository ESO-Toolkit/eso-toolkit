/**
 * Champion Points Selector Component
 * Presents imported champion point assignments grouped by tree.
 */

import {
  Paper,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useMemo } from 'react';

import { ChampionPointsConfig } from '../types/loadout.types';
import {
  CHAMPION_POINT_ABILITIES,
  ChampionPointAbilityId,
  type ChampionPointAbilityMetadata,
} from '@/types/champion-points';

interface ChampionPointSelectorProps {
  championPoints: ChampionPointsConfig;
  trialId: string;
  pageIndex: number;
  setupIndex: number;
}

// CP slot indices (1-12)
const CP_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Human-friendly CP tree names
const CP_TREES = {
  craft: 'Craft',
  warfare: 'Warfare',
  fitness: 'Fitness',
};

type TreeKey = keyof typeof CP_TREES;

interface TreeVisualStyle {
  cardBorder: string;
  cardBackground: string;
  slotBackgroundFilled: string;
  slotBorderFilled: string;
  slotBackgroundEmpty: string;
  slotBorderEmpty: string;
  chipColor: 'success' | 'info' | 'error';
  titleColor: string;
}

export const ChampionPointSelector: React.FC<ChampionPointSelectorProps> = ({
  championPoints,
}) => {
  const theme = useTheme();

  const slotsByTree = useMemo(
    () => ({
      craft: CP_SLOTS.slice(0, 4),
      warfare: CP_SLOTS.slice(4, 8),
      fitness: CP_SLOTS.slice(8, 12),
    }),
    [],
  );

  const treeVisuals = useMemo<Record<TreeKey, TreeVisualStyle>>(
    () => ({
      craft: {
        cardBorder: alpha(theme.palette.success.main, 0.35),
        cardBackground: alpha(theme.palette.success.main, 0.07),
        slotBackgroundFilled: alpha(theme.palette.success.main, 0.18),
        slotBorderFilled: alpha(theme.palette.success.main, 0.55),
        slotBackgroundEmpty: alpha(theme.palette.success.main, 0.08),
        slotBorderEmpty: alpha(theme.palette.success.main, 0.25),
        chipColor: 'success',
        titleColor: theme.palette.success.light,
      },
      warfare: {
        cardBorder: alpha(theme.palette.info.main, 0.35),
        cardBackground: alpha(theme.palette.info.main, 0.07),
        slotBackgroundFilled: alpha(theme.palette.info.main, 0.18),
        slotBorderFilled: alpha(theme.palette.info.main, 0.55),
        slotBackgroundEmpty: alpha(theme.palette.info.main, 0.08),
        slotBorderEmpty: alpha(theme.palette.info.main, 0.25),
        chipColor: 'info',
        titleColor: theme.palette.info.light,
      },
      fitness: {
        cardBorder: alpha(theme.palette.error.main, 0.35),
        cardBackground: alpha(theme.palette.error.main, 0.07),
        slotBackgroundFilled: alpha(theme.palette.error.main, 0.18),
        slotBorderFilled: alpha(theme.palette.error.main, 0.55),
        slotBackgroundEmpty: alpha(theme.palette.error.main, 0.08),
        slotBorderEmpty: alpha(theme.palette.error.main, 0.25),
        chipColor: 'error',
        titleColor: theme.palette.error.light,
      },
    }),
    [theme],
  );

  const resolveChampionPoint = (cpId?: number): ChampionPointAbilityMetadata | undefined => {
    if (!cpId) {
      return undefined;
    }

    const metadata = CHAMPION_POINT_ABILITIES[cpId as ChampionPointAbilityId];
    if (metadata) {
      return metadata;
    }

    return undefined;
  };

  const getSlotStatus = (slotIndex: number): 'empty' | 'filled' => {
    return championPoints[slotIndex] ? 'filled' : 'empty';
  };

  const getFilledCount = (): number => {
    return Object.values(championPoints).filter(Boolean).length;
  };

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1">Champion Points Selected</Typography>
          <Chip
            label={`${getFilledCount()} / ${CP_SLOTS.length} slots filled`}
            color={getFilledCount() === CP_SLOTS.length ? 'success' : 'default'}
          />
        </Stack>
      </Paper>

      <Stack spacing={{ xs: 2, md: 2.75 }}>
        {Object.entries(slotsByTree).map(([treeKey, slots]) => {
          const typedKey = treeKey as TreeKey;
          return (
            <CPTree
              key={treeKey}
              treeName={CP_TREES[typedKey]}
              slots={slots}
              championPoints={championPoints}
              getSlotStatus={getSlotStatus}
              resolveChampionPoint={resolveChampionPoint}
              visuals={treeVisuals[typedKey]}
            />
          );
        })}
      </Stack>
    </Stack>
  );
};

interface CPTreeProps {
  treeName: string;
  slots: number[];
  championPoints: ChampionPointsConfig;
  getSlotStatus: (slotIndex: number) => 'empty' | 'filled';
  resolveChampionPoint: (cpId?: number) => ChampionPointAbilityMetadata | undefined;
  visuals: TreeVisualStyle;
}

const CPTree: React.FC<CPTreeProps> = ({
  treeName,
  slots,
  championPoints,
  getSlotStatus,
  resolveChampionPoint,
  visuals,
}) => {
  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: visuals.cardBorder,
        backgroundColor: visuals.cardBackground,
        backdropFilter: 'blur(2px)',
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="h6" sx={{ color: visuals.titleColor, fontWeight: 700 }}>
          {treeName}
        </Typography>
        <Stack spacing={1.25}>
          {slots.map((slotIndex) => {
            const status = getSlotStatus(slotIndex);
            const cpId = championPoints[slotIndex];
            const cpMetadata = resolveChampionPoint(cpId);
            const hasChampionPoint = Boolean(cpId);
            const isFilled = status === 'filled';

            return (
              <Paper
                key={slotIndex}
                variant="outlined"
                sx={{
                  px: 1.75,
                  py: 1.35,
                  minHeight: 78,
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: isFilled ? visuals.slotBackgroundFilled : visuals.slotBackgroundEmpty,
                  borderColor: isFilled ? visuals.slotBorderFilled : visuals.slotBorderEmpty,
                  transition: 'background-color 120ms ease, border-color 120ms ease',
                }}
              >
                {cpMetadata ? (
                  <Stack spacing={0.35} sx={{ width: '100%' }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}
                    >
                      {cpMetadata.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {treeName} • ID {cpMetadata.id}
                      {!cpMetadata.verified && ' • Unverified mapping'}
                    </Typography>
                  </Stack>
                ) : hasChampionPoint ? (
                  <Tooltip title="Champion point ID not yet mapped in metadata">
                    <Chip label={`Unknown CP ${cpId}`} size="small" color={visuals.chipColor} />
                  </Tooltip>
                ) : (
                  <Chip label="Empty" size="small" variant="outlined" />
                )}
              </Paper>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};
