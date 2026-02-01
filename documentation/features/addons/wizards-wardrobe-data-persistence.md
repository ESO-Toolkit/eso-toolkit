# Wizard’s Wardrobe Add-on – Data Persistence

## Sources
- Manifest declares the saved variables name: https://raw.githubusercontent.com/nicokimmel/wizardswardrobe/master/src/WizardsWardrobe.txt
- Saved variables initialization and defaults: https://raw.githubusercontent.com/nicokimmel/wizardswardrobe/master/src/WizardsWardrobeMenu.lua
- Setup storage schema: https://raw.githubusercontent.com/nicokimmel/wizardswardrobe/master/src/WizardsWardrobeSetup.lua
- Page creation and page metadata shape: https://raw.githubusercontent.com/nicokimmel/wizardswardrobe/master/src/WizardsWardrobeGui.lua
- Prebuff storage shape: https://raw.githubusercontent.com/nicokimmel/wizardswardrobe/master/src/modules/WizardsWardrobePrebuff.lua
- Gear/food storage fields and IDs: https://raw.githubusercontent.com/nicokimmel/wizardswardrobe/master/src/WizardsWardrobe.lua

## Persistence model (high-level)
Wizard’s Wardrobe persists all data through the ESO SavedVariables system under the name **WizardsWardrobeSV** (declared in the add-on manifest). At runtime, it creates two saved-variable handles:

1. **Character-scoped storage** (via `ZO_SavedVars:NewCharacterIdSettings`) stored in `WW.storage`.
2. **Account-wide settings** (via `ZO_SavedVars:NewAccountWide`) stored in `WW.settings`.

The add-on then **re-binds** `WW.setups`, `WW.pages`, and `WW.prebuffs` to either a **character** record or the **account-wide** record based on `selectedCharacterId`. If `selectedCharacterId` is set to `"$AccountWide"`, it uses the account-wide storage; otherwise it uses the character’s storage.

## Top-level SavedVariables layout
The SavedVariables name is **WizardsWardrobeSV**. Within the ESO SavedVariables table, the add-on expects a per-account root under `WizardsWardrobeSV.Default[GetDisplayName()]` with entries for:

- **Character records** keyed by the character ID string
- An **account-wide** record keyed by `"$AccountWide"`

Each character record and the account-wide record contains the following high-level buckets (see defaults below).

## Character-scoped storage (`WW.storage`)
Default structure returned by `WW.DefaultSavedVariables(characterId)`:

- `setups`: Empty table to hold setups by zone/page/index.
- `pages`: Empty table to hold page metadata by zone/page.
- `prebuffs`: Empty table to hold prebuff configurations.
- `autoEquipSetups`: Boolean flag for auto-equip feature.
- `selectedZoneTag`: Table keyed by characterId, defaulting to `"GEN"`.
- `selectedCharacterId`: The characterId (or `"$AccountWide"` to switch to account-wide storage).

The add-on uses `selectedCharacterId` to choose whether `WW.setups`, `WW.pages`, and `WW.prebuffs` should read/write to the character record or `"$AccountWide".accountWideStorage`.

## Account-wide settings (`WW.settings`)
Defaults passed to `ZO_SavedVars:NewAccountWide` include:

- `accountWideStorage`: Holds **setups/pages/prebuffs** for account-wide selection.
  - `setups`, `pages`, `prebuffs`, `autoEquipSetups`
- `window`: `wizard` UI window size/scale/lock state
- `panel`: panel lock/visibility/mini
- `auto`: toggles for auto gear/skills/cp/food
- `substitute`: substitute behavior for overland/dungeons
- `fixes`: toggle for `surfingWeapons`
- `failedSwapLog`: array
- `comparisonDepth`: number (1..3)
- `changelogs`: table
- `printMessages`: "off" | "chat" | "alert" | "announcement"
- `overwriteWarning`: boolean
- `inventoryMarker`: boolean
- `ignoreTabards`: boolean
- `unequipEmpty`: boolean
- `chargeWeapons`: boolean
- `repairArmor`: boolean
- `fillPoisons`: boolean
- `eatBuffFood`: boolean
- `initialized`: boolean
- `fixGearSwap`: boolean
- `canUseCrownRepairKits`: boolean
- `setupValidation`: `{ delay, ignorePoisons, ignoreCostumes }`
- `legacyZoneSelection`: boolean
- `autoSelectInstance`: boolean
- `autoSelectGeneral`: boolean
- `lockSavedGear`: boolean
- `verticalSetupDisplay`: boolean

## Pages and setups shape
### Pages
Pages are stored by zone tag and page index.

- `pages[zoneTag][pageId] = { name = string }`
- `pages[zoneTag][0][characterId] = lastSelectedPageId` (per-character page selection)

### Setups
Setups are stored by zone tag, page, and setup index:

- `setups[zoneTag][pageId][index] = Setup`

## Setup schema
The persisted setup payload matches the `Setup` object in `WizardsWardrobeSetup.lua`.

**Top-level fields**
- `name`: setup display name
- `disabled`: boolean (currently unused in UI but persisted)
- `condition`: table (boss/trash conditions)
- `code`: custom code string
- `skills`: table for hotbars
- `gear`: table for gear slots
- `cp`: table (Champion Point slottables)
- `food`: table

**Skills**
- `skills[0][3..8]`: ability IDs for main bar
- `skills[1][3..8]`: ability IDs for back bar
- Values may be `0` or `nil` for empty slots.

**Gear**
- `gear.mythic`: slot index of the mythic slot (or `nil`)
- For each gear slot: `gear[slot] = { id, link, creator? }`
  - `id` is a string from `Id64ToString(GetItemUniqueId(...))`
  - `link` is the `GetItemLink(...)` result
  - `creator` is included for tabards (from `GetItemCreatorName(...)`)

**Champion Points**
- `cp[1..12] = championSkillId` for each slottable star

**Food**
- `food = { link, id }`
  - `link` from `GetItemLink(...)`
  - `id` from `GetItemLinkItemId(...)`

## Prebuffs schema
Prebuffs are stored as a list of 5 entries. Each entry contains:

- `prebuffs[i][0] = { toggle = boolean, delay = number }`
- `prebuffs[i][3..8] = abilityId` (slot indices stored as `slot + 2` in code)

## Migration logic
During initialization, the add-on migrates older settings:
- `validationDelay` → `setupValidation.delay`
- `printMessages` boolean → string enum (`"chat"` / `"off"`)
- `comparisonDepth` value `4` → `1`

## Pseudo-layout example
```lua
WizardsWardrobeSV = {
  Default = {
    ["@AccountName"] = {
      ["$AccountWide"] = {
        accountWideStorage = {
          setups = { ["GEN"] = { [1] = { [1] = <Setup> } } },
          pages = { ["GEN"] = { [1] = { name = "Page 1" }, [0] = { ["$AccountWide"] = 1 } } },
          prebuffs = { [1] = { [0] = { toggle = false, delay = 500 }, [3] = 12345 } },
          autoEquipSetups = true,
        },
      },
      ["123456789"] = {
        setups = { ... },
        pages = { ... },
        prebuffs = { ... },
        autoEquipSetups = true,
        selectedZoneTag = { ["123456789"] = "GEN" },
        selectedCharacterId = "123456789",
      },
    },
  },
}
```

> Note: The exact outer layout and file location are controlled by the ESO SavedVariables system; the add-on code only assumes the `WizardsWardrobeSV` table name and the internal schemas above.
