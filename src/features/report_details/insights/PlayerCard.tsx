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
import type { ChipProps } from '@mui/material/Chip';
import { SxProps, Theme, useTheme } from '@mui/material/styles';
import React from 'react';

import mundusIcon from '../../../assets/MundusStone.png';
import { ClassIcon } from '../../../components/ClassIcon';
import { PlayerIcon } from '../../../components/PlayerIcon';
import { ScribingSkillsDisplay, GrimoireData } from '../../../components/ScribingSkillsDisplay';
import { SkillTooltip } from '../../../components/SkillTooltip';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import {
  TRI_STAT_FOOD,
  HEALTH_AND_REGEN_FOOD,
  HEALTH_FOOD,
  MAGICKA_FOOD,
  STAMINA_FOOD,
  INCREASE_MAX_HEALTH_AND_STAMINA,
  INCREASE_MAX_HEALTH_AND_MAGICKA,
} from '../../../types/abilities';
import { ArmorType, PlayerGear } from '../../../types/playerDetails';
import { BuffLookupData } from '../../../utils/BuffLookupUtils';
import { type ClassAnalysisResult } from '../../../utils/classDetectionUtils';
import { BuildIssue } from '../../../utils/detectBuildIssues';
import {
  ARENA_SET_NAMES,
  MONSTER_ONE_PIECE_HINTS,
  MYTHIC_SET_NAMES,
  normalizeGearName,
  PlayerGearSetRecord,
} from '../../../utils/gearUtilities';
import { resolveActorName } from '../../../utils/resolveActorName';
import { buildTooltipProps } from '../../../utils/skillTooltipMapper';

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
  reportId?: string | null;
  fightId?: string | null;
  playerGear: PlayerGearSetRecord[];
  friendlyBuffLookup?: BuffLookupData | null;
}

// Utility functions moved from parent component
const CLASS_ALIASES: Record<string, string> = {
  dragonknight: 'dragonknight',
  'dragon knight': 'dragonknight',
  dk: 'dragonknight',
  templar: 'templar',
  plar: 'templar',
  warden: 'warden',
  nightblade: 'nightblade',
  'night blade': 'nightblade',
  nb: 'nightblade',
  sorcerer: 'sorcerer',
  sorc: 'sorcerer',
  necromancer: 'necromancer',
  necro: 'necromancer',
  arcanist: 'arcanist',
};

function toClassKey(name?: string | null): string {
  const normalized = (name ?? '').toLowerCase().trim();
  return CLASS_ALIASES[normalized] || 'unknown';
}

// Detect common ESO food/drink buffs by aura name
// Named foods (specific food items)
const NAMED_FOOD_REGEXPS: RegExp[] = [
  /Artaeum\s+Takeaway\s+Broth/i,
  /Bewitched\s+Sugar\s+Skulls/i,
  /Clockwork\s+Citrus\s+Filet/i,
  /Crown\s+Fortifying\s+Meal/i,
  /Crown\s+Vigorous\s+Tincture/i,
  /Dubious\s+Camoran\s+Throne/i,
  /Eye\s+Scream/i,
  /Ghastly\s+Eye\s+Bowl/i,
  /Jewels\s+of\s+Misrule/i,
  /Lava\s+Foot\s+Soup.*Saltrice/i,
  /Smoked\s+Bear\s+Haunch/i,
  /Witchmother.?s\s+Potent\s+Brew/i,
];

// Generic effect auras (fallback when named foods not found)
const FOOD_EFFECT_REGEXPS: RegExp[] = [
  /Increase\s+All\s+Primary\s+Stats/i,
  /Increase\s+Max\s+Health\s+&\s+Magicka/i,
  /Increase\s+Max\s+Health\s+&\s+Stamina/i,
];

function detectFoodFromAuras(
  auras?: Array<{ name: string; id: number; stacks?: number }>,
): { name: string; id: number } | undefined {
  if (!auras || auras.length === 0) return undefined;

  // First priority: Check for named foods using regex
  for (const a of auras) {
    const n = a?.name || '';
    if (NAMED_FOOD_REGEXPS.some((rx) => rx.test(n))) {
      return { name: n, id: a.id };
    }
  }

  // Second priority: Check against the known food ID sets
  for (const a of auras) {
    const id = a.id;

    if (
      TRI_STAT_FOOD.has(id) ||
      HEALTH_AND_REGEN_FOOD.has(id) ||
      HEALTH_FOOD.has(id) ||
      MAGICKA_FOOD.has(id) ||
      STAMINA_FOOD.has(id) ||
      INCREASE_MAX_HEALTH_AND_STAMINA.has(id) ||
      INCREASE_MAX_HEALTH_AND_MAGICKA.has(id)
    ) {
      return { name: a.name || '', id: a.id };
    }
  }

  // Third priority: Fallback to generic effect auras
  for (const a of auras) {
    const n = a?.name || '';
    if (FOOD_EFFECT_REGEXPS.some((rx) => rx.test(n))) {
      return { name: n, id: a.id };
    }
  }

  return undefined;
}

function abbreviateFood(name: string): string {
  if (name.includes('Tri-Stat')) return 'TRI';
  if (name.includes('Health') && name.includes('Regen')) return 'H+R';
  if (name.includes('Health') && name.includes('Stamina')) return 'H+S';
  if (name.includes('Health') && name.includes('Magicka')) return 'H+M';
  if (name.includes('Health')) return 'HEALTH';
  if (name.includes('Magicka')) return 'MAG';
  if (name.includes('Stamina')) return 'STAM';
  return name.slice(0, 6).toUpperCase();
}

function getFoodColor(foodId?: number): string {
  if (!foodId) return '#888';
  if (TRI_STAT_FOOD.has(foodId)) return '#4CAF50'; // Green for tri-stat
  if (HEALTH_AND_REGEN_FOOD.has(foodId)) return '#FF9800'; // Orange for health+regen
  if (HEALTH_FOOD.has(foodId)) return '#F44336'; // Red for health
  if (MAGICKA_FOOD.has(foodId)) return '#3F51B5'; // Blue for magicka
  if (STAMINA_FOOD.has(foodId)) return '#4CAF50'; // Green for stamina
  if (INCREASE_MAX_HEALTH_AND_STAMINA.has(foodId)) return '#FF5722'; // Deep orange
  if (INCREASE_MAX_HEALTH_AND_MAGICKA.has(foodId)) return '#9C27B0'; // Purple
  return '#888'; // Gray for unknown
}

const buildVariantSx = (variant: string, theme: Theme): SxProps<Theme> => {
  const isDark = theme.palette.mode === 'dark';

  const darkVariants: Record<string, SxProps<Theme>> = {
    green: {
      background:
        'linear-gradient(135deg, rgba(76, 217, 100, 0.25) 0%, rgba(76, 217, 100, 0.15) 50%, rgba(76, 217, 100, 0.08) 100%)',
      borderColor: 'rgba(76, 217, 100, 0.3)',
      color: '#5ce572',
    },
    blue: {
      background:
        'linear-gradient(135deg, rgba(0, 122, 255, 0.25) 0%, rgba(0, 122, 255, 0.15) 50%, rgba(0, 122, 255, 0.08) 100%)',
      borderColor: 'rgba(0, 122, 255, 0.3)',
      color: '#4da3ff',
    },
    lightBlue: {
      background:
        'linear-gradient(135deg, rgba(94, 234, 255, 0.25) 0%, rgba(94, 234, 255, 0.15) 50%, rgba(94, 234, 255, 0.08) 100%)',
      borderColor: 'rgba(94, 234, 255, 0.35)',
      color: '#7ee8ff',
    },
    purple: {
      background:
        'linear-gradient(135deg, rgba(175, 82, 222, 0.25) 0%, rgba(175, 82, 222, 0.15) 50%, rgba(175, 82, 222, 0.08) 100%)',
      borderColor: 'rgba(175, 82, 222, 0.3)',
      color: '#c57fff',
    },
    indigo: {
      background:
        'linear-gradient(135deg, rgba(88, 86, 214, 0.25) 0%, rgba(88, 86, 214, 0.15) 50%, rgba(88, 86, 214, 0.08) 100%)',
      borderColor: 'rgba(88, 86, 214, 0.3)',
      color: '#a29cff',
    },
    championRed: {
      background:
        'linear-gradient(135deg, rgba(244, 67, 54, 0.25) 0%, rgba(244, 67, 54, 0.15) 50%, rgba(244, 67, 54, 0.08) 100%)',
      borderColor: 'rgba(244, 67, 54, 0.3)',
      color: '#ff6b5a',
    },
    championBlue: {
      background:
        'linear-gradient(135deg, rgba(33, 150, 243, 0.25) 0%, rgba(33, 150, 243, 0.15) 50%, rgba(33, 150, 243, 0.08) 100%)',
      borderColor: 'rgba(33, 150, 243, 0.3)',
      color: '#42a5f5',
    },
    championGreen: {
      background:
        'linear-gradient(135deg, rgba(76, 175, 80, 0.25) 0%, rgba(76, 175, 80, 0.15) 50%, rgba(76, 175, 80, 0.08) 100%)',
      borderColor: 'rgba(76, 175, 80, 0.3)',
      color: '#66bb6a',
    },
  };

  const lightVariants: Record<string, SxProps<Theme>> = {
    green: {
      background:
        'linear-gradient(135deg, rgba(56, 142, 60, 0.15) 0%, rgba(56, 142, 60, 0.08) 50%, rgba(56, 142, 60, 0.04) 100%)',
      borderColor: 'rgba(56, 142, 60, 0.4)',
      color: '#2e7d32',
    },
    blue: {
      background:
        'linear-gradient(135deg, rgba(25, 118, 210, 0.15) 0%, rgba(25, 118, 210, 0.08) 50%, rgba(25, 118, 210, 0.04) 100%)',
      borderColor: 'rgba(25, 118, 210, 0.4)',
      color: '#1565c0',
    },
    lightBlue: {
      background:
        'linear-gradient(135deg, rgba(3, 169, 244, 0.15) 0%, rgba(3, 169, 244, 0.08) 50%, rgba(3, 169, 244, 0.04) 100%)',
      borderColor: 'rgba(3, 169, 244, 0.4)',
      color: '#0277bd',
    },
    purple: {
      background:
        'linear-gradient(135deg, rgba(156, 39, 176, 0.15) 0%, rgba(156, 39, 176, 0.08) 50%, rgba(156, 39, 176, 0.04) 100%)',
      borderColor: 'rgba(156, 39, 176, 0.4)',
      color: '#7b1fa2',
    },
    indigo: {
      background:
        'linear-gradient(135deg, rgba(63, 81, 181, 0.15) 0%, rgba(63, 81, 181, 0.08) 50%, rgba(63, 81, 181, 0.04) 100%)',
      borderColor: 'rgba(63, 81, 181, 0.4)',
      color: '#303f9f',
    },
    championRed: {
      background:
        'linear-gradient(135deg, rgba(211, 47, 47, 0.15) 0%, rgba(211, 47, 47, 0.08) 50%, rgba(211, 47, 47, 0.04) 100%)',
      borderColor: 'rgba(211, 47, 47, 0.4)',
      color: '#c62828',
    },
    championBlue: {
      background:
        'linear-gradient(135deg, rgba(30, 136, 229, 0.15) 0%, rgba(30, 136, 229, 0.08) 50%, rgba(30, 136, 229, 0.04) 100%)',
      borderColor: 'rgba(30, 136, 229, 0.4)',
      color: '#1976d2',
    },
    championGreen: {
      background:
        'linear-gradient(135deg, rgba(67, 160, 71, 0.15) 0%, rgba(67, 160, 71, 0.08) 50%, rgba(67, 160, 71, 0.04) 100%)',
      borderColor: 'rgba(67, 160, 71, 0.4)',
      color: '#388e3c',
    },
  };

  return isDark
    ? darkVariants[variant] || darkVariants.blue
    : lightVariants[variant] || lightVariants.blue;
};

const getGearChipProps = (setName: string, count: number, theme: Theme): Partial<ChipProps> => {
  const normalizedName = normalizeGearName(setName);

  let variant: string;
  if (Array.from(MYTHIC_SET_NAMES).some((mythic) => normalizeGearName(mythic) === normalizedName)) {
    variant = 'purple';
  } else if (
    Array.from(ARENA_SET_NAMES).some((arena) => normalizeGearName(arena) === normalizedName)
  ) {
    variant = 'lightBlue';
  } else if (
    Array.from(MONSTER_ONE_PIECE_HINTS).some((monster) =>
      normalizedName.includes(normalizeGearName(monster)),
    )
  ) {
    variant = 'green';
  } else if (count >= 5) {
    variant = 'blue';
  } else {
    variant = 'indigo';
  }

  return {
    sx: {
      ...buildVariantSx(variant, theme),
      '& .MuiChip-label': { fontSize: '0.58rem' },
    },
  };
};

// AutoFit component for skill lines
const OneLineAutoFit: React.FC<{ minScale?: number; children: React.ReactNode }> = ({
  minScale = 0.7,
  children,
}) => {
  const outerRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    const updateScale = (): void => {
      if (outerRef.current && innerRef.current) {
        const outerWidth = outerRef.current.clientWidth;
        const innerWidth = innerRef.current.scrollWidth;

        if (innerWidth > outerWidth) {
          const newScale = Math.max(outerWidth / innerWidth, minScale);
          setScale(newScale);
        } else {
          setScale(1);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [minScale]);

  return (
    <Box
      ref={outerRef}
      sx={{ minWidth: 0, width: '100%', overflow: 'hidden', whiteSpace: 'nowrap' }}
    >
      <Box
        ref={innerRef}
        sx={{
          display: 'inline-block',
          transform: `scale(${scale})`,
          transformOrigin: 'left center',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export const PlayerCard: React.FC<PlayerCardProps> = ({
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
  reportId,
  fightId,
  playerGear,
  friendlyBuffLookup,
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

  const getArmorWeightCounts = (
    gear: PlayerGear[],
  ): { heavy: number; medium: number; light: number } => {
    let heavy = 0,
      medium = 0,
      light = 0;

    for (const g of gear) {
      if (!g || g.id === 0) continue;

      switch (g.type) {
        case ArmorType.HEAVY:
          heavy += 1;
          break;
        case ArmorType.MEDIUM:
          medium += 1;
          break;
        case ArmorType.LIGHT:
          light += 1;
          break;
      }
    }

    return { heavy, medium, light };
  };

  const talents = player?.combatantInfo?.talents ?? [];
  const gear = player?.combatantInfo?.gear ?? [];
  const armorWeights = getArmorWeightCounts(gear);

  // Get dynamic skill lines from class analysis
  const detectedSkillLines = classAnalysis?.skillLines || [];

  const foodAura = detectFoodFromAuras(auras);

  return (
    <Box sx={{ minWidth: 0, display: 'flex' }}>
      <Card
        variant="outlined"
        className="u-hover-lift u-fade-in-up"
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background:
            'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)',
          border:
            theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(59, 130, 246, 0.3)',
        }}
      >
        <CardContent sx={{ p: 2, pb: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                  title={`Role: ${player.role === 'tank' ? 'Tank' : player.role === 'healer' ? 'Healer' : 'DPS'}`}
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
                      aria-label={`Role: ${player.role === 'tank' ? 'Tank' : player.role === 'healer' ? 'Healer' : 'DPS'}`}
                    >
                      {player.role === 'tank' ? '🛡️' : player.role === 'healer' ? '❤️' : '⚔️'}
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
                                {skill.skillLine}
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
                                const clsKey = toClassKey(player.type);
                                // Try ID-based lookup first, then fall back to name-based
                                const rich = buildTooltipProps({
                                  abilityId: talent.guid,
                                  abilityName: talent.name,
                                  classKey: clsKey,
                                });
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
                              slotProps={{
                                popper: {
                                  modifiers: [
                                    {
                                      name: 'preventOverflow',
                                      options: { padding: 8, rootBoundary: 'viewport' },
                                    },
                                    {
                                      name: 'flip',
                                      options: {
                                        fallbackPlacements: ['top', 'bottom', 'left', 'right'],
                                      },
                                    },
                                    { name: 'offset', options: { offset: [0, 8] } },
                                  ],
                                },
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
                                  const clsKey = toClassKey(player.type);
                                  // Try ID-based lookup first, then fall back to name-based
                                  const rich = buildTooltipProps({
                                    abilityId: talent.guid,
                                    abilityName: talent.name,
                                    classKey: clsKey,
                                  });
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
                                slotProps={{
                                  popper: {
                                    modifiers: [
                                      {
                                        name: 'preventOverflow',
                                        options: { padding: 8, rootBoundary: 'viewport' },
                                      },
                                      {
                                        name: 'flip',
                                        options: {
                                          fallbackPlacements: ['top', 'bottom', 'left', 'right'],
                                        },
                                      },
                                      { name: 'offset', options: { offset: [0, 8] } },
                                    ],
                                  },
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
                        {playerGear?.map((rec, idx) => {
                          const chipProps = getGearChipProps(rec.labelName, rec.count, theme);
                          return (
                            <Chip
                              key={idx}
                              label={`${rec.count} ${rec.labelName}`}
                              size="small"
                              title={`Set ID: ${rec.data.setID ?? ''}`}
                              {...chipProps}
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
                            color: getFoodColor(foodAura?.id),
                          }}
                        >
                          {foodAura ? abbreviateFood(foodAura.name) : 'NONE'}
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
                        color: '#c06220',
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
    </Box>
  );
};
