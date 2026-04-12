# Build Editor — Performance Audit

**Date:** 2026-04-11
**Scope:** `src/features/build-editor/**`
**Method:** Static analysis (Explore agent) + live Chrome DevTools Performance trace on `http://localhost:3002/build-editor` (**unthrottled desktop**) + best-practice research (Brave, MUI docs, web.dev).

> ⚠ **Device caveat:** All numbers below are on a fast desktop with no CPU throttling. At 4× CPU throttling (typical mid-tier phone) expect **~8–9 s per keystroke** and **~15–20 s LCP**. Users on mobile are seeing multi-second lockups on every character they type. A direct repro: during tracing the automated test framework timed out trying to click a gear slot **5 seconds** after a text input event — i.e., the page was still main-thread-blocked.

---

## TL;DR

User-reported lag is real and severe. On **unthrottled desktop**:

| Metric | Measured | "Good" threshold | Verdict |
|---|---|---|---|
| **LCP** (initial load) | **4,760 ms** | ≤ 2,500 ms | ❌ Poor |
| **INP** (single keystroke in Build Name) | **2,277 ms** | ≤ 200 ms | ❌ Catastrophic — ~11× threshold |
| — Processing duration (JS work) | 2,251 ms | — | ❌ |
| — Input delay | 5 ms | — | OK |
| **DOM size** | 818 elements, depth 17, max 60 children | < 1,500 / < 32 | ⚠ Large |
| **Layout update** (worst) | 136 ms / 437 nodes re-laid out | — | ❌ |
| **Style recalc** (worst) | 186 ms / 318 elements | — | ❌ |
| **Forced reflow** during keypress | 141 ms | — | ❌ |

Expect real user devices (low-end Android, older laptops, mobile Safari) to be **2–4× worse**. This is why users report lag.

**Single biggest cause:** `BuildEditorLayout.tsx:60` subscribes to the ENTIRE `buildEditor` Redux slice AND renders all 11 sections simultaneously. Every single edit cascades through all 11 sections → hundreds of React fiber reconciliations → hundreds of fresh inline `sx` objects → 186 ms of style recalc → 136 ms of layout. The 2.25 s of "Processing duration" is pure React render + Redux dispatch cost. (Persistence was investigated and ruled out — see note under H2.)

---

## Top 5 HIGH-severity findings (fix these first — ~80% of the wins)
> Numbering preserved from the original draft; H2 was downgraded to LOW after confirming redux-persist does not include `buildEditor`.

### H1 — Whole-slice `useSelector` + all sections always mounted
**Files:**
- `src/features/build-editor/components/BuildEditorLayout.tsx:60`
- `src/features/build-editor/components/BuildEditorShell.tsx:23`
- `src/features/build-editor/components/sections/GeneralSection.tsx:60`
- `src/features/build-editor/components/sections/StatsSection.tsx:30`
- (same pattern in Character, Subclassing, Equipment, Skills, Consumables, Champion, Passives, Guide, Settings sections)

**Code:**
```ts
const { isDirty, build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
```

**Why it's slow:** `(s) => s.buildEditor` returns the whole slice object. Immer gives it a new reference on *every* edit (even unrelated fields), so every section re-subscribes and re-renders. Combined with the layout that renders all 11 `<SectionCard>` children at once (BuildEditorLayout.tsx:139–266, `// Renders ALL sections simultaneously`), every keystroke → 11 section re-renders → ~800 DOM nodes re-evaluated.

**Fix:**
1. Split selectors per concern:
   ```ts
   const build = useSelector(selectBuild);                // memoized via reselect
   const setup = useSelector(selectActiveSetup);          // build.setups[idx]
   const isDirty = useSelector((s) => s.buildEditor.isDirty);
   const esoClass = useSelector((s) => s.buildEditor.build.esoClass);
   ```
2. Introduce `createSelector` for derived data (races list, setup, stat inputs).
3. Tab-gate sections. Render *only* the active section plus the currently-scrolled-into-view one. Use `IntersectionObserver` to mount/unmount expensive sections (Champion Points, Stats, Skills in particular).
4. Wrap each section component in `React.memo` and accept props (setup/build slices) instead of subscribing globally. That contains damage when a single field changes.

**Expected impact:** Drops keystroke INP from 2.2s to under ~300ms.

---

### H2 — Persistence investigation: **not the culprit** (good news)
**Files checked:**
- `src/store/storeWithHistory.ts:95–100` — redux-persist whitelist is `['ui', 'loadout', 'dashboard', 'savedRosters', 'savedBuilds']`. **`buildEditor` is deliberately excluded**, so redux-persist does NOT serialize the build on every action.
- `src/features/build-editor/components/BuildEditorLayout.tsx:77–96` — the Ctrl+S keydown effect re-registers on every `build` change, but only *fires* on Ctrl+S, so the re-registration cost is microseconds. Not a real bug.
- `src/features/build-editor/components/BuildCompletionHeader.tsx:169–171` — `localStorage.setItem(JSON.stringify(build))` only runs when the user clicks Save. Not per keystroke.

**Conclusion:** The 2.25 s processing time is **not** persistence overhead. It is React rendering the whole editor tree on every keystroke. This is a purely React/Redux architectural problem — H1 and H3 carry the full weight.

**Minor cleanup still worth doing** (LOW severity now):
- Use a ref for `build`/`activeSetupIndex` inside the Ctrl+S handler so the `useEffect` dep array can shrink to `[dispatch]`. Small churn reduction.
- Note that `dispatch(saveBuild(build))` on save hits redux-persist's `savedBuilds` slice. Confirm that save flow is not in a hot path (it isn't today — only user-initiated).

---

### H3 — Stat engine re-runs on every build edit (wide memo deps)
**Files:**
- `src/features/build-editor/components/sections/StatsSection.tsx:43–46`
- `src/features/build-editor/engine/stat-engine.ts`

```ts
const stats = useMemo(
  () => calculateBuildStats(setup, build, overrides),
  [setup, build, overrides], // entire build object
);
```

**Why it's slow:** `calculateBuildStats` iterates gear, CP, passives, buffs. The `build` dep means a tiny change (typing in the name, toggling a setting) causes a full stat recompute even though none of the stat inputs changed.

**Fix:**
- Depend only on fields the engine reads:
  ```ts
  const statInputs = useSelector(selectStatInputs); // { esoClass, races, gameMode, setups[i] }
  ```
- Or use `reselect.createSelector` to hash the minimal input set.
- As a quick win, split `build` into the handful of fields the engine actually reads (`gear`, `skills`, `cp`, `passives`, `consumables`, `esoClass`, `races`, `gameMode`).

---

### H4 — GearPicker filters ~500 items on every keystroke, no virtualization
**File:** `src/features/build-editor/components/pickers/GearPicker.tsx:372–404`

**Why it's slow:** Search `useMemo` depends on `[search, targetSlot]` and rebuilds `SetGroups` every open. No debounce on input. Renders all matches directly (no list virtualization). Opening a gear picker is one of the most frequent user interactions.

**Fix:**
1. Debounce the search input by 150–200 ms.
2. Cap rendered items to ~30 + "show more" button.
3. Virtualize the list with `react-window` (MUI's own Autocomplete virtualization demo uses this — https://mui.com/material-ui/react-autocomplete/#virtualization).
4. Memoize `getItemsBySlot(slot)` at module scope keyed by slot id.

---

### H5 — 11-section stagger animation on initial mount
**File:** `src/features/build-editor/components/BuildEditorLayout.tsx:125–266`

```tsx
<motion.div variants={staggerContainer} initial="hidden" animate="visible">
  {/* 11 SectionCard children */}
</motion.div>
```

Adds ~660 ms of animation + 11 composite layers at initial paint, piled on top of an already slow LCP.

**Fix:**
- Drop the animation on the container. Animate individual sections only on first becoming visible (IntersectionObserver).
- Or reduce `staggerChildren` from 0.06 → 0.02 and `y` offset to ≤ 8 px.
- Already-correctly disabled when `prefers-reduced-motion` — extend that behaviour to any device with `matchMedia('(pointer: coarse)')` or Network Information API `effectiveType === 'slow-2g'|'2g'|'3g'`.

---

### H6 — Large DOM + 186 ms style recalc driven by `sx` prop churn
**Measurement:** Chrome trace shows one style recalc spanning 318 elements / 186 ms on initial load; 141 ms of forced reflow during a single keypress.

**Why it's slow:** Every `<Box sx={{…}}>` passes a fresh object literal each render, so MUI re-hashes + re-generates styles constantly. GeneralSection alone has ~15 nested `<Box>` with inline sx per alliance card (9 cards × each). Add `backdrop-filter: blur(20px)` on PickerDialog and `blur(16px)` on SetupTabBar and every scroll/keypress forces a full composite pass.

**Fix:**
- Hoist stable sx objects to module scope (or `useMemo` when they depend on `isDark`):
  ```ts
  const RACE_CARD_SX = { /* static */ };
  // or: const sx = useMemo(() => ({...}), [isDark, color, selected]);
  ```
- Replace frequent inline sx with a `styled()` component for items rendered in loops (race cards, CP stars, gear slot cards).
- Add `will-change: transform` to the blurred layers, **or better**, downgrade `backdrop-filter: blur(20px)` → `blur(8px)` and only apply on desktop (`@media (hover: hover) and (pointer: fine)`).
- MUI docs explicitly recommend CSS variables for highly dynamic values instead of per-render sx — https://mui.com/system/getting-started/the-sx-prop/#performance-tradeoffs.

---

## MEDIUM-severity findings

| # | File / Line | Issue | Fix |
|---|---|---|---|
| M1 | `useBuildCompleteness.ts:14–75` | Recomputes 11-section score on every build change | Split per-section selectors; memoize with stable deps |
| M2 | `useSectionProgress.ts:16–49` | Same: all sections recomputed every change | Same |
| M3 | `IconPickerGrid.tsx:99–150` | Every tile is a `motion.button` with `whileHover`/`whileTap` (called ≥3× in GeneralSection) | Replace with CSS `:hover` / `:active`. Use motion only on the selected tile. |
| M4 | `GearSlotCard.tsx:20–100` | Not memoized; 14 cards in EquipmentSection re-render on any sibling change | `React.memo` + `useCallback` for `onChange` in parent |
| M5 | `ChampionPointsPicker.tsx:56–61` | `getSlottableByTree()` called 3× per render, no memoization | Module-level `Map<treeId, ability[]>` |
| M6 | `SetupTabBar.tsx:593–612` | `SortableSetupTab` not memoized | `React.memo` with shallow compare |
| M7 | `GearPicker.tsx` (full) | `buildSetGroups()` rebuilds per slot / open | Precompute per-slot group maps at module load or cache in Redux |
| M8 | `BuildEditorThemeProvider.tsx:18–50` | Rerenders entire shell on class change, no memo | `React.memo`; set CSS vars via `data-class` attr only |
| M9 | `PickerDialog.tsx:276`, `SetupTabBar.tsx:561–562` | `backdrop-filter: blur(20px)` / `blur(16px)` — full composite on scroll | Reduce blur radius; add `will-change`; gate on desktop media query |
| M10 | `glass-styles.ts` callers | `glassAddBtnSx(isDark)` returns fresh object every call | Memoize with `useMemo` or convert to `styled()` |
| M11 | `BuildNavRail` via `BuildEditorLayout.tsx:113` | Receives whole `progress` object; re-renders 11× per progression change | Memoize NavRail; pass per-section booleans |
| M12 | `CharacterSection` attribute steppers | No debounce on stepper increment (each dispatch → stat recalc → re-render) | Debounce 150 ms or commit on blur/mouseup |
| M13 | `GeneralSection.tsx:89–125` | `options={ESO_CLASSES.map(...)}` new array every render defeats `IconPickerGrid` memo | Hoist `CLASS_OPTIONS`, `ROLE_OPTIONS`, `GAMEMODE_OPTIONS` to module scope |

---

## Ordered implementation plan

### Phase 1 — Stop the bleeding (keystroke INP 2.2s → <300ms)
1. Replace `useSelector((s) => s.buildEditor)` in `BuildEditorLayout`, `BuildEditorShell`, and each `*Section.tsx` with **narrow, reselect-memoized selectors**. Do NOT destructure the whole slice.
2. Audit any persistence effect/middleware that writes to `localStorage` and **debounce to 500–1000 ms**. Ensure screenshots are never re-serialized on every keystroke.
3. Wrap each `*Section.tsx` in `React.memo` (they currently accept no props; give them explicit props driven by selectors so memoization actually kicks in).
4. Hoist the static `options` arrays in `GeneralSection.tsx` to module scope (one-line change, biggest-bang-for-buck).

### Phase 2 — Reduce tree size (LCP 4.7s → <2.5s)
5. Tab-gate or IntersectionObserver-gate all sections. Render only the active/in-viewport section; lazy-mount the rest on first reveal.
6. Remove the parent-level `staggerContainer` motion wrapper. Animate only the section becoming visible.
7. Virtualize GearPicker/IconPickerGrid lists. Debounce the search input.

### Phase 3 — Polish paint/composite
8. Memoize the common sx objects; convert hot-loop children (`GearSlotCard`, race cards, CP stars, setup tabs) to `styled()` components.
9. Downgrade `backdrop-filter` blurs; add `will-change`.
10. Stat engine: narrow its memo deps or compute in a middleware/selector and cache by input hash.

---

## Secondary observation (outside build-editor, but piles onto LCP)

The initial load trace also caught a **322 ms forced reflow in `src/components/HeaderBar.tsx:579`** inside an `onScroll` handler. It is not on the build-editor critical path, but it runs during initial paint and adds to the observed LCP of 4.76 s. Worth investigating whether HeaderBar is reading `offsetWidth`/`getBoundingClientRect` inside a scroll handler without `requestAnimationFrame` batching. Candidate one-liner fix: wrap the measurement in `requestAnimationFrame` and/or cache values between scrolls.

---

## Verification

After each phase, re-run the Chrome trace (same interaction: keypress in Build Name):

```bash
PORT=3002 npm run dev
# then: Chrome DevTools → Record → type 5 chars in Build Name → Stop
```

Track LCP and INP. Targets:
- **Phase 1**: INP < 300 ms, LCP unchanged
- **Phase 2**: LCP < 2,500 ms, DOM < 400 elements on initial paint
- **Phase 3**: style recalc < 50 ms, no forced reflow > 16 ms per frame

Consider adding a Lighthouse/Web Vitals budget to CI so this never regresses silently.

---

## Artefacts captured during audit

- `.factory/build-editor-initial.png` — screenshot of initial paint
- `.factory/build-editor-load-trace.json` — raw Chrome trace of cold load (LCP 4.76 s)
- `.factory/build-editor-interact-trace.json` — raw Chrome trace of keystroke interaction (INP 2.28 s)

Open either trace in Chrome DevTools → Performance → "Load profile…" to inspect the flame chart directly.

---

## Research references

- MUI `sx` prop perf caveats — https://mui.com/system/getting-started/the-sx-prop/#performance-tradeoffs
- MUI Autocomplete virtualization — https://mui.com/material-ui/react-autocomplete/#virtualization
- web.dev INP optimization — https://web.dev/articles/optimize-inp
- web.dev long tasks — https://web.dev/articles/optimize-long-tasks
- Redux Toolkit reselect — https://redux-toolkit.js.org/api/createSelector
- React Compiler (19+, available) — would automate most of Phase 1's manual memoization but does NOT fix architectural issues (all sections mounted, whole-slice subscriptions). Not a substitute for the refactor.
