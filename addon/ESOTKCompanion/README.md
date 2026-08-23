# ESOTK Companion (in-game add-on)

Fills the gaps **ESO Logs can't see** and feeds them to [ESO Toolkit](https://esotk.com)
so they show on player cards — starting with **champion points**.

ESO Logs records what happened in combat, but the encounter log never carries the full
**champion point allocation**, your **final stats** (crit, penetration, recovery), your
**attribute split**, your **mundus/food**, or the exact **scribing scripts** on your
bars. This add-on reads them live from the official ESO API and writes them to
SavedVariables; ESOTK matches each snapshot to your uploaded log by character, server and
timestamp, then overlays the build on the report.

Current companion release: **0.1.0** · **ESO Update 50** · API **101049–101050**.

> Read-only (no input or combat automation), PC-only (console can't export SavedVariables).
> See the full strategy in the
> [companion add-on research document](https://github.com/ESO-Toolkit/eso-toolkit/blob/main/documentation/features/addons/ESOTK_COMPANION_ADDON_RESEARCH.md).

## Relationship to the official ESOtk add-on

This folder contains the optional **ESOTK Companion** integration for player-card build
evidence. It is separate from the [official ESOtk add-on repository](https://github.com/ESO-Toolkit/esotk-addon),
which provides roster/group validation and uses its own `ESOtk_SavedVars` data. Install this
folder as `ESOTKCompanion`; do not rename it to `ESOtk` or merge the two manifests.

The two add-ons intentionally use different slash commands: this companion uses
`/esotkcompanion`, while the official ESOtk add-on uses `/esotk`. This avoids one add-on
overwriting the other's command handler when both are enabled.

## What it captures

| Field                                                                                                                                                | Why it's a gap                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Champion points** — full per-star allocation, the 12 slotted stars, total                                                                          | The log has CP _rank_ only, never the allocation. **The headline feature.**                   |
| **Final stats** — max mag/stam/health, spell/weapon damage, crit chance, **penetration**, recovery, resistances | Computed client-side, never logged. Shown as a point-in-time character-sheet reading (read on leaving combat, buffs fading). Crit damage has no ESO stat constant, so ESOTK derives it from the log instead. |
| **Attributes** — Magicka/Health/Stamina split                                                                                                        | Not logged.                                                                                   |
| **Long-term effects** — raw buff IDs (mundus is permanent, food is long)                                                                             | ESOTK resolves mundus/food by ID (language-agnostic).                                         |
| **Both action bars** — front/back ability IDs                                                                                                        | Lets ESOTK derive subclass skill lines and verify the matched actor.                          |
| **Scribing scripts** — grimoire + active focus/signature/affix script IDs                                                                            | Captures Class Mastery and other scripts authoritatively instead of guessing from log events. |

## Install

1. Copy the `ESOTKCompanion` folder to your ESO add-ons directory:
   `Documents/Elder Scrolls Online/live/AddOns/ESOTKCompanion/`
2. Enable **ESOTK Companion** on the add-ons screen and `/reloadui`.

## Use

- It snapshots **automatically when you leave combat**. No action needed.
- `/esotkcompanion` — snapshot **now**
- `/esotkcompanion on` / `/esotkcompanion off` — enable/disable capture
- `/esotkcompanion clear` — wipe stored snapshots
- `/esotkcompanion verbose` — toggle chat confirmations

Then select `Documents/Elder Scrolls Online/live/SavedVariables/ESOTKCompanion.lua`
in ESO Toolkit. Your champion points, stats, buffs and scribed skills appear on the player
card for the matching log.

### Privacy

The SavedVariables file contains your ESO account display name, character names, server,
timestamps, and the captured build details listed below. ESO Toolkit reads a file only after you
select it, parses it locally in your browser, and keeps the parsed snapshots only for the current
browser session; the web app does not upload the file to an ESO Toolkit server. Use
`/esotkcompanion clear`
in game and then `/reloadui` if you want to remove the add-on's stored snapshots from disk. Review
the file before sharing it with another person or posting it publicly.

## SavedVariables shape (`ESOTKCompanionSV`)

Account-wide via `ZO_SavedVars`, a ring buffer of per-fight snapshots:

```lua
ESOTKCompanionSV = { Default = { ["@account"] = { ["$AccountWide"] = {
  schemaVersion = 1, season = "U50", enabled = true,
  snapshots = { [1] = {
    schemaVersion = 1, season = "U50",
    ts = 1749384000, char = "Charname", account = "@account", server = "NA",
    zoneId = 1196, classId = 6, className = "Arcanist",
    raceId = 4, raceName = "Khajiit", level = 50, cpRank = 3600,
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
    scribing = {
      { abilityId=217340, name="Shattering Knife", bar="front", slot=3,
        scripts = {
          [1] = { id=, slot=1, name=, icon= },
          [2] = { id=, slot=2, name="Class Mastery", icon= },
          [3] = { id=, slot=3, name=, icon= },
        },
      },
    },
  } },
} } } }
```

## API verification status

Verified against real add-on source / API references (not guessed):

| Call                                                                                                                                                                                                      | Status                             | Source                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------- |
| `GetNumPointsSpentOnChampionSkill(skillId)` — **single arg**                                                                                                                                              | ✅ verified                        | DynamicCP `src/API.lua`         |
| `GetChampionSkillName(skillId)` — single arg                                                                                                                                                              | ✅ verified                        | DynamicCP `src/API.lua`         |
| Slotted stars: `GetSlotBoundId(slot, HOTBAR_CATEGORY_CHAMPION)`, slots 1–12 (Craft 1-4 / Warfare 5-8 / Fitness 9-12)                                                                                      | ✅ verified                        | DynamicCP `OFFSETS`             |
| `GetAttributeSpentPoints(attributeType)` → points                                                                                                                                                         | ✅ verified                        | eso-api dump                    |
| Mundus = buff-based via `GetUnitBuffInfo` ability id (no direct getter)                                                                                                                                   | ✅ verified                        | ESOUI                           |
| Scribing: `GetCraftedAbilityActiveScriptIds(craftedAbilityId)`, `GetCraftedAbilityScriptDisplayName(scriptId)`, `GetCraftedAbilityDisplayName(craftedAbilityId)`                                          | ✅ verified                        | local add-on source             |
| **Discipline enumeration**: `GetNumChampionDisciplines()`, `GetChampionDisciplineId(index)`, `GetNumChampionDisciplineSkills(index)`, `GetChampionSkillId(index, index)`, `GetChampionDisciplineType(id)` | ✅ verified — **note index vs id** | esoui `championdatamanager.lua` |
| `STAT_*` constants (`STAT_POWER` for weapon damage, spell dmg, crit, pen, regen, resist, max)                                                                                                             | ✅ verified (names)                | esoui API constants             |

> **Gotcha confirmed from source:** `GetNumChampionDisciplineSkills` and
> `GetChampionSkillId` take the discipline **index**, while `GetChampionDisciplineType`
> takes the discipline **id**. Mixing them silently returns wrong/no data.

## Notes for maintainers

- **Per-season pass:** bump `## APIVersion` in the manifest and `ADDON.season` in the
  Lua each ESO season; re-verify any `STAT_*`/champion function names that changed.
- **Robustness:** every capture runs under `pcall` and every global constant is
  nil-guarded, so an API rename degrades one field instead of crashing — but check the
  chat for `[ESOTK] capture '…' failed` lines after a patch and fix the offending call.
- **Last thing to validate live:** run it once in-game to confirm the captured numbers
  match the in-game character sheet / CP screen for a known build (the function names are
  source-verified; this just confirms the values land correctly).
