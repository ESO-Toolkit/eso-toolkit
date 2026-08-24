import { Box, Button, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useMemo, useState } from 'react';

import { useRoleColors } from '../../../hooks/useRoleColors';
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
  /** Ledger is the expanded frequency table; inline is the collapsed signature. */
  variant?: 'ledger' | 'inline';
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

const MULTI_VALUED_GROUPS = new Set<FeatureGroupKey>([
  'fivePieceSets',
  'frontBar',
  'backBar',
  'cpSlottables',
]);

function shareText(
  trait: ClusterTrait,
  siblings: readonly ClusterTrait[],
  group: FeatureGroupKey,
): string {
  const others = siblings.filter((candidate) => candidate.id !== trait.id).slice(0, 3);
  const multi = MULTI_VALUED_GROUPS.has(group);
  const lead = `${percent(trait.share)} of this build ${multi ? 'includes' : 'runs'} ${trait.label}.`;

  if (others.length === 0) return lead;

  const rest = others
    .map((candidate) => `${candidate.label} ${percent(candidate.share)}`)
    .join(', ');
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
  variant = 'ledger',
}) => {
  const [showVariations, setShowVariations] = useState(false);
  const { getPlayerColor } = useRoleColors();
  const dpsColor = getPlayerColor('dps');
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

  const renderInlineTrait = (trait: ClusterTrait, kind: TraitKind): React.ReactNode => {
    const traitSiblings = siblings.filter((candidate) => candidate.group === trait.group);

    return (
      <Tooltip
        key={`${trait.group}-${trait.id}`}
        title={shareText(trait, traitSiblings, trait.group)}
        arrow
        enterTouchDelay={0}
        leaveTouchDelay={3000}
      >
        <Box
          component="span"
          data-core={kind === 'core' ? 'true' : undefined}
          data-trait-kind={kind}
          data-testid={`trait-${trait.group}-${trait.id}`}
          sx={{
            display: 'inline-flex',
            minWidth: 0,
            alignItems: 'baseline',
            gap: 0.5,
            color: kind === 'core' ? 'text.primary' : 'text.secondary',
            fontSize: '0.76rem',
            fontWeight: kind === 'core' ? 650 : 450,
            whiteSpace: 'nowrap',
          }}
        >
          {isCombinedGroup && (
            <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.66rem' }}>
              {GROUP_LABELS[trait.group] ?? trait.group}
            </Box>
          )}
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {trait.label}
          </Box>
        </Box>
      </Tooltip>
    );
  };

  const renderLedgerTrait = (trait: ClusterTrait, kind: TraitKind): React.ReactNode => {
    const traitSiblings = siblings.filter((candidate) => candidate.group === trait.group);

    return (
      <Tooltip
        key={`${trait.group}-${trait.id}`}
        title={shareText(trait, traitSiblings, trait.group)}
        arrow
        enterTouchDelay={0}
        leaveTouchDelay={3000}
      >
        <Box
          data-core={kind === 'core' ? 'true' : undefined}
          data-trait-kind={kind}
          data-testid={`trait-${trait.group}-${trait.id}`}
          sx={{
            display: 'grid',
            gridTemplateColumns: isCombinedGroup
              ? {
                  xs: '42px minmax(96px, 1fr) 72px 34px',
                  sm: '54px minmax(120px, 1fr) minmax(90px, 0.8fr) 38px',
                }
              : {
                  xs: 'minmax(96px, 1fr) 72px 34px',
                  sm: 'minmax(120px, 1fr) minmax(90px, 0.8fr) 38px',
                },
            alignItems: 'center',
            columnGap: 1,
            minHeight: 25,
            color: kind === 'rare' ? 'text.secondary' : 'text.primary',
          }}
        >
          {isCombinedGroup && (
            <Typography sx={{ color: 'text.disabled', fontSize: '0.66rem' }}>
              {GROUP_LABELS[trait.group] ?? trait.group}
            </Typography>
          )}
          <Typography noWrap sx={{ fontSize: '0.78rem', fontWeight: kind === 'core' ? 650 : 450 }}>
            {trait.label}
          </Typography>
          <Box
            aria-hidden="true"
            sx={(theme) => ({
              height: 4,
              overflow: 'hidden',
              backgroundColor: alpha(theme.palette.text.primary, 0.1),
            })}
          >
            <Box
              sx={{
                width: `${Math.max(trait.share * 100, 2)}%`,
                height: '100%',
                transformOrigin: 'left',
                backgroundColor: dpsColor,
                opacity: kind === 'core' ? 0.92 : kind === 'flex' ? 0.62 : 0.34,
                animation: 'trait-frequency-in 240ms ease-out both',
                '@keyframes trait-frequency-in': {
                  from: { transform: 'scaleX(0)' },
                  to: { transform: 'scaleX(1)' },
                },
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }}
            />
          </Box>
          <Typography
            className="u-tabular"
            sx={{ textAlign: 'right', color: 'text.secondary', fontSize: '0.72rem' }}
          >
            {percent(trait.share)}
          </Typography>
        </Box>
      </Tooltip>
    );
  };

  if (variant === 'inline') {
    const visible = [
      ...visibleCore.map((trait) => ({ trait, kind: 'core' as const })),
      ...visibleFlex.map((trait) => ({ trait, kind: 'flex' as const })),
    ];

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'auto minmax(0, 1fr) auto' },
          minWidth: 0,
          alignItems: 'baseline',
          columnGap: 0.75,
          rowGap: 0.35,
        }}
      >
        <Typography sx={{ flex: '0 0 auto', color: 'text.disabled', fontSize: '0.7rem' }}>
          {title}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            minWidth: 0,
            overflow: 'hidden',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 0.65,
            maxHeight: 38,
          }}
        >
          {visible.map(({ trait, kind }, index) => (
            <React.Fragment key={`${trait.group}-${trait.id}`}>
              {index > 0 && (
                <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>
                  ·
                </Box>
              )}
              {renderInlineTrait(trait, kind)}
            </React.Fragment>
          ))}
        </Box>
        {hiddenPrimaryCount > 0 && (
          <Typography
            component="span"
            sx={{ color: 'text.disabled', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
          >
            +{hiddenPrimaryCount} more in the full breakdown
          </Typography>
        )}
      </Box>
    );
  }

  const renderSegment = (kind: TraitKind, traits: readonly ClusterTrait[]): React.ReactNode => {
    if (traits.length === 0) return null;

    return (
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={(theme) => ({
            mt: kind === 'core' ? 0 : 0.75,
            mb: 0.25,
            pt: kind === 'core' ? 0 : 0.75,
            borderTop: kind === 'core' ? 0 : `1px solid ${alpha(theme.palette.divider, 0.38)}`,
            color: 'text.disabled',
            fontSize: '0.66rem',
          })}
        >
          {SEGMENT_LABELS[kind]}
        </Typography>
        {traits.map((trait) => renderLedgerTrait(trait, kind))}
      </Box>
    );
  };

  return (
    <Box
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '92px minmax(0, 1fr)' },
        gap: { xs: 0.5, sm: 1.5 },
        py: 1,
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
      })}
    >
      <Typography
        sx={{ pt: { sm: 0.2 }, color: 'text.secondary', fontSize: '0.72rem', fontWeight: 650 }}
      >
        {title}
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        {renderSegment('core', visibleCore)}
        {renderSegment('flex', visibleFlex)}
        {showVariations && renderSegment('rare', rareOfGroup)}

        {hiddenPrimaryCount > 0 && (
          <Typography sx={{ mt: 0.5, color: 'text.disabled', fontSize: '0.68rem' }}>
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
              minWidth: 0,
              mt: 0.5,
              px: 0,
              py: 0.25,
              fontSize: '0.7rem',
              textTransform: 'none',
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
