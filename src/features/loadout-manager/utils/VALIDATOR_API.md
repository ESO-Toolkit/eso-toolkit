# Item Slot Validator - Quick Reference

## Problem

Only **2.69%** of items (3,017 / 112,203) have slot information.

## Solution

Use the validator to prevent invalid loadout exports.

## API Reference

### Check Individual Items

```typescript
import { hasKnownSlot, getItemSlotInfo } from './itemSlotValidator';

// Quick check
if (hasKnownSlot(itemId)) {
  // Safe to use
}

// Get full details
const info = getItemSlotInfo(itemId);
if (info?.hasSlot) {
  console.log(`${info.name} → ${info.slot}`);
}
```

### Filter Items for UI

```typescript
import { getItemsBySlot } from './itemSlotValidator';

// Get all valid head items
const headItems = getItemsBySlot('head');
// Returns: [{ itemId: 59380, item: {...} }, ...]

// Use in selector
<select>
  {headItems.map(({ itemId, item }) => (
    <option key={itemId} value={itemId}>
      {item.setName} - {item.name}
    </option>
  ))}
</select>
```

### Validate Loadouts

```typescript
import { validateGearConfig, canExportLoadout } from './itemSlotValidator';

// Detailed validation
const result = validateGearConfig(gear);
if (!result.isValid) {
  result.errors.forEach((err) => console.error(err));
  result.warnings.forEach((warn) => console.warn(warn));
}

// Quick export check
const { canExport, reason } = canExportLoadout(gear);
if (!canExport) {
  alert(`Cannot export: ${reason}`);
  return;
}

exportToWizardsWardrobe(gear);
```

### Get Coverage Stats

```typescript
import { getSlotCoverageStats } from './itemSlotValidator';

const stats = getSlotCoverageStats();
console.log(`Coverage: ${stats.coveragePercent.toFixed(2)}%`);
console.log('By slot:', stats.bySlot);

// Show user warning
if (stats.coveragePercent < 10) {
  showWarning('Limited item database - only known slots shown');
}
```

## Type Reference

```typescript
type SlotType =
  | 'head'
  | 'neck'
  | 'chest'
  | 'shoulders'
  | 'hand'
  | 'waist'
  | 'legs'
  | 'feet'
  | 'ring'
  | 'weapon'
  | 'offhand';

interface ItemSlotInfo {
  itemId: number;
  hasSlot: boolean;
  slot?: SlotType;
  equipType?: number;
  name: string;
  setName: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  itemsWithSlots: number;
  itemsWithoutSlots: number;
}
```

## Common Patterns

### Pattern 1: Slot-Specific Selector

```typescript
function GearSlotSelector({ slotIndex, slot }: Props) {
  const items = getItemsBySlot(slot);

  return (
    <select>
      <option value="">Select {slot}...</option>
      {items.map(({ itemId, item }) => (
        <option key={itemId} value={itemId}>
          {item.setName}
        </option>
      ))}
    </select>
  );
}
```

### Pattern 2: Pre-Export Validation

```typescript
function exportLoadout(gear: GearConfig) {
  const validation = validateGearConfig(gear);

  if (!validation.isValid) {
    showDialog({
      title: 'Cannot Export Loadout',
      message: 'The following items have issues:\n' + validation.errors.join('\n'),
      type: 'error',
    });
    return;
  }

  if (validation.warnings.length > 0) {
    const proceed = confirm(
      'Warning: Some items may not be correctly assigned.\n' +
        validation.warnings.join('\n') +
        '\n\nProceed anyway?',
    );
    if (!proceed) return;
  }

  exportToFile(gear);
}
```

### Pattern 3: Item Picker with Validation

```typescript
function ItemPicker({ onSelect }: Props) {
  const [selectedItem, setSelectedItem] = useState<number | null>(null);

  const handleSelect = (itemId: number) => {
    const info = getItemSlotInfo(itemId);

    if (!info) {
      alert('Item not found in database');
      return;
    }

    if (!info.hasSlot) {
      const proceed = confirm(
        `${info.name} has no slot information. ` +
        `This may cause issues in-game. Continue?`
      );
      if (!proceed) return;
    }

    setSelectedItem(itemId);
    onSelect(itemId);
  };

  return <ItemList onSelect={handleSelect} />;
}
```

### Pattern 4: Coverage Dashboard

```typescript
function CoverageDashboard() {
  const stats = getSlotCoverageStats();

  return (
    <div>
      <h3>Item Database Coverage</h3>
      <p>
        {stats.itemsWithSlots.toLocaleString()} /
        {stats.totalItems.toLocaleString()} items
        ({stats.coveragePercent.toFixed(2)}%)
      </p>

      <ul>
        {Object.entries(stats.bySlot).map(([slot, count]) => (
          <li key={slot}>
            {slot}: {count} items
          </li>
        ))}
      </ul>

      {stats.coveragePercent < 10 && (
        <Warning>
          Limited coverage - only showing items with confirmed slots
        </Warning>
      )}
    </div>
  );
}
```

## Slot Index Mapping

ESO uses specific slot indices:

```typescript
const SLOT_INDICES = {
  head: 0,
  neck: 1,
  chest: 2,
  shoulders: 3,
  mainHand: 4,
  offHand: 5,
  waist: 6,
  legs: 8,
  feet: 9,
  hand: 10, // Note: hand is 10, not 7
  ring1: 11,
  ring2: 12,
  mainHandBackup: 16,
  offHandBackup: 17,
  backupRing: 20,
};
```

## Known Item Examples

```typescript
// Monster sets (have slots)
const SPAWN_OF_MEPHALA_HEAD = 59380; // head
const SPAWN_OF_MEPHALA_SHOULDERS = 59403; // shoulders

// Regular sets (no slots)
const MOTHERS_SORROW = 7327; // ❌ No slot info
const WYRD_TREE = 1120; // ❌ No slot info
```

## See Also

- `GEAR_SLOT_VALIDATION_ISSUE.md` - Complete technical analysis
- `GEAR_SLOT_VALIDATION_SUMMARY.md` - Executive summary
- `itemSlotValidator.test.ts` - Usage examples and test cases

---

**Quick Tip**: Always use `getItemsBySlot()` for UI dropdowns to ensure only valid items are shown!
