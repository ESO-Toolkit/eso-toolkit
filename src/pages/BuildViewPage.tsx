/**
 * BuildViewPage — read-only, shareable view of a build.
 *
 * Accessible via direct link: /bv?b=<encoded>
 * The encoded build is the compact deflate-compressed format from buildEncoding.ts.
 *
 * Note: guide.content, screenshots, and addonImportString are not available in
 * URL-shared builds — only D1-published builds carry those.
 */

import {
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  OpenInNew as OpenInNewIcon,
  SportsEsports as GameIcon,
  Shield as ShieldIcon,
  Favorite as HealIcon,
  AutoAwesome as DpsIcon,
  Person as PersonIcon,
  YouTube as YouTubeIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Skeleton,
  Snackbar,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';

import type { Build, BuildSetup } from '../features/build-editor/types/build.types';
import { decodeBuildFromURL } from '../utils/buildEncoding';

// ─── Display helpers ──────────────────────────────────────────────────────────

const CLASS_LABELS: Record<string, string> = {
  'any-class': 'Any Class',
  dragonknight: 'Dragonknight',
  sorcerer: 'Sorcerer',
  nightblade: 'Nightblade',
  templar: 'Templar',
  warden: 'Warden',
  necromancer: 'Necromancer',
  arcanist: 'Arcanist',
};

const ROLE_LABELS: Record<string, string> = {
  tank: 'Tank',
  healer: 'Healer',
  'magicka-dps': 'Magicka DPS',
  'stamina-dps': 'Stamina DPS',
  'hybrid-dps': 'Hybrid DPS',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  tank: <ShieldIcon sx={{ fontSize: '0.9rem' }} />,
  healer: <HealIcon sx={{ fontSize: '0.9rem' }} />,
  'magicka-dps': <DpsIcon sx={{ fontSize: '0.9rem' }} />,
  'stamina-dps': <DpsIcon sx={{ fontSize: '0.9rem' }} />,
  'hybrid-dps': <DpsIcon sx={{ fontSize: '0.9rem' }} />,
};

const SKILL_LINE_LABELS: Record<string, string> = {
  'class.ardent-flame': 'Ardent Flame',
  'class.draconic-power': 'Draconic Power',
  'class.earthen-heart': 'Earthen Heart',
  'class.dark-magic': 'Dark Magic',
  'class.daedric-summoning': 'Daedric Summoning',
  'class.storm-calling': 'Storm Calling',
  'class.assassination': 'Assassination',
  'class.shadow': 'Shadow',
  'class.siphoning': 'Siphoning',
  'class.aedric-spear': 'Aedric Spear',
  'class.dawns-wrath': "Dawn's Wrath",
  'class.restoring-light': 'Restoring Light',
  'class.animal-companions': 'Animal Companions',
  'class.green-balance': 'Green Balance',
  'class.winters-embrace': "Winter's Embrace",
  'class.grave-lord': 'Grave Lord',
  'class.bone-tyrant': 'Bone Tyrant',
  'class.living-death': 'Living Death',
  'class.herald-of-the-tome': 'Herald of the Tome',
  'class.soldier-of-apocrypha': 'Soldier of Apocrypha',
  'class.curative-runeforms': 'Curative Runeforms',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const InfoRow: React.FC<{ label: string; value: string; isDarkMode: boolean }> = ({
  label,
  value,
  isDarkMode,
}) => (
  <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline', mb: 0.5 }}>
    <Typography
      sx={{
        fontSize: '0.6rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'text.disabled',
        minWidth: 80,
        flexShrink: 0,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: '0.82rem',
        color: isDarkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)',
        fontWeight: 500,
      }}
    >
      {value}
    </Typography>
  </Box>
);

const SectionHeader: React.FC<{ label: string; isDarkMode: boolean }> = ({
  label,
  isDarkMode,
}) => (
  <Typography
    sx={{
      fontSize: '0.6rem',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
      mb: 1,
      mt: 2,
    }}
  >
    {label}
  </Typography>
);

const SetupCard: React.FC<{ setup: BuildSetup; isDarkMode: boolean }> = ({
  setup,
  isDarkMode,
}) => {
  const gearSlotNames: Record<number, string> = {
    0: 'Head', 1: 'Neck', 2: 'Chest', 3: 'Shoulders', 4: 'Main Hand',
    5: 'Off Hand', 6: 'Belt', 8: 'Legs', 9: 'Feet', 11: 'Ring 1',
    12: 'Ring 2', 16: 'Gloves', 20: 'Back Main Hand', 21: 'Back Off Hand',
  };

  const gearEntries = Object.entries(setup.gear);
  const frontBar = Object.entries(setup.skills[0] ?? {});
  const backBar = Object.entries(setup.skills[1] ?? {});
  const cpSlots = [
    ...setup.cp.warfare.slots.filter((s) => s !== null),
    ...setup.cp.fitness.slots.filter((s) => s !== null),
    ...setup.cp.craft.slots.filter((s) => s !== null),
  ];
  const cpPassiveCount = Object.keys(setup.cp.warfare.passives).length +
    Object.keys(setup.cp.fitness.passives).length +
    Object.keys(setup.cp.craft.passives).length;

  const cardBg = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';

  return (
    <Box>
      {/* Attributes */}
      {(setup.attributes.magicka > 0 || setup.attributes.health > 0 || setup.attributes.stamina > 0) && (
        <>
          <SectionHeader label="Attributes" isDarkMode={isDarkMode} />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
            {setup.attributes.magicka > 0 && (
              <Chip label={`Magicka: ${setup.attributes.magicka}`} size="small"
                sx={{ fontSize: '0.72rem', height: 22, bgcolor: '#1e3a5f22', color: '#60a5fa', border: '1px solid #60a5fa33' }} />
            )}
            {setup.attributes.health > 0 && (
              <Chip label={`Health: ${setup.attributes.health}`} size="small"
                sx={{ fontSize: '0.72rem', height: 22, bgcolor: '#3f1e1e22', color: '#f87171', border: '1px solid #f8717133' }} />
            )}
            {setup.attributes.stamina > 0 && (
              <Chip label={`Stamina: ${setup.attributes.stamina}`} size="small"
                sx={{ fontSize: '0.72rem', height: 22, bgcolor: '#1e3a1e22', color: '#4ade80', border: '1px solid #4ade8033' }} />
            )}
          </Box>
        </>
      )}

      {/* Mundus / Curse */}
      {(setup.mundusStone || (setup.curse && setup.curse !== 'none')) && (
        <>
          <SectionHeader label="Character" isDarkMode={isDarkMode} />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {setup.mundusStone && (
              <Chip label={`Mundus: ${setup.mundusStone}`} size="small" variant="outlined"
                sx={{ fontSize: '0.72rem', height: 22, borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }} />
            )}
            {setup.curse && setup.curse !== 'none' && (
              <Chip label={`Curse: ${setup.curse}`} size="small" variant="outlined"
                sx={{ fontSize: '0.72rem', height: 22, borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }} />
            )}
          </Box>
        </>
      )}

      {/* Gear */}
      {gearEntries.length > 0 && (
        <>
          <SectionHeader label={`Gear (${gearEntries.length} pieces)`} isDarkMode={isDarkMode} />
          <Paper elevation={0} sx={{ p: 1.5, borderRadius: '10px', bgcolor: cardBg, border: `1px solid ${borderColor}`, mb: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.375 }}>
              {gearEntries.map(([slot, piece]) => (
                <Box key={slot} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', minWidth: 100, flexShrink: 0 }}>
                    {gearSlotNames[Number(slot)] ?? `Slot ${slot}`}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                    #{piece.id ?? '—'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </>
      )}

      {/* Skills */}
      {(frontBar.length > 0 || backBar.length > 0) && (
        <>
          <SectionHeader label="Skills" isDarkMode={isDarkMode} />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {[['Front Bar', frontBar], ['Back Bar', backBar]].map(([label, bar]) =>
              (bar as [string, number][]).length > 0 ? (
                <Paper key={label as string} elevation={0}
                  sx={{ p: 1.25, borderRadius: '10px', bgcolor: cardBg, border: `1px solid ${borderColor}`, flex: 1, minWidth: 140 }}>
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.disabled', mb: 0.75 }}>
                    {label as string}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    {(bar as [string, number][]).sort(([a], [b]) => Number(a) - Number(b)).map(([slot, id]) => (
                      <Typography key={slot} sx={{ fontSize: '0.72rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                        Slot {slot}: #{id}
                      </Typography>
                    ))}
                  </Box>
                </Paper>
              ) : null,
            )}
          </Box>
        </>
      )}

      {/* Champion Points summary */}
      {(cpSlots.length > 0 || cpPassiveCount > 0) && (
        <>
          <SectionHeader label="Champion Points" isDarkMode={isDarkMode} />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {cpSlots.length > 0 && (
              <Chip label={`${cpSlots.length} active perk${cpSlots.length !== 1 ? 's' : ''}`} size="small" variant="outlined"
                sx={{ fontSize: '0.72rem', height: 22 }} />
            )}
            {cpPassiveCount > 0 && (
              <Chip label={`${cpPassiveCount} passive${cpPassiveCount !== 1 ? 's' : ''}`} size="small" variant="outlined"
                sx={{ fontSize: '0.72rem', height: 22 }} />
            )}
          </Box>
        </>
      )}

      {/* Passives count */}
      {setup.passives.length > 0 && (
        <>
          <SectionHeader label="Passives" isDarkMode={isDarkMode} />
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 1 }}>
            {setup.passives.length} passive{setup.passives.length !== 1 ? 's' : ''} selected
          </Typography>
        </>
      )}

      {/* Consumables */}
      {(setup.consumables.potions.length > 0 || setup.consumables.food.id != null) && (
        <>
          <SectionHeader label="Consumables" isDarkMode={isDarkMode} />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {setup.consumables.potions.map((p) => (
              <Chip key={p.id} label={`Potion #${p.id}`} size="small" variant="outlined"
                sx={{ fontSize: '0.72rem', height: 22 }} />
            ))}
            {setup.consumables.food.id != null && (
              <Chip label={`Food #${setup.consumables.food.id}`} size="small" variant="outlined"
                sx={{ fontSize: '0.72rem', height: 22 }} />
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const BuildViewPage: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [build, setBuild] = useState<Build | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeSetup, setActiveSetup] = useState(0);
  const [encodedParam, setEncodedParam] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('b') ?? '';
    setEncodedParam(encoded);

    if (!encoded) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    void decodeBuildFromURL(encoded)
      .then((decoded) => {
        if (decoded) {
          setBuild(decoded);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, []);

  const handleCopyLink = (): void => {
    const url = `${window.location.origin}${window.location.pathname}?b=${encodedParam}`;
    navigator.clipboard
      .writeText(url)
      .then(() => setSnackbar({ open: true, message: 'Link copied!', severity: 'success' }))
      .catch(() => setSnackbar({ open: true, message: 'Failed to copy', severity: 'error' }));
  };

  const handleOpenInEditor = (): void => {
    const basePath = window.location.pathname.replace(/\/bv(\/.*)?$/, '');
    window.location.href = `${window.location.origin}${basePath}/build-editor?b=${encodedParam}`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ pt: 4, pb: 6, px: { xs: 2, sm: 3 } }}>
        <Skeleton variant="text" width="45%" height={52} sx={{ mb: 1, borderRadius: 2 }} />
        <Skeleton variant="text" width="30%" height={28} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  if (notFound || !build) {
    return (
      <Container maxWidth="sm" sx={{ pt: 8, pb: 6 }}>
        <Alert severity="error" sx={{ borderRadius: '14px', mb: 2 }}>
          No build found in the URL. Please check the link and try again.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => { window.location.href = '/build-editor'; }}
          sx={{ borderRadius: '10px', textTransform: 'none' }}
        >
          Open Build Editor
        </Button>
      </Container>
    );
  }

  const classLabel = CLASS_LABELS[build.esoClass] ?? build.esoClass;
  const roleLabel = ROLE_LABELS[build.role] ?? build.role;
  const classSkillLineLabels = build.classSkillLines
    .filter(Boolean)
    .map((sl) => (sl ? (SKILL_LINE_LABELS[sl] ?? sl) : null))
    .filter(Boolean);

  const cardBg = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';

  return (
    <Container maxWidth="lg" sx={{ pt: 3, pb: 6, px: { xs: 2, sm: 3 } }}>
      {/* ── Banner image ── */}
      {build.guide.bannerImageUrl && (
        <Box
          sx={{
            width: '100%',
            height: { xs: 140, sm: 200 },
            borderRadius: '14px',
            overflow: 'hidden',
            mb: 2.5,
            position: 'relative',
          }}
        >
          <img
            src={build.guide.bannerImageUrl}
            alt={`${build.name} banner`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </Box>
      )}

      {/* ── Header ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          mb: 2.5,
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
            Build (Read-Only)
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
            {build.name || 'Unnamed Build'}
          </Typography>
          {build.shortDescription && (
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 0.5 }}>
              {build.shortDescription}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            startIcon={<CopyIcon sx={{ fontSize: '0.85rem !important' }} />}
            onClick={handleCopyLink}
            sx={{
              borderRadius: '8px', textTransform: 'none', fontSize: '0.75rem', fontWeight: 500,
              color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.12)',
              '&:hover': { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
            }}
          >
            Copy Link
          </Button>
          <Button
            size="small"
            startIcon={<EditIcon sx={{ fontSize: '0.85rem !important' }} />}
            endIcon={<OpenInNewIcon sx={{ fontSize: '0.75rem !important' }} />}
            onClick={handleOpenInEditor}
            sx={{
              borderRadius: '8px', textTransform: 'none', fontSize: '0.75rem', fontWeight: 600,
              color: isDarkMode ? '#f1f5f9' : '#0f172a',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
              '&:hover': { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.09)' },
            }}
          >
            Edit Build
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 2.5, borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />

      {/* ── Build overview card ── */}
      <Paper
        elevation={0}
        sx={{ p: 2, borderRadius: '14px', bgcolor: cardBg, border: `1px solid ${borderColor}`, mb: 3 }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {/* Left col: class + role + mode */}
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              {ROLE_ICONS[build.role]}
              <Typography
                sx={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '1rem',
                  letterSpacing: '-0.01em',
                }}
              >
                {classLabel}
              </Typography>
            </Box>
            <InfoRow label="Role" value={roleLabel} isDarkMode={isDarkMode} />
            <InfoRow label="Mode" value={build.gameMode.toUpperCase()} isDarkMode={isDarkMode} />
            {build.races.length > 0 && (
              <InfoRow label="Race" value={build.races.join(', ')} isDarkMode={isDarkMode} />
            )}
            {build.settings.dlc && build.settings.dlc !== 'Base Game' && (
              <InfoRow label="DLC" value={build.settings.dlc} isDarkMode={isDarkMode} />
            )}
          </Box>

          {/* Right col: class skill lines */}
          {classSkillLineLabels.length > 0 && (
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography
                sx={{
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'text.disabled', mb: 0.75,
                }}
              >
                Class Skill Lines
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {classSkillLineLabels.map((sl) => (
                  <Chip
                    key={sl}
                    label={sl}
                    size="small"
                    icon={<PersonIcon sx={{ fontSize: '0.75rem !important' }} />}
                    sx={{
                      height: 22, fontSize: '0.72rem', fontWeight: 500,
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                      border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      width: 'fit-content',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* YouTube link */}
          {build.guide.youtubeUrl && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<YouTubeIcon sx={{ color: '#ef4444' }} />}
                href={build.guide.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  borderRadius: '8px', textTransform: 'none', fontSize: '0.75rem',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                }}
              >
                Video Guide
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Setup tabs ── */}
      {build.setups.length > 1 && (
        <Tabs
          value={activeSetup}
          onChange={(_event: React.SyntheticEvent, v: number) => setActiveSetup(v)}
          sx={{ mb: 2, minHeight: 36 }}
          TabIndicatorProps={{ style: { height: 2 } }}
        >
          {build.setups.map((setup, i) => (
            <Tab
              key={setup.id}
              label={setup.name || `Setup ${i + 1}`}
              value={i}
              sx={{ minHeight: 36, textTransform: 'none', fontSize: '0.82rem', fontWeight: 500 }}
            />
          ))}
        </Tabs>
      )}

      {/* ── Active setup ── */}
      {build.setups[activeSetup] && (
        <SetupCard setup={build.setups[activeSetup]} isDarkMode={isDarkMode} />
      )}

      {/* ── Guide note (content not in URL shares) ── */}
      {!build.guide.content && build.guide.youtubeUrl && (
        <Box
          sx={{
            mt: 3, p: 1.5, borderRadius: '10px',
            bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            display: 'flex', alignItems: 'center', gap: 1,
          }}
        >
          <GameIcon sx={{ fontSize: '0.9rem', color: 'text.disabled' }} />
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            Full guide content is available when the build is loaded in the editor.
          </Typography>
        </Box>
      )}

      {/* ── Snackbar ── */}
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
