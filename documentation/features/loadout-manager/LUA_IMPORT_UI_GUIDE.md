# Lua Import Feature - UI Guide

## UI Components

### Import Button Location

The "Import from Lua" button is located in the top toolbar of the Loadout Manager:

```
┌─────────────────────────────────────────────────────────────┐
│  Loadout Manager                                            │
│  Manage your skill setups, champion points, food, and gear │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Select Trial ▼]  [Basic] [Advanced]     [Import ↑] [Export ↓] │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Button Styling
- **Icon**: FileUpload (arrow pointing up into cloud/document)
- **Style**: Outlined button (secondary style)
- **Position**: Before the Export button
- **Always visible**: Available even when no trial is selected

### Import Flow

```
┌──────────────────────────────┐
│ User clicks "Import from Lua"│
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ File picker opens            │
│ Filters: .lua, .txt          │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ User selects file            │
│ (WizardWardrobe.lua)         │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ File is read and parsed      │
│ (Background processing)      │
└──────────┬───────────────────┘
           │
           ▼
    ┌─────┴─────┐
    │  Success? │
    └─────┬─────┘
          │
     ┌────┴────┐
     │         │
     ▼         ▼
   YES        NO
     │         │
     │         └──────────────────┐
     │                            │
     ▼                            ▼
┌────────────────┐      ┌──────────────────┐
│ Success Toast  │      │ Error Toast      │
│ "Imported N    │      │ "Failed: reason" │
│  setups!"      │      │                  │
└────────────────┘      └──────────────────┘
```

### Success Notification

```
┌──────────────────────────────────────────────┐
│ ✓  Successfully imported 15 loadout setup(s) │
│    from Wizard's Wardrobe!                   │
└──────────────────────────────────────────────┘
```

**Details:**
- Green background (success color)
- Auto-dismisses after 6 seconds
- Positioned at bottom-center
- Shows count of imported setups
- Includes close button

### Error Notifications

#### No Wizard's Wardrobe Data Found
```
┌──────────────────────────────────────────────┐
│ ✗  No Wizard's Wardrobe data found in file. │
│    Make sure you're uploading the correct   │
│    SavedVariables file.                      │
└──────────────────────────────────────────────┘
```

#### Invalid Lua Syntax
```
┌──────────────────────────────────────────────┐
│ ✗  Failed to import: Unexpected token at    │
│    line 45                                   │
└──────────────────────────────────────────────┘
```

**Details:**
- Red background (error color)
- Auto-dismisses after 6 seconds
- Positioned at bottom-center
- Includes close button
- Shows specific error message

## User Journey

### Step 1: Navigate to Loadout Manager
User navigates to `/loadout-manager` from the Tools menu.

### Step 2: Click Import Button
No trial needs to be selected first - import works from any state.

### Step 3: Select File
File picker opens with filter for `.lua` and `.txt` files.

**Typical file location:**
```
C:\Users\[Username]\Documents\Elder Scrolls Online\live\SavedVariables\WizardWardrobe.lua
```

### Step 4: Wait for Processing
Brief processing time (typically < 1 second):
- File is read
- Lua is parsed to AST
- Data is extracted
- Format is converted
- Redux state is updated

### Step 5: Review Imported Setups
- Trial selector automatically switches to first imported trial
- Setup list shows all imported setups
- Progress indicators show configuration completeness
- User can immediately start editing

## Accessibility

### Keyboard Navigation
- Tab to reach Import button
- Enter/Space to activate
- File picker is native and fully accessible

### Screen Readers
- Button labeled: "Import from Lua"
- File input hidden but accessible
- Success/error messages announced via Alert component

### Focus Management
- Focus returns to trigger button after file selection
- Clear focus indicators
- Logical tab order

## Mobile Responsiveness

The Import button adapts to smaller screens:
- Stacks vertically on mobile
- Full-width buttons below 600px
- Touch-friendly size (min 44x44px)
- Proper spacing between elements

## File Requirements

### Supported File Types
- `.lua` - Standard ESO SavedVariables extension
- `.txt` - Alternative extension (some users rename files)

### Expected Content
Must contain valid Lua syntax with Wizard's Wardrobe structure:
```lua
WizardWardrobeDataSaved = {
  ["Default"] = {
    ["@AccountName"] = { ... }
  }
}
```

### File Size
- No explicit limit enforced
- Typical file size: 5-50 KB
- Large files (> 1 MB) may take longer to process

## Browser Compatibility

### File API Support
- Chrome: ✓ Full support
- Firefox: ✓ Full support  
- Safari: ✓ Full support
- Edge: ✓ Full support

### FileReader API
Used for reading file contents, supported in all modern browsers.

## Tips for Users

### Finding Your SavedVariables File
1. Open Windows Explorer
2. Navigate to: `%USERPROFILE%\Documents\Elder Scrolls Online\live\SavedVariables\`
3. Look for `WizardWardrobe.lua`
4. Select this file in the import dialog

### Troubleshooting

**"No data found" error:**
- Make sure file is from Wizard's Wardrobe addon
- Check that addon has been loaded in-game at least once
- Verify file isn't empty or corrupted

**"Failed to parse" error:**
- File may be corrupted - try reloading it from game
- Ensure you selected the correct file
- Try closing the file in other programs

**Nothing happens:**
- Check browser console for errors
- Verify file picker appeared and file was selected
- Try smaller file to rule out size issues

### Best Practices
- Export backups before importing (to preserve existing data)
- Import from a recent game session for latest data
- Review imported setups before using in-game
- Test with one trial first before importing full addon data

## Related Documentation
- [LUA_IMPORT_FEATURE.md](./LUA_IMPORT_FEATURE.md) - Technical implementation
- [LOADOUT_MANAGER_STATUS.md](../../../LOADOUT_MANAGER_STATUS.md) - Feature overview
