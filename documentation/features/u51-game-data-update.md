# ESO Update 51 Game-Data Readiness (September 2026)

**Status (September 27, 2026): prelaunch.** ZOS's official PTS Week 5 summary identifies September 28 as the Update 51 launch date. Use the live patch notes and the installed live client as the release authority. The PTS v12.1.x notes describe test content, not guaranteed final live data. [PTS Week 5 summary](https://forums.elderscrollsonline.com/en/discussion/comment/8532865/) · [official PTS v12.1.0 notes](https://forums.elderscrollsonline.com/en-gb/discussion/697154/pts-patch-notes-v12-1-0)

## Confirmed U51 scope relevant to this app

Official PTS notes describe Update 51 as including hybridization/alchemy and Major/Minor buff changes, combat and item-set adjustments, Scribing changes, new solo dungeons, Nowhere Vault, and other player-experience features. Explicit examples include Brutality replacing Sorcery and granting both weapon/spell damage, Savagery replacing Prophecy and granting both weapon/spell critical chance, changes to stealth-breaking behavior, Tome-bearer's Inspiration triggering only from Arcanist skill damage, and Traveling Knife/Pull Focus target cap changes. The patch notes also adjust item-set behavior and descriptions. These are investigation targets, not proof that every PTS value or behavior shipped unchanged. [PTS v12.1.0 notes](https://forums.elderscrollsonline.com/en-gb/discussion/697154/pts-patch-notes-v12-1-0)

The last PTS notes say the final PTS week focused on fixes and that ZOS would review combat feedback and make final adjustments before launch. Consequently, do not promote PTS-only IDs, coefficients, descriptions, set lists, or API versions as live facts. The PTS UI source identifies addon API 101051, which the companion manifest now supports alongside 101050; the installed live client's API still needs confirmation. The public PTS notes do not establish ESO Logs API/schema changes, new ability/set IDs, report partitions, or combat-log event-format changes. [PTS v12.1.4 notes](https://forums.elderscrollsonline.com/en/discussion/698829/pts-patch-notes-v12-1-4) · [ESO UI PTS documentation](https://raw.githubusercontent.com/esoui/esoui/pts/ESOUIDocumentation.txt)

## Release-day checklist

Run these steps after the PC live patch is available. Record evidence and leave unknown values marked unknown until verified against the live client or live reports.

1. **Capture the release baseline.** Save/link the official live patch notes. Record the live client version and the tooltip addon's captured API value (`ESOTooltipDumpSV.apiVersion`, populated from `GetAPIVersion()`); compare it with `tools/eso-tooltip-dump/ESOTooltipDump.txt` metadata (now allowing both 101050 and PTS-verified 101051). Confirm the live value before removing compatibility with 101050.
2. **Run the live tooltip dump.** Follow [`tools/eso-tooltip-dump/RUN-CHECKLIST.md`](../../tools/eso-tooltip-dump/RUN-CHECKLIST.md): verify the addon loads, run the API/description smoke test and sets-only dump, use the documented stable unequipped/no-CP reference state, then run the full `/dumptooltips` capture and `/reloadui`. Stop if descriptions contain `<<` template tokens, set text coverage is unexpectedly empty, or warning lines appear. Archive the raw SavedVariables dump and record its game/API version and character state.
3. **Parse and inspect before applying.** Run `node scripts/parse-tooltip-dump.mjs <path-to-ESOTooltipDump.lua> --out data/tooltip-dump.json`. Review the generated dump's version/header, counts, changed names/IDs and omissions against the live patch notes. Never fill unknown IDs from PTS guesses.
4. **Preview curated description refreshes.** Run `node scripts/refresh-tooltip-descriptions.mjs --list-unmatched` and `node scripts/refresh-gear-bonuses.mjs`. These are dry-run/report modes. Inspect proposed changes and unmatched entries; the tooltip refreshes source exact text from the in-game dump. Do not use the ESO-Hub scraping scripts `scripts/refresh-gear-sets.mjs` or `scripts/refresh-class-skills.mjs` as data sources (per U50 provenance policy).
5. **Apply only reviewed data.** After the diff is understood, apply with `node scripts/refresh-tooltip-descriptions.mjs --write` and `node scripts/refresh-gear-bonuses.mjs --write`. Update skill, scribing, gear, mythic corrections, or icons only where the live dump/notes verify a change. For item icons, follow the project UESP-data workflow; icon refresh is separate from tooltip provenance.
6. **Check app-specific risk areas.** Inspect changed ability names/IDs and buffs for hybridization (Sorcery/Prophecy consumers and potion detection), Scribing signatures, stealth/invisibility event interpretation, Arcanist Tome-bearer proc attribution, changed item-set triggers/stacking, and new solo-dungeon encounters/content if they appear in actual live reports. Keep mechanics claims separate from text-only data changes.
7. **Verify live logging compatibility.** Query the live ESO Logs API for representative U51 reports and compare available game version, zones, partitions, ability/set lookup results, and event fields with U50. Specifically check for null/unresolved ability or set lookups and changed source/target attribution. No PTS source reviewed here confirms a log schema/API change; only make parser changes when live report evidence demonstrates one.
8. **Validate and record completion.** Run `node scripts/check-tooltip-provenance.mjs`, `npm run typecheck`, and focused tests for any changed logic. Review `git diff` for unsupported PTS-only claims and accidental broad data churn. Record the live version, dump provenance, confirmed ID/API observations, unresolved follow-ups, and test results here or in the implementation PR.

## Release facts still to verify

- Final live patch-note deltas from the last PTS build.
- Installed PC API version and resulting addon manifest value.
- Live-only ability/effect/set IDs and ESO Logs lookup availability.
- Whether ESO Logs adds an Update 51 ranking partition or changes event/API fields.
- Whether any combat-log format or attribution changes affect this parser.

Treat each as **unknown until observed**; absence from the cited PTS notes is not evidence that the live service cannot change.
