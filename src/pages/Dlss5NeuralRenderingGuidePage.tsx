/**
 * Community setup guide for running the unofficial DLSS 5 Feeder + RenoDX
 * Neural Rendering stack in The Elder Scrolls Online (route: /docs/dlss5-neural-rendering).
 *
 * ESO is a DX11 title with no native DLSS support, so this stack works by having
 * ReShade synthesise the DLSS contract (colour + depth + motion vectors) and hand
 * it to NGX on a side D3D12 device. Two ESO-specific gotchas break it, and both
 * are app-local DLLs shadowing newer system copies — the troubleshooting section
 * is written around the exact log lines each failure produces.
 *
 * Hand-built rather than markdown-rendered (cf. RosterBotDocsPage) so the file
 * paths, log signatures and ini keys can offer copy-to-clipboard, and so the risk
 * callout can be visually prominent rather than a paragraph a reader skims past.
 *
 * Layout notes, because a long technical doc has different needs to a marketing
 * page: the container is `md` rather than `lg` (at lg this page ran ~170 chars
 * per line, since unlike RosterBotDocsPage it has no multi-column grids to break
 * the width up), body copy is `text.primary` with `text.secondary` reserved for
 * genuine asides, and code blocks are neutral slate rather than green-on-green —
 * the accent stays on the hero, step badges and CTAs so the page reads as part of
 * this site rather than as an NVIDIA page.
 *
 * Setting names, ini keys and overlay status strings are transcribed from the
 * shipped binaries (renodx-dlss5.addon64, dlss5-feed.addon64, DLSS5_Feed.fx)
 * rather than paraphrased, so they match what a reader sees on screen.
 *
 * Deliberately does NOT link or host nvngx_dlssnr.dll: the patched build is a
 * modified-after-signing NVIDIA binary and is not ours to redistribute.
 */

import {
  ArrowForward,
  Check as CheckIcon,
  CheckCircle,
  ContentCopy,
  ExpandMore,
  Info,
  Layers,
  Memory,
  Science,
  Settings as SettingsIcon,
  Speed,
  Tune,
  Warning,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { usePageTitle } from '@/hooks/useDocumentTitle';

/** Brand accent. Safe as dark-mode text, and as borders/gradients in both modes. */
const NV_GREEN = '#76B900';
/** Gradient stop only — 3.7:1 as light-mode text, which fails WCAG AA. */
const NV_GREEN_DARK = '#5A8F00';
/** Light-mode green *text*: 6.5:1 on white, 5.9:1 on the tinted surfaces here. */
const NV_GREEN_TEXT_LIGHT = '#446B00';

const MONO = "Consolas, Monaco, 'Fira Code', monospace";

/**
 * The four stages every part of this page is organised around: the setup order,
 * the troubleshooting order, and which log file to read all follow it. Rendered
 * as a diagram so the reader can see where their failure sits.
 */
const PIPELINE = [
  { stage: 'Motion', by: 'LAUNCHPAD.fx' },
  { stage: 'Contract', by: 'DLSS5_Feed.fx' },
  { stage: 'DLSS', by: 'dlss5-feed' },
  { stage: 'Neural Rendering', by: 'renodx-dlss5' },
] as const;

// ── Section registry: single source of truth for headings, ids and the TOC ──

const SECTIONS = [
  { id: 'how-it-works', title: 'How this works' },
  { id: 'requirements', title: 'What you need' },
  { id: 'setup', title: 'Setup' },
  { id: 'overlay', title: 'Using the ReShade overlay' },
  { id: 'nr-panel', title: 'The Neural Rendering add-on panel' },
  { id: 'depth-buffer', title: 'Checking the depth buffer' },
  { id: 'verify', title: 'Proving it works' },
  { id: 'config', title: 'Config file reference' },
  { id: 'troubleshooting', title: 'When it does not work' },
  { id: 'performance', title: 'What it costs' },
] as const;

// ── Reusable copy-to-clipboard ──────────────────────────────────────────────

/**
 * `aria-label` is a short fixed string rather than the payload: several call
 * sites copy multi-line ini blocks, and naming a button after ten lines of
 * config makes it unusable in a screen reader's control list. The copied state
 * is announced through a visually hidden live region instead.
 */
const CopyButton: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard denied — fail silently */
    }
  }, [value]);

  return (
    <Tooltip title={copied ? 'Copied!' : (label ?? 'Copy')} arrow>
      <Button
        size="small"
        onClick={() => void copy()}
        aria-label={label ?? 'Copy to clipboard'}
        sx={{
          minWidth: 0,
          px: 0.75,
          py: 0.25,
          color: copied ? 'success.main' : 'text.secondary',
          '&:hover': { color: 'success.main', background: 'transparent' },
        }}
      >
        {copied ? <CheckIcon sx={{ fontSize: 16 }} /> : <ContentCopy sx={{ fontSize: 16 }} />}
        <Box
          component="span"
          role="status"
          sx={{
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
          }}
        >
          {copied ? 'Copied to clipboard' : ''}
        </Box>
      </Button>
    </Tooltip>
  );
};

// ── Content data ────────────────────────────────────────────────────────────

interface RowSpec {
  label: string;
  value: string;
}

const REQUIREMENTS: ReadonlyArray<RowSpec> = [
  {
    label: 'GPU',
    value:
      'NVIDIA RTX. The nvngx_dlssnr.dll must match your generation. A 50-series (Blackwell) NR runtime will not work on a 40-series (Ada) card, and vice versa.',
  },
  {
    label: 'nvngx_dlss.dll',
    value:
      'A 310.x build. Older 2.x runtimes fail outright. This is the most common cause of a dead setup.',
  },
  {
    label: 'ReShade',
    value: '6.x, installed for eso64.exe as dxgi.dll, WITH full add-on support.',
  },
  {
    label: 'Add-ons',
    value: 'dlss5-feed.addon64 and renodx-dlss5.addon64, both in the client folder.',
  },
  {
    label: 'Shaders',
    value:
      'DLSS5_Feed.fx, MartysMods_LAUNCHPAD.fx, the MartysMods includes, and iMMERSE_bluenoise_opt.png.',
  },
];

const OVERLAY_TABS: ReadonlyArray<RowSpec> = [
  {
    label: 'Home',
    value:
      "The effect list. This is where you tick MartysMods_Launchpad and DLSS5_Feed, and where each effect's own settings appear when you select it.",
  },
  {
    label: 'Add-ons',
    value:
      'One collapsible panel per add-on. DLSS 5 Neural Rendering and Generic Depth both live here. Most people never find this panel.',
  },
  {
    label: 'Log',
    value:
      'Live ReShade.log. Quicker than alt-tabbing to read the file when you are chasing an error.',
  },
];

const FEED_SETTINGS: ReadonlyArray<RowSpec> = [
  {
    label: 'Motion vector provider',
    value:
      'Leave on iMMERSE LaunchPad. The alternative (texMotionVectors) is for setups without LaunchPad installed.',
  },
  {
    label: 'Motion vector sign (x, y)',
    value:
      'Both 1.0 by default. Flip one to -1.0 if the image doubles or smears in that direction while moving.',
  },
  { label: 'Motion vector scale', value: 'Diagnostic only. Leave at 1.0.' },
  {
    label: 'Debug view',
    value:
      'Drives the separate DLSS5_Feed_Debug technique. It shows motion vectors (colour = direction, brightness = speed) or raw depth. Enable that technique only while checking, then turn it back off.',
  },
];

const NR_SETTINGS: ReadonlyArray<RowSpec> = [
  {
    label: 'Enable DLSS Neural Rendering',
    value:
      'The master switch. If this is unticked the overlay tells you so and nothing else matters. Bound to the NR toggle key (F6 by default) so you can A/B it in gameplay.',
  },
  {
    label: 'Enable Upscaling (WIP)',
    value:
      'Work-in-progress, and on a default ESO setup it does nothing. The feeder requests DLAA, which already renders at output resolution, so the add-on logs "NR upscaling is not applicable ... NR continues on the native path" and carries on. That message is informational, not an error. Actual upscaling requires selecting a DLSS Balanced/Performance preset in the NVIDIA App and restarting.',
  },
  {
    label: 'NR Preset',
    value:
      'Preset #1, #2 or #3: the neural model variant. Start at the default and change one thing at a time; presets differ more on faces and hair than on terrain.',
  },
  {
    label: 'NR Style',
    value:
      'Overall look of the neural pass. This is the setting most worth experimenting with if the output looks too aggressive or too flat.',
  },
  {
    label: 'NR Intensity',
    value:
      'How strongly the neural result is blended over the original frame. Lower it first if the effect looks overcooked.',
  },
  {
    label: 'Local Tone Strength',
    value: 'Local contrast/tone shaping applied by the neural pass.',
  },
  {
    label: 'Local Structure Strength',
    value: 'How much fine structural detail the pass reconstructs across the frame generally.',
  },
  {
    label: 'Skin Structure Strength',
    value:
      'Detail reconstruction specifically on skin. This is the one that most visibly changes faces, which makes it the best setting to toggle when you are trying to confirm NR is doing anything at all.',
  },
  {
    label: 'Color Strength',
    value: 'How much the neural pass is allowed to move colour versus preserving the original.',
  },
  {
    label: 'Control-compatible color transfer',
    value:
      'Alternative colour transfer path. Leave at the default unless you have a specific reason.',
  },
  {
    label: 'HDR Transfer Strength / Scene Paper-White Scale',
    value:
      'HDR handling. ESO through this stack reports SDR (flags=66 in the feeder log), so these are not the knobs to reach for on a standard setup.',
  },
  {
    label: 'NR Toggle Key / Screenshot Key',
    value:
      'Rebindable. Defaults are F6 (toggle NR) and F5 (write a before/after screenshot pair). F5 needs an active NR evaluation and disarms itself after ~10 seconds without one.',
  },
  {
    label: 'Reset NR feature and clear failure latch',
    value:
      'If NR hits an error it latches off for that feature rather than retrying every frame. This button clears the latch without restarting the game. Use it after fixing something.',
  },
];

interface StatusSpec {
  status: string;
  meaning: string;
  good: boolean;
}

const STATUSES: ReadonlyArray<StatusSpec> = [
  {
    status: 'DLSS Neural Rendering is live and replacing the game DLSS output.',
    meaning: 'This is the one you want. NR is running.',
    good: true,
  },
  {
    status: 'NR was switched off (ini, overlay, or the NR toggle hotkey).',
    meaning:
      'Everything works, you just have it disabled. Tick "Enable DLSS Neural Rendering" or press F6. Hook diagnostics below it stay valid.',
    good: false,
  },
  {
    status: 'NGX exports are detoured but the game has not created a DLSS/DLSSD feature.',
    meaning:
      'The add-on is hooked correctly but nothing ever asked NGX for DLSS. On ESO this means the feeder failed. Check dlss5-feed.log, not this panel.',
    good: false,
  },
  {
    status: 'DLSS is evaluating but the NR feature did not bind to an output.',
    meaning:
      'DLSS works, NR does not. Read the "Latest NR NGX result" value directly below it. A non-zero code means the NR runtime itself failed to initialise, and ReShade.log names the failing step.',
    good: false,
  },
];

interface FailureSpec {
  symptom: string;
  log: string;
  cause: string;
  fix: string;
}

const FAILURES: ReadonlyArray<FailureSpec> = [
  {
    symptom: 'CreateFeature fails immediately',
    log: '[feed] CreateFeature failed 0xBAD00010 (UnsupportedParameter)\n[feed] failure: resource build\nstopped: repeated failures.',
    cause:
      'Your nvngx_dlss.dll is too old. Anything from the DLSS 2.x era predates DLAA and the DLSS.Hint.Render.Preset.* parameters the feeder sets, so NGX rejects the whole parameter block. A 2.2.16 leftover does exactly this.',
    fix: 'Replace nvngx_dlss.dll with a 310.x build. Check the version in File Explorer: right-click the DLL, then Properties, then Details.',
  },
  {
    symptom: 'Session never opens / DLSS reported unavailable',
    log: '[feed] NGX capabilities: SuperSampling.Available=0 NeedsUpdatedDriver=0 MinDriver=0.0\n[feed] DLSS super sampling is not available on this GPU/driver\nstopped: the D3D12/NGX session failed to start.',
    cause:
      'There is no nvngx_dlss.dll in the client folder at all. The NVIDIA driver ships nvngx_dlssg.dll but NOT a standalone DLSS super-resolution runtime, so there is nothing to fall back to. Deleting the local copy does not help; it makes things worse.',
    fix: 'Put a 310.x nvngx_dlss.dll back in the client folder. A healthy run reports SuperSampling.Available=1 with a non-zero MinDriver.',
  },
  {
    symptom: 'Everything loads but nothing looks different',
    log: "DLSS5 Generic proxy encode compilation failed with HRESULT 0x8876086c: error X3506: unrecognized compiler target 'cs_5_1'",
    cause:
      'The ESO-specific trap. ESO ships its own d3dcompiler_47.dll from the Windows 8.1 SDK (version 6.3.9600, dated 2013). Because it sits next to the exe it wins the DLL search order over the modern system copy. RenoDX compiles its proxy-encode shader at cs_5_1, and Shader Model 5.1 did not exist in 2013, so the compile fails and feature 18 is never created. DLSS itself keeps working, which is why this looks like "nothing happened" rather than an error.',
    fix: 'Do step 6. Back up the client folder d3dcompiler_47.dll, then copy the system one over it. Close the game first or the file will be locked.',
  },
  {
    symptom: 'The effect list says DLSS5_Feed.fx is not loaded',
    log: 'DLSS5_Feed.fx is not loaded (technique/textures missing) -- install it into reshade-shaders\\Shaders and enable it below MartysMods_Launchpad.',
    cause:
      'Seen once at every effect reload, this is harmless: the feeder checks before ReShade finishes compiling. It only matters if the very next line does not say "technique found".',
    fix: 'If it never resolves: confirm both .fx files are in reshade-shaders\\Shaders, the MartysMods\\ folder sits beside them, and both techniques are ticked in the right order.',
  },
  {
    symptom: 'Image doubles, smears or ghosts while moving',
    log: '(no log line; this is a visual fault)',
    cause:
      'The motion vectors point the wrong way. The feeder and LaunchPad agree on convention, but a mismatch shows up as smearing in one axis.',
    fix: 'In the DLSS5_Feed effect settings, flip a component of "Motion vector sign (x, y)" from 1.0 to -1.0. Change one axis at a time and watch which direction the smearing stops.',
  },
  {
    symptom: 'NR says STANDBY / FAILED after DLSS is confirmed working',
    log: 'NO NR FEATURE MATCHED (STANDBY/FAILED)',
    cause:
      'Only now is nvngx_dlssnr.dll a legitimate suspect. Check "Latest NR NGX result" in the add-on overlay. A non-zero code means the NR runtime itself would not initialise on your card, usually a generation mismatch.',
    fix: 'Confirm you have the build patched for your GPU generation. Do not start here: chase this only after you have seen "feature ready: ... DLAA" in dlss5-feed.log.',
  },
];

// ── Page ────────────────────────────────────────────────────────────────────

export const Dlss5NeuralRenderingGuidePage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Title comes from route-meta.json so the hydrated <title> matches the shell
  // stamped by scripts/generate-static-routes.cjs. Never hardcode it here.
  usePageTitle('/docs/dlss5-neural-rendering');

  // React Router does not scroll to #hash targets on its own, so a shared
  // "read the troubleshooting bit" link would otherwise land at the top.
  React.useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    });
  }, []);

  /** Green that is safe as text in the current mode. */
  const nvText = isDark ? NV_GREEN : NV_GREEN_TEXT_LIGHT;

  const cardSx = {
    borderRadius: '16px',
    p: { xs: 2.5, md: 3 },
    border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(15,23,42,0.10)',
    background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.88)',
    boxShadow: isDark ? 'none' : '0 1px 3px rgba(15,23,42,0.05)',
    backdropFilter: 'blur(8px)',
  } as const;

  /** Body copy. `text.secondary` is reserved for genuine asides and table values. */
  const proseSx = { color: 'text.primary', fontSize: '0.9rem', lineHeight: 1.75 } as const;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '20px',
          px: { xs: 3, md: 5 },
          py: { xs: 4, md: 5 },
          mb: 3,
          background: isDark
            ? 'linear-gradient(135deg, rgba(118,185,0,0.20) 0%, rgba(0,200,255,0.06) 100%)'
            : 'linear-gradient(135deg, rgba(118,185,0,0.12) 0%, rgba(0,200,255,0.05) 100%)',
          border: isDark ? '1px solid rgba(118,185,0,0.28)' : '1px solid rgba(118,185,0,0.18)',
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
          <Box
            aria-hidden="true"
            sx={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: `linear-gradient(135deg, ${NV_GREEN} 0%, ${NV_GREEN_DARK} 100%)`,
              boxShadow: '0 8px 24px rgba(118,185,0,0.35)',
            }}
          >
            <Memory sx={{ fontSize: 30, color: '#fff' }} />
          </Box>
          <Box>
            <Typography
              variant="h3"
              component="h1"
              sx={{ fontWeight: 800, fontSize: { xs: '1.7rem', md: '2.4rem' }, lineHeight: 1.1 }}
            >
              DLSS 5 Neural Rendering in ESO
            </Typography>
            {/* component="p": MUI maps the subtitle1 variant to <h6>, which would
                put a stray heading between the h1 and the first section h2. */}
            <Typography component="p" variant="subtitle1" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Every setting explained, plus the two ESO-specific traps that stop it working.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {[
            { label: 'Community guide', warn: false },
            { label: 'Unofficial / unsupported', warn: true },
            { label: 'NVIDIA RTX only', warn: false },
          ].map((c) => (
            <Chip
              key={c.label}
              size="small"
              label={c.label}
              variant="outlined"
              sx={{
                fontWeight: 600,
                color: c.warn ? 'warning.main' : 'text.primary',
                borderColor: c.warn
                  ? 'warning.main'
                  : isDark
                    ? 'rgba(118,185,0,0.45)'
                    : 'rgba(68,107,0,0.45)',
                background: isDark ? 'rgba(2,6,23,0.30)' : 'rgba(255,255,255,0.55)',
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* ── Fast path for readers arriving mid-failure ───────────────── */}
      <Alert
        severity="info"
        sx={{ mb: 3, borderRadius: '16px' }}
        action={
          <Button
            size="small"
            href="#troubleshooting"
            sx={{ fontWeight: 700, textTransform: 'none', color: 'inherit', whiteSpace: 'nowrap' }}
          >
            Jump to fixes
          </Button>
        }
      >
        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
          <strong>Already set up but not working?</strong> Every fix below is keyed to the log line
          it produces.
        </Typography>
      </Alert>

      {/* ── Risk callout ─────────────────────────────────────────────── */}
      <Alert
        severity="warning"
        icon={<Warning />}
        sx={{ mb: 4, borderRadius: '16px', alignItems: 'flex-start' }}
      >
        <AlertTitle sx={{ fontWeight: 800 }}>Read this before you start</AlertTitle>
        <Typography variant="body2" sx={{ mb: 1.25, lineHeight: 1.7 }}>
          This is an <strong>unofficial, unsupported</strong> modification. Neither ZeniMax nor
          NVIDIA endorses it, and ESO Toolkit is not affiliated with either.
        </Typography>
        <Box component="ul" sx={{ pl: 2.5, m: 0, '& li': { mb: 0.75, lineHeight: 1.7 } }}>
          <Typography component="li" variant="body2">
            <strong>It modifies a game file.</strong> The fix requires replacing the ESO-bundled{' '}
            <code>d3dcompiler_47.dll</code>. Back it up. Verifying game files or a patch may restore
            it and silently break the setup.
          </Typography>
          <Typography component="li" variant="body2">
            <strong>ZeniMax has never issued an official position on ReShade.</strong> ESO has no
            kernel-level anti-cheat, ReShade neither modifies <code>eso64.exe</code> nor reads game
            memory, and there are no known bans for it, but &ldquo;no known bans&rdquo; is not a
            guarantee, and this stack goes further than plain ReShade.
          </Typography>
          <Typography component="li" variant="body2">
            <strong>The Neural Rendering runtime is a modified NVIDIA binary.</strong> We do not
            host, link, or distribute <code>nvngx_dlssnr.dll</code>. You must source a build patched
            for your own GPU generation.
          </Typography>
          <Typography component="li" variant="body2">
            <strong>Use at your own risk.</strong> This costs real performance (see below) and can
            crash the client. If you are risk-averse about your account, skip it.
          </Typography>
        </Box>
      </Alert>

      {/* ── Table of contents ────────────────────────────────────────── */}
      <Box component="nav" aria-label="On this page" sx={{ ...cardSx, mb: { xs: 6, md: 8 } }}>
        <Typography component="h2" sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 1 }}>
          On this page
        </Typography>
        <Box
          component="ol"
          sx={{
            m: 0,
            pl: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            columnGap: 4,
            rowGap: 0.5,
          }}
        >
          {SECTIONS.map((s) => (
            <Box component="li" key={s.id} sx={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
              <Box
                component="a"
                href={`#${s.id}`}
                sx={{
                  color: 'text.primary',
                  textDecoration: 'underline',
                  textDecorationColor: 'rgba(118,185,0,0.5)',
                  '&:hover': { textDecorationColor: NV_GREEN },
                }}
              >
                {s.title}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <Section id="how-it-works" icon={<Layers />} title="How this works">
        <Box sx={cardSx}>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2.5 }}>
            ESO is DirectX 11 with <strong>no native DLSS</strong>, so there is no toggle to turn
            on. This stack assembles one out of parts. Every error in this guide belongs to a stage
            in that chain:
          </Typography>

          <PipelineDiagram />

          <Stack component="ol" spacing={1.5} sx={{ listStyle: 'none', p: 0, m: 0, mt: 3 }}>
            <ChainRow
              n="1"
              title="LaunchPad estimates motion"
              body="ESO does not output motion vectors, so iMMERSE LaunchPad derives them from the image with optical flow."
            />
            <ChainRow
              n="2"
              title="DLSS5_Feed packages the contract"
              body="It converts LaunchPad's output plus ReShade's depth buffer into the exact two textures DLSS expects: DLSS5_MV (RG16F, pixel motion) and DLSS5_Depth (R32F, raw hardware depth)."
            />
            <ChainRow
              n="3"
              title="The feeder add-on runs DLSS"
              body="dlss5-feed.addon64 opens a side D3D12 device, shares ESO's DX11 textures onto it, and asks NGX to create a DLAA feature."
            />
            <ChainRow
              n="4"
              title="RenoDX intercepts and adds Neural Rendering"
              body="renodx-dlss5.addon64 detours the NGX calls, and once a DLSS feature evaluates successfully it creates feature 18 (Neural Rendering) on top of it."
            />
          </Stack>
          <Alert severity="info" icon={<Info />} sx={{ mt: 2.5, borderRadius: '12px' }}>
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              <strong>Each stage needs the one before it.</strong> Neural Rendering attaches to a
              working DLSS feature, and that feature needs valid depth and motion.{' '}
              <Box component="a" href="#troubleshooting" sx={{ color: nvText, fontWeight: 700 }}>
                the troubleshooting section
              </Box>{' '}
              is ordered by stage. Fix the earliest failure, not the symptom you noticed.
            </Typography>
          </Alert>
        </Box>
      </Section>

      {/* ── Requirements ─────────────────────────────────────────────── */}
      <Section id="requirements" icon={<Info />} title="What you need">
        <Box sx={cardSx}>
          <SettingsTable rows={REQUIREMENTS} labelWidth={160} />
          <Alert severity="info" icon={<Info />} sx={{ mt: 2.5, borderRadius: '12px' }}>
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              Need a current <code>nvngx_dlss.dll</code>? TechPowerUp mirrors official NVIDIA DLSS
              DLLs at{' '}
              <Box
                component="a"
                href="https://www.techpowerup.com/download/nvidia-dlss-dll/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: nvText, fontWeight: 600, textDecoration: 'underline' }}
              >
                techpowerup.com/download/nvidia-dlss-dll
              </Box>
              . Grab a 310.x release. These are unmodified, NVIDIA-signed files.
            </Typography>
          </Alert>
        </Box>
      </Section>

      {/* ── Steps ────────────────────────────────────────────────────── */}
      <Section id="setup" icon={<Science />} title="Setup">
        <Box sx={{ ...cardSx, p: { xs: 2.5, md: 3.5 } }}>
          <Stack component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
            <StepRow n={1} last={false} title="Find your ESO client folder">
              <Typography variant="body2" sx={proseSx}>
                Every file in this guide goes in the folder that contains <code>eso64.exe</code>. On
                a default Steam install that is:
              </Typography>
              <CodeBlock copyable wrap copyLabel="Copy client folder path" sx={{ mt: 1.25 }}>
                {'steamapps\\common\\Zenimax Online\\The Elder Scrolls Online\\game\\client'}
              </CodeBlock>
              <Note>Keep this folder open; every remaining step drops a file here.</Note>
            </StepRow>

            <StepRow n={2} last={false} title="Install ReShade with add-on support">
              <Typography variant="body2" sx={proseSx}>
                Install ReShade for <code>eso64.exe</code>, choosing DirectX 10/11/12 and the build{' '}
                <strong>with full add-on support</strong>. The plain build cannot load{' '}
                <code>.addon64</code> files at all, so nothing in this guide will work on it.
                ReShade must land as <code>dxgi.dll</code> next to <code>eso64.exe</code>.
              </Typography>
              <Note>
                Already have ReShade? Check that <code>dxgi.dll</code> exists in the client folder
                and that it is version 6.x.
              </Note>
            </StepRow>

            <StepRow n={3} last={false} title="Add the shaders">
              <Typography variant="body2" sx={proseSx}>
                Four files, two destinations:
              </Typography>
              <Box
                component="ul"
                sx={{ pl: 2.5, mt: 0.75, mb: 0, '& li': { mb: 0.4, lineHeight: 1.7 } }}
              >
                <Typography component="li" variant="body2" sx={proseSx}>
                  <code>DLSS5_Feed.fx</code> → <code>reshade-shaders\Shaders</code>
                </Typography>
                <Typography component="li" variant="body2" sx={proseSx}>
                  <code>MartysMods_LAUNCHPAD.fx</code> → <code>reshade-shaders\Shaders</code>
                </Typography>
                <Typography component="li" variant="body2" sx={proseSx}>
                  the <code>MartysMods\</code> include folder → alongside those two .fx files
                </Typography>
                <Typography component="li" variant="body2" sx={proseSx}>
                  <code>iMMERSE_bluenoise_opt.png</code> → <code>reshade-shaders\Textures</code>
                </Typography>
              </Box>
              <Note>
                LaunchPad supplies the optical-flow motion vectors. Without it the feeder has
                nothing to hand NGX and sits idle.
              </Note>
            </StepRow>

            <StepRow n={4} last={false} title="Add the two add-ons">
              <Typography variant="body2" sx={proseSx}>
                Drop <code>dlss5-feed.addon64</code> and <code>renodx-dlss5.addon64</code> into the
                client folder. ReShade auto-discovers <code>.addon64</code> files next to the game
                exe, so there is no path to configure.
              </Typography>
              <Note>
                ReShade.log will confirm both loaded: look for two &ldquo;Registered add-on&rdquo;
                lines at startup.
              </Note>
            </StepRow>

            <StepRow n={5} last={false} title="Add the NGX runtimes">
              <Typography variant="body2" sx={proseSx}>
                You need two NVIDIA DLLs in the client folder: <code>nvngx_dlss.dll</code> (the DLSS
                super-resolution runtime) and <code>nvngx_dlssnr.dll</code> (the Neural Rendering
                runtime).
              </Typography>
              <Note>
                Version matters enormously. See{' '}
                <Box component="a" href="#requirements" sx={{ color: nvText, fontWeight: 700 }}>
                  what you need
                </Box>
                . This is where almost every failed setup goes wrong.
              </Note>
            </StepRow>

            <StepRow n={6} last={false} title="Replace ESO d3dcompiler_47.dll">
              <Typography variant="body2" sx={proseSx}>
                Without this, Neural Rendering silently never starts. Three actions:
              </Typography>
              <Box
                component="ol"
                sx={{ pl: 2.5, mt: 0.75, mb: 0, '& li': { mb: 0.4, lineHeight: 1.7 } }}
              >
                <Typography component="li" variant="body2" sx={proseSx}>
                  Close ESO completely. The DLL is locked while the game runs.
                </Typography>
                <Typography component="li" variant="body2" sx={proseSx}>
                  Rename the client folder <code>d3dcompiler_47.dll</code> to{' '}
                  <code>d3dcompiler_47.dll.bak</code>.
                </Typography>
                <Typography component="li" variant="body2" sx={proseSx}>
                  Copy the system one in. Run this <strong>from inside the client folder</strong>.
                  The trailing <code>.</code> is the destination:
                </Typography>
              </Box>
              <CodeBlock copyable wrap copyLabel="Copy d3dcompiler command" sx={{ mt: 1.25 }}>
                {'copy "C:\\Windows\\System32\\d3dcompiler_47.dll" .'}
              </CodeBlock>
            </StepRow>

            <StepRow n={7} last={false} title="Turn off in-game anti-aliasing">
              <Typography variant="body2" sx={proseSx}>
                In ESO video settings, disable MSAA/SSAA and set resolution scale to 100%. The
                feeder hands NGX a full-resolution depth buffer, and any multisampling breaks that
                contract.
              </Typography>
            </StepRow>

            <StepRow n={8} last title="Enable the effects in the right order">
              <Typography variant="body2" sx={proseSx}>
                Launch ESO, press <strong>Home</strong>, and enable MartysMods_Launchpad first, then
                DLSS5_Feed directly below it. See{' '}
                <Box component="a" href="#overlay" sx={{ color: nvText, fontWeight: 700 }}>
                  the overlay walkthrough
                </Box>{' '}
                . Order is not cosmetic.
              </Typography>
            </StepRow>
          </Stack>
        </Box>
      </Section>

      {/* ── Overlay walkthrough ──────────────────────────────────────── */}
      <Section id="overlay" icon={<SettingsIcon />} title="Using the ReShade overlay">
        <Stack spacing={2}>
          <Box sx={cardSx}>
            <Typography variant="body2" sx={{ ...proseSx, mb: 2 }}>
              Press <strong>Home</strong> in-game to open ReShade. (First launch shows a tutorial;
              click through it.) You will use three tabs:
            </Typography>
            <SettingsTable rows={OVERLAY_TABS} labelWidth={120} />
          </Box>

          <Box sx={cardSx}>
            <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>
              Effect order (this matters)
            </Typography>
            <Typography variant="body2" sx={{ ...proseSx, mb: 1.5 }}>
              In the Home tab, tick these two <strong>in this order</strong>. Drag entries to
              reorder if they land wrong:
            </Typography>
            <CodeBlock sx={{ mb: 1.5 }}>
              {`[x] MartysMods_Launchpad     <- motion vector provider, must be ABOVE
[x] DLSS5_Feed               <- consumes them, must be BELOW`}
            </CodeBlock>
            <Typography variant="body2" sx={proseSx}>
              The add-on runs DLSS and Neural Rendering immediately after the DLSS5_Feed technique,
              so any effect you place <em>below</em> DLSS5_Feed is applied on top of the neural
              output. Anything above it feeds into the neural pass instead.
            </Typography>
          </Box>

          <Box sx={cardSx}>
            <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>
              DLSS5_Feed effect settings
            </Typography>
            <Typography variant="body2" sx={{ ...proseSx, mb: 1.5 }}>
              Select DLSS5_Feed in the effect list and its options appear underneath:
            </Typography>
            <SettingsTable rows={FEED_SETTINGS} labelWidth={210} />
          </Box>

          <Box sx={cardSx}>
            <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>
              If LaunchPad is not installed
            </Typography>
            <Typography variant="body2" sx={proseSx}>
              Whether LaunchPad is present is a compile-time question, not a runtime one. If you are
              using a different motion-vector provider, set <code>DLSS5_MV_SOURCE = 1</code> under{' '}
              <strong>Edit → Preprocessor definitions</strong> in the overlay. With LaunchPad
              installed (the default, <code>0</code>), both providers stay selectable from the
              dropdown with no recompile.
            </Typography>
          </Box>
        </Stack>
      </Section>

      {/* ── NR add-on panel ──────────────────────────────────────────── */}
      <Section id="nr-panel" icon={<Tune />} title="The Neural Rendering add-on panel">
        <Stack spacing={2}>
          <Typography variant="body2" sx={proseSx}>
            Overlay → <strong>Add-ons</strong> → <strong>DLSS 5 Neural Rendering</strong>. Read the
            status line at the top before touching any slider. It is the most useful diagnostic in
            the stack.
          </Typography>

          <Box sx={cardSx}>
            <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 1.5 }}>
              What the status line means
            </Typography>
            <Stack spacing={1.75}>
              {STATUSES.map((s) => (
                <Box
                  key={s.status}
                  sx={{
                    borderLeft: `3px solid ${s.good ? nvText : theme.palette.warning.main}`,
                    pl: 1.75,
                  }}
                >
                  <Chip
                    size="small"
                    icon={
                      s.good ? (
                        <CheckCircle sx={{ fontSize: 14 }} />
                      ) : (
                        <Warning sx={{ fontSize: 14 }} />
                      )
                    }
                    label={s.good ? 'Goal state' : 'Needs action'}
                    color={s.good ? 'success' : 'warning'}
                    variant="outlined"
                    sx={{ fontWeight: 700, height: 22, mb: 0.75 }}
                  />
                  <Typography
                    sx={{
                      fontFamily: MONO,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      mb: 0.4,
                      color: s.good ? nvText : 'text.primary',
                    }}
                  >
                    {s.status}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
                    {s.meaning}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Box sx={cardSx}>
            <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 1.5 }}>
              Every control
            </Typography>
            <SettingsTable rows={NR_SETTINGS} labelWidth={230} />
          </Box>

          <Alert severity="info" icon={<Info />} sx={{ borderRadius: '16px' }}>
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              <strong>To see it at all:</strong> stand still, look closely at a character&apos;s
              face, and tap <strong>F6</strong>. Faces, hair and fabric change most; terrain and sky
              barely move. If nothing changes, check the status line above rather than squinting
              harder.
            </Typography>
          </Alert>
        </Stack>
      </Section>

      {/* ── Depth buffer ─────────────────────────────────────────────── */}
      <Section id="depth-buffer" icon={<Layers />} title="Checking the depth buffer">
        <Box sx={cardSx}>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2 }}>
            The feeder needs <strong>scene depth</strong>. ESO presents several depth buffers and
            ReShade sometimes auto-selects a UI or shadow buffer. DLSS then runs on garbage, so the
            output looks wrong rather than missing.
          </Typography>

          <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>
            The quick visual check
          </Typography>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2 }}>
            Enable <code>DisplayDepth</code> in the effect list (it ships with every ReShade
            install). You should see the world in greyscale, near objects one shade and distant
            terrain another, with the UI flat and not part of the gradient. If the screen is blank
            white, blank black, or shows only your interface, the wrong buffer is selected.
          </Typography>

          <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>
            Fixing it
          </Typography>
          <Typography variant="body2" sx={{ ...proseSx, mb: 1.5 }}>
            Overlay → <strong>Add-ons</strong> → <strong>Generic Depth</strong>. You get a list of
            candidate buffers; the auto-selected one is highlighted. Pick manually using two rules:
          </Typography>
          <Box component="ul" sx={{ pl: 2.5, m: 0, mb: 2, '& li': { mb: 0.6 } }}>
            <Typography component="li" variant="body2" sx={proseSx}>
              Choose the buffer whose <strong>resolution matches your game resolution</strong> most
              closely.
            </Typography>
            <Typography component="li" variant="body2" sx={proseSx}>
              Among those, choose the one with the{' '}
              <strong>highest draw call and vertex counts</strong>.
            </Typography>
          </Box>
          <Typography variant="body2" sx={proseSx}>
            If depth flickers or disappears during combat, tick{' '}
            <strong>&ldquo;Copy depth buffer before clear operations&rdquo;</strong> in that same
            panel. Once it looks right, turn DisplayDepth back off; leaving it on overwrites your
            screen.
          </Typography>
          <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 2, borderRadius: '12px' }}>
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              A correct setup logs <code>Depth 2560x1440 R32_FLOAT</code> (at your resolution) in{' '}
              <code>dlss5-feed.log</code>. If the resolution there does not match your monitor, the
              wrong buffer is selected.
            </Typography>
          </Alert>
        </Box>
      </Section>

      {/* ── Verification ─────────────────────────────────────────────── */}
      <Section id="verify" icon={<CheckCircle />} title="Proving it works">
        <Box sx={cardSx}>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2 }}>
            The effect is subtle and easy to imagine seeing. Trust the logs. Both live in the client
            folder: play for 30 seconds, then read them.
          </Typography>

          <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>
            dlss5-feed.log — DLSS itself is alive
          </Typography>
          <CodeBlock copyable copyLabel="Copy expected feeder lines" sx={{ mb: 2.5 }}>
            {`NGX capabilities: SuperSampling.Available=1 NeedsUpdatedDriver=0 MinDriver=470.0
feature ready: 2560x1440 DLAA, flags=66 (SDR MVLowRes AutoExposure)
frame 1 delivered (2560x1440, reset=1)`}
          </CodeBlock>

          <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>
            ReShade.log — Neural Rendering is actually evaluating
          </Typography>
          <CodeBlock copyable copyLabel="Copy expected NR lines" sx={{ mb: 2.5 }}>
            {`signed DLSSNR 310.8.0 D3D12 runtime initialized
NGX feature create intercepted: feature=18 (DLSSNR/reserved-18), slot=0
feature 18 created via the signed snippet after DLSS/DLAA
inline feature 18 evaluation succeeded (count=60, ...)`}
          </CodeBlock>

          <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: '12px' }}>
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              <strong>feature 18</strong> is the one that matters. <code>feature=1</code> is
              ordinary DLSS/DLAA. If that is all you ever see, Neural Rendering is not running. The{' '}
              <code>count=</code> value must climb across frames; a count stuck at 1 means it
              evaluated once and stopped.
            </Typography>
          </Alert>
        </Box>
      </Section>

      {/* ── Config reference ─────────────────────────────────────────── */}
      <Section id="config" icon={<SettingsIcon />} title="Config file reference">
        <Box sx={cardSx}>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2 }}>
            The overlay writes these for you. They are here so you can diff a working setup against
            a broken one.
          </Typography>

          <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>
            ReShade.ini — the add-on section
          </Typography>
          <CodeBlock copyable copyLabel="Copy ReShade.ini section" sx={{ mb: 1.5 }}>
            {`[RenoDX.DLSS5]
EnableHooks=2      ; 2 = NGX hooks only. CORRECT for ESO.
                   ; 1 = also patch Streamline (ESO does not use it)
                   ; 0 = safe mode, all hooks off, no NR
NRPreset=0
NRStyle=2
NRSkinStructure=1.01
NREnableUpscaling=1`}
          </CodeBlock>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2.5 }}>
            The add-on suggests <code>EnableHooks=1</code> when it cannot find guide dimensions.
            That advice is for NVIDIA Streamline titles. <strong>ESO is not one.</strong> Leave it
            at 2; if NGX-only genuinely yields nothing, 1 is a last resort that can crash at boot.
          </Typography>

          <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>
            dlss5-feed.cfg — the feeder
          </Typography>
          <CodeBlock copyable copyLabel="Copy dlss5-feed.cfg" sx={{ mb: 1.5 }}>
            {`enabled=1          ; master switch
mode=2             ; feature mode
create_delay=60    ; frames to wait before building the DLSS feature
warmup_rebuild=180 ; one-off rebuild after warm-up
log_frames=3       ; how many opening frames to log individually
mv_scale_x=1.000   ; motion vector scale, diagnostic only
mv_scale_y=1.000
hdr=-1             ; -1 = auto-detect
depth_inverted=-1  ; -1 = auto-detect
flags=-1           ; -1 = auto`}
          </CodeBlock>
          <Typography variant="body2" sx={proseSx}>
            The <code>-1</code> values mean auto-detect and are almost always right; the feeder logs
            what it resolved them to.{' '}
            <strong>
              Do not hand-tune these unless a log line proves the auto-detection is wrong.
            </strong>{' '}
            Lowering <code>create_delay</code> in particular tends to cause failures, because the
            add-on re-arms its hooks asynchronously and the delay exists to wait for that.
          </Typography>
        </Box>
      </Section>

      {/* ── Troubleshooting ──────────────────────────────────────────── */}
      <Section id="troubleshooting" icon={<Warning />} title="When it does not work">
        <Typography variant="body2" sx={{ ...proseSx, mb: 2 }}>
          Work top to bottom. Each failure masks the ones after it.
        </Typography>
        <Stack spacing={1.5}>
          {FAILURES.map((f, i) => (
            <Accordion
              key={f.symptom}
              disableGutters
              elevation={0}
              defaultExpanded={i === 2}
              sx={{
                ...cardSx,
                p: 0,
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                overflow: 'hidden',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                id={`fail-${i}-header`}
                aria-controls={`fail-${i}-content`}
                sx={{ px: 2 }}
              >
                <Typography component="h3" sx={{ fontWeight: 700, fontSize: '0.92rem', m: 0 }}>
                  {f.symptom}
                </Typography>
              </AccordionSummary>
              <AccordionDetails id={`fail-${i}-content`} sx={{ px: 2, pt: 0, pb: 2 }}>
                <MicroLabel>What the log says</MicroLabel>
                <CodeBlock copyable copyLabel="Copy log line" sx={{ mb: 1.75 }}>
                  {f.log}
                </CodeBlock>
                <MicroLabel>Why</MicroLabel>
                <Typography variant="body2" sx={{ ...proseSx, mb: 1.75 }}>
                  {f.cause}
                </Typography>
                <MicroLabel>Fix</MicroLabel>
                <Typography variant="body2" sx={proseSx}>
                  {f.fix}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </Section>

      {/* ── Performance ──────────────────────────────────────────────── */}
      <Section id="performance" icon={<Speed />} title="What it costs">
        <Box sx={cardSx}>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2 }}>
            Neural Rendering is not free. Measured at 1440p on an RTX 4070 Ti Super, from the
            feeder&apos;s own frame accounting:
          </Typography>
          <CodeBlock sx={{ mb: 2 }}>
            {`before NR:  feed CPU  0.55 ms/frame | 143.9 fps | feed is  8% of the frame
after NR:   feed CPU 11.82 ms/frame |  63.9 fps | feed is 75% of the frame`}
          </CodeBlock>
          <Typography variant="body2" sx={proseSx}>
            Roughly half the framerate. NR runs inference on every frame, so some of that is
            unavoidable, but try a lighter <strong>NR Preset</strong> and lower{' '}
            <strong>NR Intensity</strong> before writing it off. The feeder prints its own cost
            every 600 frames, so measure on your own card.
          </Typography>
        </Box>
      </Section>

      {/* ── Footer CTA ───────────────────────────────────────────────── */}
      <Box
        sx={{
          ...cardSx,
          textAlign: 'center',
          background: isDark
            ? 'linear-gradient(135deg, rgba(118,185,0,0.16) 0%, rgba(0,200,255,0.05) 100%)'
            : 'linear-gradient(135deg, rgba(118,185,0,0.10) 0%, rgba(0,200,255,0.04) 100%)',
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 0.5 }}>
          Stuck on a step?
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Bring your <code>dlss5-feed.log</code> and <code>ReShade.log</code>. They name the exact
          failing stage.
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ justifyContent: 'center' }}
        >
          <Button
            variant="contained"
            href="https://discord.gg/mMjwcQYFdc"
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<ArrowForward />}
            sx={{
              borderRadius: '10px',
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.35)',
              background: `linear-gradient(135deg, ${NV_GREEN} 0%, ${NV_GREEN_DARK} 100%)`,
              boxShadow: '0 4px 16px rgba(118,185,0,0.35)',
              '&:hover': {
                color: '#fff',
                background: `linear-gradient(135deg, ${NV_GREEN_DARK} 0%, ${NV_GREEN_TEXT_LIGHT} 100%)`,
                boxShadow: '0 6px 22px rgba(118,185,0,0.5)',
              },
            }}
          >
            Ask on Discord
          </Button>
          <Button
            variant="outlined"
            component={RouterLink}
            to="/about"
            sx={{
              borderRadius: '10px',
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
              borderColor: 'rgba(118,185,0,0.4)',
              color: isDark ? '#d7f0a8' : NV_GREEN_TEXT_LIGHT,
              '&:hover': { borderColor: NV_GREEN, background: 'rgba(118,185,0,0.06)' },
            }}
          >
            About ESO Toolkit
          </Button>
        </Stack>
      </Box>
    </Container>
  );
};

// ── Small presentational helpers ────────────────────────────────────────────

/**
 * Owns the page's vertical rhythm (section 48/64px, heading 24px) so sections
 * stop carrying ad-hoc `mb` values, and gives each heading a stable anchor id.
 * `scrollMarginTop` keeps the sticky app bar from covering a hash target.
 */
const Section: React.FC<{
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ id, icon, title, children }) => (
  <Box component="section" sx={{ mb: { xs: 6, md: 8 } }}>
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        mb: 3,
        pb: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          width: 34,
          height: 34,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'text.secondary',
          background: (t) =>
            t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)',
          '& svg': { fontSize: 20 },
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="h5"
        component="h2"
        id={id}
        sx={{ fontWeight: 700, letterSpacing: '-0.01em', scrollMarginTop: { xs: 72, md: 88 } }}
      >
        {title}
      </Typography>
    </Stack>
    {children}
  </Box>
);

/**
 * One connected timeline instead of eight identical cards: the content is
 * inherently sequential, and a stack of same-sized glass rectangles made the
 * page centre featureless. Rendered as a real `ol`/`li` so assistive tech
 * announces position rather than relying on the painted badge.
 */
const StepRow: React.FC<{
  n: number;
  title: string;
  last: boolean;
  children: React.ReactNode;
}> = ({ n, title, last, children }) => (
  <Stack component="li" direction="row" spacing={2} sx={{ alignItems: 'stretch' }}>
    <Stack sx={{ alignItems: 'center', flexShrink: 0 }}>
      <Box
        aria-hidden="true"
        sx={{
          width: 30,
          height: 30,
          borderRadius: '9px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '0.85rem',
          color: '#fff',
          background: `linear-gradient(135deg, ${NV_GREEN} 0%, ${NV_GREEN_DARK} 100%)`,
        }}
      >
        {n}
      </Box>
      {!last && (
        <Box
          aria-hidden="true"
          sx={{
            width: '2px',
            flex: 1,
            my: 0.75,
            borderRadius: 1,
            background: 'rgba(118,185,0,0.28)',
          }}
        />
      )}
    </Stack>
    <Box sx={{ minWidth: 0, flex: 1, pb: last ? 0 : 3.5 }}>
      <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.5, mt: '3px' }}>
        {title}
      </Typography>
      {children}
    </Box>
  </Stack>
);

/**
 * The four pipeline stages as a diagram. Runs left-to-right on desktop and
 * top-to-bottom under sm, where four horizontal boxes would each be too narrow
 * to hold a filename. The final stage is accented because it is the one the
 * reader is trying to reach, and the one that silently never happens.
 */
const PipelineDiagram: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const accent = isDark ? NV_GREEN : NV_GREEN_TEXT_LIGHT;

  return (
    <Box
      aria-hidden="true"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'stretch',
        gap: 0.75,
      }}
    >
      {PIPELINE.map((p, i) => {
        const isLast = i === PIPELINE.length - 1;
        return (
          <React.Fragment key={p.stage}>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                px: 1.25,
                py: 1,
                borderRadius: '10px',
                textAlign: { xs: 'left', sm: 'center' },
                border: '1px solid',
                borderColor: isLast
                  ? isDark
                    ? 'rgba(118,185,0,0.45)'
                    : 'rgba(68,107,0,0.40)'
                  : isDark
                    ? 'rgba(255,255,255,0.10)'
                    : 'rgba(15,23,42,0.12)',
                background: isLast
                  ? isDark
                    ? 'rgba(118,185,0,0.10)'
                    : 'rgba(118,185,0,0.07)'
                  : isDark
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(15,23,42,0.03)',
              }}
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  lineHeight: 1.4,
                  color: isLast ? accent : 'text.primary',
                }}
              >
                {p.stage}
              </Typography>
              <Typography
                sx={{
                  fontFamily: MONO,
                  fontSize: '0.68rem',
                  lineHeight: 1.5,
                  color: 'text.secondary',
                  overflowWrap: 'anywhere',
                }}
              >
                {p.by}
              </Typography>
            </Box>
            {!isLast && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                  fontSize: '0.9rem',
                  lineHeight: 1,
                  transform: { xs: 'rotate(90deg)', sm: 'none' },
                  py: { xs: 0.25, sm: 0 },
                }}
              >
                ›
              </Box>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
};

/** Italic aside under a step. Genuinely secondary, unlike the body copy. */
const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="body2"
    sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary', lineHeight: 1.6 }}
  >
    {children}
  </Typography>
);

/** Uppercase overline for the repeated log/why/fix labels inside accordions. */
const MicroLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="caption"
    sx={{
      display: 'block',
      fontWeight: 700,
      fontSize: '0.68rem',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'text.secondary',
      mb: 0.5,
    }}
  >
    {children}
  </Typography>
);

/**
 * Real `pre`/`code` rather than a styled div, so screen readers get code
 * semantics and selection behaves.
 *
 * Log and ini blocks default to `white-space: pre` with horizontal scroll:
 * readers visually diff these against their own files, and wrapping split
 * tokens like `SuperSampling.Available=1` and `0xBAD00010` mid-value on narrow
 * screens, which defeats the purpose. `wrap` is for single-line paths where
 * breaking is harmless. `tabIndex` keeps the scroll region keyboard reachable.
 *
 * Neutral slate rather than the brand green: green-on-green measured 3.7:1 in
 * light mode (an AA failure on the densest text of the page), and tinting every
 * block made the page read NVIDIA-lime instead of ESO Toolkit. The accent
 * survives as the left signal bar.
 */
const CodeBlock: React.FC<{
  children: string;
  copyable?: boolean;
  copyLabel?: string;
  wrap?: boolean;
  sx?: object;
}> = ({ children, copyable, copyLabel, wrap = false, sx }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{ position: 'relative', ...sx }}>
      <Box
        component="pre"
        tabIndex={0}
        sx={{
          m: 0,
          fontFamily: MONO,
          fontSize: '0.82rem',
          lineHeight: 1.7,
          color: isDark ? '#cbd5e1' : '#334155',
          background: isDark ? 'rgba(2,6,23,0.55)' : 'rgba(15,23,42,0.045)',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.10)',
          borderLeft: `3px solid ${isDark ? 'rgba(118,185,0,0.55)' : NV_GREEN_TEXT_LIGHT}`,
          borderRadius: '10px',
          px: 1.5,
          py: 1.25,
          pr: copyable ? 5 : 1.5,
          ...(wrap
            ? { whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }
            : { whiteSpace: 'pre', overflowX: 'auto' }),
        }}
      >
        <code>{children}</code>
      </Box>
      {copyable ? (
        // The button floats over a horizontally scrolling region, so the block's
        // right padding scrolls away with the content and cannot reserve space.
        // An opaque backdrop keeps long log lines legible as they pass underneath.
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            borderRadius: '8px',
            backdropFilter: 'blur(2px)',
            background: isDark ? 'rgba(2,6,23,0.85)' : 'rgba(241,243,246,0.92)',
          }}
        >
          <CopyButton value={children} label={copyLabel ?? 'Copy'} />
        </Box>
      ) : null}
    </Box>
  );
};

/**
 * Two-column definition table. The label column is a FIXED grid track rather
 * than a flex item with minWidth, so every description starts at the same
 * x-position no matter how long the longest label is. Labels are set in the
 * mono voice because they are literal on-screen control names, and rows are
 * zebra-striped so horizontal tracking survives multi-line values.
 */
const SettingsTable: React.FC<{
  rows: ReadonlyArray<{ label: string; value: string }>;
  labelWidth?: number;
}> = ({ rows, labelWidth = 220 }) => (
  <Box sx={{ mx: { xs: -1, md: -1.5 } }}>
    {rows.map((row, i) => (
      <Box
        key={row.label}
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: `minmax(0, ${labelWidth}px) minmax(0, 1fr)` },
          columnGap: 3,
          rowGap: 0.25,
          alignItems: 'baseline',
          px: { xs: 1, md: 1.5 },
          py: 1.25,
          borderRadius: '8px',
          background: (t) =>
            i % 2 === 1
              ? t.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.025)'
                : 'rgba(15,23,42,0.035)'
              : 'transparent',
        }}
      >
        <Typography
          sx={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: '0.8rem',
            lineHeight: 1.6,
            color: 'text.primary',
            overflowWrap: 'anywhere',
          }}
        >
          {row.label}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
          {row.value}
        </Typography>
      </Box>
    ))}
  </Box>
);

const ChainRow: React.FC<{ n: string; title: string; body: string }> = ({ n, title, body }) => (
  <Stack component="li" direction="row" spacing={1.75} sx={{ alignItems: 'flex-start' }}>
    <Typography
      aria-hidden="true"
      sx={{
        fontWeight: 800,
        fontSize: '0.8rem',
        color: 'text.secondary',
        minWidth: 18,
        flexShrink: 0,
        mt: 0.25,
      }}
    >
      {n}
    </Typography>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
        {body}
      </Typography>
    </Box>
  </Stack>
);
