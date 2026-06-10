# ESO Update 50 Game-Data Update (June 2026)

ESO Update 50 went live **June 8, 2026** (PC v12.0.5, addon APIVersion **101050**) as part of
Season Zero "Dawn and Dusk". It is a systems patch: **no new zone, trial, dungeon, or arena**
(verified against the live ESO Logs API — zone list unchanged; a new rankings partition
`29 "Update 50"` was added by ESO Logs and is picked up dynamically by the leaderboard).

Primary source: [official live patch notes](https://forums.elderscrollsonline.com/en/discussion/693682/update-50-live-patch-notes-all-platforms).

## What this update changed in the repo

### Werewolf skill-line rework (the U50 headline)

All renames keep their ability IDs (verified via LuiExtended U50 data, which resolves the new
names from the same IDs at runtime; precedent: U49 renames also preserved IDs):

| Pre-U50 name     | U50 name                | ID    |
| ---------------- | ----------------------- | ----- |
| Piercing Howl    | Gnash                   | 58405 |
| Howl of Despair  | Rip and Tear            | 58742 |
| Howl of Agony    | Bloody Gnash            | 58798 |
| Infectious Claws | Rending Claws           | 58850 |
| Claws of Anguish | Claw Fury               | 58864 |
| Claws of Life    | Bloodclaws              | 58879 |
| Devour           | Insatiable Hunger       | 32634 |
| Pursuit          | Master of the Chase     | 32636 |
| Bloodmoon        | Shadow of the Bloodmoon | 32639 |
| Savage Strength  | Feral Cruelty           | 32638 |
| Call of the Pack | Call of the Hunt        | 32641 |

New U50 effect IDs (from LuiExtended data tables, added to `AbilityId`):
Blood Hunger 267744, Rampage 267416, Enduring Rampage 267425, Slaughter 268123.
Other observed internals (not added; reference only): Gnash execute hit 267745, Bloody Gnash
execute hit 267747, Rip and Tear heal 267785, Bloodclaws heal 267961, Insatiable Hunger active
state 268571, Werewolf Transformation internal passive 267414.

Mechanics now reflected in `src/data/skill-lines/world/werewolf.ts`: transformation costs
100 Ultimate + drains 100 Ultimate/10s in combat (timer removed, Ultimate generation enabled
in form), Fury resource (1000 cap) → Rampage replacement ultimate, Blood Hunger stacking buff
(Roar applies, Gnash/Claw Fury consume), Terrified removed, Pounce/Carnage swap at 7m,
kit damage types moved from Disease to Physical/Bleed.

Where the official notes give coefficients/deltas instead of final tooltip strings, the
descriptions state the mechanics without fabricated white numbers. The in-game tooltip dump
addon (`tools/eso-tooltip-dump` on `feat/tooltip-data-pipeline`) will supply exact strings.

### Other data updates

- **Scribing**: signature script "Class Mastery" renamed to **"Class Flourish"** (ZOS rename to
  avoid collision with the new Class Mastery system). JSON key `class-mastery` kept stable.
- **Gear sets** (~40 sets, every weight-file copy):
  - Multiplicative→additive "damage to monsters" fix values: Ansuul's Torment (7%→21%/30s on
    interrupt), Bahsei's Mania (15%), Tide-Born Wildstalker (15%), Empower text 70%→150%
    everywhere, Shadow Cloak's Born From Shadow 10%→15%.
  - Class set reworks: Aerie's Cry, Aetheric Lancer, Beacon of Oblivion, Corpseburster,
    Monolith of Storms, Pyrebrand (Wildfire Embers interaction), Soulcleaver,
    Spattering Disjunction, Wrathsun.
  - Werewolf sets: Savage Werewolf (2pc Crit Chance, 4pc WSD, 5pc +6% damage in form),
    Hide of the Werewolf (18 Ultimate in form).
  - PvP stat-line rehybridization (sets present in repo data) + Enervating Aura now applies
    Minor Enervation; Rallying Cry/Impregnable Critical Resistance reductions.
  - Mythics: Shattered Paths Signet Feral Guardian divisor; **The Prowler's Talisman** added
    (new U50 mythic, earned via the Season One Thieves Guild storyline from July 8, 2026 —
    baseline stats from official notes).
- **Class abilities**: DK Molten Whip/Flame Lash damage-done bonuses removed (recontextualized
  into Class Mastery), Heart of Flame heals from Max Health, Arcanist Languid Eye stack cap 12,
  NB Pressure Points 2% per Nightblade ability, Warden Nature's Gift overheal rework and
  Northern Storm 4%/stack (1% in Battle Spirit).

## Follow-ups (blocked on external data)

1. **Re-fetch `data/abilities.json`** (`scripts/fetchAbilitiesToJson.ts`): ESO Logs still
   served pre-U50 names for the renamed werewolf IDs as of 2026-06-10 (re-checked: 58405 =
   "Piercing Howl"; their mining lags the patch). Re-run once `gameData.ability(id: 58405)`
   returns "Gnash". Re-run `node scripts/check-skill-line-icons.cjs` afterwards.
2. **Class Mastery passives (35 new, 5 per class)**: new passive-only skill line per class for
   non-subclassed characters (2 of 5 active via Class Mastery Points). **IDs SELF-SOURCED
   2026-06-10** from the U50 in-game tooltip dump (skill-tree walk enumerates them; exact names
   + descriptions in `data/tooltip-dump.json`; ESO Logs `gameData.ability` still returns null
   for them). Grouped by class:
   - Dragonknight: 238232 Inexorable Descent, 240268 Booming Voice, 259224 Wildfire Embers,
     263220 Resolute Defense, 263247 Lead from the Front
   - Arcanist: 263316 Abyssal Emergence, 263398 Fate Realigned, 263410 Unbound Potential,
     263412 Erudite's Rigor, 263416 Ink-Scribe's Verve
   - Necromancer: 263448 Nothing Wasted, 263465 Malevolent Promise, 263509 Cycle Unending,
     263549 Pound of Flesh, 263554 Veil's Forfeit
   - Warden: 263519 Tundra's Maw, 263520 Wild Adaptation, 263521 Glacial Obstinance,
     263522 Green-Keeper's Hide, 263523 Bountiful Harvest (patch notes called it
     "Nature's Bounty")
   - Templar: 263585 Bastion of Light, 263586 Devout Guardian, 263587 Bright Harbinger,
     263588 Judgment's Brand, 263589 Steadfast Candescence
   - Nightblade: 263603 Nocturnal Inspiration, 263604 An Eye for Exploitation,
     263605 Above and Beyond, 263606 Cutthroat's Focus, 263607 Share the Spoils
   - Sorcerer: 263870 Conservation of Energy, 263871 Font of Power, 263872 Static
     Reverberation, 263873 Calculated Defense, 263874 Sphere of Influence

   **Skill-line data entries SHIPPED 2026-06-10**: `src/data/skill-lines/class/classMastery.ts`
   (7 per-class `SkillLineData` entries — the game models it as ONE shared line, in-game
   lineId 351, but per-class entries match the registry's class keying and feed class
   detection) + 35 `ClassSkillId` enum entries + 9 CDN-verified icons added to the icon
   guard's exact-name allowlist. Descriptions verbatim from the dump (provenance gate 100%).

   Remaining work is a FEATURE decision, no longer data-blocked: build-editor
   representation (interacts with subclassing — running any subclass line
   disables Class Mastery; the line is NOT subclassable, keep it out of
   `esoStaticData.ts`'s picker list), and buff tracking for the group buff sources (Lead from the
   Front: Major Berserk+Protection; Bountiful Harvest: Major Heroism; Ink-Scribe's Verve:
   Major Force; Tundra's Maw: Major Brittle via Chilled — granted-buff effect IDs are the
   existing tracked Major/Minor IDs; verify source attribution against a live U50 log).
3. **The Prowler's Talisman set ID**: not yet in ESO Logs `gameData.item_sets`
   (scanned 2026-06-09). Add to `KnownSetIDs` when it appears (post-July 8).
4. **Season One wave (July 8, 2026)**: Thieves Guild questline, Dynamic Encounters,
   Prowler's Talisman upgrade tiers — expect another data pass, no API bump.
5. **Tooltip dump addon**: already declares `## APIVersion: 101050` (correct for U50 — single
   bump, confirmed via ESOUI dev thread). **DONE 2026-06-10**: U50 in-game dump run (API
   101050, 4350 abilities / 702 sets), parsed and applied via the refresh scripts — exact
   tooltip strings replaced the patch-note-derived text (41 skills, 141 sets), and
   `data/tooltip-provenance-pending.json` was deleted; the provenance gate passes pure at
   100.00% exact with no pending allowlist.
6. **Werewolf tank taunt**: Deafening Roar's slot taunt moved from Heavy Attacks to
   "Gnash cast while Bracing". The innate taunt debuff (38254) is unchanged, but verify
   role-detection taunt attribution against a live U50 werewolf-tank log.
7. **Ground-effect tick re-evaluation**: ~20 ground effects (Healing Springs, Energy Orb,
   Caltrops, Thurvokun, Winterborn, …) now re-target per tick instead of on area enter —
   heal/damage distribution in U50 logs will differ from U49 for these; no code change needed,
   but relevant when comparing cross-patch parses.
8. **`scripts/refresh-gear-sets.mjs` / `refresh-class-skills.mjs`** scrape ESO-Hub, which is
   off-limits as a data source. Do not run them; the tooltip-dump addon pipeline replaces them.
