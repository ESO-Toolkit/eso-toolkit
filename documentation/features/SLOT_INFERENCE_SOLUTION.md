# Slot Inference System - Solution for 97% of Items Without Slot Data

## Problem Solved

**Original Issue**: Only 2.69% of items have explicit slot data from LibSets  
**Solution**: **Slot Inference** - Trust user placement when explicit data isn't available

## Philosophy

**When a user places an item in a slot, that IS the slot assignment.**

We have three levels of confidence:

1. **High Confidence** (Explicit Match)
   - Item HAS slot data AND it matches placement
   - Example: Spawn of Mephala Head → Head slot ✅

2. **Medium Confidence** (Inference)
   - Item has NO slot data, infer from UI placement
   - Example: Mother's Sorrow Gear → Head slot (user says so) ⚠️

3. **Error** (Explicit Conflict)
   - Item HAS slot data AND it CONFLICTS with placement
   - Example: Ring item → Head slot ❌

## API Usage

### Validation with Inference

```typescript
import { validateGearConfigWithInference } from './slotInference';

const result = validateGearConfigWithInference(gear);

console.log(result.isValid); // true/false
console.log(result.confidence); // 'high' | 'medium' | 'low'
console.log(result.itemsWithExplicitSlots); // Count with known slots
console.log(result.itemsWithInferredSlots); // Count without known slots
console.log(result.warnings); // Array of warnings to show user
```

### Export Safety Check

```typescript
import { canExportLoadoutWithInference } from './slotInference';

const check = canExportLoadoutWithInference(gear);

if (check.canExport) {
  if (check.confidence === 'high') {
    // Export immediately
    exportLoadout(gear);
  } else if (check.confidence === 'medium') {
    // Show warnings, ask for confirmation
    const confirmed = await showWarningsDialog(check.warnings);
    if (confirmed) exportLoadout(gear);
  }
} else {
  // Cannot export - show errors
  showError(check.reason);
}
```

### Generate Export Metadata

```typescript
import { generateExportMetadata } from './slotInference';

const metadata = generateExportMetadata(gear);

// Show user what will be exported
console.log('Export Preview:');
metadata.slotAssignments.forEach(assignment => {
  const icon = assignment.assignmentType === 'explicit' ? '✅' : '⚠️';
  console.log(`${icon} ${assignment.slot}: ${assignment.itemName}`);
});
```

## Confidence Levels

### High Confidence (✅ Safe to Export)

Achieved when:
- All items have explicit slot data that matches placement, OR
- ≤40% of items are inferred from placement

Example:
```
Head: Spawn of Mephala Head ✅ (explicit)
Shoulders: Spawn of Mephala Shoulders ✅ (explicit)  
Chest: Mother's Sorrow Gear ⚠️ (inferred)

Result: HIGH confidence (33% inferred)
```

### Medium Confidence (⚠️ Show Warnings)

Achieved when:
- >40% of items are inferred from placement, OR
- All items are inferred

Example:
```
Head: Mother's Sorrow Gear ⚠️ (inferred)
Chest: Mother's Sorrow Gear ⚠️ (inferred)
Legs: Mother's Sorrow Gear ⚠️ (inferred)

Result: MEDIUM confidence (100% inferred)
Action: Show warnings, ask user to confirm
```

### Low Confidence (❌ Block Export)

Occurs when:
- Explicit slot conflicts detected
- Items not found in database

Example:
```
Head: Twice-Born Star Ring ❌ (ring in head slot!)

Result: LOW confidence
Action: Block export, show error
```

## Real-World Usage

### Scenario 1: Monster Set + Body Set

```typescript
const gear: GearConfig = {};

// Monster set pieces (explicit slots)
gear[0] = { id: '59380' }; // Spawn of Mephala Head ✅
gear[3] = { id: '59403' }; // Spawn of Mephala Shoulders ✅

// Body set pieces (inferred slots)
gear[2] = { id: '7327' };  // Mother's Sorrow Chest ⚠️
gear[8] = { id: '7328' };  // Mother's Sorrow Legs ⚠️
gear[9] = { id: '7257' };  // Mother's Sorrow Feet ⚠️

const result = validateGearConfigWithInference(gear);

// Result: valid=true, confidence='medium' (60% inferred)
// Warnings: 3 items have no slot verification
```

### Scenario 2: Full Inferred Loadout

```typescript
const gear: GearConfig = {};

// All items from a regular set (no explicit slots)
gear[0] = { id: '7327' };   // Head ⚠️
gear[1] = { id: '7328' };   // Neck ⚠️
gear[2] = { id: '7257' };   // Chest ⚠️
gear[8] = { id: '7258' };   // Legs ⚠️
gear[9] = { id: '7259' };   // Feet ⚠️

const result = validateGearConfigWithInference(gear);

// Result: valid=true, confidence='medium' (100% inferred)
// Action: Show warnings, ask user to confirm

const check = canExportLoadoutWithInference(gear);
if (check.canExport) {
  showDialog({
    title: 'Confirm Export',
    message: `This loadout has ${result.itemsWithInferredSlots} items ` +
             `without verified slots. Continue?`,
    warnings: check.warnings,
    onConfirm: () => exportLoadout(gear)
  });
}
```

### Scenario 3: Detect Errors

```typescript
const gear: GearConfig = {};

// Accidental misplacement
gear[0] = { id: '58430' }; // Ring item in head slot!

const result = validateGearConfigWithInference(gear);

// Result: valid=false, errors=['...ring...head slot...']
// Action: Block export

showError(result.errors[0]);
// "Head: Twice-Born Star Ring is explicitly marked as a ring item,
//  but was placed in head slot. This will likely fail in-game."
```

## UI Integration Examples

### Gear Selector with Confidence Indicators

```tsx
function GearSlotSelector({ slotIndex, slot, value, onChange }: Props) {
  const items = getAllItems(); // Don't filter - show all items
  const selectedItem = value ? getItemInfo(value) : null;
  
  // Show confidence indicator
  const getConfidenceIcon = () => {
    if (!selectedItem) return null;
    if (selectedItem.slot === slot) return '✅'; // Explicit match
    if (selectedItem.slot && selectedItem.slot !== slot) return '❌'; // Conflict
    return '⚠️'; // Inferred
  };
  
  return (
    <div>
      <label>
        {slot} {getConfidenceIcon()}
      </label>
      <select value={value} onChange={onChange}>
        <option value="">Select {slot}...</option>
        {items.map(item => (
          <option key={item.id} value={item.id}>
            {item.setName} - {item.name}
            {item.slot === slot ? ' ✅' : ''}
            {item.slot && item.slot !== slot ? ' ❌ WRONG SLOT' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Export Dialog with Warnings

```tsx
function ExportDialog({ gear, onExport, onCancel }: Props) {
  const metadata = generateExportMetadata(gear);
  const check = canExportLoadoutWithInference(gear);
  
  return (
    <Dialog>
      <Title>Export Loadout</Title>
      
      {!check.canExport && (
        <ErrorPanel>
          <p>Cannot export this loadout:</p>
          <ul>
            {metadata.validation.errors.map(err => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </ErrorPanel>
      )}
      
      {check.canExport && check.warnings.length > 0 && (
        <WarningPanel>
          <p>Confidence: {check.confidence.toUpperCase()}</p>
          <p>The following items have no slot verification:</p>
          <ul>
            {check.warnings.map(warn => (
              <li key={warn}>{warn}</li>
            ))}
          </ul>
          <p>Continue anyway?</p>
        </WarningPanel>
      )}
      
      <SlotSummary>
        {metadata.slotAssignments.map(assignment => (
          <div key={assignment.slot}>
            {assignment.assignmentType === 'explicit' ? '✅' : '⚠️'}
            {assignment.slot}: {assignment.itemName}
          </div>
        ))}
      </SlotSummary>
      
      <ButtonGroup>
        <Button onClick={onCancel}>Cancel</Button>
        <Button 
          onClick={onExport} 
          disabled={!check.canExport}
          variant={check.confidence === 'high' ? 'primary' : 'warning'}
        >
          {check.confidence === 'high' ? 'Export' : 'Export Anyway'}
        </Button>
      </ButtonGroup>
    </Dialog>
  );
}
```

## Comparison: Old vs New Approach

### Old Approach (Strict Validation)

```
❌ BLOCKED: Mother's Sorrow Chest (no slot data)
❌ BLOCKED: Mother's Sorrow Legs (no slot data)  
❌ BLOCKED: Mother's Sorrow Feet (no slot data)

Result: Cannot create loadouts with 97% of items
```

### New Approach (Inference)

```
⚠️  INFERRED: Mother's Sorrow Chest → chest slot
⚠️  INFERRED: Mother's Sorrow Legs → legs slot
⚠️  INFERRED: Mother's Sorrow Feet → feet slot

Result: Loadout can be created with warnings
User confirms they placed items correctly
Export succeeds! ✅
```

## Benefits

1. **Enables 97% of Items**: Users can now create loadouts with any item
2. **Safety First**: Still blocks explicit conflicts (ring in head slot)
3. **User Feedback**: Clear warnings about inferred vs verified slots
4. **Confidence Levels**: Different UX for high vs medium confidence
5. **Metadata Tracking**: Export includes which slots were inferred
6. **Backward Compatible**: Still works great with the 3% that have explicit slots

## Testing

All 25 tests pass ✅

Key test scenarios:
- ✅ Accepts explicit slot matches (high confidence)
- ✅ Accepts inferred slots with warnings (medium confidence)
- ✅ Rejects explicit conflicts (errors)
- ✅ Handles mixed loadouts correctly
- ✅ Calculates confidence levels properly
- ✅ Generates useful warnings for users

## Migration Path

### Phase 1: Enable Inference (Now)
- Use `validateGearConfigWithInference()` instead of `validateGearConfig()`
- Show warnings for inferred items
- Allow export with confirmation

### Phase 2: Improve Data (Future)
- Integrate ESO API for more explicit slot data
- Collect community WizardsWardrobe files
- Pattern matching from item names
- Reduce % of inferred items over time

### Phase 3: Refinement
- Track export success rates
- Learn from user corrections
- Build confidence over time

## Files

- `src/features/loadout-manager/utils/slotInference.ts` - Core logic
- `src/features/loadout-manager/utils/__tests__/slotInference.test.ts` - Tests (25 passing)
- `SLOT_INFERENCE_SOLUTION.md` - This documentation

## Summary

**Problem**: 97% of items lack slot data  
**Solution**: Infer slots from user placement, verify when possible  
**Result**: ✅ All items usable, ⚠️ warnings for unverified, ❌ errors for conflicts

The user is the ultimate authority on their loadout. We provide safety rails, not roadblocks.
