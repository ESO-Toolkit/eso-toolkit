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
import type { RaidRoster } from '@/types/roster';
import type { SlotKey } from '@/utils/slotKey';
import { makeSlotKey, getSlotFromRoster } from '@/utils/slotKey';

import { snapshotBuildToSlot } from '../../../utils/rosterBuildBridge';
import type { Build } from '../types/build.types';

// ─── Slot definitions ────────────────────────────────────────────────────────

interface SlotDef {
  key: SlotKey;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  roleGroup: 'tank' | 'healer' | 'dps';
}

/** Generate SLOTS dynamically from a roster's composition */
function buildSlotDefs(roster: RaidRoster): SlotDef[] {
  const slots: SlotDef[] = [];

  // Tanks
  for (let i = 0; i < roster.composition.tanks; i++) {
    const label = i === 0 ? 'Main Tank' : i === 1 ? 'Off Tank' : `Tank ${i + 1}`;
    const shortLabel = i === 0 ? 'MT' : i === 1 ? 'OT' : `T${i + 1}`;
    slots.push({
      key: makeSlotKey('tank', i),
      label,
      shortLabel,
      icon: <TankIcon />,
      roleGroup: 'tank',
    });
  }

  // Healers
  for (let i = 0; i < roster.composition.healers; i++) {
    slots.push({
      key: makeSlotKey('healer', i),
      label: `Healer ${i + 1}`,
      shortLabel: `H${i + 1}`,
      icon: <HealerIcon />,
      roleGroup: 'healer',
    });
  }

  // DPS
  for (let i = 0; i < roster.composition.dps; i++) {
    slots.push({
      key: makeSlotKey('dps', i),
      label: `DPS Slot ${i + 1}`,
      shortLabel: `DD${i + 1}`,
      icon: <DpsIcon />,
      roleGroup: 'dps',
    });
  }

  return slots;
}

// Fallback SLOTS for when no roster is selected (default 2/2/8 composition)
const DEFAULT_SLOTS: SlotDef[] = buildSlotDefs({
  composition: { tanks: 2, healers: 2, dps: 8 },
  tanks: [],
  healers: [],
  dpsSlots: [],
} as unknown as RaidRoster);

// ─── Helper to get the existing buildRef for a slot ──────────────────────────

function getSlotInfo(
  roster: RaidRoster,
  slotKey: SlotKey,
): { buildName?: string; playerName?: string } {
  const slot = getSlotFromRoster(roster, slotKey);
  return {
    buildName: slot?.buildRef?.buildName,
    playerName: slot?.playerName,
  };
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
  const [showAllSlots, setShowAllSlots] = React.useState(false);

  // Reset only when dialog opens (not on every savedRosters change)
  const prevOpen = React.useRef(false);
  React.useEffect(() => {
    if (open && !prevOpen.current) {
      setSelectedRosterId(savedRosters[0]?.id ?? '');
      setSelectedSlot(null);
      setSelectedSetupIndex(0);
      setShowAllSlots(false);
    }
    prevOpen.current = open;
  }, [open, savedRosters]);

  // Guard: clamp setupIndex if setups array is shorter than expected
  const safeSetupIndex =
    build.setups.length > 0 ? Math.min(selectedSetupIndex, build.setups.length - 1) : 0;

  // Map build.role → which slot group to show
  const roleGroup: 'tank' | 'healer' | 'dps' =
    build.role === 'tank' ? 'tank' : build.role === 'healer' ? 'healer' : 'dps';

  const selectedRoster = savedRosters.find((r) => r.id === selectedRosterId);

  // Build SLOTS dynamically from the selected roster's composition
  const SLOTS = React.useMemo(
    () => (selectedRoster ? buildSlotDefs(selectedRoster.roster) : DEFAULT_SLOTS),
    [selectedRoster],
  );

  const visibleSlots = showAllSlots ? SLOTS : SLOTS.filter((s) => s.roleGroup === roleGroup);

  const handleAttach = (): void => {
    if (!selectedRosterId || !selectedSlot || !selectedRoster) return;
    if (build.setups.length === 0) {
      enqueueSnackbar('This build has no setups to attach.', { variant: 'warning' });
      return;
    }

    dispatch(
      attachBuildToSlot({
        rosterId: selectedRosterId,
        slotKey: selectedSlot,
        buildRef: {
          buildId: build.id,
          setupIndex: safeSetupIndex,
          buildName: build.name || 'Untitled Build',
          esoClass: build.esoClass,
          role: build.role,
        },
        inlineData: snapshotBuildToSlot(build, safeSetupIndex),
      }),
    );

    const slotLabel = SLOTS.find((s) => s.key === selectedSlot)?.label ?? selectedSlot;
    enqueueSnackbar(
      `"${build.name || 'Build'}" attached to ${slotLabel} in "${selectedRoster.roster.rosterName}"`,
      { variant: 'success' },
    );
    onClose();
  };

  const handleDetach = (): void => {
    if (!selectedRosterId || !selectedSlot || !selectedRoster) return;

    dispatch(
      attachBuildToSlot({
        rosterId: selectedRosterId,
        slotKey: selectedSlot,
        buildRef: null,
      }),
    );

    const slotLabel = SLOTS.find((s) => s.key === selectedSlot)?.label ?? selectedSlot;
    enqueueSnackbar(`Build removed from ${slotLabel}`, { variant: 'info' });
    setSelectedSlot(null);
  };

  const selectedSlotHasBuild =
    selectedSlot && selectedRoster
      ? !!getSlotInfo(selectedRoster.roster, selectedSlot).buildName
      : false;

  // Shared dialog paper styles (glass-dialog pattern)
  const paperSx = {
    background: isDark
      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: isDark ? '1px solid #1f2937' : '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.25)' : '0 4px 12px rgba(15,23,42,0.06)',
    maxHeight: '90vh',
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
        className="glass-dialog"
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      className="glass-dialog"
      PaperProps={{ sx: paperSx }}
    >
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
            <InputLabel sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontSize: 13 }}>
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
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1.5,
              }}
            >
              <Typography
                sx={{
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
              <ButtonBase
                onClick={() => setShowAllSlots((prev) => !prev)}
                sx={{
                  fontSize: 11,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  fontWeight: 600,
                  color: showAllSlots ? 'var(--be-accent, #38bdf8)' : 'text.disabled',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  '&:hover': { color: 'var(--be-accent, #38bdf8)' },
                }}
              >
                {showAllSlots ? 'Show matching only' : 'Show all slots'}
              </ButtonBase>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {visibleSlots.map((slot) => {
                const info = selectedRoster
                  ? getSlotInfo(selectedRoster.roster, slot.key)
                  : { buildName: undefined, playerName: undefined };
                const isSelected = selectedSlot === slot.key;
                const isOtherRole = slot.roleGroup !== roleGroup;

                return (
                  <Tooltip
                    key={slot.key}
                    title={
                      info.buildName
                        ? `Currently: "${info.buildName}"${info.playerName ? ` (${info.playerName})` : ''} — click to replace`
                        : `Attach to ${slot.label}${info.playerName ? ` (${info.playerName})` : ''}`
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
                        opacity: isOtherRole ? 0.5 : 1,
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        '&:hover': {
                          borderColor: 'var(--be-accent, #38bdf8)',
                          background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.07)',
                          opacity: 1,
                        },
                        '&:focus-visible': {
                          outline: '2px solid var(--be-accent, #38bdf8)',
                          outlineOffset: 2,
                        },
                      }}
                    >
                      {/* Green dot when a build is already attached */}
                      {info.buildName && (
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
                      {info.playerName && (
                        <Typography
                          sx={{
                            fontSize: 8,
                            fontFamily: 'Space Grotesk, Inter, system-ui',
                            color: 'text.disabled',
                            lineHeight: 1,
                            maxWidth: 54,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {info.playerName}
                        </Typography>
                      )}
                    </ButtonBase>
                  </Tooltip>
                );
              })}
            </Box>
          </Box>

          {/* ── Setup picker — only when multiple setups ── */}
          {build.setups.length > 1 && (
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontSize: 13 }}>
                Setup
              </InputLabel>
              <Select
                value={safeSetupIndex}
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
                background: isDark ? 'rgba(34, 197, 94, 0.06)' : 'rgba(5, 150, 105, 0.06)',
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
                  ? ` · ${build.setups[safeSetupIndex]?.name || `Setup ${safeSetupIndex + 1}`}`
                  : ''}{' '}
                will be attached to{' '}
                <strong>{SLOTS.find((s) => s.key === selectedSlot)?.label}</strong> in{' '}
                <strong>&ldquo;{selectedRoster?.roster.rosterName}&rdquo;</strong>
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" size="small" sx={cancelBtnSx}>
          Cancel
        </Button>
        {selectedSlotHasBuild && (
          <Button
            variant="outlined"
            size="small"
            onClick={handleDetach}
            sx={{
              borderRadius: '99px',
              textTransform: 'none',
              fontSize: 13,
              fontWeight: 600,
              borderColor: isDark ? 'rgba(239,68,68,0.4)' : 'rgba(220,38,38,0.3)',
              color: isDark ? '#f87171' : '#dc2626',
              '&:hover': {
                borderColor: isDark ? 'rgba(239,68,68,0.6)' : 'rgba(220,38,38,0.5)',
                background: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(220,38,38,0.04)',
              },
            }}
          >
            Detach
          </Button>
        )}
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
          {selectedSlotHasBuild ? 'Replace' : 'Attach to Roster'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
