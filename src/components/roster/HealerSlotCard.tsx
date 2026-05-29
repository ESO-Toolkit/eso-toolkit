import { Favorite as FavoriteIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import {
  HealerSetup,
  HealerBuff,
  RosterDetailLevel,
  validateCompatibility,
} from '../../types/roster';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../../utils/roleColors';
import { healerSlotToBuild } from '../../utils/rosterSlotToBuild';
import { getSetDisplayName, findSetIdByName } from '../../utils/setNameUtils';

import {
  GLASS_SX_DARK,
  GLASS_SX_LIGHT,
  SECTION_BOX_SX_DARK,
  SECTION_BOX_SX_LIGHT,
  SECTION_HEADER_SX_DARK,
  SECTION_HEADER_SX_LIGHT,
} from './shared/glassSx';
import { LazyCardContent } from './shared/LazyCardContent';
import {
  HEALER_5PIECE_OPTIONS,
  HEALER_MONSTER_OPTIONS,
  AVAILABLE_ULTIMATES,
  getUltimateIcon,
  getHealerBuffIcon,
  isHealer5PieceSet,
  isFlexible5PieceSet,
} from './shared/rosterCardHelpers';
import { SlotActionPill } from './shared/slot-action-pill';
import { SlotFullModePanel } from './SlotFullModePanel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HealerCardProps {
  healerNum: number;
  healer: HealerSetup;
  onChange: (updates: Partial<HealerSetup>) => void;
  availableGroups: string[];
  usedBuffs: HealerBuff[];
  mode?: RosterDetailLevel;
  /** Saved roster ID — enables round-trip editing via the build editor. */
  savedRosterId?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const HealerCard = React.memo<HealerCardProps>(
  ({ healerNum, healer, onChange, availableGroups, usedBuffs, mode, savedRosterId }) => {
    const healerTheme = useTheme();
    const healerIsDark = healerTheme.palette.mode === 'dark';
    const healerRoleColors = healerIsDark ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;
    // Use precomputed stable object refs — prevents MUI sx from regenerating
    // emotion CSS classes on every render.
    const glassSx = healerIsDark ? GLASS_SX_DARK : GLASS_SX_LIGHT;
    const sectionBoxSx = healerIsDark ? SECTION_BOX_SX_DARK : SECTION_BOX_SX_LIGHT;
    const sectionHeaderSx = healerIsDark ? SECTION_HEADER_SX_DARK : SECTION_HEADER_SX_LIGHT;
    const availableBuffs = Object.values(HealerBuff).filter(
      (buff) => !usedBuffs.includes(buff) || healer.healerBuff === buff,
    );

    return (
      <Card
        variant="outlined"
        sx={{
          borderRadius: '12px',
          backgroundColor: healerIsDark
            ? `${healerRoleColors.healer}0a`
            : `${healerRoleColors.healer}06`,
          border: healerIsDark
            ? `1px solid ${healerRoleColors.healer}20`
            : `1px solid ${healerRoleColors.healer}18`,
          borderLeft: `3px solid ${healerRoleColors.healer}`,
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            borderColor: `${healerRoleColors.healer}35`,
            borderLeftColor: healerRoleColors.healer,
            boxShadow: `0 4px 16px ${healerRoleColors.healer}18, 0 2px 8px rgba(0,0,0,0.1)`,
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
              borderBottom: `1px solid ${healerRoleColors.healer}25`,
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
                backgroundColor: `${healerRoleColors.healer}18`,
                border: `1px solid ${healerRoleColors.healer}35`,
              }}
            >
              <FavoriteIcon sx={{ fontSize: '0.85rem', color: healerRoleColors.healer }} />
              <Typography
                sx={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: healerRoleColors.healer,
                  lineHeight: 1,
                }}
              >
                Healer {healerNum}
              </Typography>
            </Box>
            <SlotActionPill
              buildFactory={() => healerSlotToBuild(healer, healerNum)}
              color={healerRoleColors.healer}
              label={`Healer ${healerNum}`}
              slotKey={`healer${healerNum}`}
              rosterId={savedRosterId}
              buildRef={healer.buildRef}
            />
          </Box>
          <Stack spacing={1.5}>
            {/* Essential Fields - Always Visible */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Player Name"
                  value={healer.playerName || ''}
                  onChange={(e) => onChange({ playerName: e.target.value })}
                  placeholder="Enter player name"
                  sx={glassSx}
                />
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={[...availableGroups].sort()}
                  value={healer.groups?.[0] ?? healer.group?.groupName ?? ''}
                  onChange={(_, value) =>
                    onChange({
                      groups: value ? [value] : undefined,
                      group: undefined,
                    })
                  }
                  renderInput={(params) => (
                    <TextField {...params} size="small" label="Group" sx={glassSx} />
                  )}
                />
              </Box>
            </Box>

            {/* Equipment — lazy-mounted to avoid MUI Autocomplete forced reflows */}
            <LazyCardContent>
              <Box
                sx={{
                  p: 1.25,
                  borderRadius: '10px',
                  backgroundColor: healerIsDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                  border: healerIsDark
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
                    color: healerIsDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
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
                        options={HEALER_5PIECE_OPTIONS}
                        value={healer.set1 ? getSetDisplayName(healer.set1) : ''}
                        onChange={(_, value) =>
                          onChange({ set1: value ? findSetIdByName(value) : undefined })
                        }
                        groupBy={(option) => {
                          const setId = findSetIdByName(option);
                          if (setId && isHealer5PieceSet(setId)) return 'Healer Sets';
                          if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                          return 'Other';
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Primary Set (Body)"
                            placeholder="e.g., Stone-Talker's Oath"
                            sx={glassSx}
                          />
                        )}
                        renderOption={(props, option) => <li {...props}>{option}</li>}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={HEALER_5PIECE_OPTIONS}
                        value={healer.set2 ? getSetDisplayName(healer.set2) : ''}
                        onChange={(_, value) =>
                          onChange({ set2: value ? findSetIdByName(value) : undefined })
                        }
                        groupBy={(option) => {
                          const setId = findSetIdByName(option);
                          if (setId && isHealer5PieceSet(setId)) return 'Healer Sets';
                          if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                          return 'Other';
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Secondary Set (Jewelry)"
                            placeholder="e.g., Worm's Raiment"
                            sx={glassSx}
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
                        options={HEALER_MONSTER_OPTIONS}
                        value={healer.monsterSet ? getSetDisplayName(healer.monsterSet) : ''}
                        onChange={(_, value) =>
                          onChange({
                            monsterSet: value ? findSetIdByName(value) : undefined,
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
                          />
                        )}
                        renderOption={(props, option) => <li {...props}>{option}</li>}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                      <FormControl
                        fullWidth
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            backgroundColor: healerIsDark
                              ? 'rgba(255,255,255,0.03)'
                              : 'rgba(0,0,0,0.02)',
                            '& fieldset': {
                              borderColor: healerIsDark
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(0,0,0,0.12)',
                            },
                            '&:hover fieldset': {
                              borderColor: healerIsDark
                                ? 'rgba(255,255,255,0.15)'
                                : 'rgba(0,0,0,0.2)',
                            },
                          },
                        }}
                      >
                        <InputLabel id={`healer-cp-label-${healerNum}`}>Champion Points</InputLabel>
                        <Select
                          labelId={`healer-cp-label-${healerNum}`}
                          value={healer.healerBuff || ''}
                          onChange={(e) =>
                            onChange({
                              healerBuff: (e.target.value as HealerBuff) || null,
                            })
                          }
                          label="Champion Points"
                          renderValue={(value) => (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getHealerBuffIcon(value)}
                              {value || <em>None</em>}
                            </Box>
                          )}
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {availableBuffs.map((buff) => (
                            <MenuItem key={buff} value={buff}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {getHealerBuffIcon(buff)}
                                {buff}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={AVAILABLE_ULTIMATES}
                        value={healer.ultimate || null}
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
                    healer.set1 ? getSetDisplayName(healer.set1) : undefined,
                    healer.set2 ? getSetDisplayName(healer.set2) : undefined,
                    healer.monsterSet ? getSetDisplayName(healer.monsterSet) : undefined,
                    ...(healer.additionalSets || []).map((id) => getSetDisplayName(id)),
                  ].filter((s): s is string => s !== undefined),
                  healer.ultimate,
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
                  backgroundColor: healerIsDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.008)',
                  border: healerIsDark
                    ? `1px solid ${healerRoleColors.healer}15`
                    : `1px solid ${healerRoleColors.healer}12`,
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0, marginTop: 2 },
                  transition: 'border-color 0.2s ease',
                  '&:hover': {
                    borderColor: healerIsDark
                      ? `${healerRoleColors.healer}28`
                      : `${healerRoleColors.healer}20`,
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={
                    <ExpandMoreIcon
                      sx={{
                        fontSize: 18,
                        color: healerIsDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                      }}
                    />
                  }
                  sx={{ px: 1.5, minHeight: 40, '&.Mui-expanded': { minHeight: 40 } }}
                >
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      letterSpacing: 0.5,
                      color: healerIsDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                    }}
                  >
                    Advanced Options
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 1.5, pt: 1, pb: 1.5 }}>
                  <Stack spacing={1.5}>
                    {/* ── Assignment ─────────────────────────── */}
                    <Box sx={sectionBoxSx}>
                      <Typography sx={sectionHeaderSx}>Assignment</Typography>
                      <Stack spacing={1.25}>
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                          <Box sx={{ flex: '1 1 40%', minWidth: 140 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Role Label"
                              placeholder={`H${healerNum}`}
                              value={healer.roleLabel || ''}
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
                              value={healer.playerNumber || ''}
                              onChange={(e) =>
                                onChange({
                                  playerNumber: e.target.value || undefined,
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
                              value={healer.labels || []}
                              onChange={(_, value) => onChange({ labels: value })}
                              renderValue={(value, getItemProps) =>
                                (value as string[]).map((option, index) => (
                                  <Chip
                                    {...getItemProps({ index })}
                                    key={option}
                                    label={option}
                                    size="small"
                                    sx={{
                                      borderRadius: '6px',
                                      backgroundColor: healerIsDark
                                        ? 'rgba(255,255,255,0.06)'
                                        : 'rgba(0,0,0,0.05)',
                                      border: healerIsDark
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
                          placeholder="e.g., Main healer, ramp healing, shield uptime focus"
                          value={healer.roleNotes || ''}
                          onChange={(e) => onChange({ roleNotes: e.target.value })}
                          sx={glassSx}
                        />
                      </Stack>
                    </Box>

                    {/* Build Requirements (gear + skill lines) moved to SlotFullModePanel */}

                    {/* ── Notes ──────────────────────────────── */}
                    <Box sx={sectionBoxSx}>
                      <Typography sx={sectionHeaderSx}>Notes</Typography>
                      <TextField
                        fullWidth
                        multiline
                        size="small"
                        minRows={2}
                        maxRows={6}
                        placeholder="General notes, fight-specific instructions, etc."
                        value={healer.notes || ''}
                        onChange={(e) => onChange({ notes: e.target.value })}
                        sx={glassSx}
                      />
                    </Box>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </LazyCardContent>

            {mode === 'full' && (
              <SlotFullModePanel
                gear={healer.gear}
                skillLines={healer.skillLines}
                skills={healer.skills}
                cpPoints={healer.cpPoints}
                food={healer.food}
                passives={healer.passives}
                onGearChange={(gear) => onChange({ gear })}
                onSkillLinesChange={(skillLines) => onChange({ skillLines })}
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
  },
);
HealerCard.displayName = 'HealerCard';
