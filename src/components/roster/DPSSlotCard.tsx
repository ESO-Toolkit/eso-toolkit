import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AutoAwesome as AutoAwesomeIcon,
  DragIndicator as DragIndicatorIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback } from 'react';

import { DPSSlot, JailDDType, RosterDetailLevel, SupportUltimate } from '../../types/roster';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../../utils/roleColors';
import { dpsSlotToBuild } from '../../utils/rosterSlotToBuild';
import { getSetDisplayName, findSetIdByName } from '../../utils/setNameUtils';

import { ExtraGearPicker } from './shared/extra-gear-picker';
import { makeGlassSx, makeSectionBoxSx, makeSectionHeaderSx } from './shared/glassSx';
import { LazyCardContent } from './shared/LazyCardContent';
import {
  DPS_5PIECE_OPTIONS,
  DPS_MONSTER_OPTIONS,
  getUltimateIcon,
  isDDSpecialSet,
} from './shared/rosterCardHelpers';
import { SkillLinePickerGroup } from './shared/skill-line-picker';
import { SlotActionPill } from './shared/slot-action-pill';
import { SlotFullModePanel } from './SlotFullModePanel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DPSSlotCardProps {
  slot: DPSSlot;
  slotIndex: number;
  availableGroups: string[];
  onSlotChange: (slotIndex: number, updates: Partial<DPSSlot>) => void;
  onConvertToJail: (slotNumber: number, jailType: JailDDType) => void;
  onConvertToDPS: (slotNumber: number) => void;
  mode?: RosterDetailLevel;
  /** Saved roster ID — enables round-trip editing via the build editor. */
  savedRosterId?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Common DPS champion point options (Warfare tree, ordered by usage frequency)
const DPS_CHAMPION_POINT_OPTIONS = [
  'Force of Nature',
  'Deadly Aim',
  'Fighting Finesse',
  'Exploiter',
  'Master-at-Arms',
  'Weapons Expert',
  'Thaumaturge',
  'Biting Aura',
  'Arcane Supremacy',
  'Occult Overload',
  'Wrathful Strikes',
  'Resilience',
];

const jailLabels: Record<string, string> = {
  banner: 'Banner',
  zenkosh: 'Zenkosh',
  wm: 'WM',
  'wm-mk': 'WM/MK',
  mk: 'MK',
  custom: 'Custom',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DPSSlotCard = React.memo<DPSSlotCardProps>(
  ({
    slot,
    slotIndex,
    availableGroups,
    onSlotChange,
    onConvertToJail,
    onConvertToDPS,
    mode,
    savedRosterId,
  }) => {
    const onChange = useCallback(
      (updates: Partial<DPSSlot>) => onSlotChange(slotIndex, updates),
      [onSlotChange, slotIndex],
    );
    const dpsTheme = useTheme();
    const dpsIsDark = dpsTheme.palette.mode === 'dark';
    const dpsRoleColors = dpsIsDark ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;
    const glassSx = makeGlassSx(dpsIsDark);
    const availableUltimates = Object.values(SupportUltimate);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: slot.slotNumber,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const getJailDDTitle = (type: JailDDType): string => {
      switch (type) {
        case 'banner':
          return 'Banner Jail DD';
        case 'zenkosh':
          return 'Zenkosh Jail DD';
        case 'wm':
          return 'War Machine Jail DD';
        case 'wm-mk':
          return 'WM/MK Jail DD';
        case 'mk':
          return 'Martial Knowledge Jail DD';
        case 'custom':
          return slot.customDescription || 'Custom Jail DD';
        default:
          return 'Jail DD';
      }
    };

    return (
      <Card
        ref={setNodeRef}
        style={style}
        variant="outlined"
        sx={{
          borderRadius: '12px',
          backgroundColor: dpsIsDark ? `${dpsRoleColors.dps}0a` : `${dpsRoleColors.dps}06`,
          border: dpsIsDark
            ? `1px solid ${dpsRoleColors.dps}20`
            : `1px solid ${dpsRoleColors.dps}18`,
          borderLeft: `3px solid ${dpsRoleColors.dps}`,
          cursor: isDragging ? 'grabbing' : 'default',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease',
          '&:hover': {
            transform: isDragging ? 'none' : 'translateY(-1px)',
            borderColor: `${dpsRoleColors.dps}35`,
            borderLeftColor: dpsRoleColors.dps,
            boxShadow: isDragging
              ? 'none'
              : `0 4px 16px ${dpsRoleColors.dps}18, 0 2px 8px rgba(0,0,0,0.1)`,
          },
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1,
              pb: 1,
              borderBottom: `1px solid ${dpsRoleColors.dps}25`,
            }}
          >
            <IconButton
              size="small"
              {...attributes}
              {...listeners}
              sx={{
                cursor: 'grab',
                borderRadius: '6px',
                backgroundColor: dpsIsDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                color: dpsIsDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)',
              }}
              aria-label={`Drag to reorder DPS ${slot.slotNumber}`}
            >
              <DragIndicatorIcon />
            </IconButton>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.875,
                py: 0.4,
                borderRadius: '6px',
                backgroundColor: `${dpsRoleColors.dps}18`,
                border: `1px solid ${dpsRoleColors.dps}35`,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: '0.85rem', color: dpsRoleColors.dps }} />
              <Typography
                sx={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: dpsRoleColors.dps,
                  lineHeight: 1,
                }}
              >
                DPS {slot.slotNumber}
              </Typography>
            </Box>
            {slot.jailDDType && (
              <Chip
                label={getJailDDTitle(slot.jailDDType)}
                size="small"
                sx={{
                  borderRadius: '6px',
                  backgroundColor: `${dpsRoleColors.dps}18`,
                  border: `1px solid ${dpsRoleColors.dps}35`,
                  color: dpsRoleColors.dps,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
            )}
            <SlotActionPill
              buildFactory={() => dpsSlotToBuild(slot)}
              color={dpsRoleColors.dps}
              label={`DPS ${slot.slotNumber}`}
              slotKey={`dps${slot.slotNumber}`}
              rosterId={savedRosterId}
              buildRef={slot.buildRef}
            />
          </Box>
          <Stack spacing={1.5}>
            {/* Essential Fields - Always Visible */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Player Name (Optional)"
                  value={slot.playerName || ''}
                  onChange={(e) => onChange({ playerName: e.target.value })}
                  sx={glassSx}
                />
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[...availableGroups].sort()}
                  value={slot.groups ?? []}
                  onChange={(_, value) =>
                    onChange({ groups: value.length > 0 ? value : undefined })
                  }
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option}
                        label={option}
                        size="small"
                        sx={{
                          borderRadius: '6px',
                          backgroundColor: dpsIsDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.05)',
                          border: dpsIsDark
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
                      label="Groups"
                      placeholder="Add groups"
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
                  backgroundColor: dpsIsDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                  border: dpsIsDark
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
                    color: dpsIsDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
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
                        options={DPS_5PIECE_OPTIONS}
                        value={slot.set1 ? getSetDisplayName(slot.set1) : ''}
                        onChange={(_, value) =>
                          onChange({ set1: value ? findSetIdByName(value) : undefined })
                        }
                        groupBy={(option) => {
                          const setId = findSetIdByName(option);
                          if (setId && isDDSpecialSet(setId)) return 'DD Special Sets';
                          return 'Other Sets';
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Primary Set (Body)"
                            placeholder="e.g., Roar of Alkosh"
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
                        options={DPS_5PIECE_OPTIONS}
                        value={slot.set2 ? getSetDisplayName(slot.set2) : ''}
                        onChange={(_, value) =>
                          onChange({ set2: value ? findSetIdByName(value) : undefined })
                        }
                        groupBy={(option) => {
                          const setId = findSetIdByName(option);
                          if (setId && isDDSpecialSet(setId)) return 'DD Special Sets';
                          return 'Other Sets';
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Secondary Set (Jewelry)"
                            placeholder="e.g., Way of Martial Knowledge"
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
                        options={DPS_MONSTER_OPTIONS}
                        value={slot.monsterSet ? getSetDisplayName(slot.monsterSet) : ''}
                        onChange={(_, value) =>
                          onChange({
                            monsterSet: value ? findSetIdByName(value) : undefined,
                          })
                        }
                        groupBy={() => 'Monster Sets'}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Monster/Mythic Set"
                            placeholder="e.g., Zaan"
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
                        options={DPS_CHAMPION_POINT_OPTIONS}
                        value={slot.championPoint || null}
                        onChange={(_event, newValue) =>
                          onChange({ championPoint: newValue as string | null })
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Champion Points"
                            placeholder="e.g., Fighting Finesse"
                            sx={glassSx}
                          />
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={availableUltimates}
                        value={slot.ultimate || null}
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

              {/* Jail DD Type Selector */}
              {!slot.jailDDType ? (
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      mb: 0.75,
                      display: 'block',
                      color: dpsIsDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                    }}
                  >
                    Convert to Jail DD:
                  </Typography>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      flexWrap: 'wrap',
                      gap: '1px',
                      borderRadius: '10px',
                      padding: '3px',
                      backgroundColor: dpsIsDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: dpsIsDark
                        ? '1px solid rgba(255,255,255,0.06)'
                        : '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    {(['banner', 'zenkosh', 'wm', 'wm-mk', 'mk', 'custom'] as const).map((type) => (
                      <Box
                        key={type}
                        component={'button' as React.ElementType}
                        onClick={() => onConvertToJail(slot.slotNumber, type)}
                        sx={{
                          px: 1.25,
                          py: 0.5,
                          borderRadius: '7px',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: '0.72rem',
                          fontWeight: 500,
                          color: dpsIsDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                          background: 'transparent',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            color: dpsRoleColors.dps,
                            background: dpsIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                          },
                        }}
                      >
                        {jailLabels[type]}
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Box
                    component={'button' as React.ElementType}
                    onClick={() => onConvertToDPS(slot.slotNumber)}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: 1.5,
                      py: 0.625,
                      borderRadius: '8px',
                      border: dpsIsDark
                        ? '1px solid rgba(255,255,255,0.08)'
                        : '1px solid rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: dpsIsDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                      background: 'transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        color: dpsIsDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)',
                        background: dpsIsDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      },
                    }}
                  >
                    Convert Back to Regular DPS
                  </Box>
                </Box>
              )}

              {/* Advanced Options - Collapsible */}
              <Accordion
                elevation={0}
                disableGutters
                sx={{
                  mt: 2,
                  borderRadius: '10px !important',
                  backgroundColor: dpsIsDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.008)',
                  border: dpsIsDark
                    ? `1px solid ${dpsRoleColors.dps}15`
                    : `1px solid ${dpsRoleColors.dps}12`,
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0, marginTop: 2 },
                  transition: 'border-color 0.2s ease',
                  '&:hover': {
                    borderColor: dpsIsDark ? `${dpsRoleColors.dps}28` : `${dpsRoleColors.dps}20`,
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={
                    <ExpandMoreIcon
                      sx={{
                        fontSize: 18,
                        color: dpsIsDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)',
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
                      color: dpsIsDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
                    }}
                  >
                    Advanced Options
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 1.5, pt: 1, pb: 1.5 }}>
                  <Stack spacing={1.5}>
                    {/* ── Assignment ─────────────────────────── */}
                    <Box sx={makeSectionBoxSx(dpsIsDark)}>
                      <Typography sx={makeSectionHeaderSx(dpsIsDark)}>Assignment</Typography>
                      <Stack spacing={1.25}>
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                          <Box sx={{ flex: '1 1 40%', minWidth: 140 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Role Label"
                              placeholder={`DD${slot.slotNumber}`}
                              value={slot.roleLabel || ''}
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
                              value={slot.playerNumber || ''}
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
                              value={slot.labels || []}
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
                                      backgroundColor: dpsIsDark
                                        ? 'rgba(255,255,255,0.06)'
                                        : 'rgba(0,0,0,0.05)',
                                      border: dpsIsDark
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
                          placeholder="e.g., Portal L, Z'en, Ele sus"
                          value={slot.roleNotes || ''}
                          onChange={(e) => onChange({ roleNotes: e.target.value })}
                          sx={glassSx}
                        />
                      </Stack>
                    </Box>

                    {/* ── Build Requirements ─────────────────── */}
                    <Box sx={makeSectionBoxSx(dpsIsDark)}>
                      <Typography sx={makeSectionHeaderSx(dpsIsDark)}>
                        Build Requirements
                      </Typography>
                      <Stack spacing={1.5}>
                        <ExtraGearPicker
                          value={slot.additionalSets || []}
                          onChange={(additionalSets) => onChange({ additionalSets })}
                        />
                        <SkillLinePickerGroup
                          value={
                            slot.skillLines ?? { line1: '', line2: '', line3: '', isFlex: true }
                          }
                          onChange={(skillLines) => onChange({ skillLines })}
                        />
                      </Stack>
                    </Box>

                    {/* ── Notes ──────────────────────────────── */}
                    <Box sx={makeSectionBoxSx(dpsIsDark)}>
                      <Typography sx={makeSectionHeaderSx(dpsIsDark)}>Notes</Typography>
                      <TextField
                        fullWidth
                        multiline
                        size="small"
                        minRows={2}
                        maxRows={6}
                        placeholder="General notes, fight-specific instructions, etc."
                        value={slot.notes || ''}
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
                skills={slot.skills}
                cpPoints={slot.cpPoints}
                food={slot.food}
                passives={slot.passives}
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
DPSSlotCard.displayName = 'DPSSlotCard';
