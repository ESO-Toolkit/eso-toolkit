import { Shield as ShieldIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
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
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import { TankSetup, RosterDetailLevel, validateCompatibility } from '../../types/roster';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../../utils/roleColors';
import { tankSlotToBuild } from '../../utils/rosterSlotToBuild';
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
  TANK_5PIECE_OPTIONS,
  TANK_MONSTER_OPTIONS,
  AVAILABLE_ULTIMATES,
  getUltimateIcon,
  isTank5PieceSet,
  isFlexible5PieceSet,
} from './shared/rosterCardHelpers';
import { SlotActionPill } from './shared/slot-action-pill';
import { SlotFullModePanel } from './SlotFullModePanel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TankCardProps {
  tankNum: number;
  tank: TankSetup;
  onChange: (updates: Partial<TankSetup>) => void;
  availableGroups: string[];
  mode?: RosterDetailLevel;
  /** Saved roster ID — enables round-trip editing via the build editor. */
  savedRosterId?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TankCard = React.memo<TankCardProps>(
  ({ tankNum, tank, onChange, availableGroups, mode, savedRosterId }) => {
    const tankTheme = useTheme();
    const tankIsDark = tankTheme.palette.mode === 'dark';
    const tankRoleColors = tankIsDark ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;
    // Use precomputed stable object refs — prevents MUI sx from regenerating
    // emotion CSS classes on every render.
    const glassSx = tankIsDark ? GLASS_SX_DARK : GLASS_SX_LIGHT;
    const sectionBoxSx = tankIsDark ? SECTION_BOX_SX_DARK : SECTION_BOX_SX_LIGHT;
    const sectionHeaderSx = tankIsDark ? SECTION_HEADER_SX_DARK : SECTION_HEADER_SX_LIGHT;

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
            <SlotActionPill
              buildFactory={() => tankSlotToBuild(tank, tankNum)}
              color={tankRoleColors.tank}
              label={`Tank ${tankNum}`}
              slotKey={`tank${tankNum}`}
              rosterId={savedRosterId}
              buildRef={tank.buildRef}
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
                  value={tank.groups?.[0] ?? tank.group?.groupName ?? ''}
                  onChange={(_, value) =>
                    onChange({
                      groups: value ? [value] : undefined,
                      group: undefined,
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

            {/* Equipment — lazy-mounted to avoid MUI Autocomplete forced reflows */}
            <LazyCardContent>
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
                    color: tankIsDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
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
                          tank.gearSets.monsterSet
                            ? getSetDisplayName(tank.gearSets.monsterSet)
                            : ''
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
                          />
                        )}
                        renderOption={(props, option) => <li {...props}>{option}</li>}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={AVAILABLE_ULTIMATES}
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
                    tank.gearSets.monsterSet
                      ? getSetDisplayName(tank.gearSets.monsterSet)
                      : undefined,
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
                  backgroundColor: tankIsDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.008)',
                  border: tankIsDark
                    ? `1px solid ${tankRoleColors.tank}15`
                    : `1px solid ${tankRoleColors.tank}12`,
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0, marginTop: 2 },
                  transition: 'border-color 0.2s ease',
                  '&:hover': {
                    borderColor: tankIsDark
                      ? `${tankRoleColors.tank}28`
                      : `${tankRoleColors.tank}20`,
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={
                    <ExpandMoreIcon
                      sx={{
                        fontSize: 18,
                        color: tankIsDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
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
                      color: tankIsDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
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
                              value={tank.labels || []}
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
                        value={tank.notes || ''}
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
                gear={tank.gear}
                skillLines={tank.skillLines}
                skills={tank.skills}
                cpPoints={tank.cpPoints}
                food={tank.food}
                passives={tank.passives}
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
TankCard.displayName = 'TankCard';
