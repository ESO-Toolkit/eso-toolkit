/**
 * Tank Card Component
 * Displays and allows editing of a single tank's configuration
 */

import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  TextField,
  Autocomplete,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Chip,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { DragIndicator as DragIndicatorIcon, Star as GearIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import React from 'react';

import { TankSetup, SupportUltimate, CLASS_SKILL_LINES } from '../../../types/roster';
import { KnownSetIDs, ALL_5PIECE_SETS, MONSTER_SETS } from '../../../types/abilities';
import {
  getSetDisplayName,
  findSetIdByName,
  isTank5PieceSet,
  isFlexible5PieceSet,
  isMonsterSet,
} from '../../../utils/setNameUtils';
import { getUltimateIcon, getSkillLineIcon } from '../../utils/iconHelpers';
import { validateTank } from '../utils/rosterValidation';

interface TankCardProps {
  tankNum: 1 | 2;
  tank: TankSetup;
  onChange: (updates: Partial<TankSetup>) => void;
  availableGroups: string[];
}

export const TankCard: React.FC<TankCardProps> = ({ tankNum, tank, onChange, availableGroups }) => {
  const availableUltimates = Object.values(SupportUltimate);

  const warnings = validateTank(tank, tankNum);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Tank {tankNum}
        </Typography>
        <Stack spacing={2}>
          {/* Essential Fields - Always Visible */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <TextField
                fullWidth
                label="Player Name"
                value={tank.playerName || ''}
                onChange={(e) => onChange({ playerName: e.target.value })}
                placeholder="Enter player name"
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 150 }}>
              <Autocomplete
                freeSolo
                options={[...availableGroups].sort()}
                value={tank.group?.groupName || ''}
                onChange={(_, value) =>
                  onChange({
                    group: value ? { groupName: value } : undefined,
                  })
                }
                renderInput={(params) => (
                  <TextField {...params} label="Group" placeholder="e.g., Left Stack" />
                )}
              />
            </Box>
          </Box>

          {/* Gear Sets */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Configure gear sets (5-piece sets + 2-piece monster/mythic)
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={[
                  ...Array.from(
                    new Set(
                      ALL_5PIECE_SETS.filter(isTank5PieceSet).map((id) => getSetDisplayName(id))
                    ),
                  ),
                  ...Array.from(
                    new Set(
                      ALL_5PIECE_SETS.filter(isFlexible5PieceSet).map((id) => getSetDisplayName(id))
                    ),
                  ),
                ].sort()}
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
                    label="Primary 5-Piece Set (Body)"
                    placeholder="e.g., Alkosh, Yolnahkriin"
                    helperText="Worn on body armor pieces (type custom set name if not listed)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                  />
                )}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={[
                  ...Array.from(
                    new Set(
                      ALL_5PIECE_SETS.filter(isTank5PieceSet).map((id) => getSetDisplayName(id))
                    ),
                  ),
                  ...Array.from(
                    new Set(
                      ALL_5PIECE_SETS.filter(isFlexible5PieceSet).map((id) => getSetDisplayName(id))
                    ),
                  ),
                ].sort()}
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
                    label="Secondary 5-Piece Set (Jewelry)"
                    placeholder="e.g., Crimson Oath's Rive"
                    helperText="Worn on jewelry + weapons (type custom set name if not listed)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                  />
                )}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={[
                  ...Array.from(
                    new Set(
                      ALL_5PIECE_SETS.filter(isMonsterSet).map((id) => getSetDisplayName(id))
                    ),
                  ),
                ].sort()}
                value={tank.gearSets.monsterSet ? getSetDisplayName(tank.gearSets.monsterSet) : ''}
                onChange={(_, value) =>
                  onChange({
                    gearSets: {
                      ...tank.gearSets,
                      monsterSet: value ? findSetIdByName(value) : undefined,
                    },
                  })
                }
                groupBy={(_option) => 'Monster Sets'}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="2-Piece Monster/Mythic Set"
                    placeholder="e.g., Symphony of Blades"
                    helperText="Head + shoulders, or 1-piece mythic (type custom set name if not listed)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                  />
                )}
              />
            </Box>
          </Box>

          <Autocomplete
            freeSolo
            options={availableUltimates}
            value={tank.ultimate || null}
            onChange={(_event, newValue) => onChange({ ultimate: newValue as string | null })}
            renderInput={(params) => (
              <TextField {...params} label="Ultimate" placeholder="Select or type custom ultimate" />
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

          {/* Compatibility Warnings */}
          {warnings.length > 0 && (
            <Stack spacing={1}>
              {warnings.map((warning, index) => (
                <Alert key={index} severity="warning" sx={{ py: 0.5 }}>
                  {warning.message}
                </Alert>
              ))}
            </Stack>
          )}

          {/* Advanced Options - Collapsible */}
          <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" color="text.secondary">
                Advanced Options
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {/* Role Label and Notes */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 30%', minWidth: 120 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role Label"
                      placeholder={tankNum === 1 ? 'MT' : 'OT'}
                      value={tank.roleLabel || ''}
                      onChange={(e) => onChange({ roleLabel: e.target.value })}
                      helperText="e.g., MT, OT"
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 65%', minWidth: 200 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role Notes"
                      placeholder="e.g., TOMB 1A, Portal Group"
                      value={tank.roleNotes || ''}
                      onChange={(e) => onChange({ roleNotes: e.target.value })}
                    />
                  </Box>
                </Box>

                {/* Player Labels/Tags */}
                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[]}
                  value={tank.labels || []}
                  onChange={(_, value) => onChange({ labels: value })}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...chipProps } = getTagProps({ index });
                      return <Chip {...chipProps} key={key} label={option} size="small" />;
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="Labels / Tags"
                      placeholder="Add custom labels"
                      helperText="Press Enter to add new label"
                    />
                  )}
                />

                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Player Number"
                  value={tank.playerNumber || ''}
                  onChange={(e) =>
                    onChange({
                      playerNumber: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  helperText="Optional identifier"
                />

                {/* Additional Sets */}
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
                    />
                  )}
                  renderOption={(props, option) => <li {...props}>{option}</li>}
                />

                {/* Skill Lines Section */}
                <Divider textAlign="left">
                  <Chip label="Skill Lines" size="small" />
                </Divider>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tank.skillLines.isFlex}
                      onChange={(e) =>
                        onChange({
                          skillLines: { ...tank.skillLines, isFlex: e.target.checked },
                        })
                      }
                    />
                  }
                  label="Flexible (any skill lines)"
                />
                {!tank.skillLines.isFlex && (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES].sort()}
                        value={tank.skillLines.line1}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...tank.skillLines, line1: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 1" />}
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
                            skillLines: { ...tank.skillLines, line2: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 2" />}
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
                            skillLines: { ...tank.skillLines, line3: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 3" />}
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
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...chipProps } = getTagProps({ index });
                      return <Chip label={option} {...chipProps} key={key} size="small" />;
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
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </CardContent>
    </Card>
  );
};
