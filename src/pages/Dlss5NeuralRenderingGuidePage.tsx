/**
 * Community setup guide for running the unofficial DLSS 5 Feeder + RenoDX
 * Neural Rendering stack in The Elder Scrolls Online (route: /docs/dlss5-neural-rendering).
 *
 * ESO does ship DLSS and DLAA natively — it was the first game ever to support
 * DLAA, back in 2021 — but the runtime it bundles is nvngx_dlss.dll 2.2.16, a
 * late-2021 build, the one ESO launched DLSS/DLAA with, superseded within weeks
 * and never updated since. It predates the DLAA quality-mode value, the render
 * presets and everything Neural Rendering needs, so the stack replaces it with a
 * 310.x runtime
 * and has ReShade synthesise the DLSS contract (colour + depth + motion vectors)
 * for NGX on a side D3D12 device. Two ESO-specific gotchas break it, and both are
 * app-local DLLs shadowing newer copies — the troubleshooting section is written
 * around the exact log lines each failure produces.
 *
 * Do not reintroduce "ESO has no DLSS" framing: it is factually wrong (the options
 * are in the in-game Anti-Aliasing dropdown, but only on RTX cards, which is why
 * they get missed) and it contradicts the troubleshooting section, which correctly
 * blames a 2.2.16 leftover for 0xBAD00010.
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
 *
 * The motion-vector provider is a CHOICE, not a fixture, and the setting that
 * picks it changed generation. Do not reintroduce "install LaunchPad" as the
 * only path: upstream (DLSS5-Feeder README) lists five providers behind one
 * preprocessor definition, DLSS5_MV_PROVIDER (0-4, default 0, recommended 3 =
 * LumeniteFX Kernel), while 0.4.x shaders — a pre-release build, not a tagged
 * upstream version — use the older two-level scheme of
 * DLSS5_MV_SOURCE (preprocessor) plus a runtime MV_PROVIDER combo with only
 * two entries. Both are documented here because readers arrive on either; the
 * version test is which name their own DLSS5_Feed.fx references. What did not
 * change is the ordering rule, and that is the failure that never announces
 * itself, so it stays prominent.
 */

import { ArrowForward, Check as CheckIcon, ContentCopy, ExpandMore } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Container,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { usePageTitle } from '@/hooks/useDocumentTitle';

import discordIcon from '../assets/discord-icon.svg';

/**
 * Colour system: cyan does structure, green means "it works", amber means
 * "careful". Three competing brand hues became two semantic ones, so the page
 * belongs to ESO Toolkit first. That also settles a real clash - the theme's
 * focus rings, scrollbars and header are cyan and land on this page regardless.
 */
/** Structural accent, matching the site. 8.7:1 on the app background. */
const ACCENT_DARK = '#38bdf8';
/** Light-mode structural accent. 5.9:1 on white; the theme's light accent is an ink, not a hue. */
const ACCENT_TEXT_LIGHT = '#0369a1';
/** Ink on cyan fills. 7.8:1 on #38bdf8. */
const ON_ACCENT_INK = '#062033';
/** Semantic success. NVIDIA green survives here and only here, which is the one
 *  place the brand nod earns itself: it is the state the whole guide chases. */
const GOOD_TEXT_DARK = '#76B900';
/** 6.3:1 on white. Plain #76B900 is 2.4:1 in light mode and fails AA. */
const GOOD_TEXT_LIGHT = '#446B00';
/** Documentation amber for caution. 8.1:1 dark. */
const CAUTION_TEXT_DARK = '#d4a24e';
/** 7.3:1 on white. */
const CAUTION_TEXT_LIGHT = '#7a4d00';

/**
 * Cascadia Mono ships with Windows 11 and sits better beside Inter; Consolas is
 * the identical-metrics fallback. Both are static at 400/700 only, so mono never
 * asks for 600, which the browser would otherwise synthesise.
 */
const MONO = "'Cascadia Mono', Consolas, 'SF Mono', Monaco, 'Fira Code', ui-monospace, monospace";

/**
 * Variable-weight stops. Hierarchy comes from the distance between stops rather
 * than maximum boldness. Space Grotesk Variable is wght 300-700, so nothing may
 * exceed 700 - the previous 800-weight h1 was being faux-bolded by the browser.
 */
const W = { bodyDark: 410, body: 430, label: 560, semi: 580, heading: 640 } as const;

/**
 * The four stages every part of this page is organised around: the setup order,
 * the troubleshooting order, and which log file to read all follow it. Rendered
 * as a diagram so the reader can see where their failure sits.
 */
const PIPELINE = [
  { stage: 'Motion', by: 'MV provider .fx' },
  { stage: 'Contract', by: 'DLSS5_Feed.fx' },
  { stage: 'DLSS', by: 'dlss5-feed' },
  { stage: 'Neural Rendering', by: 'renodx-dlss5' },
] as const;

const PAGE_URL = 'https://esotk.com/docs/dlss5-neural-rendering/';
const LAST_UPDATED = 'September 2026';

/**
 * Mirrors BuildLeaderboardPage: `<` inside the payload would close the script
 * block early. This page's content genuinely contains one (the effect-order
 * diagram uses `<-`), so the plain JSON.stringify used elsewhere is not enough.
 */
const serializeJsonLd = (value: unknown): string => JSON.stringify(value).replace(/</g, '\u003c');

/**
 * Google retired HowTo rich results in 2023 and restricted FAQ ones, so this
 * wins no rich snippet. It is here for entity clarity: "DLSS 5 Neural
 * Rendering" is an ambiguous term, and the publisher/date signals matter for a
 * page giving instructions that modify a game install.
 */
const TECH_ARTICLE_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  '@id': `${PAGE_URL}#article`,
  headline: 'DLSS 5 Neural Rendering in ESO: Setup & Fixes',
  description:
    'Community guide to running the unofficial DLSS 5 Feeder + RenoDX Neural Rendering stack in The Elder Scrolls Online via ReShade, with troubleshooting keyed to exact log lines.',
  url: PAGE_URL,
  mainEntityOfPage: PAGE_URL,
  inLanguage: 'en',
  proficiencyLevel: 'Expert',
  dateModified: '2026-09-02',
  about: { '@type': 'VideoGame', name: 'The Elder Scrolls Online' },
  publisher: { '@type': 'Organization', name: 'ESO Toolkit', url: 'https://esotk.com' },
} as const;

/**
 * Step text deliberately says only "matching your GPU generation" for the NR
 * runtime. The guide does not distribute that binary and its sourcing should
 * not be amplified into metadata.
 */
const HOW_TO_LD = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  '@id': `${PAGE_URL}#setup`,
  name: 'Set up DLSS 5 Neural Rendering in The Elder Scrolls Online',
  description:
    "Install ReShade with add-on support, add the DLSS 5 Feeder and RenoDX add-ons, and enable Neural Rendering in ESO by replacing the game's bundled 2.2.16 DLSS runtime with a 310.x build.",
  tool: [
    'ReShade 6.8+ with full add-on support',
    'nvngx_dlss.dll (310.x)',
    'nvngx_dlssnr.dll (matching GPU generation)',
    'dlss5-feed.addon64, plus one neural consumer: renodx-dlss5.addon64 (what this guide documents) or Deep Fried Chicken (the current upstream pick). Never both.',
    'DLSS5_Feed.fx and a motion-vector provider shader (LumeniteFX Kernel or iMMERSE LaunchPad)',
  ].map((name) => ({ '@type': 'HowToTool', name })),
  step: [
    ['Find your ESO client folder', 'Every file goes in the folder containing eso64.exe.'],
    [
      'Install ReShade with add-on support',
      'Install ReShade 6.8 or newer for eso64.exe (DirectX 10/11/12) using the build with full add-on support, landing as dxgi.dll next to eso64.exe.',
    ],
    [
      'Add the shaders',
      "Copy DLSS5_Feed.fx into reshade-shaders\\Shaders, then add one motion-vector provider from its own repository: LumeniteFX Kernel (the current upstream recommendation) or iMMERSE LaunchPad, with that provider's includes beside the .fx files and its textures in reshade-shaders\\Textures.",
    ],
    [
      'Add the two add-ons',
      'Drop dlss5-feed.addon64 and one neural consumer into the client folder; ReShade auto-discovers them. This guide is written around renodx-dlss5.addon64. From feeder 0.11 upstream recommends Deep Fried Chicken instead (three files: deep-fried-chicken.addon64, deep-fried-chicken-nvngx.dll, deep-fried-chicken.cfg), which needs the same two NGX runtimes and the same motion vectors. Install exactly one: if Deep Fried Chicken finds RenoDX loaded beside it, it does nothing at all for the whole session, silently.',
    ],
    [
      'Add the NGX runtimes',
      'Place a 310.x nvngx_dlss.dll and an nvngx_dlssnr.dll matching your GPU generation in the client folder.',
    ],
    [
      'Replace the ESO-bundled d3dcompiler_47.dll',
      'Close ESO, rename the client-folder d3dcompiler_47.dll to .bak, then copy the system copy in. Without this, Neural Rendering silently never starts.',
    ],
    [
      'Turn off in-game anti-aliasing',
      "In ESO video settings set Sub-Sampling Quality to High so the game renders at full resolution. On RTX cards also set Anti-Aliasing away from DLSS and DLAA: ESO's own DLSS renders below output resolution and breaks ReShade's depth buffer, and DLAA adds a second temporal pass.",
    ],
    [
      'Enable the effects in the right order',
      'In the ReShade overlay, enable your motion-vector provider technique first, then DLSS5_Feed directly below it. Only one provider may be enabled. LumeniteFX installs eight techniques; only LUMENITE: Kernel 2.0 is the one you want here, and the rest can stay off — nothing else in the pack is needed and none of it is required by Kernel.',
    ],
  ].map(([name, text], i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name,
    text,
    url: `${PAGE_URL}#setup`,
  })),
} as const;

// ── Section registry: single source of truth for headings, ids and the TOC ──

const SECTIONS = [
  { id: 'how-it-works', title: 'How this works' },
  { id: 'requirements', title: 'Requirements' },
  { id: 'setup', title: 'Setup' },
  { id: 'verify', title: "Verify it's working" },
  { id: 'log-noise', title: 'Warnings you can ignore' },
  { id: 'troubleshooting', title: 'Troubleshooting: fixes by log line' },
  { id: 'performance', title: 'What it costs' },
  { id: 'frame-generation', title: 'Getting the performance back' },
  { id: 'feeder-setup', title: 'Fallback: the two-add-on feeder path' },
  { id: 'overlay', title: 'Using the ReShade overlay' },
  { id: 'nr-panel', title: 'The Neural Rendering add-on panel' },
  { id: 'depth-buffer', title: 'Checking the depth buffer' },
  { id: 'config', title: 'Config file reference' },
  { id: 'credits', title: 'Credits and downloads' },
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
            width: '1px',
            height: '1px',
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

/**
 * Grouped in pairs rather than a flat list. A wrapping flex row cannot know
 * where it will break, so any separator eventually lands at the start or end of
 * a line and reads as a stray indent. Two fixed rows on mobile, one on desktop,
 * means a dot is only ever between two terms on the same line.
 */
const COLOPHON: ReadonlyArray<ReadonlyArray<{ text: string; caution?: boolean }>> = [
  [{ text: 'Community guide' }, { text: 'Unofficial & unsupported', caution: true }],
  [{ text: 'NVIDIA RTX only' }, { text: `Updated ${LAST_UPDATED}` }],
];

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
      'A 310.x build, replacing the 2.2.16 copy ESO ships. Older 2.x runtimes fail outright, so check the version rather than assuming a missing file. This is the most common cause of a dead setup.',
  },
  {
    label: 'ReShade',
    value:
      '6.8 or newer, installed for eso64.exe as dxgi.dll, WITH full add-on support. That is a different download from the plain build, and it is the unsigned one — the plain build will not load .addon64 files at all, so none of this works on it. Some anti-cheat setups treat the add-on build differently for exactly that reason; ESO has no kernel-level anti-cheat, but if you also play something that does, know which build you have installed.',
  },
  {
    label: 'Add-ons',
    value: 'dlss5-feed.addon64 and renodx-dlss5.addon64, both in the client folder.',
  },
  {
    label: 'Shaders',
    value:
      'DLSS5_Feed.fx plus exactly one motion-vector provider and its includes/textures. LumeniteFX Kernel is the current upstream recommendation; iMMERSE LaunchPad (MartysMods_LAUNCHPAD.fx, the MartysMods includes and iMMERSE_bluenoise_opt.png) is a valid and widely-used alternative.',
  },
];

const OVERLAY_TABS: ReadonlyArray<RowSpec> = [
  {
    label: 'Home',
    value:
      "The effect list. This is where you tick your motion-vector provider and DLSS5_Feed, and where each effect's own settings appear when you select it.",
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
      'Only on 0.4.x, where MV_PROVIDER is a runtime dropdown with two entries — leave it matching the provider you actually enabled. Current builds have no dropdown here: the provider is fixed at compile time by DLSS5_MV_PROVIDER. See "Choosing a motion-vector provider" below.',
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

/**
 * Transcribed from the DLSS5-Feeder README's provider table. The label is the
 * `DLSS5_MV_PROVIDER` value because that is what the reader types; the value
 * names the technique they must tick, because picking the definition and
 * enabling a different technique is the documented silent failure.
 */
const MV_PROVIDERS: ReadonlyArray<RowSpec> = [
  {
    label: '0 — shared texMotionVectors',
    value:
      "The old convention: anything writing the shared texMotionVectors texture (qUINT, dh_uber_motion, ReshadeMotionEstimation). Enable that shader's own technique. This is the definition's default value, not the recommendation — and upstream reports DRME no longer compiles on ReShade 6.8.",
  },
  {
    label: '1 — iMMERSE LaunchPad',
    value:
      "Technique: Launchpad. MartysMods. The feed also files LaunchPad's per-frame optical-flow request, so it works without iMMERSE RTGI running. Upstream notes warping around flames and transparents is worst on this one.",
  },
  { label: '2 — VORT', value: 'Technique: vort_Motion. MIT-licensed.' },
  {
    label: '3 — LumeniteFX Kernel',
    value:
      'Technique: "LUMENITE: Kernel 2.0". The recommended value. Eighth-resolution flow plus a confidence map that the feed actually consumes, and the configuration upstream tuned this beta on. Set the definition to 3 yourself; it is not the default.',
  },
  {
    label: '4 — LumeniteFX QuantMotion',
    value: 'Technique: "LUMENITE: QuantMotion". Same shape as Kernel with a different estimator.',
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

const FRAME_GEN: ReadonlyArray<RowSpec> = [
  {
    label: 'NVIDIA Smooth Motion',
    value:
      'Driver-level frame generation for games with no native frame generation, which is exactly ESO — its 2021 DLSS integration is super-resolution and DLAA only. RTX 40 and 50 series only. Enable it per-game in the NVIDIA App under Graphics, Program Settings, then Driver Settings. Free, no extra process, and the first thing to try on a supported card.',
  },
  {
    label: 'Lossless Scaling',
    value:
      'A paid Steam utility that generates frames for anything, including AMD and older NVIDIA cards. Offers higher multipliers than Smooth Motion. If its overlay fights ReShade, switch its capture API between DXGI and WGC.',
  },
  {
    label: 'Do not run both',
    value:
      'Smooth Motion and Lossless Scaling at the same time is worse than either alone. Pick one.',
  },
];

const CREDITS: ReadonlyArray<RowSpec> = [
  {
    label: 'ReShade',
    value: 'By crosire. The injector and add-on framework everything here runs on. reshade.me',
  },
  {
    label: 'LumeniteFX',
    value:
      'By Umar Afzaal. Kernel 2.0 is the motion-vector provider DLSS5-Feeder currently recommends (DLSS5_MV_PROVIDER = 3); QuantMotion is the same shape with a different estimator. github.com/umar-afzaal/LumeniteFX',
  },
  {
    label: 'iMMERSE LaunchPad',
    value:
      'By Marty McFly (Pascal Gilcher). The motion-vector provider this guide was originally written around, and still a supported choice (DLSS5_MV_PROVIDER = 1). github.com/martymcmodding/iMMERSE',
  },
  {
    label: 'VORT',
    value:
      'MIT-licensed. The third provider option, DLSS5_MV_PROVIDER = 2, technique vort_Motion. Listed because upstream supports it; we have not tested it in ESO.',
  },
  {
    label: 'RenoDX',
    value:
      'By clshortfuse. The Neural Rendering add-on is built on it. github.com/clshortfuse/renodx',
  },
  {
    label: 'ReshadeMotionEstimation',
    value:
      'By Jakob Wapenhensch (CC BY-NC 4.0). One of the shaders that writes the shared texMotionVectors, so it falls under provider 0 — but upstream reports it does not compile on ReShade 6.8, and a technique that fails to compile still ticks on while writing nothing. Do not start here. github.com/JakobPCoder/ReshadeMotionEstimation',
  },
  {
    label: 'DLSS 5 Feeder',
    value:
      'The add-on and DLSS5_Feed.fx. Its README at github.com/jlrouzies-fr/DLSS5-Feeder is the source for the provider table on this page; the released binaries themselves carry no author string.',
  },
  {
    label: 'DLSS and NGX',
    value: 'NVIDIA. This guide is not affiliated with or endorsed by NVIDIA.',
  },
];

/**
 * Every one of these appears on a setup confirmed to be working. They are
 * documented because the log is noisy and each one looks alarming enough to
 * send someone down the wrong path for an hour.
 */
const LOG_NOISE_ROWS: ReadonlyArray<RowSpec> = [
  {
    label: 'Streamline interposer not found: sl.interposer.dll',
    value:
      'ESO ships no Streamline modules at all. Its 2021 DLSS integration predates Streamline entirely, so there is nothing to find.',
  },
  {
    label: 'streamline hook owner is active, but one or more requested hook groups are incomplete',
    value: 'Follows directly from the line above. Same cause, no action.',
  },
  {
    label: 'NVNGX parameter module is not loaded yet / NVNGX DLSS is not loaded yet',
    value:
      'Expected at DllMain time. The add-on loads before the driver modules do, which is the whole point of loading it early.',
  },
  {
    label: 'vtable::Hook(Failed to find NVSDK_NGX_D3D11_Init_with_ProjectID)',
    value: 'Optional export, along with three siblings. Harmless.',
  },
  {
    label:
      'cannot preserve unsupported D3D11 motion format 34; native DLSS output remains authoritative',
    value:
      'Fires once, usually beside "D3D11 proxy evaluation failed". This is the D3D11 proxy path declining; Neural Rendering then initialises on the D3D12 backend and runs normally. It is not the cause of a non-working setup.',
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
  /** Pre-expanded: the ESO-specific trap most readers arrive for. */
  defaultOpen?: boolean;
  log: string;
  cause: string;
  fix: string;
}

const FAILURES: ReadonlyArray<FailureSpec> = [
  {
    symptom: 'The add-on is listed in ReShade but nothing happens',
    defaultOpen: true,
    log: 'WARN  renodx-dlss.addon64 is not listed in ADDON.LoadFromDllMain.\n      Early DLSS hooks are not guaranteed for this session.',
    cause:
      'The add-on loaded too late. ESO creates a D3D12 device first, so ReShade loads add-ons during D3D12CreateDevice and hooks d3d11.dll afterwards. By the time the add-on is running, the DLSS entry points it needs are already past. It reports no error because nothing failed; it simply never got the chance.',
    fix: 'Close ESO. ReShade rewrites ReShade.ini when the game exits, so an edit made while it is running will be thrown away. Then add LoadFromDllMain=renodx-dlss.addon64 to the [ADDON] section. You will know it worked when the log says Loading externally registered add-on "RenoDX DLSS" instead of Loading add-on from a path, and the warning is gone.',
  },
  {
    symptom: 'CreateFeature fails immediately, or the session never opens',
    log: '[feed] CreateFeature failed 0xBAD00010 (UnsupportedParameter)\n[feed] failure: resource build\nstopped: repeated failures.\n\n[feed] NGX capabilities: SuperSampling.Available=0 NeedsUpdatedDriver=0 MinDriver=0.0\n[feed] DLSS super sampling is not available on this GPU/driver\nstopped: the D3D12/NGX session failed to start.',
    cause:
      'Both of these are one problem: the wrong version of nvngx_dlss.dll. ESO ships its own copy, so the file is almost certainly there — it is just 2.2.16, the build ESO launched DLSS and DLAA with in 2021 and has never updated. That predates the DLAA quality-mode value and the DLSS.Hint.Render.Preset.* parameters the feeder sets, so NGX rejects the parameter block outright (0xBAD00010) or reports no super-resolution capability at all. Deleting the local copy is not the fix either: the NVIDIA driver ships nvngx_dlssg.dll but NOT a standalone super-resolution runtime, so removing it leaves nothing to load.',
    fix: 'Check the version, do not check whether the file exists. Right-click nvngx_dlss.dll in the client folder, then Properties, then Details. If it reads 2.2.16 — or anything below 310 — replace it with a 310.x build. A healthy run reports SuperSampling.Available=1 with a non-zero MinDriver.',
  },
  {
    symptom: 'Everything loads but nothing looks different',
    defaultOpen: true,
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
    fix: "If it never resolves: confirm DLSS5_Feed.fx and your provider's .fx are in reshade-shaders\\Shaders, that provider's include folder sits beside them, and both techniques are ticked in the right order.",
  },
  {
    symptom: 'Sharp when you stand still, smeary when you move',
    log: 'MV probe ... 0% non-zero   (current builds; older ones print nothing)',
    cause:
      "The ordering rule. If the provider technique sits below DLSS5_Feed, or is not ticked at all, the feed still runs and nothing errors — it just reads last frame's vectors, or none. On current builds there is a second version of this: the shader is compiled for one DLSS5_MV_PROVIDER value while a different provider's technique is the one enabled. Upstream calls it the classic silent failure.",
    fix: 'Do not guess: open the add-on overlay and read its Motion vectors section, which names which of four things is wrong — the provider is not installed, it is installed but not ticked, it failed to compile, or a different provider is ticked than the one DLSS5_MV_PROVIDER selects. Fix whichever it names. A healthy line reads DLSS5_MV_PROVIDER=3 (LumeniteFX Kernel) -> Lumenite_Kernel (enabled).',
  },
  {
    symptom: 'Image doubles, smears or ghosts while moving',
    log: '(no log line; this is a visual fault)',
    cause:
      'The motion vectors point the wrong way. The feeder and its supported providers agree on convention, but a mismatch shows up as smearing in one axis.',
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
    const raf = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  /** Green that is safe as text in the current mode. */
  const accentText = isDark ? ACCENT_DARK : ACCENT_TEXT_LIGHT;
  const goodText = isDark ? GOOD_TEXT_DARK : GOOD_TEXT_LIGHT;
  const accentRule = isDark ? 'rgba(56,189,248,0.55)' : 'rgba(3,105,161,0.55)';

  const cardSx = {
    borderRadius: '12px',
    p: { xs: 2.5, md: 3 },
    border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(15,23,42,0.10)',
    background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.88)',
    boxShadow: isDark ? 'none' : '0 1px 3px rgba(15,23,42,0.05)',
  } as const;

  /**
   * Body copy. `text.secondary` is reserved for genuine asides and table values.
   * Dark mode runs one weight stop lighter because light-on-dark text blooms.
   * The `& code` rule matters: bare <code> in prose was falling back to the user
   * agent's default monospace instead of this page's stack.
   */
  const proseSx = {
    color: 'text.primary',
    fontSize: '1rem',
    lineHeight: 1.7,
    maxWidth: '68ch',
    fontWeight: isDark ? W.bodyDark : W.body,
    fontVariantNumeric: 'slashed-zero',
    '& strong': { fontWeight: 620 },
    '& code': {
      fontFamily: MONO,
      fontSize: '0.85em',
      fontVariantNumeric: 'normal',
      background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)',
      borderRadius: '4px',
      px: '0.25em',
      py: 0.1,
    },
  } as const;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      {/* ── Masthead ─────────────────────────────────────────────────
          A reference document opens with type and a rule, not a gradient
          panel with an app icon. The 2px green rule is the code block's left
          bar rotated: the accent stays scarce and structural. */}
      <Box
        component="header"
        sx={{
          mb: 4,
          pb: 3,
          borderBottom: `2px solid ${accentRule}`,
        }}
      >
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: W.heading,
            fontSize: { xs: '1.75rem', md: '2.5rem' },
            lineHeight: 1.08,
            letterSpacing: '-0.015em',
            textWrap: 'balance',
            mb: 1,
          }}
        >
          DLSS 5 Neural Rendering in&nbsp;ESO
        </Typography>
        {/* component="p": MUI maps the subtitle1 variant to <h6>, which would
            put a stray heading between the h1 and the first section h2. */}
        <Typography
          component="p"
          variant="subtitle1"
          sx={{
            color: 'text.secondary',
            fontSize: { xs: '1.05rem', md: '1.15rem' },
            lineHeight: 1.55,
            fontWeight: W.body,
            textWrap: 'pretty',
            mb: 1.75,
            maxWidth: '58ch',
          }}
        >
          Every setting explained, plus the two ESO-specific traps that stop it working.
        </Typography>
        {/* Colophon rather than chips: three outlined pills read as app UI, and
            a screen reader hits three stops instead of one sentence. The caution
            term is the only coloured token, so it flags without shouting. */}
        <Typography
          component="p"
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'baseline' },
            rowGap: 0.4,
            m: 0,
            fontFamily: MONO,
            fontSize: { xs: '0.66rem', sm: '0.7rem' },
            fontWeight: 400,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          {COLOPHON.map((group, gi) => (
            <React.Fragment key={gi}>
              {gi > 0 && <ColophonDot hideOnMobile />}
              <Box component="span" sx={{ display: 'flex', alignItems: 'baseline' }}>
                {group.map((item, ii) => (
                  <React.Fragment key={item.text}>
                    {ii > 0 && <ColophonDot />}
                    <Box
                      component="span"
                      sx={{
                        whiteSpace: 'nowrap',
                        color: item.caution
                          ? isDark
                            ? CAUTION_TEXT_DARK
                            : CAUTION_TEXT_LIGHT
                          : 'inherit',
                      }}
                    >
                      {item.text}
                    </Box>
                  </React.Fragment>
                ))}
              </Box>
            </React.Fragment>
          ))}
        </Typography>
      </Box>

      {/* ── Fast path for readers arriving mid-failure ───────────────── */}
      <Callout tone="info" label="Already set up but not working?" sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
          Every fix below is keyed to the log line it produces.{' '}
          <Box
            component="a"
            href="#troubleshooting"
            sx={{
              color: accentText,
              fontWeight: W.semi,
              textDecoration: 'underline',
              textDecorationColor: isDark ? 'rgba(56,189,248,0.4)' : 'rgba(3,105,161,0.4)',
            }}
          >
            Jump to the fixes
          </Box>
          .
        </Typography>
      </Callout>

      {/* ── Risk callout ─────────────────────────────────────────────── */}
      <Callout tone="caution" label="Read this before you start" sx={{ mb: 4 }}>
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
      </Callout>

      {/* ── Table of contents ────────────────────────────────────────── */}
      <Box component="nav" aria-label="On this page" sx={{ ...cardSx, mb: { xs: 6, md: 8 } }}>
        <Typography
          component="h2"
          sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 1 }}
        >
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
                  // Inline anchors here were 17px tall, well under the 24px
                  // WCAG 2.5.8 target minimum. Prose links get the inline
                  // exception; a navigation list does not.
                  display: 'inline-block',
                  py: 0.6,
                  color: 'text.primary',
                  textDecoration: 'underline',
                  textDecorationColor: isDark ? 'rgba(56,189,248,0.5)' : 'rgba(3,105,161,0.45)',
                  '&:hover': { textDecorationColor: accentText },
                }}
              >
                {s.title}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <Section id="how-it-works" index={1} title="How this works">
        <Box sx={cardSx}>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2.5 }}>
            ESO <strong>does</strong> have DLSS. It shipped DLSS and DLAA in 2021 and was the first
            game ever to support DLAA; both sit in the in-game Anti-Aliasing dropdown, though only
            on RTX cards, which is why most people never see them. The problem is the runtime behind
            them: ESO bundles <code>nvngx_dlss.dll</code> <strong>2.2.16</strong>, a build that was
            current in late 2021, the build ESO launched DLSS and DLAA with, and has not been
            updated since. It predates the DLAA quality-mode value, the render presets, the
            transformer model and every parameter Neural Rendering depends on, so ESO&apos;s own
            toggle can never reach it.
          </Typography>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2.5 }}>
            So this is a <strong>replacement</strong> job, not a from-scratch one: swap the stale
            2.2.16 runtime for a 310.x build and adding one add-on that hooks the DLSS calls ESO is
            already making. Every error in this guide belongs to a stage in that chain:
          </Typography>

          <PipelineDiagram />

          <Stack
            component="ol"
            role="list"
            spacing={1.5}
            sx={{ listStyle: 'none', p: 0, m: 0, mt: 3 }}
          >
            <ChainRow
              n="1"
              title="A provider shader estimates motion"
              body="ESO's motion vectors stay inside its own DLSS path and never reach ReShade, so one ReShade shader of your choice re-derives them from the image with optical flow. LumeniteFX Kernel is the current recommendation; iMMERSE LaunchPad and VORT also work."
            />
            <ChainRow
              n="2"
              title="DLSS5_Feed packages the contract"
              body="It converts the provider's output plus ReShade's depth buffer into the exact two textures DLSS expects: DLSS5_MV (RG16F, pixel motion) and DLSS5_Depth (R32F, raw hardware depth)."
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
          <Callout tone="caution" label="There may be a shorter route" sx={{ mt: 2.5 }}>
            <Typography variant="body2">
              Upstream now suggests that 64-bit DirectX 11 games like ESO can skip the feeder
              entirely and use ShortFuse&apos;s <code>renodx-dlss</code> add-on on its own, one
              add-on instead of two. We have not tested that in ESO. This page documents the
              two-add-on setup because that is the one verified working here, start to finish.
            </Typography>
          </Callout>

          <Callout tone="info" label="Fix order" sx={{ mt: 2.5 }}>
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              <strong>Each stage needs the one before it.</strong> Neural Rendering attaches to a
              working DLSS feature, and that feature needs valid depth and motion.{' '}
              <Box
                component="a"
                href="#troubleshooting"
                sx={{
                  color: accentText,
                  fontWeight: W.semi,
                  textDecoration: 'underline',
                  textDecorationColor: isDark ? 'rgba(56,189,248,0.4)' : 'rgba(3,105,161,0.4)',
                }}
              >
                the troubleshooting section
              </Box>{' '}
              is ordered by stage. Fix the earliest failure, not the symptom you noticed.
            </Typography>
          </Callout>
        </Box>
      </Section>

      {/* ── Requirements ─────────────────────────────────────────────── */}
      <Section id="requirements" index={2} title="Requirements">
        <Box sx={cardSx}>
          <SettingsTable rows={REQUIREMENTS} labelWidth={160} />
          <Callout tone="info" label="Where to get it" sx={{ mt: 2.5 }}>
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              Need a current <code>nvngx_dlss.dll</code>? TechPowerUp mirrors official NVIDIA DLSS
              DLLs at{' '}
              <Box
                component="a"
                href="https://www.techpowerup.com/download/nvidia-dlss-dll/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: accentText, fontWeight: W.semi, textDecoration: 'underline' }}
              >
                techpowerup.com/download/nvidia-dlss-dll
              </Box>
              . Grab a 310.x release. These are unmodified, NVIDIA-signed files.
            </Typography>
          </Callout>
          <Callout tone="caution" label="The add-ons and the NR runtime" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1.25 }}>
              <code>renodx-dlss5.addon64</code> is <strong>Discord-only</strong>: it lives in the
              pinned messages of RenoDX&apos;s <code>#dlss5</code> channel, with no stable URL and
              no version numbers, so nobody can script fetching it. Deep Fried Chicken, the
              alternative neural consumer DLSS5-Feeder recommends, is distributed the same way.
              Budget for reading a channel, not for a download page.
            </Typography>
            <Typography variant="body2">
              We do not host or link <code>dlss5-feed.addon64</code>,{' '}
              <code>renodx-dlss5.addon64</code>, or the patched <code>nvngx_dlssnr.dll</code>. If
              you cannot find them, ask in{' '}
              <Box
                component="a"
                href="https://discord.gg/mMjwcQYFdc"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: accentText, fontWeight: W.semi, textDecoration: 'underline' }}
              >
                our Discord
              </Box>{' '}
              and someone will point you in the right direction.
            </Typography>
          </Callout>
        </Box>
      </Section>

      {/* ── Setup: the direct path ───────────────────────────────────
          One add-on that hooks ESO's own DLSS. Verified working here; see the
          feeder path further down for the older two-add-on method. */}
      <Section id="setup" index={3} title="Setup">
        <Box sx={{ ...cardSx, p: { xs: 2.5, md: 3.5 } }}>
          <Stack component="ol" role="list" sx={{ listStyle: 'none', p: 0, m: 0 }}>
            <StepRow n={1} last={false} title="Find your ESO client folder">
              <Typography variant="body2" sx={proseSx}>
                Every file here goes in the folder that contains <code>eso64.exe</code>. On a
                default Steam install that is:
              </Typography>
              <CodeBlock copyable wrap copyLabel="Copy client folder path" sx={{ mt: 1.25 }}>
                {'steamapps\\common\\Zenimax Online\\The Elder Scrolls Online\\game\\client'}
              </CodeBlock>
            </StepRow>

            <StepRow n={2} last={false} title="Install ReShade with add-on support">
              <Typography variant="body2" sx={proseSx}>
                Install ReShade <strong>6.8 or newer</strong> for <code>eso64.exe</code>, choosing
                DirectX 10/11/12 and the build <strong>with full add-on support</strong>. The plain
                build cannot load <code>.addon64</code> files at all. It must land as{' '}
                <code>dxgi.dll</code> next to <code>eso64.exe</code>.
              </Typography>
            </StepRow>

            <StepRow n={3} last={false} title="Replace the two NGX runtimes">
              <Typography variant="body2" sx={proseSx}>
                Put a <strong>310.x</strong> <code>nvngx_dlss.dll</code> and an{' '}
                <code>nvngx_dlssnr.dll</code> patched for your GPU generation next to{' '}
                <code>eso64.exe</code>. ESO bundles its own <code>nvngx_dlss.dll</code>, so you are
                replacing a file, not adding one; back the original up first.
              </Typography>
              <Note>
                This is the step that matters most. ESO&apos;s bundled runtime is 2.2.16 from 2021
                and predates everything Neural Rendering needs.
              </Note>
            </StepRow>

            <StepRow n={4} last={false} title="Add the add-on">
              <Typography variant="body2" sx={proseSx}>
                Put <code>renodx-dlss.addon64</code> next to <code>eso64.exe</code>. That is the
                only add-on you need on this path.
              </Typography>
            </StepRow>

            <StepRow n={5} last={false} title="Make ReShade load it early">
              <Typography variant="body2" sx={proseSx}>
                <strong>Close ESO first.</strong> ReShade rewrites <code>ReShade.ini</code> when the
                game exits and will discard your edit otherwise. Then add one line to the{' '}
                <code>[ADDON]</code> section:
              </Typography>
              <CodeBlock copyable wrap copyLabel="Copy the LoadFromDllMain line" sx={{ mt: 1.25 }}>
                {'LoadFromDllMain=renodx-dlss.addon64'}
              </CodeBlock>
              <Note>
                Skip this and the add-on still loads, does nothing, and reports no error. ESO
                creates a D3D12 device first, so without this line ReShade loads the add-on too late
                for it to install its DLSS hooks.
              </Note>
            </StepRow>

            <StepRow n={6} last={false} title="Turn ESO's own DLSS on">
              <Typography variant="body2" sx={proseSx}>
                In ESO video settings set <strong>Anti-Aliasing</strong> to <strong>DLSS</strong> or{' '}
                <strong>DLAA</strong>. DLAA runs at native resolution; DLSS upscales. This add-on
                works by hooking the game&apos;s own DLSS, so if ESO is not using DLSS there is
                nothing for it to attach to.
              </Typography>
            </StepRow>

            <StepRow n={7} last title="Load into the world and wait">
              <Typography variant="body2" sx={proseSx}>
                Neural Rendering starts when DLSS does, not at launch. On the setup this was
                verified on it took roughly two minutes from starting the game. Standing at the
                character select screen will not do it.
              </Typography>
            </StepRow>
          </Stack>
        </Box>
      </Section>

      {/* ── Verification ─────────────────────────────────────────────── */}
      <Section id="verify" index={4} title="Verify it's working">
        <Box sx={cardSx}>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2 }}>
            The effect is subtle and easy to imagine seeing. Trust <code>ReShade.log</code> in the
            client folder. Load into the world, play for a minute or two, then read it.
          </Typography>

          <Typography
            component="h3"
            sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 1 }}
          >
            First, that the add-on loaded early enough
          </Typography>
          <Typography variant="body2" sx={{ ...proseSx, mb: 1.25 }}>
            You want the second line, not the first. If you see the first one, step 5 has not taken
            effect and nothing else will work.
          </Typography>
          <CodeBlock sx={{ mb: 2.5 }}>
            {`Loading add-on from '...\\renodx-dlss.addon64'      <- too late
Loading externally registered add-on "RenoDX DLSS"   <- correct`}
          </CodeBlock>

          <Typography
            component="h3"
            sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 1 }}
          >
            Then, that Neural Rendering is running
          </Typography>
          <CodeBlock copyable copyLabel="Copy expected NR lines" sx={{ mb: 2.5 }}>
            {`DLSS-NR direct: backend-owned NVIDIA NGX core initialization succeeded
DLSS-NR direct: CreateFeature(Reserved18) succeeded: performance=6 preset=1
DLSS-NR direct: EvaluateFeature succeeded: evaluation=1
DLSS-NR direct: EvaluateFeature succeeded: evaluation=4754`}
          </CodeBlock>

          <Callout tone="good" label="What success looks like">
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              <strong>Reserved18</strong> is the neural feature, and the <code>evaluation=</code>{' '}
              counter has to <strong>climb</strong>. One evaluation that never increases means it
              started and stopped. A counter in the thousands after a few minutes of play is a
              healthy run.
            </Typography>
          </Callout>

          <Callout tone="info" label="Give it time" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              Neural Rendering initialises when DLSS does, not when the game launches. On the setup
              this was verified on, that was roughly two minutes in. Sitting at character select
              will not trigger it, so load into the world before deciding it has failed.
            </Typography>
          </Callout>
        </Box>
      </Section>

      {/* ── Harmless warnings ────────────────────────────────────────
          Every line here appears on a confirmed-working setup. Without this
          section readers chase warnings that were never the problem. */}
      <Section id="log-noise" index={5} title="Warnings you can ignore">
        <Stack spacing={2}>
          <Typography variant="body2" sx={proseSx}>
            All of these appear in <code>ReShade.log</code> on a setup that is working correctly.
            None of them is the reason Neural Rendering is not running. They are listed because the
            log is noisy and it is easy to spend an hour on the wrong line.
          </Typography>
          <Box sx={cardSx}>
            <SettingsTable rows={LOG_NOISE_ROWS} labelWidth={250} />
          </Box>
        </Stack>
      </Section>

      {/* ── Troubleshooting ──────────────────────────────────────────── */}
      <Section id="troubleshooting" index={6} title="Troubleshooting: fixes by log line">
        <Typography variant="body2" sx={{ ...proseSx, mb: 2 }}>
          Work top to bottom. Each failure masks the ones after it.
        </Typography>
        <Box sx={{ ...cardSx, p: 0, overflow: 'hidden' }}>
          {FAILURES.map((f, i) => (
            <Accordion
              key={f.symptom}
              disableGutters
              elevation={0}
              defaultExpanded={f.defaultOpen ?? false}
              sx={{
                background: 'transparent',
                '&:before': { display: 'none' },
                borderBottom: i < FAILURES.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore sx={{ fontSize: 18, color: 'text.disabled' }} />}
                id={`fail-${i}-header`}
                aria-controls={`fail-${i}-content`}
                sx={{ px: 2, minHeight: 52, '&.Mui-expanded': { minHeight: 52 } }}
              >
                <Typography component="h3" sx={{ fontWeight: 620, fontSize: '0.92rem', m: 0 }}>
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
        </Box>
      </Section>

      {/* ── Performance ──────────────────────────────────────────────── */}
      <Section id="performance" index={7} title="What it costs">
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
            every 600 frames, so measure on your own card. These are real frames, before any{' '}
            <Box
              component="a"
              href="#frame-generation"
              sx={{ color: accentText, fontWeight: W.semi, textDecoration: 'underline' }}
            >
              frame generation
            </Box>
            .
          </Typography>
        </Box>
      </Section>

      {/* ── Frame generation ───────────────────────────────────────── */}
      <Section id="frame-generation" index={8} title="Getting the performance back">
        <Stack spacing={2}>
          <Typography variant="body2" sx={proseSx}>
            Neural Rendering costs roughly half the framerate, and frame generation is the answer.
            The two compose unusually well here, for a structural reason worth understanding.
          </Typography>

          <Callout tone="info" label="Why this pairs well">
            <Typography variant="body2">
              Neural Rendering runs inside ReShade, before the frame is presented. Frame generation
              interpolates after. So NR only ever processes real frames, and the generated ones
              inherit its output for free. Frame generation does not multiply the cost of NR.
            </Typography>
          </Callout>

          <Box sx={cardSx}>
            <Typography
              component="h3"
              sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 1.5 }}
            >
              Your options
            </Typography>
            <SettingsTable rows={FRAME_GEN} labelWidth={190} />
          </Box>

          <Callout tone="caution" label="Your FPS counter will not show the extra frames">
            <Typography variant="body2">
              ReShade&apos;s counter and the feeder&apos;s own log both count real frames, upstream
              of anything the driver inserts. After enabling Smooth Motion the log keeps reporting
              the same number while the game visibly runs smoother. Nothing is wrong. To measure the
              real output you need something downstream of the driver, such as NVIDIA&apos;s overlay
              or FrameView.
            </Typography>
          </Callout>

          <Box sx={cardSx}>
            <Typography
              component="h3"
              sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 1 }}
            >
              What it costs you back
            </Typography>
            <Box component="ul" sx={{ pl: 2.5, m: 0, '& li': { mb: 0.6 } }}>
              <Typography component="li" variant="body2" sx={proseSx}>
                <strong>Latency.</strong> Frame generation adds it. Irrelevant overland, a real
                trade for trial weaving and PvP. Judge it on your own play, not on a screenshot.
              </Typography>
              <Typography component="li" variant="body2" sx={proseSx}>
                <strong>UI artifacts.</strong> Driver-level generation has no UI masking, and
                ESO&apos;s interface is dense and mostly static. Nameplates and floating combat text
                are where smearing shows up first, so look there before deciding it is clean.
              </Typography>
              <Typography component="li" variant="body2" sx={proseSx}>
                <strong>Headroom.</strong> Generation wants some. With G-Sync or FreeSync, cap the
                framerate below your refresh rate rather than letting it run free.
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Section>

      {/* ── Steps ────────────────────────────────────────────────────── */}
      <Section id="feeder-setup" index={9} title="Fallback: the two-add-on feeder path">
        <Box sx={{ ...cardSx, p: { xs: 2.5, md: 3.5 } }}>
          <Stack component="ol" role="list" sx={{ listStyle: 'none', p: 0, m: 0 }}>
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
                and that it is version 6.8 or newer. Note that the add-on build is the unsigned one
                — that is inherent to what add-on support is, and it is why some anti-cheat setups
                treat it differently from the plain build. ESO has no kernel-level anti-cheat, but
                if you share a ReShade install with a game that does, install this one for ESO only.
              </Note>
            </StepRow>

            <StepRow n={3} last={false} title="Add the shaders">
              <Typography variant="body2" sx={proseSx}>
                The feeder&apos;s own shader, plus <strong>one</strong> motion-vector provider of
                your choosing:
              </Typography>
              <Box
                component="ul"
                sx={{ pl: 2.5, mt: 0.75, mb: 0, '& li': { mb: 0.4, lineHeight: 1.7 } }}
              >
                <Typography component="li" variant="body2" sx={proseSx}>
                  <code>DLSS5_Feed.fx</code> → <code>reshade-shaders\Shaders</code>
                </Typography>
                <Typography component="li" variant="body2" sx={proseSx}>
                  <strong>LumeniteFX</strong> (recommended upstream): its <code>Shaders\</code>{' '}
                  contents — the <code>lumenite_*.fx</code> files and their <code>include\</code> —
                  into <code>reshade-shaders\Shaders</code>, and{' '}
                  <code>lumenite_bluenoise256.png</code> into <code>reshade-shaders\Textures</code>
                </Typography>
                <Typography component="li" variant="body2" sx={proseSx}>
                  <strong>or iMMERSE LaunchPad</strong>: <code>MartysMods_LAUNCHPAD.fx</code> and
                  the <code>MartysMods\</code> include folder into{' '}
                  <code>reshade-shaders\Shaders</code>, and <code>iMMERSE_bluenoise_opt.png</code>{' '}
                  into <code>reshade-shaders\Textures</code>
                </Typography>
              </Box>
              <Note>
                Whichever you pick supplies the optical-flow motion vectors; without one the feeder
                has nothing to hand NGX and sits idle. DLSS5-Feeder bundles none of them — each
                provider comes from its own repository under its own licence. Install only one, and
                see{' '}
                <Box
                  component="a"
                  href="#overlay"
                  sx={{
                    color: accentText,
                    fontWeight: W.semi,
                    textDecoration: 'underline',
                    textDecorationColor: isDark ? 'rgba(56,189,248,0.4)' : 'rgba(3,105,161,0.4)',
                  }}
                >
                  choosing a provider
                </Box>{' '}
                before you decide.
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
                runtime). ESO already ships an <code>nvngx_dlss.dll</code>, so this is a{' '}
                <strong>replacement</strong>, not a fresh install — back up the 2.2.16 copy and
                overwrite it with the 310.x build.
              </Typography>
              <Note>
                Version matters enormously. See{' '}
                <Box
                  component="a"
                  href="#requirements"
                  sx={{
                    color: accentText,
                    fontWeight: W.semi,
                    textDecoration: 'underline',
                    textDecorationColor: isDark ? 'rgba(56,189,248,0.4)' : 'rgba(3,105,161,0.4)',
                  }}
                >
                  Requirements
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
              <Note>
                To undo: delete the copied <code>d3dcompiler_47.dll</code> and rename{' '}
                <code>d3dcompiler_47.dll.bak</code> back. Verifying game files also restores
                ESO&apos;s own copy, which silently disables Neural Rendering until you redo this
                step.
              </Note>
            </StepRow>

            <StepRow n={7} last={false} title="Turn off in-game anti-aliasing">
              <Typography variant="body2" sx={proseSx}>
                In ESO video settings set <strong>Sub-Sampling Quality</strong> to High. ESO has no
                MSAA or SSAA option and no resolution-scale slider; Sub-Sampling Quality is the
                render-resolution control, and the feeder needs the game rendering at full
                resolution.
              </Typography>
              <Typography variant="body2" sx={{ ...proseSx, mt: 1.25 }}>
                On an RTX card that same Anti-Aliasing dropdown also offers{' '}
                <strong>DLSS and DLAA</strong>. Set it to <strong>None</strong> (or TAA if the image
                falls apart without any AA) and leave both off. They are not a shortcut and they do
                not stack with this setup:
              </Typography>
              <Box
                component="ul"
                sx={{ pl: 2.5, mt: 0.75, mb: 0, '& li': { mb: 0.4, lineHeight: 1.7 } }}
              >
                <Typography component="li" variant="body2" sx={proseSx}>
                  <strong>ESO&apos;s DLSS breaks the depth buffer.</strong> It renders below your
                  output resolution, so the depth buffer no longer matches the backbuffer. ReShade
                  then latches the wrong buffer or a garbled one, and the feeder&apos;s depth
                  contract — the thing step 7 exists to protect — is gone. This is the same failure
                  as leaving MSAA on, arriving by a different route.
                </Typography>
                <Typography component="li" variant="body2" sx={proseSx}>
                  <strong>DLAA is subtler but still wrong.</strong> It renders at native resolution,
                  so depth survives, but it resolves a jittered temporal pass before ReShade ever
                  sees the frame. Your provider then estimates motion vectors from an
                  already-temporally-filtered image and the feeder runs a second temporal pass over
                  it. Expect extra softness and ghosting rather than an outright failure, so this
                  one hides — if your image smears and step 7 looks done, check this dropdown.
                </Typography>
              </Box>
              <Note>
                Either way you are not losing anything: ESO&apos;s dropdown drives the same stale
                2.2.16 runtime, which is exactly what this guide replaces. The 310.x DLL you
                installed in step 5 is the one doing the work now.
              </Note>
            </StepRow>

            <StepRow n={8} last title="Enable the effects in the right order">
              <Typography variant="body2" sx={proseSx}>
                Launch ESO, press <strong>Home</strong>, and enable your motion-vector provider
                technique first, then DLSS5_Feed directly below it. Exactly one provider may be
                enabled. See{' '}
                <Box
                  component="a"
                  href="#overlay"
                  sx={{
                    color: accentText,
                    fontWeight: W.semi,
                    textDecoration: 'underline',
                    textDecorationColor: isDark ? 'rgba(56,189,248,0.4)' : 'rgba(3,105,161,0.4)',
                  }}
                >
                  the overlay walkthrough
                </Box>{' '}
                . Order is not cosmetic.
              </Typography>
            </StepRow>
          </Stack>
        </Box>
      </Section>

      {/* ── Overlay walkthrough ──────────────────────────────────────── */}
      <Section id="overlay" index={10} title="Using the ReShade overlay">
        <Stack spacing={2}>
          <Box sx={cardSx}>
            <Typography variant="body2" sx={{ ...proseSx, mb: 2 }}>
              Press <strong>Home</strong> in-game to open ReShade. (First launch shows a tutorial;
              click through it.) You will use three tabs:
            </Typography>
            <SettingsTable rows={OVERLAY_TABS} labelWidth={120} />
          </Box>

          <Box sx={cardSx}>
            <Typography
              component="h3"
              sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 1 }}
            >
              Effect order (this matters)
            </Typography>
            <Typography variant="body2" sx={{ ...proseSx, mb: 1.5 }}>
              In the Home tab, tick these two <strong>in this order</strong>. Drag entries to
              reorder if they land wrong:
            </Typography>
            <CodeBlock sx={{ mb: 1.5 }}>
              {`[x] LUMENITE: Kernel 2.0     <- your ONE motion vector provider, must be ABOVE
[x] DLSS5_Feed               <- consumes them, must be BELOW`}
            </CodeBlock>
            <Typography variant="body2" sx={{ ...proseSx, mb: 1.5 }}>
              Substitute whichever provider you installed — <code>Launchpad</code>,{' '}
              <code>vort_Motion</code>, <code>LUMENITE: QuantMotion</code> or the technique of
              whatever writes <code>texMotionVectors</code>. The ordering rule itself is the one
              thing that has not changed across versions.
            </Typography>
            <Callout tone="caution" label="The failure that does not announce itself">
              <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                Get the order wrong and <strong>nothing errors</strong>. The feed runs, the log
                looks healthy, and DLSS quietly reads last frame&apos;s vectors — you see a soft,
                one-frame-behind image and no reason for it. Enabling two providers at once does the
                same thing. Tick exactly one, and drag it above DLSS5_Feed.
              </Typography>
            </Callout>
            <Typography variant="body2" sx={{ ...proseSx, mt: 1.5 }}>
              The add-on runs DLSS and Neural Rendering immediately after the DLSS5_Feed technique,
              so any effect you place <em>below</em> DLSS5_Feed is applied on top of the neural
              output. Anything above it feeds into the neural pass instead.
            </Typography>
          </Box>

          <Box sx={cardSx}>
            <Typography
              component="h3"
              sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 1 }}
            >
              DLSS5_Feed effect settings
            </Typography>
            <Typography variant="body2" sx={{ ...proseSx, mb: 1.5 }}>
              Select DLSS5_Feed in the effect list and its options appear underneath:
            </Typography>
            <SettingsTable rows={FEED_SETTINGS} labelWidth={210} />
          </Box>

          <Box sx={cardSx}>
            <Typography
              component="h3"
              sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 1 }}
            >
              Choosing a motion-vector provider
            </Typography>
            <Typography variant="body2" sx={{ ...proseSx, mb: 1.5 }}>
              LaunchPad is <em>a</em> provider, not <em>the</em> provider — earlier versions of this
              guide read as though it were required, and it never was. DLSS5-Feeder estimates no
              motion itself; it reads whichever provider shader you installed, and{' '}
              <strong>which one is a compile-time decision</strong>, made in{' '}
              <strong>Edit → Preprocessor definitions</strong> on <code>DLSS5_Feed.fx</code>{' '}
              followed by a reload of effects.
            </Typography>
            <Typography variant="body2" sx={{ ...proseSx, mb: 1.5 }}>
              <strong>Which scheme you have depends on your version.</strong> Open your{' '}
              <code>DLSS5_Feed.fx</code> in a text editor and search it: if it references{' '}
              <code>DLSS5_MV_PROVIDER</code> you are on a current build, and if it references{' '}
              <code>DLSS5_MV_SOURCE</code> you are on 0.4.x. They are two generations of the same
              setting, not two settings.
            </Typography>

            <Typography
              component="h4"
              sx={{ fontWeight: W.heading, fontSize: '0.9375rem', mt: 2.5, mb: 1 }}
            >
              Current builds — <code>DLSS5_MV_PROVIDER</code>, five values
            </Typography>
            <SettingsTable rows={MV_PROVIDERS} labelWidth={230} />
            <Note>
              The definition&apos;s built-in default is <code>0</code>; upstream&apos;s
              recommendation is <code>3</code>. Those are different things, and leaving it unset
              does not give you the recommended setup.
            </Note>

            <Typography
              component="h4"
              sx={{ fontWeight: W.heading, fontSize: '0.9375rem', mt: 2.5, mb: 1 }}
            >
              0.4.x — <code>DLSS5_MV_SOURCE</code> plus a runtime dropdown
            </Typography>
            <Typography variant="body2" sx={proseSx}>
              0.4.x splits the same decision in two. <code>DLSS5_MV_SOURCE</code> is the
              preprocessor half and defaults to <code>0</code>, which compiles the LaunchPad path in
              and leaves both options live at runtime. Set it to <code>1</code> only if LaunchPad is
              genuinely not installed: at <code>1</code> the LaunchPad path is not compiled at all
              (its headers cannot coexist with <code>ReShade.fxh</code>) and only the shared{' '}
              <code>texMotionVectors</code> route works. The runtime half is the{' '}
              <strong>Motion vector provider</strong> dropdown in the effect settings, which on this
              version has exactly two entries — <code>0 = iMMERSE LaunchPad</code> and{' '}
              <code>1 = texMotionVectors provider</code>.
            </Typography>
            <Note>
              Already running 0.4.x with LaunchPad above the feed and the dropdown on iMMERSE
              LaunchPad? That is correct for your version — nothing here says otherwise. Moving to{' '}
              <code>DLSS5_MV_PROVIDER</code> means updating the add-on and shader together, which is
              an upgrade with its own risks, not a fix for something broken.
            </Note>

            <Callout tone="info" label="Nothing is bundled" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                DLSS5-Feeder ships no provider files and <code>#include</code>s none of them: its
                shader simply declares the provider&apos;s output texture identically, so ReShade
                binds the same resource. Every provider is downloaded from its own repository under
                its own licence.
              </Typography>
            </Callout>
          </Box>
        </Stack>
      </Section>

      {/* ── NR add-on panel ──────────────────────────────────────────── */}
      <Section id="nr-panel" index={11} title="The Neural Rendering add-on panel">
        <Stack spacing={2}>
          <Typography variant="body2" sx={proseSx}>
            Overlay → <strong>Add-ons</strong> → <strong>DLSS 5 Neural Rendering</strong>. Read the
            status line at the top before touching any slider. It is the most useful diagnostic in
            the stack.
          </Typography>

          <Box sx={cardSx}>
            <Typography
              component="h3"
              sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 1.5 }}
            >
              What the status line means
            </Typography>
            <Stack spacing={1.75}>
              {STATUSES.map((s) => (
                <Box
                  key={s.status}
                  sx={{
                    borderLeft: `3px solid ${s.good ? goodText : isDark ? CAUTION_TEXT_DARK : CAUTION_TEXT_LIGHT}`,
                    pl: 1.75,
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      display: 'block',
                      fontFamily: MONO,
                      fontWeight: 700,
                      fontSize: '0.66rem',
                      letterSpacing: '0.09em',
                      textTransform: 'uppercase',
                      mb: 0.5,
                      color: s.good ? goodText : isDark ? CAUTION_TEXT_DARK : CAUTION_TEXT_LIGHT,
                    }}
                  >
                    {s.good ? 'Goal state' : 'Needs action'}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: MONO,
                      fontSize: '0.82rem',
                      fontWeight: 400,
                      letterSpacing: '0.01em',
                      mb: 0.4,
                      color: s.good ? goodText : 'text.primary',
                    }}
                  >
                    {s.status}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.9375rem',
                      lineHeight: 1.65,
                      maxWidth: '68ch',
                    }}
                  >
                    {s.meaning}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Box sx={cardSx}>
            <Typography
              component="h3"
              sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 1.5 }}
            >
              Every control
            </Typography>
            <SettingsTable rows={NR_SETTINGS} labelWidth={230} />
          </Box>

          <Callout tone="info" label="Seeing the effect">
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              <strong>To see it at all:</strong> stand still, look closely at a character&apos;s
              face, and tap <strong>F6</strong>. Faces, hair and fabric change most; terrain and sky
              barely move. If nothing changes, check the status line above rather than squinting
              harder.
            </Typography>
          </Callout>
        </Stack>
      </Section>

      {/* ── Depth buffer ─────────────────────────────────────────────── */}
      <Section id="depth-buffer" index={12} title="Checking the depth buffer">
        <Box sx={cardSx}>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2 }}>
            The feeder needs <strong>scene depth</strong>. ESO presents several depth buffers and
            ReShade sometimes auto-selects a UI or shadow buffer. DLSS then runs on garbage, so the
            output looks wrong rather than missing.
          </Typography>

          <Typography
            component="h3"
            sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 1 }}
          >
            The quick visual check
          </Typography>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2 }}>
            Enable <code>DisplayDepth</code> in the effect list (it ships with every ReShade
            install). You should see the world in greyscale, near objects one shade and distant
            terrain another, with the UI flat and not part of the gradient. If the screen is blank
            white, blank black, or shows only your interface, the wrong buffer is selected.
          </Typography>

          <Typography
            component="h3"
            sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 1 }}
          >
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
          <Callout tone="good" label="What success looks like" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              A correct setup logs <code>Depth 2560x1440 R32_FLOAT</code> (at your resolution) in{' '}
              <code>dlss5-feed.log</code>. If the resolution there does not match your monitor, the
              wrong buffer is selected.
            </Typography>
          </Callout>
        </Box>
      </Section>

      {/* ── Config reference ─────────────────────────────────────────── */}
      <Section id="config" index={13} title="Config file reference">
        <Box sx={cardSx}>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2 }}>
            The overlay writes these for you. They are here so you can diff a working setup against
            a broken one.
          </Typography>

          <Typography
            component="h3"
            sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 1 }}
          >
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
NREnableUpscaling=0  ; WIP; a no-op on ESO, see the settings table above`}
          </CodeBlock>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2.5 }}>
            The add-on suggests <code>EnableHooks=1</code> when it cannot find guide dimensions.
            That advice is for NVIDIA Streamline titles. <strong>ESO is not one.</strong> Leave it
            at 2; if NGX-only genuinely yields nothing, 1 is a last resort that can crash at boot.
          </Typography>

          <Typography
            component="h3"
            sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 1 }}
          >
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

      {/* ── Credits ──────────────────────────────────────────────────
          None of this stack is ours. Naming the authors is basic courtesy and
          also gives readers a legitimate trail without us mirroring binaries. */}
      <Section id="credits" index={14} title="Credits and downloads">
        <Box sx={cardSx}>
          <Typography variant="body2" sx={{ ...proseSx, mb: 2 }}>
            This guide documents other people&apos;s work. Everything below is theirs, not ours.
          </Typography>
          <SettingsTable rows={CREDITS} labelWidth={200} />
          <Callout tone="info" label="Downloads" sx={{ mt: 2.5 }}>
            <Typography variant="body2">
              The only file this page links directly is the stock, NVIDIA-signed{' '}
              <code>nvngx_dlss.dll</code>. For the two add-ons and the patched Neural Rendering
              runtime, ask in{' '}
              <Box
                component="a"
                href="https://discord.gg/mMjwcQYFdc"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: accentText, fontWeight: W.semi, textDecoration: 'underline' }}
              >
                our Discord
              </Box>
              .
            </Typography>
          </Callout>
        </Box>
      </Section>
      {/* ── Footer CTA ───────────────────────────────────────────────── */}
      <Box sx={{ ...cardSx, textAlign: 'center' }}>
        <Typography sx={{ fontWeight: W.heading, fontSize: '1.1rem', lineHeight: 1.4, mb: 0.5 }}>
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
            startIcon={
              <img
                src={discordIcon}
                alt=""
                style={{
                  width: 18,
                  height: 18,
                  // The contained primary flips ink between modes: near-black on
                  // cyan in dark, white on navy in light. A fixed filter would
                  // leave the mark invisible in one of them.
                  filter: isDark ? 'brightness(0)' : 'brightness(0) invert(1)',
                }}
              />
            }
            endIcon={<ArrowForward />}
            sx={{ borderRadius: '8px', fontWeight: W.semi, textTransform: 'none', px: 3 }}
          >
            Ask on Discord
          </Button>
          <Button
            variant="outlined"
            component={RouterLink}
            to="/"
            sx={{ borderRadius: '8px', fontWeight: W.semi, textTransform: 'none', px: 3 }}
          >
            Explore ESO Toolkit
          </Button>
        </Stack>
      </Box>

      {/* Structured data. Data blocks, not executed scripts. */}
      <script type="application/ld+json">{serializeJsonLd(TECH_ARTICLE_LD)}</script>
      <script type="application/ld+json">{serializeJsonLd(HOW_TO_LD)}</script>
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
  index: number;
  title: string;
  children: React.ReactNode;
}> = ({ id, index, title, children }) => (
  <Box component="section" sx={{ mb: { xs: 6, md: 8 } }}>
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'baseline',
        mb: 3,
        pb: 1.25,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography
        aria-hidden="true"
        sx={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: '0.78rem',
          color: 'text.disabled',
          letterSpacing: '0.05em',
        }}
      >
        {String(index).padStart(2, '0')}
      </Typography>
      <Typography
        variant="h5"
        component="h2"
        id={id}
        sx={{
          fontWeight: 600,
          fontSize: { xs: '1.35rem', md: '1.5rem' },
          lineHeight: 1.25,
          letterSpacing: '-0.01em',
          scrollMarginTop: { xs: 72, md: 88 },
        }}
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
          fontWeight: W.heading,
          fontSize: '0.85rem',
          color: ON_ACCENT_INK,
          background: ACCENT_DARK,
          fontVariantNumeric: 'tabular-nums',
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
            background: (t) =>
              t.palette.mode === 'dark' ? 'rgba(56,189,248,0.28)' : 'rgba(3,105,161,0.25)',
          }}
        />
      )}
    </Stack>
    <Box sx={{ minWidth: 0, flex: 1, pb: last ? 0 : 3.5 }}>
      <Typography
        component="h3"
        sx={{ fontWeight: W.heading, fontSize: '1.125rem', lineHeight: 1.4, mb: 0.5, mt: '3px' }}
      >
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
  const accent = isDark ? GOOD_TEXT_DARK : GOOD_TEXT_LIGHT;

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

/** Colophon separator. Decorative, so it is hidden from assistive tech. */
const ColophonDot: React.FC<{ hideOnMobile?: boolean }> = ({ hideOnMobile }) => (
  <Box
    component="span"
    aria-hidden="true"
    sx={{
      color: 'text.disabled',
      letterSpacing: 0,
      mx: 0.9,
      display: hideOnMobile ? { xs: 'none', sm: 'inline' } : 'inline',
    }}
  >
    ·
  </Box>
);

/** Italic aside under a step. Genuinely secondary, unlike the body copy. */
const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="body2"
    sx={{
      mt: 1,
      fontStyle: 'italic',
      color: 'text.secondary',
      fontSize: '0.9375rem',
      lineHeight: 1.6,
      maxWidth: '68ch',
    }}
  >
    {children}
  </Typography>
);

/**
 * Quiet document callout replacing MUI Alert. Attention is signalled by a
 * coloured edge and a small-caps label rather than a tinted fill and a filled
 * icon, matching the code blocks' anatomy.
 *
 * role="note", not Alert's role="alert": these are static prose, and a live
 * region announced on render is simply wrong for them.
 */
const Callout: React.FC<{
  tone: 'info' | 'caution' | 'good';
  label: string;
  children: React.ReactNode;
  sx?: object;
}> = ({ tone, label, children, sx }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const bar =
    tone === 'good'
      ? isDark
        ? 'rgba(118,185,0,0.55)'
        : GOOD_TEXT_LIGHT
      : tone === 'caution'
        ? isDark
          ? CAUTION_TEXT_DARK
          : CAUTION_TEXT_LIGHT
        : isDark
          ? 'rgba(148,163,184,0.5)'
          : 'rgba(15,23,42,0.35)';
  return (
    <Box
      role="note"
      sx={{
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.10)',
        borderLeft: `3px solid ${bar}`,
        borderRadius: '10px',
        px: 2,
        py: 1.5,
        // Callout prose is not secondary text: the risk warning lives here.
        '& p, & li': {
          fontSize: '1rem',
          lineHeight: 1.7,
          maxWidth: '68ch',
          fontWeight: isDark ? W.bodyDark : W.body,
        },
        '& strong': { fontWeight: 620 },
        '& code': {
          fontFamily: MONO,
          fontSize: '0.85em',
          background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)',
          borderRadius: '4px',
          px: '0.25em',
          py: 0.1,
        },
        ...sx,
      }}
    >
      <MicroLabel>{label}</MicroLabel>
      {children}
    </Box>
  );
};

/** Uppercase overline for the repeated log/why/fix labels inside accordions. */
const MicroLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="caption"
    sx={{
      display: 'block',
      fontWeight: W.label,
      fontSize: '0.7rem',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      fontVariantNumeric: 'tabular-nums slashed-zero',
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
          fontSize: '0.875rem',
          lineHeight: 1.7,
          color: isDark ? '#cbd5e1' : '#334155',
          background: isDark ? 'rgba(2,6,23,0.55)' : 'rgba(15,23,42,0.045)',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.10)',
          borderLeft: `3px solid ${isDark ? 'rgba(56,189,248,0.55)' : 'rgba(3,105,161,0.55)'}`,
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
            fontSize: '0.85rem',
            lineHeight: 1.6,
            color: 'text.primary',
            overflowWrap: 'anywhere',
          }}
        >
          {row.label}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', fontSize: '0.9375rem', lineHeight: 1.65 }}
        >
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
        fontWeight: W.heading,
        fontSize: '0.8rem',
        fontVariantNumeric: 'tabular-nums',
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
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', fontSize: '0.9375rem', lineHeight: 1.65, maxWidth: '68ch' }}
      >
        {body}
      </Typography>
    </Box>
  </Stack>
);
