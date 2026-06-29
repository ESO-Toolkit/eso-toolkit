# ESOTK Companion Add-on — Research & Strategy (June 2026)

> Research brief for the in-game ESO add-on that pairs with ESO Toolkit (ESOTK).
> Goal: capture the build/character data that ESO Logs **cannot** see, feed it back into
> ESOTK, and grow into a two-way raid-command platform (plan on web → enforce in game →
> analyse on web).
>
> **Scope note:** this doc evolved over several research passes. §1–§11 cover the core
> capture-and-coaching product; §12+ expand to the live in-game platform, integration,
> competitive positioning, data/transport plumbing, business model, the 2026 meta,
> methodology, and risk. The consolidated roadmap is in **§24**.

### Contents

1. The core thesis · 2. Gap analysis · 3. ESO Lua API toolbox · 4. ESOTK integration
   surfaces · 5. Ranked ideas (P0–P2) · 6. Phased architecture · 7. Risks & open questions
   · 8. First milestone · 9. Transport is plumbing · 10. Read existing add-ons first ·
2. The real UVPs (stat-aware coaching) · 12. The in-game raid-command layer ·
3. Integration feasibility matrix · 14. Competitive landscape & white space ·
4. Data plane & matching algorithm · 16. Sustainability (free add-on, premium web) ·
5. Why now — the 2026 meta · 18. Platform reality & a console-only opportunity ·
6. Tech stack & SavedVariables schema · 20. Capture methodology & accuracy ·
7. Beyond trials — PvP audiences · 22. Privacy, consent & ToS · 23. Maintenance & risk
   · 24. Consolidated roadmap · 25. Group-share transport (how to broadcast it) ·
8. Ruleset / criteria schema (compliance engine) · 27. Report-page upload integration map.

---

## 1. The core thesis

ESO Logs is excellent at **what happened in combat** (damage, healing, casts, buffs,
deaths, timelines). It is structurally blind to **why** — the character build that
produced those numbers. That blindness is not a bug in ESO Logs; it is a limit of the
data source. The game's **encounter log** (`Encounter.log`, the file the ESO Logs
add-on uploads) only writes what ZeniMax chose to emit, and ZeniMax deliberately
**disabled real-time logging** years ago to prevent in-combat automation. So the log
is a post-hoc, partial snapshot.

An **in-game add-on** runs inside the ESO Lua sandbox and can read the _live_ character
state through the official API — including everything the log omits. That is the gap
we fill. The add-on captures the missing build data, and ESOTK stitches it onto the
log it already analyses, matching by character/account + timestamp + zone.

**One-line pitch:** _ESO Logs tells you the player did 92k DPS. The ESOTK Companion
tells you they did it on a 66-trait CP build with 18k penetration, Deadly/Sul-Xan,
Lover mundus, and Bewitched Sugar Skulls — and shows it on the player card._

---

## 2. Gap analysis — what the log already has vs. what it misses

The raw `Encounter.log` `PLAYER_INFO` line (emitted per player when they enter an
encounter) actually carries **more than most people realise**:

| Already in the log / ESO Logs                                                                                        | Notes                                                         |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Equipped gear: item IDs, **trait, set, display quality, enchant type/level/quality**, item level, per slot           | Both bars. ESO Logs surfaces gear on player pages.            |
| Slotted abilities (front + back bar ability IDs)                                                                     | Morphs are derivable from the ID.                             |
| "Long-term effects" list (passives + buffs) incl. the **CP-slotted stars**, mundus buff, food/drink buff, vampire/WW | Present as buff IDs, but not labelled as "this is the build". |
| CP **rank** (total earned)                                                                                           | Not the allocation.                                           |
| Race/class                                                                                                           | Derivable; class is explicit, race partially.                 |

What is **never** emitted and therefore impossible for ESO Logs to show:

| Missing data                                                                                                                               | Why it matters                                                                                              | API source (in-game)                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Champion Point _allocation_** — points spent per star across all 3 trees, not just the 4 slotted                                         | The #1 ask. Two players with identical gear can have wildly different CP and the log can't tell them apart. | `GetNumPointsSpentOnChampionSkill`, `GetChampionPointsPlayerProgressionData` |
| **Final derived stats**: max mag/stam/health, spell/weapon damage, **crit %, crit damage, penetration, recovery, resistances, mitigation** | These are computed client-side and never logged. The single most requested "why is my DPS low" diagnostic.  | `GetPlayerStat(STAT_*)`                                                      |
| **Attribute point split** (Mag/Health/Stam)                                                                                                | Build correctness check.                                                                                    | `GetAttributeSpentPoints(attribute)`                                         |
| **Exact enchant magnitude** & **trait quality nuance**                                                                                     | Log gives enchant _type/level_, not the rolled value.                                                       | `GetItemLink` + `GetItemLinkEnchantInfo`                                     |
| **Mundus stone (named)**                                                                                                                   | Only inferable from a buff ID today.                                                                        | buff detection / `GetItemLink` of the boon                                   |
| **Active food/drink (named, with duration)**                                                                                               | Inferable from buff today; add-on can name it + flag "no food".                                             | buff scan                                                                    |
| **Skill/CP passives unlocked, skill point spend**                                                                                          | Build completeness.                                                                                         | skill-line API                                                               |
| **Scribing scripts actually slotted** (grimoire + 3 scripts)                                                                               | ESOTK already _detects_ scribing from events; the add-on can report it **authoritatively**.                 | scribing API                                                                 |
| **Companion build** (gear/skills)                                                                                                          | Solo/duo content.                                                                                           | companion API                                                                |
| **Vampire/Werewolf stage, riding skills, CP curve preset**                                                                                 | Minor but cheap.                                                                                            | misc API                                                                     |

**Takeaway:** the highest-value, _uniquely-addon_ data is **CP allocation + final
stats + attributes**. Gear and slotted skills are mostly redundant with the log
(useful as a verification/fallback, and to fill console/non-logged sessions).

---

## 3. What the ESO Lua API lets us capture (the toolbox)

The add-on runs in ESO's sandboxed Lua VM (same environment as CombatMetrics, Hodor
Reflexes, Wizard's Wardrobe). Relevant capabilities:

- **Character snapshot** — all derived stats via `GetPlayerStat`, CP allocation,
  attributes, gear with full link detail, both ability bars, mundus, active food,
  race/class/alliance, skill points.
- **Event hooks** — `EVENT_PLAYER_COMBAT_STATE`, `EVENT_PLAYER_ACTIVATED`,
  `EVENT_CHAMPION_POINT_UPDATE`, gear/skill change events. Lets us snapshot **at the
  same moment the log starts a fight**, so data lines up with the encounter.
- **SavedVariables** — the add-on writes a Lua table to disk
  (`.../SavedVariables/ESOTKCompanion.lua`). ESOTK **already has a Lua importer**
  (`luaParser.ts` / Wizard's Wardrobe), so ingesting our own format is a small step.
- **Group broadcast** — `LibGroupBroadcast` (formerly LibGroupSocket; recently
  patched, 2026) + `LibGroupCombatStats` already share live DPS/HPS/Ult across the
  group. **We can ride the same channel to collect the whole group's build data into
  the logger's single SavedVariables file.** This is the multiplier: one upload =
  12 complete builds.
- **Clipboard / chat export** — generate a compressed, encoded build string in-game
  (the Wizard's Wardrobe / build-import-code pattern) that a user pastes into ESOTK.

**Hard constraints to design around:**

- **PC-only.** Add-ons don't run on console (even though console now has encounter
  logging). Console users get the log-only experience; the companion is a PC perk.
- **No real-time push to web from in-game.** ESO Lua has no outbound HTTP. Transport
  to ESOTK is always file-upload or copy/paste (or via the Kalpa manager, below).
- **ZOS ToS / "no automation."** We only _read_ state and _report_ it — no input
  automation, no combat decisions. Safe, in line with CombatMetrics/Hodor.
- **Matching problem.** SavedVariables isn't stamped with the ESO Logs report code.
  We match on `@account` + character + zone + UTC timestamp window. Design for fuzzy
  matching from day one.

---

## 4. How it plugs into ESOTK (we already have the rails)

ESOTK is unusually well-positioned because the integration surfaces already exist:

| ESOTK surface                       | What the companion data adds                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Player cards** (the headline ask) | CP allocation, final stats (crit/pen/recovery), mundus, food, attribute split — shown inline.                                                                                             |
| **Loadout Manager**                 | Already imports Lua SavedVariables. Add an `ESOTKCompanion` format alongside Wizard's Wardrobe.                                                                                           |
| **Build Hub**                       | "Get Addons" deep-link to **Kalpa** addon manager already exists (now an _optional_ convenience tier — see §9). Primary install is the standard Minion/manual route every ESO addon uses. |
| **Roster Hub**                      | `recommended_addons` column already exists; the companion becomes a recommended/required raid add-on, and roster build-checks validate against captured CP/stats.                         |
| **Fight Replay**                    | Lock-on stats panel can show the _real_ build behind an actor.                                                                                                                            |
| **Scribing detection**              | Cross-check detected scripts against authoritatively-reported slotted scripts.                                                                                                            |

> **Distribution note (revised):** the original draft leaned on the **Kalpa** addon
> manager to auto-upload SavedVariables. That's still a valid _optional_ convenience,
> but it should **not** be required — asking users to install a separate desktop app
> they don't trust is the single biggest adoption killer (it's exactly the friction
> that makes the ESO Logs Electron uploader a barrier). The transport strategy is now
> **no-install-first**; see §9–§11. Kalpa becomes one opt-in tier, not the front door.

---

## 5. Ranked ideas

### P0 — Build the core gap-filler (do these first)

1. **Champion Point allocation capture** — full per-star spend, all trees. The
   marquee feature and the user's stated priority. Render on player cards as a compact
   CP summary + expandable tree.
2. **Final stat snapshot** — crit, penetration, recovery, spell/weapon damage, max
   resources, resistances. The "why" behind the DPS number.
3. **Attribute split + mundus + food (named)** — cheap to capture, high diagnostic
   value, enables build-correctness flags ("running no food", "Atronach on a stamina
   build?").
4. **SavedVariables format + ESOTK importer** — define a stable schema; extend the
   existing Lua import path. Match to report by account+char+zone+timestamp.

### P1 — Make it effortless and group-wide

5. **Whole-group capture via LibGroupBroadcast** — the raid logger's single upload
   carries all 12 builds. This is what turns it from "nice for me" into "the group
   tool". Mirror the Hodor/LibGroupCombatStats model.
6. **No-install browser folder-sync (the UVP)** — ESOTK uses the **File System Access
   API** to read the SavedVariables (and optionally `Logs/Encounter.log`) folder
   directly from the browser after a one-time permission grant. No desktop app. See
   §9–§11. Kalpa auto-upload and a copy/paste build-code are fallback tiers.
7. **Build-correctness flags on player cards** — derive issues from captured data
   (no food, low penetration for the content, wrong mundus, unspent CP/attributes,
   under-quality gear). ESOTK already has `detectBuildIssues` — feed it real data.

### P2 — Differentiators / longer tail

8. **Scribing ground-truth** — report actually-slotted grimoire + 3 scripts; reconcile
   with ESOTK's event-based detection.
9. **Pre-fight readiness check** — in-game, before pull: "everyone fed, buffed,
   CP-slotted correctly?" surfaced both in-game and in roster-hub.
10. **Companion (pet) build capture** for solo/duo logs.
11. **Time-series build deltas** — capture per-fight so ESOTK can show "you swapped
    mundus / re-slotted CP between pulls", and trend stats across a session.
12. **Loadout round-trip** — export an ESOTK-designed loadout back to a format the
    companion (or Wizard's Wardrobe) can equip, closing the design→play→log loop.

---

## 6. Recommended architecture (phased)

```
In-game add-on (Lua)
  ├─ snapshot on EVENT_PLAYER_COMBAT_STATE / fight start
  │    → CP alloc, stats, attributes, gear, bars, mundus, food, scribing
  ├─ LibGroupBroadcast → collect groupmates' snapshots (P1)
  └─ write ESOTKCompanion.lua (versioned schema, keyed by char+zone+UTC)
        │
        ├─ Path A (P0): user uploads / pastes build-code → ESOTK Loadout import
        └─ Path B (P1): Kalpa reads SV file → POST to ESOTK API
                          │
ESOTK web (this repo)
  ├─ Lua import (extend luaParser.ts with ESOTKCompanion format)
  ├─ matcher: companion snapshot ↔ ESO Logs report/fight/actor
  ├─ enrich player_data slice with build payload
  └─ render: player cards · build-hub · roster checks · fight-replay
```

**Build the matcher and schema versioning first** — they are the parts most expensive
to change later. Everything else is additive.

---

## 7. Risks & open questions

- **Matching reliability** — name changes, mid-session character swaps, multiple chars
  per account. Need a deterministic key + a manual "attach to this player" fallback in
  ESOTK.
- **Privacy/consent** — group-wide capture broadcasts each member's build. Make
  broadcasting opt-in and let players see/redact what's shared (mirror how Hodor is
  perceived as benign by being read-only + transparent).
- **Schema churn** — ESO updates CP trees and item data every quarter; version the SV
  schema and ESOTK's importer, and reuse the existing data-regen skills
  (`class-skill-regen`, `gear-data-regen`) to stay current.
- **Console** — explicitly out of scope for capture; ensure ESOTK degrades gracefully
  to log-only for console reports.
- **Adoption** — value scales with how many group members run it; lean hard on the
  group-broadcast model so one logger covers the raid. Reduce the ask further by reading
  data from add-ons users already run (§10) before requiring ours.
- **Redundancy** — do **not** re-sell things the log already provides (gear, slotted
  skills) or "no install" (the audience already runs the ESO Logs uploader). The value
  is the stat-aware coaching in §11.1, not the plumbing.

---

## 8. Suggested first milestone

A vertical slice that proves the loop end-to-end:

1. Add-on captures **CP allocation + final stats + mundus + food** for the **local
   player only**, writes `ESOTKCompanion.lua`.
2. ESOTK parses it (extend `luaParser.ts`), matches it to the uploaded log, and
   **renders CP + the stat-aware pen/crit coaching from §11.1 on that player's card** —
   "you're 3,200 over the 18,200 pen cap." That single insight is the proof of value,
   not the raw build display.
3. Distribute via the normal Minion/manual route; offer the optional file upload or
   folder-sync in ESOTK to ingest it.

That delivers the user's headline request (champion points on player cards) **plus** a
genuinely useful, non-redundant insight on day one, with the smallest surface area.
Every later idea (group capture, compliance grid, build history) builds on the same
schema and matcher.

---

## 9. Transport is plumbing, not a value proposition

> **Correction to the earlier draft.** A previous version pitched "no desktop app /
> browser folder-sync" as a headline UVP. That's wrong for _this_ audience: **every log
> ESOTK analyses already arrived via the ESO Logs uploader**, so our users have already
> installed and trusted a native desktop app. "No install" wins us nothing — it's
> table stakes they've already paid. Transport is a solved, boring problem; the value is
> in what we _do_ with the data (§11). Pick the simplest transport and move on:

| Option                                 | When to use                                                                                                                                                              | Effort |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| **Manual `.lua` upload**               | Default. Already shipped (`luaParser.ts` for Wizard's Wardrobe) — extend to `ESOTKCompanion`. Works in every browser.                                                    | ~none  |
| **File System Access API folder-sync** | Nice-to-have for Chromium users who don't want to re-pick the file each session. Store the handle in IndexedDB, re-read on a click. _Convenience, not a differentiator._ | low    |
| **Copy/paste build code**              | Single-player quick share, no file. Note ESO can't auto-copy (protected call) and caps a copy near ~1023 chars, so compress.                                             | low    |
| **Kalpa auto-upload**                  | Opt-in only, for users already on Kalpa. Never the on-ramp.                                                                                                              | medium |

The only transport constraint that actually shapes design: ESO Lua **can't make HTTP
calls**, so the data always lands on disk first and ESOTK reads it. That's it. Don't
over-invest here.

---

## 10. Don't make users re-enter what they already have

Independent of transport, a real friction reducer: ESOTK can read SavedVariables from
add-ons users **already run**, instead of demanding ours from day one.

- **CombatMetrics** records per-fight data and can already export a build code — ESOTK
  can read its SV directly.
- **Wizard's Wardrobe** — already parsed here today.
- **Hodor / LibGroupCombatStats** — already aggregates _group_ DPS/HPS/Ult.

So the purpose-built ESOTK Companion only needs to capture the **residual gap** those
tools don't persist — chiefly **full CP allocation, exact final stats, attribute split,
and group-wide aggregation in one file**. Smaller add-on, easier ask, faster value.

---

## 11. The actual unique value props (non-redundant, genuinely useful)

The test for every idea below: **does it require joining the player's true build data
(which the log lacks) with the combat log (which the build sites lack)?** If yes, it's
something _no_ existing tool — ESO Logs, ESO-Hub, CombatMetrics, Hodor — can produce.
That intersection is the entire moat. Pure build display (ESO-Hub) and pure combat
display (ESO Logs) are both already done; we own the **overlap**.

ESOTK already _estimates_ some of these stats from the log — there are
`CalculatePenetration` and `CalculateCriticalDamage` workers in the codebase today. The
companion's job is to **turn those estimates into ground truth** and unlock coaching
that estimates can't support.

### 11.1 Stat-aware optimisation coaching (the killer feature)

The log shows you hit for X. It cannot tell you whether your _stats_ were efficient.
With the companion's exact stats we can compute, per player, against hard ESO caps:

- **Penetration vs the 18,200 cap.** Trial/dungeon bosses sit at 18,200 resist; every
  point of pen **over** that is wasted and every point **under** is lost damage. We can
  say _exactly_: "You're at 21,400 pen — 3,200 wasted; drop Sharpened/a pen glyph and
  gain ~X% damage," or "16,900 — 1,300 short, you're losing mitigation-adjusted
  damage." This is _the_ most common end-game optimisation question and **nothing can
  answer it without the player's real pen + the boss in the log.**
- **Crit damage vs the 125% hard cap** (225% total). Flag over-cap crit-damage stacking
  (wasted) and under-cap headroom.
- **Crit _chance_ value** — crit rating ÷ 21,918 → %, weighed against current crit
  damage and group buffs to advise "more crit chance vs. more weapon/spell damage here."
- **Recovery / sustain vs. actual resource behaviour in the log** — pair real recovery
  stats with the log's resource events to flag over-sustain (wasted regen you could
  trade for damage) or genuine starvation.

These read like a coach sitting next to the parse. **This is the headline UVP**, far
more useful than "here's a build."

#### 11.1.1 "Self" vs "effective" — how penetration & crit get to 100% accuracy

ESOTK estimates pen/crit from the log's gear today; the companion replaces the guess.
But two of these stats split into a **self** part (on your character sheet) and an
**effective** part (depends on the target/buffs), and being precise about that split is
what makes the coaching trustworthy:

| Stat            | Self part (add-on, exact)                                                                                                                      | Effective part (not on your sheet)                                                                                                                                   | How ESOTK gets 100%                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Penetration** | `GetPlayerStat(STAT_*_PENETRATION)` = gear/traits (Sharpened), sets (Spriggan), CP (Piercing), Lover mundus, light-armour passives — **exact** | **Group armour debuffs on the boss** (Major/Minor Breach, Crusher, Alkosh, Crimson Oath, Runic Sunder) reduce the _target's_ resist, so they're **not in your stat** | add-on's exact self-pen **+ the log's debuff uptime on the boss** = exact effective pen vs the 18,200 cap |
| **Crit chance** | crit rating ÷ 21,918 — exact **at the moment read**                                                                                            | Temporary buffs (Major/Minor Savagery/Prophecy from potions/sets) fluctuate                                                                                          | snapshot a **self-buffed baseline** (canonical) ± an in-combat read for buffed peaks                      |
| **Crit damage** | base 50% + Shadow mundus, Backstabber, medium-armour, set sources — readable/derivable                                                         | Temporary **Major/Minor Force**; Backstabber is positional                                                                                                           | same: baseline vs in-combat, and Backstabber is conditional                                               |

**The key correction to "we're just guessing":**

- Your **personal/self** penetration and crit become **100% exact** — `GetPlayerStat` is
  the game's own number, not an estimate. That alone removes the guesswork ESOTK does now.
- The **effective** numbers depend on things the character sheet never holds —
  **target debuffs** (for pen) and **temporary buffs** (for crit). Penetration's missing
  half is **exactly what the combat log records** (debuff auras on the boss), so the
  add-on + log together are exact where neither is alone. (An add-on _can_ also compute
  "pen on target" live by scanning the boss's debuffs — what CombatMetrics / Dynamic
  Stats / Meterskull already do — but for a logged fight, combining with the log is the
  clean split.)
- **Snapshot timing matters** (see §20): read the canonical baseline **out of combat,
  self-buffed**, so cross-player comparisons are apples-to-apples; optionally add an
  in-combat read for buffed values. Never feed a buffed in-combat reading into the
  "are you at the cap" math without accounting for what was up.

> Restated as the moat: the add-on supplies the half the log can't see (your tuning),
> the log supplies the half the add-on can't see (what's on the boss), and ESOTK is the
> only place the two combine into an exact effective number.

### 11.2 Champion Point allocation audit

Full per-star allocation (invisible to the log) checked against the content: unspent
points, sub-optimal slottables for the boss, missing damage/sustain stars. Per player,
across the raid.

### 11.3 Group readiness / compliance grid (raid-lead tool)

One screen for the whole group, joining build + log: **food active? correct mundus for
role? CP slotted? gear gold-quality? all enchants present? attributes sane?** Surfaced
in Roster Hub and feedable to the existing `detectBuildIssues`. No tool does a
group-wide build-compliance check tied to a real log — this is a genuine officer
superpower, and the LibGroupBroadcast capture makes it one upload.

### 11.4 Longitudinal build-vs-performance history

Because snapshots are per-fight and per-session, ESOTK (with Roster Hub) can show
**how a player's build changed over weeks and what it did to their numbers**: "Switched
Deadly → Coral 3 weeks ago, boss DPS +4%," or "dropped a pen glyph and fell below cap —
parse dropped." Open-loop build sites can't do this; it needs the build _and_ the
historical logs ESOTK already stores.

### 11.5 Closed design→play→verify loop

Design a loadout in the Loadout Manager → play it → log it → ESOTK confirms you actually
ran what you planned (gear/CP/mundus/food/skills match) and shows the result. Every
other build tool is open-loop (design, then hope); we verify against reality.

**Positioning one-liner:** _ESO Logs shows what you did. ESO-Hub shows a build. ESOTK is
the only place that tells your whole raid whether the build was actually any good —
"you're 3,200 over the pen cap, that's wasted damage" — straight off the parse._

> **Deliberately dropped from the UVP list:** re-capturing gear and slotted skills
> (already in the log) and "no desktop install" (audience already runs the ESO Logs
> uploader). Both are redundant. Lead with the stat-aware coaching in §11.1.

---

## 12. The bigger vision — an in-game raid-command layer, two-way synced with ESOTK

> **Reframe.** Sections 1–11 treat the add-on as a _passive capture pipe_ → web. The
> larger opportunity is a **two-way platform**: ESOTK is the brain (define rosters,
> rules, assignments, analytics on the web), the add-on is the **eyes and hands in the
> raid** (enforce and surface them live, in-game), and data flows **both directions**.
> This is the part that has no real competitor — ESO Logs is read-only post-hoc,
> build sites are open-loop, and no tool connects a web raid-planner to a live in-game
> HUD. Below is what's possible _and_ what the engine constraints actually allow.

### 12.1 The one constraint that shapes everything: 32 bytes/second

Group data sharing (LibGroupBroadcast, the bus Hodor rides) is hard-capped by ESO at
**~32 bytes per second per add-on**, riding the map-ping channel. That is far too little
to stream full builds for 12 people. It is the reason Hodor only shares tiny DPS/Ult
numbers. **So we do not stream builds — we split the system into two layers:**

| Layer          | Runs where         | Carries                                                            | Channel                     | Limit                       |
| -------------- | ------------------ | ------------------------------------------------------------------ | --------------------------- | --------------------------- |
| **Live layer** | In-game, real-time | A compact **compliance verdict** + a few key live stats per player | LibGroupBroadcast           | 32 B/s — fine for bitfields |
| **Deep layer** | Web, post-hoc      | The **full** build: CP allocation, exact stats, gear, history      | SavedVariables file → ESOTK | none                        |

**Edge-compute is the trick.** Every player's add-on already knows _their own_ full
build and the shared ruleset, so **each client evaluates itself locally** and
broadcasts only the verdict — e.g. a 1-byte bitfield (`food✓ mundus✓ pen✓ sets✓ CP✓`)
plus one or two bucketed stats. The raid lead's add-on aggregates those few-byte
messages into a live dashboard. No bandwidth problem, because the heavy lifting never
goes over the wire.

### 12.2 The criteria / ruleset engine (the centrepiece)

This is the user's "flag criteria you set" idea, made concrete and role-aware:

- **Define on ESOTK (web):** per **role** and per **encounter**, a ruleset — _DPS must
  hit ≥18,200 pen, run [required set], be fed, slot [CP stars]; healers must run
  [sets], maintain ≥X recovery and Major Courage; tanks must hold taunt uptime and run
  [sets]_. ESOTK already has roster-hub role composition and `detectBuildIssues` to
  build this on.
- **Sync down to the game.** Three viable bridges (no desktop app needed):
  1. **FSA API write-mode** — ESOTK writes the ruleset into the SavedVariables folder
     (`requestPermission({mode:'readwrite'})`); the add-on loads it on `/reloadui`.
     Genuinely bidirectional, browser-only.
  2. **Import code** — ESOTK emits a ruleset code; raid lead pastes it into the add-on.
  3. **Broadcast** — only the raid lead needs it configured; it streams to the group's
     add-ons out of combat (slow at 32 B/s, but a one-time ~10–30s pre-pull sync).
- **Evaluate live, in-game.** Each client checks itself; the raid lead sees who passes.
- **Report back up.** Compliance + the full capture flow to ESOTK for the post-fight
  report, player cards, and roster history.

### 12.3 In-game raid-lead dashboard (mirror the web dashboard, live)

ESOTK already has a raid-lead dashboard on the site; mirror it **in-game** so the lead
never alt-tabs. Using the group APIs (`GetGroupUnitTagByIndex`,
`GetGroupMemberSelectedRole`, …) the add-on renders a live grid of all 12 members with
red/green compliance dots, missing-requirement callouts, and live DPS/HPS/Ult from the
LibGroupCombatStats bus it already shares with Hodor. **A pre-pull "ready check"**
posts _"3 not ready: @x no food, @y wrong mundus, @z 2,400 under pen cap"_ to the lead
(or group chat) — something no tool does today.

### 12.4 Ecosystem integration (don't rebuild — plug in)

The user is right that the win is integrating with what raids already run:

- **Hodor / LibGroupCombatStats** — _the_ group combat-data bus. Publish our compliance
  data alongside Hodor's DPS so the whole ecosystem can read it; ride the same join.
- **LUI Extended (LUIE)** — MIT-licensed, provides class/role-colored Group/Raid frames
  and buff/debuff tracking. Integrate by **annotating its frames** with compliance
  state (or learn from its frame code). Open source makes this tractable.
- **Bandits UI / custom raid frames** — same pattern: overlay a compliance dot per
  member on whichever frames the raid uses, rather than forcing ours.
- **Wizard's Wardrobe** — already parsed here. The add-on can **verify the equipped
  setup matches the assignment** and prompt an auto-equip if not.
- **RaidNotifier / Code's Combat Alerts** — tie ESOTK roster **assignments** (who
  interrupts, who takes which portal/sync) to on-screen reminders.

### 12.5 Expanded idea catalogue (beyond build capture)

- **Auto-roster from the live group** — read current members + roles and **populate
  ESOTK's roster-hub automatically**, killing manual entry. (Huge, underrated.)
- **Assignment overlays** — push portal/interrupt/taunt/sync assignments from the web
  roster to in-game prompts keyed to each player.
- **Live self-HUD** — turn ESOTK's `CalculatePenetration`/`CalculateCriticalDamage`
  estimates into a real-time personal readout: _"1,300 under pen cap right now."_
- **Instant debrief** — on a wipe, the add-on snapshots who died first / who broke
  compliance and syncs it to the ESOTK report.
- **Attendance & progression tracking** — pull counts, wipe reasons, who showed,
  auto-logged to roster-hub over a prog night.
- **Consumable/repair pre-check** — flag low gear durability, missing poisons, empty
  quickslot before the pull.
- **Buff-assignment uptime** — assign Major Breach / Z'en / Slayer to players and track
  whether they actually maintain it (cross-checked against the log).
- **Trial score & leaderboard capture** — read the live trial score (time + deaths +
  hardmode) and leaderboard placement, attach to the report, and trend it per prog
  night in roster-hub. (No combat log carries the score.)
- **Tank/healer-specific compliance** — taunt uptime (cf. the _Untaunted_ addon),
  debuff coverage (Major Breach/Vuln), synergy throughput (cf. _Group Synergy
  Tracker_) — role checks that go beyond "is the build legal".

### 12.6 Honest limits on the live layer

- **32 B/s** means live data is _verdicts and a few stats_, never full builds — design
  for it (§12.1). Don't promise live gear/CP streaming.
- **You can't read another player's build** directly — they must run the add-on and
  opt in to broadcast. Value scales with raid adoption (lean on raid-lead mandate).
- **No in-combat automation / no input** — read, evaluate, display only. Stays ToS-safe
  like Hodor/CombatMetrics.
- **PC-only** (no console add-ons); console raids get the web/log-only experience.
- **FSA write-mode is Chromium-only** — import-code/broadcast are the cross-browser
  fallbacks for ruleset sync.

**Vision one-liner:** _Plan the raid on ESOTK, and the add-on becomes its live enforcer
in-game — every player self-checks against your rules, the raid lead sees green/red at a
glance, and the whole night flows back to the web as build-correlated history. The web
is the brain; the add-on is the raid's nervous system._

---

## 13. Integration feasibility matrix (verified per add-on)

The §12.4 "plug in, don't rebuild" claim, checked against each target's actual hook.
Legend: ✅ documented/public · ⚠️ open-source but no formal API (integratable, more
fragile) · 🔲 no API (overlay only).

| Target                  | Integration hook                                                                                         | Status    | What the ESOTK Companion does                                                                                                                                             | Effort   |
| ----------------------- | -------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **LibGroupCombatStats** | Public dev API: `RegisterAddon(name, {"DPS","HPS","ULT"})`, observable data, callbacks `(unitTag, data)` | ✅        | **Consume** live DPS/HPS/ULT for the dashboard. Its categories are fixed (DPS/HPS/ULT) — our own build/compliance data rides **LibGroupBroadcast** directly instead (§25) | Low      |
| **Hodor Reflexes**      | Built on LibGroupCombatStats; same group session                                                         | ✅        | Coexist on one data bus; render alongside Hodor numbers (no separate join)                                                                                                | Low      |
| **LibGroupBroadcast**   | Serialize/queue API within the 32 B/s budget                                                             | ✅        | Our own compact compliance-verdict protocol                                                                                                                               | Medium   |
| **LUI Extended**        | MIT source; custom Player/Group/Raid/Boss frames, class/role colouring, aura tracking                    | ✅ source | Annotate its raid frames with compliance dots, or reuse its frame code                                                                                                    | Medium   |
| **Wizard's Wardrobe**   | SavedVariables schema (already parsed here) + auto-equip                                                 | ✅        | Verify the equipped setup matches the assignment; offer one-click correct setup                                                                                           | Low–Med  |
| **CombatMetrics**       | SavedVariables + build export code                                                                       | ✅        | Read existing SV so users needn't run our add-on for basics (§10)                                                                                                         | Low      |
| **RaidNotifier**        | Open source; `StartCountdown()` / `AddAnnouncement()`                                                    | ⚠️        | Tie roster assignments (interrupt/portal/sync) to on-screen announcements                                                                                                 | Medium   |
| **Untaunted**           | Open-source taunt/debuff tracker                                                                         | ⚠️        | Source taunt-uptime for tank compliance (integrate or reimplement the read)                                                                                               | Medium   |
| **Bandits UI**          | Group frames + buff/timer + combat notifications                                                         | 🔲        | Overlay compliance on its frames; **must not double-notify** (BUI + RaidNotifier already conflict)                                                                        | Med–High |

**Takeaway:** the spine is **LibGroupCombatStats** — it already solved group join,
broadcast queuing, and a clean callback API, and its author (m00nyONE) maintains the
companion libs (LibCustomNames/Icons). Build on it rather than rolling our own bus, and
the Hodor user base is reachable on day one.

---

## 14. Competitive landscape & white space

What exists today, and the gap we'd own:

| Tool / category                           | What it does                                                                                                         | What it can't do                                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **ESO Logs**                              | Authoritative post-hoc combat analysis                                                                               | Read-only, after the fact; no build truth (stats/CP), no live layer, no roster rules                                 |
| **Build sites** (ESO-Hub, Alcast, Arzyel) | Static, hand-made build display & sharing                                                                            | Open-loop — never tied to a real fight or a live group                                                               |
| **Hodor / LibGroupCombatStats**           | Live group DPS/HPS/ULT share                                                                                         | Combat numbers only — no build, no compliance, no web link                                                           |
| **CombatMetrics**                         | Personal combat + build export code                                                                                  | Personal, not group; no rules; not roster-aware                                                                      |
| **RaidNotifier / BUI**                    | Mechanic alerts, frames, timers                                                                                      | No build compliance, no web roster, no analytics                                                                     |
| **RaidLead Essentials**                   | Ready-check + simple planner                                                                                         | **Discontinued**                                                                                                     |
| **RaidTools** (beta)                      | Ready-check + buff/food checker                                                                                      | Beta/niche; not role-aware; not web-connected                                                                        |
| **RdK Group Tool**                        | **Guild-admin _query_ of group members' equipment, CP, stats, mundus, skills** (opt-in, off by default; PvP-focused) | In-game only; no ESO Logs correlation, no web analytics/history, no cap-aware coaching; a query tool, not a platform |
| **Taos Group Tools / GroupSpy**           | Group ult frames, buff-food indicators, group info                                                                   | Coordination widgets, not build compliance or analytics                                                              |

> **Correction (important).** An earlier draft of this doc claimed "no competitor shares
> full builds." That is **wrong**: **RdK Group Tool already shares equipment, CP, stats
> and mundus across the group** (admin-gated, opt-in, over map pins — see §25). So the
> capability is _not_ novel. What remains genuinely unclaimed is the **combination**: a
> web-roster-driven, role-aware, **log-correlated** compliance + analytics platform.
> RdK proves the in-game transport works; it just stops at an in-game PvP query tool with
> no web brain, no ESO Logs link, and no coaching/history.

**The unclaimed quadrant:** a **web-roster-driven, role-aware, live build-compliance
system that also produces post-hoc build-correlated analytics.** Every competitor sits
on one axis (live _or_ post-hoc; combat _or_ build; personal _or_ group; in-game _or_
web). ESOTK is the only project positioned to join all of them, because it already owns
the web roster-hub, the log analytics, and `detectBuildIssues`. Notably, ESOTK's
in-development companion is _already publicly described_ as "roster validation, group
management, and gear inspection inside the ESO client" — this research sharpens that
into the concrete platform above.

> The moat isn't any single feature — it's the **loop**: plan on web → enforce in game
> → analyse on web. A pure add-on (no web brain) or a pure web tool (no in-game hands)
> can't close it. ESOTK already has both halves.

**One more structural advantage:** ESO has **no native gear/build inspection** — ZOS
deliberately disabled it to curb toxicity, and the API won't expose another player's
gear/stats (`GetPlayerStat` is self-only; there is no `GetUnitStat`). So the _only_ way
to see a teammate's full build is if they **opt in to broadcast it** from their own
client — which is exactly our model, and the model RdK already uses. The base game left
this gap open on purpose; our edge is wiring it to logs + web, not the sharing itself.

---

## 15. Data plane & the matching algorithm (the two expensive-to-change pieces)

### Where the companion data lives

The ESO Logs API v2 is **OAuth + an hourly points quota** (the RPGLogs platform; WCL's
sibling API is ~3,600 points/hr, ESO Logs is comparable) and it is **read-oriented** —
combat logs are uploaded through the Companion app, and there is **no public endpoint to
write build data into someone's report.** So companion data cannot live _inside_ ESO
Logs. It lives in **ESOTK's own backend**, keyed by `reportCode` + actor, and is
**overlaid client-side** when ESOTK renders a report. Practical rules:

- Cache report metadata; **one API fetch per report**, then reuse — respect the points
  quota (ESOTK already proxies the API today).
- The companion payload is ESOTK's data, under ESOTK's retention/privacy rules — not
  ESO Logs'. Clean separation, and it means **the feature works even on reports ESOTK
  doesn't own**, as long as we can match an actor.

### Matching a snapshot to a report/fight/actor

Inputs available:

- **Report:** absolute `startTime`, and per-fight `startTime`/`endTime` as **ms offsets
  from report start**, plus `size`, `isKill`, `name`, and `masterData.actors`
  (player name + server + type/role).
- **Companion snapshot:** character name, `@account`, zone, and **absolute UTC
  timestamp** per fight/pull (we control this format).

Algorithm (tiered, fuzzy by design):

1. **Direct key** — if the user supplied both (e.g. pasted the `reportCode` when
   uploading the snapshot), bind directly.
2. **Actor + time + zone** — match `masterData.actors` name + server to the snapshot's
   character/server, require the snapshot UTC to fall within `report.start … report.end`
   (and zone to agree), and attach to the nearest fight by offset.
3. **Manual fallback** — present unmatched snapshots in ESOTK with an "attach to this
   player" picker.

**Gotchas that must be designed for from day one:**

- **Anonymised reports** — ESO Logs can hide player names ("Random 1"), which breaks
  name matching entirely → tier-2 fails, fall to manual (tier 3) or require the direct
  key (tier 1).
- **`@displayName` may not be exposed** by the API for privacy → match on character
  name + server, keep `@account` only inside the snapshot.
- **Name collisions / multiple chars per account / mid-session swaps** → disambiguate by
  time window + role, and keep the manual override.
- **Multiple snapshots per session** → snapshot per-fight (or on meaningful change) and
  pick the one nearest each fight, so re-slots between pulls are captured (§5 P2 #11).

These two — **the snapshot schema and this matcher** — are the parts most expensive to
change later (§6). Version the schema explicitly and build the manual-attach fallback
before any of the fancier features.

---

## 16. Sustainability & positioning (free add-on, premium web)

ZeniMax's policy is unambiguous: **add-ons may not be monetised** — only donations are
permitted, and in practice donations are negligible. That isn't a problem; it _defines_
the model:

- **The add-on is free, lean, and ideally open-source.** That's mandatory (ToS) and also
  optimal for adoption and trust — the same posture that makes Hodor and LUIE widely
  installed. Its job is **reach**: get into as many raids as possible and be the data
  source + live layer.
- **ESOTK (the website) is not an add-on**, so it can carry a **premium tier** — exactly
  the ESO Logs / Warcraft Logs model (free core analysis, paid subscription for the
  deeper extras). Revenue candidates: extended build/history retention, advanced stat
  coaching, larger guild rosters, officer/attendance analytics, private guild spaces.
- **Division of labour:** the free add-on drives the funnel and the network effect (the
  more raiders run it, the better every dashboard gets); the web tier captures value.
  Never paywall the in-game compliance basics — that would throttle the adoption the
  whole platform depends on.

This also reinforces the §14 moat: a competitor would need _both_ a trusted free add-on
_and_ a web analytics business to copy it, and the add-on side can never be monetised to
fund the web side directly — so the only durable path is exactly ESOTK's: build the web
product first (already done) and let a free add-on feed it.

---

## 17. Why now — the 2026 meta makes the build gap bigger

ESO's 2026 shift to a **Seasonal model** (3–6 month content blocks replacing the annual
Chapter; Season 1 ships with **Update 50 on 8 June 2026** — _today_ — including the
**Crimson Veldt** trial) directly increases the value of build capture:

- **Subclassing + Class Mastery Passives (the big one).** The 2026 Class Identity
  Refresh lets players **mix skill lines across classes**, and adds **Class Mastery
  Passives** that _only pure-class builds_ can slot (pick 2 of 5; auto-refunded the
  moment you subclass). This explodes build variety and creates a **fresh capture gap**:
  the log's ability IDs reveal _which_ skills are slotted, but **whether a player is
  pure-class (and which Mastery Passives) vs. subclassed, and which three skill lines
  they chose**, is new build state worth capturing — and a new axis for compliance
  rules ("this fight wants the pure-class Mastery Passive build"). Nothing surfaces this
  yet.
- **Seasonal itemisation churn.** New sets (Night Market, new Thieves Guild mythic) and
  balance every season mean rulesets and set/CP data need a **per-season cadence**. The
  schema must carry a season/patch tag, and ESOTK's existing data-regen skills
  (`gear-data-regen`, `class-skill-regen`) should run each season.
- **Overland Difficulty (Seasoned/Master)** makes builds matter outside trials too,
  widening the audience for stat coaching beyond the hardcore raid niche.

**Implication:** ship capture of **CP allocation + subclass lines + Class Mastery
Passives + final stats** as the v1 payload — it's both the user's ask _and_ the freshest
gap the 2026 systems opened. Tag every snapshot and ruleset with the season/patch.

## 18. Platform reality (and a console-only opportunity)

The web pipeline is **hard PC-only**, more strictly than first stated:

- Console (PS5 / Xbox) **got add-ons in Update 46 (June 2025) but only UI-focused
  ones** — no gameplay/combat scripts.
- Console can run `/encounterlog`, **but the platform security model blocks access to
  the log files and SavedVariables entirely** — there is _no_ way to export either, even
  via the add-on API. So console has **no ESO Logs and no way to upload to ESOTK**.

Therefore: ESOTK + companion capture/upload is PC-only; console reports simply don't
exist to enrich. **But** that same gap is an opening: console raiders have _no_ combat
analysis at all. A **purely in-game, web-free live layer** (the §12 compliance dashboard

- ready-check, sharing compact verdicts over LibGroupBroadcast) could be uniquely
  valuable on console — _if_ it qualifies as a "UI add-on" and the group-data libs are
  permitted there. **Unverified and likely later-phase**, but it's a genuine
  blue-ocean angle no PC-centric competitor is chasing. Flag it as a research spike, not a
  v1 commitment.

## 19. Recommended add-on tech stack & a concrete SavedVariables schema

**Libraries (all standard, well-maintained):**

- **`GetTimeStamp()`** → UNIX seconds in server time — the exact key for matching to ESO
  Logs' absolute report `startTime` (§15). Stamp every snapshot with it.
- **LibSavedVars** — scoped (server/account/character) saved vars **with migration**;
  use it to version the schema so per-season changes don't corrupt old data.
- **LibAddonMenu-2.0** — the settings panel (toggles for broadcast opt-in, ruleset sync,
  what to capture).
- **LibGroupBroadcast** + **LibGroupCombatStats** — the live layer bus (§12, §13).
- **LibCombat** — combat data feed (what CombatMetrics/Hodor build on) if we compute
  any live combat metrics ourselves.

**Draft schema (`ESOTKCompanionSV`)** — illustrative, versioned, per-fight snapshots:

```lua
ESOTKCompanionSV = { ["Default"] = { ["@account"] = { ["$AccountWide"] = {
  schemaVersion = 1,
  season        = "U50",                 -- per-season/patch tag (§17)
  snapshots = { [1] = {
    schemaVersion = 1, season = "U50",
    ts      = 1749384000,                -- GetTimeStamp() — UTC match key (§15)
    char    = "Charname", server = "NA", -- match key vs masterData.actors
    zoneId  = 1196, zone = "Crimson Veldt",
    classId = 6, className = "Arcanist", raceId = 4, raceName = "Khajiit", role = "dps",
    -- gaps the log can't see:
    cp = { warfare = { [starId]=pts }, fitness = {…}, craft = {…},
           slotted = { [1]=starId, …, [12]=starId } },
    masteryPassives = { id, id },         -- 2026 pure-class passives (§17)
    subclassLines   = { lineId, lineId, lineId }, -- 2026 subclassing (§17)
    attrs  = { magicka=0, health=64, stamina=0 },
    mundus = "The Lover",
    food   = { id=12345, name="Bewitched Sugar Skulls" },
    stats  = { maxMag=, maxStam=, maxHealth=, spellDmg=, weaponDmg=,
               critRating=, critDmg=, penPhys=, penSpell=,
               recovMag=, recovStam=, recovHealth=, resistPhys=, resistSpell= },
    -- redundant with the log (optional / verification only):
    bars = { front={…}, back={…} }, gear = { [slot]={link,trait,enchant,quality,setId} },
    -- live-layer output:
    rulesetId  = "vCR-dps-v3",
    compliance = { food=true, mundus=true, pen=false, sets=true, cp=true },
  } },
  rulesets = {},                          -- inbound from ESOTK (FSA write / import code)
} } } }
```

The two fields that must never break without a version bump: `ts` + `char`/`server`
(the matcher's keys) and `schemaVersion`. Everything else is additive.

---

## 20. Capture methodology & data accuracy (get this right or the coaching lies)

`GetPlayerStat` returns the **current, live** value — it _includes_ whatever buffs are
active at the instant you read it (food, mundus, CP, **and** group buffs like Major
Courage / Major Slayer in combat). So _when_ we snapshot changes the numbers, and naïve
capture produces misleading coaching. Standardise it:

- **Capture a canonical "baseline" snapshot out of combat, self-buffed** (food + mundus
  - CP, no group buffs). This is the apples-to-apples build value to compare against
    caps and across players. Trigger on `EVENT_PLAYER_COMBAT_STATE` (combat end) or a
    manual "snapshot now," not mid-pull.
- Optionally also capture an **in-combat** reading to show buffed peaks — but label it
  distinctly; never feed buffed numbers into "are you at the pen cap" math.
- **Penetration/crit caps are content-aware.** The 18,200 cap is the PvE
  trial/dungeon-boss resist; **PvP targets have their own (much higher, variable)
  resistances**, so the coaching engine must branch on PvE vs PvP and, ideally, the
  specific encounter. Don't hard-code 18,200 everywhere.
- **Match on IDs, not names.** Ability/set/food names are localised per client language;
  store ability IDs, set IDs, food item IDs, mundus IDs — resolve to display names in
  ESOTK (which already maintains that data). Keeps non-English clients working.
- **Stamp validity.** Each snapshot carries its season/patch (§17 `season`) so coaching
  uses the right caps and set data for that point in time.

## 21. Beyond trials — PvP & organized-group audiences

Build capture + compliance isn't only a PvE-trial play:

- ESO Logs, **CombatMetrics**, and **Easy Stalking** already log **Cyrodiil, Imperial
  City and Battlegrounds**, and **PvpMeter** shows the appetite for PvP performance
  tracking — so logged PvP data exists to enrich.
- **Organized PvP groups are _more_ build-prescriptive than PvE**: Cyrodiil ball/bomb
  groups run tightly-specified sets, resistances, and synergies. A role-aware compliance
  check ("everyone on the prescribed proc set / resist threshold / purge build") maps
  directly onto how these groups already operate — arguably a stronger fit than PvE.
- This widens the audience well past the hardcore trial niche (reinforced by Overland
  Difficulty in 2026, §17) without building anything new — the same capture + ruleset
  engine, with content-aware caps (§20).

## 22. Privacy, consent & staying ToS-safe

Builds are semi-personal and competitive, and the live layer shares them — so consent is
a first-class design concern, not an afterthought:

- **Broadcasting is opt-in**, with a clear in-game toggle (LibAddonMenu) and a visible
  indicator of what's shared. Mirror the reason Hodor is perceived as benign:
  transparent, read-only, user-controlled. This **aligns with ZOS's own design intent**
  — they disabled native inspection precisely to prevent unwanted build-snooping, so a
  consent-first, opt-in share is the only model that respects that line (§14).
- **Granularity** — let players share only a compliance verdict (pass/fail bits) without
  exposing exact stats/gear, for groups that want enforcement without doxxing builds.
- **ESOTK-side retention/redaction** — companion data is ESOTK's (§15); honour
  delete/anonymise requests and don't surface a player's build on reports they didn't
  consent to. Respect ESO Logs' own anonymisation (don't de-anonymise via the companion).
- **ToS line stays bright:** read state, evaluate, display, broadcast opt-in summaries —
  **no input automation, no combat decision-making.** This is the same posture that
  keeps CombatMetrics/Hodor sanctioned, and it must never be crossed for a "convenience"
  feature.

## 23. Maintenance, dependencies & risk

- **ESO breaks add-ons every major update** — and with the 2026 **Seasonal cadence
  (every 3–6 months)** that's more often. The API version bumps, ability/set IDs shift,
  and CP trees change. Budget a **per-season maintenance pass**: bump the API version,
  re-run `gear-data-regen`/`class-skill-regen`, refresh caps/ruleset presets, validate
  the schema migration (LibSavedVars).
- **Third-party lib fragility** — the live layer leans on LibGroupBroadcast /
  LibGroupCombatStats, which themselves break on patches (there was a _"Fix for
  LibGroupBroadcast"_ thread in 2026). Treat the live layer as the volatile part and the
  SavedVariables capture as the stable core, so a broken broadcast lib never blocks the
  deep web value.
- **Adoption dependency** — group features scale with how many members run it; the
  free/OSS posture (§16) and piggybacking on existing add-ons (§10) are the mitigations.
- **Single-maintainer bus risk** — LibGroupCombatStats/Hodor are largely one author
  (m00nyONE). Vendoring or contributing upstream reduces exposure if that stalls.
- **Scope risk** — §12's full platform is large. Ship the §8 vertical slice first; treat
  the dashboard, ruleset engine, and ecosystem hooks as sequenced phases, not v1.

---

## 24. Consolidated roadmap

Pulling the scattered phasing into one sequence. Each phase is independently shippable
and builds on the prior schema + matcher.

| Phase                         | Deliverable                                                                                                                                                                     | Why this order                                                                         | Key refs        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------- |
| **0 — Foundations**           | Versioned `ESOTKCompanionSV` schema + the report↔snapshot matcher (incl. manual-attach fallback)                                                                                | Most expensive to change later; everything depends on it                               | §15, §19        |
| **1 — Vertical slice**        | Add-on captures local player's **CP allocation + final stats + mundus + food + subclass/mastery**; ESOTK renders it on the player card with the **pen-vs-cap coaching** insight | Delivers the headline ask _and_ one genuinely useful, non-redundant insight on day one | §8, §11.1, §17  |
| **2 — Effortless ingest**     | Manual `.lua` upload (extend `luaParser.ts`); optional FSA folder-sync / copy-paste code                                                                                        | Transport is plumbing — make it painless, don't over-build                             | §9              |
| **3 — Read existing add-ons** | Ingest CombatMetrics / Wizard's Wardrobe SavedVariables                                                                                                                         | Lowers the adoption ask before requiring our add-on                                    | §10             |
| **4 — Whole-group capture**   | LibGroupBroadcast/LibGroupCombatStats group snapshots → one logger covers the raid                                                                                              | Turns a personal tool into a raid tool; the network effect                             | §12.1, §13      |
| **5 — Compliance engine**     | Role-aware rulesets defined on ESOTK → synced to game → client-side eval → results on web                                                                                       | The raid-lead value; feeds `detectBuildIssues`                                         | §11.3, §12.2    |
| **6 — In-game dashboard**     | Live raid-lead grid + pre-pull ready-check, in-client                                                                                                                           | Mirrors the web dashboard where the lead actually is                                   | §12.3           |
| **7 — Ecosystem hooks**       | LibGroupCombatStats category, LUIE frame annotation, Wizard's Wardrobe verify, RaidNotifier assignments                                                                         | Plug into what raids already run                                                       | §12.4, §13      |
| **8 — Longitudinal + reach**  | Build-vs-performance history; PvP content-aware caps; console live-layer spike                                                                                                  | Compounding value + audience expansion                                                 | §11.4, §21, §18 |

**Cross-cutting, every phase:** opt-in consent (§22), ID-not-name matching + canonical
baseline snapshot (§20), per-season maintenance pass (§23), free add-on / premium web
(§16).

**If you do only three things:** (1) lock the schema + matcher, (2) ship CP + stats +
pen-cap coaching on the player card, (3) make group capture work via LibGroupCombatStats.
That sequence proves the headline ask, the unique insight, and the network effect — the
three things the whole platform rests on.

---

## 25. Group-share transport — how to actually broadcast it

Now that opt-in group sharing is accepted, here's the concrete "how", grounded in the
real libraries and an existing precedent (RdK Group Tool).

### Two libraries, two jobs

- **LibGroupCombatStats** — _consume only_. Clean callback API, but its categories are
  fixed (DPS/HPS/ULT). Use it to pull live combat numbers into the dashboard; it is **not**
  where custom build/compliance data goes.
- **LibGroupBroadcast 2.0** (sirinsidiator) — _the vehicle for our own data_. It exposes
  a real custom-protocol API: `DeclareProtocol(id, name)` (id/name must be globally
  unique, reserved on the ESOUI wiki), then `AddField(...)` built from `CreateFlagField`
  (booleans → single bits), `CreateNumericField` (range-limited ints — declare min/max so
  it uses the fewest bits), enum/array/reserved fields. The library bit-packs to the
  minimum and fairly shares the **~32 B/s** group budget across all add-ons.

### Two payload tiers (driven by the byte budget)

1. **Live compliance verdict** — what we broadcast in/around combat. A handful of
   `FlagField`s (`food`, `mundus`, `pen`, `sets`, `cp`, `roleOK`) plus maybe one or two
   small bucketed numerics. That's a few **bits**, trivially within budget. Each client
   self-evaluates against the synced ruleset (§12.2) and broadcasts only this verdict;
   the raid lead aggregates into the dashboard.
2. **Full build** (CP allocation + exact stats + gear) — far too big for the live
   trickle. Two ways to move it, neither needs a desktop app:
   - **Per-member SavedVariables upload (recommended for the website).** Each player
     uploads their own file; ESOTK matches and assembles the group. No byte budget at
     all, exact data. Simplest and most reliable.
   - **In-game bulk query over map pins** — the **RdK Group Tool precedent**: a guild
     admin can already _query_ members' equipment/CP/stats/mundus, transferred over map
     pins, opt-in and off by default. Proves full-build P2P transfer works; it's just
     slow, so do it **out of combat / pre-pull**, on demand.

### Recommendation

Live **verdicts via LibGroupBroadcast** for the in-game dashboard; **full builds via
per-member SavedVariables upload** for the website. Add RdK-style in-game bulk query
only later, as a convenience, if users want full builds visible in-game without uploading.

### Constraints to design in now

- Reserve a unique protocol id+name on the ESOUI wiki; **version the protocol** and
  handshake so mismatched add-on versions degrade cleanly.
- Bulk transfer is **out-of-combat only** (and courteous on the shared channel).
- Everyone who should appear must run the add-on and opt in (§12.6) — verdicts/builds
  come from each player's own client, never from inspection.

---

## 26. Ruleset / criteria schema (the compliance engine, concretely)

§12.2 introduced the role-aware ruleset; here is the actual model, because it's the
centrepiece and the self-vs-effective split (§11.1.1) makes a naïve "list of thresholds"
wrong.

### The rule model

A **ruleset** targets a role (and optionally an encounter/content) and holds rules.
Each **rule** is a small, declarative assertion plus — crucially — **where it can be
evaluated**:

```jsonc
{
  "id": "vCR-dps", "version": 3, "season": "U50",
  "label": "Crimson Veldt — DPS", "role": "dps", "content": "vCrimsonVeldt",
  "rules": [
    // --- evaluable in-game by the player's own client (live, pre-pull) ---
    { "id": "food",    "field": "food.active",      "op": "eq",  "value": true,
      "severity": "error", "eval": "client", "label": "Eat food" },
    { "id": "mundus",  "field": "mundus.id",        "op": "in",  "value": [13984, 13975],
      "severity": "warn",  "eval": "client", "label": "Lover / Thief mundus" },
    { "id": "critdmg", "field": "crit.damagePct",   "op": "lte", "value": 125,
      "severity": "warn",  "eval": "client", "label": "Crit damage ≤ 125% cap" },
    { "id": "attrs",   "field": "attrs.stamina",    "op": "gte", "value": 64,
      "severity": "info",  "eval": "client", "label": "All attributes in Stamina" },
    { "id": "sets",    "field": "gear.setIds",      "op": "containsAll", "value": [<deadly>, <sulxan>],
      "severity": "warn",  "eval": "client", "label": "Deadly + Sul-Xan" },
    // --- needs the uploaded log to be exact (post-hoc) ---
    { "id": "pen",     "field": "penetration.effective", "op": "between", "value": [18000, 18400],
      "severity": "error", "eval": "log", "liveApprox": { "field": "penetration.self",
        "op": "gte", "assumedGroupPen": 11030 },
      "label": "≈18.2k effective pen, no over-pen" },
    { "id": "breach",  "field": "log.targetDebuffUptime.MajorBreach", "op": "gte", "value": 95,
      "severity": "info",  "eval": "log", "scope": "group", "label": "Major Breach ≥95%" }
  ]
}
```

Operators: `eq | in | gte | lte | between | containsAll | containsAny`. Severity:
`error | warn | info` (drives card colour + whether it blocks a ready-check).

### Two evaluation contexts (this is the important part)

- **`eval: "client"`** — the player's own client has the data about _itself_ (self
  stats, CP allocation, attributes, mundus, food, **its own gear/sets**). It evaluates
  these live and broadcasts only the resulting bits (§25). Works **pre-pull**, in-game.
- **`eval: "log"`** — needs the uploaded report (effective penetration via the boss's
  debuffs, buff/debuff uptimes, group-scope checks). **ESOTK** evaluates these post-hoc
  by combining the snapshot with the log.
- **`liveApprox`** — bridges the two for penetration. Effective pen can't be known
  before the pull (depends on the group's debuffs on the boss), so the live check uses
  `self-pen ≥ 18,200 − assumedGroupPen`. A standard tank kit supplies ≈**11,030** (Major
  - Minor Breach + gold Crusher), so a DPS needs ≈**7,170** self-pen to be on track; the
    exact verdict is recomputed from the log afterwards. The ruleset carries the
    assumption so the live light is meaningful without pretending to be exact.

### Compile → sync → evaluate → report

1. **Author on the web.** Raid lead builds/edits the ruleset in ESOTK (defaults shipped
   per content/season; reuse `detectBuildIssues`). Human-readable JSON lives server-side.
2. **Compile to a compact "rule program."** Strip to the `eval: "client"` rules, map
   each `id` → a fixed **bit index**, and encode `{fieldId, op, value}` into a small
   blob. The client never needs the prose — just the field/op/value tuples.
3. **Sync down** (§12.2): FSA write-mode file, import code, or broadcast.
4. **Evaluate client-side** → produce the compliance **bitfield** (bit _i_ = rule _i_
   pass/fail) → broadcast over LibGroupBroadcast (§25).
5. **Aggregate + complete on the web.** The raid-lead dashboard shows the live bits; on
   upload, ESOTK evaluates the `eval: "log"` rules and merges, producing the final
   per-player, per-fight compliance — including exact effective pen.

### Versioning & safety

- A compliance bitfield is meaningless without its **ruleset id + version** — broadcast
  them together and handshake; mismatched versions degrade to "unknown," never to a
  wrong green.
- Ship **presets** (e.g. a sane default: food required, mundus sensible, self-pen on
  track, crit-dmg ≤ cap, attributes spent) so a lead gets value with zero authoring; let
  them override per content.
- Rules reference IDs (set/mundus/food/ability), never localised names (§20).

> Net: the ruleset is one declarative document, but it **runs in two places** — the
> client checks what it can see about itself before the pull, and ESOTK finishes the
> log-dependent checks after. The `eval` tag is what keeps "is everyone ready?" honest
> in-game and "was everyone actually optimal?" exact on the web.

### 26.1 Canonical in-game readiness flow (logs not required)

The agreed live-compliance loop, and why it sidesteps the bandwidth limit entirely:

1. **Raid lead authors a static ruleset on the web** (per role/content). It stays put
   until they change it.
2. **Synced into the add-on** once (file / import code / broadcast).
3. **Each client checks _itself_** against the ruleset (it has full data about its own
   character).
4. **Each client broadcasts only a per-rule pass/fail bitfield** — ~2–4 bytes, re-sent
   only when something changes. **You broadcast verdicts, never builds.**
5. **Group frames show a red X** on anyone non-compliant.
6. **Click → expands the exact failures**, _reconstructed locally_ from each client's own
   copy of the ruleset (bit _i_ → rule _i_ → "Wrong mundus — needs The Lover"). Zero
   extra bandwidth for the detail.

Logs never enter this loop (they aren't instant). The log is a **post-hoc bonus layer**
for the one thing that needs it — exact _effective_ penetration and buff/debuff uptimes.

**Why the bandwidth objection dies here:** the only thing on the wire is a few-byte,
static, on-change verdict — smaller than the DPS numbers Hodor already shares. The full
build is never transmitted for this feature; the readable "what's missing" is rebuilt
from local data.

### 26.2 Verified client-side checks (API confirmed, not assumed)

Every readiness check below was confirmed against real add-on source / API references
(see Sources), so the add-on reads them from the player's _own_ client with no inspection:

| Requirement                      | Confirmed read                                                                                                                                      | Source                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Champion points** (enumerate)  | `GetNumChampionDisciplines()`, `GetChampionDisciplineId(index)`, `GetNumChampionDisciplineSkills(index)`, `GetChampionSkillId(index, index)`        | esoui `championdatamanager.lua` |
| **Champion points** (allocation) | `GetNumPointsSpentOnChampionSkill(skillId)` — single arg                                                                                            | DynamicCP `src/API.lua`         |
| **Champion points** (slotted)    | `GetSlotBoundId(slot, HOTBAR_CATEGORY_CHAMPION)`, slots 1–12                                                                                        | DynamicCP `OFFSETS`             |
| **Gear set**                     | `GetItemLink(BAG_WORN, slot)` → `GetItemLinkSetInfo(link, true)` → `setId`, `numEquipped`                                                           | ESOUI                           |
| **Food**                         | active buff via `GetUnitBuffInfo("player", i)` ability id                                                                                           | ESOUI                           |
| **Mundus**                       | active buff id (no direct getter — match a known mundus boon id list)                                                                               | ESOUI                           |
| **Potion**                       | `GetSlotItemLink(quickslotIndex)`                                                                                                                   | ESOUI                           |
| **Attributes**                   | `GetAttributeSpentPoints(attributeType)` → points                                                                                                   | eso-api dump                    |
| **Self penetration / crit**      | `GetPlayerStat(STAT_*)` — `STAT_SPELL_POWER/STAT_POWER/STAT_CRITICAL_STRIKE/STAT_SPELL_CRITICAL/STAT_PHYSICAL_PENETRATION/STAT_SPELL_PENETRATION/…` | esoui API constants             |

> **Index-vs-id gotcha (confirmed from ZOS source).** `GetNumChampionDisciplineSkills`
> and `GetChampionSkillId` take the discipline **index**; `GetChampionDisciplineType`
> takes the discipline **id**; `GetNumPointsSpentOnChampionSkill` takes the **skillId**.
> Mixing them returns wrong/empty data — a real bug caught during verification. Only
> step left is a one-time in-game run to confirm captured values match the character
> sheet; the function names and arities are now source-verified.

---

## 27. Report-page upload integration map (verified entry points)

The ESOTK side is built and unit-tested (parser → matcher → view-model + coaching →
`buildCompanionBuildsForReport` → `CompanionBuildPanel` → `PlayerCard.companionBuild`).
The only remaining work is the report-page upload UI, and the wiring is paint-by-numbers
against these **verified** store/types (confirmed by reading the code, not assumed):

1. **Ingest the file.** Reuse the existing Lua-import UX (Loadout Manager already does a
   `FileReader` `.lua` upload). Run the bytes through
   `parseESOTKCompanionSavedVariables(text)` → `CompanionParseResult` (`.all` snapshots).
2. **Build `MatchableReport`** from report state:
   - `actors`: from report `masterData` actors — `ReportActorFragment` has
     `{ id, name, displayName, anonymous }` (`src/graphql/gql/graphql.ts`). Map
     `id`→actor id, `name`→character (the match key). `anonymous === true` ⇒ names are
     hidden, so the matcher falls back to manual attach (already handled). There is **no
     per-actor `server`** field — match on name; use report-level server only if needed.
   - `fights`: `selectReportFights` / `selectReportFightsForContext`
     (`src/store/report/reportSelectors.ts`) — each fight has `id`, `startTime`,
     `endTime` (ms offsets from report start).
   - `startTime` / `endTime`: from the `ReportEntry` (`src/store/report/reportSlice.ts`,
     absolute UNIX ms).
3. **Compute per-player props:**
   `buildCompanionBuildsForReport(result.all, matchableReport, { coaching: { assumedGroupPen } })`
   → `Map<actorId, { championPoints, coaching, snapshot, fightId }>`.
4. **Render:** players come from `selectPlayersByIdForContext` keyed by `player.id`
   (already imported in `PlayerCard.tsx`; cards are rendered via
   `PlayersPanel`/`PlayersPanelView`/`LazyPlayerCard`). Pass
   `companionBuild={builds.get(player.id)}` to each `PlayerCard`. Absent ⇒ panel renders
   nothing (no change to existing cards).

**Notes:** `displayName` ↔ `snapshot.account` (optional cross-check). For _exact_
effective penetration, later pass the boss's Major Breach/Crusher uptime from the log as
`assumedGroupPen` with `groupPenIsExact: true` (§11.1.1); until then the standard-kit
estimate is fine. Hold the parsed snapshots in local component state or a small slice —
they're per-session, not persisted server-side.

---

## Sources

- [ESO Logs — Getting Started](https://www.esologs.com/help/start)
- [Encounter Logging — ESO Forums](https://forums.elderscrollsonline.com/en/discussion/467949/encounter-logging)
- [ESO-Logs-parser (encounter log format)](https://github.com/FuyuByakko/ESO-Logs-parser)
- [ESO Logs v2 GraphQL API docs](https://www.esologs.com/v2-api-docs/eso/)
- [LibGroupCombatStats (esoui)](https://www.esoui.com/downloads/info4024-LibGroupCombatStats.html) · [GitHub](https://github.com/m00nyONE/LibGroupCombatStats)
- [LibGroupBroadcast (formerly LibGroupSocket)](https://www.esoui.com/downloads/download1337-LibGroupBroadcastformerlyLibGroupSocket)
- [HodorReflexes — DPS & Ult share](https://www.esoui.com/downloads/info2311-HodorReflexes-DPSUltimateShare.html) · [GitHub](https://github.com/m00nyONE/HodorReflexes)
- [Combat Metrics (esoui)](https://www.esoui.com/downloads/download1360-CombatMetrics)
- [ESOUI Wiki — API reference](https://wiki.esoui.com/API)
- [Champion Point Import add-on](https://esoui.com/downloads/info3421-ChampionPointImport.html)
- [Dynamic CP (Champion Points 2.0)](https://www.esoui.com/downloads/info2952-DynamicCPChampionPoints2.0.html)
- [Fix for LibGroupBroadcast — ESO Forums (2026)](https://forums.elderscrollsonline.com/en-gb/discussion/679406/fix-for-libgroupbroadcast)
- [ESO Logs Uploader (Electron app) — Archon](https://www.archon.gg/eso/articles/help/uploader)
- [ESO-Database Export AddOn](https://www.esoui.com/downloads/info916-ESO-Database.comExportAddOn.html) · [Manual data upload](https://www.eso-database.com/en/manual-data-upload/)
- [File System Access API — Chrome for Developers](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) · [Persistent permissions](https://developer.chrome.com/blog/persistent-permissions-for-the-file-system-access-api) · [caniuse browser support](https://caniuse.com/native-filesystem-api)
- [browser-fs-access (legacy fallback helper)](https://github.com/GoogleChromeLabs/browser-fs-access)
- [Chat2Clipboard (in-game copy pattern)](https://www.esoui.com/downloads/info553-Chat2Clipboard.html) · [Illegal Call CopyAllTextToClipboard — ESOUI](https://www.esoui.com/forums/showthread.php?t=6012)
- [ESO-Hub Build Editor (import/export, CombatMetrics integration)](https://eso-hub.com/en/build-editor)
- [ESO penetration & the 18,200 cap (over-penetration is wasted)](https://hyperioxes.com/eso/tools/penetration-calculator)
- [ESO critical damage 125% hard cap / crit rating ÷ 21,918](https://eso-hub.com/en/guides/critical-damage) · [UESP: Critical Damage](https://en.uesp.net/wiki/Online:Critical_Damage)
- [Penetration = personal sources vs group armour debuffs on the target (Breach/Crusher/Alkosh)](https://forums.elderscrollsonline.com/en/discussion/477907/penetration-calculation-and-how-it-works) · [Penetration overview — TerminalESO](https://terminaleso.wordpress.com/penetration/)
- [Add-ons computing live pen-on-target by scanning boss debuffs — Dynamic Stats](https://esoui.com/downloads/info3917-Dynamicstats.html) · [Meterskull](https://www.esoui.com/downloads/info3941-MeterskullArmorPowerCriticalPenetrationMeter.html)
- [LibGroupBroadcast — 32 bytes/sec group data limit](https://www.esoui.com/downloads/info1337-LibGroupSocket.html) · [LibGroupSocket source](https://github.com/ESOUIMods/LibGroupSocket/blob/master/LibGroupSocket.lua/)
- [LUI Extended (MIT, custom group/raid frames)](https://www.esoui.com/downloads/info818-LuiExtended.html) · [GitHub](https://github.com/DakJaniels/LuiExtended)
- [ESOUI Wiki — UnitTag / group APIs](https://wiki.esoui.com/UnitTag)
- [LibGroupCombatStats — developer API (RegisterAddon, callbacks)](https://github.com/m00nyONE/LibGroupCombatStats)
- [RaidNotifier (open source, StartCountdown/AddAnnouncement)](https://github.com/kyoma/ESO-RaidNotifier)
- [Bandits User Interface](https://esoui.com/downloads/info1643-BanditsUserInterface.html)
- [Untaunted — taunt/debuff tracker (open source)](https://github.com/Solinur/Untaunted)
- [Group Synergy Tracker](https://esoui.com/downloads/info2429-GroupSynergyTracker.html)
- [RaidTools (beta — ready check, buff/food checker)](https://www.esoui.com/downloads/info1969-RaidTools.html) · [RaidLead Essentials (discontinued)](https://www.esoui.com/downloads/info1201-RaidLeadEssentials.html)
- [ESO-Database Game Data & Leaderboards API](https://game-data.eso-database.com/)
- [ESO Logs API documentation — Archon](https://www.archon.gg/eso/articles/help/API-documentation) · [ESO Logs Python (rate-limit/points)](https://esologs-python.readthedocs.io/)
- [ESO Logs report/fights schema (startTime offsets, masterData)](https://articles.esologs.com/help/intro-to-scripts)
- [Add-on monetisation forbidden by ZOS — donations only (ESO Forums)](https://forums.elderscrollsonline.com/en/discussion/370469/do-add-on-devs-mod-programmers-get-compensated-in-any-way)
- [ESO 2026 roadmap & Seasons](https://hacktheminotaur.com/eso-guides/eso-2026-roadmap-seasons-updates/) · [Update 50 guide (Crimson Veldt, Werewolf, Class Mastery)](https://arzyelbuilds.com/eso-update-50/)
- [ESO 2026 Class Identity Refresh & subclassing / Class Mastery Passives](https://hacktheminotaur.com/eso-guides/eso-class-updates-2026-the-class-identity-refresh/)
- [Console can't access /encounterlog files (ESO Forums)](https://forums.elderscrollsonline.com/en/discussion/679575/problem-consoles-cannot-access-logs-generated-by-encounterlog) · [Console add-ons guide](https://alcasthq.com/eso-addons-console-guide/)
- [LibSavedVars (scoped + migration)](https://github.com/silvereyes333/LibSavedVars) · [LibAddonMenu-2.0](https://www.esoui.com/downloads/info7-LibAddonMenu.html)
- [GetPlayerStat (UESP function reference)](https://esodata.uesp.net/100010/data/g/e/t/GetPlayerStat.html) · [Character sheet & advanced stats explained](https://www.eso-u.com/articles/player_character_sheet_and_advanced_stats_ui_explained)
- [Easy Stalking — auto-log Cyrodiil/IC/BG](https://www.esoui.com/downloads/info2332-EasyStalking-Encounterlog.html) · [PvpMeter](https://forums.elderscrollsonline.com/en/discussion/387159/addon-pvpmeter-graphical-tracker-for-your-kill-death-in-pvp-and-history-of-your-bg-duel-played) · [PvP addons guide — NirnStorm](https://nirnstorm.com/eso/guides/pvp-addons-guide/)
- [No native gear inspection in ESO (ZOS design, anti-toxicity)](https://forums.elderscrollsonline.com/en/discussion/619375/ability-to-inspect-players-in-eso) · [Why you can't inspect other players](https://forums.elderscrollsonline.com/en/discussion/566890/why-cant-i-inspect-other-players-noob-question)
- [GetUnitPower (current/max for any unitTag)](https://esoapi.uesp.net/100020/data/g/e/t/GetUnitPower.html) · [GetUnitBuffInfo (group buffs)](https://esodata.uesp.net/100016/data/g/e/t/GetUnitBuffInfo.html) · [UnitTag reference](https://wiki.esoui.com/UnitTag)
- [LibGroupBroadcast custom-protocol API (DeclareProtocol/AddField/NumericField/ArrayField)](https://github.com/sirinsidiator/ESO-LibGroupBroadcast) · [Broadcasting API thread](https://www.esoui.com/forums/showthread.php?p=51019)
- [RdK Group Tool — group query of equipment/CP/stats/mundus over map pins](https://www.esoui.com/downloads/info2475-RdKGroupTool.html) · [Taos Group Tools](https://esoui.com/downloads/info1962-TaosGroupTools.html)
- [DynamicCP source — verified champion-point API (single-arg `GetNumPointsSpentOnChampionSkill`, slot OFFSETS)](https://github.com/Kyzderp/DynamicCP)
- [Official ZOS source — champion enumeration (`GetNumChampionDisciplines`/`GetChampionDisciplineId`/`GetNumChampionDisciplineSkills`/`GetChampionSkillId`, index-vs-id)](https://github.com/esoui/esoui/blob/master/esoui/ingame/champion/championdatamanager.lua) · [ESOUIDocumentation.txt (STAT\_\* constants)](https://github.com/esoui/esoui/blob/master/ESOUIDocumentation.txt)
- [GetItemLinkSetInfo (numEquipped/setId) — ESOUI wiki](https://wiki.esoui.com/GetItemLink) · [GetItemLink](https://wiki.esoui.com/GetItemLink)
- [Mundus detection is buff-id-based via GetUnitBuffInfo (no direct getter)](https://www.esoui.com/forums/showthread.php?t=2225) · [Quickslot read GetSlotItemLink](https://www.esoui.com/forums/showthread.php?t=6286)
  </content>
  </invoke>
