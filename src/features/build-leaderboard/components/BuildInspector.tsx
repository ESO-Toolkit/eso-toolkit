import {
  ExpandMore,
  InsertChartOutlined,
  LaunchOutlined,
  MoreHoriz,
  SaveOutlined,
} from '@mui/icons-material';
import { Box, Button, Collapse, Menu, MenuItem, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import { ClassIcon } from '../../../components/ClassIcon';
import type { BuildCluster, ClusterTrait } from '../types/clustering.types';

import { BuildSignatureStrip } from './BuildSignatureStrip';
import { TraitChipRow } from './TraitChipRow';

const compactDps = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(value));

const SPECIAL_GEAR_GROUPS = ['monsterSet', 'mythic', 'arena'] as const;

export interface BuildInspectorProps {
  cluster: BuildCluster;
  label: string;
  totalParses: number;
  recommended: boolean;
  evidenceOpen: boolean;
  onToggleEvidence: () => void;
  onOpenInEditor?: (cluster: BuildCluster) => void;
  onSaveBuild?: (cluster: BuildCluster) => void;
  onViewSourceLog?: (cluster: BuildCluster) => void;
  pendingKind?: 'open' | 'save' | null;
  actionsDisabled?: boolean;
  variations?: readonly ClusterTrait[];
  sourceUrl?: string;
}

export const BuildInspector: React.FC<BuildInspectorProps> = ({
  cluster,
  label,
  totalParses,
  recommended,
  evidenceOpen,
  onToggleEvidence,
  onOpenInEditor,
  onSaveBuild,
  onViewSourceLog,
  pendingKind = null,
  actionsDisabled = false,
  variations = [],
  sourceUrl,
}) => {
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const hasMoreActions = Boolean(
    onSaveBuild || onViewSourceLog || sourceUrl || pendingKind === 'save',
  );
  const closeMenu = (): void => setMenuAnchor(null);

  React.useEffect(() => setMenuAnchor(null), [cluster.id]);

  return (
    <Box
      component="article"
      data-testid="build-inspector"
      aria-labelledby={`build-inspector-${cluster.id}`}
      sx={{
        minWidth: 0,
        p: { xs: 1.5, sm: 2.5, lg: 3 },
        animation: 'build-inspector-in 180ms ease-out both',
        '@keyframes build-inspector-in': {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Box data-testid={recommended ? 'start-here-card' : undefined}>
        <Box sx={{ display: 'flex', minWidth: 0, alignItems: 'flex-start', gap: 1.25 }}>
          <Box
            sx={(theme) => ({
              display: 'grid',
              width: 42,
              height: 42,
              flex: '0 0 auto',
              placeItems: 'center',
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.background.default, 0.42),
            })}
          >
            <ClassIcon className={cluster.esoClass} size={25} alt="" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            {recommended && (
              <Typography
                sx={{
                  mb: 0.35,
                  color: 'primary.main',
                  fontSize: '0.7rem',
                  fontWeight: 750,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Recommended build
              </Typography>
            )}
            <Typography
              id={`build-inspector-${cluster.id}`}
              component="h2"
              sx={{
                maxWidth: 720,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontSize: { xs: '1.12rem', sm: '1.32rem' },
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}
            >
              {label}
            </Typography>
            <Typography
              sx={{ mt: 0.6, maxWidth: 620, color: 'text.secondary', fontSize: '0.8rem' }}
            >
              {recommended
                ? 'Best balance of typical damage and a sample large enough to trust.'
                : 'A viable pattern found in top-ranked parses for this selection.'}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={(theme) => ({
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            mt: 2.25,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
          })}
        >
          <Box sx={{ py: 1.35, pr: 2 }}>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
              Typical damage
            </Typography>
            <Typography
              className="u-tabular"
              sx={{ mt: 0.1, fontSize: { xs: '1.28rem', sm: '1.5rem' }, fontWeight: 700 }}
            >
              {compactDps(cluster.dps.median)}
              <Box component="span" sx={{ ml: 0.55, color: 'text.secondary', fontSize: '0.72rem' }}>
                DPS
              </Box>
            </Typography>
          </Box>
          <Box
            sx={(theme) => ({
              py: 1.35,
              pl: 2,
              borderLeft: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
            })}
          >
            <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
              Seen in top parses
            </Typography>
            <Typography
              className="u-tabular"
              sx={{ mt: 0.1, fontSize: { xs: '1.28rem', sm: '1.5rem' }, fontWeight: 700 }}
            >
              {cluster.size}
              <Box component="span" sx={{ ml: 0.5, color: 'text.secondary', fontSize: '0.72rem' }}>
                of {totalParses}
              </Box>
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 2.25 }}>
          <Typography
            sx={{
              mb: 1,
              color: 'text.secondary',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.055em',
              textTransform: 'uppercase',
            }}
          >
            Build anchors
          </Typography>
          <BuildSignatureStrip cluster={cluster} />
        </Box>

        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.75,
            mt: 2.25,
            pt: 1.5,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
          })}
        >
          {onOpenInEditor && (
            <Button
              variant="contained"
              size="small"
              disabled={actionsDisabled}
              onClick={() => onOpenInEditor(cluster)}
            >
              {pendingKind === 'open' ? 'Opening…' : 'Open in Build Editor'}
            </Button>
          )}
          <Button
            variant="text"
            size="small"
            aria-label={evidenceOpen ? 'Hide build evidence' : 'Show build evidence'}
            aria-expanded={evidenceOpen}
            endIcon={
              <ExpandMore
                sx={{
                  transform: evidenceOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 160ms ease',
                  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                }}
              />
            }
            onClick={onToggleEvidence}
          >
            {evidenceOpen ? 'Hide build evidence' : 'Show build evidence'}
          </Button>
          {hasMoreActions && (
            <Button
              variant="text"
              size="small"
              startIcon={<MoreHoriz />}
              disabled={actionsDisabled}
              aria-label={pendingKind === 'save' ? 'Saving build' : 'More build actions'}
              aria-haspopup="menu"
              aria-expanded={Boolean(menuAnchor)}
              onClick={(event) => setMenuAnchor(event.currentTarget)}
            >
              {pendingKind === 'save' ? 'Saving…' : 'More actions'}
            </Button>
          )}
        </Box>
      </Box>

      <Collapse in={evidenceOpen} timeout="auto" unmountOnExit>
        <Box
          sx={(theme) => ({
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
            columnGap: 3,
            mt: 1.5,
            pt: 1.5,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
          })}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{ mb: 0.75, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}
            >
              Gear &amp; special
            </Typography>
            <TraitChipRow
              title="Gear sets"
              group="fivePieceSets"
              core={cluster.core}
              flex={cluster.flex}
              variations={variations}
            />
            <TraitChipRow
              title="Special pieces"
              group={SPECIAL_GEAR_GROUPS}
              core={cluster.core}
              flex={cluster.flex}
              variations={variations}
            />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{ mb: 0.75, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}
            >
              Skill bars
            </Typography>
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
          </Box>
        </Box>
      </Collapse>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        slotProps={{ paper: { sx: { minWidth: 230 } } }}
      >
        {onSaveBuild && (
          <MenuItem
            disabled={actionsDisabled}
            onClick={() => {
              closeMenu();
              onSaveBuild(cluster);
            }}
          >
            <SaveOutlined fontSize="small" sx={{ mr: 1.25 }} />
            Save to My Builds
          </MenuItem>
        )}
        {onViewSourceLog && (
          <MenuItem
            disabled={actionsDisabled}
            onClick={() => {
              closeMenu();
              onViewSourceLog(cluster);
            }}
          >
            <InsertChartOutlined fontSize="small" sx={{ mr: 1.25 }} />
            Open representative parse
          </MenuItem>
        )}
        {sourceUrl && (
          <MenuItem component="a" href={sourceUrl} target="_blank" rel="noopener noreferrer">
            <LaunchOutlined fontSize="small" sx={{ mr: 1.25 }} />
            View on ESO Logs
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};
