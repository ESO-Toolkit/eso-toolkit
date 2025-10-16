# M0R Markers Info Panels

## Overview
Added visual feedback panels that display marker loading and filtering statistics in the Fight Replay UI.

## Implementation

### Hook: `useMarkerStats`
**Location**: `src/hooks/useMarkerStats.ts`

**Purpose**: Calculate statistics about marker loading and filtering

**Returns**: `MarkerStats` interface
```typescript
interface MarkerStats {
  totalDecoded: number;    // Total markers decoded from string
  filtered: number;        // Markers within map bounds (displayed)
  removed: number;         // Markers filtered out by bounding box
  zoneId: number | null;   // Detected zone ID
  mapName: string;         // Detected map name
  mapId: number | null;    // Detected map ID
  is3D: boolean;           // Whether 3D filtering was used
  success: boolean;        // Overall success status
  error: string | null;    // Error message if failed
}
```

### UI Components
**Location**: `src/features/fight_replay/FightReplay.tsx`

#### Success State
When markers load successfully (`markerStats.success === true`):

1. **Primary Counter Chip** (green)
   - Shows: `{filtered} / {totalDecoded} markers`
   - Example: "24 / 37 markers"

2. **3D Filtering Badge** (blue outline) - conditional
   - Shows: "3D Filtering"
   - Only displayed when `is3D === true` (multi-floor maps)

3. **Filtered Out Badge** (orange outline) - conditional
   - Shows: `{removed} filtered out`
   - Only displayed when `removed > 0`
   - Example: "13 filtered out"

#### Warning State
When no markers match the current map:
- **Alert** (warning severity)
- Message: "No markers match the current map ({mapName}). All markers were filtered out by bounding box."

#### Error State
When marker loading fails (`markerStats.success === false`):
- **Alert** (error severity)
- Message: `{markerStats.error}` (from hook)

## User Experience Flow

### Normal Case (with filtering)
```
User pastes: <1196]1234567890]minX:minY:minZ]...]
Clicks "Load Markers"
Sees: [✓ 24 / 37 markers] [3D Filtering] [13 filtered out]
```

### All Markers Match Case
```
User pastes: <1196]1234567890]minX:minY:minZ]...]
Clicks "Load Markers"
Sees: [✓ 37 / 37 markers] [3D Filtering]
```

### No Matches Case
```
User pastes: <1196]1234567890]minX:minY:minZ]...> (wrong floor)
Clicks "Load Markers"
Sees: ⚠️ No markers match the current map (Kyne's Aegis - 3). All markers were filtered out by bounding box.
```

### Error Case
```
User pastes: Invalid string format
Clicks "Load Markers"
Sees: ❌ Failed to decode M0R markers string. Check console for details.
```

## Technical Details

### Statistics Calculation
The `useMarkerStats` hook:
1. Decodes the marker string
2. Looks up map metadata based on fight's gameZone
3. Filters markers by 2D or 3D bounding box
4. Calculates totals: decoded, filtered (shown), removed (hidden)

### Performance
- Hook uses `useMemo` to avoid recalculating on every render
- Only recalculates when `morMarkersString` or `currentFight` changes
- Statistics calculated separately from rendering logic

### Conditional Rendering
Info panels only appear when:
- `morMarkersString` is set (markers have been loaded)
- Different panels for success vs error states
- Optional badges only show when relevant (3D filtering, filtered out count)

## Dependencies
- Material-UI: `Chip`, `Alert` components
- `useMarkerStats` custom hook
- `FightFragment` GraphQL type

## Related Files
- `src/hooks/useMarkerStats.ts` - Statistics calculation
- `src/features/fight_replay/FightReplay.tsx` - UI display
- `src/features/fight_replay/components/MorMarkers.tsx` - Marker rendering
- `src/utils/morMarkersMapUtils.ts` - Bounding box utilities

## Testing Scenarios

### Test 1: Standard Map (Kyne's Aegis Main Floor)
- Load markers from main floor map (1805)
- Should show filtered count with 2D filtering

### Test 2: Underground Map (Kyne's Aegis Floor 3)
- Load markers from underground (1808)
- Should show "3D Filtering" badge
- May show filtered out count if markers from other floors

### Test 3: Zone Mismatch
- Load markers from different zone (e.g., paste Sunspire markers while viewing vKA)
- Should show error: "Zone mismatch"

### Test 4: Invalid Format
- Load malformed marker string
- Should show error: "Failed to decode"

### Test 5: Empty/No Markers
- Clear markers with "Clear" button
- Info panels should disappear

## Future Enhancements
1. Add tooltip with detailed map info (coordinates, zone name)
2. Show marker preview/list before loading
3. Add "Load All" vs "Load Filtered" option
4. Display marker types/categories breakdown
5. Add marker export functionality

## Changelog
- **2025-01-XX**: Initial implementation with success/error/warning states
- **2025-01-XX**: Added 3D filtering badge
- **2025-01-XX**: Added filtered out count badge
