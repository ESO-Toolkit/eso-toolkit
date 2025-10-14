/**
 * Smart component - ScribingSimulator container
 * Handles business logic and state management
 */

import { Container, Box, Typography, Alert, CircularProgress } from '@mui/material';
import React from 'react';

import { useScribingSimulation } from '../hooks/useScribingSimulation';

import {
  ScriptSelector,
  SimulationResultDisplay,
  SimulationControls,
} from './ScribingSimulatorComponents';

export interface ScribingSimulatorProps {
  className?: string;
  defaultGrimoire?: string;
  autoSimulate?: boolean;
}

export const ScribingSimulator: React.FC<ScribingSimulatorProps> = ({
  className,
  defaultGrimoire,
  autoSimulate = false,
}) => {
  const {
    // Data
    grimoires,
    availableFocusScripts,
    availableSignatureScripts,
    availableAffixScripts,

    // Current selection
    selectedGrimoire,
    selectedFocusScript,
    selectedSignatureScript,
    selectedAffixScript,

    // Selection methods
    setSelectedGrimoire,
    setSelectedFocusScript,
    setSelectedSignatureScript,
    setSelectedAffixScript,

    // Simulation
    simulationResult,
    isSimulating,
    simulationError,
    simulate,

    // State
    isLoading,
    error,
    isReady,
  } = useScribingSimulation({
    defaultGrimoire,
    autoSimulate,
  });

  const handleShare = (): void => {
    if (!selectedGrimoire) return;

    const params = new URLSearchParams();
    params.set('grimoire', selectedGrimoire);
    if (selectedFocusScript) params.set('focus', selectedFocusScript);
    if (selectedSignatureScript) params.set('signature', selectedSignatureScript);
    if (selectedAffixScript) params.set('affix', selectedAffixScript);

    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl);

    // TODO: Show toast notification
    // eslint-disable-next-line no-console
    console.log('Configuration URL copied to clipboard');
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" className={className}>
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Loading scribing data...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" className={className}>
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="h6">Failed to Load Scribing Data</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Container>
    );
  }

  if (!isReady) {
    return (
      <Container maxWidth="xl" className={className}>
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body1">Scribing data is not ready</Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" className={className}>
      <Box py={4}>
        <Typography variant="h4" component="h1" gutterBottom textAlign="center">
          ESO Scribing Simulator
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" paragraph>
          Design and simulate custom scribing combinations for Elder Scrolls Online
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mt: 2 }}>
          {/* Configuration Panel */}
          <Box sx={{ flex: 1 }}>
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography variant="h6" gutterBottom>
                Script Configuration
              </Typography>

              {/* Grimoire Selection */}
              <ScriptSelector
                label="Grimoire"
                value={selectedGrimoire}
                options={grimoires.map((g) => ({
                  id: g.id,
                  name: g.name,
                  description: g.description,
                }))}
                onChange={setSelectedGrimoire}
                error={!selectedGrimoire ? 'Please select a grimoire' : undefined}
              />

              {/* Focus Script Selection */}
              <ScriptSelector
                label="Focus Script"
                value={selectedFocusScript}
                options={availableFocusScripts.map((s) => ({
                  id: s.id,
                  name: s.name,
                  description: s.description,
                }))}
                onChange={setSelectedFocusScript}
                disabled={!selectedGrimoire}
              />

              {/* Signature Script Selection */}
              <ScriptSelector
                label="Signature Script"
                value={selectedSignatureScript}
                options={availableSignatureScripts.map((s) => ({
                  id: s.id,
                  name: s.name,
                  description: s.description,
                }))}
                onChange={setSelectedSignatureScript}
                disabled={!selectedGrimoire}
              />

              {/* Affix Script Selection */}
              <ScriptSelector
                label="Affix Script"
                value={selectedAffixScript}
                options={availableAffixScripts.map((s) => ({
                  id: s.id,
                  name: s.name,
                  description: s.description,
                }))}
                onChange={setSelectedAffixScript}
                disabled={!selectedGrimoire}
              />

              {/* Simulation Controls */}
              <SimulationControls
                onSimulate={simulate}
                onShare={handleShare}
                isSimulating={isSimulating}
                disabled={!selectedGrimoire}
              />
            </Box>
          </Box>

          {/* Results Panel */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              Simulation Results
            </Typography>

            <SimulationResultDisplay
              result={simulationResult}
              isSimulating={isSimulating}
              error={simulationError}
            />
          </Box>
        </Box>
      </Box>
    </Container>
  );
};
