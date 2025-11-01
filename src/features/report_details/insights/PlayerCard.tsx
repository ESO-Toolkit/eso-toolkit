import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
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
import { useSelector } from 'react-redux';

import { getArmorWeightCounts } from '@/utils/armorUtils';
import { toClassKey } from '@/utils/classNameUtils';
import { abbreviateFood, detectFoodFromAuras, getFoodColor } from '@/utils/foodDetectionUtils';
import { createGearSetTooltipProps } from '@/utils/gearSetTooltipMapper';
import { buildVariantSx, getGearChipProps } from '@/utils/playerCardStyleUtils';

import mundusIcon from '../../../assets/MundusStone.png';
import { ClassIcon } from '../../../components/ClassIcon';
import { GearDetailsPanel } from '../../../components/GearDetailsPanel';
import { GearSetTooltip } from '../../../components/GearSetTooltip';
import { LazySkillTooltip as SkillTooltip } from '../../../components/LazySkillTooltip';
import { OneLineAutoFit } from '../../../components/OneLineAutoFit';
import { PlayerIcon } from '../../../components/PlayerIcon';
import { GrimoireData } from '../../../components/ScribingSkillsDisplay';
import { selectPlayerData } from '../../../store/player_data/playerDataSelectors';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import {
  selectFriendlyBuffEvents,
  selectHostileBuffEvents,
  selectCastEvents,
  selectDamageEvents,
  selectDebuffEvents,
  selectHealingEvents,
  selectResourceEvents,
} from '../../../store/selectors/eventsSelectors';
import { type ClassAnalysisResult } from '../../../utils/classDetectionUtils';
import { BuildIssue } from '../../../utils/detectBuildIssues';
import { PlayerGearSetRecord } from '../../../utils/gearUtilities';
import { resolveActorName } from '../../../utils/resolveActorName';
import { abbreviateSkillLine } from '../../../utils/skillLineDetectionUtils';
import { buildTooltipProps } from '../../../utils/skillTooltipMapper';
import { ScribedSkillData } from '../../scribing/types';
// TODO: Implement proper scribing detection services
// Temporary stubs to prevent compilation errors
interface CombatEventData {
  castEvents: Array<{ sourceID: number; abilityGameID: number; timestamp: number }>;
  damageEvents: Array<{
    sourceID: number;
    abilityGameID: number;
    amount?: number;
    timestamp: number;
  }>;
}
const buildEnhancedScribingTooltipProps = (options: {
  talent: { name?: string };
  combatEventData: CombatEventData;
  playerId?: number;
}): {
  name: string;
  description: string;
  scribedSkillData: null;
  enhancedTooltip: null;
  isScribingSkill: false;
} => ({
  name: options.talent.name || 'Unknown Skill',
  description: '',
  scribedSkillData: null,
  enhancedTooltip: null,
  isScribingSkill: false,
});

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
  distanceTraveled: number | null;
  reportId?: string | null;
  fightId?: string | null;
  playerGear: PlayerGearSetRecord[];
}

// Helper function to consolidate build issues
function consolidateBuildIssues(buildIssues: BuildIssue[]): {
  gearQuality: Array<{ gearName: string; quality: number; message: string }>;
  enchantQuality: Array<{ gearName: string; quality: number; message: string }>;
  gearLevel: Array<{ gearName: string; level: number; message: string }>;
  missingBuffs: Array<{ buffName: string; abilityId: number; message: string }>;
} {
  const grouped = {
    gearQuality: [] as Array<{ gearName: string; quality: number; message: string }>,
    enchantQuality: [] as Array<{ gearName: string; quality: number; message: string }>,
    gearLevel: [] as Array<{ gearName: string; level: number; message: string }>,
    missingBuffs: [] as Array<{ buffName: string; abilityId: number; message: string }>,
  };

  buildIssues.forEach((issue) => {
    if ('gearName' in issue) {
      if ('gearQuality' in issue) {
        grouped.gearQuality.push({
          gearName: issue.gearName,
          quality: issue.gearQuality,
          message: issue.message,
        });
      } else if ('enchantQuality' in issue) {
        grouped.enchantQuality.push({
          gearName: issue.gearName,
          quality: issue.enchantQuality,
          message: issue.message,
        });
      } else if ('gearLevel' in issue) {
        grouped.gearLevel.push({
          gearName: issue.gearName,
          level: issue.gearLevel,
          message: issue.message,
        });
      }
    } else if ('buffName' in issue) {
      grouped.missingBuffs.push({
        buffName: issue.buffName,
        abilityId: issue.abilityId,
        message: issue.message,
      });
    }
  });

  return grouped;
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
    distanceTraveled,
    reportId,
    fightId,
    playerGear,
  }) => {
    const theme = useTheme();

    // Encoded pins filter provided by user for casts view
    const _CASTS_PINS =
      '2%24Off%24%23244F4B%24expression%24ability.id+NOT+IN%2816499%2C28541%2C16165%2C16145%2C18350%2C28549%2C45223%2C18396%2C16277%2C115548%2C85572%2C23196%2C95040%2C39301%2C63507%2C22269%2C95042%2C191078%2C32910%2C41963%2C16261%2C45221%2C48076%2C32974%2C21970%2C41838%2C16565%2C45227%2C118604%2C26832%2C15383%2C45382%2C16420%2C68401%2C47193%2C190583%2C16212%2C228524%2C186981%2C16037%2C15435%2C15279%2C72931%2C45228%2C16688%2C61875%2C61874%29';

    const castsUrl = React.useCallback((rid?: string, fid?: string | null) => {
      if (!rid) return undefined;
      const fightParam = fid ? `&fight=${encodeURIComponent(fid)}` : '';
      return `https://www.esologs.com/reports/${encodeURIComponent(rid)}?type=casts${fightParam}`;
    }, []);

    const talents = React.useMemo(
      () => player?.combatantInfo?.talents ?? [],
      [player?.combatantInfo?.talents],
    );
    const gear = player?.combatantInfo?.gear ?? [];
    const armorWeights = getArmorWeightCounts(gear);

    // State for gear details panel
    const [gearDetailsOpen, setGearDetailsOpen] = useState(false);
    const [currentGearPlayerId, setCurrentGearPlayerId] = useState<string | number>(player.id);

    // Get all players from Redux store
    const playerData = useSelector(selectPlayerData);
    const allPlayers = React.useMemo(() => {
      return Object.values(playerData?.playersById || {});
    }, [playerData]);

    // Get combat event data for affix script detection
    const friendlyBuffEvents = useSelector(selectFriendlyBuffEvents);
    const hostileBuffEvents = useSelector(selectHostileBuffEvents);
    const debuffEvents = useSelector(selectDebuffEvents);
    const damageEvents = useSelector(selectDamageEvents);
    const healingEvents = useSelector(selectHealingEvents);
    const castEvents = useSelector(selectCastEvents);
    const resourceEvents = useSelector(selectResourceEvents);

    // Combine combat event data
    const combatEventData: CombatEventData = React.useMemo(
      () => ({
        castEvents: castEvents,
        damageEvents: damageEvents,
        allReportAbilities: [], // This would need to come from abilities data if available
        allDebuffEvents: debuffEvents,
        allBuffEvents: [...friendlyBuffEvents, ...hostileBuffEvents],
        allResourceEvents: resourceEvents,
        allDamageEvents: damageEvents,
        allCastEvents: castEvents,
        allHealingEvents: healingEvents,
      }),
      [
        friendlyBuffEvents,
        hostileBuffEvents,
        debuffEvents,
        damageEvents,
        healingEvents,
        castEvents,
        resourceEvents,
      ],
    );

    // Get dynamic skill lines from class analysis
    const detectedSkillLines = classAnalysis?.skillLines || [];

    const foodAura = detectFoodFromAuras(auras);
    const distanceDisplay = React.useMemo(() => {
      if (distanceTraveled == null) {
        return null;
      }

      if (distanceTraveled <= 0) {
        return '0 m';
      }

      const precision = distanceTraveled >= 100 ? 0 : 1;
      const rounded = Number(distanceTraveled.toFixed(precision));
      if (!Number.isFinite(rounded)) {
        return null;
      }

      return `${rounded.toLocaleString()} m`;
    }, [distanceTraveled]);

    // Memoize tooltip props lookup to avoid repeated function calls
    const tooltipPropsLookup = React.useMemo(() => {
      const lookup = new Map<number, ReturnType<typeof buildTooltipProps>>();
      const clsKey = toClassKey(player.type);

      // Create a lookup map for scribed skills data by talent name
      const scribedSkillsLookup = new Map<string, ScribedSkillData>();
      scribingSkills.forEach((grimoire) => {
        grimoire.skills.forEach((skill) => {
          // Use the actual talent name as the key for mapping
          scribedSkillsLookup.set(skill.skillName, {
            grimoireName: grimoire.grimoireName,
            effects: skill.effects,
            recipe: skill.recipe, // Include the enhanced recipe information
          });
        });
      });

      talents.forEach((talent) => {
        const key = talent.guid;
        if (!lookup.has(key)) {
          // Check if this talent is a scribed skill by looking for it in our scribed skills data
          const scribedSkillData = scribedSkillsLookup.get(talent.name);

          // Use enhanced tooltip builder for scribed skills to include affix script detection
          let tooltipProps;
          if (scribedSkillData) {
            tooltipProps = buildEnhancedScribingTooltipProps({
              talent,
              combatEventData,
              playerId: player.id,
            });
          } else {
            tooltipProps = buildTooltipProps({
              abilityId: talent.guid,
              abilityName: talent.name,
              classKey: clsKey,
              scribedSkillData,
            });
          }

          if (tooltipProps) {
            lookup.set(key, tooltipProps);
          }
        }
      });

      return lookup;
    }, [talents, player.type, player.id, scribingSkills, combatEventData]);

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

    const resolvedPlayerName = resolveActorName(player);
    const normalizedDisplayName = resolvedPlayerName.trim();
    const trimmedCharacterName = player.name?.trim() ?? '';
    const shouldShowCharacterName =
      trimmedCharacterName.length > 0 &&
      normalizedDisplayName.localeCompare(trimmedCharacterName, undefined, {
        sensitivity: 'base',
      }) !== 0;

  
    return (
      <Box sx={{ minWidth: 0, display: 'flex', height: '100%' }}>
        <Card
          variant="outlined"
          className="u-hover-lift u-fade-in-up"
          sx={cardStyles}
          data-testid={`player-card-${player.id}`}
        >
          <CardContent
            sx={{ p: 2, pb: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <Box
              display="flex"
              flexDirection="column"
              alignItems="stretch"
              gap={2}
              sx={{ flex: 1, minHeight: 0 }}
            >
              {/* Left column: identity, talents, gear, issues */}
              <Box flex={0} minWidth={0}>
                <Box display="flex" alignItems="center" mb={1.5} gap={1}>
                  <PlayerIcon player={player} />
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    flex={1}
                    minWidth={0}
                    gap={1}
                  >
                    {/* Player Name with Character Name Hover */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: '1 1 auto',
                        minWidth: 0,
                      }}
                    >
                      <OneLineAutoFit minScale={0.8}>
                        <Tooltip
                          title={shouldShowCharacterName ? trimmedCharacterName : ''}
                          placement="top"
                          arrow
                          PopperProps={{
                            style: { zIndex: 9999 }
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontFamily: 'space grotesk',
                              fontSize: '1.15rem',
                              fontWeight: 100,
                              lineHeight: 1.2,
                              whiteSpace: 'nowrap',
                              cursor: 'help', // Add cursor to indicate hoverable
                            }}
                          >
                            {normalizedDisplayName || resolvedPlayerName}
                          </Typography>
                        </Tooltip>
                      </OneLineAutoFit>
                    </Box>

                    {/* Gear Weights */}
                    <Box
                      display="inline-flex"
                      alignItems="center"
                      gap={0.35}
                      sx={{
                        flex: '0 0 auto', // Don't shrink gear weights
                        minWidth: 0, // Allow shrinking
                        overflow: 'hidden', // Prevent overflow
                      }}
                    >
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

                    {/* Role Icon */}
                    <Tooltip
                      title={`Role: ${roleInfo.roleType}`}
                      enterTouchDelay={0}
                      leaveTouchDelay={3000}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: { xs: 20, sm: 24, md: 28, lg: 32 },
                          lineHeight: 1,
                          filter: 'none',
                          flex: '0 0 auto', // Don't shrink role icon
                        }}
                        role="img"
                        aria-label={`Role: ${roleInfo.roleType}`}
                      >
                        {roleInfo.roleEmoji}
                      </Typography>
                    </Tooltip>
                  </Box>
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
                                leaveTouchDelay={999999}
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
                                      fightId={fightId || undefined}
                                      playerId={player.id}
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
                                  tooltip: {
                                    sx: {
                                      maxWidth: 320,
                                      p: 0,
                                      backgroundColor: 'transparent !important',
                                      border: 'none !important',
                                      boxShadow: 'none !important',
                                    },
                                  },
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
                                        fightId={fightId || undefined}
                                        playerId={player.id}
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
                                    tooltip: {
                                      sx: {
                                        maxWidth: 320,
                                        p: 0,
                                        backgroundColor: 'transparent !important',
                                        border: 'none !important',
                                        boxShadow: 'none !important',
                                      },
                                    },
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
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          mb={2.5}
                        >
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            sx={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '0.8rem' }}
                          >
                            Gear
                          </Typography>
                          <Box
                            onClick={() => {
                              setCurrentGearPlayerId(player.id);
                              setGearDetailsOpen(true);
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.25,
                              px: 0.75,
                              py: 0.25,
                              borderRadius: 0.5,
                              backgroundColor:
                                theme.palette.mode === 'dark'
                                  ? 'rgba(255, 255, 255, 0.08)'
                                  : 'rgb(255 255 255 / 15%)',
                              border: '1px solid',
                              borderColor:
                                theme.palette.mode === 'dark'
                                  ? 'rgba(255, 255, 255, 0.12)'
                                  : 'rgba(0, 0, 0, 0.12)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor:
                                  theme.palette.mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.12)'
                                    : 'rgba(0, 0, 0, 0.1)',
                                borderColor:
                                  theme.palette.mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.2)'
                                    : 'rgba(0, 0, 0, 0.2)',
                              },
                            }}
                          >
                            <InfoIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: '0.65rem',
                                fontWeight: 300,
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px',
                                lineHeight: 1,
                              }}
                            >
                              INFO
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          display="flex"
                          flexWrap="wrap"
                          gap={1.25}
                          minHeight={32}
                          data-testid={`gear-chips-${player.id}`}
                        >
                          {gearChips.map((chipData, index) => {
                            // Find the corresponding gear record for tooltip
                            const gearRecord = playerGear[index];
                            const tooltipProps = gearRecord
                              ? createGearSetTooltipProps(gearRecord, player.combatantInfo.gear)
                              : null;

                            if (tooltipProps) {
                              const { itemCount: _itemCount, ...filteredTooltipProps } =
                                tooltipProps;
                              return (
                                <Tooltip
                                  key={chipData.key}
                                  title={<GearSetTooltip {...filteredTooltipProps} />}
                                  placement="top"
                                  enterDelay={300}
                                  enterTouchDelay={0}
                                  leaveTouchDelay={3000}
                                  arrow
                                  disableInteractive={false}
                                  slotProps={{
                                    tooltip: {
                                      sx: {
                                        maxWidth: 320,
                                        p: 0,
                                        backgroundColor: 'transparent !important',
                                        border: 'none !important',
                                        boxShadow: 'none !important',
                                      },
                                    },
                                    arrow: { sx: { display: 'none' } },
                                  }}
                                >
                                  <Chip label={chipData.label} size="small" sx={chipData.sx} />
                                </Tooltip>
                              );
                            }

                            // Fallback to simple chip if no gear set data
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

              {/* Spacer to push bottom section down */}
              <Box sx={{ flex: 1 }} />

              {/* Right column content stacked below left, full width */}
              <Box
                sx={{
                  width: '100%',
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
                        gap: 0.5,
                        minHeight: 24,
                        flex: '1 1 auto',
                        minWidth: 0,
                        overflow: 'hidden',
                        mr: 0.5,
                      }}
                    >
                      {mundusBuffs.length > 0 && (
                        <div data-testid={`mundus-buffs-${player.id}`}>
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
                        </div>
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        whiteSpace: 'nowrap',
                        flex: '0 1 auto',
                        flexShrink: 1,
                        ml: 'auto',
                        pr: 0.5,
                        maxWidth: '100%',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontSize: { xs: '0.7rem', sm: '0.75rem', md: 'body2.fontSize' },
                      }}
                    >
                      <Tooltip
                        title={`Food/Drink: ${foodAura ? foodAura.name : 'None'}`}
                        enterTouchDelay={0}
                        leaveTouchDelay={3000}
                      >
                        <span
                          style={{ display: 'inline-flex', alignItems: 'center' }}
                          data-testid={`food-drink-${player.id}`}
                        >
                          <span role="img" aria-label="food">
                            🍲
                          </span>
                          <span style={{ margin: '0 1px' }}></span>
                          <Box
                            component="span"
                            sx={{
                              display: 'inline',
                              fontWeight: 700,
                              fontSize: { xs: 8, sm: 9, md: 10 },
                              letterSpacing: '.01em',
                              color: foodInfo.color,
                            }}
                          >
                            {foodInfo.display}
                          </Box>
                        </span>
                      </Tooltip>{' '}
                      ·{' '}
                      <Tooltip
                        title="Deaths in this fight"
                        enterTouchDelay={0}
                        leaveTouchDelay={3000}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <span role="img" aria-label="deaths">
                            💀
                          </span>
                          <span style={{ margin: '0 1px' }}></span>
                          {deaths}
                        </span>
                      </Tooltip>{' '}
                      ·{' '}
                      <Tooltip
                        title="Successful resurrects performed"
                        enterTouchDelay={0}
                        leaveTouchDelay={3000}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <span role="img" aria-label="resurrects">
                            ❤️
                          </span>
                          <span style={{ margin: '0 1px' }}></span>
                          {resurrects}
                        </span>
                      </Tooltip>{' '}
                      ·{' '}
                      <Tooltip title="Casts per Minute" enterTouchDelay={0} leaveTouchDelay={3000}>
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <span role="img" aria-label="cpm">
                            🐭
                          </span>
                          <span style={{ margin: '0 1px' }}></span>
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
                      {distanceDisplay && (
                        <>
                          {' '}
                          ·{' '}
                          <Tooltip
                            title="Distance traveled during this fight"
                            enterTouchDelay={0}
                            leaveTouchDelay={3000}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                              <span role="img" aria-label="distance">
                                🛤️
                              </span>
                              <span style={{ margin: '0 1px' }}></span>
                              {distanceDisplay}
                            </span>
                          </Tooltip>
                        </>
                      )}
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
                          textShadow:
                            theme.palette.mode === 'light'
                              ? '1px 1px 0 rgb(104 115 157 / 16%)'
                              : 'none',
                        }}
                      >
                        <span role="img" aria-label="attention">
                          ⚠️
                        </span>
                        Build Issues ({buildIssues.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 2, pb: 1.5, pt: 0.5 }}>
                      {(() => {
                        const grouped = consolidateBuildIssues(buildIssues);
                        const issues: React.ReactElement[] = [];

                        // Gear quality issues
                        if (grouped.gearQuality.length > 0) {
                          const qualityGroups = grouped.gearQuality.reduce(
                            (acc, issue) => {
                              const key = issue.message;
                              if (!acc[key]) acc[key] = [];
                              acc[key].push(issue.gearName);
                              return acc;
                            },
                            {} as Record<string, string[]>,
                          );

                          Object.entries(qualityGroups).forEach(([message, gearNames]) => {
                            const nameCounts = gearNames.reduce(
                              (acc, name) => {
                                acc[name] = (acc[name] || 0) + 1;
                                return acc;
                              },
                              {} as Record<string, number>,
                            );

                            const displayNames = Object.entries(nameCounts).map(
                              ([name, count]) => ({
                                name,
                                count,
                                display: count > 1 ? `${name}(x${count})` : name,
                              }),
                            );

                            issues.push(
                              <Box
                                key="quality"
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  py: 0.5,
                                  px: 1,
                                  borderRadius: 0.5,
                                  backgroundColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(255,107,53,0.08)'
                                      : 'rgba(251,146,60,0.08)',
                                  border: '1px solid',
                                  borderColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(255,107,53,0.2)'
                                      : 'rgba(251,146,60,0.2)',
                                  mb: 0.5,
                                  overflow: 'hidden',
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.25,
                                    flexShrink: 0,
                                    maxWidth: '180px',
                                  }}
                                >
                                  <Tooltip
                                    title={displayNames.map((d) => d.name).join(', ')}
                                    enterTouchDelay={0}
                                    leaveTouchDelay={3000}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color:
                                          theme.palette.mode === 'dark' ? '#ff6b35' : '#c2410c',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        cursor: 'default',
                                        textShadow:
                                          theme.palette.mode === 'light'
                                            ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                            : 'none',
                                      }}
                                    >
                                      {displayNames.map((d) => d.name).join(', ')}
                                    </Typography>
                                  </Tooltip>
                                  {displayNames.some((d) => d.count > 1) && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color:
                                          theme.palette.mode === 'dark' ? '#ff6b35' : '#c2410c',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                        textShadow:
                                          theme.palette.mode === 'light'
                                            ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                            : 'none',
                                      }}
                                    >
                                      {displayNames.length === 1 && displayNames[0].count > 1
                                        ? `(x${displayNames[0].count})`
                                        : displayNames.filter((d) => d.count > 1).length > 0
                                          ? `(x${displayNames
                                              .filter((d) => d.count > 1)
                                              .map((d) => d.count)
                                              .join(',x')})`
                                          : ''}
                                    </Typography>
                                  )}
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: theme.palette.mode === 'dark' ? '#ff6b35' : '#c2410c',
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      flexShrink: 0,
                                      textShadow:
                                        theme.palette.mode === 'light'
                                          ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                          : 'none',
                                    }}
                                  >
                                    :
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.1,
                                  }}
                                >
                                  {(() => {
                                    const messageText = message.replace(/^.*?:\s*/, '');
                                    if (
                                      messageText.includes('quality is') &&
                                      messageText.includes('should be')
                                    ) {
                                      const currentMatch = messageText.match(/quality is (\d+)/);
                                      const shouldMatch = messageText.match(/should be (\d+)/);
                                      if (currentMatch && shouldMatch) {
                                        const current = parseInt(currentMatch[1]);
                                        return (
                                          <>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Box
                                                key={star}
                                                component="span"
                                                sx={{
                                                  fontSize: '1.3em',
                                                  display: 'inline-block',
                                                  lineHeight: 1,
                                                  filter:
                                                    star <= current && theme.palette.mode === 'dark'
                                                      ? 'drop-shadow(0 0 2px rgba(251, 191, 36, 0.6))'
                                                      : 'none',
                                                  textShadow:
                                                    star <= current && theme.palette.mode === 'dark'
                                                      ? '0 0 8px rgba(251, 191, 36, 0.4)'
                                                      : 'none',
                                                  color:
                                                    star <= current
                                                      ? theme.palette.mode === 'dark'
                                                        ? '#fbbf24'
                                                        : '#d97706'
                                                      : theme.palette.mode === 'dark'
                                                        ? '#d1d5db'
                                                        : '#9ca3af',
                                                  transform:
                                                    star <= current ? 'scale(1.1)' : 'scale(0.95)',
                                                  transition: 'all 0.2s ease',
                                                  opacity: star <= current ? 1 : 0.9,
                                                  border: 'none',
                                                  borderRadius: '0px',
                                                  padding: '0px',
                                                }}
                                              >
                                                {star <= current ? '★' : '☆'}
                                              </Box>
                                            ))}
                                          </>
                                        );
                                      }
                                    }
                                    return (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color:
                                            theme.palette.mode === 'dark' ? '#ff8c42' : '#ea580c',
                                          fontSize: '0.65rem',
                                          whiteSpace: 'nowrap',
                                          textShadow:
                                            theme.palette.mode === 'light'
                                              ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                              : 'none',
                                        }}
                                      >
                                        {messageText}
                                      </Typography>
                                    );
                                  })()}
                                </Box>
                              </Box>,
                            );
                          });
                        }

                        // Enchant quality issues
                        if (grouped.enchantQuality.length > 0) {
                          const enchantGroups = grouped.enchantQuality.reduce(
                            (acc, issue) => {
                              const key = issue.message;
                              if (!acc[key]) acc[key] = [];
                              acc[key].push(issue.gearName);
                              return acc;
                            },
                            {} as Record<string, string[]>,
                          );

                          Object.entries(enchantGroups).forEach(([message, gearNames]) => {
                            const nameCounts = gearNames.reduce(
                              (acc, name) => {
                                acc[name] = (acc[name] || 0) + 1;
                                return acc;
                              },
                              {} as Record<string, number>,
                            );

                            const displayNames = Object.entries(nameCounts).map(
                              ([name, count]) => ({
                                name,
                                count,
                                display: count > 1 ? `${name}(x${count})` : name,
                              }),
                            );

                            issues.push(
                              <Box
                                key="enchant"
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  py: 0.5,
                                  px: 1,
                                  borderRadius: 0.5,
                                  backgroundColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(251,191,36,0.08)'
                                      : 'rgba(245,158,11,0.08)',
                                  border: '1px solid',
                                  borderColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(251,191,36,0.2)'
                                      : 'rgba(245,158,11,0.2)',
                                  mb: 0.5,
                                  overflow: 'hidden',
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.25,
                                    flexShrink: 0,
                                    maxWidth: '180px',
                                  }}
                                >
                                  <Tooltip
                                    title={displayNames.map((d) => d.name).join(', ')}
                                    enterTouchDelay={0}
                                    leaveTouchDelay={3000}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color:
                                          theme.palette.mode === 'dark' ? '#f59e0b' : '#b45309',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        cursor: 'default',
                                        textShadow:
                                          theme.palette.mode === 'light'
                                            ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                            : 'none',
                                      }}
                                    >
                                      {displayNames.map((d) => d.name).join(', ')}
                                    </Typography>
                                  </Tooltip>
                                  {displayNames.some((d) => d.count > 1) && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color:
                                          theme.palette.mode === 'dark' ? '#f59e0b' : '#b45309',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                        textShadow:
                                          theme.palette.mode === 'light'
                                            ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                            : 'none',
                                      }}
                                    >
                                      {displayNames.length === 1 && displayNames[0].count > 1
                                        ? `(x${displayNames[0].count})`
                                        : displayNames.filter((d) => d.count > 1).length > 0
                                          ? `(x${displayNames
                                              .filter((d) => d.count > 1)
                                              .map((d) => d.count)
                                              .join(',x')})`
                                          : ''}
                                    </Typography>
                                  )}
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: theme.palette.mode === 'dark' ? '#f59e0b' : '#b45309',
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      flexShrink: 0,
                                      textShadow:
                                        theme.palette.mode === 'light'
                                          ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                          : 'none',
                                    }}
                                  >
                                    :
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.1,
                                  }}
                                >
                                  {(() => {
                                    const messageText = message.replace(/^.*?:\s*/, '');
                                    if (
                                      messageText.includes('Enchantment quality is') &&
                                      messageText.includes('should be')
                                    ) {
                                      const currentMatch = messageText.match(
                                        /Enchantment quality is (\d+)/,
                                      );
                                      const shouldMatch = messageText.match(/should be (\d+)/);
                                      if (currentMatch && shouldMatch) {
                                        const current = parseInt(currentMatch[1]);
                                        return (
                                          <>
                                            <Box
                                              component="span"
                                              sx={{
                                                fontSize: '0.6rem',
                                                color:
                                                  theme.palette.mode === 'dark'
                                                    ? '#9ca3af'
                                                    : '#6b7280',
                                                mr: 0.2,
                                              }}
                                            >
                                              Enchant:
                                            </Box>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Box
                                                key={star}
                                                component="span"
                                                sx={{
                                                  fontSize: '1.3em',
                                                  display: 'inline-block',
                                                  lineHeight: 1,
                                                  filter:
                                                    star <= current && theme.palette.mode === 'dark'
                                                      ? 'drop-shadow(0 0 2px rgba(251, 191, 36, 0.6))'
                                                      : 'none',
                                                  textShadow:
                                                    star <= current && theme.palette.mode === 'dark'
                                                      ? '0 0 8px rgba(251, 191, 36, 0.4)'
                                                      : 'none',
                                                  color:
                                                    star <= current
                                                      ? theme.palette.mode === 'dark'
                                                        ? '#fbbf24'
                                                        : '#d97706'
                                                      : theme.palette.mode === 'dark'
                                                        ? '#d1d5db'
                                                        : '#9ca3af',
                                                  transform:
                                                    star <= current ? 'scale(1.1)' : 'scale(0.95)',
                                                  transition: 'all 0.2s ease',
                                                  opacity: star <= current ? 1 : 0.9,
                                                  border: 'none',
                                                  borderRadius: '0px',
                                                  padding: '0px',
                                                }}
                                              >
                                                {star <= current ? '★' : '☆'}
                                              </Box>
                                            ))}
                                          </>
                                        );
                                      }
                                    }
                                    return (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color:
                                            theme.palette.mode === 'dark' ? '#fbbf24' : '#d97706',
                                          fontSize: '0.65rem',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {messageText}
                                      </Typography>
                                    );
                                  })()}
                                </Box>
                              </Box>,
                            );
                          });
                        }

                        // Gear level issues
                        if (grouped.gearLevel.length > 0) {
                          const levelGroups = grouped.gearLevel.reduce(
                            (acc, issue) => {
                              const key = issue.message;
                              if (!acc[key]) acc[key] = [];
                              acc[key].push(issue.gearName);
                              return acc;
                            },
                            {} as Record<string, string[]>,
                          );

                          Object.entries(levelGroups).forEach(([message, gearNames]) => {
                            const nameCounts = gearNames.reduce(
                              (acc, name) => {
                                acc[name] = (acc[name] || 0) + 1;
                                return acc;
                              },
                              {} as Record<string, number>,
                            );

                            const displayNames = Object.entries(nameCounts).map(
                              ([name, count]) => ({
                                name,
                                count,
                                display: count > 1 ? `${name}(x${count})` : name,
                              }),
                            );

                            issues.push(
                              <Box
                                key="level"
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  py: 0.5,
                                  px: 1,
                                  borderRadius: 0.5,
                                  backgroundColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(146,64,14,0.08)'
                                      : 'rgba(180,83,9,0.08)',
                                  border: '1px solid',
                                  borderColor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(146,64,14,0.2)'
                                      : 'rgba(180,83,9,0.2)',
                                  mb: 0.5,
                                  overflow: 'hidden',
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.25,
                                    flexShrink: 0,
                                    maxWidth: '180px',
                                  }}
                                >
                                  <Tooltip
                                    title={displayNames.map((d) => d.name).join(', ')}
                                    enterTouchDelay={0}
                                    leaveTouchDelay={3000}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color:
                                          theme.palette.mode === 'dark' ? '#92400e' : '#713f12',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        cursor: 'default',
                                      }}
                                    >
                                      {displayNames.map((d) => d.name).join(', ')}
                                    </Typography>
                                  </Tooltip>
                                  {displayNames.some((d) => d.count > 1) && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color:
                                          theme.palette.mode === 'dark' ? '#92400e' : '#713f12',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {displayNames.length === 1 && displayNames[0].count > 1
                                        ? `(x${displayNames[0].count})`
                                        : displayNames.filter((d) => d.count > 1).length > 0
                                          ? `(x${displayNames
                                              .filter((d) => d.count > 1)
                                              .map((d) => d.count)
                                              .join(',x')})`
                                          : ''}
                                    </Typography>
                                  )}
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: theme.palette.mode === 'dark' ? '#92400e' : '#713f12',
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      flexShrink: 0,
                                    }}
                                  >
                                    :
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                  }}
                                >
                                  {(() => {
                                    const messageText = message.replace(/^.*?:\s*/, '');
                                    if (
                                      messageText.includes('CP level is') &&
                                      messageText.includes('should be 160')
                                    ) {
                                      const currentMatch = messageText.match(/CP level is (\d+)/);
                                      if (currentMatch) {
                                        const current = parseInt(currentMatch[1]);
                                        return (
                                          <>
                                            <Box
                                              component="span"
                                              sx={{
                                                fontSize: '0.6rem',
                                                color:
                                                  theme.palette.mode === 'dark'
                                                    ? '#9ca3af'
                                                    : '#6b7280',
                                                textShadow:
                                                  theme.palette.mode === 'light'
                                                    ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                                    : 'none',
                                              }}
                                            >
                                              CP:
                                            </Box>
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                color:
                                                  theme.palette.mode === 'dark'
                                                    ? '#a16207'
                                                    : '#92400e',
                                                fontSize: '0.65rem',
                                                fontWeight: 600,
                                                textShadow:
                                                  theme.palette.mode === 'light'
                                                    ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                                    : 'none',
                                              }}
                                            >
                                              {current}
                                            </Typography>
                                            <Box
                                              component="span"
                                              sx={{
                                                fontSize: '0.65rem',
                                                color:
                                                  theme.palette.mode === 'dark'
                                                    ? '#9ca3af'
                                                    : '#6b7280',
                                                textShadow:
                                                  theme.palette.mode === 'light'
                                                    ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                                    : 'none',
                                              }}
                                            >
                                              → 160
                                            </Box>
                                          </>
                                        );
                                      }
                                    }
                                    return (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color:
                                            theme.palette.mode === 'dark' ? '#a16207' : '#92400e',
                                          fontSize: '0.65rem',
                                          whiteSpace: 'nowrap',
                                          textShadow:
                                            theme.palette.mode === 'light'
                                              ? '1px 1px 0 rgb(104 115 157 / 16%)'
                                              : 'none',
                                        }}
                                      >
                                        {messageText}
                                      </Typography>
                                    );
                                  })()}
                                </Box>
                              </Box>,
                            );
                          });
                        }

                        // Missing buffs
                        if (grouped.missingBuffs.length > 0) {
                          grouped.missingBuffs.forEach((buff) => {
                            issues.push(
                              <Box
                                key={`buff-${buff.abilityId}`}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                  py: 0.5,
                                  px: 1,
                                  borderRadius: 0.5,
                                  backgroundColor: (() => {
                                    const buffName = buff.buffName.toLowerCase();
                                    if (
                                      buffName.includes('sorcery') ||
                                      buffName.includes('prophecy')
                                    ) {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(251, 191, 36, 0.08)'
                                        : 'rgba(245, 158, 11, 0.06)';
                                    } else if (
                                      buffName.includes('brutality') ||
                                      buffName.includes('savagery')
                                    ) {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(239, 68, 68, 0.08)'
                                        : 'rgba(220, 38, 38, 0.06)';
                                    } else if (buffName.includes('aegis')) {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(59, 130, 246, 0.08)'
                                        : 'rgba(37, 99, 235, 0.06)';
                                    } else {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(192, 132, 252, 0.08)'
                                        : 'rgba(147, 51, 234, 0.06)';
                                    }
                                  })(),
                                  border: '1px solid',
                                  borderColor: (() => {
                                    const buffName = buff.buffName.toLowerCase();
                                    if (
                                      buffName.includes('sorcery') ||
                                      buffName.includes('prophecy')
                                    ) {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(251, 191, 36, 0.2)'
                                        : 'rgba(245, 158, 11, 0.15)';
                                    } else if (
                                      buffName.includes('brutality') ||
                                      buffName.includes('savagery')
                                    ) {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(239, 68, 68, 0.2)'
                                        : 'rgba(220, 38, 38, 0.15)';
                                    } else if (buffName.includes('aegis')) {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(59, 130, 246, 0.2)'
                                        : 'rgba(37, 99, 235, 0.15)';
                                    } else {
                                      return theme.palette.mode === 'dark'
                                        ? 'rgba(192, 132, 252, 0.2)'
                                        : 'rgba(147, 51, 234, 0.15)';
                                    }
                                  })(),
                                  mb: 0.5,
                                }}
                              >
                                {(() => {
                                  // Determine buff type and colors
                                  const isSorcery = buff.buffName.toLowerCase().includes('sorcery');
                                  const isProphecy = buff.buffName
                                    .toLowerCase()
                                    .includes('prophecy');
                                  const isBrutality = buff.buffName
                                    .toLowerCase()
                                    .includes('brutality');
                                  const isSavagery = buff.buffName
                                    .toLowerCase()
                                    .includes('savagery');
                                  const isAegis = buff.buffName.toLowerCase().includes('aegis');

                                  // Set colors based on buff type
                                  let textColor;

                                  if (isSorcery || isProphecy) {
                                    // Gold for universal buffs (sorcery/prophecy)
                                    textColor =
                                      theme.palette.mode === 'dark' ? '#fbbf24' : '#d97706';
                                  } else if (isBrutality || isSavagery) {
                                    // Red for DPS buffs (brutality/savagery)
                                    textColor =
                                      theme.palette.mode === 'dark' ? '#ef4444' : '#dc2626';
                                  } else if (isAegis) {
                                    // Blue for tank buffs (aegis)
                                    textColor =
                                      theme.palette.mode === 'dark' ? '#3b82f6' : '#2563eb';
                                  } else {
                                    // Default purple for other buffs
                                    textColor =
                                      theme.palette.mode === 'dark' ? '#c084fc' : '#9333ea';
                                  }

                                  return (
                                    <>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: textColor,
                                          fontWeight: 600,
                                          fontSize: '0.75rem',
                                          flexShrink: 0,
                                        }}
                                      >
                                        {buff.buffName}:
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: textColor,
                                          fontSize: '0.75rem',
                                          opacity: 0.8,
                                        }}
                                      >
                                        Missing buff
                                      </Typography>
                                    </>
                                  );
                                })()}
                              </Box>,
                            );
                          });
                        }

                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>{issues}</Box>
                        );
                      })()}
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
          onClose={() => {
            setGearDetailsOpen(false);
            setCurrentGearPlayerId(player.id); // Reset to current player when closing
          }}
          currentPlayerId={currentGearPlayerId}
          players={allPlayers}
          onPlayerChange={setCurrentGearPlayerId}
        />
      </Box>
    );
  },
);

PlayerCard.displayName = 'PlayerCard';
