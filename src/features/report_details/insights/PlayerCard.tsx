import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState } from 'react';

import mundusIcon from '../../../assets/MundusStone.png';
import { ClassIcon } from '../../../components/ClassIcon';
import { GearDetailsPanel } from '../../../components/GearDetailsPanel';
import { GearSetTooltip } from '../../../components/GearSetTooltip';
import type { GearPieceInfo } from '../../../components/GearSetTooltip';
import { LazySkillTooltip as SkillTooltip } from '../../../components/LazySkillTooltip';
import { OneLineAutoFit } from '../../../components/OneLineAutoFit';
import { PlayerIcon } from '../../../components/PlayerIcon';
import { ScribingSkillsDisplay, GrimoireData } from '../../../components/ScribingSkillsDisplay';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { type ClassAnalysisResult } from '../../../utils/classDetectionUtils';
import { BuildIssue } from '../../../utils/detectBuildIssues';
import { PlayerGearSetRecord } from '../../../utils/gearUtilities';
import { resolveActorName } from '../../../utils/resolveActorName';
import { abbreviateSkillLine } from '../../../utils/skillLineDetectionUtils';
import { buildTooltipProps } from '../../../utils/skillTooltipMapper';

import { getArmorWeightCounts } from '@/utils/armorUtils';
import { toClassKey } from '@/utils/classNameUtils';
import { abbreviateFood, detectFoodFromAuras, getFoodColor } from '@/utils/foodDetectionUtils';
import { createGearSetTooltipProps } from '@/utils/gearSetTooltipMapper';
import { buildVariantSx, getGearChipProps } from '@/utils/playerCardStyleUtils';

interface PlayerCardProps {
  player: PlayerDetailsWithRole;
  mundusBuffs: Array<{ name: string; id: number }>;
  championPoints: Array<{ name: string; id: number; color: 'red' | 'blue' | 'green' }>;
  auras: Array<{ name: string; id: number; stacks?: number }>;
  scribingSkills: GrimoireData[];
  buildIssues: BuildIssue[];
  classAnalysis?: ClassAnalysisResult;
  deaths: number;
  resurrects: number;
  cpm: number;
  maxHealth: number;
  maxStamina: number;
  maxMagicka: number;
  reportId?: string | null;
  fightId?: string | null;
  playerGear: PlayerGearSetRecord[];
}

export const PlayerCard: React.FC<PlayerCardProps> = React.memo(
  ({
    player,
    mundusBuffs,
    championPoints,
    auras,
    scribingSkills,
    buildIssues,
    classAnalysis,
    deaths,
    resurrects,
    cpm,
    maxHealth,
    maxStamina,
    maxMagicka,
    reportId,
    fightId,
    playerGear,
  }) => {
    const theme = useTheme();

    // Encoded pins filter provided by user for casts view
    const CASTS_PINS =
      '2%24Off%24%23244F4B%24expression%24ability.id+NOT+IN%2816499%2C28541%2C16165%2C16145%2C18350%2C28549%2C45223%2C18396%2C16277%2C115548%2C85572%2C23196%2C95040%2C39301%2C63507%2C22269%2C95042%2C191078%2C32910%2C41963%2C16261%2C45221%2C48076%2C32974%2C21970%2C41838%2C16565%2C45227%2C118604%2C26832%2C15383%2C45382%2C16420%2C68401%2C47193%2C190583%2C16212%2C228524%2C186981%2C16037%2C15435%2C15279%2C72931%2C45228%2C16688%2C61875%2C61874%29';

    const castsUrl = React.useCallback((rid?: string, fid?: string | null) => {
      if (!rid) return undefined;
      const fightParam = fid ? `&fight=${encodeURIComponent(fid)}` : '';
      return `https://www.esologs.com/reports/${encodeURIComponent(rid)}?type=casts${fightParam}&pins=${CASTS_PINS}`;
    }, []);

    const talents = React.useMemo(
      () => player?.combatantInfo?.talents ?? [],
      [player?.combatantInfo?.talents],
    );
    const gear = player?.combatantInfo?.gear ?? [];
    const armorWeights = getArmorWeightCounts(gear);

    // State for gear details panel
    const [gearDetailsOpen, setGearDetailsOpen] = useState(false);

    // Get dynamic skill lines from class analysis
    const detectedSkillLines = classAnalysis?.skillLines || [];

    const foodAura = detectFoodFromAuras(auras);

    // Memoize tooltip props lookup to avoid repeated function calls
    const tooltipPropsLookup = React.useMemo(() => {
      const lookup = new Map<number, ReturnType<typeof buildTooltipProps>>();
      const clsKey = toClassKey(player.type);

      talents.forEach((talent) => {
        const key = talent.guid;
        if (!lookup.has(key)) {
          const tooltipProps = buildTooltipProps({
            abilityId: talent.guid,
            abilityName: talent.name,
            classKey: clsKey,
          });
          lookup.set(key, tooltipProps);
        }
      });

      return lookup;
    }, [talents, player.type]);

    // Memoize card styles to prevent recalculations
    const cardStyles = React.useMemo(
      () => ({
        width: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        background:
          'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)',
        border:
          theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(59, 130, 246, 0.3)',
      }),
      [theme.palette.mode],
    );

    // Memoize expensive gear chip props - sorted by count descending
    const gearChips = React.useMemo(
      () =>
        playerGear
          ?.slice()
          .sort((a, b) => b.count - a.count) // Sort by count descending (highest first)
          .map((rec, idx) => ({
            key: `${rec.data.setID}-${idx}`,
            label: `${rec.count} ${rec.labelName}`,
            title: `Set ID: ${rec.data.setID ?? ''}`,
            ...getGearChipProps(rec.labelName, rec.count, theme),
          })) ?? [],
      [playerGear, theme],
    );

    // Memoize role information
    const roleInfo = React.useMemo(() => {
      const roleType =
        player.role === 'tank' ? 'Tank' : player.role === 'healer' ? 'Healer' : 'DPS';
      const roleEmoji = player.role === 'tank' ? '🛡️' : player.role === 'healer' ? '❤️' : '⚔️';
      return { roleType, roleEmoji };
    }, [player.role]);

    // Memoize food information
    const foodInfo = React.useMemo(() => {
      if (!foodAura) return { display: 'NONE', color: '#888' };
      return {
        display: abbreviateFood(foodAura.name),
        color: getFoodColor(foodAura.id),
      };
    }, [foodAura]);

    return (
      <Box sx={{ minWidth: 0, display: 'flex' }}>
        <Card variant="outlined" className="u-hover-lift u-fade-in-up" sx={cardStyles}>
          <CardContent
            sx={{ p: 2, pb: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <Box
              display="flex"
              flexDirection="column"
              alignItems="stretch"
              gap={2}
              sx={{ flex: 1, minHeight: 0, justifyContent: 'space-between' }}
            >
              {/* Left column: identity, talents, gear, issues */}
              <Box flex={0} minWidth={0}>
                <Box display="flex" alignItems="center" mb={1.5} sx={{ position: 'relative' }}>
                  <PlayerIcon player={player} />
                  <Box>
                    <Box display="flex" alignItems="center" gap={0.75}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontFamily: 'space grotesk',
                          fontSize: '1.15rem',
                          fontWeight: 100,
                          lineHeight: 1.2,
                        }}
                      >
                        {resolveActorName(player)}
                      </Typography>
                      <Box display="inline-flex" alignItems="center" gap={0.35}>
                        <ShieldOutlinedIcon sx={{ color: 'text.secondary', fontSize: 26 }} />
                        <Typography
                          variant="caption"
                          sx={{
                            color: (theme) =>
                              theme.palette.mode === 'light' ? '#c44e4e' : '#ff7a7a',
                            fontSize: 11,
                            lineHeight: 1,
                            fontWeight: 500,
                          }}
                        >
                          {armorWeights.heavy}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', fontSize: 9, lineHeight: 1 }}
                        >
                          •
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: (theme) =>
                              theme.palette.mode === 'light' ? '#3db03d' : '#93f093',
                            fontSize: 11,
                            lineHeight: 1,
                            fontWeight: 500,
                          }}
                        >
                          {armorWeights.medium}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', fontSize: 9, lineHeight: 1 }}
                        >
                          •
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: '#3c9bff', fontSize: 11, lineHeight: 1 }}
                        >
                          {armorWeights.light}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Tooltip
                    title={`Role: ${roleInfo.roleType}`}
                    enterTouchDelay={0}
                    leaveTouchDelay={3000}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: 32,
                          lineHeight: 1,
                          filter: 'none',
                        }}
                        role="img"
                        aria-label={`Role: ${roleInfo.roleType}`}
                      >
                        {roleInfo.roleEmoji}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
                <Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      minWidth: 0,
                      mt: 0.25,
                      mb: 0.5,
                      pr: 1,
                      pl: 0,
                    }}
                  >
                    <OneLineAutoFit minScale={0.9}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {detectedSkillLines.map((skill, idx) => {
                          const title = skill.skillLine;
                          const icon = toClassKey(skill.className);

                          return (
                            <Tooltip
                              key={idx}
                              title={title}
                              enterTouchDelay={0}
                              leaveTouchDelay={3000}
                            >
                              <Box
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.35,
                                }}
                              >
                                {idx > 0 && (
                                  <Typography
                                    variant="caption"
                                    sx={{ color: 'text.secondary', opacity: 0.7 }}
                                  >
                                    •
                                  </Typography>
                                )}
                                <ClassIcon
                                  className={icon}
                                  size={12}
                                  style={{ opacity: 0.8, flexShrink: 0 }}
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  noWrap
                                  sx={{ lineHeight: 1.05, fontSize: '0.70rem' }}
                                >
                                  {abbreviateSkillLine(skill.skillLine)}
                                </Typography>
                              </Box>
                            </Tooltip>
                          );
                        })}
                      </Box>
                    </OneLineAutoFit>
                  </Box>
                </Box>

                {/* Talents */}
                {talents.length > 0 && (
                  <Box mb={1.5}>
                    <Box display="flex" flexWrap="wrap" gap={1.25} mb={1.25}>
                      {talents.slice(0, 6).map((talent, idx) => {
                        const isUltimate = idx === 5;
                        return (
                          <React.Fragment key={idx}>
                            {isUltimate && (
                              <Box
                                sx={{
                                  width: 2,
                                  height: 34,
                                  bgcolor: 'rgba(124,207,252,0.55)',
                                  borderRadius: 0.5,
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <Box
                              component="span"
                              sx={{ display: 'inline-flex', alignItems: 'center' }}
                            >
                              <Tooltip
                                enterTouchDelay={0}
                                leaveTouchDelay={3000}
                                title={(() => {
                                  // Use memoized tooltip props lookup
                                  const rich = tooltipPropsLookup.get(talent.guid);
                                  const base = {
                                    name: talent.name,
                                    description: `${talent.name} (ID: ${talent.guid})`,
                                  };
                                  return (
                                    <SkillTooltip
                                      {...(rich ?? base)}
                                      name={
                                        isUltimate
                                          ? `${rich?.name ?? base.name} (Ultimate)`
                                          : (rich?.name ?? base.name)
                                      }
                                      iconUrl={
                                        rich?.iconUrl ||
                                        `https://assets.rpglogs.com/img/eso/abilities/${talent.abilityIcon}.png`
                                      }
                                      abilityId={talent.guid}
                                    />
                                  );
                                })()}
                                placement="top-start"
                                enterDelay={0}
                                arrow
                                disableInteractive
                                PopperProps={{
                                  disablePortal: true,
                                  modifiers: [
                                    {
                                      name: 'preventOverflow',
                                      options: {
                                        altAxis: true,
                                        altBoundary: true,
                                        tether: false,
                                        rootBoundary: 'document',
                                        padding: 16,
                                      },
                                    },
                                    {
                                      name: 'flip',
                                      enabled: true,
                                      options: {
                                        altBoundary: true,
                                        rootBoundary: 'document',
                                        padding: 16,
                                        fallbackPlacements: ['bottom'],
                                      },
                                    },
                                    {
                                      name: 'arrow',
                                      enabled: true,
                                    },
                                  ],
                                }}
                                slotProps={{
                                  tooltip: { sx: { maxWidth: 320, p: 0 } },
                                }}
                              >
                                <Avatar
                                  src={`https://assets.rpglogs.com/img/eso/abilities/${talent.abilityIcon}.png`}
                                  alt={talent.name}
                                  variant="rounded"
                                  sx={{
                                    width: isUltimate ? 34 : 32,
                                    height: isUltimate ? 34 : 32,
                                    border: isUltimate
                                      ? '1.5px solid #b3b3b3f2'
                                      : theme.palette.mode === 'dark'
                                        ? '1px solid #b5b8bd59'
                                        : '1px solid #1e3a8a',
                                    boxShadow: isUltimate
                                      ? 'inset 0 2px 4px rgb(0 0 0 / 100%), 0 0 0 1px rgb(255 255 255 / 18%), 0 0 10px rgb(255 255 255 / 25%), 0 2px 6px rgb(0 0 0 / 60%)'
                                      : 'none',
                                  }}
                                />
                              </Tooltip>
                            </Box>
                          </React.Fragment>
                        );
                      })}
                    </Box>
                    {talents.length > 6 && (
                      <Box display="flex" flexWrap="wrap" gap={1.25} mt={0.25}>
                        {talents.slice(6).map((talent, idx) => {
                          const isUltimate = idx === 5;
                          return (
                            <React.Fragment key={idx}>
                              {isUltimate && (
                                <Box
                                  sx={{
                                    width: 2,
                                    height: 34,
                                    bgcolor: 'rgba(124,207,252,0.55)',
                                    borderRadius: 0.5,
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <Box
                                component="span"
                                sx={{ display: 'inline-flex', alignItems: 'center' }}
                              >
                                <Tooltip
                                  enterTouchDelay={0}
                                  leaveTouchDelay={3000}
                                  title={(() => {
                                    // Use memoized tooltip props lookup
                                    const rich = tooltipPropsLookup.get(talent.guid);
                                    const base = {
                                      name: talent.name,
                                      description: `${talent.name} (ID: ${talent.guid})`,
                                    };
                                    return (
                                      <SkillTooltip
                                        {...(rich ?? base)}
                                        name={
                                          isUltimate
                                            ? `${rich?.name ?? base.name} (Ultimate)`
                                            : (rich?.name ?? base.name)
                                        }
                                        iconUrl={
                                          rich?.iconUrl ||
                                          `https://assets.rpglogs.com/img/eso/abilities/${talent.abilityIcon}.png`
                                        }
                                        abilityId={talent.guid}
                                      />
                                    );
                                  })()}
                                  placement="top-start"
                                  enterDelay={0}
                                  arrow
                                  disableInteractive
                                  PopperProps={{
                                    disablePortal: true,
                                    modifiers: [
                                      {
                                        name: 'preventOverflow',
                                        options: {
                                          altAxis: true,
                                          altBoundary: true,
                                          tether: false,
                                          rootBoundary: 'document',
                                          padding: 16,
                                        },
                                      },
                                      {
                                        name: 'flip',
                                        enabled: true,
                                        options: {
                                          altBoundary: true,
                                          rootBoundary: 'document',
                                          padding: 16,
                                          fallbackPlacements: ['bottom'],
                                        },
                                      },
                                      {
                                        name: 'arrow',
                                        enabled: true,
                                      },
                                    ],
                                  }}
                                  slotProps={{
                                    tooltip: { sx: { maxWidth: 320, p: 0 } },
                                  }}
                                >
                                  <Avatar
                                    src={`https://assets.rpglogs.com/img/eso/abilities/${talent.abilityIcon}.png`}
                                    alt={talent.name}
                                    variant="rounded"
                                    sx={{
                                      width: isUltimate ? 34 : 32,
                                      height: isUltimate ? 34 : 32,
                                      border: isUltimate
                                        ? '1.5px solid #b3b3b3f2'
                                        : theme.palette.mode === 'dark'
                                          ? '1px solid #b5b8bd59'
                                          : '1px solid #1e3a8a',
                                      boxShadow: isUltimate
                                        ? 'inset 0 2px 4px rgb(0 0 0 / 100%), 0 0 0 1px rgb(255 255 255 / 18%), 0 0 10px rgb(255 255 255 / 25%), 0 2px 6px rgb(0 0 0 / 60%)'
                                        : 'none',
                                    }}
                                  />
                                </Tooltip>
                              </Box>
                            </React.Fragment>
                          );
                        })}
                      </Box>
                    )}
                    {gear.length > 0 && (
                      <Box mt={1.25} sx={{ pt: 0.9, pb: 0 }}>
                        <Box display="flex" flexWrap="wrap" gap={1.25} minHeight={48}>
                          {gearChips.map((chipData, index) => {
                            // Find the corresponding gear record for tooltip
                            const gearRecord = playerGear[index];
                            const tooltipProps = gearRecord
                              ? createGearSetTooltipProps(gearRecord, player.combatantInfo.gear)
                              : null;

                            if (tooltipProps) {
                              return (
                                <Tooltip
                                  key={chipData.key}
                                  title={<GearSetTooltip {...tooltipProps} />}
                                  placement="top"
                                  enterDelay={300}
                                  arrow
                                  disableInteractive={false}
                                  PopperProps={{
                                    disablePortal: true,
                                    modifiers: [
                                      {
                                        name: 'preventOverflow',
                                        options: {
                                          altAxis: true,
                                          altBoundary: true,
                                          tether: false,
                                          rootBoundary: 'document',
                                          padding: 16,
                                        },
                                      },
                                      {
                                        name: 'flip',
                                        enabled: true,
                                        options: {
                                          altBoundary: true,
                                          rootBoundary: 'document',
                                          padding: 16,
                                          fallbackPlacements: ['bottom', 'left', 'right'],
                                        },
                                      },
                                    ],
                                  }}
                                >
                                  <Box
                                    onClick={() => {
                                      setGearDetailsOpen(true);
                                    }}
                                    sx={{ cursor: 'pointer' }}
                                  >
                                    <Chip label={chipData.label} size="small" sx={chipData.sx} />
                                  </Box>
                                </Tooltip>
                              );
                            }

                            // Fallback to simple chip with basic tooltip if no gear set data
                            return (
                              <Chip
                                key={chipData.key}
                                label={chipData.label}
                                size="small"
                                title={chipData.title}
                                sx={chipData.sx}
                              />
                            );
                          })}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>

              {/* Right column content stacked below left, full width */}
              <Box
                sx={{
                  width: '100%',
                  mt: 'auto',
                  pt: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    border: '1px solid var(--border)',
                    borderRadius: 1,
                    backgroundColor:
                      theme.palette.mode === 'dark' ? 'rgb(0 0 0 / 26%)' : 'rgb(223 239 255 / 25%)',
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? 'rgb(0 0 0) 0px 2px 4px'
                        : 'rgb(167 199 220) 0px 2px 4px',
                  }}
                >
                  <Box
                    sx={{
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      minWidth: 0,
                      minHeight: 28,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'nowrap',
                        gap: 1,
                        minHeight: 24,
                        flex: '1 1 auto',
                        minWidth: 0,
                        overflow: 'hidden',
                        mr: 1,
                      }}
                    >
                      {mundusBuffs.length > 0 && (
                        <>
                          {mundusBuffs.map((buff, idx) => (
                            <Box
                              key={idx}
                              component="span"
                              title={`Ability ID: ${buff.id}`}
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                border: '1px solid',
                                borderColor: 'var(--border)',
                                borderRadius: 9999,
                                pl: 0.5,
                                pr: '14px',
                                py: 0.25,
                                gap: 0.5,
                                fontSize: 10,
                                lineHeight: 1,
                                color: 'primary.main',
                                whiteSpace: 'nowrap',
                                verticalAlign: 'middle',
                                textTransform: 'uppercase',
                                fontWeight: 'bold',
                              }}
                            >
                              <img
                                src={mundusIcon}
                                alt=""
                                style={{
                                  width: 12,
                                  height: 12,
                                  display: 'inline-block',
                                }}
                              />
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-block',
                                  minWidth: 0,
                                  maxWidth: '10ch',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {buff.name.replace(/^Boon:\s*/i, '').replace(/^The\s+/i, '')}
                              </Box>
                            </Box>
                          ))}
                        </>
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        whiteSpace: 'nowrap',
                        flex: '0 0 auto',
                        flexShrink: 0,
                        ml: 'auto',
                        pr: 1,
                        maxWidth: '100%',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <Tooltip
                        title={`Food/Drink: ${foodAura ? foodAura.name : 'None'}`}
                        enterTouchDelay={0}
                        leaveTouchDelay={3000}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <span role="img" aria-label="food">
                            🍲
                          </span>
                          &nbsp;
                          <Box
                            component="span"
                            sx={{
                              display: 'inline',
                              fontWeight: 700,
                              fontSize: 11,
                              letterSpacing: '.02em',
                              color: foodInfo.color,
                            }}
                          >
                            {foodInfo.display}
                          </Box>
                        </span>
                      </Tooltip>{' '}
                      •{' '}
                      <Tooltip
                        title="Deaths in this fight"
                        enterTouchDelay={0}
                        leaveTouchDelay={3000}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <span role="img" aria-label="deaths">
                            💀
                          </span>
                          &nbsp;{deaths}
                        </span>
                      </Tooltip>{' '}
                      •{' '}
                      <Tooltip
                        title="Successful resurrects performed"
                        enterTouchDelay={0}
                        leaveTouchDelay={3000}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <span role="img" aria-label="resurrects">
                            ❤️
                          </span>
                          &nbsp;{resurrects}
                        </span>
                      </Tooltip>{' '}
                      •{' '}
                      <Tooltip title="Casts per Minute" enterTouchDelay={0} leaveTouchDelay={3000}>
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <span role="img" aria-label="cpm">
                            🐭
                          </span>
                          &nbsp;
                          {reportId ? (
                            <a
                              href={castsUrl(reportId, fightId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'inherit', textDecoration: 'underline' }}
                            >
                              {cpm}
                            </a>
                          ) : (
                            <>{cpm}</>
                          )}
                        </span>
                      </Tooltip>
                    </Typography>
                  </Box>

                  {(maxHealth > 0 || maxStamina > 0 || maxMagicka > 0) && (
                    <Box
                      sx={{
                        mb: 1.5,
                        p: 1,
                        borderRadius: '10px',
                        background:
                          'linear-gradient(135deg, rgb(153 210 255 / 15%) 0%, rgb(255 210 210 / 33%) 55%, rgb(177 255 205 / 29%) 100%)',
                        border:
                          theme.palette.mode === 'dark'
                            ? '1px solid rgba(255,255,255,0.05)'
                            : '1px solid rgba(0,0,0,0.05)',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                        }}
                      >
                        {maxMagicka > 0 && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 0.5,
                              flex: 1,
                            }}
                          >
                            <Tooltip title="Max Magicka" enterTouchDelay={0} leaveTouchDelay={3000}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  background:
                                    theme.palette.mode === 'dark'
                                      ? 'radial-gradient(circle at 30% 30%, #8cc8ff 0%, #74c0fc 50%, #339af0 100%)'
                                      : 'radial-gradient(circle at 30% 30%, #60a5fa 0%, #2563eb 50%, #1d4ed8 100%)',
                                  boxShadow:
                                    theme.palette.mode === 'dark'
                                      ? '0 0 8px rgba(116, 192, 252, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                                      : '0 0 6px rgba(37, 99, 235, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                                  cursor: 'default',
                                }}
                              />
                            </Tooltip>
                            <Typography
                              variant="caption"
                              sx={{
                                color: theme.palette.mode === 'dark' ? '#ffffff' : '#374151',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                              }}
                            >
                              {maxMagicka.toLocaleString()}
                            </Typography>
                          </Box>
                        )}
                        {maxHealth > 0 && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 0.5,
                              flex: 1,
                            }}
                          >
                            <Tooltip title="Max Health" enterTouchDelay={0} leaveTouchDelay={3000}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  background:
                                    theme.palette.mode === 'dark'
                                      ? 'radial-gradient(circle at 30% 30%, #ff8a8a 0%, #ff6b6b 50%, #ee5a5a 100%)'
                                      : 'radial-gradient(circle at 30% 30%, #f87171 0%, #dc2626 50%, #b91c1c 100%)',
                                  boxShadow:
                                    theme.palette.mode === 'dark'
                                      ? '0 0 8px rgba(255, 107, 107, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                                      : '0 0 6px rgba(220, 38, 38, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                                  cursor: 'default',
                                }}
                              />
                            </Tooltip>
                            <Typography
                              variant="caption"
                              sx={{
                                color: theme.palette.mode === 'dark' ? '#ffffff' : '#374151',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                              }}
                            >
                              {maxHealth.toLocaleString()}
                            </Typography>
                          </Box>
                        )}
                        {maxStamina > 0 && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 0.5,
                              flex: 1,
                            }}
                          >
                            <Tooltip title="Max Stamina" enterTouchDelay={0} leaveTouchDelay={3000}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  background:
                                    theme.palette.mode === 'dark'
                                      ? 'radial-gradient(circle at 30% 30%, #6bcf7f 0%, #51cf66 50%, #37b24d 100%)'
                                      : 'radial-gradient(circle at 30% 30%, #34d399 0%, #059669 50%, #047857 100%)',
                                  boxShadow:
                                    theme.palette.mode === 'dark'
                                      ? '0 0 8px rgba(81, 207, 102, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                                      : '0 0 6px rgba(5, 150, 105, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                                  cursor: 'default',
                                }}
                              />
                            </Tooltip>
                            <Typography
                              variant="caption"
                              sx={{
                                color: theme.palette.mode === 'dark' ? '#ffffff' : '#374151',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                              }}
                            >
                              {maxStamina.toLocaleString()}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  )}

                  {auras.length > 0 && (
                    <Box sx={{}}>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{ mb: 1, fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        Notable Auras
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1} sx={{ minHeight: 40 }}>
                        {auras
                          .slice()
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .slice(0, 3)
                          .map((aura, idx) => (
                            <Chip
                              key={idx}
                              label={
                                aura.stacks && aura.stacks > 1
                                  ? `${aura.name} (${aura.stacks})`
                                  : aura.name
                              }
                              size="small"
                              title={`Ability ID: ${aura.id}${aura.stacks ? ` | Stacks: ${aura.stacks}` : ''}`}
                              sx={{
                                ...buildVariantSx('indigo', theme),
                                '& .MuiChip-label': { fontSize: '0.58rem' },
                              }}
                            />
                          ))}
                      </Box>
                    </Box>
                  )}

                  {championPoints.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{ mb: 1, fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        Champion Points
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1} sx={{ minHeight: 40 }}>
                        {championPoints.map((cp, idx) => (
                          <Chip
                            key={`cp-${idx}`}
                            label={cp.name}
                            size="small"
                            title={`Champion Point: ${cp.name} (ID: ${cp.id})`}
                            sx={{
                              ...buildVariantSx(
                                cp.color === 'red'
                                  ? 'championRed'
                                  : cp.color === 'blue'
                                    ? 'championBlue'
                                    : 'championGreen',
                                theme,
                              ),
                              '& .MuiChip-label': { fontSize: '0.58rem' },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {scribingSkills.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <ScribingSkillsDisplay grimoires={scribingSkills} />
                    </Box>
                  )}
                </Box>

                {buildIssues.length === 0 && (
                  <Box
                    sx={{
                      mt: 1,
                      border: '1px solid',
                      borderColor: 'success.main',
                      backgroundColor: 'rgba(76,175,80,0.07)',
                      borderRadius: 1,
                      borderTopLeftRadius: '5px',
                      borderTopRightRadius: '5px',
                      borderTop: '1px solid #54775496',
                      px: 2,
                      height: 48,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleOutlineIcon sx={{ color: 'success.main' }} />
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{
                          color: 'success.main',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        Build checks out
                      </Typography>
                    </Box>
                  </Box>
                )}

                {buildIssues.length > 0 && (
                  <Accordion
                    variant="outlined"
                    sx={{
                      mt: 1,
                      borderColor: theme.palette.mode === 'light' ? '#000000' : 'warning.main',
                      backgroundColor: 'rgba(255,193,7,0.07)',
                      borderTop: '1px solid #5c574d',
                      borderTopLeftRadius: '5px',
                      borderTopRightRadius: '5px',
                      overflow: 'hidden',
                      '&.Mui-expanded': {
                        borderTop: 'none',
                        borderTopLeftRadius: '5px',
                        borderTopRightRadius: '5px',
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: 'warning.main' }} />}
                      sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center' } }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{
                          color: theme.palette.mode === 'dark' ? '#ff9246' : '#c06220',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <span role="img" aria-label="attention">
                          ⚠️
                        </span>
                        Build Issues ({buildIssues.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                        {buildIssues.map((issue, idx) => (
                          <Typography
                            key={`issue-${idx}`}
                            component="li"
                            variant="body2"
                            sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
                          >
                            <span aria-hidden="true" style={{ width: 18 }}>
                              •
                            </span>
                            <span>
                              {(() => {
                                if ('gearName' in issue) {
                                  return (
                                    <>
                                      <strong>{issue.gearName}</strong>:{' '}
                                      {issue.message.replace(/^.*?:\s*/, '')}
                                    </>
                                  );
                                } else if ('buffName' in issue) {
                                  return (
                                    <>
                                      <strong>{issue.buffName}</strong>:{' '}
                                      {issue.message.replace(/^.*?\s-\s*/, '')}
                                    </>
                                  );
                                }
                                return (issue as { message: string }).message;
                              })()}
                            </span>
                          </Typography>
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Gear Details Modal */}
        <GearDetailsPanel
          open={gearDetailsOpen}
          onClose={() => setGearDetailsOpen(false)}
          playerName={player.name}
          playerClass={player.type}
          gearPieces={gear}
        />
      </Box>
    );
  },
);
