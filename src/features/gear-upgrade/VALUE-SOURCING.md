# Gear Upgrade Optimizer — value sourcing protocol

The optimizer's **ranking math is exact**, but the per-upgrade stat
**magnitudes** in `engine/gear-upgrade-catalog.ts` are confidence-tagged
estimates. This is how to replace them with **client-exact** values.

The repo's `ESOTooltipDump` addon (`tools/eso-tooltip-dump/`) doesn't capture
per-item trait/quality/glyph/Mundus values directly — but its
`/dumptooltips state` command prints a live **stat snapshot**, so we measure
each value by isolating one variable and reading the delta.

## Snapshot fields (`/dumptooltips state`)

`/dumptooltips state` prints two lines:

```
Reference state: ... | MagMax=… StaMax=… SpellDmg=… WpnDmg=…
  ...WpnCrit=… SpellCrit=… PhysPen=… SpellPen=…
```

So you can read **Max Magicka/Stamina, Weapon/Spell Damage, Weapon/Spell Crit
(rating), and Physical/Spell Penetration** straight from chat — no full dump or
`/reloadui` needed. Crit is a **rating** (÷ 219 for crit-chance %).

**No crit-damage field** (it isn't a `GetPlayerStat` value) — Shadow Mundus and
any crit-damage value must be read from the in-game Character sheet ("Critical
Damage") instead.

> The second line (crit + pen) requires the `state`-command patch in this
> branch's `tools/eso-tooltip-dump/ESOTooltipDump.lua`. If your installed addon
> is older, copy that file into
> `Documents/Elder Scrolls Online/live/AddOns/ESOTooltipDump/` first.

## Ground rules (read before measuring)

- CP160 character; **change exactly one thing** between the two reads — keep
  food, CP, Mundus, buffs, and all other gear identical.
- The snapshot reads the **active bar**, so do weapon swaps on the active bar.
- For weapon quality/glyph tests, keep the **same trait** on both weapons so
  only the tested variable moves.
- Record both reads; the **delta** is the exact value. Hand the numbers back
  and they go straight into the catalog (confidence → `high`, with provenance).

## Measurements

| #   | Catalog constant                 | A → B (swap only this)                                                  | Read (Δ)                                                                           |
| --- | -------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | `QUALITY_STEP.weapon1hWsd`       | 1H weapon **Epic → Legendary** (active bar)                             | Δ `weaponPower` (or `spellPower` if it's a staff)                                  |
| 2   | `QUALITY_STEP.weapon2hWsd`       | 2H/staff **Epic → Legendary**                                           | Δ `weaponPower`/`spellPower`                                                       |
| 3   | `QUALITY_STEP.jewelryWsd`        | one jewelry **Epic → Legendary** (same glyph)                           | Δ `weaponPower`                                                                    |
| 4   | `QUALITY_STEP.bigArmorMaxStat`   | large body piece **Epic → Legendary** (same glyph)                      | Δ `magickaMax`/`staminaMax` (likely ~0 — confirms armor quality ≈ resistance only) |
| 5   | `QUALITY_STEP.smallArmorMaxStat` | small body piece **Epic → Legendary**                                   | Δ `magickaMax`/`staminaMax`                                                        |
| 6   | `JEWELRY_WSD_GLYPH`              | jewelry glyph **none → Weapon/Spell Damage (gold)**                     | Δ `weaponPower` (= Δ `spellPower`)                                                 |
| 7   | `BIG_ARMOR_MAXSTAT_GLYPH`        | large-piece glyph **off-resource → Magicka/Stamina (gold)**             | Δ `magickaMax`/`staminaMax`                                                        |
| 8   | `SMALL_ARMOR_MAXSTAT_GLYPH`      | small-piece glyph **off-resource → Magicka/Stamina (gold)**             | Δ `magickaMax`/`staminaMax`                                                        |
| 9   | `MUNDUS_VALUE.warrior`           | Mundus **off → The Warrior**                                            | Δ `weaponPower`                                                                    |
| 10  | `MUNDUS_VALUE.apprentice`        | Mundus **off → The Apprentice**                                         | Δ `spellPower`                                                                     |
| 11  | `MUNDUS_VALUE.thief`             | Mundus **off → The Thief**                                              | Δ `weaponCrit` (rating)                                                            |
| 12  | `MUNDUS_VALUE.lover`             | Mundus **off → The Lover**                                              | Δ `physicalPen`/`spellPen`                                                         |
| 13  | `MUNDUS_VALUE.mage`              | Mundus **off → The Mage**                                               | Δ `magickaMax`/`staminaMax`                                                        |
| 14  | `DIVINES_AMP_PER_PIECE`          | with **The Warrior** active, one body piece **no-trait → gold Divines** | Δ `weaponPower` ÷ (#9 value) = per-piece %                                         |

### Needs the Character sheet, not the snapshot

| Catalog constant        | How                                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MUNDUS_VALUE.shadow`   | Character sheet **Critical Damage %**: Mundus off → The Shadow                                                                                                   |
| `BLOODTHIRSTY_WSD_PEAK` | In combat on a trial dummy **under 90% health**, read Weapon/Spell Damage with vs. without Bloodthirsty (it's conditional, so the static snapshot won't show it) |

### Genuinely build-dependent (stay user inputs, not constants)

`frontBarDamageShare` and the Bloodthirsty sub-90% **uptime** vary by
rotation/fight — they're exposed as inputs by design, not sourced here.

## After collecting

Drop the before/after numbers into the PR (or `.scratch/`). Each delta replaces
its catalog constant, the row's `confidence` becomes `high`, and a provenance
note records "measured via ESOTooltipDump `/dumptooltips state`, patch <X>".
