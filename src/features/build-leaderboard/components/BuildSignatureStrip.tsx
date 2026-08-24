import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import type { BuildCluster, ClusterTrait, FeatureGroupKey } from '../types/clustering.types';

interface SignatureGroup {
  key: string;
  label: string;
  groups: readonly FeatureGroupKey[];
  limit: number;
}

const SIGNATURE_GROUPS: readonly SignatureGroup[] = [
  { key: 'sets', label: 'Sets', groups: ['fivePieceSets'], limit: 2 },
  { key: 'special', label: 'Special', groups: ['mythic', 'monsterSet', 'arena'], limit: 2 },
  { key: 'skills', label: 'Signature skills', groups: ['frontBar', 'backBar'], limit: 3 },
];

function traitsFor(
  cluster: BuildCluster,
  groups: readonly FeatureGroupKey[],
): Array<ClusterTrait & { core: boolean }> {
  const core = cluster.core
    .filter((trait) => groups.includes(trait.group))
    .map((trait) => ({ ...trait, core: true }));
  const common = cluster.flex
    .filter((trait) => groups.includes(trait.group))
    .map((trait) => ({ ...trait, core: false }));
  return [...core, ...common];
}

export interface BuildSignatureStripProps {
  cluster: BuildCluster;
}

export const BuildSignatureStrip: React.FC<BuildSignatureStripProps> = ({ cluster }) => (
  <Box
    aria-label="Build anchors"
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
      gap: { xs: 1, sm: 0 },
    }}
  >
    {SIGNATURE_GROUPS.map((signatureGroup, index) => {
      const traits = traitsFor(cluster, signatureGroup.groups);
      const visible = traits.slice(0, signatureGroup.limit);

      return (
        <Box
          key={signatureGroup.key}
          sx={(theme) => ({
            minWidth: 0,
            px: { xs: 0, sm: index === 0 ? 0 : 2 },
            borderLeft: {
              xs: 'none',
              sm: index === 0 ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.72)}`,
            },
          })}
        >
          <Typography
            sx={{
              mb: 0.5,
              color: 'text.secondary',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.055em',
              textTransform: 'uppercase',
            }}
          >
            {signatureGroup.label}
          </Typography>
          {visible.length > 0 ? (
            <Box sx={{ display: 'flex', minWidth: 0, flexDirection: 'column', gap: 0.35 }}>
              {visible.map((trait) => (
                <Typography
                  key={`${trait.group}-${trait.id}`}
                  data-core={trait.core ? 'true' : undefined}
                  data-trait-kind={trait.core ? 'core' : 'flex'}
                  data-testid={`trait-${trait.group}-${trait.id}`}
                  title={trait.label}
                  sx={{
                    display: '-webkit-box',
                    minHeight: { xs: 'auto', sm: '2.3em' },
                    overflow: 'hidden',
                    color: trait.core ? 'text.primary' : 'text.secondary',
                    fontSize: '0.8rem',
                    fontWeight: trait.core ? 650 : 450,
                    lineHeight: 1.15,
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                  }}
                >
                  {trait.label}
                </Typography>
              ))}
            </Box>
          ) : (
            <Typography sx={{ color: 'text.secondary', fontSize: '0.76rem' }}>
              Not consistently recorded
            </Typography>
          )}
        </Box>
      );
    })}
  </Box>
);
