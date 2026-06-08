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
  group-broadcast model so one logger covers the raid, and on Kalpa for frictionless
  install + upload.

---

## 8. Suggested first milestone

A vertical slice that proves the loop end-to-end:

1. Add-on captures **CP allocation + final stats + mundus + food** for the **local
   player only**, writes `ESOTKCompanion.lua`.
2. ESOTK importer parses it and **renders CP + stats on that player's card** when the
   uploaded log matches.
3. Ship the add-on as a **Kalpa pack** with a Build-Hub "Get Companion" button.

That delivers the user's headline request (champion points on player cards) with the
smallest surface area, and every later idea (group capture, auto-upload, build flags)
builds on the same schema and matcher.

---

## 9. Getting data in **without** trusted desktop software (the real problem)

ESO Lua **cannot make outbound HTTP requests** — by design. So *something* has to carry
the SavedVariables data from disk to ESOTK. The market has only ever used three
mechanisms, and the whole adoption question is which one we lead with.

### How the market actually does it

| Tool | Transport | Friction |
|---|---|---|
| **ESO Logs** (combat logs) | **Electron desktop uploader** ("Companion") that tails `Encounter.log` and POSTs it | Must download + trust a native app. *This is the friction we're avoiding.* |
| **ESO-Database** | Desktop **client** *or* **manual file upload** on their site | Client = trust friction; manual = works but tedious |
| **CombatMetrics → ESO-Hub** | In-game **copy/paste build code** into the Build Editor | Zero install; proven and popular |
| **UESP uespLog**, **TTC**, etc. | Manual SavedVariables upload / separate client | Mixed |
| **Wizard's Wardrobe → ESOTK** | Manual `.lua` upload (already shipped here) | Zero install |

**Verdict:** every "frictionless and trusted" success story is **either copy/paste a
code, or upload the file through the browser**. The desktop-uploader path is exactly
what users resist. So we don't ship a desktop app — we make the **browser** the
ingestion engine.

### The tiered, no-install transport ladder

> Lead with the lowest-friction option each browser supports; degrade gracefully.

**Tier 1 — File System Access API folder-sync (hero path, Chromium).**
ESOTK calls `showDirectoryPicker()` once; the user points it at
`Documents/Elder Scrolls Online/live/`. We store the directory handle in **IndexedDB**,
so on every later visit a **single click** (`requestPermission`) re-reads
`SavedVariables/ESOTKCompanion.lua` — and, if granted, `Logs/Encounter.log` too. No
download, nothing to trust beyond the browser's own permission prompt. This is the
**unique value proposition**: *ESO Logs needs an Electron app to read your log folder;
ESOTK does it from the tab you already have open.*
- Works in **Chrome / Edge / Opera / Brave 86+** (the majority of desktop, and ESO
  add-on users are PC/desktop by definition).
- **Not** in Firefox or Safari — Mozilla and Apple have declined the local-disk
  pickers permanently. Those users fall to Tier 2/3.

**Tier 2 — Copy/paste build code (universal, proven).**
The add-on renders a compressed, encoded build string in an in-game **edit box**; the
user selects-all + Ctrl+C and pastes it into ESOTK. This is precisely the
CombatMetrics → ESO-Hub flow, so ESO players already understand it.
- **Constraint:** ESO's direct clipboard write is a *protected/illegal call* — we
  cannot auto-copy; the user must Ctrl+C from the editbox. And a single copy is capped
  near **~1023 characters**, so the payload must be compressed (one player's
  CP+stats+attributes fits comfortably; a 12-person raid needs chunking or Tier 1/3).

**Tier 3 — Manual `.lua` upload (works everywhere, already built).**
Drag-drop the SavedVariables file into ESOTK. Firefox/Safari fallback and the
universal safety net. ESOTK's existing `luaParser.ts` already does this for Wizard's
Wardrobe; we extend it to the `ESOTKCompanion` format.

**Tier 4 — Kalpa auto-upload (optional power-user convenience, not required).**
For users who already run Kalpa, it can POST the SV file automatically. Strictly
opt-in; never the on-ramp.

---

## 10. Piggyback before you ask for a new install

The cheapest trust is **no new addon at all**. A large share of the target audience
already runs **CombatMetrics**, **Hodor Reflexes**, and **Wizard's Wardrobe** — all of
which write SavedVariables that ESOTK can read via the same Tier 1/3 transport.

- **CombatMetrics** already records per-fight data and can export a build (gear/skills/
  CP) — ESOTK can ingest its SV directly.
- **Wizard's Wardrobe** — already parsed here today.
- **Hodor / LibGroupCombatStats** — already aggregates *group* DPS/HPS/Ult.

**Strategy:** ESOTK should **read what users already have first**, and the
purpose-built ESOTK Companion add-on only needs to fill the residual gaps those tools
*don't* persist — chiefly **full CP allocation, final derived stats, and group-wide
build aggregation in one file**. This reframes the companion from "install our thing"
to "we already work with your existing addons; install ours only for the extra 20%."
That is a materially easier adoption pitch.

---

## 11. Unique value proposition — what only ESOTK can deliver

The build-sharing space is crowded (ESO-Hub Build Editor, Alcast, Arzyel, Hack the
Minotaur). But **every one of them shares a *static, hand-made* build**. None of them
tie a build to **what actually happened in a logged fight**. That gap is ours:

1. **Build ↔ log correlation on the player card.** ESO-Hub shows a build; ESOTK shows
   *the build the player was actually running when they pulled 92k on this boss*,
   stitched onto the ESO Logs report. Nobody else does this.
2. **Whole-group truth from one source.** Via LibGroupBroadcast, one logger's single
   file yields all 12 members' real builds, auto-attached to the report — a raid-lead
   superpower, not a personal toy.
3. **No desktop uploader.** The only browser-native ingestion in the ESO space: grant a
   folder once, done. Direct contrast with ESO Logs' required Electron app.
4. **Diagnostics the log can't compute.** "Top DPS but no food", "0 penetration into a
   resistant boss", "unspent CP", "wrong mundus for the role" — derived from data ESO
   Logs structurally never sees, surfaced inline. Feeds the existing
   `detectBuildIssues`.
5. **Closed loop.** Design a loadout in ESOTK → play it → log it → ESOTK confirms you
   ran what you planned and shows the result. Build sites are open-loop; we close it.

**Positioning one-liner:** *Other sites show you a build. ESOTK shows you the build that
won the parse — for your whole raid — with nothing to install.*

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
</content>
</invoke>
