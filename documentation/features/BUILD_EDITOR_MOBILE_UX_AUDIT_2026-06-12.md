# Build Editor — Mobile UX/UI Audit & Remediation Plan

**Date:** 2026-06-12
**Scope:** `/build-editor` route — `src/features/build-editor/` (layout, nav rail, completion header, sections, pickers, setup tab bar) plus the app chrome it inherits (`AppLayout`, perf-tier CSS gate, cookie consent).
**Method:** Live testing in a device-emulated Chromium session (390×844 @3x, mobile UA, touch enabled — iPhone-class viewport matching the reported device), with every finding verified against source with file/line references. Measurements below (touch-target sizes, font sizes, computed styles, overflow widths) are taken from the running app, not estimated.

> **Audit only — no code changes.** This document is the deliverable. Each finding carries a severity, evidence, and a ticket-shaped remediation so the plan can be broken straight into Jira issues.

---

## Executive Summary

The build editor has a genuinely mobile-aware architecture: a dedicated `md` (960px) breakpoint, collapsible sections, a fixed bottom section nav, fullscreen pickers via the shared `PickerDialog` primitive, lazy mounting, and touch-gated hover effects in newer primitives. The foundation is good.

However, live testing surfaced **two critical defects** that break the core mobile flow (selecting gear and skills), both invisible from code review of any single file:

1. **Glass dialogs are near-transparent on most phones.** The perf-tier gate (`src/index.css:136-140`) strips _all_ `backdrop-filter`s when `data-perf='low'`, and the GPU detector (`src/utils/detectPerfTier.ts:50`) demotes tier-2 **mobile** GPUs to `low`. The gear and skill pickers have no opaque background fallback — their paper is a 12%-alpha gradient — so page content bleeds straight through the dialog text. Verified live: computed paper background `rgba(0,0,0,0)`, `backdrop-filter: none`, list items visually colliding with the section headers behind them.
2. **The gear and skill pickers bypass the mobile-fullscreen dialog path.** They use raw MUI `Dialog`s instead of the shared `PickerDialog` (which does `fullScreen` below `sm`). At 390px the gear picker renders as a floating 326×581 panel over live page content.

Beyond those, the main themes are: sub-44px touch targets in the bottom nav, missing iOS safe-area handling, dead-end navigation taps (scroll to a _collapsed_ accordion), iOS zoom-on-focus from sub-16px inputs, primary actions stranded at the top of a very long page, and ~2,000px of marketing footer appended to a working tool.

**Counts:** 2 Critical · 5 High · 6 Medium · 3 Low.

---

## Findings

### Severity: CRITICAL

#### C1. Pickers are unreadable on `data-perf='low'` devices (most mid-range phones)

**Evidence (live):** With the auto-detected tier at `Low`, opening _Select Head Gear_ or _Assign Skill_ shows the page's section headers and buttons bleeding through the dialog body. Computed styles on the dialog paper: `background-color: rgba(0,0,0,0)`, `background-image: linear-gradient(135deg, rgba(56,189,248,0.12) …)`, `backdrop-filter: none`.

**Cause chain:**

- `src/index.css:136-140` — `html[data-perf='low'] * { backdrop-filter: none !important; }` (intentional, well-documented perf gate).
- `src/utils/detectPerfTier.ts:49-51` — GPU tier 2 + `isMobile` → `'low'`. Tier 2 covers a large share of current Android phones and older iPhones, so **the low-tier path is effectively a first-class mobile rendering mode**, not an edge case.
- `src/features/build-editor/components/pickers/GearPicker.tsx:456-468` — paper styled with `backgroundColor: 'transparent'` + 12%-alpha gradient, **no** `backdropFilter` of its own and no solid fallback.
- `SkillBarPicker.tsx:324` declares `backdropFilter: blur(12px)`, which the low-tier gate strips, leaving the same transparent paper.
- The `glass-dialog` class used by ~13 dialogs across the app is a **marker class with no CSS attached anywhere** (only styling lives per-component), so there is no central place where a fallback kicks in.

**Impact:** The two most important editing flows on mobile (gear, skills) are functionally unreadable for low-tier users. Dark mode is worst; light mode papers use 98%-alpha backgrounds and are fine.

**Remediation (ticket-shaped):**

- Add a companion rule to the existing perf gate: under `html[data-perf='low']`, give every glass surface an opaque background (e.g. `.glass-dialog .MuiDialog-paper { background: var(--panel) !important; }`), or better, define glass tokens as _solid color + optional blur layer_ so removing blur never removes opacity.
- Audit all 13 `glass-dialog` usages plus `BE_TOKENS.glass` consumers for alpha values below ~0.85 without a fallback.
- Add a visual regression test that screenshots the gear picker with `document.documentElement.dataset.perf = 'low'` forced.
- **Acceptance:** picker text passes WCAG contrast over _any_ page content with blur disabled; no behavioral change for `medium`/`high` tiers.

#### C2. Gear & skill pickers are not fullscreen on mobile (bypass `PickerDialog`)

**Evidence (live):** at 390×844 the gear picker paper measures **326×581 at x=32,y=132** — a floating modal, with the build header's action strip visually colliding with the dialog title row. The skill picker behaves the same. Meanwhile `FoodPicker`/`PotionPicker`/`PassivesPicker` use the shared primitive `PickerDialog` (`src/features/build-editor/components/primitives/PickerDialog.tsx:263` → `fullScreen` below `sm`, slide-up transition, sticky search) and get correct mobile behavior.

**Cause:** `GearPicker.tsx:450-470` and `SkillBarPicker`'s dialog construct raw `<Dialog maxWidth="sm">` with bespoke paper styling instead of composing `PickerDialog`.

**Impact:** Cramped list (≈8 rows visible of 700+ gear sets), double-scroll confusion (page behind stays scrollable context), inconsistent transitions vs. the consumable pickers, and it compounds C1 (floating panel over busy content is the worst case for transparency).

**Remediation:** Migrate `GearPicker` and `SkillBarPicker` onto the `PickerDialog` compound component (it already provides fullscreen-at-`sm`, sticky search, result counts, and the slide-up sheet). Keep their custom row renderers as children. **Acceptance:** at ≤600px both pickers open as full-height sheets with 0 border radius, sticky search, and no underlying page visible; desktop behavior unchanged.

---

### Severity: HIGH

#### H1. Bottom nav: 36×30px touch targets, 12 unlabeled icons, clipped overflow

**Evidence (live):** nav buttons measure **36×30px** (WCAG 2.5.8 minimum is 24px, Apple HIG/Material guidance is 44/48px; the app's own theme enforces `minHeight: 44` for coarse pointers on MUI Buttons at `ReduxThemeProvider.tsx:240`, but these are `ButtonBase`, so the rule doesn't apply). The rail's content is **440px wide in a 390px viewport** — the last 1–2 items (Settings, Guide & Media) are clipped and reachable only by a horizontal scroll hinted at by a 24px gradient fade (`BuildNavRail.tsx:129-153`). Labels exist only as **hover `Tooltip`s** (`BuildNavRail.tsx:157`), which on touch require a long-press and are mostly never seen. Completion indicator is a 6px dot.

**Impact:** The primary mobile navigation is hard to hit, hard to learn (12 abstract icons, several visually similar), and hides two destinations. This is the single highest-leverage UX surface in the editor on a phone.

**Remediation:**

- Reduce visible items to the 5–6 highest-traffic sections (Identity, Equipment, Skills, Consumables, Champion) + a **"More" item opening a bottom sheet** listing all sections with text labels and completion state. This also fixes the overflow.
- Make each item ≥48px wide / ≥44px tall hit area (visual icon can stay small; expand the touchable area).
- Show 10px text labels under icons (Material 3 bottom-nav pattern) or at minimum for the active item.
- Replace the hover tooltip with the label; gate the `:hover` color at `BuildNavRail.tsx:177-179` behind `@media (hover: hover)`.
- **Acceptance:** no horizontal scroll in the rail at 360px-wide viewports; all targets ≥44px; each item labeled.

#### H2. Fixed bottom nav ignores iOS safe area despite `viewport-fit=cover`

**Evidence (live):** the viewport meta is `width=device-width, initial-scale=1, viewport-fit=cover`; the nav (`BuildNavRail.tsx:111-127`) is `position: fixed; bottom: 0; height: 56px; padding: 0 4px` with **no** `env(safe-area-inset-bottom)`. On notched iPhones in standalone/scrolled Safari, the home indicator overlaps the icon row.

**Remediation:** `height: calc(56px + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom)`, and bump the layout's `pb: 10` clearance (`BuildEditorLayout.tsx`) accordingly. Apply the same to the cookie banner and any future bottom sheets. **Acceptance:** verified on a real device or iOS simulator with home indicator; no icon sits under the indicator.

#### H3. Nav tap lands on a _collapsed_ section — dead-end interaction

**Evidence (live):** sections default to collapsed on mobile (`SectionCard` + `defaultExpanded={!isMobile}`); `scrollToSection` (`BuildNavRail.tsx:96-99`) only does `scrollIntoView`. Tapping **Passives** in the nav scrolled to the card with `aria-expanded="false"` — the user arrives at a closed header and must tap again. The target also lands flush against the viewport top, partially under nothing (no `scroll-margin-top`), and `scrollIntoView({block:'start'})` doesn't compensate for the 56px bottom bar when scrolling _up_ to a section near the page end.

**Remediation:** on mobile, nav tap should (1) dispatch expand for the target section, (2) scroll after the expand animation settles (or use `scroll-margin-top` on `section-*` anchors ≈ 12-16px), (3) optionally collapse the previously-open section (accordion mode) to keep page length manageable. **Acceptance:** one tap on any nav item shows that section's _content_ on screen.

#### H4. Sub-16px inputs trigger iOS Safari zoom-on-focus

**Evidence (live, computed):** build description input **11px** (`BuildCompletionHeader.tsx:539`, `isMobile ? 11 : 12`); picker search fields **13px** (e.g. `PickerDialog.tsx:121`, GearPicker search measured 13px/36px tall); build name **15px** (`BuildCompletionHeader.tsx:519`). iOS Safari auto-zooms the page when focusing any input rendered under 16px, then leaves the layout zoomed — one of the most jarring classic mobile-web defects, and it hits the _first_ field a new user touches.

**Remediation:** set all focusable text inputs to ≥16px effective size at `<md` (visual hierarchy can be kept with weight/color rather than size). The description input at 11px is also simply too small to read comfortably. Alternatively (less preferred) keep sizes and accept zoom on desktop-class tablets only. **Acceptance:** no zoom on focus on a real iPhone for name, description, and every picker search field.

#### H5. All primary actions (Save/Publish/Share/Import) strand at the top of a ~3,300px page

**Evidence (live):** `BuildCompletionHeader` is not sticky (plain `position: relative`); the page measured **3,358px** of scroll height with only Equipment + Skills expanded (it grows with each section). From the Skills or Champion section there is no route to Save/Publish/Share without scrolling to the very top. There is no undo affordance either (keyboard Ctrl+S/Ctrl+Z patterns don't exist on touch), though `storeWithHistory` exists in the codebase.

**Remediation (recommended shape):** a compact sticky mobile action strip — either (a) condense the completion header into a 48px sticky bar (name + save state + overflow menu) once scrolled past, or (b) add Save/More into the bottom nav's right edge as a primary slot. Pair with dirty-state indication ("Saved ✓ / Unsaved •"). Surface **undo** on mobile (snackbar with Undo after destructive actions like removing a setup or clearing a slot). **Acceptance:** Save/Share reachable within one tap from any scroll position; undo available after destructive taps.

---

### Severity: MEDIUM

#### M1. Setup (loadout) switcher is buried at the very bottom of the page

**Evidence:** `SetupTabBar` renders _after all 12 sections_ (`BuildEditorLayout.tsx:338`) — at the bottom of ~3,300px+ of content, directly above the marketing footer. A mobile user has effectively no way to discover that multi-setup support exists. Additionally the sortable tabs set `touchAction: 'none'` (measured on the tab; `SetupTabBar.tsx:24-35`), so touches starting on a tab can't scroll the page, and long-press-to-reorder vs. horizontal-scroll gestures collide.

**Remediation:** on mobile, relocate the setup switcher to a compact control near the header (or a segmented control inside the sticky bar from H5). Use dnd-kit's `TouchSensor` with a hold-delay activation constraint (e.g. 250ms + 8px tolerance) instead of blanket `touchAction: 'none'`, restoring page scroll. **Acceptance:** setup switching visible without scrolling; page scrolls normally when a swipe starts on a tab.

#### M2. ~2,081px marketing footer appended to the editor; bottom nav floats over its links

**Evidence (live):** the global `Footer` (`AppLayout.tsx:150`) renders below the editor — measured **2,081px** tall (62% as tall as the editor content itself). The fixed bottom nav (z-index 1200) overlays the footer's tappable links (Join Discord, etc.) as you scroll into it.

**Remediation:** suppress the marketing footer on workspace routes (`/build-editor`, and likely `/roster-builder` — the app already has an embed mode that strips chrome, `AppLayout.tsx:49`), or collapse it to a one-line legal strip above the bottom-nav clearance. **Acceptance:** end of editor content is the end of the page (± a short legal line); no overlapped tap targets.

#### M3. Cookie consent banner stacks over the bottom nav and content

**Evidence (live):** on first visit the consent card covers the lower third of the screen including the entire bottom nav; the nav icons remain visible _under_ it at the screen edge (two stacked bottom layers competing).

**Remediation:** ensure the consent banner sits above the nav _visually and logically_: while open, hide the nav (`inert`) or render the banner as a proper bottom sheet with scrim; add safe-area padding (shared with H2). **Acceptance:** no interleaved/stacked bottom bars; nav unusable-but-hidden rather than half-covered while consent is open.

#### M4. Mobile header spends ~480px before the first section, with unbalanced rows

**Evidence (live, screenshots):** at 390px the header stacks name/description card, class+completion chip, then a right-aligned icon strip with a large dead zone to its left. The icon strip (save/link/roster/publish) is a segmented control of unlabeled 40×44 icons whose meaning isn't discoverable on touch (tooltips again), one of which renders in an "active" filled state that reads as a toggled mode rather than a button.

**Remediation:** fold the four segmented icons into the `More actions` overflow (already exists at `BuildCompletionHeader.tsx:1016-1117` for `<lg`) keeping only **Save** as a visible labeled button; let the name field span full width; move class/completion chip inline with the name row. Target ≤200px of header at `<md`. **Acceptance:** first section header visible above the fold on an 844px-tall viewport with the browser chrome present.

#### M5. Assigned-skill icons can silently fail, leaving an "✕" tile

**Evidence (live):** after assigning _Burning Embers_, the slot rendered a placeholder ✕ instead of the ability icon (icon asset failed to resolve in this environment). On flaky mobile networks this will happen in the field; there's no retry/skeleton/alt-label treatment, and the ✕ reads as "remove" or "error".

**Remediation:** add a loading skeleton + graceful fallback (ability initials or skill-line glyph) with `onError` retry for icon images across `SkillBarPicker`/`GearSlotCard`; confirm whether icons come from a third-party CDN and whether they're cacheable/service-worker precachable. **Acceptance:** simulated icon-fetch failure still yields an identifiable, non-error-looking slot.

#### M6. Assorted sub-target-size and hover-gating issues in section content

**Evidence:** setup tab ≈ 102×37px (borderline); trait/enchant chips in `GearSlotCard` ~20-24px tall tap targets that open pickers; `BuildNavRail` desktop-style `:hover` colors ungated (`BuildNavRail.tsx:177-179`) causing sticky-hover states after taps; 6px completion dots carry meaning (done/not-done) at sub-perceptual size; picker category chips measured 14px tall.

**Remediation:** sweep interactive elements inside sections for ≥24px (WCAG 2.5.8) with ≥44px preferred on primary paths; gate all remaining `:hover` styles behind `@media (hover: hover)`; raise completion dots to ≥8px with an accessible state (already present via aria-labels — good). **Acceptance:** automated check (see Phase 4) reports zero interactive targets <24px in the editor.

---

### Severity: LOW

- **L1. Tooltips on touch generally.** Multiple `Tooltip`-wrapped controls (nav items, header icons) have no touch-visible label. Newer code (e.g. `SkillBarPicker.tsx:136` info-button affordance, `IconPickerGrid` hover gating) shows the right pattern — apply it consistently.
- **L2. Dialog scroll chaining.** Fullscreen/floating pickers don't set `overscroll-behavior: contain`; rubber-banding at list ends scrolls the page behind the dialog. One-line fix per scroll container.
- **L3. Scrollbar styling forced on mobile.** Global 12px custom scrollbars (`ReduxThemeProvider.tsx:689-724`) are desktop-oriented; harmless on iOS but adds visual noise on Android WebView overlays. Consider scoping to `(pointer: fine)`.

### Explicitly verified as good (keep)

- `PickerDialog` fullscreen-at-`sm` with slide-up sheet and sticky search — the correct pattern; the fix for C2 is consolidation onto it.
- Theme-level `minHeight: 44` for coarse pointers on MUI buttons (`ReduxThemeProvider.tsx:240`) — header action buttons measured 40-44px. ✔
- `LazySection`/IntersectionObserver mounting + `Collapse unmountOnExit` on mobile — sensible perf strategy.
- Section completeness exposed via `aria-label`s and a live region; skip-link present.
- `@media (hover: hover)` gating in `IconPickerGrid`; info-button-instead-of-tooltip in `SkillBarPicker`.
- No horizontal overflow of the page itself (`docWidth === 390`). ✔

---

## Remediation Plan

Sequenced for risk/effort. Phases 0–1 are the "stop the bleeding" release; 2–3 modernize the experience; 4 locks it in. Estimates assume one engineer familiar with the codebase.

### Phase 0 — Critical readability & correctness (≈2-3 days)

| #   | Work item                                                                                                                                 | Findings | Touched files (primary)                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| 0.1 | Opaque fallback for all glass surfaces under `data-perf='low'`; central `.glass-dialog` CSS or token-level solid bg + optional blur layer | C1       | `src/index.css`, `buildEditorTokens.ts`, `GearPicker.tsx`, `SkillBarPicker.tsx` |
| 0.2 | Migrate `GearPicker` + `SkillBarPicker` onto `PickerDialog` (fullscreen sheet on mobile)                                                  | C2, C1   | `pickers/GearPicker.tsx`, `pickers/SkillBarPicker.tsx`                          |
| 0.3 | ≥16px font on all mobile inputs (name, description, picker search)                                                                        | H4       | `BuildCompletionHeader.tsx`, `PickerDialog.tsx`, `glassInputSx.ts`              |
| 0.4 | Safe-area padding on bottom nav (+ cookie banner), bump content clearance                                                                 | H2, M3   | `BuildNavRail.tsx`, `BuildEditorLayout.tsx`, consent component                  |

### Phase 1 — Navigation & reachability (≈4-5 days)

| #   | Work item                                                                                         | Findings   |
| --- | ------------------------------------------------------------------------------------------------- | ---------- |
| 1.1 | Bottom nav v2: 5 primary items + "More" bottom sheet; ≥44px targets; visible labels; hover gating | H1, M6, L1 |
| 1.2 | Nav tap expands target section then scrolls (`scroll-margin-top` on anchors; settle-aware scroll) | H3         |
| 1.3 | Sticky condensed action bar on scroll (Save + dirty state + overflow)                             | H5         |
| 1.4 | Header compaction at `<md` (fold icon strip into More; full-width name)                           | M4         |
| 1.5 | Suppress/condense marketing footer on editor routes                                               | M2         |

### Phase 2 — Interaction quality (≈3-4 days)

| #   | Work item                                                                                                                    | Findings  |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | --------- |
| 2.1 | Relocate setup switcher into header/sticky bar on mobile; dnd-kit `TouchSensor` hold-to-drag instead of `touchAction:'none'` | M1        |
| 2.2 | Mobile undo: snackbar-with-Undo for destructive actions (slot clear, setup delete), backed by existing `storeWithHistory`    | H5 (undo) |
| 2.3 | Icon load skeletons + fallbacks + retry in skill/gear tiles                                                                  | M5        |
| 2.4 | Touch-target sweep inside sections (chips, info buttons, dots)                                                               | M6        |
| 2.5 | `overscroll-behavior: contain` on dialog scroll containers; scope custom scrollbars to `(pointer: fine)`                     | L2, L3    |

### Phase 3 — Modern-platform polish (≈3 days, optional but recommended for a June-2026 baseline)

- **Bottom-sheet pickers with drag-to-dismiss** (the fullscreen `PickerDialog` becomes a true sheet: drag handle, swipe-down close, `dvh`-based height so URL-bar collapse doesn't jump the layout).
- **View Transitions** for section expand/collapse and picker open/close — `src/styles/view-transitions.css` already exists and the team has a view-transitions skill/guide; respect `prefers-reduced-motion`.
- **Container queries for section cards** so cards adapt to the bento column width rather than the viewport (future-proofs tablet/split-screen, removes some `isMobile` branching).
- **Virtualize the gear-set list** in the picker (700+ rows) — biggest scroll-perf win for the exact low-tier devices from C1; pairs naturally with the `PickerDialog` consolidation.
- **List labels under nav icons & haptic tap feedback** (`navigator.vibrate(10)` guarded) for slot assignment confirmation.

### Phase 4 — Regression safety net (≈2 days, parallelizable)

- **Playwright mobile project** (390×844, `hasTouch`, mobile UA) covering: open each picker → fullscreen + readable; nav tap → section content visible; save reachable from page bottom; no horizontal page overflow.
- **Perf-tier matrix**: force `data-perf='low'` and screenshot-diff the gear picker, skill picker, header, and nav (catches any future transparent-glass regression — C1's class of bug).
- **Touch-target audit step**: in e2e, query all interactive elements in `main` and assert bounding boxes ≥24×24 (fail CI on new violations).
- **Lighthouse CI (mobile)** budget on `/build-editor` for a11y + best-practices; document a 5-minute real-device smoke checklist (iOS zoom-on-focus, home-indicator overlap, Android back gesture vs. dialogs).

---

## Appendix A — Live measurements (390×844 @3x, dark mode, perf tier `low`)

| Element                     | Measured                                                        | Reference                             |
| --------------------------- | --------------------------------------------------------------- | ------------------------------------- |
| Viewport meta               | `width=device-width, initial-scale=1, viewport-fit=cover`       | `index.html`                          |
| Bottom nav button           | 36×30px, icon 18px, label = hover tooltip only                  | `BuildNavRail.tsx:154-199`            |
| Bottom nav content width    | 440px in 390px viewport (clipped, fade hint)                    | `BuildNavRail.tsx:125`                |
| Bottom nav `padding-bottom` | 0px (no safe-area)                                              | `BuildNavRail.tsx:123`                |
| Header action buttons       | 40-44×44px ✔                                                    | theme coarse-pointer rule             |
| "More actions" button       | 36×36px                                                         | `BuildCompletionHeader.tsx`           |
| Build name input            | 15px font                                                       | `BuildCompletionHeader.tsx:519`       |
| Description input           | **11px font**, 21px tall                                        | `BuildCompletionHeader.tsx:539`       |
| Picker search input         | 13px font, 36px tall                                            | `PickerDialog.tsx:121` / `GearPicker` |
| Gear picker paper           | 326×581 @ (32,132); bg `rgba(0,0,0,0)`; `backdrop-filter: none` | `GearPicker.tsx:456-468`              |
| Setup tab                   | 102×37px; `touch-action: none`                                  | `SetupTabBar.tsx`                     |
| Section header row          | full-width × ~64px ✔                                            | `SectionCard.tsx`                     |
| Page scroll height          | 3,358px (2 sections expanded)                                   | —                                     |
| Marketing footer height     | 2,081px                                                         | `AppLayout.tsx:150`                   |
| Nav tap → section expanded? | **No** (`aria-expanded="false"` after tap)                      | `BuildNavRail.tsx:96-99`              |
| Completion dot              | 6×6px                                                           | `BuildNavRail.tsx:184-194`            |

## Appendix B — Why the perf tier matters so much here

`detectPerfTier.ts` maps GPU benchmark tier → app tier as: tier ≤1 → `low`; tier 2 → `low` **if mobile** else `medium`; tier 3 → `high`; heuristic (RAM ≤2GB / ≤2 cores / ≤4GB+≤4 cores) can force `low`. detect-gpu classifies a broad band of in-market phones as tier 2, so `low` is the _expected_ tier for much of the mobile audience — every mobile design decision must therefore assume `backdrop-filter` is unavailable. Any surface whose legibility depends on blur is a mobile defect by construction. The fix pattern (solid base color, blur as progressive enhancement) should be encoded in `BE_TOKENS.glass` and the shared dialog primitives rather than per-component.
