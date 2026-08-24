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
import { useRoleColors } from '../../../hooks/useRoleColors';
import type { BuildCluster, ClusterTrait } from '../types/clustering.types';

import { TraitChipRow } from './TraitChipRow';

export interface ArchetypeCardProps {
  cluster: BuildCluster;
  totalParses: number;
  featured?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onOpenInEditor?: (cluster: BuildCluster) => void;
  onSaveBuild?: (cluster: BuildCluster) => void;
  onViewSourceLog?: (cluster: BuildCluster) => void;
  pendingKind?: 'open' | 'save' | null;
  actionsDisabled?: boolean;
  esoClass?: string;
  variations?: readonly ClusterTrait[];
  sourceUrl?: string;
}

const compact = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(value));

const SPECIAL_GEAR_GROUPS = ['monsterSet', 'mythic', 'arena'] as const;
const SIGNATURE_GROUPS = ['fivePieceSets', ...SPECIAL_GEAR_GROUPS, 'frontBar', 'backBar'] as const;

function summarySentence(cluster: BuildCluster, totalParses: number): string {
  return `${cluster.size} of ${totalParses} top parses use this pattern. Half of these parses land above ${compact(cluster.dps.median)} DPS.`;
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
  pendingKind = null,
  actionsDisabled = false,
  esoClass,
  variations = [],
  sourceUrl,
}) => {
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const { getPlayerColor } = useRoleColors();
  const dpsColor = getPlayerColor('dps');
  const showDetail = expanded;
  const showActions = featured || showDetail;
  const className = esoClass ?? cluster.esoClass;
  const hasMoreActions = Boolean(
    onSaveBuild || onViewSourceLog || sourceUrl || pendingKind === 'save',
  );
  const closeMenu = (): void => setMenuAnchor(null);

  return (
    <Box
      component="article"
      id={`build-archetype-${cluster.id}`}
      data-testid={featured ? 'start-here-card' : 'archetype-card'}
      sx={(theme) => ({
        position: 'relative',
        scrollMarginTop: 72,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
        backgroundColor: 'transparent',
        '&::before':
          featured || showDetail
            ? {
                content: '""',
                position: 'absolute',
                top: 10,
                bottom: 10,
                left: 0,
                width: 2,
                backgroundColor: dpsColor,
                transformOrigin: 'top',
                animation: 'archetype-rule-in 180ms ease-out both',
              }
            : undefined,
        '@keyframes archetype-rule-in': {
          from: { transform: 'scaleY(0)' },
          to: { transform: 'scaleY(1)' },
        },
        '@media (prefers-reduced-motion: reduce)': { '&::before': { animation: 'none' } },
      })}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr) auto',
            md: 'minmax(180px, 1fr) 78px 110px auto',
          },
          gridTemplateAreas: {
            xs: '"title toggle" "metrics metrics"',
            md: '"title median usage toggle"',
          },
          minHeight: { xs: 72, md: 58 },
          alignItems: 'center',
          columnGap: { xs: 0.75, md: 1.25 },
          rowGap: 0.5,
          px: { xs: 1, sm: 1.5 },
          py: { xs: 0.75, md: 0.5 },
        }}
      >
        <Box sx={{ gridArea: 'title', minWidth: 0 }}>
          <Box sx={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 0.7 }}>
            {className && <ClassIcon className={className} size={17} alt="" />}
            <Typography
              component="h2"
              noWrap
              sx={{
                minWidth: 0,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontSize: '0.95rem',
                fontWeight: featured ? 720 : 620,
                letterSpacing: '-0.015em',
              }}
            >
              {cluster.label}
            </Typography>
            {featured && (
              <Typography
                component="span"
                sx={{ flex: '0 0 auto', color: dpsColor, fontSize: '0.68rem', fontWeight: 700 }}
              >
                Recommended starting point
              </Typography>
            )}
          </Box>
          {featured && (
            <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: '0.7rem' }}>
              Highest typical damage among build patterns used often enough to trust.
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            display: { xs: 'flex', md: 'contents' },
            gridArea: { xs: 'metrics', md: 'auto' },
            alignItems: 'baseline',
            gap: 2,
          }}
        >
          <Box sx={{ gridArea: { md: 'median' } }}>
            <Typography className="u-tabular" sx={{ fontSize: '0.88rem', fontWeight: 720 }}>
              {compact(cluster.dps.median)}
            </Typography>
            <Typography sx={{ color: 'text.disabled', fontSize: '0.62rem' }}>median DPS</Typography>
          </Box>
          <Box sx={{ gridArea: { md: 'usage' } }}>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>used by</Typography>
            <Typography className="u-tabular" sx={{ fontSize: '0.76rem', fontWeight: 650 }}>
              {cluster.size} of {totalParses}
            </Typography>
          </Box>
        </Box>

        {onToggleExpand ? (
          <Button
            variant="text"
            size="small"
            onClick={onToggleExpand}
            aria-expanded={expanded}
            endIcon={
              <ExpandMore
                sx={{
                  transition: 'transform 160ms ease',
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                }}
              />
            }
            sx={{
              gridArea: 'toggle',
              minWidth: 0,
              px: { xs: 0.5, md: 0.75 },
              fontSize: '0.7rem',
              textTransform: 'none',
              '& .MuiButton-endIcon': { ml: { xs: 0, sm: 0.35 } },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              {expanded ? 'Hide' : featured ? 'Evidence' : 'Details'}
            </Box>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {expanded ? 'Hide evidence' : featured ? 'See build evidence' : 'Full breakdown'}
            </Box>
          </Button>
        ) : (
          <Box sx={{ gridArea: 'toggle' }} />
        )}
      </Box>

      {!showDetail && (
        <Box sx={{ px: { xs: 1, sm: 1.5 }, pb: 1 }}>
          {featured && (
            <Typography sx={{ mb: 0.75, color: 'text.secondary', fontSize: '0.76rem' }}>
              {summarySentence(cluster, totalParses)}
            </Typography>
          )}
          <TraitChipRow
            title={featured ? 'Common setup' : 'Build composition'}
            group={SIGNATURE_GROUPS}
            core={cluster.core}
            flex={cluster.flex}
            variations={variations}
            maxVisible={featured ? 4 : 3}
            showVariationsControl={false}
            variant="inline"
          />
        </Box>
      )}

      <Collapse in={showDetail} timeout="auto" unmountOnExit>
        <Box sx={{ px: { xs: 1, sm: 1.5 }, pb: 1.5 }}>
          {!featured && (
            <Typography sx={{ mb: 1, color: 'text.secondary', fontSize: '0.76rem' }}>
              {summarySentence(cluster, totalParses)}
            </Typography>
          )}

          <Box
            sx={(theme) => ({
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              columnGap: { md: 2.5 },
              px: { xs: 1, sm: 1.5 },
              py: 1,
              backgroundColor: alpha(
                theme.palette.background.default,
                theme.palette.mode === 'dark' ? 0.48 : 0.72,
              ),
              boxShadow: `inset 0 1px 2px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.2 : 0.05)}`,
            })}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  mb: 0.75,
                  color: 'text.disabled',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                }}
              >
                Gear & special
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
                sx={{
                  mb: 0.75,
                  color: 'text.disabled',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                }}
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
        </Box>
      </Collapse>

      {showActions && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.75,
            px: { xs: 1, sm: 1.5 },
            pb: 1.25,
          }}
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

          {hasMoreActions && (
            <Button
              variant="text"
              size="small"
              startIcon={<MoreHoriz />}
              disabled={actionsDisabled}
              aria-haspopup="menu"
              aria-expanded={Boolean(menuAnchor)}
              onClick={(event) => setMenuAnchor(event.currentTarget)}
            >
              {pendingKind === 'save' ? 'Saving…' : 'More actions'}
            </Button>
          )}
        </Box>
      )}

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
