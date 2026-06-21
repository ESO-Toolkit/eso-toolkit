/**
 * Scribing Simulator container.
 *
 * Live grimoire + script planner: pick a grimoire, choose its compatible Focus /
 * Signature / Affix scripts, and see a faithful preview of the resulting scribed
 * skill update instantly. Selection is shareable via the URL.
 */

import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import React from 'react';

import { useLogger } from '@/contexts/LoggerContext';

import { SCRIBING_SYSTEM } from '../../data/scribingMetadata';
import { useScribingSimulation } from '../hooks/useScribingSimulation';

import {
  GrimoireGrid,
  ScribedSkillCard,
  ScriptSlotPicker,
  SimulatorControls,
} from './ScribingSimulatorComponents';

export interface ScribingSimulatorProps {
  className?: string;
  defaultGrimoire?: string;
  /** Unused; retained for API compatibility. */
  autoSimulate?: boolean;
}

const FACT_CHIPS = [
  '12 grimoires',
  '3 script slots each',
  '12,000+ combinations',
  SCRIBING_SYSTEM.scribingCost,
];

export const ScribingSimulator: React.FC<ScribingSimulatorProps> = ({
  className,
  defaultGrimoire,
}) => {
  const theme = useTheme();
  const logger = useLogger('ScribingSimulator');
  const {
    isLoading,
    error,
    isReady,
    grimoires,
    selection,
    selectedGrimoire,
    compatible,
    result,
    setGrimoire,
    setFocus,
    setSignature,
    setAffix,
    reset,
    randomize,
    shareUrl,
  } = useScribingSimulation({ defaultGrimoire });

  const [shareLabel, setShareLabel] = React.useState('Share build');

  React.useEffect(() => {
    document.title = 'Scribing Simulator | ESO Toolkit';
  }, []);

  const handleShare = React.useCallback((): void => {
    if (!shareUrl) return;
    void navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setShareLabel('Link copied!');
        logger.info('Scribing build URL copied', { shareUrl });
        window.setTimeout(() => setShareLabel('Share build'), 2000);
      })
      .catch((err: unknown) => {
        logger.warn('Failed to copy scribing build URL', {
          error: err instanceof Error ? err.message : String(err),
        });
        setShareLabel('Copy failed');
        window.setTimeout(() => setShareLabel('Share build'), 2000);
      });
  }, [shareUrl, logger]);

  if (isLoading) {
    return (
      <Container maxWidth="lg" className={className}>
        <Box
          role="status"
          aria-live="polite"
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, py: 10 }}
        >
          <CircularProgress aria-label="Loading scribing data" />
          <Typography variant="h6">Loading scribing data…</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" className={className}>
        <Alert severity="error" sx={{ mt: 4 }}>
          <Typography variant="h6">Failed to load scribing data</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Container>
    );
  }

  if (!isReady) {
    return (
      <Container maxWidth="lg" className={className}>
        <Alert severity="warning" sx={{ mt: 4 }}>
          <Typography variant="body1">Scribing data is not ready.</Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" className={className}>
      <Box sx={{ py: { xs: 3, md: 4 } }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }} gutterBottom>
            ESO Scribing Simulator
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 720, mx: 'auto' }}>
            {SCRIBING_SYSTEM.intro}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'center', flexWrap: 'wrap', gap: 1, mt: 2 }}
          >
            {FACT_CHIPS.map((fact) => (
              <Box
                key={fact}
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 5,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.divider, 0.6),
                  bgcolor: alpha(theme.palette.background.paper, 0.4),
                }}
              >
                {fact}
              </Box>
            ))}
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <SimulatorControls
            onRandomize={randomize}
            onReset={reset}
            onShare={handleShare}
            shareLabel={shareLabel}
          />
        </Box>

        {/* Body */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.2fr) minmax(0, 1fr)' },
            gap: 3,
            alignItems: 'start',
          }}
        >
          {/* Configuration */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                1 · Choose a grimoire
              </Typography>
              <GrimoireGrid
                grimoires={grimoires}
                selectedId={selection.grimoireId}
                onSelect={setGrimoire}
              />
              {selectedGrimoire?.acquisition && (
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: 'block', mt: 1 }}
                >
                  <strong>How to get it:</strong> {selectedGrimoire.acquisition}
                </Typography>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                2 · Slot your scripts
              </Typography>
              <Stack spacing={1.5}>
                <ScriptSlotPicker
                  slot="focus"
                  scripts={compatible.focusScripts}
                  selectedId={selection.focusId}
                  onSelect={setFocus}
                  disabled={!selection.grimoireId}
                />
                <ScriptSlotPicker
                  slot="signature"
                  scripts={compatible.signatureScripts}
                  selectedId={selection.signatureId}
                  onSelect={setSignature}
                  disabled={!selection.grimoireId}
                />
                <ScriptSlotPicker
                  slot="affix"
                  scripts={compatible.affixScripts}
                  selectedId={selection.affixId}
                  onSelect={setAffix}
                  disabled={!selection.grimoireId}
                />
              </Stack>
            </Box>
          </Box>

          {/* Preview */}
          <Box sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Your scribed skill
            </Typography>
            <ScribedSkillCard result={result} />
            <Typography
              variant="caption"
              sx={{ color: 'text.disabled', display: 'block', mt: 1.5, textAlign: 'center' }}
            >
              Effects verified against ESO-Hub &amp; UESP. Values scale with your character.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};
