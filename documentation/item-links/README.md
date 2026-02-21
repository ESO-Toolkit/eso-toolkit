# ESO Item Link Format Reference

This note summarizes the open-source implementation we rely on for constructing Elder Scrolls Online item links. It is based on the `LibItemLink` addon by Scootworks (see `tmp/LibItemLink/LibItemLink/*`).

## Source Overview
- **Addon**: LibItemLink (APIVersion 100031/100032, Version 3)
- **Key files**:
  - `LibItemLink.lua` – helper APIs for validating link parts and emitting final strings.
  - `LibItemLinkData.lua` – lookup tables (`LIB_ITEM_SUB_TYPES`) that map encrypted subtype values back to effective level + quality.
- We vendor the addon inside `tmp/LibItemLink`. No extra build tooling is required; it is pure Lua.

## Item Link Anatomy
LibItemLink ultimately calls:
```
|H<linkStyle>:item:<itemId>:<itemSubType>:<itemLevel>:<enchantId>:<enchantSubType>:<itemLevel>:<itemStyle>:<isCrafted>:0:0:0:0:0:0:0:0:0:<unknown1>:<unknown2>:0:0:10000:0|h|h
```
Where the fields we control are produced by `lib:BuildItemLink`:
1. `linkStyle` – verified via `GetValidLinkStyle` (defaults to `LINK_STYLE_MIN_VALUE`).
2. `itemId` – numeric identifier of the gear piece.
3. `itemSubType` – encrypted level/quality code returned by `CreateSubTypes`.
4. `itemLevel` – 0–50, clamped by `GetValidLevel`.
5. `enchantId` – optional enchantment (0 when absent).
6. `enchantSubType` – encrypted quality for the enchantment (also from `CreateSubTypes`).
7. `itemLevel` again – ESO expects the level twice in the canonical link.
8. `itemStyle` – motif/style ID validated by `GetValidItemStyle`.
9. `isCrafted` – boolean converted to `0`/`1`.
10. Remaining segments are static zeros in LibItemLink’s implementation, except for two slots reserved for future data (`0` today) and the trailing `10000:0` pair, which ESO requires for scaling info.

## Helper Responsibilities
`LibItemLink.lua` guards every field before it goes into the format string:
- **Quality**: `GetValidQuality` ensures the value is within `ITEM_DISPLAY_QUALITY_MIN/MAX`. Out-of-range input downgrades to `ITEM_DISPLAY_QUALITY_NORMAL`.
- **Item level & champion points**: `GetValidLevel` (0–50) and `GetValidChampionPoints` (rounded to CP steps, clamped to the current gear cap `GetChampionPointsPlayerProgressionCap`).
- **Subtypes**: `CreateSubTypes(itemLevel, championPoints, itemQuality, enchantQuality)` produces `itemSubType` & `enchantSubType`. Champion gear uses separate ranges than low-level gear; the logic branches accordingly and pulls multiplier constants from the tables.
- **Item style**: `GetValidItemStyle` checks the style ID against the set returned by `GetNumValidItemStyles`. If invalid, LibItemLink falls back to the first valid style.
- **Enchant IDs**: `GetValidEnchantId` makes sure non-numeric inputs become 0.
- **Crafting flag**: `SetBooleanToValue` converts a boolean to `1` or `0` for the serialized link.

## Data Table (`LibItemLinkData.lua`)
`LIB_ITEM_SUB_TYPES` maps the obfuscated subtype integers back to the level/quality combination they represent. Examples:
```lua
[30] = { level = LIB_ITEM_LINK_LEVEL_LOW, quality = ITEM_QUALITY_NORMAL }
[125] = { level = LIB_ITEM_LINK_LEVEL_CP_10, quality = ITEM_QUALITY_NORMAL }
```
`lib:GetItemSubTypeInfo(subType)` exposes that lookup so consumers can reverse an item link into meaningful metadata.

## Using This in ESO Log Aggregator
1. Vendor updates: drop newer versions of `LibItemLink` into `tmp/LibItemLink` whenever ZOS adds link fields. Our documentation should be updated if the format string or helper logic changes.
2. Link generation: when the FE/BE needs to fabricate an item link (e.g., for sample loadouts), call the equivalent of `BuildItemLink` with validated arguments. The Lua code shows the precise order/value constraints we must match when replicating the logic in TypeScript.
3. Link parsing: to recover level/quality from an arbitrary link, parse the colon-separated fields, grab the `itemSubType`, and use `LIB_ITEM_SUB_TYPES` (exported via JSON or a TS port) to map it back.

## References
- `tmp/LibItemLink/LibItemLink/LibItemLink.lua`
- `tmp/LibItemLink/LibItemLink/LibItemLinkData.lua`
- ESOUI global constants: `ITEM_DISPLAY_QUALITY_*`, `LINK_STYLE_*`, `GetValidItemStyleId` etc. (see `APIVersion` 100031+).

Keep this README updated whenever we pull a newer LibItemLink release so engineers have a single place to understand the link wire format without spelunking the Lua source.
