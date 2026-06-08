# ESOTK Companion Add-on — Research & Strategy (June 2026)

> Research brief for the in-game ESO add-on that pairs with ESO Toolkit (ESOTK).
> Goal: capture the build/character data that ESO Logs **cannot** see, and feed it
> back into ESOTK so player cards, build-hub, roster-hub and fight-replay show a
> complete picture.

---

## 1. The core thesis

ESO Logs is excellent at **what happened in combat** (damage, healing, casts, buffs,
deaths, timelines). It is structurally blind to **why** — the character build that
produced those numbers. That blindness is not a bug in ESO Logs; it is a limit of the
data source. The game's **encounter log** (`Encounter.log`, the file the ESO Logs
add-on uploads) only writes what ZeniMax chose to emit, and ZeniMax deliberately
**disabled real-time logging** years ago to prevent in-combat automation. So the log
is a post-hoc, partial snapshot.

An **in-game add-on** runs inside the ESO Lua sandbox and can read the *live* character
state through the official API — including everything the log omits. That is the gap
we fill. The add-on captures the missing build data, and ESOTK stitches it onto the
log it already analyses, matching by character/account + timestamp + zone.

**One-line pitch:** *ESO Logs tells you the player did 92k DPS. The ESOTK Companion
tells you they did it on a 66-trait CP build with 18k penetration, Deadly/Sul-Xan,
Lover mundus, and Bewitched Sugar Skulls — and shows it on the player card.*

---

## 2. Gap analysis — what the log already has vs. what it misses

The raw `Encounter.log` `PLAYER_INFO` line (emitted per player when they enter an
encounter) actually carries **more than most people realise**:

| Already in the log / ESO Logs | Notes |
|---|---|
| Equipped gear: item IDs, **trait, set, display quality, enchant type/level/quality**, item level, per slot | Both bars. ESO Logs surfaces gear on player pages. |
| Slotted abilities (front + back bar ability IDs) | Morphs are derivable from the ID. |
| "Long-term effects" list (passives + buffs) incl. the **CP-slotted stars**, mundus buff, food/drink buff, vampire/WW | Present as buff IDs, but not labelled as "this is the build". |
| CP **rank** (total earned) | Not the allocation. |
| Race/class | Derivable; class is explicit, race partially. |

What is **never** emitted and therefore impossible for ESO Logs to show:

| Missing data | Why it matters | API source (in-game) |
|---|---|---|
| **Champion Point *allocation*** — points spent per star across all 3 trees, not just the 4 slotted | The #1 ask. Two players with identical gear can have wildly different CP and the log can't tell them apart. | `GetNumPointsSpentOnChampionSkill`, `GetChampionPointsPlayerProgressionData` |
| **Final derived stats**: max mag/stam/health, spell/weapon damage, **crit %, crit damage, penetration, recovery, resistances, mitigation** | These are computed client-side and never logged. The single most requested "why is my DPS low" diagnostic. | `GetPlayerStat(STAT_*)` |
| **Attribute point split** (Mag/Health/Stam) | Build correctness check. | `GetAttributeSpentPoints(attribute)` |
| **Exact enchant magnitude** & **trait quality nuance** | Log gives enchant *type/level*, not the rolled value. | `GetItemLink` + `GetItemLinkEnchantInfo` |
| **Mundus stone (named)** | Only inferable from a buff ID today. | buff detection / `GetItemLink` of the boon |
| **Active food/drink (named, with duration)** | Inferable from buff today; add-on can name it + flag "no food". | buff scan |
| **Skill/CP passives unlocked, skill point spend** | Build completeness. | skill-line API |
| **Scribing scripts actually slotted** (grimoire + 3 scripts) | ESOTK already *detects* scribing from events; the add-on can report it **authoritatively**. | scribing API |
| **Companion build** (gear/skills) | Solo/duo content. | companion API |
| **Vampire/Werewolf stage, riding skills, CP curve preset** | Minor but cheap. | misc API |

**Takeaway:** the highest-value, *uniquely-addon* data is **CP allocation + final
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
- **ZOS ToS / "no automation."** We only *read* state and *report* it — no input
  automation, no combat decisions. Safe, in line with CombatMetrics/Hodor.
- **Matching problem.** SavedVariables isn't stamped with the ESO Logs report code.
  We match on `@account` + character + zone + UTC timestamp window. Design for fuzzy
  matching from day one.

---

## 4. How it plugs into ESOTK (we already have the rails)

ESOTK is unusually well-positioned because the integration surfaces already exist:

| ESOTK surface | What the companion data adds |
|---|---|
| **Player cards** (the headline ask) | CP allocation, final stats (crit/pen/recovery), mundus, food, attribute split — shown inline. |
| **Loadout Manager** | Already imports Lua SavedVariables. Add an `ESOTKCompanion` format alongside Wizard's Wardrobe. |
| **Build Hub** | "Get Addons" deep-link to **Kalpa** addon manager already exists (now an *optional* convenience tier — see §9). Primary install is the standard Minion/manual route every ESO addon uses. |
| **Roster Hub** | `recommended_addons` column already exists; the companion becomes a recommended/required raid add-on, and roster build-checks validate against captured CP/stats. |
| **Fight Replay** | Lock-on stats panel can show the *real* build behind an actor. |
| **Scribing detection** | Cross-check detected scripts against authoritatively-reported slotted scripts. |

> **Distribution note (revised):** the original draft leaned on the **Kalpa** addon
> manager to auto-upload SavedVariables. That's still a valid *optional* convenience,
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
> browser folder-sync" as a headline UVP. That's wrong for *this* audience: **every log
> ESOTK analyses already arrived via the ESO Logs uploader**, so our users have already
> installed and trusted a native desktop app. "No install" wins us nothing — it's
> table stakes they've already paid. Transport is a solved, boring problem; the value is
> in what we *do* with the data (§11). Pick the simplest transport and move on:

| Option | When to use | Effort |
|---|---|---|
| **Manual `.lua` upload** | Default. Already shipped (`luaParser.ts` for Wizard's Wardrobe) — extend to `ESOTKCompanion`. Works in every browser. | ~none |
| **File System Access API folder-sync** | Nice-to-have for Chromium users who don't want to re-pick the file each session. Store the handle in IndexedDB, re-read on a click. *Convenience, not a differentiator.* | low |
| **Copy/paste build code** | Single-player quick share, no file. Note ESO can't auto-copy (protected call) and caps a copy near ~1023 chars, so compress. | low |
| **Kalpa auto-upload** | Opt-in only, for users already on Kalpa. Never the on-ramp. | medium |

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
- **Hodor / LibGroupCombatStats** — already aggregates *group* DPS/HPS/Ult.

So the purpose-built ESOTK Companion only needs to capture the **residual gap** those
tools don't persist — chiefly **full CP allocation, exact final stats, attribute split,
and group-wide aggregation in one file**. Smaller add-on, easier ask, faster value.

---

## 11. The actual unique value props (non-redundant, genuinely useful)

The test for every idea below: **does it require joining the player's true build data
(which the log lacks) with the combat log (which the build sites lack)?** If yes, it's
something *no* existing tool — ESO Logs, ESO-Hub, CombatMetrics, Hodor — can produce.
That intersection is the entire moat. Pure build display (ESO-Hub) and pure combat
display (ESO Logs) are both already done; we own the **overlap**.

ESOTK already *estimates* some of these stats from the log — there are
`CalculatePenetration` and `CalculateCriticalDamage` workers in the codebase today. The
companion's job is to **turn those estimates into ground truth** and unlock coaching
that estimates can't support.

### 11.1 Stat-aware optimisation coaching (the killer feature)

The log shows you hit for X. It cannot tell you whether your *stats* were efficient.
With the companion's exact stats we can compute, per player, against hard ESO caps:

- **Penetration vs the 18,200 cap.** Trial/dungeon bosses sit at 18,200 resist; every
  point of pen **over** that is wasted and every point **under** is lost damage. We can
  say *exactly*: "You're at 21,400 pen — 3,200 wasted; drop Sharpened/a pen glyph and
  gain ~X% damage," or "16,900 — 1,300 short, you're losing mitigation-adjusted
  damage." This is *the* most common end-game optimisation question and **nothing can
  answer it without the player's real pen + the boss in the log.**
- **Crit damage vs the 125% hard cap** (225% total). Flag over-cap crit-damage stacking
  (wasted) and under-cap headroom.
- **Crit *chance* value** — crit rating ÷ 21,918 → %, weighed against current crit
  damage and group buffs to advise "more crit chance vs. more weapon/spell damage here."
- **Recovery / sustain vs. actual resource behaviour in the log** — pair real recovery
  stats with the log's resource events to flag over-sustain (wasted regen you could
  trade for damage) or genuine starvation.

These read like a coach sitting next to the parse. **This is the headline UVP**, far
more useful than "here's a build."

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
parse dropped." Open-loop build sites can't do this; it needs the build *and* the
historical logs ESOTK already stores.

### 11.5 Closed design→play→verify loop

Design a loadout in the Loadout Manager → play it → log it → ESOTK confirms you actually
ran what you planned (gear/CP/mundus/food/skills match) and shows the result. Every
other build tool is open-loop (design, then hope); we verify against reality.

**Positioning one-liner:** *ESO Logs shows what you did. ESO-Hub shows a build. ESOTK is
the only place that tells your whole raid whether the build was actually any good —
"you're 3,200 over the pen cap, that's wasted damage" — straight off the parse.*

> **Deliberately dropped from the UVP list:** re-capturing gear and slotted skills
> (already in the log) and "no desktop install" (audience already runs the ESO Logs
> uploader). Both are redundant. Lead with the stat-aware coaching in §11.1.

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
</content>
</invoke>
