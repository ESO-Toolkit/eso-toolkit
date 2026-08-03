/**
 * One build archetype.
 *
 * Rendered at two weights: `featured` is the "start here" card pinned above the
 * grid, everything else is a compact sibling. Same content, same component — the
 * recommendation should not look like a different kind of thing.
 */

import { Box, Button, Card, Chip, Collapse, Divider, Stack, Typography } from '@mui/material';
import React from 'react';

import { MetricPill } from '../../../components/MetricPill';
import type { BuildCluster, ClusterTrait } from '../types/clustering.types';

import { TraitChipRow } from './TraitChipRow';

export interface ArchetypeCardProps {
  cluster: BuildCluster;
  /** Total parses across all archetypes, for the "used by N of M" line. */
  totalParses: number;
  featured?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onOpenInEditor?: (cluster: BuildCluster) => void;
  onSaveBuild?: (cluster: BuildCluster) => void;
  onViewSourceLog?: (cluster: BuildCluster) => void;
  /** Busy state for the editor handoff, which needs a second fetch. */
  actionPending?: boolean;
  /** Class name for the headline, e.g. "Arcanist". */
  esoClass?: string;
  /** Traits below the flex threshold, revealed on demand. */
  variations?: readonly ClusterTrait[];
}

const compact = (value: number): string =>
  value >= 1000 ? `${Math.round(value / 1000)}k` : String(Math.round(value));

/**
 * One plain-English sentence. Deliberately leads with the median, not the record:
 * it answers "what will I get", where the max only says what one exceptional
 * player managed once.
 */
function summarySentence(cluster: BuildCluster, totalParses: number): string {
  const share = `${cluster.size} of the ${totalParses} fastest parses`;
  return `${share} run this. Half of them beat ${compact(cluster.dps.median)}.`;
}

export const ArchetypeCard: React.FC<ArchetypeCardProps> = ({
  cluster,
  totalParses,
  featured = false,
  expanded = false,
  onToggleExpand,
  onOpenInEditor,
  onSaveBuild,
  onViewSourceLog,
  actionPending = false,
  esoClass,
  variations = [],
}) => {
  const showDetail = featured || expanded;

  return (
    <Card
      data-testid={featured ? 'start-here-card' : 'archetype-card'}
      sx={(theme) => ({
        p: featured ? 2.5 : 2,
        borderRadius: 3.5,
        border: '1px solid',
        borderColor: featured ? theme.palette.success.main : theme.palette.divider,
        background: 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: featured
          ? '0 10px 40px rgba(0,0,0,0.3), 0 0 60px rgba(34,197,94,0.10)'
          : undefined,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      })}
    >
      {featured && (
        <Typography
          variant="overline"
          sx={(theme) => ({ color: theme.palette.success.main, fontWeight: 700, letterSpacing: 1 })}
        >
          {esoClass ? `New to ${esoClass}? Start here.` : 'Start here'}
        </Typography>
      )}

      <Typography variant={featured ? 'h6' : 'subtitle1'} sx={{ fontWeight: 700, mb: 0.5 }}>
        {cluster.label}
      </Typography>

      <Typography variant="body2" sx={{ opacity: 0.8, mb: 1.5 }}>
        {summarySentence(cluster, totalParses)}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <MetricPill
          label="Median DPS"
          value={compact(cluster.dps.median)}
          intent="success"
          size={featured ? 'md' : 'sm'}
          tooltip="Half the players running this build beat this number. A better guide to what you'll get than the record."
        />
        <MetricPill
          label="Top DPS"
          value={compact(cluster.dps.max)}
          intent="info"
          size={featured ? 'md' : 'sm'}
        />
        <MetricPill
          label="Used by"
          value={`${cluster.size} of ${totalParses}`}
          size={featured ? 'md' : 'sm'}
        />
      </Stack>

      <Collapse in={showDetail} timeout="auto" unmountOnExit>
        <Divider sx={{ my: 1.5 }} />

        <TraitChipRow
          title="Gear sets"
          group="fivePieceSets"
          core={cluster.core}
          flex={cluster.flex}
          variations={variations}
        />
        <TraitChipRow
          title="Monster set"
          group="monsterSet"
          core={cluster.core}
          flex={cluster.flex}
          variations={variations}
        />
        <TraitChipRow
          title="Mythic"
          group="mythic"
          core={cluster.core}
          flex={cluster.flex}
          variations={variations}
        />
        <TraitChipRow
          title="Arena weapon"
          group="arena"
          core={cluster.core}
          flex={cluster.flex}
          variations={variations}
        />
        <TraitChipRow
          title="Front bar"
          group="frontBar"
          core={cluster.core}
          flex={cluster.flex}
          variations={variations}
        />
        <TraitChipRow
          title="Back bar"
          group="backBar"
          core={cluster.core}
          flex={cluster.flex}
          variations={variations}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 1.5 }}>
          <Chip
            size="small"
            label={`Consistency ${Math.round((1 - cluster.cohesion) * 100)}%`}
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            How closely players running this build match each other
          </Typography>
        </Box>
      </Collapse>

      <Box sx={{ mt: 'auto', pt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          disabled={actionPending}
          onClick={() => onOpenInEditor?.(cluster)}
        >
          {actionPending ? 'Opening…' : 'Open in Build Editor'}
        </Button>
        <Button variant="outlined" size="small" onClick={() => onSaveBuild?.(cluster)}>
          Save to My Builds
        </Button>
        <Button variant="text" size="small" onClick={() => onViewSourceLog?.(cluster)}>
          View the source log
        </Button>
        {!featured && onToggleExpand && (
          <Button variant="text" size="small" onClick={onToggleExpand} sx={{ ml: 'auto' }}>
            {expanded ? 'Less' : 'Details'}
          </Button>
        )}
      </Box>
    </Card>
  );
};
