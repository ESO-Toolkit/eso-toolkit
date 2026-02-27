/**
 * Healer Card Component
 * Displays and allows editing of a single healer's configuration
 */

import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Chip,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { Star as GearIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import React from 'react';

import { HealerSetup, HealerBuff, SupportUltimate, HealerChampionPoint, CLASS_SKILL_LINES } from '../../../types/roster';
import { KnownSetIDs, ALL_5PIECE_SETS, MONSTER_SETS } from '../../../types/abilities';
import {
  getSetDisplayName,
  findSetIdByName,
  isHealer5PieceSet,
  isFlexible5PieceSet,
  isMonsterSet,
} from '../../../utils/setNameUtils';
import { getUltimateIcon, getHealerBuffIcon, getSkillLineIcon } from '../../utils/iconHelpers';
import { validateHealer } from '../utils/rosterValidation';

interface HealerCardProps {
  healerNum: 1 | 2;
  healer: HealerSetup;
  onChange: (updates: Partial<HealerSetup>) => void;
  availableGroups: string[];
  usedBuffs: HealerBuff[];
}

export const HealerCard: React.FC<HealerCardProps> = ({
  healerNum,
  healer,
  onChange,
  availableGroups,
  usedBuffs,
}) => {
  const availableBuffs = Object.values(HealerBuff).filter(
    (buff) => !usedBuffs.includes(buff) || healer.healerBuff === buff,
  );
  const availableUltimates = Object.values(SupportUltimate);

  const warnings = validateHealer(healer, healerNum);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Healer {healerNum}
        </Typography>
        <Stack spacing={2}>
          {/* Essential Fields - Always Visible */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <TextField
                fullWidth
                label="Player Name (Optional)"
                value={healer.playerName || ''}
                onChange={(e) => onChange({ playerName: e.target.value })}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={[...availableGroups].sort()}
                value={healer.group?.groupName || ''}
                onChange={(_, value) =>
                  onChange({
                    group: value ? { groupName: value } : undefined,
                  })
                }
                renderInput={(params) => <TextField {...params} label="Group" />}
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
                      ALL_5PIECE_SETS.filter(isHealer5PieceSet).map((id) => getSetDisplayName(id))
                    ),
                  ),
                  ...Array.from(
                    new Set(
                      ALL_5PIECE_SETS.filter(isFlexible5PieceSet).map((id) => getSetDisplayName(id))
                    ),
                  ),
                ].sort()}
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
                    label="Primary 5-Piece Set (Body)"
                    placeholder="e.g., Stone-Talker's Oath"
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
                      ALL_5PIECE_SETS.filter(isHealer5PieceSet).map((id) => getSetDisplayName(id))
                    ),
                  ),
                  ...Array.from(
                    new Set(
                      ALL_5PIECE_SETS.filter(isFlexible5PieceSet).map((id) => getSetDisplayName(id))
                    ),
                  ),
                ].sort()}
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
                    label="Secondary 5-Piece Set (Jewelry)"
                    placeholder="e.g., Worm's Raiment"
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
                value={healer.monsterSet ? getSetDisplayName(healer.monsterSet) : ''}
                onChange={(_, value) =>
                  onChange({ monsterSet: value ? findSetIdByName(value) : undefined })
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

          <FormControl fullWidth>
            <InputLabel>Champion Points</InputLabel>
            <Select
              value={healer.healerBuff || ''}
              onChange={(e) => onChange({ healerBuff: (e.target.value as HealerBuff) || null })}
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

          <Autocomplete
            freeSolo
            options={availableUltimates}
            value={healer.ultimate || null}
            onChange={(_event, newValue) => onChange({ ultimate: newValue as string | null })}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Ultimate"
                placeholder="Select or type custom ultimate"
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
                      placeholder={`H${healerNum}`}
                      value={healer.roleLabel || ''}
                      onChange={(e) => onChange({ roleLabel: e.target.value })}
                      helperText="e.g., H1, H2"
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 65%', minWidth: 200 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role Notes"
                      placeholder="e.g., TOMB HEALER, TOMB 1B"
                      value={healer.roleNotes || ''}
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
                  value={healer.labels || []}
                  onChange={(_, value) => onChange({ labels: value })}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
                    ))
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
                  value={healer.playerNumber || ''}
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
                  value={(healer.additionalSets || []).map((id) => getSetDisplayName(id))}
                  onChange={(_, value) =>
                    onChange({
                      additionalSets: value
                        .map((name) => findSetIdByName(name))
                        .filter((id): id is KnownSetIDs => id !== undefined),
                    })
                  }
                  groupBy={(option) => {
                    const setId = findSetIdByName(option);
                    if (setId && isHealer5PieceSet(setId)) return 'Healer Sets';
                    if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                    if (setId && isMonsterSet(setId)) return 'Monster Sets';
                    return 'Other';
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Additional Sets"
                      helperText="e.g., monster sets, mythics (type custom set name if not listed)"
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
                      checked={healer.skillLines.isFlex}
                      onChange={(e) =>
                        onChange({
                          skillLines: { ...healer.skillLines, isFlex: e.target.checked },
                        })
                      }
                    />
                  }
                  label="Flexible (any skill lines)"
                />
                {!healer.skillLines.isFlex && (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES].sort()}
                        value={healer.skillLines.line1}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...healer.skillLines, line1: value || '' },
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
                        value={healer.skillLines.line2}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...healer.skillLines, line2: value || '' },
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
                        value={healer.skillLines.line3}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...healer.skillLines, line3: value || '' },
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
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </CardContent>
    </Card>
  );
};
