import { Box, ButtonBase, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import { ClassIcon } from '../../../components/ClassIcon';
import { GearSetTooltip } from '../../../components/GearSetTooltip';
import { LazySkillTooltip } from '../../../components/LazySkillTooltip';
import { abilityIconUrl } from '../../../utils/abilityIconCorrections';
import { getGearSetTooltipPropsByName } from '../../../utils/gearSetTooltipMapper';
import { RICH_TOOLTIP_SLOT_PROPS } from '../../../utils/richTooltipSlotProps';
import { buildTooltipPropsFromAbilityId } from '../../../utils/skillTooltipMapper';
import { getLeaderboardClassTheme } from '../theme/leaderboardTheme';
import type {
  DpsParseBuildResponse,
  DpsParseGearPiece,
  DpsParseTalent,
} from '../types/dpsParses.types';

const ASSET_ICON_ROOT = 'https://assets.rpglogs.com/img/eso/abilities/';

const compactDps = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(value));

function assetIconUrl(icon?: string): string | undefined {
  if (!icon) return undefined;
  if (icon.startsWith('http')) return icon;
  return `${ASSET_ICON_ROOT}${encodeURIComponent(icon)}.png`;
}

interface SetSummary {
  setId: number;
  name: string;
  pieces: DpsParseGearPiece[];
}

function summarizeSets(build: DpsParseBuildResponse): SetSummary[] {
  return build.combatant.sets
    .filter((set) => set.setId > 0)
    .map((set) => ({
      setId: set.setId,
      name: set.name || `Set ${set.setId}`,
      pieces: build.combatant.gear.filter((piece) => piece.setId === set.setId),
    }))
    .filter((set) => set.pieces.length > 0)
    .sort((left, right) => right.pieces.length - left.pieces.length);
}

const SkillTile: React.FC<{
  talent: DpsParseTalent;
  ultimate: boolean;
  accent: string;
}> = ({ talent, ultimate, accent }) => {
  const richTooltip = buildTooltipPropsFromAbilityId(talent.abilityId);
  const iconUrl =
    abilityIconUrl(talent.icon, talent.abilityId) ?? richTooltip?.iconUrl ?? undefined;
  const name = talent.name || richTooltip?.name || `Ability ${talent.abilityId}`;
  const tooltip = richTooltip ? (
    <LazySkillTooltip
      {...richTooltip}
      name={name}
      iconUrl={richTooltip.iconUrl || iconUrl}
      abilityId={talent.abilityId}
    />
  ) : (
    name
  );

  return (
    <Tooltip
      title={tooltip}
      arrow={!richTooltip}
      placement="top"
      enterTouchDelay={0}
      leaveTouchDelay={3000}
      slotProps={richTooltip ? RICH_TOOLTIP_SLOT_PROPS : undefined}
    >
      <ButtonBase
        aria-label={`${name}${ultimate ? ', ultimate' : ''}`}
        sx={(theme) => ({
          position: 'relative',
          width: { xs: ultimate ? 44 : 38, sm: ultimate ? 48 : 44 },
          height: { xs: ultimate ? 44 : 38, sm: ultimate ? 48 : 44 },
          overflow: 'hidden',
          flex: '0 0 auto',
          border: `${ultimate ? 2 : 1}px solid ${alpha(ultimate ? '#ffb300' : accent, 0.52)}`,
          borderRadius: ultimate ? 1.65 : 1.35,
          backgroundColor: alpha(theme.palette.background.default, 0.5),
          boxShadow: `0 6px 16px ${alpha(theme.palette.common.black, 0.18)}`,
          transition: 'border-color 150ms ease, filter 150ms ease',
          '&:hover': {
            zIndex: 1,
            borderColor: ultimate ? '#ffb300' : accent,
            filter: 'brightness(1.08)',
          },
          '&:focus-visible': { outline: `2px solid ${accent}`, outlineOffset: 2 },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        })}
      >
        {iconUrl ? (
          <Box
            component="img"
            src={iconUrl}
            alt=""
            sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Typography sx={{ color: 'text.disabled', fontSize: '0.56rem', fontWeight: 700 }}>
            {ultimate ? 'ULT' : '?'}
          </Typography>
        )}
      </ButtonBase>
    </Tooltip>
  );
};

const SkillBar: React.FC<{
  label: string;
  talents: readonly DpsParseTalent[];
  accent: string;
}> = ({ label, talents, accent }) => (
  <Box>
    <Typography
      sx={{
        mb: 0.65,
        color: 'text.secondary',
        fontSize: '0.61rem',
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Typography>
    <Box sx={{ display: 'flex', minHeight: 48, alignItems: 'center', gap: 0.65 }}>
      {talents.map((talent, index) => (
        <React.Fragment key={`${talent.slot}-${talent.abilityId}`}>
          {index === 5 && (
            <Box
              aria-hidden="true"
              sx={{ width: '1px', height: 30, mx: 0.15, backgroundColor: alpha('#ffb300', 0.28) }}
            />
          )}
          <SkillTile talent={talent} ultimate={index === 5} accent={accent} />
        </React.Fragment>
      ))}
    </Box>
  </Box>
);

export interface RepresentativeBuildEvidenceProps {
  build: DpsParseBuildResponse;
  esoClass: string;
  representativeDps?: number;
  sourceUrl?: string;
}

export const RepresentativeBuildEvidence: React.FC<RepresentativeBuildEvidenceProps> = ({
  build,
  esoClass,
  representativeDps,
  sourceUrl,
}) => {
  const classTheme = getLeaderboardClassTheme(esoClass);
  const sets = summarizeSets(build);
  const orderedTalents = [...build.combatant.talents].sort((a, b) => a.slot - b.slot);
  const frontBar = orderedTalents.slice(0, 6);
  const backBar = orderedTalents.slice(6, 12);

  return (
    <Box
      component="section"
      aria-labelledby="representative-build-heading"
      sx={(theme) => ({
        mb: 2.75,
        overflow: 'hidden',
        border: `1px solid ${alpha(classTheme.accent, 0.28)}`,
        borderRadius: 2.25,
        background: `radial-gradient(circle at 96% 0%, ${alpha(classTheme.accent, 0.13)}, transparent 42%), ${alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.34 : 0.5)}`,
        boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.035 : 0.72)}`,
      })}
    >
      <Box
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: { xs: 1.35, sm: 1.75 },
          py: 1.15,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        })}
      >
        <Box
          sx={{
            display: 'grid',
            width: 28,
            height: 28,
            placeItems: 'center',
            borderRadius: 1,
            color: classTheme.accent,
            backgroundColor: alpha(classTheme.accent, 0.1),
          }}
        >
          <ClassIcon className={esoClass} size={17} alt="" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            id="representative-build-heading"
            component="h3"
            sx={{ fontSize: '0.78rem', fontWeight: 700 }}
          >
            Observed representative loadout
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.45 }}>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
              Top parse by {build.playerName || 'anonymous player'}
              {representativeDps ? ` · ${compactDps(representativeDps)} DPS` : ''}
            </Typography>
            {sourceUrl && (
              <Typography
                component="a"
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                sx={{ color: classTheme.accent, fontSize: '0.68rem', fontWeight: 650 }}
              >
                View log ↗
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 1fr) auto' },
          gap: { xs: 2, md: 2.5 },
          p: { xs: 1.35, sm: 1.75 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              mb: 0.7,
              color: 'text.secondary',
              fontSize: '0.61rem',
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}
          >
            Equipped sets
          </Typography>
          <Box sx={{ display: 'grid', gap: 0.55 }}>
            {sets.map((set) => {
              const firstPiece = set.pieces[0];
              const iconUrl = assetIconUrl(firstPiece?.icon);
              const tooltipProps = getGearSetTooltipPropsByName(set.name, set.pieces.length);
              const tile = (
                <ButtonBase
                  aria-label={`View ${set.name} set details`}
                  sx={(theme) => ({
                    display: 'grid',
                    width: '100%',
                    gridTemplateColumns: '36px minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 0.9,
                    p: 0.5,
                    borderRadius: 1.25,
                    color: 'text.primary',
                    textAlign: 'left',
                    '&:hover': { backgroundColor: alpha(classTheme.accent, 0.065) },
                    '&:focus-visible': {
                      outline: `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: 1,
                    },
                  })}
                >
                  <Box
                    sx={(theme) => ({
                      display: 'grid',
                      width: 36,
                      height: 36,
                      overflow: 'hidden',
                      placeItems: 'center',
                      border: `1px solid ${alpha(classTheme.accent, 0.28)}`,
                      borderRadius: 1,
                      backgroundColor: alpha(theme.palette.background.default, 0.42),
                    })}
                  >
                    {iconUrl ? (
                      <Box
                        component="img"
                        src={iconUrl}
                        alt=""
                        sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Typography sx={{ color: 'text.disabled', fontSize: '0.58rem' }}>
                        SET
                      </Typography>
                    )}
                  </Box>
                  <Typography noWrap sx={{ minWidth: 0, fontSize: '0.76rem', fontWeight: 600 }}>
                    {set.name}
                  </Typography>
                  <Typography
                    className="u-tabular"
                    sx={{ color: classTheme.accent, fontSize: '0.68rem', fontWeight: 700 }}
                  >
                    {set.pieces.length}×
                  </Typography>
                </ButtonBase>
              );

              return tooltipProps ? (
                <Tooltip
                  key={set.setId}
                  title={<GearSetTooltip {...tooltipProps} iconUrl={iconUrl} />}
                  placement="top"
                  enterTouchDelay={0}
                  leaveTouchDelay={3000}
                  slotProps={RICH_TOOLTIP_SLOT_PROPS}
                >
                  {tile}
                </Tooltip>
              ) : (
                <React.Fragment key={set.setId}>{tile}</React.Fragment>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ display: 'grid', minWidth: 0, gap: 1.35 }}>
          {frontBar.length > 0 && (
            <SkillBar label="Front bar" talents={frontBar} accent={classTheme.accent} />
          )}
          {backBar.length > 0 && (
            <SkillBar label="Back bar" talents={backBar} accent={classTheme.accent} />
          )}
        </Box>
      </Box>
    </Box>
  );
};
