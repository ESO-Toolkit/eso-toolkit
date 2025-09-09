import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { alpha, Theme } from '@mui/material/styles';
import React from 'react';

import { GearSetCategory, SearchableGearSet } from '../../data/Roles/healer/HealingGuide.types';
import healingGuideData from '../../data/Roles/healer/HealingGuideContent';

// Minimal local types for optional PPTX outline rendering
interface HealerOutlineItem {
  level: number;
  text: string;
}
interface HealerOutlineSlide {
  index: number;
  title: string;
  items: HealerOutlineItem[];
}

const heroSx = (theme: Theme) => ({
  position: 'relative',
  borderRadius: 3,
  p: { xs: 3, md: 5 },
  overflow: 'hidden',
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
  background:
    theme.palette.mode === 'dark'
      ? 'radial-gradient(1200px 300px at 10% -10%, rgba(56, 189, 248, 0.10) 0%, transparent 60%), radial-gradient(1200px 300px at 90% 110%, rgba(147, 51, 234, 0.10) 0%, transparent 60%), linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(3,7,18,1) 100%)'
      : 'radial-gradient(1200px 300px at 10% -10%, rgba(59, 130, 246, 0.08) 0%, transparent 60%), radial-gradient(1200px 300px at 90% 110%, rgba(99, 102, 241, 0.08) 0%, transparent 60%), linear-gradient(135deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 10px 30px rgba(56, 189, 248, 0.12), 0 2px 8px rgba(0, 0, 0, 0.6)'
      : '0 10px 30px rgba(59, 130, 246, 0.10), 0 2px 8px rgba(0, 0, 0, 0.05)',
});

const frostCardSx = (theme: Theme) => ({
  position: 'relative',
  p: 2.5,
  borderRadius: 2,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(2,6,23,0.8) 0%, rgba(15,23,42,0.8) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(248,250,252,0.7) 100%)',
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(59, 130, 246, 0.12)'}`,
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 8px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)'
      : '0 8px 28px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
  backdropFilter: 'blur(12px)',
  transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 12px 36px rgba(56,189,248,0.18)'
        : '0 12px 36px rgba(59,130,246,0.14)',
    borderColor:
      theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(59, 130, 246, 0.22)',
  },
});

const tagChipSx = (theme: Theme, type: string) => {
  const base = {
    height: 24,
    borderRadius: 1,
    fontWeight: 600,
    border: '1px solid',
  } as const;
  const map: Record<string, { bg: string; color: string; border: string }> = {
    slayer: {
      bg: theme.palette.mode === 'dark' ? alpha('#06b6d4', 0.15) : alpha('#0891b2', 0.15),
      color: theme.palette.mode === 'dark' ? '#67e8f9' : '#0e7490',
      border: theme.palette.mode === 'dark' ? alpha('#06b6d4', 0.35) : alpha('#0891b2', 0.35),
    },
    buff: {
      bg: theme.palette.mode === 'dark' ? alpha('#22c55e', 0.15) : alpha('#16a34a', 0.15),
      color: theme.palette.mode === 'dark' ? '#86efac' : '#15803d',
      border: theme.palette.mode === 'dark' ? alpha('#22c55e', 0.35) : alpha('#16a34a', 0.35),
    },
    monster: {
      bg: theme.palette.mode === 'dark' ? alpha('#a855f7', 0.15) : alpha('#7c3aed', 0.15),
      color: theme.palette.mode === 'dark' ? '#d8b4fe' : '#6d28d9',
      border: theme.palette.mode === 'dark' ? alpha('#a855f7', 0.35) : alpha('#7c3aed', 0.35),
    },
    debuff: {
      bg: theme.palette.mode === 'dark' ? alpha('#ef4444', 0.15) : alpha('#dc2626', 0.15),
      color: theme.palette.mode === 'dark' ? '#fca5a5' : '#b91c1c',
      border: theme.palette.mode === 'dark' ? alpha('#ef4444', 0.35) : alpha('#dc2626', 0.35),
    },
    other: {
      bg: theme.palette.mode === 'dark' ? alpha('#60a5fa', 0.15) : alpha('#3b82f6', 0.15),
      color: theme.palette.mode === 'dark' ? '#bfdbfe' : '#1d4ed8',
      border: theme.palette.mode === 'dark' ? alpha('#60a5fa', 0.35) : alpha('#3b82f6', 0.35),
    },
    arena_weapon: {
      bg: theme.palette.mode === 'dark' ? alpha('#f59e0b', 0.15) : alpha('#d97706', 0.15),
      color: theme.palette.mode === 'dark' ? '#fde68a' : '#b45309',
      border: theme.palette.mode === 'dark' ? alpha('#f59e0b', 0.35) : alpha('#d97706', 0.35),
    },
  };
  const m = map[type] || {
    bg: 'transparent',
    color: theme.palette.text.primary,
    border: alpha('#000', 0.1),
  };
  return { ...base, background: m.bg, color: m.color, borderColor: m.border } as const;
};

type CategoryFilter = 'all' | GearSetCategory;

const categoryLabels: Record<GearSetCategory, string> = {
  slayer_sets: 'Slayer',
  buff_sets: 'Buff',
  monster_sets: 'Monster',
  debuff_sets: 'Debuff',
  other_sets: 'Other / Flex',
};

export const HealerGuide: React.FC = () => {
  const theme = useTheme() as Theme;
  const [outlineSlides, setOutlineSlides] = React.useState<HealerOutlineSlide[] | null>(null);

  // Attempt to load auto-generated outline if present
  React.useEffect(() => {
    (async () => {
      try {
        const path = '../../data/Roles/healer/HealerOutline';
        // @ts-ignore – module may not exist yet until script is run
        const mod = await import(/* @vite-ignore */ path);
        const slides: HealerOutlineSlide[] =
          (mod as any)?.healerOutline?.slides || (mod as any)?.default?.slides;
        if (Array.isArray(slides) && slides.length) {
          setOutlineSlides(slides);
        }
      } catch {
        // No outline available; keep using curated content only
      }
    })();
  }, []);

  const allSets = React.useMemo(() => {
    const categories: Array<GearSetCategory> = [
      'slayer_sets',
      'buff_sets',
      'monster_sets',
      'debuff_sets',
      'other_sets',
    ];

    const result: SearchableGearSet[] = [];
    categories.forEach((cat) => {
      const sets = healingGuideData.gear_sets.categories[cat].sets;
      sets.forEach((set) => {
        const searchTerms = [
          set.abbreviation || '',
          set.full_name,
          set.type,
          ...(set.aliases || []),
          set.slot_preference || '',
        ]
          .join(' ')
          .toLowerCase()
          .split(/\s+/);
        result.push({ ...set, category: cat, searchTerms });
      });
    });
    return result;
  }, []);

  const [query, setQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<CategoryFilter>('all');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return allSets.filter((set) => {
      const matchesCat = selectedCategory === 'all' || set.category === selectedCategory;
      if (!q) return matchesCat;
      const haystack = [
        set.full_name,
        set.abbreviation,
        set.type,
        set.slot_preference,
        ...(set.aliases || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesCat && haystack.includes(q);
    });
  }, [allSets, query, selectedCategory]);

  const activationEntries = Object.entries(healingGuideData.gear_sets.activation_types);
  const activationIcons: Record<string, string> = {
    static: '🔄',
    heavy_attack: '⚡',
    ground_aoe: '⛲',
    ultimate: '🌟',
    status_proc: '❄️🔥⚡',
    synergy: '🤝',
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      {/* Hero Section */}
      <Box sx={{ ...heroSx(theme), mb: 4 }}>
        <Stack spacing={1} alignItems="flex-start">
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-.02em',
              fontFamily: 'Space Grotesk,Inter,system-ui',
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)'
                  : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Healer 101
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Learn how to keep your group alive, buffed, and steady in PvE.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
            <Chip size="small" label="Beginner Friendly" />
            <Chip size="small" label="5–7 min read" />
            <Chip size="small" label="Step-by-Step" />
          </Stack>
        </Stack>
      </Box>

      {/* Start Here – three simple steps */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-.01em', mb: 2 }}>
          Start here
        </Typography>
        <Grid container spacing={2}>
          {[
            {
              n: 1,
              title: 'Know your job',
              desc: 'Keep HoTs rolling, cover group buffs, and stabilize resources.',
            },
            {
              n: 2,
              title: 'Equip a starter build',
              desc: 'Use a simple, reliable set combo that just works while you learn fights.',
            },
            {
              n: 3,
              title: 'Follow a 30‑sec loop',
              desc: 'Drop ground heals, refresh HoTs, weave heavies, and time your buffs.',
            },
          ].map((s) => (
            <Grid key={s.n} xs={12} md={4}>
              <Paper sx={frostCardSx(theme)}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      fontSize: 14,
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.palette.mode === 'dark' ? '#0c4a6e' : '#1e3a8a',
                      backgroundColor:
                        theme.palette.mode === 'dark'
                          ? alpha('#38bdf8', 0.25)
                          : alpha('#60a5fa', 0.25),
                      border: `1px solid ${theme.palette.mode === 'dark' ? alpha('#38bdf8', 0.35) : alpha('#60a5fa', 0.35)}`,
                      mt: 0.5,
                    }}
                  >
                    {s.n}
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>
                      {s.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {s.desc}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Core Responsibilities */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-.01em', mb: 1 }}>
          Core responsibilities
        </Typography>
        <Paper sx={frostCardSx(theme)}>
          <Stack component="ul" spacing={0.75} sx={{ pl: 2 }}>
            <Typography component="li" variant="body2">
              Keep 2–3 HoTs rolling on the stack at all times.
            </Typography>
            <Typography component="li" variant="body2">
              Maintain team buffs the group can’t cap alone (e.g., Major Courage).
            </Typography>
            <Typography component="li" variant="body2">
              Stabilize resources (sustain) and mitigate spikes with burst heals.
            </Typography>
            <Typography component="li" variant="body2">
              Time your heavy‑attack or set windows with group burst calls.
            </Typography>
            <Typography component="li" variant="body2">
              Position so your heals and buffs always cover the group.
            </Typography>
          </Stack>
        </Paper>
      </Box>

      {/* Starter Build – simple, reliable */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-.01em', mb: 1 }}>
          Starter build (one that just works)
        </Typography>
        <Paper sx={frostCardSx(theme)}>
          <Grid container spacing={2}>
            {[
              'Spell Power Cure',
              'Symphony of Blades',
              "Grand Rejuvenation (Master's Restoration Staff)",
            ].map((name) => (
              <Grid key={name} xs={12} md={4}>
                <Paper sx={frostCardSx(theme)}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    Chosen for reliable uptime and group sustain while you learn mechanics.
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Don’t have the monster helm yet? Use any survivability option while you work toward
            Symphony.
          </Typography>
        </Paper>
      </Box>

      {/* 30‑second Loop */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-.01em', mb: 1 }}>
          Your 30‑second loop
        </Typography>
        <Paper sx={frostCardSx(theme)}>
          <Stack component="ol" spacing={0.75} sx={{ pl: 2 }}>
            <Typography component="li" variant="body2">
              Drop/refresh ground heal (keep the stack covered).
            </Typography>
            <Typography component="li" variant="body2">
              Refresh HoTs on the group.
            </Typography>
            <Typography component="li" variant="body2">
              Weave a heavy attack if you’re using a set that needs it (e.g., RO) or for sustain.
            </Typography>
            <Typography component="li" variant="body2">
              Reapply key buffs/debuffs for the group’s burst window.
            </Typography>
            <Typography component="li" variant="body2">
              Spot heal spikes; repeat.
            </Typography>
          </Stack>
        </Paper>
      </Box>

      {/* Progression Path */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-.01em', mb: 1 }}>
          Progression path
        </Typography>
        <Paper sx={frostCardSx(theme)}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip label="Starter: SPC + Sustain" />
            <Chip label="Trial: Olorime + RO (assigned)" />
            <Chip label="Monster: Symphony → Magma (flex)" />
            <Chip label="Arena: Grand Rejuvenation" />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Coordinate set responsibilities with your co‑healer; avoid duplicate unique buffs.
          </Typography>
        </Paper>
      </Box>

      {/* Common mistakes */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-.01em', mb: 1 }}>
          Common mistakes to avoid
        </Typography>
        <Paper sx={frostCardSx(theme)}>
          <Stack component="ul" spacing={0.75} sx={{ pl: 2 }}>
            <Typography component="li" variant="body2">
              Letting ground heals or HoTs drop on the stack.
            </Typography>
            <Typography component="li" variant="body2">
              Wearing duplicate unique‑buff sets with your co‑healer.
            </Typography>
            <Typography component="li" variant="body2">
              Standing too far from the group (your buffs won’t reach them).
            </Typography>
            <Typography component="li" variant="body2">
              Saving sustain tools for “later” — use them proactively.
            </Typography>
          </Stack>
        </Paper>
      </Box>

      {/* CTA */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 4 }}>
        <Button variant="contained" color="primary" href="#/calculator">
          Open Calculator
        </Button>
        <Button variant="outlined" color="primary" href="#/">
          Analyze Logs
        </Button>
      </Box>

      {/* Optional: Outline extracted from PPTX (if present) */}
      {outlineSlides && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-.01em', mb: 1 }}>
            Overview (from PPTX)
          </Typography>
          <Grid container spacing={2}>
            {outlineSlides.slice(0, 6).map((sl) => (
              <Grid key={sl.index} xs={12} md={6}>
                <Paper sx={frostCardSx(theme)}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {sl.title}
                  </Typography>
                  <Stack component="ul" spacing={0.5} sx={{ mt: 1, pl: 2 }}>
                    {sl.items.slice(0, 6).map((it, idx) => (
                      <Typography key={idx} component="li" variant="body2" color="text.secondary">
                        {it.text}
                      </Typography>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Advanced section – optional deeper dives */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="advanced-content"
          id="advanced-header"
        >
          <Typography fontWeight={800}>
            Advanced: Full gear explorer, activation types, and example builds
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Gear Explorer */}
          <Box>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', md: 'center' }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-.01em' }}>
                Gear Explorer
              </Typography>
              <Box sx={{ flex: 1 }} />
              <TextField
                size="small"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sets, aliases, or slots..."
                aria-label="Search healer gear sets"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: { xs: '100%', md: 320 } }}
              />
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'slayer_sets', label: categoryLabels['slayer_sets'] },
                  { key: 'buff_sets', label: categoryLabels['buff_sets'] },
                  { key: 'monster_sets', label: categoryLabels['monster_sets'] },
                  { key: 'debuff_sets', label: categoryLabels['debuff_sets'] },
                  { key: 'other_sets', label: categoryLabels['other_sets'] },
                ] as Array<{ key: CategoryFilter; label: string }>
              ).map((c) => (
                <Chip
                  key={c.key}
                  label={c.label}
                  color={selectedCategory === c.key ? 'primary' : 'default'}
                  variant={selectedCategory === c.key ? 'filled' : 'outlined'}
                  onClick={() => setSelectedCategory(c.key)}
                  sx={{ borderRadius: 1.5 }}
                />
              ))}
            </Stack>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              {filtered.map((set) => (
                <Grid key={`${set.full_name}-${set.category}`} xs={12} sm={6} md={4}>
                  <Paper sx={frostCardSx(theme)}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      justifyContent="space-between"
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        {set.abbreviation && (
                          <Chip size="small" label={set.abbreviation} sx={{ fontWeight: 700 }} />
                        )}
                        <Typography variant="subtitle1" fontWeight={800}>
                          {set.full_name}
                        </Typography>
                      </Stack>
                      <Tooltip title={`${categoryLabels[set.category]} • ${set.type}`}>
                        <Chip
                          size="small"
                          sx={tagChipSx(theme, set.type)}
                          label={categoryLabels[set.category]}
                        />
                      </Tooltip>
                    </Stack>
                    {set.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                        {set.description}
                      </Typography>
                    )}
                    {set.slot_preference && (
                      <Typography
                        variant="caption"
                        sx={{
                          mt: 1.25,
                          display: 'inline-block',
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? alpha('#0ea5e9', 0.1)
                              : alpha('#3b82f6', 0.08),
                          border: '1px solid',
                          borderColor:
                            theme.palette.mode === 'dark'
                              ? alpha('#0ea5e9', 0.25)
                              : alpha('#3b82f6', 0.22),
                        }}
                      >
                        Preferred: {set.slot_preference}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {filtered.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                No sets match your filters.
              </Typography>
            )}
          </Box>

          {/* Activation Types */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-.01em', mb: 1 }}>
              Activation Types
            </Typography>
            <Grid container spacing={2}>
              {activationEntries.map(([key, desc]) => (
                <Grid key={key} xs={12} sm={6} md={4}>
                  <Paper sx={frostCardSx(theme)}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box component="span" role="img" aria-label={key} sx={{ fontSize: 18 }}>
                        {activationIcons[key] || 'ℹ️'}
                      </Box>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ textTransform: 'capitalize' }}
                      >
                        {key.replace('_', ' ')}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {desc}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Builds */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-.01em' }}>
              Example builds
            </Typography>
            <Paper sx={{ ...frostCardSx(theme), mt: 1 }}>
              <Grid container spacing={2}>
                {healingGuideData.build_strategies.example_builds.map((b) => (
                  <Grid key={b.build_name} xs={12} md={6}>
                    <Paper sx={frostCardSx(theme)}>
                      <Typography variant="subtitle2" fontWeight={800}>
                        {b.build_name}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Stack spacing={0.5}>
                        {Object.entries(b.gear_distribution).map(([k, v]) => (
                          <Stack key={k} direction="row" spacing={1} alignItems="center">
                            <Typography
                              variant="caption"
                              sx={{ minWidth: 90, color: 'text.secondary' }}
                            >
                              {k}
                            </Typography>
                            <Typography variant="body2">{v}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Box>

          {/* Notes */}
          <Box sx={{ mt: 4 }}>
            <Paper sx={frostCardSx(theme)}>
              <Typography variant="subtitle1" fontWeight={800}>
                Notes & Disclaimers
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {healingGuideData.implementation_notes.disclaimer}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {healingGuideData.implementation_notes.duplication}
              </Typography>
            </Paper>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Container>
  );
};
