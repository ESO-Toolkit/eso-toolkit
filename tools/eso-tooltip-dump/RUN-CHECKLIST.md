# ESOTooltipDump — Run Checklist

The addon is already installed at:
`Documents\Elder Scrolls Online\live\AddOns\ESOTooltipDump\`

Goal: produce `Documents\Elder Scrolls Online\live\SavedVariables\ESOTooltipDump.lua`, then hand that
file back for offline parsing.

---

## 0. Enable the addon
1. Launch ESO. At character select or in-game, open **Add-Ons** menu.
2. Enable **ESO Tooltip Dump** (and **LibSets** if listed — improves set coverage). Allow out-of-date
   add-ons if prompted.
3. Enter the game with any character. You should see in chat:
   `[ESOTooltipDump] loaded. ...`

---

## 1. SMOKE TEST FIRST (≈30 seconds — do NOT skip)

This catches an empty/template dump before you spend a full cycle.

1. Run the API sanity check (paste into chat):
   ```
   /script d(GetSpecificSkillAbilityInfo ~= nil, GetAbilityDescription(28858, 4, "player"))
   ```
   - First value must be `true` (morph-tree function exists).
   - Second must be a description string **with real numbers** (e.g. "...1161 Flame Damage..."),
     NOT containing `<<1>>` tokens. ← if you see `<<` tokens, stop and report.

2. Run a sets-only dump and flush:
   ```
   /dumptooltips sets
   ```
   Wait for: `[ESOTooltipDump] sets: N total, M WITH bonus text ...`
   - **M must be close to N** (most sets have bonus text). If you see
     `WARNING: 0 sets have bonus text` or a large `TEMPLATE fallback` note → stop and report.
   ```
   /reloadui
   ```

3. Open `Documents\Elder Scrolls Online\live\SavedVariables\ESOTooltipDump.lua` in a text editor.
   Search a couple of `description = "..."` lines. Confirm they contain real numbers, not `<<1>>`.
   - Looks good → continue to step 2.
   - Has `<<` tokens or "Adds 0" → stop and report (we'll switch the set path).

---

## 2. Set the reference state (for stable, comparable numbers)

Ability numbers scale to the character running the dump. For consistent cross-patch output, set a
documented reference state and use the SAME one every time:

1. **Unequip all gear** (fully naked — drag all worn items off, or use an empty outfit/clear slots).
2. **Clear all slotted Champion Points** (open the CP menu, unslot every star — reallocation is free).
3. Leave Mundus/passives as-is (they can't be removed; that's fine — just be consistent).
4. Verify the state:
   ```
   /dumptooltips state
   ```
   Note the printed `MagMax / StaMax / SpellDmg / WpnDmg` — these get recorded in the dump header.
   Use the same character + state for every future dump.

---

## 3. FULL dump

```
/dumptooltips
```
Wait for both completion lines and the final:
`[ESOTooltipDump] FULL dump complete (X skills, Y sets). Run /reloadui ...`

Confirm in the same message / preceding lines:
- `abilities, Z WITH description text` — Z should be the large majority of abilities.
- No red `WARNING` lines.

Then flush to disk:
```
/reloadui
```

---

## 4. Hand off

Send back the file:
`Documents\Elder Scrolls Online\live\SavedVariables\ESOTooltipDump.lua`

That file is the input for Phase 2 (the offline parser). Done.

---

## Re-running per patch
Repeat steps 2–4 at the same reference state after each ESO update. Step 1 smoke test is worth
re-running if the game had a major API bump.
