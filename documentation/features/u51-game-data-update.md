# ESO Update 51 Game-Data Readiness (September 2026)

**Status (September 29, 2026): PC live, partial game-data verification.** Update 51 shipped on September 28. The [official live patch notes](https://www.elderscrollsonline.com/en-us/news/post/70379) supersede the PTS notes. The [live ESO UI documentation](https://raw.githubusercontent.com/esoui/esoui/live/ESOUIDocumentation.txt) declares API `101051`, matching the addon manifests. The installed game client and a new in-game tooltip dump were unavailable during this review.

## Confirmed U51 scope relevant to this app

The [live patch notes](https://www.elderscrollsonline.com/en-us/news/post/70379) and [official Update 51 preview](https://www.elderscrollsonline.com/en-us/news/post/70123) support the shipped hybridization, alchemy, Major/Minor buff, Warrior, Apprentice, and class-passive changes used by this PR. Update 51 also includes Scribing, combat, item-set, dungeon, and Nowhere Vault changes that require a live dump or report before updating exact IDs, descriptions, or parser behavior.

The live notes establish game effects, but do not confirm the ESO Logs event IDs used for the new buff mapping. Keep historical IDs for older reports until live event data can validate the new mapping. The [ESO Logs ranking page](https://www.esologs.com/zone/rankings/6) exposes an Update 51 partition, but no individual Update 51 report or event payload was available to verify parser or lookup behavior.

## Release-day checklist

Complete the remaining steps when an installed PC live client and a representative Update 51 ESO Logs report are available. Record evidence and leave unknown values marked unknown until verified against the live client or live reports.

1. **Capture the release baseline.** Save/link the official live patch notes. Record the live client version and the tooltip addon's captured API value (`ESOTooltipDumpSV.apiVersion`, populated from `GetAPIVersion()`); compare it with `tools/eso-tooltip-dump/ESOTooltipDump.txt` metadata (now allowing both 101050 and PTS-verified 101051). Confirm the live value before removing compatibility with 101050.
2. **Run the live tooltip dump.** Follow [`tools/eso-tooltip-dump/RUN-CHECKLIST.md`](../../tools/eso-tooltip-dump/RUN-CHECKLIST.md): verify the addon loads, run the API/description smoke test and sets-only dump, use the documented stable unequipped/no-CP reference state, then run the full `/dumptooltips` capture and `/reloadui`. Stop if descriptions contain `<<` template tokens, set text coverage is unexpectedly empty, or warning lines appear. Archive the raw SavedVariables dump and record its game/API version and character state.
3. **Parse and inspect before applying.** Run `node scripts/parse-tooltip-dump.mjs <path-to-ESOTooltipDump.lua> --out data/tooltip-dump.json`. Review the generated dump's version/header, counts, changed names/IDs and omissions against the live patch notes. Never fill unknown IDs from PTS guesses.
4. **Preview curated description refreshes.** Run `node scripts/refresh-tooltip-descriptions.mjs --list-unmatched` and `node scripts/refresh-gear-bonuses.mjs`. These are dry-run/report modes. Inspect proposed changes and unmatched entries; the tooltip refreshes source exact text from the in-game dump. Do not use the ESO-Hub scraping scripts `scripts/refresh-gear-sets.mjs` or `scripts/refresh-class-skills.mjs` as data sources (per U50 provenance policy).
5. **Apply only reviewed data.** After the diff is understood, apply with `node scripts/refresh-tooltip-descriptions.mjs --write` and `node scripts/refresh-gear-bonuses.mjs --write`. Update skill, scribing, gear, mythic corrections, or icons only where the live dump/notes verify a change. For item icons, follow the project UESP-data workflow; icon refresh is separate from tooltip provenance.
6. **Check app-specific risk areas.** Inspect changed ability names/IDs and buffs for hybridization (Sorcery/Prophecy consumers and potion detection), Scribing signatures, stealth/invisibility event interpretation, Arcanist Tome-bearer proc attribution, changed item-set triggers/stacking, and new solo-dungeon encounters/content if they appear in actual live reports. Keep mechanics claims separate from text-only data changes.
7. **Verify live logging compatibility.** Query the live ESO Logs API for representative U51 reports and compare available game version, zones, partitions, ability/set lookup results, and event fields with U50. Specifically check for null/unresolved ability or set lookups and changed source/target attribution. No PTS source reviewed here confirms a log schema/API change; only make parser changes when live report evidence demonstrates one.
8. **Validate and record completion.** Run `node scripts/check-tooltip-provenance.mjs`, `npm run typecheck`, and focused tests for any changed logic. Review `git diff` for unsupported PTS-only claims and accidental broad data churn. Record the live version, dump provenance, confirmed ID/API observations, unresolved follow-ups, and test results here or in the implementation PR.

## Release facts still to verify

- Installed PC client's reported API version (the published live UI documentation says `101051`).
- Fresh Update 51 tooltip dump, changed descriptions, set bonuses, and icon coverage. The available SavedVariables dump was captured September 1 with API `101050`; it is not Update 51 evidence.
- Live-only ability/effect/set IDs and ESO Logs lookup availability.
- Whether ESO Logs changes event/API fields; its Update 51 ranking partition is visible.
- Whether any combat-log format or attribution changes affect this parser.

The September 29 provenance check passed for the existing curated data: 4,611/4,611 checked rendered entries trace to the saved dump. This checks the existing data's origin, not its freshness for Update 51. Treat each remaining item as **unknown until observed**.
