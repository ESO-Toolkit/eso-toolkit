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
    aria-label="Defining setup"
    sx={(theme) => ({
      overflow: 'hidden',
      border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
      borderRadius: 2,
      backgroundColor: alpha(
        theme.palette.background.default,
        theme.palette.mode === 'dark' ? 0.28 : 0.42,
      ),
    })}
  >
    {SIGNATURE_GROUPS.map((signatureGroup, index) => {
      const traits = traitsFor(cluster, signatureGroup.groups);
      const visible = traits.slice(0, signatureGroup.limit);

      return (
        <Box
          key={signatureGroup.key}
          sx={(theme) => ({
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '112px minmax(0, 1fr)' },
            alignItems: 'baseline',
            gap: { xs: 0.45, sm: 1.5 },
            minWidth: 0,
            px: { xs: 1.15, sm: 1.35 },
            py: 0.9,
            borderTop: index === 0 ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.42)}`,
          })}
        >
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: '0.66rem',
              fontWeight: 700,
              letterSpacing: '0.045em',
              textTransform: 'uppercase',
            }}
          >
            {signatureGroup.label}
          </Typography>
          {visible.length > 0 ? (
            <Box
              sx={{
                display: 'flex',
                minWidth: 0,
                alignItems: 'baseline',
                flexWrap: 'wrap',
                columnGap: 0.7,
                rowGap: 0.3,
              }}
            >
              {visible.map((trait, traitIndex) => (
                <React.Fragment key={`${trait.group}-${trait.id}`}>
                  {traitIndex > 0 && (
                    <Box
                      component="span"
                      aria-hidden="true"
                      sx={{ color: 'text.secondary', fontSize: '0.64rem', opacity: 0.56 }}
                    >
                      ·
                    </Box>
                  )}
                  <Typography
                    component="span"
                    data-core={trait.core ? 'true' : undefined}
                    data-trait-kind={trait.core ? 'core' : 'flex'}
                    data-testid={`trait-${trait.group}-${trait.id}`}
                    title={trait.label}
                    sx={{
                      color: trait.core ? 'text.primary' : 'text.secondary',
                      fontSize: '0.79rem',
                      fontWeight: trait.core ? 650 : 450,
                      lineHeight: 1.3,
                    }}
                  >
                    {trait.label}
                  </Typography>
                </React.Fragment>
              ))}
            </Box>
          ) : (
            <Typography sx={{ color: 'text.secondary', fontSize: '0.76rem' }}>
              No consistent signal
            </Typography>
          )}
        </Box>
      );
    })}
  </Box>
);
