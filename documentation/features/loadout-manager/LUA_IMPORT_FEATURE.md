# Lua Import Feature - Loadout Manager

## Overview
The Loadout Manager now supports importing loadouts directly from ESO SavedVariables Lua files, specifically the Wizard's Wardrobe addon format.

## Implementation

### New Files Created

#### 1. **luaParser.ts** - Core Lua Parsing Utility
- Uses `luaparse` library to safely parse Lua syntax to JavaScript AST
- Converts Lua tables to JavaScript objects/arrays
- Handles ESO-specific formats (item links, special characters)
- Extracts Wizard's Wardrobe data from ESO saved variables structure

**Key Functions:**
- `parseLuaSavedVariables(luaContent: string)` - Parses Lua file content
- `extractWizardWardrobeData(parsedLua)` - Extracts Wizard's Wardrobe addon data
- `isWizardWardrobeFormat(data)` - Validates data structure

#### 2. **wizardWardrobeConverter.ts** - Format Converter
- Converts between Wizard's Wardrobe format and internal LoadoutState
- Handles data normalization and validation
- Supports both import and export directions

**Key Functions:**
- `convertWizardWardrobeToLoadoutState(wizardData)` - Import converter
- `convertLoadoutStateToWizardWardrobe(state)` - Export converter

#### 3. **__tests__/luaParser.test.ts** - Test Suite
- 13 comprehensive tests covering all parsing scenarios
- Tests Lua tables, arrays, nested structures, special characters
- Validates Wizard's Wardrobe extraction

### Modified Files

#### **LoadoutManager.tsx**
Added import functionality:
- File upload button ("Import from Lua")
- Accepts `.lua` and `.txt` files
- Snackbar notifications for success/error
- Automatic setup counting on import
- Resets selection after import

## Usage

### For Users
1. Navigate to `/loadout-manager`
2. Click "Import from Lua" button
3. Select your ESO SavedVariables file:
   - Location: `Documents\Elder Scrolls Online\live\SavedVariables\`
   - File: `WizardWardrobe.lua`
4. Loadouts are automatically imported and displayed

### Expected File Format

```lua
WizardWardrobeDataSaved = {
  ["Default"] = {
    ["@AccountName"] = {
      ["$AccountWide"] = {
        ["version"] = 1,
        ["selectedZoneTag"] = "SS",
        ["setups"] = {
          ["SS"] = {
            [1] = {
              ["name"] = "Boss Setup",
              ["disabled"] = false,
              ["condition"] = {
                ["boss"] = "Boss Name",
              },
              ["skills"] = {
                [0] = { [3] = 12345, ... },
                [1] = { [3] = 67890, ... },
              },
              ["cp"] = {},
              ["food"] = {},
              ["gear"] = {},
            },
          },
        },
        ["pages"] = {},
      },
    },
  },
}
```

## Technical Details

### Why `luaparse`?
- **Safe**: No code execution, only AST parsing
- **Complete**: Handles all Lua syntax including nested tables, comments
- **Type-safe**: TypeScript definitions available
- **Battle-tested**: Used in many Lua tooling projects

### Lua to JavaScript Conversion
- **Arrays**: Lua 1-indexed → JavaScript 0-indexed
- **Tables**: Lua tables → JavaScript objects
- **Mixed keys**: Handled correctly (string + numeric keys)
- **Special chars**: ESO item links, @accounts, $keys preserved
- **nil values**: Converted to `null`

### Data Flow
```
.lua file
  ↓ (FileReader API)
Lua string
  ↓ (luaparse)
AST (Abstract Syntax Tree)
  ↓ (evaluateLuaAST)
JavaScript object
  ↓ (extractWizardWardrobeData)
WizardWardrobeExport
  ↓ (convertWizardWardrobeToLoadoutState)
LoadoutState
  ↓ (Redux dispatch)
Application state
```

## Error Handling

The import process includes comprehensive error handling:
- **Invalid Lua syntax**: Clear error message
- **Missing Wizard's Wardrobe data**: Specific notification
- **Malformed structure**: Validation with helpful messages
- **File read errors**: Caught and displayed

## Testing

Run tests:
```bash
npm test -- luaParser.test.ts
```

All 13 tests pass, covering:
- Basic Lua table parsing
- Nested tables
- Arrays (Lua 1-indexed)
- Mixed tables (object/array)
- Nil values
- Special characters (ESO item links, @accounts, $keys)
- Invalid Lua (error handling)
- Wizard's Wardrobe extraction
- Format validation

## Dependencies

- **luaparse** (^0.3.1) - Lua parser library
- **@types/luaparse** - TypeScript definitions

Installed as dev dependencies.

## Future Enhancements

Potential improvements:
- Support for other ESO addon formats
- Direct clipboard paste (parse Lua from clipboard)
- Import conflict resolution (merge vs replace)
- Import preview before applying
- Character-specific imports (vs account-wide)

## Related Files

- `src/features/loadout-manager/utils/luaParser.ts`
- `src/features/loadout-manager/utils/wizardWardrobeConverter.ts`
- `src/features/loadout-manager/utils/__tests__/luaParser.test.ts`
- `src/features/loadout-manager/components/LoadoutManager.tsx`
- `src/features/loadout-manager/index.ts`
