import { Refresh as RefreshIcon, Share as ShareIcon } from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  Divider,
  Alert,
  Button,
  Stack,
} from '@mui/material';
import React, { useState, useMemo, useEffect } from 'react';

import scribingDataJson from '../../../../../data/scribing-complete.json';
import { ScribingData } from '../../types/scribing-schemas';
import { ScribingSimulator as SimulatorEngine } from '../../utils/scribingSimulator';

// Validate and type the imported JSON data
const validatedData = SimulatorEngine.validateData(scribingDataJson);
const scribingData: ScribingData = validatedData;

// Initialize the simulator engine
const simulator = new SimulatorEngine(scribingData);

interface ScribingSimulatorProps {
  className?: string;
}

export const ScribingSimulator: React.FC<ScribingSimulatorProps> = ({ className }) => {
  const [selectedGrimoire, setSelectedGrimoire] = useState<string>('trample');
  const [selectedFocus, setSelectedFocus] = useState<string>('physical-damage');
  const [selectedSignature, setSelectedSignature] = useState<string>('');
  const [selectedAffix, setSelectedAffix] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');

  // Get available options based on current selections
  const availableGrimoires = useMemo(() => {
    return Object.keys(scribingData.grimoires);
  }, []);

  const availableFocus = useMemo(() => {
    if (!selectedGrimoire) return [];
    const grimoire = scribingData.grimoires[selectedGrimoire];
    if (!grimoire) return [];

    const nameTransformations = (grimoire as { nameTransformations?: Record<string, unknown> })
      .nameTransformations;
    if (!nameTransformations) return [];

    // Return focus scripts that have transformations for this grimoire
    return Object.keys(nameTransformations);
  }, [selectedGrimoire]);

  const availableSignature = useMemo(() => {
    if (!selectedGrimoire || !scribingData.signatureScripts) return [];

    // Filter signature scripts that are compatible with the selected grimoire
    return Object.values(scribingData.signatureScripts)
      .filter((script) => script.compatibleGrimoires.includes(selectedGrimoire))
      .map((script) => script.id);
  }, [selectedGrimoire]);

  const availableAffix = useMemo(() => {
    if (!selectedGrimoire || !scribingData.affixScripts) return [];

    // Filter affix scripts that are compatible with the selected grimoire
    return Object.values(scribingData.affixScripts)
      .filter((script) => script.compatibleGrimoires.includes(selectedGrimoire))
      .map((script) => script.id);
  }, [selectedGrimoire]);

  // Clear focus selection if it becomes invalid for the selected grimoire
  useEffect(() => {
    if (selectedFocus && selectedGrimoire) {
      if (!availableFocus.includes(selectedFocus)) {
        setSelectedFocus('');
      }
    }
  }, [selectedGrimoire, selectedFocus, availableFocus]);

  // Clear signature selection if it becomes invalid for the selected grimoire
  useEffect(() => {
    if (selectedSignature && selectedGrimoire) {
      if (!availableSignature.includes(selectedSignature)) {
        setSelectedSignature('');
      }
    }
  }, [selectedGrimoire, selectedSignature, availableSignature]);

  // Clear affix selection if it becomes invalid for the selected grimoire
  useEffect(() => {
    if (selectedAffix && selectedGrimoire) {
      if (!availableAffix.includes(selectedAffix)) {
        setSelectedAffix('');
      }
    }
  }, [selectedGrimoire, selectedAffix, availableAffix]);

  // Calculate the resulting skill
  const calculatedSkill = useMemo(() => {
    if (!selectedGrimoire) return null;
    return simulator.calculateSkill(
      selectedGrimoire,
      selectedFocus || undefined,
      selectedSignature || undefined,
      selectedAffix || undefined,
    );
  }, [selectedGrimoire, selectedFocus, selectedSignature, selectedAffix]);

  const handleGrimoireChange = (grimoireId: string): void => {
    setSelectedGrimoire(grimoireId);

    // Check if current focus script is still compatible with new grimoire
    if (selectedFocus) {
      const newGrimoire = scribingData.grimoires[grimoireId];
      const nameTransformations = (newGrimoire as { nameTransformations?: Record<string, unknown> })
        .nameTransformations;

      // If the current focus script is not compatible with the new grimoire, reset it
      if (!nameTransformations || !nameTransformations[selectedFocus]) {
        setSelectedFocus('');
      }
    }

    // Check if current signature script is still compatible with new grimoire
    if (selectedSignature && scribingData.signatureScripts) {
      const signatureScript = scribingData.signatureScripts[selectedSignature];
      if (!signatureScript || !signatureScript.compatibleGrimoires.includes(grimoireId)) {
        setSelectedSignature('');
      }
    }

    // Check if current affix script is still compatible with new grimoire
    if (selectedAffix && scribingData.affixScripts) {
      const affixScript = scribingData.affixScripts[selectedAffix];
      if (!affixScript || !affixScript.compatibleGrimoires.includes(grimoireId)) {
        setSelectedAffix('');
      }
    }
  };

  const handleRandomCombination = (): void => {
    const randomGrimoire =
      availableGrimoires[Math.floor(Math.random() * availableGrimoires.length)];
    setSelectedGrimoire(randomGrimoire);

    // Get compatible focus scripts using nameTransformations
    const grimoire = scribingData.grimoires[randomGrimoire];
    const nameTransformations = (grimoire as { nameTransformations?: Record<string, unknown> })
      .nameTransformations;
    if (nameTransformations) {
      const compatibleFocus = Object.keys(nameTransformations);
      const randomFocus = compatibleFocus[Math.floor(Math.random() * compatibleFocus.length)];
      setSelectedFocus(randomFocus);
    } else {
      setSelectedFocus('');
    }

    // Set random signature script (now that we have them)
    setSelectedGrimoire(randomGrimoire); // Trigger compatibility recalculation
    setTimeout(() => {
      // Use timeout to ensure availableSignature is recalculated after grimoire change
      const availableSig = Object.values(scribingData.signatureScripts || {})
        .filter((script) => script.compatibleGrimoires.includes(randomGrimoire))
        .map((script) => script.id);

      if (availableSig.length > 0) {
        const randomSignature = availableSig[Math.floor(Math.random() * availableSig.length)];
        setSelectedSignature(randomSignature);
      } else {
        setSelectedSignature('');
      }
    }, 0);

    // Set random affix script (now that we have them)
    setTimeout(() => {
      // Use timeout to ensure availableAffix is recalculated after grimoire change
      const availableAff = Object.values(scribingData.affixScripts || {})
        .filter((script) => script.compatibleGrimoires.includes(randomGrimoire))
        .map((script) => script.id);

      if (availableAff.length > 0) {
        const randomAffix = availableAff[Math.floor(Math.random() * availableAff.length)];
        setSelectedAffix(randomAffix);
      } else {
        setSelectedAffix('');
      }
    }, 0);
  };

  const handleShareCombination = (): void => {
    const params = new URLSearchParams({
      g: selectedGrimoire,
      ...(selectedFocus && { f: selectedFocus }),
      ...(selectedSignature && { s: selectedSignature }),
      ...(selectedAffix && { a: selectedAffix }),
    });
    const url = `${window.location.origin}/scribing-simulator?${params.toString()}`;
    navigator.clipboard.writeText(url);
    setShareUrl(url);
  };

  return (
    <Box className={className}>
      <Typography variant="h4" gutterBottom>
        ESO Scribing Simulator
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Experiment with different script combinations to see their effects
      </Typography>

      <Stack spacing={3} sx={{ mt: 3 }}>
        {/* Controls */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRandomCombination}
          >
            Random Combination
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ShareIcon />}
            onClick={handleShareCombination}
          >
            Share Combination
          </Button>
        </Stack>

        {/* Selection and Result in side-by-side layout */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {/* Script Selection Panel */}
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Script Selection
              </Typography>

              <Stack spacing={3}>
                {/* Grimoire Selection */}
                <FormControl fullWidth>
                  <InputLabel>Grimoire (Base Skill)</InputLabel>
                  <Select
                    value={selectedGrimoire}
                    onChange={(e) => handleGrimoireChange(e.target.value)}
                    label="Grimoire (Base Skill)"
                  >
                    {availableGrimoires.map((id) => {
                      const grimoire =
                        scribingData.grimoires[id as keyof typeof scribingData.grimoires];
                      return (
                        <MenuItem key={id} value={id}>
                          {grimoire.name} ({grimoire.school || 'Unknown'})
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                {/* Focus Script Selection */}
                <FormControl fullWidth disabled={!selectedGrimoire}>
                  <InputLabel>Focus Script</InputLabel>
                  <Select
                    value={availableFocus.includes(selectedFocus) ? selectedFocus : ''}
                    onChange={(e) => setSelectedFocus(e.target.value)}
                    label="Focus Script"
                  >
                    <MenuItem value="">None</MenuItem>
                    {availableFocus.map((id) => {
                      const script =
                        scribingData.focusScripts[id as keyof typeof scribingData.focusScripts];
                      return (
                        <MenuItem key={id} value={id}>
                          {script?.name || id}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                {/* Signature Script Selection */}
                <FormControl fullWidth disabled={!selectedGrimoire}>
                  <InputLabel>Signature Script</InputLabel>
                  <Select
                    value={availableSignature.includes(selectedSignature) ? selectedSignature : ''}
                    onChange={(e) => setSelectedSignature(e.target.value)}
                    label="Signature Script"
                  >
                    <MenuItem value="">None</MenuItem>
                    {availableSignature.map((id) => {
                      const script =
                        scribingData.signatureScripts?.[
                          id as keyof typeof scribingData.signatureScripts
                        ];
                      return (
                        <MenuItem key={id} value={id}>
                          {script?.name}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                {/* Affix Script Selection */}
                <FormControl fullWidth disabled={!selectedGrimoire}>
                  <InputLabel>Affix Script</InputLabel>
                  <Select
                    value={availableAffix.includes(selectedAffix) ? selectedAffix : ''}
                    onChange={(e) => setSelectedAffix(e.target.value)}
                    label="Affix Script"
                  >
                    <MenuItem value="">None</MenuItem>
                    {availableAffix.map((id) => {
                      const script =
                        scribingData.affixScripts?.[id as keyof typeof scribingData.affixScripts];
                      return (
                        <MenuItem key={id} value={id}>
                          {script?.name}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                <Alert severity="success">
                  Complete ESO Scribing Database: 12 Grimoires, 21 Focus Scripts, 20 Signature
                  Scripts, 26 Affix Scripts
                </Alert>
              </Stack>
            </CardContent>
          </Card>

          {/* Result Display Panel */}
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Calculated Skill
              </Typography>

              {calculatedSkill ? (
                <Stack spacing={2}>
                  <Typography variant="h5">{calculatedSkill.name}</Typography>

                  {/* Ability IDs - show if available */}
                  {calculatedSkill.abilityIds && calculatedSkill.abilityIds.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                        Ability IDs:
                      </Typography>
                      {calculatedSkill.abilityIds.map((id) => (
                        <Chip
                          key={id}
                          label={id}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      ))}
                    </Stack>
                  )}

                  {/* Properties Grid */}
                  <Stack direction="row" spacing={2}>
                    {/* Cost - only show if valid */}
                    {calculatedSkill.properties.cost && !isNaN(calculatedSkill.properties.cost) && (
                      <Paper sx={{ p: 2, textAlign: 'center', flex: 1 }}>
                        <Typography variant="h6" color="primary">
                          {calculatedSkill.properties.cost}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {calculatedSkill.properties.resource
                            ? calculatedSkill.properties.resource.charAt(0).toUpperCase() +
                              calculatedSkill.properties.resource.slice(1)
                            : 'Cost'}
                        </Typography>
                      </Paper>
                    )}
                    {/* Cast Time - only show if valid */}
                    {calculatedSkill.properties.castTime &&
                      !isNaN(calculatedSkill.properties.castTime) && (
                        <Paper sx={{ p: 2, textAlign: 'center', flex: 1 }}>
                          <Typography variant="h6" color="primary">
                            {calculatedSkill.properties.castTime}s
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Cast Time
                          </Typography>
                        </Paper>
                      )}
                    {/* Instant cast time display */}
                    {(String(calculatedSkill.properties.castTime) === 'instant' ||
                      calculatedSkill.properties.castTime === 0) && (
                      <Paper sx={{ p: 2, textAlign: 'center', flex: 1 }}>
                        <Typography variant="h6" color="primary">
                          Instant
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Cast Time
                        </Typography>
                      </Paper>
                    )}
                  </Stack>

                  {/* Primary Effect - only show if we have valid values */}
                  {((calculatedSkill.properties.damage &&
                    !isNaN(calculatedSkill.properties.damage)) ||
                    (calculatedSkill.properties.shield &&
                      !isNaN(calculatedSkill.properties.shield)) ||
                    (calculatedSkill.properties.healing &&
                      !isNaN(calculatedSkill.properties.healing)) ||
                    (calculatedSkill.properties.mitigationPercent !== undefined &&
                      !isNaN(calculatedSkill.properties.mitigationPercent)) ||
                    (calculatedSkill.properties.dispelCount !== undefined &&
                      !isNaN(calculatedSkill.properties.dispelCount))) && (
                    <Stack direction="row" spacing={2}>
                      <Paper sx={{ p: 2, textAlign: 'center', flex: 1 }}>
                        <Typography variant="h6" color="primary">
                          {(() => {
                            if (
                              calculatedSkill.properties.shield &&
                              !isNaN(calculatedSkill.properties.shield)
                            ) {
                              return calculatedSkill.properties.shield;
                            }
                            if (
                              calculatedSkill.properties.healing &&
                              !isNaN(calculatedSkill.properties.healing)
                            ) {
                              return calculatedSkill.properties.healing;
                            }
                            if (
                              calculatedSkill.properties.mitigationPercent !== undefined &&
                              !isNaN(calculatedSkill.properties.mitigationPercent)
                            ) {
                              return `${calculatedSkill.properties.mitigationPercent}%`;
                            }
                            if (
                              calculatedSkill.properties.dispelCount !== undefined &&
                              !isNaN(calculatedSkill.properties.dispelCount)
                            ) {
                              return calculatedSkill.properties.dispelCount;
                            }
                            if (
                              calculatedSkill.properties.damage &&
                              !isNaN(calculatedSkill.properties.damage)
                            ) {
                              return calculatedSkill.properties.damage;
                            }
                            return 'Unknown';
                          })()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {calculatedSkill.properties.shield &&
                          !isNaN(calculatedSkill.properties.shield)
                            ? 'Damage Shield'
                            : calculatedSkill.properties.healing &&
                                !isNaN(calculatedSkill.properties.healing)
                              ? 'Healing'
                              : calculatedSkill.properties.mitigationPercent !== undefined &&
                                  !isNaN(calculatedSkill.properties.mitigationPercent)
                                ? 'Damage Reduction'
                                : calculatedSkill.properties.dispelCount !== undefined &&
                                    !isNaN(calculatedSkill.properties.dispelCount)
                                  ? 'Effects Removed'
                                  : (calculatedSkill.properties.damageType
                                      ? calculatedSkill.properties.damageType
                                          .charAt(0)
                                          .toUpperCase() +
                                        calculatedSkill.properties.damageType.slice(1)
                                      : 'Unknown') + ' Damage'}
                        </Typography>
                      </Paper>
                      {/* Radius - only show if valid and > 0 */}
                      {calculatedSkill.properties.radius &&
                        !isNaN(calculatedSkill.properties.radius) &&
                        calculatedSkill.properties.radius > 0 && (
                          <Paper sx={{ p: 2, textAlign: 'center', flex: 1 }}>
                            <Typography variant="h6" color="primary">
                              {calculatedSkill.properties.radius}m
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Radius
                            </Typography>
                          </Paper>
                        )}
                    </Stack>
                  )}

                  {calculatedSkill.effects && calculatedSkill.effects.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Effects:
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                        {calculatedSkill.effects.map((effect: string, index: number) => (
                          <Chip key={index} label={effect} size="small" color="secondary" />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  <Divider />

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Skill Tooltip:
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-line',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                        }}
                      >
                        {calculatedSkill.tooltip}
                      </Typography>
                    </Paper>
                  </Box>
                </Stack>
              ) : (
                <Alert severity="info">
                  Select a grimoire to see the calculated skill properties
                </Alert>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Stack>

      {shareUrl && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setShareUrl('')}>
          Combination URL copied to clipboard: {shareUrl}
        </Alert>
      )}
    </Box>
  );
};
