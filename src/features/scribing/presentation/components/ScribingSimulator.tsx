/**
 * Scribing Simulator container — "The Inscription Bench".
 *
 * A two-zone arcane workspace: the left bench is where you choose a grimoire and
 * slot its compatible Focus / Signature / Affix script-runes; the right altar is
 * where the resulting scribed skill materialises as a faithful in-game tooltip,
 * updating instantly. Selection is shareable via the URL.
 */

import { Verified as VerifiedIcon, PlaceOutlined as AltarIcon } from '@mui/icons-material';
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

import type { ScribingSlot } from '../../application/scribingEngine';
import { useScribingSimulation } from '../hooks/useScribingSimulation';

import {
  BuildUtilityRail,
  GrimoireGrid,
  InscriptionProgress,
  PrimaryScribeAction,
  RuneTriadLegend,
  ScribedSkillCard,
  ScriptSlotPicker,
} from './ScribingSimulatorComponents';
import { glassPanelSx } from './scribingStyles';

export interface ScribingSimulatorProps {
  className?: string;
  defaultGrimoire?: string;
  /** Unused; retained for API compatibility. */
  autoSimulate?: boolean;
}

const NO_SLOTS: Record<ScribingSlot, boolean> = { focus: false, signature: false, affix: false };

/** A numbered step header for the bench sections. */
const StepHeader: React.FC<{ n: number; title: string; hint?: string }> = ({ n, title, hint }) => {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.25 }}>
      <Box
        aria-hidden
        sx={{
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: '8px',
          display: 'grid',
          placeItems: 'center',
          fontSize: '0.8rem',
          fontWeight: 800,
          fontFamily: 'Space Grotesk, Inter, system-ui',
          color: theme.palette.primary.main,
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.4),
          bgcolor: alpha(theme.palette.primary.main, dark ? 0.14 : 0.08),
        }}
      >
        {n}
      </Box>
      <Box>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, lineHeight: 1.1, fontFamily: 'Space Grotesk, Inter, system-ui' }}
        >
          {title}
        </Typography>
        {hint && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {hint}
          </Typography>
        )}
      </Box>
    </Stack>
  );
};

export const ScribingSimulator: React.FC<ScribingSimulatorProps> = ({
  className,
  defaultGrimoire,
}) => {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
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

  const filledSlots = React.useMemo<Record<ScribingSlot, boolean>>(() => {
    if (!result) return NO_SLOTS;
    const filled = { ...NO_SLOTS };
    for (const e of result.effects) filled[e.slot] = true;
    return filled;
  }, [result]);

  // Single-open accordion state for the script pickers on mobile (the pickers
  // only honour this below md). Focus opens first; selecting a script never
  // auto-advances — the user drives expansion.
  const [openSlot, setOpenSlot] = React.useState<ScribingSlot | null>('focus');
  const toggleSlot = React.useCallback((slot: ScribingSlot) => {
    setOpenSlot((prev) => (prev === slot ? null : slot));
  }, []);

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
      {/* `u-tab-enter` fades the bench in once scribing data is ready, matching
          the Ultimate calculator's entrance. Applied to the ready-state content
          (not the outer Container) so the real UI animates when it appears,
          rather than the loading spinner. */}
      <Box className="u-tab-enter" sx={{ py: { xs: 2, md: 3 } }}>
        {/* ── Build controls — slot legend + primary action & utility rail ── */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: { xs: 'flex-start', md: 'space-between' },
            gap: 2,
            mb: { xs: 2.5, md: 3 },
          }}
        >
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <RuneTriadLegend />
          </Box>
          <Stack
            direction="row"
            spacing={1.25}
            sx={{ alignItems: 'center', width: { xs: '100%', md: 'auto' } }}
          >
            <PrimaryScribeAction onRandomize={randomize} sx={{ flexGrow: { xs: 1, md: 0 } }} />
            <BuildUtilityRail onReset={reset} onShare={handleShare} shareLabel={shareLabel} />
          </Stack>
        </Box>

        {/* ── Bench + Altar ────────────────────────────────────────── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.18fr) minmax(0, 1fr)' },
            gap: { xs: 2.5, md: 3 },
            alignItems: 'start',
          }}
        >
          {/* Bench */}
          <Box sx={{ ...glassPanelSx(theme), p: { xs: 2, md: 2.5 } }}>
            <StepHeader n={1} title="Choose a grimoire" hint="The base skill you'll inscribe" />
            <GrimoireGrid
              grimoires={grimoires}
              selectedId={selection.grimoireId}
              onSelect={setGrimoire}
            />
            {selectedGrimoire?.acquisition && (
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.25,
                  display: 'flex',
                  gap: 1,
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.25),
                  bgcolor: alpha(theme.palette.primary.main, dark ? 0.06 : 0.04),
                }}
              >
                <AltarIcon sx={{ fontSize: 16, color: 'primary.main', mt: '2px', flexShrink: 0 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  <Box component="strong" sx={{ color: 'text.primary' }}>
                    How to get it:{' '}
                  </Box>
                  {selectedGrimoire.acquisition}
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 3 }}>
              <StepHeader n={2} title="Slot your scripts" hint="Focus · Signature · Affix" />
              <Stack spacing={1.5}>
                <ScriptSlotPicker
                  slot="focus"
                  scripts={compatible.focusScripts}
                  selectedId={selection.focusId}
                  onSelect={setFocus}
                  disabled={!selection.grimoireId}
                  expanded={openSlot === 'focus'}
                  onToggleExpanded={() => toggleSlot('focus')}
                />
                <ScriptSlotPicker
                  slot="signature"
                  scripts={compatible.signatureScripts}
                  selectedId={selection.signatureId}
                  onSelect={setSignature}
                  disabled={!selection.grimoireId}
                  expanded={openSlot === 'signature'}
                  onToggleExpanded={() => toggleSlot('signature')}
                />
                <ScriptSlotPicker
                  slot="affix"
                  scripts={compatible.affixScripts}
                  selectedId={selection.affixId}
                  onSelect={setAffix}
                  disabled={!selection.grimoireId}
                  expanded={openSlot === 'affix'}
                  onToggleExpanded={() => toggleSlot('affix')}
                />
              </Stack>
            </Box>
          </Box>

          {/* Altar */}
          <Box sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>
            <Stack
              direction="row"
              sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, fontFamily: 'Space Grotesk, Inter, system-ui' }}
              >
                Your scribed skill
              </Typography>
              <InscriptionProgress filled={filledSlots} />
            </Stack>
            <ScribedSkillCard result={result} />
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ alignItems: 'center', justifyContent: 'center', mt: 1.5 }}
            >
              <VerifiedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center' }}>
                Effects verified against UESP &amp; official ESO release notes. Values scale with
                your character.
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};
