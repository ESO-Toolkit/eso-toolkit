/**
 * Wizard's Wardrobe import-code panel.
 *
 * Renders one paste-in import code per setup (WW imports a single setup into a
 * single slot), each with a copy button, a character-count chip against the
 * in-game 1000-char limit, and a note for any gear slots that couldn't be encoded
 * (weapon slots / unknown sets) so the user knows to set those manually.
 */

import { ContentCopy, CheckCircleOutlined, WarningAmberOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useState } from 'react';

import { useLogger } from '@/hooks/useLogger';

import type { LoadoutSetup } from '../types/loadout.types';
import {
  loadoutSetupToWWTransfer,
  WW_TRANSFER_CHAR_LIMIT,
  type WWTransferResult,
} from '../utils/wizardWardrobeTransfer';

interface WizardWardrobeTransferPanelProps {
  setups: LoadoutSetup[];
}

const SLOT_NAMES: Record<number, string> = {
  0: 'Head',
  1: 'Necklace',
  2: 'Chest',
  3: 'Shoulders',
  4: 'Main Hand',
  5: 'Off Hand',
  6: 'Waist',
  8: 'Legs',
  9: 'Feet',
  11: 'Ring 1',
  12: 'Ring 2',
  16: 'Hands',
  20: 'Backup Main Hand',
  21: 'Backup Off Hand',
};

export const WizardWardrobeTransferPanel: React.FC<WizardWardrobeTransferPanelProps> = ({
  setups,
}) => {
  const logger = useLogger('WizardWardrobeTransferPanel');
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const encoded: WWTransferResult[] = React.useMemo(
    () => setups.map((setup) => loadoutSetupToWWTransfer(setup)),
    [setups],
  );

  const handleCopy = async (index: number, json: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(json);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 2000);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to copy Wizard’s Wardrobe import code', err);
    }
  };

  if (setups.length === 0) {
    return (
      <Alert severity="info" sx={{ borderRadius: '12px' }}>
        No setups to export. Add a setup first.
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Alert severity="info" sx={{ borderRadius: '12px' }}>
        <Typography variant="caption" component="div">
          <strong>In-game:</strong> open Wizard&apos;s Wardrobe, right-click a setup slot &rarr;{' '}
          <strong>Import</strong> &rarr; paste the code &rarr; <strong>Import</strong>. No file or{' '}
          <code>/reloadui</code> needed. WW equips items you already own that match each set and
          trait.
        </Typography>
      </Alert>

      {encoded.map((result, index) => {
        const setupName = setups[index]?.name?.trim() || `Setup ${index + 1}`;
        const unresolvedTitle = result.unresolvedSlots
          .map((u) => `${SLOT_NAMES[u.slot] ?? `Slot ${u.slot}`}: ${u.reason}`)
          .join('\n');
        return (
          <Paper
            key={index}
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '12px',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                {setupName}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip
                  size="small"
                  label={`${result.charCount} / ${WW_TRANSFER_CHAR_LIMIT}`}
                  color={result.overCharLimit ? 'error' : 'default'}
                  variant="outlined"
                />
                <Button
                  size="small"
                  startIcon={copiedIndex === index ? <CheckCircleOutlined /> : <ContentCopy />}
                  onClick={() => void handleCopy(index, result.json)}
                  variant="outlined"
                  color={copiedIndex === index ? 'success' : 'primary'}
                  sx={{ borderRadius: '16px', minWidth: 96 }}
                >
                  {copiedIndex === index ? 'Copied' : 'Copy'}
                </Button>
              </Stack>
            </Stack>

            <TextField
              multiline
              fullWidth
              maxRows={4}
              value={result.json}
              slotProps={{
                input: {
                  readOnly: true,
                  sx: { fontFamily: 'monospace', fontSize: '0.7rem', mt: 1 },
                },
              }}
            />

            {result.overCharLimit && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                This code exceeds the 1000-character in-game paste limit. Reduce the setup (fewer
                gear pieces or a shorter name) or set part of it manually.
              </Typography>
            )}

            {result.unresolvedSlots.length > 0 && (
              <Tooltip title={<Box sx={{ whiteSpace: 'pre-line' }}>{unresolvedTitle}</Box>}>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    mt: 1,
                    color: 'warning.main',
                    cursor: 'help',
                    width: 'fit-content',
                    alignItems: 'center',
                  }}
                >
                  <WarningAmberOutlined fontSize="small" />
                  <Typography variant="caption">
                    {result.unresolvedSlots.length} slot
                    {result.unresolvedSlots.length === 1 ? '' : 's'} to set manually in-game
                  </Typography>
                </Stack>
              </Tooltip>
            )}
          </Paper>
        );
      })}
    </Stack>
  );
};
