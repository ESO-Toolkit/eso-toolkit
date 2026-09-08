# Build ⇄ Loadout Bridge — Remaining Phases Implementation Plan

> Status: **proposal / not yet built.** Author: Claude Code. Date: 2026-06-22.
>
> This plan covers the work that remains after the three shipped PRs and is meant
> to be reviewed and scoped before any of it is implemented. Each section is an
> independent PR-sized (or epic-sized) unit with a data model, a file-level
> breakdown, a phasing suggestion, test strategy, and risks.

## Context — what already shipped

| PR    | Phase                   | Summary                                                                                             |
| ----- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| #1333 | P1                      | Weapon-slot export gate — Wizard's Wardrobe (WW) codes now carry weapon slots.                      |
| #1334 | P2 (data + entry point) | `buildSetupToWWTransfer` bridge + **Send to Wizard's Wardrobe** wired into `BuildCompletionHeader`. |
| #1335 | P3 (IA foundation)      | Route rename `/loadout-manager` → `/loadouts` with a permanent redirect.                            |

**Owner decisions already recorded (governing everything below):**

1. The **Build Editor is the single canonical editor.** The Loadout Manager's
   editing pickers are the ones that get retired/replaced, not the reverse.
2. The route is now `/loadouts` (done). The feature _directory_
   `src/features/loadout-manager/` is intentionally **not** renamed (100+ import
   sites, no user benefit).

Three bodies of work remain: **(A) Loadout Library**, **(B) Picker + stat-engine
consolidation**, **(C) Comparator + health/EHP badges.** They can ship in this
order; B is the largest and riskiest.

---

## A. Loadout Library (the real P3 IA)

### Goal

Give loadouts the same first-class "saved, named, browsable" treatment that
builds and rosters already have, instead of the current session-scoped
`pages[characterId][trialId][pageIndex]` tree which is invisible and ephemeral.

### Current state (facts)

- `src/features/loadout-manager/store/loadoutSlice.ts` — state is
  `LoadoutState` nested as `pages[characterId][trialId][pageIndex].setups[]`;
  reducers `addSetup` / `updateSetup` / `deleteSetup` / `duplicateSetup` /
  `importSetup` / `replaceSetup`.
- `src/store/storeWithHistory.ts` — the `loadout` slice **is** persisted via
  redux-persist (whitelisted), so data survives reloads, but only as the working
  trial/character tree. There is **no** named-library concept.
- **There is no `savedLoadouts` slice** analogous to `src/store/saved_builds/`
  and `src/store/saved_rosters/`.

### Design — mirror `saved_builds`

Create `src/store/saved_loadouts/` following the exact shape of
`saved_builds/` (the closest precedent):

```
src/store/saved_loadouts/
  savedLoadoutsSlice.ts      # slice + reducers + default export reducer
  savedLoadoutsSelectors.ts  # selectSavedLoadouts, selectSavedLoadoutById
  index.ts                   # re-exports
```

Entry shape (mirrors `SavedBuild`):

```ts
interface SavedLoadout {
  id: string; // uuid
  name: string;
  description?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  // The portable payload — a single setup (the WW/loadout unit) plus light
  // provenance so the library row can show class/role without decoding gear.
  setup: LoadoutSetup; // from loadout-manager/types
  meta?: { trialId?: string; characterName?: string };
}
```

Reducers: `saveLoadout`, `updateSavedLoadout`, `deleteSavedLoadout`,
`renameSavedLoadout`. Register in `storeWithHistory.ts` reducer map **and** the
redux-persist whitelist (key `savedLoadouts`).

### UI

- A **Library** tab/section on `/loadouts` listing saved loadouts as cards
  (name, class/role chips, updated date, actions: Load, Duplicate, Delete,
  Export → WW). Reuse the visual language of the My Builds list.
- A **"Save to Library"** action in the Loadout Manager's setup editor and in
  the Build Editor's WW dialog ("Save as loadout"), so the bridge feeds the
  library directly.

### File-level work

- New: `src/store/saved_loadouts/*` (3 files) + a `__tests__` slice test.
- New: `src/features/loadout-manager/components/LoadoutLibraryPanel.tsx` (+ test).
- Edit: `storeWithHistory.ts` (register reducer + persist whitelist).
- Edit: `LoadoutManager.tsx` to host the Library panel.
- Optional: a "Save as loadout" button in `BuildCompletionHeader`'s WW dialog
  (reuses `buildSetupToLoadoutSetup`).

### Tests

- Slice reducer unit tests (CRUD + rename, mirroring `savedBuildsSlice` tests).
- `LoadoutLibraryPanel` render test (list, empty state, delete confirm).

### Risks / notes

- **Low risk.** This is additive and follows an established pattern. The only
  cross-cutting touch is `storeWithHistory.ts` (persist whitelist) — must be
  added or saved loadouts won't survive reload.
- Scope guard: do **not** migrate the existing `pages` tree into the library in
  this PR; offer "Save to Library" as an explicit user action and leave the
  working tree as-is. A migration is a separate, riskier follow-up.

**Estimated size:** 1 medium PR.

---

## B. Picker + stat-engine consolidation (the P2 UI merge)

### Goal

Make the Build Editor the one true editor by (1) bringing its richer pickers to
the loadout surface where needed and (2) exposing the stat engine so loadouts can
show stats — without a second, divergent editing UI to maintain.

### Current state (facts)

**Build Editor pickers** (`src/features/build-editor/components/pickers/`) are the
rich, Redux-coupled set: `GearPicker` (set-aware, slot-validating),
`SkillBarPicker` (front/back bars, copy/swap, morphs), `ChampionPointsPicker`,
`FoodPicker`, `PotionPicker`, `PassivesPicker`, `BulkGearToolbar`,
`EquipmentPicker` (prop-driven, read-only display grid).

**Loadout Manager editors** (`src/features/loadout-manager/components/`) are the
simpler, prop-driven set: `GearSelector`, `SkillSelector`,
`ChampionPointSelector`, `FoodSelector`, wrapped by `SetupEditor`. They are
functional but minimal (no set categorization, no bulk ops).

**Stat engine** (`src/features/build-editor/engine/`): pure functions
`calculatePenetration / calculateCritDamage / calculateCritChance /
calculateArmor`, aggregated by `calculateBuildStats`. Types in `stat-types.ts`
(`StatResult`, `BuildStats`, `StatOverrides`); constants in `stat-constants.ts`.
Consumed only by `build-editor/components/sections/StatsSection.tsx`. **The
loadout-manager has no stat computation today.**

### The key architectural constraint

`buildLoadoutBridge.ts` deliberately keeps the dependency **one-way**:
`build-editor → loadout-manager`. The Build Editor pickers are coupled to the
**build** Redux slice and the `BuildSetup` shape; the loadout editors operate on
`LoadoutSetup`. We must not create a cycle (loadout-manager importing
build-editor) — that would invert the established direction and risk circular
imports.

### Recommended approach — extract, don't import across features

Rather than have loadout-manager import build-editor pickers (cycle risk) or
duplicate them (drift), **extract the genuinely shared, presentational picker
cores into a neutral location** (e.g. `src/components/gear/` or a new
`src/features/shared-editors/`) that both features depend on. Both `BuildSetup`
and `LoadoutSetup` already share the gear/skill types, so a picker keyed on
`GearConfig` / `SkillsConfig` (not on a Redux slice) is feature-agnostic.

Phasing:

1. **B1 — Extract GearPicker core.** Lift the presentational, `GearConfig`-keyed
   parts of `GearPicker` + `BulkGearToolbar` into the shared location with a
   thin Redux-bound wrapper left in build-editor. (Largest single step; do it
   first and in isolation.)
2. **B2 — Adopt the shared gear picker in the loadout `SetupEditor`**, replacing
   `GearSelector`. Verify WW export parity.
3. **B3 — Repeat for the skill bar** (`SkillBarPicker` core → shared → adopt in
   loadout `SkillSelector`).
4. **B4 — Expose the stat engine to loadouts.** The engine is pure and lives in
   build-editor; either (a) move `engine/` to a neutral `src/engine/` so loadouts
   can import it without a feature cycle, or (b) accept a one-way
   loadout→build-editor dependency _only for the pure engine module_ (no React).
   Option (a) is cleaner. Then render a compact stats strip per loadout setup
   using the existing `StatGauge` / `StatBreakdown`.

### Tests

- Each extracted picker keeps/ports its existing test suite (the GearPicker
  `__tests__` already has icon/dual-wield/mixed-weapon coverage — these must
  pass against the extracted core).
- New parity test: a setup edited via the shared picker produces the same WW
  export as before.
- Engine relocation: existing `engine/__tests__` must pass unchanged after the
  move (import-path-only change).

### Risks / notes

- **High risk / highest effort.** Touches the most-used editing surfaces and the
  stat engine's import graph. Strongly recommend shipping B1–B4 as **separate
  PRs**, not one.
- Cycle risk is the main trap — the extraction approach is specifically to avoid
  it. Do not let loadout-manager import from build-editor `components/`.
- Visual regression risk on the gear picker (glass styling, animations) — pair
  with the dev-preview deploy for manual review.

**Estimated size:** 3–4 PRs (one per B-step).

---

## C. Comparator + health / EHP badges (P4 differentiators)

### Goal

Let users compare setups/builds side by side and see survivability at a glance
(health + EHP), which nothing in the app does today.

### Current state (facts)

- **No comparison UI exists anywhere** (searched: compare/diff/versus). Stats
  show one active setup at a time in `StatsSection`.
- The stat engine computes pen / crit dmg / crit chance / armor only. **It does
  not compute Health or Effective HP.** `BuildAttributes.health` is a raw
  user-entered number, not derived.

### Design

**C1 — Health + EHP in the engine (prerequisite).**

Add pure functions to `engine/stat-engine.ts`:

- `calculateHealth(...)` — base + attribute points (×health-per-point) + gear set
  bonuses + race/class passives + food + self-buffs (Major/Minor Fortitude). Most
  inputs already exist as constants in `stat-constants.ts`; new health-specific
  constants will be needed.
- `calculateEHP(health, resistance)` — combine health with the existing armor →
  mitigation curve (the `calculateArmor` cap of 33,100 = 50% mitigation already
  encodes the curve) to produce an effective-HP number, optionally split
  physical/spell.

Extend `BuildStats` with `health: StatResult` and `ehp: StatResult` (reusing the
`StatResult` shape). **This is a breaking change to `BuildStats`** — every
consumer (currently just `StatsSection`) must be updated.

**C2 — Health/EHP badge.** A compact badge component surfacing health + EHP +
mitigation %, shown in `StatsSection`, on build/loadout cards, and (stretch) on
the WW export dialog.

**C3 — Comparator.** A side-by-side grid/modal taking 2–N setups (or saved
builds/loadouts) and rendering all stats in columns with per-row deltas. Pin
state can live in a small UI slice or local component state. Reuse
`calculateBuildStats` per column.

### File-level work

- Edit: `engine/stat-engine.ts`, `engine/stat-types.ts`, `engine/stat-constants.ts`.
- Edit: `components/sections/StatsSection.tsx` (consume new stats).
- New: `components/StatHealthBadge.tsx` (+ test).
- New: `components/BuildComparator.tsx` (+ test).
- Engine tests for `calculateHealth` / `calculateEHP` against known reference
  builds (this is the part most likely to be _subtly wrong_ — needs reference
  values validated by a human who knows ESO health math).

### Risks / notes

- **Medium–high risk.** The health/EHP math is the crux: ESO health scaling,
  set bonuses, and mitigation curves must be validated against in-game reference
  numbers. Like the WW round-trip, **this needs human verification** — the
  engine can't be assumed correct from code review alone.
- `BuildStats` extension ripples to all stat consumers (small set today, but the
  type change is breaking).
- Comparator is mostly UI and low-risk once the engine produces the numbers.

**Estimated size:** C1 = 1 PR (engine, gated on human-validated reference
numbers); C2 = 1 small PR; C3 = 1 medium PR.

---

## Suggested sequencing

1. **A. Loadout Library** — additive, low risk, immediate user value.
2. **B1–B4. Picker + engine consolidation** — the big structural work; do the
   engine relocation (B4a) early since C depends on the engine being reachable.
3. **C1 → C2 → C3. Health/EHP + comparator** — engine math first (with human
   validation), then badges, then the comparator UI.

## Cross-cutting verification gaps (must be human-checked)

- **WW in-game round-trip** (carried over from P1/P2) — paste a generated code
  into Wizard's Wardrobe and confirm gear/weapons equip.
- **Health/EHP reference numbers** (C1) — validate engine output against known
  in-game builds before trusting the badges.

Neither can be verified from this environment (no game client).
