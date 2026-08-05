/**
 * Core/Flex trait chips.
 *
 * This is the actual payoff of the feature. A newcomer's real question is not
 * "what is the top parse" but "which of these twelve things do I HAVE to have?" —
 * and a trait's share across an archetype answers that from data instead of
 * opinion. Core (≥80%) is effectively mandatory; Flex (35–80%) has real
 * alternatives, listed in the tooltip. Anything rarer is hidden behind a
 * disclosure so the card never becomes a wall.
 */

import { Box, Button, Chip, Tooltip, Typography } from '@mui/material';
import React, { useMemo, useState } from 'react';

import type { ClusterTrait, FeatureGroupKey } from '../types/clustering.types';

export interface TraitChipRowProps {
  title: string;
  group: FeatureGroupKey;
  core: readonly ClusterTrait[];
  flex: readonly ClusterTrait[];
  /** Traits below the flex threshold, revealed by "Show variations". */
  variations?: readonly ClusterTrait[];
}

const percent = (share: number): string => `${Math.round(share * 100)}%`;

/**
 * Groups where a single build holds SEVERAL of these at once — two five-piece
 * sets, six abilities per bar. Their siblings are things worn alongside, not
 * instead of, so the tooltip must not read as a choice between them.
 */
const MULTI_VALUED_GROUPS = new Set<FeatureGroupKey>([
  'fivePieceSets',
  'frontBar',
  'backBar',
  'cpSlottables',
]);

/**
 * What share of the archetype carries this trait, and what else appears in the
 * same slot.
 *
 * The phrasing branches on the group because the two cases mean different
 * things: a monster set is genuinely an either/or, while a build wears both of
 * its five-piece sets simultaneously. Saying "24% run Aegis Caller" next to a
 * five-piece set implied a swap that does not exist.
 */
function shareText(
  trait: ClusterTrait,
  siblings: readonly ClusterTrait[],
  group: FeatureGroupKey,
): string {
  const others = siblings.filter((candidate) => candidate.id !== trait.id).slice(0, 3);
  const multi = MULTI_VALUED_GROUPS.has(group);

  const lead = `${percent(trait.share)} of this build ${multi ? 'includes' : 'runs'} ${trait.label}.`;
  if (others.length === 0) return lead;

  const rest = others.map((c) => `${c.label} ${percent(c.share)}`).join(', ');
  return `${lead} ${multi ? 'Also seen here' : 'Alternatives'}: ${rest}.`;
}

export const TraitChipRow: React.FC<TraitChipRowProps> = ({
  title,
  group,
  core,
  flex,
  variations = [],
}) => {
  const [showVariations, setShowVariations] = useState(false);

  const coreOfGroup = useMemo(() => core.filter((t) => t.group === group), [core, group]);
  const flexOfGroup = useMemo(() => flex.filter((t) => t.group === group), [flex, group]);
  const rareOfGroup = useMemo(
    () => variations.filter((t) => t.group === group),
    [variations, group],
  );

  const siblings = useMemo(
    () => [...coreOfGroup, ...flexOfGroup, ...rareOfGroup],
    [coreOfGroup, flexOfGroup, rareOfGroup],
  );

  if (siblings.length === 0) return null;

  const renderChip = (trait: ClusterTrait, kind: 'core' | 'flex' | 'rare'): React.ReactNode => (
    <Tooltip key={`${trait.group}-${trait.id}`} title={shareText(trait, siblings, group)} arrow>
      <Chip
        label={
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <span>{trait.label}</span>
            <Box
              component="span"
              className="u-tabular"
              sx={{ opacity: 0.7, fontSize: '0.72rem', fontVariantNumeric: 'tabular-nums' }}
            >
              {percent(trait.share)}
            </Box>
          </Box>
        }
        size="small"
        // data-* attributes are what the component tests assert on, so the
        // Core/Flex distinction stays covered even if the styling changes.
        data-core={kind === 'core' ? 'true' : undefined}
        data-trait-kind={kind}
        data-testid={`trait-${trait.group}-${trait.id}`}
        sx={(theme) => ({
          borderRadius: 1.5,
          fontWeight: 600,
          border: '1px solid',
          ...(kind === 'core'
            ? {
                borderColor: theme.palette.success.main,
                backgroundColor: `${theme.palette.success.main}1f`,
                color: theme.palette.success.main,
              }
            : kind === 'flex'
              ? {
                  borderColor: theme.palette.warning.main,
                  backgroundColor: `${theme.palette.warning.main}18`,
                  color: theme.palette.warning.main,
                }
              : {
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.secondary,
                }),
        })}
      />
    </Tooltip>
  );

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        variant="caption"
        sx={{ display: 'block', mb: 0.75, opacity: 0.75, letterSpacing: 0.4 }}
      >
        {title}
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
        {coreOfGroup.map((trait) => renderChip(trait, 'core'))}
        {flexOfGroup.map((trait) => renderChip(trait, 'flex'))}
        {showVariations && rareOfGroup.map((trait) => renderChip(trait, 'rare'))}

        {rareOfGroup.length > 0 && (
          <Button
            size="small"
            variant="text"
            onClick={() => setShowVariations((value) => !value)}
            sx={{ textTransform: 'none', fontSize: '0.72rem', minWidth: 0, px: 0.75 }}
          >
            {showVariations ? 'Hide variations' : `Show ${rareOfGroup.length} variations`}
          </Button>
        )}
      </Box>
    </Box>
  );
};
