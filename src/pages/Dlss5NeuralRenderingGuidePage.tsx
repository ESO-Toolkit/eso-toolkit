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

const NV_GREEN = '#76B900';
const NV_GREEN_DARK = '#5A8F00';

// ── Reusable copy-to-clipboard ──────────────────────────────────────────────

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
        aria-label={copied ? 'Copied' : `Copy ${value}`}
        sx={{
          minWidth: 0,
          px: 0.75,
          py: 0.25,
          color: copied ? NV_GREEN : 'text.secondary',
          '&:hover': { color: NV_GREEN, background: 'transparent' },
        }}
      >
        {copied ? <CheckIcon sx={{ fontSize: 16 }} /> : <ContentCopy sx={{ fontSize: 16 }} />}
      </Button>
    </Tooltip>
  );
};

// ── Content data ────────────────────────────────────────────────────────────

interface StepSpec {
  n: number;
  title: string;
  body: string;
  code?: string;
  note?: string;
}

const CLIENT_PATH = 'steamapps\\common\\Zenimax Online\\The Elder Scrolls Online\\game\\client';

const STEPS: ReadonlyArray<StepSpec> = [
  {
    n: 1,
    title: 'Find your ESO client folder',
    body: 'Every file in this guide goes in the folder that contains eso64.exe. On a default Steam install that is:',
    code: CLIENT_PATH,
    note: 'Keep this folder open — every remaining step drops a file here.',
  },
  {
    n: 2,
    title: 'Install ReShade with add-on support',
    body: 'Install ReShade for eso64.exe, choosing DirectX 10/11/12 and the build WITH full add-on support. The plain build cannot load .addon64 files at all, so nothing in this guide will work on it. ReShade must land as dxgi.dll next to eso64.exe.',
    note: 'Already have ReShade? Check that dxgi.dll exists in the client folder and that it is version 6.x.',
  },
  {
    n: 3,
    title: 'Add the shaders',
    body: 'Place DLSS5_Feed.fx and MartysMods_LAUNCHPAD.fx into reshade-shaders\\Shaders, the MartysMods\\ include folder alongside them, and iMMERSE_bluenoise_opt.png into reshade-shaders\\Textures.',
    note: 'LaunchPad supplies the optical-flow motion vectors. Without it the feeder has nothing to hand NGX and sits idle.',
  },
  {
    n: 4,
    title: 'Add the two add-ons',
    body: 'Drop dlss5-feed.addon64 and renodx-dlss5.addon64 into the client folder. ReShade auto-discovers .addon64 files next to the game exe, so there is no path to configure.',
    note: 'ReShade.log will confirm both loaded — look for two "Registered add-on" lines at startup.',
  },
  {
    n: 5,
    title: 'Add the NGX runtimes',
    body: 'You need two NVIDIA DLLs in the client folder: nvngx_dlss.dll (the DLSS super-resolution runtime) and nvngx_dlssnr.dll (the Neural Rendering runtime).',
    note: 'Version matters enormously — see the requirements above. This is where almost every failed setup goes wrong.',
  },
  {
    n: 6,
    title: 'Replace ESO d3dcompiler_47.dll',
    body: 'Close the game. Rename the client folder d3dcompiler_47.dll to d3dcompiler_47.dll.bak, then copy the system one over. Without this, Neural Rendering silently never starts (see troubleshooting).',
    code: 'copy C:\\Windows\\System32\\d3dcompiler_47.dll',
    note: 'The file is locked while ESO runs, so the copy will fail if the game is open.',
  },
  {
    n: 7,
    title: 'Turn off in-game anti-aliasing',
    body: 'In ESO video settings, disable MSAA/SSAA and set resolution scale to 100%. The feeder hands NGX a full-resolution depth buffer, and any multisampling breaks that contract.',
  },
  {
    n: 8,
    title: 'Enable the effects in the right order',
    body: 'Launch ESO, press Home, and enable MartysMods_Launchpad FIRST, then DLSS5_Feed directly below it. See the overlay walkthrough below — order is not cosmetic.',
  },
];

interface RowSpec {
  label: string;
  value: string;
}

const REQUIREMENTS: ReadonlyArray<RowSpec> = [
  {
    label: 'GPU',
    value:
      'NVIDIA RTX. The nvngx_dlssnr.dll must match your generation — a 50-series (Blackwell) NR runtime will not work on a 40-series (Ada) card, and vice versa.',
  },
  {
    label: 'nvngx_dlss.dll',
    value:
      'A 310.x build. Older 2.x runtimes fail outright — this is the single most common cause of a dead setup.',
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
      'One collapsible panel per add-on. DLSS 5 Neural Rendering and Generic Depth both live here — this is the panel most people never find.',
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
      'Drives the separate DLSS5_Feed_Debug technique — shows motion vectors (colour = direction, brightness = speed) or raw depth. Enable that technique only while checking, then turn it back off.',
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
      'Preset #1 / #2 / #3 — the neural model variant. Start at the default and change one thing at a time; presets differ more on faces and hair than on terrain.',
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
    value: 'Alternative colour transfer path. Leave at the default unless you have a specific reason.',
  },
  {
    label: 'HDR Transfer Strength / Scene Paper-White Scale',
    value:
      'HDR handling. ESO through this stack reports SDR (flags=66 in the feeder log), so these are not the knobs to reach for on a standard setup.',
  },
  {
    label: 'NR Toggle Key / Screenshot Key',
    value:
      'Rebindable. Defaults are F6 (toggle NR) and F5 (write a before/after screenshot pair). F5 needs an active NR evaluation — it disarms itself after ~10 seconds without one.',
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
      'The add-on is hooked correctly but nothing ever asked NGX for DLSS. On ESO this means the feeder failed — check dlss5-feed.log, not this panel.',
    good: false,
  },
  {
    status: 'DLSS is evaluating but the NR feature did not bind to an output.',
    meaning:
      'DLSS works, NR does not. Read the "Latest NR NGX result" value directly below it — a non-zero code means the NR runtime itself failed to initialise, and ReShade.log names the failing step.',
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
      'There is no nvngx_dlss.dll in the client folder at all. The NVIDIA driver ships nvngx_dlssg.dll but NOT a standalone DLSS super-resolution runtime, so there is nothing to fall back to. Deleting the local copy does not help — it makes things worse.',
    fix: 'Put a 310.x nvngx_dlss.dll back in the client folder. A healthy run reports SuperSampling.Available=1 with a non-zero MinDriver.',
  },
  {
    symptom: 'Everything loads but nothing looks different',
    log: "DLSS5 Generic proxy encode compilation failed with HRESULT 0x8876086c: error X3506: unrecognized compiler target 'cs_5_1'",
    cause:
      'The ESO-specific trap. ESO ships its own d3dcompiler_47.dll from the Windows 8.1 SDK (version 6.3.9600, dated 2013). Because it sits next to the exe it wins the DLL search order over the modern system copy. RenoDX compiles its proxy-encode shader at cs_5_1 — Shader Model 5.1 did not exist in 2013 — so the compile fails and feature 18 is never created. DLSS itself keeps working, which is why this looks like "nothing happened" rather than an error.',
    fix: 'Do step 6. Back up the client folder d3dcompiler_47.dll, then copy C:\\Windows\\System32\\d3dcompiler_47.dll over it. Close the game first or the file will be locked.',
  },
  {
    symptom: 'The effect list says DLSS5_Feed.fx is not loaded',
    log: 'DLSS5_Feed.fx is not loaded (technique/textures missing) -- install it into reshade-shaders\\Shaders and enable it below MartysMods_Launchpad.',
    cause:
      'Seen once at every effect reload, this is harmless — the feeder checks before ReShade finishes compiling. It only matters if the very next line does not say "technique found".',
    fix: 'If it never resolves: confirm both .fx files are in reshade-shaders\\Shaders, the MartysMods\\ folder sits beside them, and both techniques are ticked in the right order.',
  },
  {
    symptom: 'Image doubles, smears or ghosts while moving',
    log: '(no log line — this is a visual fault)',
    cause:
      'The motion vectors point the wrong way. The feeder and LaunchPad agree on convention, but a mismatch shows up as smearing in one axis.',
    fix: 'In the DLSS5_Feed effect settings, flip a component of "Motion vector sign (x, y)" from 1.0 to -1.0. Change one axis at a time and watch which direction the smearing stops.',
  },
  {
    symptom: 'NR says STANDBY / FAILED after DLSS is confirmed working',
    log: 'NO NR FEATURE MATCHED (STANDBY/FAILED)',
    cause:
      'Only now is nvngx_dlssnr.dll a legitimate suspect. Check "Latest NR NGX result" in the add-on overlay — a non-zero code means the NR runtime itself would not initialise on your card, usually a generation mismatch.',
    fix: 'Confirm you have the build patched for your GPU generation. Do not start here: chase this only after you have seen "feature ready: ... DLAA" in dlss5-feed.log.',
  },
];

// ── Page ────────────────────────────────────────────────────────────────────

export const Dlss5NeuralRenderingGuidePage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  React.useEffect(() => {
    document.title = 'DLSS 5 Neural Rendering in ESO | ESO Toolkit';
  }, []);

  const cardSx = {
    borderRadius: '16px',
    p: { xs: 2.5, md: 3 },
    border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
    background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(8px)',
  } as const;

  const codeBlockSx = {
    fontFamily: "Consolas, Monaco, 'Fira Code', monospace",
    fontSize: '0.82rem',
    lineHeight: 1.7,
    color: isDark ? '#d7f0a8' : NV_GREEN_DARK,
    background: isDark ? 'rgba(118,185,0,0.10)' : 'rgba(118,185,0,0.08)',
    border: isDark ? '1px solid rgba(118,185,0,0.22)' : '1px solid rgba(118,185,0,0.20)',
    borderRadius: '10px',
    px: 1.5,
    py: 1.25,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  } as const;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '20px',
          px: { xs: 3, md: 5 },
          py: { xs: 4, md: 5 },
          mb: 4,
          background: isDark
            ? 'linear-gradient(135deg, rgba(118,185,0,0.20) 0%, rgba(0,200,255,0.06) 100%)'
            : 'linear-gradient(135deg, rgba(118,185,0,0.12) 0%, rgba(0,200,255,0.05) 100%)',
          border: isDark ? '1px solid rgba(118,185,0,0.28)' : '1px solid rgba(118,185,0,0.18)',
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
          <Box
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
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Getting the unofficial DLSS 5 Feeder + RenoDX stack actually evaluating frames — every
              setting, and the ESO-specific traps that stop it.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Chip size="small" label="Community guide" sx={{ fontWeight: 600 }} />
          <Chip size="small" label="Unofficial / unsupported" sx={{ fontWeight: 600 }} />
          <Chip size="small" label="NVIDIA RTX only" sx={{ fontWeight: 600 }} />
        </Stack>
      </Box>

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
            memory, and there are no known bans for it — but &ldquo;no known bans&rdquo; is not a
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

      {/* ── How it works ─────────────────────────────────────────────── */}
      <SectionHeading icon={<Layers sx={{ color: NV_GREEN }} />} title="How this works" />
      <Box sx={{ ...cardSx, mb: 5 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: 2 }}>
          ESO is a DirectX 11 game with <strong>no native DLSS support</strong>, so there is no
          DLSS toggle to turn on. This stack fakes one. Understanding the chain makes every error
          message below obvious:
        </Typography>
        <Stack spacing={1.5}>
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
            <strong>Every link depends on the one before it.</strong> Neural Rendering can only
            attach to a working DLSS feature, which can only exist if the feeder built one, which
            needs valid depth and motion. That is why the troubleshooting section is ordered — fix
            the earliest failing stage, not the one whose symptom you noticed.
          </Typography>
        </Alert>
      </Box>

      {/* ── Requirements ─────────────────────────────────────────────── */}
      <SectionHeading icon={<Info sx={{ color: NV_GREEN }} />} title="What you need" />
      <Box sx={{ ...cardSx, mb: 5 }}>
        <SettingsTable rows={REQUIREMENTS} labelWidth={170} />
        <Alert severity="info" icon={<Info />} sx={{ mt: 2.5, borderRadius: '12px' }}>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            Need a current <code>nvngx_dlss.dll</code>? TechPowerUp mirrors official NVIDIA DLSS
            DLLs at{' '}
            <Box
              component="a"
              href="https://www.techpowerup.com/download/nvidia-dlss-dll/"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: NV_GREEN, fontWeight: 600 }}
            >
              techpowerup.com/download/nvidia-dlss-dll
            </Box>
            . Grab a 310.x release — these are unmodified, NVIDIA-signed files.
          </Typography>
        </Alert>
      </Box>

      {/* ── Steps ────────────────────────────────────────────────────── */}
      <SectionHeading icon={<Science sx={{ color: NV_GREEN }} />} title="Setup" />
      <Stack spacing={2} sx={{ mb: 5 }}>
        {STEPS.map((step) => (
          <Box key={step.n} sx={cardSx}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '9px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  color: '#fff',
                  background: `linear-gradient(135deg, ${NV_GREEN} 0%, ${NV_GREEN_DARK} 100%)`,
                }}
              >
                {step.n}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                  {step.body}
                </Typography>
                {step.code ? (
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 1.25 }}>
                    <Box sx={{ ...codeBlockSx, flex: 1 }}>{step.code}</Box>
                    <CopyButton value={step.code} label="Copy" />
                  </Stack>
                ) : null}
                {step.note ? (
                  <Typography
                    variant="body2"
                    sx={{ mt: 1.25, fontStyle: 'italic', color: 'text.secondary', opacity: 0.85 }}
                  >
                    {step.note}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          </Box>
        ))}
      </Stack>

      {/* ── Overlay walkthrough ──────────────────────────────────────── */}
      <SectionHeading
        icon={<SettingsIcon sx={{ color: NV_GREEN }} />}
        title="Using the ReShade overlay"
      />
      <Box sx={{ ...cardSx, mb: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: 2 }}>
          Press <strong>Home</strong> in-game to open ReShade. (First launch shows a tutorial —
          click through it.) You will use three tabs:
        </Typography>
        <SettingsTable rows={OVERLAY_TABS} labelWidth={130} />
      </Box>

      <Box sx={{ ...cardSx, mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>
          Effect order (this matters)
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: 1.5 }}>
          In the Home tab, tick these two <strong>in this order</strong>. Drag entries to reorder if
          they land wrong:
        </Typography>
        <Box sx={{ ...codeBlockSx, mb: 1.5 }}>
          {`[x] MartysMods_Launchpad     <- motion vector provider, must be ABOVE
[x] DLSS5_Feed               <- consumes them, must be BELOW`}
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
          The add-on runs DLSS and Neural Rendering immediately after the DLSS5_Feed technique, so
          any effect you place <em>below</em> DLSS5_Feed is applied on top of the neural output.
          Anything above it feeds into the neural pass instead.
        </Typography>
      </Box>

      <Box sx={{ ...cardSx, mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>
          DLSS5_Feed effect settings
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: 1.5 }}>
          Select DLSS5_Feed in the effect list and its options appear underneath:
        </Typography>
        <SettingsTable rows={FEED_SETTINGS} labelWidth={230} />
      </Box>

      <Box sx={{ ...cardSx, mb: 5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>
          If LaunchPad is not installed
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
          Whether LaunchPad is present is a compile-time question, not a runtime one. If you are
          using a different motion-vector provider, set{' '}
          <code>DLSS5_MV_SOURCE = 1</code> under <strong>Edit → Preprocessor definitions</strong> in
          the overlay. With LaunchPad installed (the default, <code>0</code>), both providers stay
          selectable from the dropdown with no recompile.
        </Typography>
      </Box>

      {/* ── NR add-on panel ──────────────────────────────────────────── */}
      <SectionHeading
        icon={<Tune sx={{ color: NV_GREEN }} />}
        title="The Neural Rendering add-on panel"
      />
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.8 }}>
        Overlay → <strong>Add-ons</strong> → <strong>DLSS 5 Neural Rendering</strong>. The status
        line at the top is the single most useful diagnostic in the whole stack — read it before
        touching any slider.
      </Typography>

      <Box sx={{ ...cardSx, mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 1.5 }}>
          What the status line means
        </Typography>
        <Stack spacing={1.5}>
          {STATUSES.map((s) => (
            <Box
              key={s.status}
              sx={{
                borderLeft: `3px solid ${s.good ? NV_GREEN : theme.palette.warning.main}`,
                pl: 1.75,
              }}
            >
              <Typography
                sx={{
                  fontFamily: "Consolas, Monaco, 'Fira Code', monospace",
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  mb: 0.4,
                  color: s.good ? NV_GREEN : 'text.primary',
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

      <Box sx={{ ...cardSx, mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 1.5 }}>Every control</Typography>
        <SettingsTable rows={NR_SETTINGS} labelWidth={260} />
      </Box>

      <Alert severity="info" icon={<Info />} sx={{ mb: 5, borderRadius: '16px' }}>
        <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
          <strong>Best way to actually see the effect:</strong> stand still, look at a character
          face at close range, and tap <strong>F6</strong> repeatedly. Faces, hair and fabric change
          most; terrain and sky barely move. If nothing changes at all, believe the logs over your
          eyes — check the status line above.
        </Typography>
      </Alert>

      {/* ── Depth buffer ─────────────────────────────────────────────── */}
      <SectionHeading icon={<Layers sx={{ color: NV_GREEN }} />} title="Checking the depth buffer" />
      <Box sx={{ ...cardSx, mb: 5 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: 2 }}>
          The feeder needs <strong>scene depth</strong>. ESO can present several depth buffers and
          ReShade&apos;s auto-selection sometimes picks a UI or shadow buffer instead — in which
          case DLSS runs on garbage and the output looks wrong rather than absent.
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 1 }}>
          The quick visual check
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: 2 }}>
          Enable <code>DisplayDepth</code> in the effect list (it ships with every ReShade install).
          You should see the world in greyscale — near objects one shade, distant terrain another —
          with the UI flat and not part of the gradient. If the screen is blank white, blank black,
          or shows only your interface, the wrong buffer is selected.
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 1 }}>Fixing it</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: 1.5 }}>
          Overlay → <strong>Add-ons</strong> → <strong>Generic Depth</strong>. You get a list of
          candidate buffers; the auto-selected one is highlighted. Pick manually using two rules:
        </Typography>
        <Box component="ul" sx={{ pl: 2.5, m: 0, mb: 2, '& li': { mb: 0.6 } }}>
          <Typography component="li" variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
            Choose the buffer whose <strong>resolution matches your game resolution</strong> most
            closely.
          </Typography>
          <Typography component="li" variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
            Among those, choose the one with the <strong>highest draw call and vertex counts</strong>.
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
          If depth flickers or disappears during combat, tick{' '}
          <strong>&ldquo;Copy depth buffer before clear operations&rdquo;</strong> in that same
          panel. Once it looks right, turn DisplayDepth back off — leaving it on overwrites your
          screen.
        </Typography>
        <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 2, borderRadius: '12px' }}>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            A correct setup logs{' '}
            <code>Depth 2560x1440 R32_FLOAT</code> (at your resolution) in{' '}
            <code>dlss5-feed.log</code>. If the resolution there does not match your monitor, the
            wrong buffer is selected.
          </Typography>
        </Alert>
      </Box>

      {/* ── Verification ─────────────────────────────────────────────── */}
      <SectionHeading icon={<CheckCircle sx={{ color: NV_GREEN }} />} title="Proving it works" />
      <Box sx={{ ...cardSx, mb: 5 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.7 }}>
          Do not trust your eyes — the effect is subtle and easy to imagine. Both log files live in
          the client folder. Play for about 30 seconds, then check them.
        </Typography>

        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 1 }}>
          dlss5-feed.log — DLSS itself is alive
        </Typography>
        <Box sx={{ ...codeBlockSx, mb: 2.5 }}>
          {`NGX capabilities: SuperSampling.Available=1 NeedsUpdatedDriver=0 MinDriver=470.0
feature ready: 2560x1440 DLAA, flags=66 (SDR MVLowRes AutoExposure)
frame 1 delivered (2560x1440, reset=1)`}
        </Box>

        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 1 }}>
          ReShade.log — Neural Rendering is actually evaluating
        </Typography>
        <Box sx={{ ...codeBlockSx, mb: 2.5 }}>
          {`signed DLSSNR 310.8.0 D3D12 runtime initialized
NGX feature create intercepted: feature=18 (DLSSNR/reserved-18), slot=0
feature 18 created via the signed snippet after DLSS/DLAA
inline feature 18 evaluation succeeded (count=60, ...)`}
        </Box>

        <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: '12px' }}>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            <strong>feature 18</strong> is the one that matters. <code>feature=1</code> is ordinary
            DLSS/DLAA — if that is all you ever see, Neural Rendering is not running. The{' '}
            <code>count=</code> value must climb across frames; a count stuck at 1 means it
            evaluated once and stopped.
          </Typography>
        </Alert>
      </Box>

      {/* ── Config reference ─────────────────────────────────────────── */}
      <SectionHeading icon={<SettingsIcon sx={{ color: NV_GREEN }} />} title="Config file reference" />
      <Box sx={{ ...cardSx, mb: 5 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: 2 }}>
          You should not normally need these — the overlay writes them for you. They are here for
          when you want to compare a working setup against a broken one.
        </Typography>

        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 1 }}>
          ReShade.ini — the add-on section
        </Typography>
        <Box sx={{ ...codeBlockSx, mb: 1.5 }}>
          {`[RenoDX.DLSS5]
EnableHooks=2      ; 2 = NGX hooks only. CORRECT for ESO.
                   ; 1 = also patch Streamline (ESO does not use it)
                   ; 0 = safe mode, all hooks off, no NR
NRPreset=0
NRStyle=2
NRSkinStructure=1.01
NREnableUpscaling=1`}
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: 2.5 }}>
          The add-on suggests <code>EnableHooks=1</code> when it cannot find guide dimensions — that
          advice is for NVIDIA Streamline titles. <strong>ESO is not one.</strong> Leave it at 2; if
          NGX-only genuinely yields nothing, 1 is a last resort that can crash at boot.
        </Typography>

        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 1 }}>
          dlss5-feed.cfg — the feeder
        </Typography>
        <Box sx={{ ...codeBlockSx, mb: 1.5 }}>
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
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
          The <code>-1</code> values mean auto-detect and are almost always right — the feeder logs
          what it resolved them to. <strong>Do not hand-tune these unless a log line proves the
          auto-detection is wrong.</strong> Lowering <code>create_delay</code> in particular tends to
          cause failures, because the add-on re-arms its hooks asynchronously and the delay exists
          to wait for that.
        </Typography>
      </Box>

      {/* ── Troubleshooting ──────────────────────────────────────────── */}
      <SectionHeading icon={<Warning sx={{ color: NV_GREEN }} />} title="When it does not work" />
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.7 }}>
        Work these in order. Each failure hides the next one, so a green result at one stage is what
        unlocks diagnosing the stage after it.
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 5 }}>
        {FAILURES.map((f, i) => (
          <Accordion
            key={f.symptom}
            disableGutters
            elevation={0}
            defaultExpanded={i === 2}
            sx={{
              borderRadius: '12px !important',
              border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
              background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.6)',
              '&:before': { display: 'none' },
              overflow: 'hidden',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.92rem' }}>{f.symptom}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}
              >
                What the log says
              </Typography>
              <Box sx={{ ...codeBlockSx, mb: 1.75 }}>{f.log}</Box>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}
              >
                Why
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 1.5 }}>
                {f.cause}
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}
              >
                Fix
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                {f.fix}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>

      {/* ── Performance ──────────────────────────────────────────────── */}
      <SectionHeading icon={<Speed sx={{ color: NV_GREEN }} />} title="What it costs" />
      <Box sx={{ ...cardSx, mb: 5 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.7 }}>
          Neural Rendering is not free. Measured at 1440p on an RTX 4070 Ti Super, from the
          feeder&apos;s own frame accounting:
        </Typography>
        <Box sx={{ ...codeBlockSx, mb: 2 }}>
          {`before NR:  feed CPU  0.55 ms/frame | 143.9 fps | feed is  8% of the frame
after NR:   feed CPU 11.82 ms/frame |  63.9 fps | feed is 75% of the frame`}
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
          That is roughly half the framerate. Some of it is inherent — NR runs inference every frame
          — but try a lighter <strong>NR Preset</strong> and a lower <strong>NR Intensity</strong>{' '}
          before deciding the trade is not worth it. Results vary considerably by GPU. The feeder
          prints its own cost every 600 frames, so you can measure rather than guess.
        </Typography>
      </Box>

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
          Bring your <code>dlss5-feed.log</code> and <code>ReShade.log</code> — they name the exact
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
                background: `linear-gradient(135deg, ${NV_GREEN_DARK} 0%, #446B00 100%)`,
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
              color: isDark ? '#d7f0a8' : NV_GREEN_DARK,
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

const SectionHeading: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
    {icon}
    <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
      {title}
    </Typography>
  </Stack>
);

/**
 * Two-column definition table. The label column is a FIXED grid track rather than
 * a flex item with minWidth, so every description in a table starts at the same
 * x-position no matter how long the longest label is — a flex minWidth lets long
 * labels push their own row's value column right and the left edge goes ragged.
 */
const SettingsTable: React.FC<{
  rows: ReadonlyArray<{ label: string; value: string }>;
  labelWidth?: number;
}> = ({ rows, labelWidth = 220 }) => (
  <Box>
    {rows.map((row, i) => (
      <Box
        key={row.label}
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: `minmax(0, ${labelWidth}px) minmax(0, 1fr)`,
          },
          columnGap: 3,
          rowGap: 0.25,
          alignItems: 'baseline',
          py: 1.5,
          ...(i > 0 && {
            borderTop: '1px solid',
            borderColor: 'divider',
          }),
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.6 }}>
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
  <Stack direction="row" spacing={1.75} sx={{ alignItems: 'flex-start' }}>
    <Typography
      sx={{
        fontWeight: 800,
        fontSize: '0.8rem',
        color: NV_GREEN,
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
