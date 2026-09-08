# ESO Helper Design System

Source-of-truth project for Claude Design when generating UI for the ESO log
aggregator app — a modern glassmorphism analytics dashboard (MUI v9 + Emotion,
ECharts 6, Inter / Space Grotesk). **Not** fantasy-themed.

**Last verified against app source: 2026-07-26.**

## What's here

- `colors_and_type.css` — every token: core dark/light schemes, role, rarity
  (two per-surface palettes), class, and chart palettes, blur-tier and
  inset-highlight scales, radii/spacing/motion, chip variants, type ramp.
- `SKILL.md` — generation rules: identity, hard rules (blur ladder, inset
  alphas, perf-tier degradation), exact idiom snippets, the card index, and
  the known-defects list.
- `preview/*.html` — self-contained recipe cards, each showing dark and light
  side by side over the app's real backdrop. Grouped by first-line marker
  `<!-- @dsCard group="…" -->` into: **Colors, Surfaces, Boundaries,
  Patterns, Components** (plus existing Brand/Type/Spacing cards).

## How this maps to the repo

This project is authored in the repo at `design-sync/` (eso-log-aggregator)
and pushed here with the `/design-sync` tool — the repo copy is the reviewable
history; this project is what Claude Design reads. Files starting with `_` are
local authoring aids and are not uploaded.

Real values live in TypeScript, not CSS. Primary sources:

- `src/ReduxThemeProvider.tsx` — MUI createTheme: core tokens (lines 37–69),
  runtime CSS vars (587–610), all component overrides.
- Recipe modules: `src/theme/glassCardSurface.ts`, `src/theme/dropdownMenu.ts`,
  `src/utils/playerCardStyleUtils.ts`, `src/features/build-editor/theme/*`
  (`buildEditorTokens.ts`, `classColorMap.ts`), `src/utils/roleColors.ts`,
  `src/utils/gearMappings.ts` + `src/components/GearIcon.tsx`,
  `src/utils/echartsTheme.ts`, `src/styles/view-transitions.css`,
  `src/index.css` (perf tiers only — its `--site-*` block is legacy).

## Maintenance

Hand-maintained — there is no generated pipeline. When the app's theme or
recipe modules change, re-check the cited `file:line` values (start with
`ReduxThemeProvider.tsx` and the recipe modules above), update the affected
card(s) + `colors_and_type.css`, bump the last-verified date, and re-sync via
`/design-sync`. The app's current rendered design is canonical: transcribe
exactly, per surface — never round, unify, or "improve" values.
