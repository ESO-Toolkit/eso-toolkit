import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { SxProps, Theme, useTheme } from '@mui/material/styles';
import React from 'react';

export interface ScribingSkillData {
  /** The scribed skill ID */
  skillId: number;
  /** The name of the scribed skill */
  skillName: string;
  /** List of effects (buffs/debuffs/damage) triggered by this scribed skill */
  effects: Array<{
    /** The ability ID of the effect */
    abilityId: number;
    /** The name of the effect */
    abilityName: string;
    /** Type of effect: buff, debuff, damage, heal, aura, or resource */
    type: 'buff' | 'debuff' | 'damage' | 'heal' | 'aura' | 'resource';
    /** Number of times this effect was applied/triggered */
    count: number;
  }>;
}

export interface GrimoireData {
  /** The name of the grimoire */
  grimoireName: string;
  /** List of scribing skills for this grimoire */
  skills: ScribingSkillData[];
}

interface ScribingSkillsDisplayProps {
  /** Array of scribing skills data for a player */
  scribingSkills?: ScribingSkillData[];
  /** Array of grimoire-grouped skills for a player */
  grimoires?: GrimoireData[];
  /** Optional styling */
  sx?: SxProps<Theme>;
}

const getEffectTypeColor = (type: string, theme: Theme): string => {
  switch (type) {
    case 'buff':
      return theme.palette.success.main;
    case 'debuff':
      return theme.palette.error.main;
    case 'damage':
      return theme.palette.warning.main;
    case 'heal':
      return theme.palette.info.main;
    case 'aura':
      return theme.palette.secondary.main;
    case 'resource':
      return theme.palette.primary.main;
    default:
      return theme.palette.text.secondary;
  }
};

const getEffectTypeIcon = (type: string): string => {
  switch (type) {
    case 'buff':
      return '⬆️';
    case 'debuff':
      return '⬇️';
    case 'damage':
      return '⚔️';
    case 'heal':
      return '❤️';
    case 'aura':
      return '🔮';
    case 'resource':
      return '⚡';
    default:
      return '◯';
  }
};

export const ScribingSkillsDisplay: React.FC<ScribingSkillsDisplayProps> = ({
  scribingSkills,
  grimoires,
  sx,
}) => {
  const theme = useTheme();

  // Support both modes: individual skills or grimoire-grouped skills
  const hasGrimoires = grimoires && grimoires.length > 0;
  const hasSkills = scribingSkills && scribingSkills.length > 0;

  if (!hasGrimoires && !hasSkills) {
    return (
      <Box sx={sx}>
        <Typography variant="body2" color="text.secondary">
          No scribed skills detected
        </Typography>
      </Box>
    );
  }

  // If we have grimoires, use the grouped display
  if (hasGrimoires && grimoires) {
    return (
      <Box sx={sx}>
        <Typography
          variant="body2"
          fontWeight="bold"
          sx={{ mb: 1, fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Scribed Skills (
          {(() => {
            // Count unique effects across all grimoires
            const allEffectNames = new Set();
            grimoires.forEach((g) => {
              g.skills.forEach((s) => {
                s.effects.forEach((e) => {
                  allEffectNames.add(e.abilityName);
                });
              });
            });
            return allEffectNames.size;
          })()}{' '}
          unique effects, {grimoires.length} grimoires)
        </Typography>

        {grimoires.map((grimoire, grimoireIndex) => {
          // Collect all effects from all skills in this grimoire
          const allEffects = grimoire.skills.flatMap((skill) => skill.effects);

          return (
            <Box key={`${grimoire.grimoireName}-${grimoireIndex}`} sx={{ mb: 2, last: { mb: 0 } }}>
              {/* Grimoire Header */}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'secondary.main',
                  display: 'block',
                  mb: 1,
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                📖 {grimoire.grimoireName}
              </Typography>

              {/* All effects for this grimoire, grouped by name */}
              <Box display="flex" flexWrap="wrap" gap={0.5} sx={{ pl: 1 }}>
                {(() => {
                  // Group effects by name, combining different types of the same name
                  const groupedEffects = allEffects.reduce(
                    (acc, effect) => {
                      // Normalize the ability name by removing bracketed numbers (e.g., "Leashing Soul [10]" -> "Leashing Soul")
                      const normalizedName = effect.abilityName.replace(/\s*\[[^\]]*\]$/, '');
                      const key = normalizedName;
                      if (!acc[key]) {
                        acc[key] = {
                          abilityName: normalizedName,
                          types: [effect.type],
                          abilityId: effect.abilityId,
                        };
                      } else if (!acc[key].types.includes(effect.type)) {
                        acc[key].types.push(effect.type);
                      }
                      return acc;
                    },
                    {} as Record<
                      string,
                      { abilityName: string; types: string[]; abilityId: number }
                    >
                  );

                  return Object.values(groupedEffects).map((effectGroup) => {
                    // Determine primary type for coloring (prioritize damage/debuff > buff > others)
                    const primaryType = effectGroup.types.includes('damage')
                      ? 'damage'
                      : effectGroup.types.includes('debuff')
                        ? 'debuff'
                        : effectGroup.types.includes('buff')
                          ? 'buff'
                          : effectGroup.types[0];

                    const typesList = effectGroup.types.join(', ');
                    const iconList = effectGroup.types
                      .map((type) => getEffectTypeIcon(type))
                      .join('');

                    return (
                      <Tooltip
                        key={effectGroup.abilityId}
                        title={`${effectGroup.abilityName} (${typesList})`}
                        arrow
                        placement="top"
                      >
                        <Chip
                          label={
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <span>{iconList}</span>
                              <span>{effectGroup.abilityName}</span>
                            </Box>
                          }
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: getEffectTypeColor(primaryType, theme),
                            color: getEffectTypeColor(primaryType, theme),
                            backgroundColor: `${getEffectTypeColor(primaryType, theme)}08`,
                            fontSize: '0.65rem',
                            height: 22,
                            '& .MuiChip-label': {
                              px: 0.8,
                              py: 0,
                            },
                            '&:hover': {
                              backgroundColor: `${getEffectTypeColor(primaryType, theme)}15`,
                            },
                          }}
                        />
                      </Tooltip>
                    );
                  });
                })()}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }

  // Fallback to the old individual skills display
  if (hasSkills && scribingSkills) {
    return (
      <Box sx={sx}>
        <Typography
          variant="body2"
          fontWeight="bold"
          sx={{ mb: 1, fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Scribed Skills (
          {(() => {
            // Count unique effects across all skills
            const allEffectNames = new Set();
            scribingSkills.forEach((s) => {
              s.effects.forEach((e) => {
                allEffectNames.add(e.abilityName);
              });
            });
            return allEffectNames.size;
          })()}{' '}
          unique effects)
        </Typography>

        {scribingSkills.map((skill) => (
          <Box key={skill.skillId} sx={{ mb: 2, last: { mb: 0 } }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: 'primary.main',
                display: 'block',
                mb: 0.5,
              }}
            >
              📜 {skill.skillName}
            </Typography>

            <Box display="flex" flexWrap="wrap" gap={0.5}>
              {(() => {
                // Group effects by name, combining different types of the same name
                const groupedEffects = skill.effects.reduce(
                  (acc, effect) => {
                    const key = effect.abilityName;
                    if (!acc[key]) {
                      acc[key] = {
                        abilityName: effect.abilityName,
                        types: [effect.type],
                        abilityId: effect.abilityId,
                      };
                    } else if (!acc[key].types.includes(effect.type)) {
                      acc[key].types.push(effect.type);
                    }
                    return acc;
                  },
                  {} as Record<string, { abilityName: string; types: string[]; abilityId: number }>
                );

                return Object.values(groupedEffects).map((effectGroup) => {
                  // Determine primary type for coloring (prioritize damage/debuff > buff > others)
                  const primaryType = effectGroup.types.includes('damage')
                    ? 'damage'
                    : effectGroup.types.includes('debuff')
                      ? 'debuff'
                      : effectGroup.types.includes('buff')
                        ? 'buff'
                        : effectGroup.types[0];

                  const typesList = effectGroup.types.join(', ');
                  const iconList = effectGroup.types
                    .map((type) => getEffectTypeIcon(type))
                    .join('');

                  return (
                    <Tooltip
                      key={effectGroup.abilityId}
                      title={`${effectGroup.abilityName} (${typesList})`}
                      arrow
                      placement="top"
                    >
                      <Chip
                        label={
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <span>{iconList}</span>
                            <span>{effectGroup.abilityName}</span>
                          </Box>
                        }
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: getEffectTypeColor(primaryType, theme),
                          color: getEffectTypeColor(primaryType, theme),
                          backgroundColor: `${getEffectTypeColor(primaryType, theme)}08`,
                          fontSize: '0.7rem',
                          height: 24,
                          '& .MuiChip-label': {
                            px: 1,
                            py: 0,
                          },
                          '&:hover': {
                            backgroundColor: `${getEffectTypeColor(primaryType, theme)}15`,
                          },
                        }}
                      />
                    </Tooltip>
                  );
                });
              })()}
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return null;
};
