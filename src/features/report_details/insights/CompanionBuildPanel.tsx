import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorIcon from '@mui/icons-material/ErrorOutlined';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import WarningIcon from '@mui/icons-material/WarningAmberOutlined';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import React from 'react';

import type {
  AllocatedStar,
  ChampionPointsViewModel,
  ChampionTreeKey,
} from '@/features/loadout-manager/utils/esotkCompanionChampionPoints';
import { UNKNOWN_TREE } from '@/features/loadout-manager/utils/esotkCompanionChampionPoints';
import type {
  CoachingInsight,
  CoachingSeverity,
} from '@/features/loadout-manager/utils/esotkCompanionCoaching';
import { ChampionPointTree } from '@/types/champion-points';
import { buildVariantSx } from '@/utils/playerCardStyleUtils';

export interface CompanionBuildPanelProps {
  /** Champion-point view-model from the ESOTK Companion add-on, or null if none captured. */
  championPoints: ChampionPointsViewModel | null;
  /** Stat-aware coaching insights (penetration vs cap, crit caps, …). */
  coaching: CoachingInsight[];
}

const SECTION_TITLE_SX = {
  fontWeight: 'bold',
  mb: 1,
  fontFamily: 'Space Grotesk, sans-serif',
} as const;

// Display order + the chip style variant each tree maps to (matches PlayerCard's CP chips).
const TREE_ORDER: { tree: ChampionTreeKey; label: string; variant: string }[] = [
  { tree: ChampionPointTree.Warfare, label: 'Warfare', variant: 'championBlue' },
  { tree: ChampionPointTree.Fitness, label: 'Fitness', variant: 'championRed' },
  { tree: ChampionPointTree.Craft, label: 'Craft', variant: 'championGreen' },
  { tree: UNKNOWN_TREE, label: 'Other', variant: 'default' },
];

const SEVERITY_META: Record<
  CoachingSeverity,
  { color: 'success' | 'info' | 'warning' | 'error'; Icon: typeof CheckCircleIcon }
> = {
  good: { color: 'success', Icon: CheckCircleIcon },
  info: { color: 'info', Icon: InfoIcon },
  warn: { color: 'warning', Icon: WarningIcon },
  error: { color: 'error', Icon: ErrorIcon },
};

function StarChips({
  stars,
  variant,
  theme,
}: {
  stars: AllocatedStar[];
  variant: string;
  theme: Theme;
}): React.ReactElement {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {stars.map((star) => (
        <Chip
          key={star.id}
          size="small"
          label={`${star.name} ${star.points}`}
          title={`${star.name} — ${star.points} points (ID: ${star.id})`}
          sx={{
            ...(variant === 'default' ? {} : buildVariantSx(variant, theme)),
            '& .MuiChip-label': { fontSize: '0.58rem' },
          }}
        />
      ))}
    </Box>
  );
}

/**
 * Renders the build data captured by the ESOTK Companion add-on that ESO Logs can't see:
 * the full champion-point allocation (grouped by tree) and stat-aware coaching
 * (penetration vs cap, crit caps). Presentational only — feed it the view-model from
 * `buildChampionPointsViewModel` and insights from `computeStatCoaching`.
 *
 * Renders nothing when there's no companion data, so it's safe to always mount.
 */
export const CompanionBuildPanel: React.FC<CompanionBuildPanelProps> = ({
  championPoints,
  coaching,
}) => {
  const theme = useTheme();

  const hasCp =
    championPoints !== null &&
    (championPoints.allocated.length > 0 || championPoints.slotted.length > 0);
  const hasCoaching = coaching.length > 0;
  if (!hasCp && !hasCoaching) return null;

  return (
    <Box sx={{ mt: 1 }} data-testid="companion-build-panel">
      {hasCp && championPoints && (
        <Box sx={{ mb: hasCoaching ? 2 : 0 }}>
          <Typography variant="body2" sx={SECTION_TITLE_SX}>
            Champion Points
            {championPoints.total !== undefined && (
              <Typography
                component="span"
                variant="caption"
                sx={{ ml: 1, color: 'text.secondary' }}
              >
                {championPoints.total.toLocaleString()} CP ·{' '}
                {championPoints.totalAllocated.toLocaleString()} allocated
              </Typography>
            )}
          </Typography>

          {TREE_ORDER.map(({ tree, label, variant }) => {
            const stars = championPoints.byTree[tree];
            if (!stars || stars.length === 0) return null;
            return (
              <Box key={label} sx={{ mb: 0.75 }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}
                >
                  {label}
                </Typography>
                <StarChips stars={stars} variant={variant} theme={theme} />
              </Box>
            );
          })}

          {championPoints.slotted.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}
              >
                Slotted
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {championPoints.slotted.map((s) => (
                  <Chip
                    key={s.slot}
                    size="small"
                    variant="outlined"
                    label={s.name}
                    title={`Slot ${s.slot}: ${s.name} (ID: ${s.id})`}
                    sx={{ '& .MuiChip-label': { fontSize: '0.58rem' } }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {hasCoaching && (
        <Box>
          <Typography variant="body2" sx={SECTION_TITLE_SX}>
            Build Coaching
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {coaching.map((insight) => {
              const { color, Icon } = SEVERITY_META[insight.severity];
              return (
                <Tooltip key={insight.id} title={insight.detail} placement="top-start">
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                    <Icon fontSize="small" color={color} sx={{ mt: '1px', flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                        {insight.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', display: 'block' }}
                      >
                        {insight.detail}
                      </Typography>
                    </Box>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};
