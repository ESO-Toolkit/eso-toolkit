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

**Fix:** `isBossFight()` uses `effectiveEncounterId(fight) !== 0`, unioned with
the old `difficulty` check as a safety net so no current boss is dropped.

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
  — 157 passed, 14 snapshots passed.
- New `fightGrouping.test.ts` — 18 passed.
