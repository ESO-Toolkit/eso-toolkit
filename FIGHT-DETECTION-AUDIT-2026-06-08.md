# Fight / Trial / Dungeon Detection Audit — 2026-06-08

Audit of the system that detects **which fight, and which trial/dungeon**, each
combat log belongs to — the data behind the **Report Fights** page
(`src/features/report_details/ReportFightsView.tsx`), which lists every
individual fight grouped by encounter and run.

The goal was to make detection "as good as possible in June 2026," with special
attention to logs that **mix multiple trials and/or dungeons** in a single
report.

---

## TL;DR

The previous detection was almost entirely **heuristic** and **ignored
authoritative data the ESO Logs API already returns on every fight**
(`encounterID`, `originalEncounterID`, per-fight `gameZone {id,name}`, and
`kill`). It worked for clean single-trial logs but degraded badly on mixed logs
and had no dungeon support at all.

This audit replaces the heuristics with the authoritative API signals, extracted
into a pure, unit-tested module (`src/features/report_details/fightGrouping.ts`)
plus a canonical content-zone table (`src/data/esoContentZones.ts`). Boss-name
matching is retained only as a fallback for legacy logs.

---

## Findings

### 1. Boss vs. trash decided by `difficulty`, not `encounterID` — _Medium_

`ReportFightsView` split bosses from trash with `fight.difficulty != null`.
The API's authoritative signal is **`encounterID !== 0`** (schema: _"If the ID
is 0, the fight is considered a trash fight."_). It also exposes
`originalEncounterID` for bosses that ESO Logs demotes to trash — which the old
code could not represent at all.

**Fix:** `isBossFight()` uses the live `encounterID !== 0`, unioned with the old
`difficulty` check as a safety net so no current boss is dropped. (See finding 7
for the demoted-fight refinement.)

### 2. Trial detection by boss-name string matching — _High_

`getTrialNameFromBoss()` matched **boss-name substrings** against hardcoded
per-trial lists, falling back to the report-level zone **name**. Every fight
already carries a per-fight `gameZone {id, name}` (an in-game zone ID, e.g.
`1121` = Sunspire) and an `encounterID`, none of which were used. Name matching
is fragile (breaks on renames/variants) and, crucially, cannot distinguish two
zones that share a boss-name token.

**Fix:** `resolveFightZone()` resolves by `gameZone.id` against a canonical table
(`CONTENT_ZONES`, derived from the existing `ZONE_NAMES` + `TRIAL_ENCOUNTERS`
data, so there is no duplicated zone list). Boss-name matching survives **only**
as a fallback when `gameZone` is missing (older logs).

### 3. Mixed trials/dungeons split only on trial-name change — _High_

The old grouping started a new "run" only when the **derived trial-name string**
changed between consecutive bosses (with an explicit _"don't try to separate
trial instances"_ comment). Consequences:

- **Two runs of the same trial** in one log merged into one.
- A **trial → dungeon → trial** sequence mis-grouped (dungeons weren't detected).
- Back-to-back re-clears of the same content merged.

**Fix:** `groupFightsIntoRuns()` groups by the resolved per-fight zone identity
(chronologically), starting a new run when the zone changes **or** when a boss
encounter that was already _killed_ in the current run reappears (re-clear /
second lockout). Inter-zone trash with no `gameZone` attaches to the current run
instead of forcing a spurious split.

### 4. No dungeon detection at all — _High_

Only the 13–15 trials were handled; any dungeon fell through to
`"Unknown Trial"`. `dungeonPulls` and dungeon `gameZone`s were fetched but unused.

**Fix (scoped):** dungeons now **detect, separate, and label correctly** from the
API's `gameZone` (no static table needed), so mixed trial+dungeon logs group
properly and dungeons show their real name instead of "Unknown Trial".
Richer per-dungeon metadata (expected boss counts, HM rules) is intentionally
**deferred** to coordinate with the in-flight loadout-manager dungeon work
(PR #1193) rather than introduce a competing hardcoded dungeon table here.

### 5. Kill/wipe via `bossPercentage` + a hand-tuned heuristic — _Medium_

The UI inferred kills from `bossPercentage <= 1%` and then ran a brittle
`isFalsePositiveWipe()` heuristic (duration/percentage thresholds) to undo ESO
Logs' "100% wipe" mislabels. The API exposes an authoritative **`kill: Boolean`**
that makes the heuristic unnecessary.

**Fix:** `wasKill()` uses `fight.kill`, falling back to `bossPercentage` only when
`kill` is null (some legacy logs). `isFalsePositiveWipe()` is removed.

### 6. Report query under-fetches the zone — _Low_

`reports.graphql`'s `Report` fragment requests only `zone { name }` (not `id`,
`encounters`, or `difficulties`), so even the report-level zone was name-only.
Not changed here because per-fight `gameZone` already supplies a more reliable,
per-fight signal; noted for future enrichment.

---

## What changed

| File                                                | Change                                                                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/data/esoContentZones.ts`                       | **New.** Canonical content-zone table keyed by in-game zone ID, derived from existing `ZONE_NAMES` + `TRIAL_ENCOUNTERS` (no duplicated data).                            |
| `src/features/report_details/fightGrouping.ts`      | **New.** Pure detection module: `isBossFight`, `wasKill`, `effectiveEncounterId`, `resolveFightZone`, `groupFightsIntoRuns`, `buildRunEncounters`, `uncategorizedTrash`. |
| `src/features/report_details/fightGrouping.test.ts` | **New.** 18 unit tests covering boss/trash, kill detection, zone resolution, mixed-trial/dungeon separation, re-clear detection, and trash association.                  |
| `src/features/report_details/ReportFightsView.tsx`  | Refactored to consume the module. Removed `getTrialNameFromBoss` and `isFalsePositiveWipe`; boss/trash + kill now use the authoritative helpers. UI/rendering unchanged. |

No GraphQL schema or codegen changes were required — every field used
(`encounterID`, `originalEncounterID`, `gameZone`, `kill`, `bossPercentage`,
`difficulty`) is already in the `Fight` fragment.

---

## Validation against real logs (2026-06-09)

Re-ran the detection over the two committed real ESO Logs reports in
`public/sample-reports/` — both are **single-zone attempt farms**, which is
exactly the hard case for grouping. They drove three follow-up corrections:

### 7. Demoted fights were being counted as phantom boss attempts — _Medium_

Real logs are full of `encounterID: 0, originalEncounterID: <boss>, kill: null`
fights — post-kill cleanup and instant resets that ESO Logs deliberately
demoted to trash. The first pass counted them as boss attempts (inflating
attempt counts and adding empty cards).

**Fix:** `isBossFight()` now follows the _live_ `encounterID` (demoted ⇒ trash),
matching ESO Logs' intent. `originalEncounterID` is still recoverable via
`effectiveEncounterId()`.

### 8. Re-clear auto-split shattered farm/reset logs — _High (self-regression)_

The DSR sample (`F4f2bMwWtgVKxjB9`, "DSR Day 34 Reef Resets") kills the same
bosses repeatedly (Lylanar ×7 attempts / 3 kills, Bow Breaker ×4). The initial
re-clear rule started a brand-new run on every repeat, fragmenting one farm
night into ~6 messy runs.

**Fix:** same-zone re-clears now stay in **one run by default**; per-clear
splitting is opt-in via `groupFightsIntoRuns(…, { splitReclears: true })`.
Zone-change splitting (the real mixed-log fix) is unchanged.

### 9. Attempt-heavy encounters were unreadable — _High (UX)_

The VSE sample (`YArFDbq7BdhwL691`, "FAST VSE HM") has **45 attempts on a single
boss** (Exarchanic Yaseyla) before the kill — an unusable wall of 45 cards.
About half are quick "reset" re-pulls (very short, boss left near full health).

**Fix (the requested organisation toggle):**

- `summarizeEncounter()` / `isResetPull()` derive per-encounter stats: attempts,
  real attempts vs. resets, kill count, and best pull %.
- `ReportFightsView` gained a **"Group attempts"** toggle (default on, shown only
  when some encounter exceeds the threshold). When on, attempt-heavy encounters
  collapse to the **kill(s) + best pull**, with the remaining attempts behind a
  "Show all N attempts" expander, and the header shows summary chips
  (`3 kills` / `Best 12%` / `20 resets`).

### 10. Mini-bosses wrongly downgraded HM clears to "Partial Veteran HM" — _High_

ESO mini-bosses (Spiral Descender, Bow Breaker, Sail Ripper, Haj Mota, …) **have
no Hard Mode** — they are always Veteran. The old `calculateTrialDifficulty`
counted every fight at difficulty 121 (including those minis, and including
_wipes_) as a "Veteran boss", so a full-HM clear showed as **"Partial Veteran
HM"** (confirmed on both real logs). HM status is also a kill property, not a
wipe property — wiping a boss on Veteran then killing it on HM is an HM kill.

**Fix:** new `runDifficulty.ts` (`determineRunDifficulty`) judges HM only on
**HM-capable bosses** (minis excluded via `isHmCapableBoss`) and only on the
**kill** difficulty (highest difficulty among kills; falls back to best attempt
for in-progress runs). Linear trials use per-boss / final-boss-only rules;
Cloudrest & Asylum (the "skip to the final boss" trials) use the +0..+3 codes
(122–125) from the final-boss kill. Both real logs now read **"Veteran HM"**.
This also lays the groundwork for trifecta reasoning (Veteran HM + speed +
no-death). Per-boss badges are unchanged (a mini still correctly shows
"Veteran").

### 11. Normal-mode trials mislabeled as "Veteran"; arenas called "dungeons" — _Medium_

Difficulty codes are Normal ≤ 120, Veteran 121, Veteran HM 122 (+1/+2/+3 →
123–125). The code only treated `< 10` as Normal, so a Normal clear (code ~120)
fell through to "Veteran". Arenas (Maelstrom, Vateshran, Dragonstar, Blackrose)
were also lumped in as "dungeons".

**Fix:** Normal is now `0 < code < 121` in both the run label and the per-boss
badge; `classifyUnknownZone()` tags the four arenas as `type: 'arena'`.

### Full edge-case matrix (now covered by tests)

`fightGrouping.test.ts` + `runDifficulty.test.ts` exercise: single trial; two
different trials; **three** distinct trials in order; **A → B → A** re-entry
(three runs); trial → dungeon; same-zone re-clears (one run by default, opt-in
split); 5+ / 45+ attempt encounters with reset detection; inter-zone trash with
no `gameZone`; out-of-order input; legacy logs with **no `gameZone`** (boss-name
resolution); **arenas**; **Normal** difficulty; demoted (`encounterID 0`) fights;
trash-only runs; empty/null input; zero-duration/invalid fights; per-boss vs
final-boss-only vs Cloudrest/Asylum +N HM; mini-boss HM exclusion; and two
**real** reports end-to-end.

### Maps — intentionally untouched

The fight-replay map/coordinate system (`zoneScaleData`, `mapScaling`,
`mapMarkersUtils`) only has data for the 15 trials, so dungeons/arenas lack
replay map scaling. That area is being actively reworked in several open PRs
(#1192 map scaling, #1189 mid-fight map switching, #1194 continuous replay), so
to avoid conflicts this PR does **not** modify it. Extending map coverage to
dungeons/arenas should be a follow-up coordinated with those PRs.

---

## Deferred / future work

- **Dungeon metadata** (expected boss counts, veteran-HM rules) — coordinate with
  PR #1193's dungeon data once merged; plug into `CONTENT_ZONES`.
- **Completion-ring boss counts** in `ReportFightsView` are still the original
  zone-name-keyed constants (kept to avoid regressing variable-boss trials like
  Cloudrest/Asylum). Some look stale (e.g. Sanctum Ophidia listed as 5; it has 4
  main bosses) and could be re-derived from `expectedBossCount` once
  optional-boss semantics are encoded.
- **Arena detection** (Maelstrom / Vateshran / DSA / BRP) would benefit from
  adding `size` and `fightPercentage` to the `Fight` fragment.

---

## Verification

- `npm run validate` (typecheck + lint + format) — clean.
- `npx jest src/features/report_details src/store/report/reportSelectors.test.ts`
  — 184 passed, 14 snapshots passed.
- `fightGrouping.test.ts` (26) + `runDifficulty.test.ts` (10) include
  **end-to-end checks against the two real committed reports**: the DSR farm
  resolves to one run with multi-kill grouped encounters; the VSE log resolves to
  one run with 30+ Yaseyla attempts (resets detected, eventual kill); and both
  read as **Veteran HM** (mini-bosses no longer force "Partial").
- **Rendered in headless Chromium** against both real reports: grouped
  attempt-heavy encounters with "Show all N attempts", the "Group attempts"
  toggle, and correct "Veteran HM" headers.
