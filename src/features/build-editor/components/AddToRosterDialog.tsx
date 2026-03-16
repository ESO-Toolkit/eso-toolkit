/**
 * AddToRosterDialog
 * Attach the current build (and a chosen setup) to a slot in a saved roster.
 * Opens from the "Roster" button in BuildCompletionHeader.
 */

import {
  Check as CheckIcon,
  Close as CloseIcon,
  FlashOn as DpsIcon,
  Favorite as HealerIcon,
  Groups as GroupsIcon,
  Shield as TankIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { attachBuildToSlot, selectSavedRosters } from '@/store/saved_rosters';

import type { Build } from '../types/build.types';

// ─── Slot definitions ────────────────────────────────────────────────────────

type SlotKey =
  | 'tank1'
  | 'tank2'
  | 'healer1'
  | 'healer2'
  | 'dps1'
  | 'dps2'
  | 'dps3'
  | 'dps4'
  | 'dps5'
  | 'dps6'
  | 'dps7'
  | 'dps8';

interface SlotDef {
  key: SlotKey;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  roleGroup: 'tank' | 'healer' | 'dps';
}

const SLOTS: SlotDef[] = [
  { key: 'tank1', label: 'Main Tank', shortLabel: 'MT', icon: <TankIcon />, roleGroup: 'tank' },
  { key: 'tank2', label: 'Off Tank', shortLabel: 'OT', icon: <TankIcon />, roleGroup: 'tank' },
  {
    key: 'healer1',
    label: 'Healer 1',
    shortLabel: 'H1',
    icon: <HealerIcon />,
    roleGroup: 'healer',
  },
  {
    key: 'healer2',
    label: 'Healer 2',
    shortLabel: 'H2',
    icon: <HealerIcon />,
    roleGroup: 'healer',
  },
  ...Array.from({ length: 8 }, (_, i) => ({
    key: `dps${i + 1}` as SlotKey,
    label: `DPS Slot ${i + 1}`,
    shortLabel: `DD${i + 1}`,
    icon: <DpsIcon />,
    roleGroup: 'dps' as const,
  })),
];

// ─── Helper to get the existing buildRef for a slot ──────────────────────────

function getExistingBuildName(
  roster: { tank1: { buildRef?: { buildName?: string } }; tank2: { buildRef?: { buildName?: string } }; healer1: { buildRef?: { buildName?: string } }; healer2: { buildRef?: { buildName?: string } }; dpsSlots: Array<{ buildRef?: { buildName?: string } }> },
  slotKey: SlotKey,
): string | undefined {
  if (slotKey === 'tank1') return roster.tank1.buildRef?.buildName;
  if (slotKey === 'tank2') return roster.tank2.buildRef?.buildName;
  if (slotKey === 'healer1') return roster.healer1.buildRef?.buildName;
  if (slotKey === 'healer2') return roster.healer2.buildRef?.buildName;
  if (slotKey.startsWith('dps')) {
    const idx = parseInt(slotKey.slice(3), 10) - 1;
    return roster.dpsSlots[idx]?.buildRef?.buildName;
  }
  return undefined;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  build: Build;
}

export const AddToRosterDialog: React.FC<Props> = ({ open, onClose, build }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const savedRosters = useSelector(selectSavedRosters);

  const [selectedRosterId, setSelectedRosterId] = React.useState('');
  const [selectedSlot, setSelectedSlot] = React.useState<SlotKey | null>(null);
  const [selectedSetupIndex, setSelectedSetupIndex] = React.useState(0);

  // Reset when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedRosterId(savedRosters[0]?.id ?? '');
      setSelectedSlot(null);
      setSelectedSetupIndex(0);
    }
  }, [open, savedRosters]);

  // Map build.role → which slot group to show
  const roleGroup: 'tank' | 'healer' | 'dps' =
    build.role === 'tank' ? 'tank' : build.role === 'healer' ? 'healer' : 'dps';

  const filteredSlots = SLOTS.filter((s) => s.roleGroup === roleGroup);

  const selectedRoster = savedRosters.find((r) => r.id === selectedRosterId);

  const handleAttach = (): void => {
    if (!selectedRosterId || !selectedSlot || !selectedRoster) return;

    dispatch(
      attachBuildToSlot({
        rosterId: selectedRosterId,
        slotKey: selectedSlot,
        buildRef: {
          buildId: build.id,
          setupIndex: selectedSetupIndex,
          buildName: build.name || 'Untitled Build',
          esoClass: build.esoClass,
          role: build.role,
        },
      }),
    );

    const slotLabel = SLOTS.find((s) => s.key === selectedSlot)?.label ?? selectedSlot;
    enqueueSnackbar(
      `"${build.name || 'Build'}" attached to ${slotLabel} in "${selectedRoster.roster.rosterName}"`,
      { variant: 'success' },
    );
    onClose();
  };

  // Shared dialog paper styles
  const paperSx = {
    background: isDark ? 'rgba(8, 14, 26, 0.97)' : 'rgba(248, 250, 252, 0.98)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 3,
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
  };

  const titleSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontFamily: 'Space Grotesk, Inter, system-ui',
    fontWeight: 700,
    fontSize: 16,
    pb: 1,
  };

  const cancelBtnSx = {
    borderRadius: '99px',
    textTransform: 'none' as const,
    fontSize: 13,
    fontWeight: 600,
    borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)',
    color: 'text.secondary',
  };

  // ── Empty state ──
  if (savedRosters.length === 0) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: paperSx }}
      >
        <DialogTitle sx={titleSx}>
          Add to Roster
          <IconButton onClick={onClose} size="small" aria-label="Close dialog">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <Divider sx={{ opacity: 0.4 }} />
        <DialogContent>
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <GroupsIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1.5 }} />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', mb: 0.5 }}
            >
              No saved rosters yet.
            </Typography>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontFamily: 'Space Grotesk, Inter, system-ui' }}
            >
              Create a roster in the Roster Builder first, then come back here.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} variant="outlined" size="small" sx={cancelBtnSx}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ── Main dialog ──
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: paperSx }}>
      <DialogTitle sx={titleSx}>
        Add to Roster
        <IconButton onClick={onClose} size="small" aria-label="Close dialog">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider sx={{ opacity: 0.4 }} />

      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={3}>
          {/* ── Roster picker ── */}
          <FormControl size="small" fullWidth>
            <InputLabel
              sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontSize: 13 }}
            >
              Roster
            </InputLabel>
            <Select
              value={selectedRosterId}
              label="Roster"
              onChange={(e) => {
                setSelectedRosterId(e.target.value);
                setSelectedSlot(null);
              }}
              sx={{
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontSize: 13,
                borderRadius: 2,
              }}
            >
              {savedRosters.map((sr) => (
                <MenuItem
                  key={sr.id}
                  value={sr.id}
                  sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontSize: 13 }}
                >
                  {sr.roster.rosterName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* ── Slot picker ── */}
          <Box>
            <Typography
              sx={{
                mb: 1.5,
                display: 'block',
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              Select Slot
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {filteredSlots.map((slot) => {
                const existingName = selectedRoster
                  ? getExistingBuildName(selectedRoster.roster, slot.key)
                  : undefined;
                const isSelected = selectedSlot === slot.key;

                return (
                  <Tooltip
                    key={slot.key}
                    title={
                      existingName
                        ? `Currently: "${existingName}" — click to replace`
                        : `Attach to ${slot.label}`
                    }
                  >
                    <ButtonBase
                      onClick={() => setSelectedSlot(slot.key)}
                      focusRipple
                      sx={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.4,
                        px: 1.5,
                        py: 1,
                        minWidth: 62,
                        borderRadius: 2,
                        border: isSelected
                          ? '1px solid var(--be-accent, #38bdf8)'
                          : `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                        background: isSelected
                          ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)'
                          : isDark
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        '&:hover': {
                          borderColor: 'var(--be-accent, #38bdf8)',
                          background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.07)',
                        },
                        '&:focus-visible': {
                          outline: '2px solid var(--be-accent, #38bdf8)',
                          outlineOffset: 2,
                        },
                      }}
                    >
                      {/* Green dot when a build is already attached */}
                      {existingName && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: '#22c55e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 6px rgba(34,197,94,0.4)',
                          }}
                        >
                          <CheckIcon sx={{ fontSize: 9, color: '#fff' }} />
                        </Box>
                      )}
                      <Box
                        sx={{
                          fontSize: 16,
                          color: isSelected ? 'var(--be-accent, #38bdf8)' : 'text.secondary',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {slot.icon}
                      </Box>
                      <Typography
                        sx={{
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: 'Space Grotesk, Inter, system-ui',
                          letterSpacing: 0.4,
                          color: isSelected ? 'var(--be-accent, #38bdf8)' : 'text.primary',
                          lineHeight: 1,
                        }}
                      >
                        {slot.shortLabel}
                      </Typography>
                    </ButtonBase>
                  </Tooltip>
                );
              })}
            </Box>
          </Box>

          {/* ── Setup picker — only when multiple setups ── */}
          {build.setups.length > 1 && (
            <FormControl size="small" fullWidth>
              <InputLabel
                sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontSize: 13 }}
              >
                Setup
              </InputLabel>
              <Select
                value={selectedSetupIndex}
                label="Setup"
                onChange={(e) => setSelectedSetupIndex(e.target.value as number)}
                sx={{
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  fontSize: 13,
                  borderRadius: 2,
                }}
              >
                {build.setups.map((setup, i) => (
                  <MenuItem
                    key={setup.id}
                    value={i}
                    sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontSize: 13 }}
                  >
                    {setup.name || `Setup ${i + 1}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* ── Attachment preview ── */}
          {selectedSlot && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                background: isDark
                  ? 'rgba(34, 197, 94, 0.06)'
                  : 'rgba(5, 150, 105, 0.06)',
                border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(5, 150, 105, 0.2)'}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  color: isDark ? '#4ade80' : '#059669',
                  lineHeight: 1.5,
                }}
              >
                <strong>{build.name || 'This build'}</strong>
                {build.setups.length > 1
                  ? ` · ${build.setups[selectedSetupIndex]?.name || `Setup ${selectedSetupIndex + 1}`}`
                  : ''}{' '}
                will be attached to{' '}
                <strong>{SLOTS.find((s) => s.key === selectedSlot)?.label}</strong> in{' '}
                <strong>"{selectedRoster?.roster.rosterName}"</strong>
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" size="small" sx={cancelBtnSx}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          disabled={!selectedRosterId || !selectedSlot}
          onClick={handleAttach}
          sx={{
            borderRadius: '99px',
            textTransform: 'none',
            fontSize: 13,
            fontWeight: 600,
            background:
              'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.9), rgba(var(--be-accent-rgb, 56, 189, 248), 0.7))',
            boxShadow: '0 0 12px rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)',
            color: isDark ? '#fff' : '#0b1220',
            '&:hover': {
              boxShadow: '0 0 18px rgba(var(--be-accent-rgb, 56, 189, 248), 0.35)',
            },
            '&.Mui-disabled': {
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              boxShadow: 'none',
            },
          }}
        >
          Attach to Roster
        </Button>
      </DialogActions>
    </Dialog>
  );
};
