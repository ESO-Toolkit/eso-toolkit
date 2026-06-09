# ESOTK Companion (in-game add-on)

Fills the gaps **ESO Logs can't see** and feeds them to [ESO Toolkit](https://esotk.com)
so they show on player cards — starting with **champion points**.

ESO Logs records what happened in combat, but the encounter log never carries the full
**champion point allocation**, your **final stats** (crit, penetration, recovery), your
**attribute split**, or your **mundus/food**. This add-on reads them live from the
official ESO API and writes them to SavedVariables; ESOTK matches each snapshot to your
uploaded log (by character + server + timestamp) and overlays the build on the report.

> Read-only, ToS-safe (no automation), PC-only (console can't export SavedVariables).
> See the full strategy in
> [`documentation/features/addons/ESOTK_COMPANION_ADDON_RESEARCH.md`](../../documentation/features/addons/ESOTK_COMPANION_ADDON_RESEARCH.md).

## What it captures

| Field | Why it's a gap |
|---|---|
| **Champion points** — full per-star allocation, the 12 slotted stars, total | The log has CP *rank* only, never the allocation. **The headline feature.** |
| **Final stats** — max mag/stam/health, spell/weapon damage, crit, **penetration**, recovery, resistances | Computed client-side, never logged. Powers ESOTK's "you're over the 18,200 pen cap" coaching. |
| **Attributes** — Magicka/Health/Stamina split | Not logged. |
| **Long-term effects** — raw buff IDs (mundus is permanent, food is long) | ESOTK resolves mundus/food by ID (language-agnostic). |
| **Both action bars** — front/back ability IDs | Lets ESOTK derive subclass skill lines and verify the matched actor. |

## Install

1. Copy the `ESOTKCompanion` folder to your ESO add-ons directory:
   `Documents/Elder Scrolls Online/live/AddOns/ESOTKCompanion/`
2. Enable **ESOTK Companion** on the add-ons screen and `/reloadui`.

## Use

- It snapshots **automatically when you leave combat**. No action needed.
- `/esotk` — snapshot **now**
- `/esotk on` / `/esotk off` — enable/disable capture
- `/esotk clear` — wipe stored snapshots
- `/esotk verbose` — toggle chat confirmations

Then upload `Documents/Elder Scrolls Online/live/SavedVariables/ESOTKCompanion.lua`
to ESOTK (or let it read the folder), and your champion points + build appear on the
player card for the matching log.

## SavedVariables shape (`ESOTKCompanionSV`)

Account-wide via `ZO_SavedVars`, a ring buffer of per-fight snapshots:

```lua
ESOTKCompanionSV = { Default = { ["@account"] = { ["$AccountWide"] = {
  schemaVersion = 1, season = "U50", enabled = true,
  snapshots = { [1] = {
    ts = 1749384000, char = "Charname", account = "@account", server = "NA",
    zoneId = 1196, classId = 6, raceId = 4, level = 50, cpRank = 3600,
    role = 1, reason = "combatEnd",
    cp = {
      total = 3600,
      disciplines = { [<disciplineId>] = { id=, type=, spent=, skills = { [<skillId>] = <points> } } },
      slotted = { [1] = <skillId>, … [12] = <skillId> },
    },
    stats  = { spellDamage=, physicalPen=, weaponCrit=, … },
    attrs  = { magicka=0, health=64, stamina=0 },
    effects = { { id=13984, name="Boon: The Lover", duration=0 }, … },
    bars   = { front = { [3]=, …, [8]= }, back = { … } },
  } },
} } } }
```

## API verification status

Verified against real add-on source / API references (not guessed):

| Call | Status | Source |
|---|---|---|
| `GetNumPointsSpentOnChampionSkill(skillId)` — **single arg** | ✅ verified | DynamicCP `src/API.lua` |
| `GetChampionSkillName(skillId)` — single arg | ✅ verified | DynamicCP `src/API.lua` |
| Slotted stars: `GetSlotBoundId(slot, HOTBAR_CATEGORY_CHAMPION)`, slots 1–12 (Craft 1-4 / Warfare 5-8 / Fitness 9-12) | ✅ verified | DynamicCP `OFFSETS` |
| `GetAttributeSpentPoints(attributeType)` → points | ✅ verified | eso-api dump |
| `GetItemLinkSetInfo(link, equipped)` → hasSet,…,numEquipped,maxEquipped,setId · `GetItemLink(BAG_WORN, slot)` | ✅ verified | ESOUI wiki / forums |
| Mundus = buff-based via `GetUnitBuffInfo` ability id (no direct getter) | ✅ verified | ESOUI |
| Potion: `GetSlotItemLink(quickslot)` | ✅ verified | ESOUI |
| `GetUnitPower(unitTag, powerType)` → current,max,effectiveMax | ✅ verified | UESP |
| **Discipline enumeration**: `GetNumChampionDisciplines` / `GetChampionDisciplineId` / `GetNumChampionDisciplineSkills` / `GetChampionSkillId` | ⏳ **pending in-game** — standard CP2.0 API but not cross-checked (DynamicCP hardcodes trees). Guarded: wrong name → empty allocation, not a crash | — |
| `STAT_*` constants (spell/weapon dmg, pen, crit) | ⏳ pending — nil-guarded | — |

## Notes for maintainers

- **Per-season pass:** bump `## APIVersion` in the manifest and `ADDON.season` in the
  Lua each ESO season; re-verify any `STAT_*`/champion function names that changed.
- **Robustness:** every capture runs under `pcall` and every global constant is
  nil-guarded, so an API rename degrades one field instead of crashing — but check the
  chat for `[ESOTK] capture '…' failed` lines after a patch and fix the offending call.
- **Confirm the ⏳ rows in-game first** (allocation enumeration + `STAT_*` names). If the
  enumeration names differ, the fallback is to iterate a bundled list of championSkillIds
  and call the verified `GetNumPointsSpentOnChampionSkill(skillId)` on each.
