import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import { getLeaderboardClassTheme } from '../theme/leaderboardTheme';
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

export const BuildSignatureStrip: React.FC<BuildSignatureStripProps> = ({ cluster }) => {
  const classTheme = getLeaderboardClassTheme(cluster.esoClass);

  return (
    <Box role="group" aria-label="Defining setup">
      {SIGNATURE_GROUPS.map((signatureGroup, index) => {
        const traits = traitsFor(cluster, signatureGroup.groups);
        const visible = traits.slice(0, signatureGroup.limit);

        return (
          <Box
            key={signatureGroup.key}
            sx={(theme) => ({
              display: 'grid',
              position: 'relative',
              gridTemplateColumns: { xs: '1fr', sm: '126px minmax(0, 1fr)' },
              alignItems: 'baseline',
              gap: { xs: 0.45, sm: 1.5 },
              minWidth: 0,
              pr: 0,
              pl: { xs: index === 0 ? 1.5 : 0, sm: 0 },
              py: 1,
              borderTop: `1px solid ${alpha(theme.palette.divider, index === 0 ? 0.66 : 0.42)}`,
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 12,
                bottom: 12,
                left: 0,
                width: 2,
                borderRadius: 2,
                backgroundColor: index === 0 ? classTheme.accent : 'transparent',
              },
            })}
          >
            <Typography
              sx={{
                color: 'text.secondary',
                pl: { xs: 0, sm: index === 0 ? 1 : 0 },
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '0.07em',
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
                        fontSize: '0.81rem',
                        fontWeight: trait.core ? 600 : 500,
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
};
