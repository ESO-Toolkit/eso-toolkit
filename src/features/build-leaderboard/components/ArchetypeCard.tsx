/**
 * One build archetype rendered as a comparison row.
 *
 * Composition is always visible: the recommended row carries the full breakdown,
 * while alternatives carry a bounded signature until expanded. The core/flex
 * split remains the product's payoff rather than disappearing behind a click.
 */

import {
  ExpandMore,
  InsertChartOutlined,
  LaunchOutlined,
  MoreHoriz,
  SaveOutlined,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Collapse,
  Divider,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import { ClassIcon } from '../../../components/ClassIcon';
import type { BuildCluster, ClusterTrait } from '../types/clustering.types';

import { TraitChipRow } from './TraitChipRow';

export interface ArchetypeCardProps {
  cluster: BuildCluster;
  /** Position in the prevalence-sorted cluster list. */
  rank: number;
  /** Total parses across all archetypes, for the adoption line. */
  totalParses: number;
  featured?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onOpenInEditor?: (cluster: BuildCluster) => void;
  onSaveBuild?: (cluster: BuildCluster) => void;
  onViewSourceLog?: (cluster: BuildCluster) => void;
  /** Which action is in flight for THIS row, if any. */
  pendingKind?: 'open' | 'save' | null;
  /** True while any action anywhere is running, so buttons cannot double-fire. */
  actionsDisabled?: boolean;
  /** Class name for the headline, e.g. "Arcanist". */
  esoClass?: string;
  /** Traits below the flex threshold, revealed within each trait row. */
  variations?: readonly ClusterTrait[];
  /** Medoid parse's page on esologs.com, for attribution. */
  sourceUrl?: string;
}

const compact = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(value));

const percent = (value: number): string => `${Math.round(value * 100)}%`;

const SPECIAL_GEAR_GROUPS = ['monsterSet', 'mythic', 'arena'] as const;
const GEAR_SIGNATURE_GROUPS = ['fivePieceSets', ...SPECIAL_GEAR_GROUPS] as const;
const SKILL_SIGNATURE_GROUPS = ['frontBar', 'backBar'] as const;

function summarySentence(cluster: BuildCluster, totalParses: number): string {
  return `${cluster.size} of the ${totalParses} fastest parses use this pattern. Half of them beat ${compact(cluster.dps.median)} DPS.`;
}

export const ArchetypeCard: React.FC<ArchetypeCardProps> = ({
  cluster,
  rank,
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
  const showAnalysis = featured || expanded;
  const showFullComposition = featured || expanded;
  const className = esoClass ?? cluster.esoClass;
  const hasMoreActions = Boolean(
    onSaveBuild || onViewSourceLog || sourceUrl || pendingKind === 'save',
  );

  const closeMenu = (): void => setMenuAnchor(null);

  return (
    <Paper
      component="article"
      id={`build-archetype-${cluster.id}`}
      data-testid={featured ? 'start-here-card' : 'archetype-card'}
      elevation={0}
      sx={(theme) => ({
        position: 'relative',
        borderRadius: 3.5,
        overflow: 'hidden',
        border: `1px solid ${alpha(
          featured ? theme.palette.primary.main : theme.palette.divider,
          featured ? 0.38 : 0.9,
        )}`,
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(155deg, rgba(15,23,42,0.76) 0%, rgba(3,7,18,0.62) 100%)'
            : 'linear-gradient(155deg, rgba(255,255,255,0.96) 0%, rgba(244,249,255,0.88) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: featured
          ? `0 14px 42px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.25 : 0.08)}, 0 0 42px ${alpha(theme.palette.primary.main, 0.07)}`
          : theme.palette.mode === 'dark'
            ? '0 8px 24px rgba(0,0,0,0.18)'
            : '0 6px 18px rgba(15,23,42,0.05)',
        '&::before': featured
          ? {
              content: '""',
              position: 'absolute',
              inset: '0 0 auto 0',
              height: 2,
              background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}, transparent)`,
            }
          : undefined,
        '&:hover': {
          transform: 'none',
          borderColor: alpha(theme.palette.primary.main, featured ? 0.5 : 0.28),
          boxShadow: featured
            ? `0 16px 46px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.28 : 0.09)}, 0 0 48px ${alpha(theme.palette.primary.main, 0.08)}`
            : theme.palette.mode === 'dark'
              ? '0 10px 30px rgba(0,0,0,0.22)'
              : '0 8px 22px rgba(15,23,42,0.07)',
        },
      })}
    >
      <Box sx={{ p: { xs: 1.5, sm: 2, md: featured ? 2.5 : 2 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'auto minmax(0, 1fr)', md: 'auto minmax(0, 1fr) auto' },
            gap: { xs: 1, sm: 1.5 },
            alignItems: 'start',
          }}
        >
          <Box
            aria-label={`Prevalence rank ${rank}`}
            sx={(theme) => ({
              width: { xs: 36, sm: 42 },
              height: { xs: 36, sm: 42 },
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${alpha(theme.palette.primary.main, featured ? 0.35 : 0.16)}`,
              backgroundColor: alpha(theme.palette.primary.main, featured ? 0.11 : 0.045),
              color: featured ? theme.palette.primary.main : theme.palette.text.secondary,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontWeight: 750,
              fontSize: { xs: '0.75rem', sm: '0.82rem' },
              fontVariantNumeric: 'tabular-nums',
            })}
          >
            #{rank}
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
              {className && <ClassIcon className={className} size={18} alt="" />}
              <Typography
                component="h2"
                sx={{
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  fontSize: { xs: '1rem', sm: featured ? '1.2rem' : '1.08rem' },
                  fontWeight: 720,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25,
                }}
              >
                {cluster.label}
              </Typography>
              {featured && (
                <Box
                  component="span"
                  sx={(theme) => ({
                    px: 0.8,
                    py: 0.25,
                    borderRadius: 999,
                    color: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.09),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    fontSize: '0.6rem',
                    fontWeight: 750,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  })}
                >
                  Recommended
                </Box>
              )}
            </Box>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mt: 0.55, fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
            >
              {summarySentence(cluster, totalParses)}
            </Typography>
            {featured && (
              <Typography
                variant="caption"
                sx={(theme) => ({ display: 'block', mt: 0.5, color: theme.palette.primary.main })}
              >
                The highest median among broadly adopted archetypes — a reliable place to begin.
              </Typography>
            )}
          </Box>

          <Stack
            direction="row"
            spacing={{ xs: 1.5, sm: 2.5 }}
            sx={{
              gridColumn: { xs: '1 / -1', md: 'auto' },
              pl: { xs: 0, sm: 6.5, md: 0 },
              pt: { xs: 0.5, md: 0 },
              justifyContent: { xs: 'space-between', sm: 'flex-start' },
            }}
          >
            <Box>
              <Typography
                className="u-tabular"
                sx={{ fontWeight: 780, fontSize: { xs: '1.1rem', sm: '1.25rem' }, lineHeight: 1 }}
              >
                {compact(cluster.dps.median)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.62rem' }}>
                Median DPS
              </Typography>
            </Box>
            <Box>
              <Typography className="u-tabular" sx={{ fontWeight: 650, fontSize: '0.86rem' }}>
                {compact(cluster.dps.q1)}–{compact(cluster.dps.q3)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.62rem' }}>
                Middle 50%
              </Typography>
            </Box>
            <Box>
              <Typography className="u-tabular" sx={{ fontWeight: 650, fontSize: '0.86rem' }}>
                {percent(cluster.share)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.62rem' }}>
                Adoption
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box
          sx={(theme) => ({
            mt: 2,
            px: { xs: 1.1, sm: 1.4 },
            py: 0.75,
            borderRadius: 2,
            backgroundColor: alpha(
              theme.palette.background.default,
              theme.palette.mode === 'dark' ? 0.32 : 0.48,
            ),
            border: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
          })}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 0.5,
              pb: 0.8,
            }}
          >
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: '0.67rem',
                fontWeight: 750,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Build composition
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.64rem' }}>
              {showFullComposition
                ? 'The bar under each piece shows how often it appears in this archetype.'
                : 'Top shared pieces shown. Open the full breakdown for every frequency.'}
            </Typography>
          </Box>

          {showFullComposition ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                columnGap: { md: 2 },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
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
          ) : (
            <>
              <TraitChipRow
                title="Gear signature"
                group={GEAR_SIGNATURE_GROUPS}
                core={cluster.core}
                flex={cluster.flex}
                variations={variations}
                maxVisible={4}
                showVariationsControl={false}
              />
              <TraitChipRow
                title="Skill signature"
                group={SKILL_SIGNATURE_GROUPS}
                core={cluster.core}
                flex={cluster.flex}
                variations={variations}
                maxVisible={5}
                showVariationsControl={false}
              />
            </>
          )}
        </Box>

        <Collapse in={showAnalysis} timeout="auto" unmountOnExit>
          <Box
            sx={(theme) => ({
              mt: 1.5,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(180px, 0.7fr) minmax(0, 1.3fr)' },
              gap: 1.5,
              p: 1.25,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              backgroundColor: alpha(theme.palette.background.default, 0.28),
            })}
          >
            <Box>
              <Box
                sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  Build consistency
                </Typography>
                <Typography className="u-tabular" variant="caption" sx={{ fontWeight: 750 }}>
                  {Math.round((1 - cluster.cohesion) * 100)}%
                </Typography>
              </Box>
              <Box
                sx={(theme) => ({
                  mt: 0.65,
                  height: 4,
                  borderRadius: 999,
                  overflow: 'hidden',
                  backgroundColor: alpha(theme.palette.text.primary, 0.08),
                })}
              >
                <Box
                  sx={(theme) => ({
                    width: `${Math.max((1 - cluster.cohesion) * 100, 2)}%`,
                    height: '100%',
                    borderRadius: 999,
                    backgroundColor: alpha(theme.palette.primary.main, 0.72),
                  })}
                />
              </Box>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>
              Consistency measures how closely the observed builds match one another. Actions open a
              real representative parse — never a synthetic average build.
            </Typography>
          </Box>
        </Collapse>

        <Divider sx={{ mt: 1.75, mb: 1.25, opacity: 0.65 }} />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.75,
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

          {!featured && onToggleExpand && (
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
                  }}
                />
              }
              sx={{ ml: { sm: 'auto' } }}
            >
              {expanded ? 'Show less' : 'Full breakdown'}
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};
