import {
  ArrowOutwardRounded,
  CloseRounded,
  FactCheckOutlined,
  HelpOutlineRounded,
  InsertChartOutlined,
  LaunchOutlined,
  MoreHoriz,
  SaveOutlined,
} from '@mui/icons-material';
import {
  Box,
  ButtonBase,
  Dialog,
  DialogContent,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React from 'react';

import { ClassIcon } from '../../../components/ClassIcon';
import { abilityIconUrl } from '../../../utils/abilityIconCorrections';
import { canonicalSetName } from '../clustering/canonicalization';
import { CORE_SHARE_THRESHOLD, FLEX_SHARE_THRESHOLD } from '../clustering/clusterSummary';
import { useRepresentativeBuild } from '../hooks/useRepresentativeBuild';
import { DPS_DATA_COLOR, getLeaderboardClassTheme } from '../theme/leaderboardTheme';
import type { BuildCluster, ClusterTrait } from '../types/clustering.types';

import { BuildSignatureStrip } from './BuildSignatureStrip';
import { TraitChipRow } from './TraitChipRow';

const RepresentativeBuildEvidence = React.lazy(() =>
  import('./RepresentativeBuildEvidence').then((module) => ({
    default: module.RepresentativeBuildEvidence,
  })),
);

const compactDps = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(value));

const SPECIAL_GEAR_GROUPS = ['monsterSet', 'mythic', 'arena'] as const;
const ASSET_ICON_ROOT = 'https://assets.rpglogs.com/img/eso/abilities/';

/**
 * Exported for tests. Like `assetIconUrl` in RepresentativeBuildEvidence, the
 * passthrough of `http…` values is deliberately absent: the icon name comes
 * from combatant data, and only the asset host may serve images.
 */
export const gearIconUrl = (icon?: string): string | undefined => {
  if (!icon) return undefined;
  return `${ASSET_ICON_ROOT}${encodeURIComponent(icon)}.png`;
};

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
  representativeDps?: number;
  /**
   * Pooled class view: amounts in cluster.dps are fractions of each boss's
   * ceiling, so the headline shows the medoid's RAW parse DPS instead and
   * percentages move to secondary text.
   */
  pooled?: boolean;
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
  representativeDps,
  pooled = false,
}) => {
  const theme = useTheme();
  const compactEvidence = useMediaQuery(theme.breakpoints.down('sm'));
  const classTheme = getLeaderboardClassTheme(cluster.esoClass);
  const representativeBuild = useRepresentativeBuild(cluster.medoidParseId, evidenceOpen);
  const representativeTraitIcons = React.useMemo(() => {
    const build = representativeBuild.build;
    if (!build) return new Map<string, string>();

    const icons = new Map<string, string>();
    const orderedTalents = [...build.combatant.talents].sort((a, b) => a.slot - b.slot);
    orderedTalents.forEach((talent, index) => {
      const iconUrl = abilityIconUrl(talent.icon, talent.abilityId);
      if (!iconUrl) return;
      const group = index < 6 ? 'frontBar' : 'backBar';
      icons.set(`${group}:${talent.abilityId}`, iconUrl);
    });

    build.combatant.sets.forEach((set) => {
      const piece = build.combatant.gear.find((candidate) => candidate.setId === set.setId);
      const iconUrl = gearIconUrl(piece?.icon);
      if (!iconUrl) return;
      icons.set(`set-id:${set.setId}`, iconUrl);
      if (set.name) icons.set(`set-label:${canonicalSetName(set.name)}`, iconUrl);
    });

    return icons;
  }, [representativeBuild.build]);
  const getRepresentativeTraitIcon = React.useCallback(
    (trait: ClusterTrait): string | undefined => {
      if (trait.group === 'frontBar' || trait.group === 'backBar') {
        return representativeTraitIcons.get(`${trait.group}:${trait.id}`);
      }
      return (
        representativeTraitIcons.get(`set-id:${trait.id}`) ??
        representativeTraitIcons.get(`set-label:${canonicalSetName(trait.label)}`)
      );
    },
    [representativeTraitIcons],
  );
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
      data-class-accent={classTheme.accent}
      aria-labelledby={`build-inspector-${cluster.id}`}
      sx={{
        display: 'flex',
        width: '100%',
        minWidth: 0,
        minHeight: '100%',
        flexDirection: 'column',
        p: { xs: 1.5, sm: 2.75, lg: 3.5 },
        animation: 'build-inspector-in 180ms ease-out both',
        '@keyframes build-inspector-in': {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Box
        data-testid={recommended ? 'start-here-card' : undefined}
        sx={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column' }}
      >
        <Box sx={{ display: 'flex', minWidth: 0, alignItems: 'flex-start', gap: 1.25 }}>
          <Box
            sx={(theme) => ({
              display: 'grid',
              width: 52,
              height: 52,
              flex: '0 0 auto',
              placeItems: 'center',
              border: `1px solid ${alpha(classTheme.accent, 0.42)}`,
              borderRadius: '50%',
              backgroundColor: alpha(
                classTheme.accent,
                theme.palette.mode === 'dark' ? 0.09 : 0.06,
              ),
              boxShadow: `0 0 28px ${alpha(classTheme.accent, 0.14)}, inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.06 : 0.72)}`,
            })}
          >
            <ClassIcon className={cluster.esoClass} size={29} alt="" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                display: 'flex',
                mb: 0.35,
                alignItems: 'center',
                gap: 0.6,
                color: classTheme.accent,
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '0.075em',
                textTransform: 'uppercase',
                '&::before': {
                  content: '""',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: 'currentColor',
                  boxShadow: recommended ? '0 0 10px currentColor' : 'none',
                },
              }}
            >
              {recommended ? 'Recommended starting point' : 'Selected build'}
            </Typography>
            <Typography
              id={`build-inspector-${cluster.id}`}
              component="h2"
              sx={(headingTheme) => ({
                maxWidth: 720,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontSize: { xs: '1.3rem', sm: '1.68rem' },
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.12,
                color:
                  headingTheme.palette.mode === 'dark'
                    ? headingTheme.palette.common.white
                    : headingTheme.palette.text.primary,
              })}
            >
              {label}
            </Typography>
            <Typography
              component="h3"
              sx={{
                mt: 0.7,
                maxWidth: 620,
                color: 'text.secondary',
                fontSize: '0.82rem',
                lineHeight: 1.5,
              }}
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
            mt: 2.5,
            overflow: 'hidden',
            borderTop: `1px solid ${alpha(classTheme.accent, 0.46)}`,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.54)}`,
            background: `linear-gradient(90deg, ${alpha(classTheme.accent, theme.palette.mode === 'dark' ? 0.07 : 0.045)}, transparent 56%)`,
          })}
        >
          <Box sx={{ pl: { xs: 0.75, sm: 1 }, pr: 1.25, py: 1.55 }}>
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '0.065em',
                textTransform: 'uppercase',
              }}
            >
              {pooled ? 'Representative parse' : 'Typical damage'}
            </Typography>
            <Typography
              className="u-tabular"
              sx={{
                mt: 0.05,
                color: DPS_DATA_COLOR,
                fontSize: { xs: '1.8rem', sm: '2.45rem' },
                fontWeight: 700,
                letterSpacing: '-0.035em',
              }}
            >
              {compactDps(pooled ? (representativeDps ?? cluster.dps.median) : cluster.dps.median)}
              <Box
                component="span"
                sx={{
                  ml: 0.55,
                  color: 'text.secondary',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                DPS
              </Box>
            </Typography>
            {pooled ? (
              <Box sx={{ mt: -0.15, display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <Typography
                  className="u-tabular"
                  sx={{ color: 'text.secondary', fontSize: '0.67rem', fontWeight: 500 }}
                >
                  Usually {Math.round(cluster.dps.median * 100)}% of each boss&apos;s top DPS (half
                  of runs: {Math.round(cluster.dps.q1 * 100)}–{Math.round(cluster.dps.q3 * 100)}%)
                </Typography>
                <Tooltip
                  arrow
                  title={`We compare each parse with the highest DPS logged on the same boss and difficulty. This build usually reaches ${Math.round(
                    cluster.dps.median * 100,
                  )}% of that top score. Half of its parses fall between ${Math.round(
                    cluster.dps.q1 * 100,
                  )}% and ${Math.round(cluster.dps.q3 * 100)}%.`}
                >
                  <IconButton
                    aria-label="Explain pooled DPS comparison"
                    size="small"
                    sx={{ flex: '0 0 auto', p: 0.15, color: 'text.secondary' }}
                  >
                    <HelpOutlineRounded sx={{ fontSize: '0.82rem' }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              <Typography
                className="u-tabular"
                sx={{ mt: -0.15, color: 'text.secondary', fontSize: '0.67rem', fontWeight: 500 }}
              >
                Middle half {compactDps(cluster.dps.q1)}–{compactDps(cluster.dps.q3)}
              </Typography>
            )}
          </Box>
          <Box
            sx={(theme) => ({
              px: { xs: 1.25, sm: 2.25 },
              py: 1.55,
              borderLeft: `1px solid ${alpha(theme.palette.divider, 0.52)}`,
            })}
          >
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '0.065em',
                textTransform: 'uppercase',
              }}
            >
              Seen in top parses
            </Typography>
            <Typography
              className="u-tabular"
              sx={{
                mt: 0.05,
                fontSize: { xs: '1.55rem', sm: '2rem' },
                fontWeight: 700,
                letterSpacing: '-0.035em',
              }}
            >
              {cluster.size}
              <Box component="span" sx={{ ml: 0.5, color: 'text.secondary', fontSize: '0.72rem' }}>
                of {totalParses}
              </Box>
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography
            sx={{
              mb: 0.75,
              color: 'text.secondary',
              fontSize: '0.64rem',
              fontWeight: 700,
              letterSpacing: '0.075em',
              textTransform: 'uppercase',
            }}
          >
            Defining setup
          </Typography>
          <BuildSignatureStrip cluster={cluster} />
        </Box>

        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.6,
            mt: { xs: 2, md: 'auto' },
            pt: 1.35,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.52)}`,
            '@media (max-width: 350px)': {
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 40px',
              '& > button:first-of-type': {
                gridColumn: '1 / -1',
                width: '100%',
                justifyContent: 'center',
              },
              '& > button:nth-of-type(2)': {
                width: '100%',
                justifyContent: 'center',
              },
            },
          })}
        >
          {onOpenInEditor && (
            <ButtonBase
              disabled={actionsDisabled}
              aria-label={pendingKind === 'open' ? 'Opening build editor' : 'Open in Build Editor'}
              onClick={() => onOpenInEditor(cluster)}
              sx={(theme) => ({
                display: 'inline-flex',
                minHeight: 40,
                alignItems: 'center',
                gap: 0.75,
                px: 1.45,
                borderRadius: 1.5,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                color: theme.palette.primary.contrastText,
                fontSize: '0.78rem',
                fontWeight: 700,
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? `0 9px 24px ${alpha(theme.palette.primary.main, 0.25)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.32)}`
                    : `0 8px 20px ${alpha(theme.palette.common.black, 0.16)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.2)}`,
                transition: 'transform 150ms ease, filter 150ms ease, box-shadow 150ms ease',
                '&:hover': { transform: 'translateY(-1px)', filter: 'brightness(1.04)' },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                },
                '&.Mui-disabled': { opacity: 0.45 },
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              })}
            >
              {pendingKind === 'open' ? 'Opening…' : 'Open in editor'}
              <ArrowOutwardRounded sx={{ fontSize: 17 }} />
            </ButtonBase>
          )}
          <ButtonBase
            aria-label="Show build evidence"
            aria-haspopup="dialog"
            aria-expanded={evidenceOpen}
            onClick={onToggleEvidence}
            sx={(theme) => ({
              display: 'inline-flex',
              minHeight: 40,
              alignItems: 'center',
              gap: 0.55,
              px: 1.15,
              borderRadius: 1.5,
              color: 'text.secondary',
              fontSize: '0.76rem',
              fontWeight: 600,
              border: `1px solid ${alpha(theme.palette.divider, 0.62)}`,
              backgroundColor: alpha(theme.palette.background.paper, 0.16),
              '& .MuiSvgIcon-root': { color: theme.palette.primary.main },
              '&:hover': {
                color: 'text.primary',
                borderColor: alpha(theme.palette.primary.main, 0.36),
                backgroundColor: alpha(theme.palette.primary.main, 0.075),
              },
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 1,
              },
            })}
          >
            View evidence
            <FactCheckOutlined sx={{ fontSize: 16 }} />
          </ButtonBase>
          {hasMoreActions && (
            <Tooltip title={pendingKind === 'save' ? 'Saving build' : 'More actions'}>
              <span>
                <IconButton
                  size="small"
                  disabled={actionsDisabled}
                  aria-label={pendingKind === 'save' ? 'Saving build' : 'More build actions'}
                  aria-haspopup="menu"
                  aria-expanded={Boolean(menuAnchor)}
                  onClick={(event) => setMenuAnchor(event.currentTarget)}
                  sx={(theme) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'text.primary',
                      backgroundColor: alpha(theme.palette.primary.main, 0.06),
                    },
                  })}
                >
                  <MoreHoriz sx={{ fontSize: 19 }} />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Dialog
        open={evidenceOpen}
        onClose={onToggleEvidence}
        fullScreen={compactEvidence}
        fullWidth
        maxWidth="md"
        aria-labelledby={`build-evidence-${cluster.id}`}
        aria-describedby={`build-evidence-summary-${cluster.id}`}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: alpha(theme.palette.common.black, 0.62),
              backdropFilter: 'blur(10px) saturate(90%)',
            },
          },
          paper: {
            sx: {
              maxHeight: compactEvidence ? '100dvh' : 'min(820px, calc(100dvh - 48px))',
              overflow: 'hidden',
              border: compactEvidence ? 0 : `1px solid ${alpha(theme.palette.divider, 0.82)}`,
              borderRadius: compactEvidence ? 0 : 3,
              backgroundColor: alpha(theme.palette.background.paper, 0.98),
              backgroundImage: 'none',
              boxShadow: `0 34px 90px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.58 : 0.22)}`,
            },
          },
        }}
      >
        <Box
          sx={(dialogTheme) => ({
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.25,
            px: { xs: 2, sm: 3 },
            py: { xs: 1.75, sm: 2.25 },
            borderBottom: `1px solid ${alpha(dialogTheme.palette.divider, 0.64)}`,
          })}
        >
          <Box
            sx={{
              display: 'grid',
              width: 40,
              height: 40,
              flex: '0 0 auto',
              placeItems: 'center',
              border: `1px solid ${alpha(classTheme.accent, 0.38)}`,
              borderRadius: 1.5,
              color: classTheme.accent,
              backgroundColor: alpha(classTheme.accent, 0.1),
            }}
          >
            <FactCheckOutlined sx={{ fontSize: 21 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              id={`build-evidence-${cluster.id}`}
              component="h2"
              sx={{
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontSize: { xs: '1.08rem', sm: '1.28rem' },
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              Build evidence
            </Typography>
            <Typography
              id={`build-evidence-summary-${cluster.id}`}
              noWrap={!compactEvidence}
              sx={{ mt: 0.2, color: 'text.secondary', fontSize: '0.76rem' }}
            >
              {compactEvidence
                ? `${compactDps(pooled ? (representativeDps ?? cluster.dps.median) : cluster.dps.median)} DPS · ${cluster.size} parses`
                : `${label} · ${compactDps(pooled ? (representativeDps ?? cluster.dps.median) : cluster.dps.median)} DPS · ${cluster.size} of ${totalParses} top parses`}
            </Typography>
          </Box>
          <IconButton
            aria-label="Close build evidence"
            onClick={onToggleEvidence}
            sx={(dialogTheme) => ({
              mt: -0.35,
              mr: -0.5,
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
                backgroundColor: alpha(dialogTheme.palette.text.primary, 0.06),
              },
            })}
          >
            <CloseRounded />
          </IconButton>
        </Box>

        <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
          {representativeBuild.loading && (
            <Box
              aria-label="Loading representative build"
              sx={(dialogTheme) => ({
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '0.75fr 1.25fr' },
                gap: 2,
                mb: 2.75,
                p: 1.75,
                border: `1px solid ${alpha(dialogTheme.palette.divider, 0.5)}`,
                borderRadius: 2.25,
              })}
            >
              <Box>
                <Skeleton width={170} height={22} />
                <Skeleton variant="rounded" height={160} sx={{ mt: 1 }} />
              </Box>
              <Box>
                <Skeleton width={120} height={22} />
                <Skeleton variant="rounded" height={160} sx={{ mt: 1 }} />
              </Box>
            </Box>
          )}

          {representativeBuild.error && (
            <Box
              role="status"
              sx={(dialogTheme) => ({
                mb: 2.75,
                px: 1.5,
                py: 1.15,
                borderLeft: `2px solid ${alpha(dialogTheme.palette.warning.main, 0.72)}`,
                backgroundColor: alpha(dialogTheme.palette.warning.main, 0.045),
              })}
            >
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                The observed loadout could not be loaded
              </Typography>
              <Typography sx={{ mt: 0.2, color: 'text.secondary', fontSize: '0.68rem' }}>
                The cluster-wide frequency evidence below is still available.
              </Typography>
            </Box>
          )}

          {representativeBuild.build && (
            <React.Suspense
              fallback={<Skeleton variant="rounded" height={190} sx={{ mb: 2.75 }} />}
            >
              <RepresentativeBuildEvidence
                build={representativeBuild.build}
                esoClass={cluster.esoClass}
                representativeDps={representativeDps}
                sourceUrl={sourceUrl}
              />
            </React.Suspense>
          )}

          <Box sx={{ mb: 1.4 }}>
            <Typography
              sx={{
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontSize: { xs: '1rem', sm: '1.15rem' },
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              What this archetype has in common
            </Typography>
            <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: '0.72rem' }}>
              Core = in {Math.round(CORE_SHARE_THRESHOLD * 100)}%+ of these {cluster.size} parses ·
              Common = {Math.round(FLEX_SHARE_THRESHOLD * 100)}–
              {Math.round(CORE_SHARE_THRESHOLD * 100) - 1}% · Less common = under{' '}
              {Math.round(FLEX_SHARE_THRESHOLD * 100)}%.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2.75,
            }}
          >
            <Box component="section" aria-label="Gear pattern frequency">
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                  columnGap: 3.5,
                  rowGap: 1.5,
                }}
              >
                <TraitChipRow
                  title="Gear sets"
                  group="fivePieceSets"
                  core={cluster.core}
                  flex={cluster.flex}
                  variations={variations}
                  getTraitIconUrl={getRepresentativeTraitIcon}
                />
                <TraitChipRow
                  title="Special pieces"
                  group={SPECIAL_GEAR_GROUPS}
                  core={cluster.core}
                  flex={cluster.flex}
                  variations={variations}
                  getTraitIconUrl={getRepresentativeTraitIcon}
                />
              </Box>
            </Box>
            <Box component="section" aria-label="Skill pattern frequency">
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                  columnGap: 3.5,
                  rowGap: 1.5,
                }}
              >
                <TraitChipRow
                  title="Front bar"
                  group="frontBar"
                  core={cluster.core}
                  flex={cluster.flex}
                  variations={variations}
                  getTraitIconUrl={getRepresentativeTraitIcon}
                />
                <TraitChipRow
                  title="Back bar"
                  group="backBar"
                  core={cluster.core}
                  flex={cluster.flex}
                  variations={variations}
                  getTraitIconUrl={getRepresentativeTraitIcon}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        slotProps={{
          paper: {
            sx: (theme) => ({
              minWidth: 230,
              mt: 0.75,
              p: 0.5,
              borderColor: alpha(theme.palette.divider, 0.72),
              borderRadius: 2,
              backgroundColor: `${alpha(theme.palette.background.paper, 0.98)} !important`,
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 18px 42px rgba(0,0,0,0.42)'
                  : '0 16px 36px rgba(15,23,42,0.14)',
              '& .MuiMenuItem-root': {
                minHeight: 40,
                borderRadius: 1.25,
                fontSize: '0.78rem',
              },
            }),
          },
        }}
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
