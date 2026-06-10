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
   served pre-U50 names for the renamed werewolf IDs as of 2026-06-09 (their mining lags the
   patch). Re-run once `gameData.ability(id: 58405)` returns "Gnash". Re-run
   `node scripts/check-skill-line-icons.cjs` afterwards.
2. **Class Mastery passives (35 new, 5 per class)**: new passive-only skill line per class for
   non-subclassed characters (2 of 5 active via Class Mastery Points). Ability IDs not yet
   published anywhere. Once mined (UESP esolog / LibSkillsFactory v26+), consider:
   skill-line data entries, build-editor representation (interacts with subclassing — running
   any subclass line disables Class Mastery), and buff tracking for the new group buff sources
   (Lead From the Front: Major Berserk+Protection; Nature's Bounty: Major Heroism;
   Ink-Scribe's Verve: Major Force; Tundra's Maw: Major Brittle via Chilled).
3. **The Prowler's Talisman set ID**: not yet in ESO Logs `gameData.item_sets`
   (scanned 2026-06-09). Add to `KnownSetIDs` when it appears (post-July 8).
4. **Season One wave (July 8, 2026)**: Thieves Guild questline, Dynamic Encounters,
   Prowler's Talisman upgrade tiers — expect another data pass, no API bump.
5. **Tooltip dump addon**: already declares `## APIVersion: 101050` (correct for U50 — single
   bump, confirmed via ESOUI dev thread). Run the in-game dump on the U50 client to replace
   patch-note-derived descriptions with exact tooltip strings. The U50-changed entries are
   pinned in `data/tooltip-provenance-pending.json` (81 entries, exact-text-pinned, generated
   via `check-tooltip-provenance.mjs --emit-pending`) so the provenance gate stays at 100% with
   the exceptions reported separately — **delete that file** after the U50 dump refresh; any
   drift from the pinned text re-trips the gate until then.
6. **Werewolf tank taunt**: Deafening Roar's slot taunt moved from Heavy Attacks to
   "Gnash cast while Bracing". The innate taunt debuff (38254) is unchanged, but verify
   role-detection taunt attribution against a live U50 werewolf-tank log.
7. **Ground-effect tick re-evaluation**: ~20 ground effects (Healing Springs, Energy Orb,
   Caltrops, Thurvokun, Winterborn, …) now re-target per tick instead of on area enter —
   heal/damage distribution in U50 logs will differ from U49 for these; no code change needed,
   but relevant when comparing cross-patch parses.
8. **`scripts/refresh-gear-sets.mjs` / `refresh-class-skills.mjs`** scrape ESO-Hub, which is
   off-limits as a data source. Do not run them; the tooltip-dump addon pipeline replaces them.
