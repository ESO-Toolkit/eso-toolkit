import {
  Shield as ShieldIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import {
  TankSetup,
  RosterDetailLevel,
  SupportUltimate,
  CLASS_SKILL_LINES,
  ALL_5PIECE_SETS,
  MONSTER_SETS,
  validateCompatibility,
} from '../../types/roster';
import { KnownSetIDs } from '../../types/abilities';
import { SlotFullModePanel } from './SlotFullModePanel';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../../utils/roleColors';
import { getSetDisplayName, findSetIdByName } from '../../utils/setNameUtils';
import { makeGlassSx } from './shared/glassSx';
import {
  TANK_5PIECE_OPTIONS,
  TANK_MONSTER_OPTIONS,
  getUltimateIcon,
  getSkillLineIcon,
  isTank5PieceSet,
  isFlexible5PieceSet,
  isMonsterSet,
} from './shared/rosterCardHelpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TankCardProps {
  tankNum: 1 | 2;
  tank: TankSetup;
  onChange: (updates: Partial<TankSetup>) => void;
  availableGroups: string[];
  mode?: RosterDetailLevel;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TankCard = React.memo<TankCardProps>(({ tankNum, tank, onChange, availableGroups, mode }) => {
  const tankTheme = useTheme();
  const tankIsDark = tankTheme.palette.mode === 'dark';
  const tankRoleColors = tankIsDark ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;
  const glassSx = makeGlassSx(tankIsDark);
  const availableUltimates = Object.values(SupportUltimate);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: '12px',
        backgroundColor: tankIsDark ? `${tankRoleColors.tank}0a` : `${tankRoleColors.tank}06`,
        border: tankIsDark
          ? `1px solid ${tankRoleColors.tank}20`
          : `1px solid ${tankRoleColors.tank}18`,
        borderLeft: `3px solid ${tankRoleColors.tank}`,
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          borderColor: `${tankRoleColors.tank}35`,
          borderLeftColor: tankRoleColors.tank,
          boxShadow: `0 4px 16px ${tankRoleColors.tank}18, 0 2px 8px rgba(0,0,0,0.1)`,
        },
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1,
            pb: 1,
            borderBottom: `1px solid ${tankRoleColors.tank}25`,
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 0.875,
              py: 0.4,
              borderRadius: '6px',
              backgroundColor: `${tankRoleColors.tank}18`,
              border: `1px solid ${tankRoleColors.tank}35`,
            }}
          >
            <ShieldIcon sx={{ fontSize: '0.85rem', color: tankRoleColors.tank }} />
            <Typography
              sx={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700,
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: tankRoleColors.tank,
                lineHeight: 1,
              }}
            >
              Tank {tankNum}
            </Typography>
          </Box>
        </Box>
        <Stack spacing={1.5}>
          {/* Essential Fields - Always Visible */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <TextField
                fullWidth
                size="small"
                label="Player Name"
                value={tank.playerName || ''}
                onChange={(e) => onChange({ playerName: e.target.value })}
                placeholder="Enter player name"
                sx={glassSx}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 150 }}>
              <Autocomplete
                freeSolo
                size="small"
                options={[...availableGroups].sort()}
                value={tank.group?.groupName || ''}
                onChange={(_, value) =>
                  onChange({
                    group: value ? { groupName: value } : undefined,
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Group"
                    placeholder="e.g., Left Stack"
                    sx={glassSx}
                  />
                )}
              />
            </Box>
          </Box>

          {/* Equipment */}
          <Box
            sx={{
              p: 1.25,
              borderRadius: '10px',
              backgroundColor: tankIsDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
              border: tankIsDark
                ? '1px solid rgba(255,255,255,0.04)'
                : '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <Typography
              sx={{
                fontSize: '0.65rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: tankIsDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                mb: 1,
              }}
            >
              Equipment
            </Typography>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={TANK_5PIECE_OPTIONS}
                    value={tank.gearSets.set1 ? getSetDisplayName(tank.gearSets.set1) : ''}
                    onChange={(_, value) =>
                      onChange({
                        gearSets: {
                          ...tank.gearSets,
                          set1: value ? findSetIdByName(value) : undefined,
                        },
                      })
                    }
                    groupBy={(option) => {
                      const setId = findSetIdByName(option);
                      if (setId && isTank5PieceSet(setId)) return 'Tank Sets';
                      if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                      return 'Other';
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Primary Set (Body)"
                        placeholder="e.g., Alkosh, Yolnahkriin"
                        sx={glassSx}
                        InputProps={{
                          ...params.InputProps,
                        }}
                      />
                    )}
                    renderOption={(props, option) => <li {...props}>{option}</li>}
                  />
                </Box>
                <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={TANK_5PIECE_OPTIONS}
                    value={tank.gearSets.set2 ? getSetDisplayName(tank.gearSets.set2) : ''}
                    onChange={(_, value) =>
                      onChange({
                        gearSets: {
                          ...tank.gearSets,
                          set2: value ? findSetIdByName(value) : undefined,
                        },
                      })
                    }
                    groupBy={(option) => {
                      const setId = findSetIdByName(option);
                      if (setId && isTank5PieceSet(setId)) return 'Tank Sets';
                      if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                      return 'Other';
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Secondary Set (Jewelry)"
                        placeholder="e.g., Crimson Oath's Rive"
                        sx={glassSx}
                        InputProps={{
                          ...params.InputProps,
                        }}
                      />
                    )}
                    renderOption={(props, option) => <li {...props}>{option}</li>}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={TANK_MONSTER_OPTIONS}
                    value={
                      tank.gearSets.monsterSet ? getSetDisplayName(tank.gearSets.monsterSet) : ''
                    }
                    onChange={(_, value) =>
                      onChange({
                        gearSets: {
                          ...tank.gearSets,
                          monsterSet: value ? findSetIdByName(value) : undefined,
                        },
                      })
                    }
                    groupBy={(_option) => {
                      return 'Monster Sets';
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Monster/Mythic Set"
                        placeholder="e.g., Symphony of Blades"
                        sx={glassSx}
                        InputProps={{
                          ...params.InputProps,
                        }}
                      />
                    )}
                    renderOption={(props, option) => <li {...props}>{option}</li>}
                  />
                </Box>
                <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={availableUltimates}
                    value={tank.ultimate || null}
                    onChange={(_event, newValue) =>
                      onChange({ ultimate: newValue as string | null })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Ultimate"
                        placeholder="Select or type custom ultimate"
                        sx={glassSx}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getUltimateIcon(option)}
                          {option}
                        </Box>
                      </li>
                    )}
                  />
                </Box>
              </Box>
            </Stack>
          </Box>

          {/* Compatibility Warnings */}
          {(() => {
            const warnings = validateCompatibility(
              [
                tank.gearSets.set1 ? getSetDisplayName(tank.gearSets.set1) : undefined,
                tank.gearSets.set2 ? getSetDisplayName(tank.gearSets.set2) : undefined,
                tank.gearSets.monsterSet ? getSetDisplayName(tank.gearSets.monsterSet) : undefined,
                ...(tank.gearSets.additionalSets || []).map((id) => getSetDisplayName(id)),
              ].filter((s): s is string => s !== undefined),
              tank.ultimate,
            );
            if (warnings.length === 0) return null;
            return (
              <Stack spacing={1}>
                {warnings.map((warning, index) => (
                  <Alert
                    key={index}
                    severity="warning"
                    sx={{
                      py: 0.5,
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255,167,38,0.08)',
                      border: '1px solid rgba(255,167,38,0.2)',
                    }}
                  >
                    {warning}
                  </Alert>
                ))}
              </Stack>
            );
          })()}

          {/* Advanced Options - Collapsible */}
          <Accordion
            elevation={0}
            disableGutters
            sx={{
              mt: 2,
              borderRadius: '10px !important',
              backgroundColor: 'transparent',
              border: tankIsDark
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(0,0,0,0.08)',
              '&:before': { display: 'none' },
              '&.Mui-expanded': { margin: 0, marginTop: 2 },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ px: 1.5, minHeight: 40, '&.Mui-expanded': { minHeight: 40 } }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: tankIsDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                  fontWeight: 500,
                }}
              >
                Advanced Options
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 1.5, pt: 0.5, pb: 1.5 }}>
              <Stack spacing={1.25}>
                {/* Identity */}
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: tankIsDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                    mt: 0.5,
                  }}
                >
                  Assignment
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 40%', minWidth: 140 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role Label"
                      placeholder={tankNum === 1 ? 'MT' : 'OT'}
                      value={tank.roleLabel || ''}
                      onChange={(e) => onChange({ roleLabel: e.target.value })}
                      sx={glassSx}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 15%', minWidth: 80 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Player #"
                      value={tank.playerNumber || ''}
                      onChange={(e) =>
                        onChange({
                          playerNumber: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        })
                      }
                      sx={glassSx}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 40%', minWidth: 200 }}>
                    <Autocomplete
                      multiple
                      freeSolo
                      size="small"
                      options={[]}
                      value={tank.labels || []}
                      onChange={(_, value) => onChange({ labels: value })}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            {...getTagProps({ index })}
                            key={option}
                            label={option}
                            size="small"
                            sx={{
                              borderRadius: '6px',
                              backgroundColor: tankIsDark
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(0,0,0,0.05)',
                              border: tankIsDark
                                ? '1px solid rgba(255,255,255,0.1)'
                                : '1px solid rgba(0,0,0,0.1)',
                              fontWeight: 500,
                              fontSize: '0.75rem',
                            }}
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label="Tags"
                          placeholder="Add tags"
                          sx={glassSx}
                        />
                      )}
                    />
                  </Box>
                </Box>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  minRows={1}
                  maxRows={4}
                  label="Role Notes"
                  placeholder="e.g., TOMB Main Tank, handles double stacks, portal duty"
                  value={tank.roleNotes || ''}
                  onChange={(e) => onChange({ roleNotes: e.target.value })}
                  sx={glassSx}
                />

                {/* Extra Gear */}
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: tankIsDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                    mt: 0.5,
                  }}
                >
                  Extra Gear
                </Typography>
                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[...ALL_5PIECE_SETS, ...MONSTER_SETS]
                    .map((id) => getSetDisplayName(id))
                    .sort()}
                  value={(tank.gearSets.additionalSets || []).map((id) => getSetDisplayName(id))}
                  onChange={(_, value) =>
                    onChange({
                      gearSets: {
                        ...tank.gearSets,
                        additionalSets: value
                          .map((name) => findSetIdByName(name))
                          .filter((id): id is KnownSetIDs => id !== undefined),
                      },
                    })
                  }
                  groupBy={(option) => {
                    const setId = findSetIdByName(option);
                    if (setId && isTank5PieceSet(setId)) return 'Tank Sets';
                    if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                    if (setId && isMonsterSet(setId)) return 'Monster Sets';
                    return 'Other';
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Additional Sets"
                      helperText="e.g., monster sets, arena weapons (type custom set name if not listed)"
                      sx={glassSx}
                    />
                  )}
                  renderOption={(props, option) => <li {...props}>{option}</li>}
                />

                {/* Build */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mt: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: tankIsDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                    }}
                  >
                    Build
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={tank.skillLines.isFlex}
                        onChange={(e) =>
                          onChange({
                            skillLines: {
                              ...tank.skillLines,
                              isFlex: e.target.checked,
                            },
                          })
                        }
                        sx={{ p: 0.5 }}
                      />
                    }
                    label="Any class"
                    sx={{
                      ml: 'auto',
                      mr: 0,
                      '& .MuiFormControlLabel-label': {
                        fontSize: '0.75rem',
                        color: tankIsDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                      },
                    }}
                  />
                </Box>
                {!tank.skillLines.isFlex && (
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES].sort()}
                        value={tank.skillLines.line1}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: {
                              ...tank.skillLines,
                              line1: value || '',
                            },
                          })
                        }
                        renderInput={(params) => (
                          <TextField {...params} label="Skill Line 1" sx={glassSx} />
                        )}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES].sort()}
                        value={tank.skillLines.line2}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: {
                              ...tank.skillLines,
                              line2: value || '',
                            },
                          })
                        }
                        renderInput={(params) => (
                          <TextField {...params} label="Skill Line 2" sx={glassSx} />
                        )}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES].sort()}
                        value={tank.skillLines.line3}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: {
                              ...tank.skillLines,
                              line3: value || '',
                            },
                          })
                        }
                        renderInput={(params) => (
                          <TextField {...params} label="Skill Line 3" sx={glassSx} />
                        )}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                  </Box>
                )}
                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[]}
                  value={tank.specificSkills}
                  onChange={(_, value) => onChange({ specificSkills: value })}
                  slotProps={{
                    popper: {
                      disablePortal: true,
                    },
                  }}
                  ChipProps={{
                    onMouseDown: (event) => {
                      event.stopPropagation();
                    },
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Specific Skills Required"
                      placeholder="Add skill..."
                      sx={glassSx}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...chipProps } = getTagProps({ index });
                      return (
                        <Chip
                          label={option}
                          {...chipProps}
                          key={key}
                          size="small"
                          sx={{
                            borderRadius: '6px',
                            backgroundColor: tankIsDark
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(0,0,0,0.05)',
                            border: tankIsDark
                              ? '1px solid rgba(255,255,255,0.1)'
                              : '1px solid rgba(0,0,0,0.1)',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                          }}
                        />
                      );
                    })
                  }
                />

                <TextField
                  fullWidth
                  multiline
                  size="small"
                  rows={2}
                  label="Notes"
                  value={tank.notes || ''}
                  onChange={(e) => onChange({ notes: e.target.value })}
                  sx={glassSx}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

          {mode === 'full' && (
            <SlotFullModePanel
              skills={tank.skills}
              cpPoints={tank.cpPoints}
              food={tank.food}
              passives={tank.passives}
              onSkillsChange={(skills) => onChange({ skills })}
              onCpPointsChange={(cpPoints) => onChange({ cpPoints })}
              onFoodChange={(food) => onChange({ food })}
              onPassivesChange={(passives) => onChange({ passives })}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
});
TankCard.displayName = 'TankCard';
