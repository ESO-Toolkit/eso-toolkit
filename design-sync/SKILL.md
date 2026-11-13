# ESO Helper Design System — generation instructions

Read this before generating any UI in this system. `colors_and_type.css` holds
every token; the `preview/` cards are living recipe demos (index below).
Values were verified against the app source on 2026-07-26.

## Identity

A **modern glassmorphism analytics app** for ESO combat-log analysis. It is
**NOT fantasy/game-themed** — no parchment, no runes, no medieval type. Think
premium data dashboard: dark cosmic backdrops, frosted glass, cyan accents,
dense-but-calm stat layouts.

- **Stack:** MUI v9 + Emotion (`sx` / `styled`), ECharts 6, Vite, TypeScript.
- **Type:** body Inter; headings Space Grotesk 600. Noto Sans exists only as a
  system glyph fallback in the font stack — never a deliberate choice.
- **Theming:** `<html data-color-scheme="dark|light">` + runtime CSS vars
  published on `:root` — `--bg`, `--panel`, `--panel-2`, `--text`, `--muted`,
  `--accent`, `--accent-2`, `--ok`, `--warn`, `--danger`, `--border`,
  `--scrollbar-*`. Dark is the primary scheme.
- **Light-mode accent is `#0f172a` dark slate — intentional.** Light mode reads
  as "ink on paper"; cyan `#38bdf8` survives only where recipes hard-code it.
- Radii ramp: 8 controls / 10 base / 12 badges / 14 cards / 24 dialogs /
  28 glossy chips / 9999 pills.

## The blur-tier ladder (hard rule)

Every glass surface picks its `backdrop-filter: blur()` from its tier:

| Tier | Blur |
|---|---|
| Chrome (app bar, bottom bars) | 8–10px |
| Chips & pills | 6–10px |
| Cards & panels | 12–16px |
| Dialogs | 10–20px (standard dialog 20, reduced picker 10) |
| Menus & dropdowns | 20–24px (often `saturate(1.5)`) |
| Hero / mobile sheet / max tier | 22–24px |

Tooltips: `blur(16px) saturate(1.4)`. Alerts: `blur(8px)`.
**Always pair `backdropFilter` with `WebkitBackdropFilter`** — every recipe in
the app writes both.

## The inset top-highlight alpha scale (hard rule)

Glass surfaces get `inset 0 1px 0 rgba(255,255,255, α)` appended AFTER the
depth shadow:

- α = **0.05–0.06** panels / large cards (dark)
- α = **0.08–0.12** menus and dropdowns (dark)
- α = **0.2–0.3** glossy chips (0.3 on hover)
- α = **0.6–0.9** light mode panels/menus

Bottom shading (`inset 0 -1px 0 rgba(0,0,0,…)`) appears ONLY in glossy chips.
Recessed inputs invert to dark inner shadow: `inset 0 2px 4px rgba(0,0,0,0.4)`.

## Key idioms (exact snippets)

**Mask-XOR gradient border** — the repo's standard gradient ring
(IconPickerGrid.tsx:213-227). An absolutely-positioned overlay whose padding
equals the ring width:

```css
position: absolute; inset: 0; border-radius: 14px; padding: 1.5px;
background: <gradient>;
-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
-webkit-mask-composite: xor;
mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
mask-composite: exclude;
pointer-events: none;
```

**Accent top strip** (glass cards, dropdowns, summary cards):

```css
&::before {
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; /* menus use 2px */
  background: linear-gradient(90deg, transparent 0%, rgba(ACCENT_RGB, 0.95) 50%, transparent 100%);
  pointer-events: none; z-index: 1;
}
```

Variant: inset "glow slit" — `top: 1px; left: 12%; right: 12%; height: 1px` in
`rgba(var(--be-accent-rgb), 0.70)` (GlassPanel primary).

**Layout-safe selection rail** — never a real border (avoids layout shift):

```css
box-shadow: inset 3px 0 0 rgb(56,189,248);  /* menu items, table first cells */
```

(Alternative border-rail idiom reserves space with `border-left: 3px solid transparent`.)

**Accent glow signature** — hover/active glow appended after the depth shadow:

```css
box-shadow: <depth shadow>, 0 0 Rpx rgba(ACCENT_RGB, A);  /* R = 16–60, A = 0.12–0.35 */
/* e.g. card hover: 0 14px 48px rgba(0,0,0,0.5), 0 0 28px rgba(56,189,248,0.14) */
```

**Electric conic border** (top-DPS card). Requires `@property` registration or
the angle will not animate, and the host needs `overflow: visible` plus room
for the halo:

```css
@property --tdps-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
@keyframes electricBorderSpin { to { --tdps-angle: 360deg; } }
/* ring overlay: inset -1px; padding 1.5px; mask-XOR as above; then */
background: conic-gradient(from var(--tdps-angle), transparent 0deg,
  rgba(251,191,36,0.15) 40deg, rgba(245,158,11,0.85) 80deg, #fde68a 100deg,
  rgba(245,158,11,0.85) 120deg, rgba(251,191,36,0.15) 160deg,
  transparent 200deg, transparent 360deg);
filter: drop-shadow(0 0 4px rgba(245,158,11,0.55));
animation: electricBorderSpin 4s linear infinite;
```

Plus a pulsing outer halo (`inset: -3px`, amber box-shadows, 2.8s ease-in-out).

**Class accent mechanism** — the build editor injects `--be-accent`,
`--be-accent-rgb`, `--be-glow`, `--be-gradient` on a wrapper div from the
selected class (classColorMap.ts); recipes consume
`rgba(var(--be-accent-rgb), α)`. Generalize this pattern for any theming axis.

**Glass surface base** (accent card, glassCardSurface.ts): translucent dual
gradient (accent bloom over base) + `blur(16px)` + 1px accent border at
0.18–0.20 alpha + top strip + inset highlight; hover raises border alpha to
~0.42 and adds the glow signature.

## Perf-tier axis (hard rule)

`<html data-perf="high|medium|low">`. At `data-perf="low"` the app strips ALL
`backdrop-filter`s and freezes ALL animations (src/index.css:136-177), keeping
only feedback loops (spinners/progress via `--perf-anim-duration` /
`--perf-anim-iteration` escape hatch). **Every design must degrade to an
opaque, static equivalent**: dark glass dialogs fall back to solid `#0f172a`;
translucent fills must stay legible without blur. Charts drop glow/gradient
styles and animation at low tier.

## Accessibility (already in the app — preserve it)

- `prefers-reduced-motion: reduce` collapses all animations/transitions to
  0.01ms, with the same spinner escape hatch; `.u-fade-in` etc. are disabled.
- View transitions are zeroed under reduced motion.
- Focus rings: `.u-focus-ring:focus-visible` → `outline: 2px solid var(--accent);
  outline-offset: 2px; border-radius: inherit`. Build editor scopes the same
  ring in `var(--be-accent)`. Filter fields use border
  `rgba(96,165,250,0.55)` + ring `0 0 0 3px rgba(96,165,250,0.12)`.
- Touch targets: buttons get `min-height: 44px` on coarse pointers; form fields
  are ≥16px font on mobile (blocks iOS zoom).

## Card index (`preview/`)

| Card | Group | Documents |
|---|---|---|
| brand-* | Brand | Logos, class icons, brand marks (assets) |
| colors-core | Colors | Dark core tokens (`--bg`…`--border`) |
| colors-light-mode | Colors | Full light token set; the dark-slate accent rule |
| colors-roles | Colors | Role colors (dark solids / light gradients + solid fallbacks), colored-area termination (hard 1px seam, never a fade), progress-fill gradients |
| colors-rarity | Colors | BOTH rarity palettes labeled by surface (gear-UI ESO + desaturated; build-editor Material), rarity borders on gear tiles |
| colors-charts | Colors | 12-swatch ECharts palettes dark/light, glow-line + gradient-area styles |
| type-* | Type | Type ramp, Inter/Space Grotesk pairing, mono/tabular numerals |
| spacing-* | Spacing | 8px spacing unit, radii ramp |
| surface-glass-tiers | Surfaces | The blur ladder with live tooltip/dialog/appbar/alert swatches |
| surface-glass-cards | Surfaces | Accent card glass (G1) × summary accents info/damage/death |
| surface-glass-menus | Surfaces | Cyan dropdown glass (G2) + HeaderBar rich dropdown (G8: shimmer strip, noise, mouse spotlight) |
| surface-be-glass | Surfaces | Build-editor GlassPanel variants (G3) + `--be-accent` class-var mechanism |
| surface-glossy-chips | Surfaces | Glossy chip shine-sweep + gloss dome (G4) + legendary rainbow borderImage |
| surface-filter-fields | Surfaces | Filter bar panel/field/segmented glass (G9) + recessed input wells (G12) |
| surface-corner-glow | Surfaces | Replay control-deck corner glows (G11) + footer radial bloom |
| surface-card-grid | Surfaces | Card-grid glass (G13) + scribing glass (G10) |
| boundary-accent-rails | Boundaries | borderLeft rails + layout-safe `inset 3px 0 0` rails (B1/B2) |
| boundary-top-strips | Boundaries | Four top-strip sub-patterns (B3) |
| boundary-gradient-borders | Boundaries | Mask-XOR ring idiom + borderImage caveat (B4/B6) |
| boundary-electric-border | Boundaries | Animated conic electric border (B5) |
| boundary-tables-seams | Boundaries | Accent table header seam, zebra 0.035, hover rail (B12) |
| boundary-glows-insets | Boundaries | Glow signature + inset-highlight alpha scale (B10/B11) |
| boundary-dividers | Boundaries | Tri-color hairline, @property shimmer divider, scanning dot (B14) |
| boundary-edge-masks | Boundaries | Scroll-edge mask fades, clip-path progress, overflow rules (B15) |
| boundary-focus-rings | Boundaries | All focus-ring variants (B16) |
| pattern-background-layers | Patterns | Nebula (dark) / Aurora (light) 4-layer backdrops |
| pattern-view-transitions | Patterns | 8 transition types + `--vt-*` easings |
| pattern-perf-tiers | Patterns | data-perf axis; what low tier strips; opaque fallbacks |
| comp-* (buttons, chips, tabs, navbar, player-card) | Components | MUI component overrides as rendered |
| comp-metric-pills | Components | MetricPill: 5 intents × solid/outline/mono variants (G14) |

## Known defects — do NOT replicate

These exist in the app and are documented so you don't copy or "fix" them:

1. **`u-hover-lift` / `u-fade-in-up` are undefined.** Eight components apply
   these classes but no rule defines them (only `.u-fade-in` / `.u-tab-enter`
   exist). Don't emit the undefined classes; don't invent styles for them.
2. **Three rarity palettes are intentional per-surface** (gear-UI ESO,
   gear-details desaturated, build-editor Material). Use the one matching the
   surface; never unify them or invent a fourth.
3. **Two `saturate()` dialects:** unitless (`saturate(1.4)`, `saturate(1.5)`)
   in tooltips/menus vs percentage (`saturate(140%)`–`saturate(180%)`) in
   editor glass. Match whichever the surface you're imitating uses.
4. **Two chip intent palettes:** glossy chip variants vs MetricPill intents are
   divergent copies. Each is canonical for its component only.
5. **Glossy chip light mode keeps the white border**
   (`1px solid rgba(255,255,255,0.15)`) — low-contrast, but as-shipped.
6. **GlassPanel declares a blur token (16) but never applies backdropFilter.**
   Build-editor panels are translucent-but-unblurred; document, don't add blur.
7. **borderImage caveat:** the borderImage shorthand can leave `border-color`
   at `currentColor` in some paint paths (why GlassPanel dropped its gradient
   borderImage). Prefer the mask-XOR ring; the legendary chip is the one
   sanctioned borderImage use.
