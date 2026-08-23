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
import { alpha } from '@mui/material/styles';
import React, { useMemo, useState } from 'react';

import type { ClusterTrait, FeatureGroupKey } from '../types/clustering.types';

export interface TraitChipRowProps {
  title: string;
  group: FeatureGroupKey | readonly FeatureGroupKey[];
  core: readonly ClusterTrait[];
  flex: readonly ClusterTrait[];
  /** Traits below the flex threshold, revealed by "Show variations". */
  variations?: readonly ClusterTrait[];
  /** Cap core + common traits for a compact composition preview. */
  maxVisible?: number;
  /** Hide the less-common disclosure in compact previews. */
  showVariationsControl?: boolean;
}

const percent = (share: number): string => `${Math.round(share * 100)}%`;

type TraitKind = 'core' | 'flex' | 'rare';

const SEGMENT_LABELS: Record<TraitKind, string> = {
  core: 'Core · 80%+',
  flex: 'Common options',
  rare: 'Less common',
};

const GROUP_LABELS: Partial<Record<FeatureGroupKey, string>> = {
  fivePieceSets: 'Set',
  monsterSet: 'Monster',
  mythic: 'Mythic',
  arena: 'Arena',
  frontBar: 'Front',
  backBar: 'Back',
};

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
  maxVisible,
  showVariationsControl = true,
}) => {
  const [showVariations, setShowVariations] = useState(false);
  const groups = useMemo<readonly FeatureGroupKey[]>(
    () => (Array.isArray(group) ? group : [group]),
    [group],
  );
  const isCombinedGroup = groups.length > 1;

  const coreOfGroup = useMemo(
    () => core.filter((trait) => groups.includes(trait.group)),
    [core, groups],
  );
  const flexOfGroup = useMemo(
    () => flex.filter((trait) => groups.includes(trait.group)),
    [flex, groups],
  );
  const rareOfGroup = useMemo(
    () => variations.filter((trait) => groups.includes(trait.group)),
    [variations, groups],
  );

  const siblings = useMemo(
    () => [...coreOfGroup, ...flexOfGroup, ...rareOfGroup],
    [coreOfGroup, flexOfGroup, rareOfGroup],
  );

  if (siblings.length === 0) return null;

  const visibleCore = maxVisible === undefined ? coreOfGroup : coreOfGroup.slice(0, maxVisible);
  const remainingAfterCore =
    maxVisible === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(maxVisible - visibleCore.length, 0);
  const visibleFlex =
    maxVisible === undefined ? flexOfGroup : flexOfGroup.slice(0, remainingAfterCore);
  const hiddenPrimaryCount =
    coreOfGroup.length + flexOfGroup.length - visibleCore.length - visibleFlex.length;

  const renderChip = (trait: ClusterTrait, kind: TraitKind): React.ReactNode => {
    const traitSiblings = siblings.filter((candidate) => candidate.group === trait.group);

    return (
      <Tooltip
        key={`${trait.group}-${trait.id}`}
        title={shareText(trait, traitSiblings, trait.group)}
        arrow
        enterTouchDelay={0}
        leaveTouchDelay={3000}
      >
        <Chip
          label={
            <Box
              component="span"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}
            >
              {isCombinedGroup && (
                <Box
                  component="span"
                  sx={{
                    color: 'text.disabled',
                    fontSize: '0.57rem',
                    fontWeight: 750,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {GROUP_LABELS[trait.group] ?? trait.group}
                </Box>
              )}
              <Box
                component="span"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {trait.label}
              </Box>
              <Box
                component="span"
                className="u-tabular"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.69rem',
                  fontVariantNumeric: 'tabular-nums',
                }}
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
            position: 'relative',
            overflow: 'hidden',
            maxWidth: { xs: '100%', sm: 280 },
            height: 28,
            borderRadius: 1.5,
            fontWeight: 600,
            color: kind === 'rare' ? theme.palette.text.secondary : theme.palette.text.primary,
            borderColor: alpha(
              kind === 'rare' ? theme.palette.text.secondary : theme.palette.primary.main,
              kind === 'core' ? 0.28 : kind === 'flex' ? 0.18 : 0.12,
            ),
            backgroundColor:
              theme.palette.mode === 'dark'
                ? alpha(theme.palette.background.paper, 0.62)
                : alpha(theme.palette.common.white, 0.78),
            '& .MuiChip-label': { minWidth: 0, px: 1 },
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: `${Math.max(trait.share * 100, 2)}%`,
              height: 2,
              borderRadius: 999,
              backgroundColor: theme.palette.primary.main,
              opacity: kind === 'core' ? 0.85 : kind === 'flex' ? 0.52 : 0.28,
            },
          })}
        />
      </Tooltip>
    );
  };

  const renderSegment = (kind: TraitKind, traits: readonly ClusterTrait[]): React.ReactNode => {
    if (traits.length === 0) return null;

    return (
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 0.55,
            color: 'text.disabled',
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
          }}
        >
          {SEGMENT_LABELS[kind]}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.65, alignItems: 'center' }}>
          {traits.map((trait) => renderChip(trait, kind))}
        </Box>
      </Box>
    );
  };

  return (
    <Box
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '92px minmax(0, 1fr)' },
        gap: { xs: 0.75, md: 1.25 },
        py: 1,
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.48)}`,
      })}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          pt: { md: 1.8 },
          color: 'text.secondary',
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, minWidth: 0 }}>
        {renderSegment('core', visibleCore)}
        {renderSegment('flex', visibleFlex)}
        {showVariations && renderSegment('rare', rareOfGroup)}

        {hiddenPrimaryCount > 0 && (
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.64rem' }}>
            +{hiddenPrimaryCount} more in the full breakdown
          </Typography>
        )}

        {showVariationsControl && rareOfGroup.length > 0 && (
          <Button
            size="small"
            variant="text"
            onClick={() => setShowVariations((value) => !value)}
            sx={{
              alignSelf: 'flex-start',
              textTransform: 'none',
              fontSize: '0.68rem',
              minWidth: 0,
              px: 0.5,
              py: 0.25,
            }}
          >
            {showVariations
              ? 'Hide less-common picks'
              : `Show ${rareOfGroup.length} less-common picks`}
          </Button>
        )}
      </Box>
    </Box>
  );
};
