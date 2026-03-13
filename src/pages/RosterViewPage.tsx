/**
 * RosterViewPage — read-only, shareable view of a roster.
 *
 * Accessible only via a direct link: /rv?r=<encoded>
 * The encoded roster is the same compact format used by the RosterBuilderPage
 * so existing share links remain compatible.
 */

import {
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  Shield as ShieldIcon,
  Favorite as FavoriteIcon,
  AutoAwesome as DPSIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Skeleton,
  Snackbar,
  Alert,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';

import { RaidRoster, TankSetup, HealerSetup, DPSSlot, MONSTER_SETS } from '../types/roster';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../utils/roleColors';
import { decodeRosterFromURL } from '../utils/rosterEncoding';
import { getSetDisplayName } from '../utils/setNameUtils';

// ============================================================
// Local display helpers
// ============================================================

const formatGearSets = (
  sets: {
    set1?: import('../types/abilities').KnownSetIDs;
    set2?: import('../types/abilities').KnownSetIDs;
    monsterSet?: import('../types/abilities').KnownSetIDs;
    additionalSets?: import('../types/abilities').KnownSetIDs[];
  } | null,
): string[] => {
  if (!sets) return [];
  const five: string[] = [];
  const monster: string[] = [];

  const add = (id: import('../types/abilities').KnownSetIDs | undefined): void => {
    if (id == null) return;
    const name = getSetDisplayName(id);
    if (!name) return;
    if (MONSTER_SETS.includes(id)) monster.push(name);
    else five.push(name);
  };

  add(sets.set1);
  add(sets.set2);
  add(sets.monsterSet);
  sets.additionalSets?.forEach(add);

  return [...Array.from(new Set(five)).sort(), ...Array.from(new Set(monster))];
};

const formatSkillLines = (
  sl?: {
    line1?: string;
    line2?: string;
    line3?: string;
    isFlex?: boolean;
    notes?: string;
  } | null,
): string => {
  if (!sl) return '';
  if (sl.isFlex) return 'Flexible';
  return [sl.line1, sl.line2, sl.line3].filter(Boolean).join(' / ');
};

// ============================================================
// Individual role-card sub-components
// ============================================================

interface TankCardProps {
  tank: TankSetup;
  label: string;
  color: string;
  isDarkMode: boolean;
}

const TankCard: React.FC<TankCardProps> = ({ tank, label, color, isDarkMode }) => {
  const gearSets = formatGearSets(tank.gearSets);
  const skillLines = formatSkillLines(tank.skillLines);
  const hasContent =
    tank.playerName ||
    tank.roleNotes ||
    tank.labels?.length ||
    gearSets.length > 0 ||
    skillLines ||
    tank.ultimate ||
    tank.notes;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '14px',
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
        border: `1px solid ${color}30`,
        backdropFilter: 'blur(12px)',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Card header */}
      <Box
        sx={{
          px: 2,
          pt: 1.5,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${color}20`,
            border: `1px solid ${color}30`,
            flexShrink: 0,
          }}
        >
          <ShieldIcon sx={{ fontSize: '0.95rem', color }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              lineHeight: 1,
              mb: 0.25,
            }}
          >
            {label}
            {tank.roleNotes ? ` · ${tank.roleNotes}` : ''}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: '0.95rem',
              letterSpacing: '-0.01em',
              color: tank.playerName ? 'text.primary' : 'text.disabled',
              fontStyle: tank.playerName ? 'normal' : 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {tank.playerName || 'Unassigned'}
          </Typography>
        </Box>
        {tank.labels && tank.labels.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {tank.labels.map((lbl) => (
              <Chip
                key={lbl}
                label={lbl}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  background: `${color}18`,
                  color,
                  border: `1px solid ${color}30`,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Card body */}
      <Box sx={{ px: 2, py: 1.25 }}>
        {!hasContent && (
          <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled', fontStyle: 'italic' }}>
            Empty slot
          </Typography>
        )}

        {gearSets.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              Gear
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {gearSets.map((set) => (
                <Chip
                  key={set}
                  label={set}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.68rem',
                    fontWeight: 500,
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                    color: 'text.primary',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {skillLines && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              Skill Lines
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', fontWeight: 500 }}>
              {skillLines}
            </Typography>
          </Box>
        )}

        {tank.ultimate && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              Ultimate
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', fontWeight: 500 }}>
              {tank.ultimate}
            </Typography>
          </Box>
        )}

        {tank.notes && (
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              fontStyle: 'italic',
              mt: 0.5,
            }}
          >
            {tank.notes}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

interface HealerCardProps {
  healer: HealerSetup;
  label: string;
  color: string;
  isDarkMode: boolean;
}

const HealerCard: React.FC<HealerCardProps> = ({ healer, label, color, isDarkMode }) => {
  const gearSets = formatGearSets({
    set1: healer.set1,
    set2: healer.set2,
    monsterSet: healer.monsterSet,
    additionalSets: healer.additionalSets,
  });
  const skillLines = formatSkillLines(healer.skillLines);
  const hasContent =
    healer.playerName ||
    healer.roleNotes ||
    healer.labels?.length ||
    gearSets.length > 0 ||
    skillLines ||
    healer.ultimate ||
    healer.healerBuff ||
    healer.notes;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '14px',
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
        border: `1px solid ${color}30`,
        backdropFilter: 'blur(12px)',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Card header */}
      <Box
        sx={{
          px: 2,
          pt: 1.5,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${color}20`,
            border: `1px solid ${color}30`,
            flexShrink: 0,
          }}
        >
          <FavoriteIcon sx={{ fontSize: '0.95rem', color }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              lineHeight: 1,
              mb: 0.25,
            }}
          >
            {healer.roleLabel || label}
            {healer.roleNotes ? ` · ${healer.roleNotes}` : ''}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: '0.95rem',
              letterSpacing: '-0.01em',
              color: healer.playerName ? 'text.primary' : 'text.disabled',
              fontStyle: healer.playerName ? 'normal' : 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {healer.playerName || 'Unassigned'}
          </Typography>
        </Box>
        {healer.labels && healer.labels.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {healer.labels.map((lbl) => (
              <Chip
                key={lbl}
                label={lbl}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  background: `${color}18`,
                  color,
                  border: `1px solid ${color}30`,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Card body */}
      <Box sx={{ px: 2, py: 1.25 }}>
        {!hasContent && (
          <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled', fontStyle: 'italic' }}>
            Empty slot
          </Typography>
        )}

        {gearSets.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              Gear
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {gearSets.map((set) => (
                <Chip
                  key={set}
                  label={set}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.68rem',
                    fontWeight: 500,
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                    color: 'text.primary',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {healer.healerBuff && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              Buff
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', fontWeight: 500 }}>
              {healer.healerBuff}
            </Typography>
          </Box>
        )}

        {healer.championPoint && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              CP Slot
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', fontWeight: 500 }}>
              {healer.championPoint}
            </Typography>
          </Box>
        )}

        {skillLines && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              Skill Lines
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', fontWeight: 500 }}>
              {skillLines}
            </Typography>
          </Box>
        )}

        {healer.ultimate && (
          <Box sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.375,
              }}
            >
              Ultimate
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', fontWeight: 500 }}>
              {healer.ultimate}
            </Typography>
          </Box>
        )}

        {healer.notes && (
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              fontStyle: 'italic',
              mt: 0.5,
            }}
          >
            {healer.notes}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

interface DPSRowProps {
  slot: DPSSlot;
  color: string;
  isDarkMode: boolean;
}

const DPS_JAIL_LABELS: Record<string, string> = {
  banner: 'Banner',
  zenkosh: 'ZenKosh',
  wm: 'WM',
  'wm-mk': 'WM/MK',
  mk: 'MK',
  custom: 'Custom',
};

const DPSRow: React.FC<DPSRowProps> = ({ slot, color, isDarkMode }) => {
  const skillLines = formatSkillLines(slot.skillLines);
  const gearSets = slot.gearSets?.length
    ? formatGearSets({
        set1: slot.gearSets[0],
        set2: slot.gearSets[1],
        additionalSets: slot.gearSets.slice(2),
      })
    : [];

  const isEmpty = !slot.playerName && !slot.roleNotes && !slot.labels?.length;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        py: 1,
        px: 1.5,
        borderRadius: '10px',
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        '&:hover': {
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        },
      }}
    >
      {/* Slot number badge */}
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: '7px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: isEmpty ? 'transparent' : `${color}20`,
          border: `1px solid ${isEmpty ? (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') : `${color}30`}`,
          mt: 0.125,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: isEmpty ? 'text.disabled' : color,
            lineHeight: 1,
          }}
        >
          {slot.slotNumber}
        </Typography>
      </Box>

      {/* Main info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          {/* Jail DD type badge */}
          {slot.jailDDType && (
            <Chip
              label={
                slot.jailDDType === 'custom'
                  ? (slot.customDescription ?? 'Custom')
                  : DPS_JAIL_LABELS[slot.jailDDType]
              }
              size="small"
              sx={{
                height: 18,
                fontSize: '0.6rem',
                fontWeight: 700,
                background: `${color}20`,
                color,
                border: `1px solid ${color}35`,
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          )}

          {/* Player name */}
          <Typography
            sx={{
              fontSize: '0.82rem',
              fontWeight: slot.playerName ? 600 : 400,
              color: slot.playerName ? 'text.primary' : 'text.disabled',
              fontStyle: slot.playerName ? 'normal' : 'italic',
            }}
          >
            {slot.playerName || (isEmpty ? 'Empty' : '')}
          </Typography>

          {/* Role notes */}
          {slot.roleNotes && (
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              [{slot.roleNotes}]
            </Typography>
          )}

          {/* Labels */}
          {slot.labels?.map((lbl) => (
            <Chip
              key={lbl}
              label={lbl}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.6rem',
                fontWeight: 600,
                background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                color: 'text.secondary',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          ))}

          {/* Group */}
          {slot.group?.groupName && (
            <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', ml: 'auto' }}>
              {slot.group.groupName}
            </Typography>
          )}
        </Box>

        {/* Secondary info: skill lines, gear */}
        {(skillLines || gearSets.length > 0) && (
          <Box
            sx={{ mt: 0.375, display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}
          >
            {skillLines && (
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                {skillLines}
              </Typography>
            )}
            {slot.championPoint && (
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                CP: {slot.championPoint}
              </Typography>
            )}
            {gearSets.map((set) => (
              <Chip
                key={set}
                label={set}
                size="small"
                sx={{
                  height: 17,
                  fontSize: '0.62rem',
                  fontWeight: 500,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  color: 'text.secondary',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  '& .MuiChip-label': { px: 0.625 },
                }}
              />
            ))}
            {slot.notes && (
              <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', fontStyle: 'italic' }}>
                {slot.notes}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ============================================================
// Section label component
// ============================================================

const SectionLabel: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  isDarkMode: boolean;
}> = ({ icon, label, color, isDarkMode }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    <Box
      sx={{
        width: 26,
        height: 26,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `${color}20`,
        border: `1px solid ${color}30`,
      }}
    >
      {icon}
    </Box>
    <Typography
      sx={{
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
      }}
    >
      {label}
    </Typography>
    <Box
      sx={{
        flex: 1,
        height: '1px',
        background: isDarkMode
          ? 'linear-gradient(90deg, rgba(255,255,255,0.07) 0%, transparent 100%)'
          : 'linear-gradient(90deg, rgba(0,0,0,0.07) 0%, transparent 100%)',
      }}
    />
  </Box>
);

// ============================================================
// Main page component
// ============================================================

export const RosterViewPage: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const roleColors = isDarkMode ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;

  const [roster, setRoster] = useState<RaidRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [encodedParam, setEncodedParam] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // Decode roster from ?r= on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('r') ?? '';
    setEncodedParam(encoded);

    if (!encoded) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    void decodeRosterFromURL(encoded)
      .then((decoded) => {
        if (decoded) {
          setRoster(decoded);
        } else {
          setNotFound(true);
        }
        setLoading(false);

        // Signal to the parent frame (RosterPreviewDialog) that content is ready
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'roster-preview-ready' }, window.location.origin);
        }
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, []);

  // Copy this shareable link to clipboard
  const handleCopyLink = (): void => {
    // Use current pathname so the link works in subdirectory deployments
    const url = `${window.location.origin}${window.location.pathname}?r=${encodedParam}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setSnackbar({ open: true, message: 'Link copied to clipboard!', severity: 'success' });
      })
      .catch(() => {
        setSnackbar({ open: true, message: 'Failed to copy link', severity: 'error' });
      });
  };

  // Open the roster in the builder for editing
  const handleOpenInBuilder = (): void => {
    // Strip /rv suffix to get base path
    const basePath = window.location.pathname.replace(/\/rv(\/.*)?$/, '');
    window.location.href = `${window.location.origin}${basePath}/roster-builder?r=${encodedParam}`;
  };

  // Copy discord format text
  const handleCopyDiscord = (): void => {
    if (!roster) return;
    const text = buildDiscordText(roster);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setSnackbar({
          open: true,
          message: 'Discord format copied!',
          severity: 'success',
        });
      })
      .catch(() => {
        setSnackbar({ open: true, message: 'Failed to copy', severity: 'error' });
      });
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ pt: 4, pb: 6, px: { xs: 2, sm: 3 } }}>
        <Skeleton variant="text" width="40%" height={48} sx={{ mb: 3, borderRadius: 2 }} />
        <Box
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}
        >
          {[...Array<number>(4)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  // ---- Not found state ----
  if (notFound || !roster) {
    return (
      <Container maxWidth="sm" sx={{ pt: 8, pb: 6 }}>
        <Alert
          severity="error"
          sx={{
            borderRadius: '14px',
            mb: 2,
          }}
        >
          No roster found in the URL. Please check the link and try again.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => {
            window.location.href = '/roster-builder';
          }}
          sx={{ borderRadius: '10px', textTransform: 'none' }}
        >
          Open Roster Builder
        </Button>
      </Container>
    );
  }

  const sortedDPS = [...roster.dpsSlots].sort((a, b) => a.slotNumber - b.slotNumber);

  return (
    <Container maxWidth="lg" sx={{ pt: 3, pb: 6, px: { xs: 2, sm: 3 } }}>
      {/* ── Page header ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mb: 0.25,
            }}
          >
            Roster (Read-Only)
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: { xs: '1.35rem', sm: '1.6rem' },
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              background: isDarkMode
                ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
                : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {roster.rosterName || 'Unnamed Roster'}
          </Typography>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            startIcon={<CopyIcon sx={{ fontSize: '0.85rem !important' }} />}
            onClick={handleCopyLink}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.12)',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            Copy Link
          </Button>
          <Button
            size="small"
            startIcon={<EditIcon sx={{ fontSize: '0.85rem !important' }} />}
            onClick={handleOpenInBuilder}
            endIcon={<OpenInNewIcon sx={{ fontSize: '0.75rem !important' }} />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: isDarkMode ? '#f1f5f9' : '#0f172a',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)',
              border: isDarkMode
                ? '1px solid rgba(255,255,255,0.12)'
                : '1px solid rgba(0,0,0,0.12)',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.09)',
              },
            }}
          >
            Edit Roster
          </Button>
        </Box>
      </Box>

      <Divider
        sx={{
          mb: 3,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }}
      />

      {/* ── Tanks section ── */}
      <Box sx={{ mb: 3 }}>
        <SectionLabel
          icon={<ShieldIcon sx={{ fontSize: '0.85rem', color: roleColors.tank }} />}
          label="Tanks"
          color={roleColors.tank}
          isDarkMode={isDarkMode}
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.5,
          }}
        >
          <TankCard
            tank={roster.tank1}
            label="MT"
            color={roleColors.tank}
            isDarkMode={isDarkMode}
          />
          <TankCard
            tank={roster.tank2}
            label="OT"
            color={roleColors.tank}
            isDarkMode={isDarkMode}
          />
        </Box>
      </Box>

      {/* ── Healers section ── */}
      <Box sx={{ mb: 3 }}>
        <SectionLabel
          icon={<FavoriteIcon sx={{ fontSize: '0.85rem', color: roleColors.healer }} />}
          label="Healers"
          color={roleColors.healer}
          isDarkMode={isDarkMode}
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.5,
          }}
        >
          <HealerCard
            healer={roster.healer1}
            label="H1"
            color={roleColors.healer}
            isDarkMode={isDarkMode}
          />
          <HealerCard
            healer={roster.healer2}
            label="H2"
            color={roleColors.healer}
            isDarkMode={isDarkMode}
          />
        </Box>
      </Box>

      {/* ── DPS section ── */}
      <Box sx={{ mb: 3 }}>
        <SectionLabel
          icon={<DPSIcon sx={{ fontSize: '0.85rem', color: roleColors.dps }} />}
          label="DPS"
          color={roleColors.dps}
          isDarkMode={isDarkMode}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {sortedDPS.map((slot) => (
            <DPSRow
              key={slot.slotNumber}
              slot={slot}
              color={roleColors.dps}
              isDarkMode={isDarkMode}
            />
          ))}
        </Box>
      </Box>

      {/* ── Notes ── */}
      {roster.notes && (
        <Box sx={{ mb: 3 }}>
          <SectionLabel
            icon={
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
                }}
              />
            }
            label="Notes"
            color={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
            isDarkMode={isDarkMode}
          />
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '12px',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.82rem',
                color: 'text.secondary',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
              }}
            >
              {roster.notes}
            </Typography>
          </Paper>
        </Box>
      )}

      {/* ── Discord copy row ── */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
        <Button
          size="small"
          startIcon={<CopyIcon sx={{ fontSize: '0.85rem !important' }} />}
          onClick={handleCopyDiscord}
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            },
          }}
        >
          Copy Discord Format
        </Button>
      </Box>

      {/* ── Snackbar feedback ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ borderRadius: '10px' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// ============================================================
// Discord text builder (mirrors generateDiscordFormat in RosterBuilderPage)
// ============================================================

function buildDiscordText(roster: RaidRoster): string {
  const lines: string[] = [];
  lines.push(`**${roster.rosterName}**`, '');

  const fmtUlt = (u: string | null): string => (u ? ` [${u}]` : '');
  const fmtSkillLines = (
    sl: { line1?: string; line2?: string; line3?: string; isFlex?: boolean } | undefined,
  ): string => {
    if (!sl) return '';
    if (sl.isFlex) return 'Flexible';
    return [sl.line1, sl.line2, sl.line3].filter(Boolean).join('/');
  };
  const fmtGear = (
    sets: {
      set1?: import('../types/abilities').KnownSetIDs;
      set2?: import('../types/abilities').KnownSetIDs;
      monsterSet?: import('../types/abilities').KnownSetIDs;
      additionalSets?: import('../types/abilities').KnownSetIDs[];
    } | null,
  ): string => formatGearSets(sets).join('/');

  // Tanks — skip completely empty slots (single-tank comps)
  ([roster.tank1, roster.tank2] as const).forEach((tank, i) => {
    const hasData =
      tank.playerName ||
      tank.roleNotes ||
      tank.labels?.length ||
      tank.gearSets?.set1 ||
      tank.gearSets?.set2 ||
      tank.notes;
    if (!hasData) return;
    const lbl = i === 0 ? 'MT' : 'OT';
    const rn = tank.roleNotes ? ` [${tank.roleNotes}]` : '';
    const pn = tank.playerName ? ` ${tank.playerName}` : '';
    const lbs = tank.labels?.length ? ` (${tank.labels.join(', ')})` : '';
    lines.push(`${lbl}${rn}:${pn}${lbs}`);
    const g = fmtGear(tank.gearSets);
    if (g) lines.push(g);
    const sl = fmtSkillLines(tank.skillLines);
    const ult = fmtUlt(tank.ultimate);
    if (sl || ult) lines.push(`${sl}${ult}`);
    if (tank.notes) lines.push(`Notes: ${tank.notes}`);
    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬', '');

  // Healers — skip completely empty slots (single-healer comps)
  ([roster.healer1, roster.healer2] as const).forEach((h, i) => {
    const hasData =
      h.playerName || h.roleNotes || h.labels?.length || h.set1 || h.set2 || h.notes;
    if (!hasData) return;
    const lbl = h.roleLabel || (i === 0 ? 'H1' : 'H2');
    const rn = h.roleNotes ? ` [${h.roleNotes}]` : '';
    const pn = h.playerName ? ` ${h.playerName}` : '';
    const lbs = h.labels?.length ? ` [${h.labels.join(', ')}]` : '';
    lines.push(`${lbl}${rn}:${pn}${lbs}`);
    const g = fmtGear({
      set1: h.set1,
      set2: h.set2,
      monsterSet: h.monsterSet,
      additionalSets: h.additionalSets,
    });
    if (g) lines.push(g);
    if (h.healerBuff) lines.push(h.healerBuff);
    const sl = fmtSkillLines(h.skillLines);
    const ult = fmtUlt(h.ultimate);
    if (sl || ult) lines.push(`${sl}${ult}`);
    if (h.notes) lines.push(`Notes: ${h.notes}`);
    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬', '');

  // DPS — skip fully empty slots
  const sorted = [...roster.dpsSlots].sort((a, b) => a.slotNumber - b.slotNumber);
  sorted.forEach((dd) => {
    if (!dd.playerName && !dd.roleNotes && !dd.labels?.length && !dd.jailDDType) return;
    const rn = dd.roleNotes ? ` [${dd.roleNotes}]` : '';
    const pn = dd.playerName ? ` ${dd.playerName}` : '';
    const jl = dd.jailDDType
      ? ` [${DPS_JAIL_LABELS[dd.jailDDType] ?? dd.customDescription ?? ''}]`
      : '';
    const lbs = dd.labels?.length ? ` (${dd.labels.join(', ')})` : '';
    lines.push(`${dd.slotNumber}${jl}${rn}:${pn}${lbs}`);
    const sl = dd.skillLines ? fmtSkillLines(dd.skillLines) : '';
    if (sl) lines.push(sl);
  });
  lines.push('');

  if (roster.notes) {
    lines.push('**General Notes:**', roster.notes, '');
  }

  return lines.join('\n');
}
