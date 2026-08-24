import {
  ArrowOutwardRounded,
  CloseRounded,
  FactCheckOutlined,
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
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
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
  const theme = useTheme();
  const compactEvidence = useMediaQuery(theme.breakpoints.down('sm'));
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
        display: 'flex',
        width: '100%',
        minWidth: 0,
        minHeight: '100%',
        flexDirection: 'column',
        p: { xs: 1.5, sm: 2.5, lg: 3 },
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
              width: 46,
              height: 46,
              flex: '0 0 auto',
              placeItems: 'center',
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              borderRadius: '50%',
              backgroundColor: alpha(theme.palette.background.default, 0.42),
              boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.72)}`,
            })}
          >
            <ClassIcon className={cluster.esoClass} size={25} alt="" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                display: 'flex',
                mb: 0.35,
                alignItems: 'center',
                gap: 0.6,
                color: recommended ? 'primary.main' : 'text.secondary',
                fontSize: '0.66rem',
                fontWeight: 700,
                letterSpacing: '0.055em',
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
              sx={{
                maxWidth: 720,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontSize: { xs: '1.16rem', sm: '1.42rem' },
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
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.divider, 0.52)}`,
            borderRadius: 2,
            backgroundColor: alpha(
              theme.palette.background.default,
              theme.palette.mode === 'dark' ? 0.3 : 0.46,
            ),
            boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.025 : 0.7)}`,
          })}
        >
          <Box sx={{ px: { xs: 1.25, sm: 1.5 }, py: 1.3 }}>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.68rem', fontWeight: 600 }}>
              Typical damage
            </Typography>
            <Typography
              className="u-tabular"
              sx={{
                mt: 0.05,
                fontSize: { xs: '1.35rem', sm: '1.65rem' },
                fontWeight: 700,
                letterSpacing: '-0.035em',
              }}
            >
              {compactDps(cluster.dps.median)}
              <Box component="span" sx={{ ml: 0.55, color: 'text.secondary', fontSize: '0.72rem' }}>
                DPS
              </Box>
            </Typography>
          </Box>
          <Box
            sx={(theme) => ({
              px: { xs: 1.25, sm: 1.5 },
              py: 1.3,
              borderLeft: `1px solid ${alpha(theme.palette.divider, 0.52)}`,
            })}
          >
            <Typography sx={{ color: 'text.secondary', fontSize: '0.68rem', fontWeight: 600 }}>
              Seen in top parses
            </Typography>
            <Typography
              className="u-tabular"
              sx={{
                mt: 0.05,
                fontSize: { xs: '1.35rem', sm: '1.65rem' },
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
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.055em',
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
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: theme.palette.mode === 'dark' ? theme.palette.background.default : '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 700,
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? `0 8px 22px ${alpha(theme.palette.primary.main, 0.2)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.32)}`
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
              fontWeight: 650,
              backgroundColor: 'transparent',
              '&:hover': {
                color: 'text.primary',
                backgroundColor: alpha(theme.palette.primary.main, 0.06),
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
              backgroundImage: `radial-gradient(circle at 88% 0%, ${alpha(theme.palette.primary.main, 0.1)}, transparent 34%)`,
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
            sx={(dialogTheme) => ({
              display: 'grid',
              width: 40,
              height: 40,
              flex: '0 0 auto',
              placeItems: 'center',
              border: `1px solid ${alpha(dialogTheme.palette.primary.main, 0.26)}`,
              borderRadius: 1.5,
              color: 'primary.main',
              backgroundColor: alpha(dialogTheme.palette.primary.main, 0.08),
            })}
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
              {label} · {cluster.size} of {totalParses} top parses
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
          <Box
            sx={(dialogTheme) => ({
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              mb: 2.5,
              overflow: 'hidden',
              border: `1px solid ${alpha(dialogTheme.palette.divider, 0.56)}`,
              borderRadius: 2,
              backgroundColor: alpha(dialogTheme.palette.background.default, 0.3),
            })}
          >
            {[
              ['Typical damage', `${compactDps(cluster.dps.median)} DPS`],
              ['Sample', `${cluster.size} of ${totalParses}`],
            ].map(([metricLabel, value], index) => (
              <Box
                key={metricLabel}
                sx={(dialogTheme) => ({
                  px: { xs: 1.35, sm: 1.75 },
                  py: 1.35,
                  borderLeft:
                    index === 0 ? 0 : `1px solid ${alpha(dialogTheme.palette.divider, 0.56)}`,
                })}
              >
                <Typography sx={{ color: 'text.secondary', fontSize: '0.66rem', fontWeight: 650 }}>
                  {metricLabel}
                </Typography>
                <Typography
                  className="u-tabular"
                  sx={{ mt: 0.15, fontSize: { xs: '1rem', sm: '1.15rem' }, fontWeight: 700 }}
                >
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              columnGap: 3.5,
              rowGap: 2.5,
            }}
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
