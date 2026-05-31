# Fight Replay (3D) — UX Audit: Prioritized Findings

_ESO Toolkit · `src/features/fight_replay/` · branch `feat/fight-replay-ux` · 2026-05-30_

Combines a 64-agent read-only audit (57 raw → 55 verified, 2 rejected) with **live-render findings** captured on the heavy Rockgrove fight (`yNXakmx76QFBcpRZ/fight/4`) — the only fight that renders real 3D locally. Live findings cover what the read-only agents could not see.

---

## 0. LIVE-RENDER findings (main-loop, from the actual rendered page)

These were observed in the real render and are NOT in the agent audit (agents can't render 3D locally). Baseline screenshots in `.scratch/ux-baseline/`.

- **[P1] Arena viewport is tiny / fixed.** Canvas is a fixed **819×400px** on a 1440px viewport — ~57% width, fixed height — leaving a huge empty dark band down to the footer. The replay should dominate the page (responsive width, taller viewport). _File: `Arena3D.tsx` canvas container; `FightReplay3D.tsx` Paper wrapper. This is the single most visible "unfinished" cue._
- **[P1] Timeline death markers show "Actor 17 / Killed by: Actor 3"** — raw numeric IDs, not names. Root: `src/hooks/useTimelineMarkers.ts:104-105` hardcodes `Actor ${event.targetID}`. Real names ARE available (PlayerListHUD shows @handles), so this is a name-resolution gap.
- **[P2] HUD overlays occlude the arena on narrow screens.** At ~500px the player-list + boss-health HUDs cover nearly the whole 400px arena → 3D unusable on mobile. (Overlaps the agents' `playerlist-legibility` / responsive-Drawer recommendation.)

---

## 1. Executive Summary — highest-leverage changes

In priority order. Items 1-2 are functional/a11y **bugs** (near-zero effort, embarrassing in a "pro tool"). 3+ are the modernization moves.

0. **[P1 · LIVE] Make the arena fill the page** (responsive width + taller viewport) and **resolve real actor names in timeline markers**. The two biggest "this is unfinished" cues, only visible in the live render.
1. **[P1] Fix the player visibility toggle rendering the same eye glyph for on AND off** (`PlayerListHUD.tsx:303` — `player.visible ? '👁' : '👁'`). Color-only state (WCAG 1.4.1) + reads as a bug. One-string swap.
2. **[P1] Stop the import modal closing on a zone-mismatch "false success"** (`FightReplay.tsx:88`). Valid wrong-zone string → modal closes → 0 markers → error renders in the closed modal. Validate live, keep modal open on mismatch.
3. **Collapse the 3-row "settings form" transport into one dense control bar** (`PlaybackControls.tsx`) — delete the redundant 2nd progress bar + "NN%", the duplicate "Playback Speed" label; group play-cluster left / utilities right.
4. **Make play/pause unmistakably dominant** (`PlaybackButtons.tsx`) — filled/accent circular control vs flat ghost skips.
5. **Give the timeline a non-color channel + legend** (`TimelineMarkers.tsx`) — consume the unused `icon` field; legend doubles as type filters.
6. **Add a scrub time bubble at the thumb + slider a11y** (`TimelineSlider.tsx`) — `valueLabelDisplay`/`valueLabelFormat`, `aria-label`, `getAriaValueText`. Replaces the amateur "(SCRUBBING)" text.
7. **Unify marker import/export into one surface** (`MapMarkersModal.tsx`).
8. **Collapse the three competing page headers into one title cluster** (`FightReplay.tsx`).

---

## 2. Direction decision — pick one

**Agent recommendation: (B) refined polish.** My live recon nuances this: the agents undervalued the **viewport-sizing** issue because they couldn't see it. With sizing fixed + the two P1 bugs + clutter removal, the page jumps a tier with low risk. A "bold overhaul" of the transport (glass bar, markers-on-rail) carries the documented 75→13fps memo landmine and is best as a scoped Phase 2.

- **Option A — Bold visual overhaul:** dark-glass floating transport, markers-on-rail, hover skim-preview, dense band. Max "wow," highest perf risk, all items were taste-downgraded to P2/P3.
- **Option B — Refined polish (✅ recommended):** keep MUI language; fix viewport sizing + 2 P1 bugs + clutter + affordance hierarchy + a11y gaps. ~80% of perceived modernization, low regression surface.
- **Hybrid (recommended in practice):** Option B **plus** the highest-value visual upgrades from A that are perf-safe — the responsive viewport, a cohesive single transport bar, dominant play/pause, and a tabular-nums timecode. Defer markers-on-rail + hover-preview to Phase 2.

---

## 3. Full findings by surface

_(See the agent audit body below — reproduced verbatim, all file:line + perf caveats intact.)_

PERF LANDMINE (applies throughout): the documented 75→13fps playback regression has exactly two triggers — (1) breaking memo stability (fresh object/array from `useScrubbingMode`/`useOptimizedTimelineScrubbing`, rebuilding `useTimelineMarkers`' array, or feeding a time-varying prop into a memoized child), and (2) per-frame work (alloc/theme-read/draw-pass inside `useFrame`/`updateHUD()`/`updateHealthHUD()`). A change touching neither is safe.

### page-chrome (`FightReplay.tsx`)
- **P2 · competing-triple-heading-stack** (313-326): one title cluster, drop standalone H5, fall back to fight.name. No perf risk.
- **P3 · redundant-mode-label-h5** (5 places): hoist to one const / shared panel.
- **P2 · four-near-identical-state-screens** (249-296): extract one `<ReplayStatePanel>` (spinner for loading, back/retry for error).
- **P2 · ungrouped-marker-action-row** (328-382): Stack/ButtonGroup, contained primary; keep `markersState` identity.
- **P3 · export-buttons-no-copy-affordance**: `ContentCopy` icon, rename "Copy Elms"/"Copy M0R".
- **P3 · back-button-detached-from-header**; **P3 · header-spacing-not-on-theme-rhythm** (Stack spacing); **P3 · duration-buried-in-body-string** (subtitle + Chip row).

### transport-controls
- **P2 · playpause-not-dominant** (`PlaybackButtons.tsx:64-82`): styled IconButton (NOT Fab — loses 44×44 override), `bgcolor:'primary.main'`.
- **P2 · thumb-no-scrub-tooltip** (`TimelineSlider.tsx`): `valueLabelDisplay='auto'`+`valueLabelFormat={formatTime}`. Bind to `displayTime`, not `timeRef`.
- **P2 · timeline-redundant-progressbar** (139-162): delete the Box — NET perf win. Don't change the scrubbing hook's return shape.
- **P2 · slider-aria-value-text-missing**: `aria-label`+`getAriaValueText={formatTime}`. Pure prop add.
- **P2 · no-global-transport-keyboard-shortcuts** (`FightReplay3D.tsx:200-222`): extend keydown — Space=play, arrows=skip; document in help overlay. Watch slider-thumb arrow collision.
- **P3 · scrubbing-plaintext-indicator** (78-90): delete "(SCRUBBING)" block.
- **P3 · speed-dropdown-redundant-label** (`SpeedSelector.tsx:51-53`): delete the Typography + unused import.
- **P3 · transport-three-stacked-rows**: two rows; keep child props byte-identical (TimelineMarkers memo).
- **P3 · time-format-no-ms-verified**: no action; optional DRY hoist of `formatTime` (also in `ShareButton.tsx:52-57`).

### timeline-markers (`TimelineMarkers.tsx`)
- **P2 · color-only-encoding-no-shape-icon** (120-170): per-type glyph from `marker.type`, inside `markers.map()`. Do NOT rebuild the markers array upstream.
- **P2 · no-legend**: legend row doubling as type toggles; keep toggle state out of the scrubbing hook's memo.
- **P2 · tooltip-newline-not-rendered**: `slotProps tooltip sx whiteSpace:'pre-line'`.
- **P2 · density-overlap-no-clustering**: cluster within px threshold INSIDE the existing `markers` useMemo.
- **P2 · dead-theme-color-path-hardcoded-hex** (`useTimelineMarkers.ts:80,119`): delete hardcoded `color:`, let palette tokens resolve.
- **P2 · slider-no-marker-awareness-a11y**: aria props + SR-reachable event list (`React.memo`'d).
- **P3 · click-to-seek-low-discoverability** (CSS hover guide, not JS playhead); **P3 · scrubbing-track-color-collides-enemy-death**; **P3 · aria-label-raw-tooltip-string-emoji-newline**; **P3 · no-roving-tabindex-26-tab-stops** (activeIndex changes only on user nav); **P3 · markers-overflow-beyond-duration** (clamp 0-100).

### in-scene-hud
- **P1 · playerlist-eye-icon-color-only-state** (`PlayerListHUD.tsx:298-306`): distinct off-glyph. Canvas-2D — never read theme/alloc in `updateHUD()`.
- **P2 · following-chip-overlaps-playerlist-hud** (`Arena3D.tsx:836-868`): move HTML chip to top-center/right (free).
- **P2 · pt-shortcuts-undiscoverable-after-autohide**: persistent '?' IconButton to re-open help.
- **P3 · following-chip-unfollow-touch-and-styling** (MUI Chip + onDelete); **P3 · boss-health-hud-hardcoded-non-theme-styling** (resolve theme above Canvas, thread as props); **P3 · playerlist-legibility-tiny-fonts** (bump constants ≥11/≥12px; Drawer on small screens); **P3 · boss-hud-contrast health-bar outline alpha →0.5**.

### modals-markers (`MapMarkersModal.tsx`)
- **P1 · zone-mismatch-error-shown-after-modal-closes** (`FightReplay.tsx:88`): live `useMarkerStats`, render Alert, gate close on good preview.
- **P2 · import-export-flow-split-across-surfaces**: mirror Export buttons into `DialogActions`.
- **P2 · no-real-example-or-addon-guidance**: name M0RMarkers/Elms addons + a real copyable sample in `<details>`.
- **P2 · no-live-validation-feedback-while-typing**: `useMarkerStats(input,fight)` status line + helperText.
- **P2 · bespoke-backdropfilter-blur-on-chips**: delete sx overrides (NET win); extract `<MarkerStatsChips>`.
- **P3 · title-says-mor-only** (rename); **P3 · modal-not-fullscreen-on-mobile** (`fullScreen` breakpoint); **P3 · no-marker-visual-legend-in-modal** (`MarkerSpritePreview`, field is `elmsIconKey`); **P3 · dead-loaderror-try-catch**.

### research-comparators (Option A "bold layer" — Phase 2)
transport-single-dense-bar · markers-overlaid-on-rail (highest perf caution) · hover-scrub-preview · speed-inline-cycle-control · redundant-progress-indicators (net win) · scrubbing-debug-text · boss-hud-target-focus · camera-follow-lockon (mostly shipped) · shortcut-discoverability-overlay · modern-aesthetic-2026-shell (cheap wins: tabular-nums timecode, recolor scrub off warning.main).

---

## 4. Rejected (do NOT action)
- **snackbar-occluded-by-transport-bar** — transport is document-flow not pinned; bottom-center is test-enforced to avoid the top AppBar.
- **marker-track-alignment-imprecise** — verified against MUI Slider source: horizontal rail is full-width, no inset; markers use the identical `left:X% translate(-50%)` mapping. No drift.
