# Map Markers Rename Summary

## Overview
Updated file names and component names to reflect that the system now supports both M0R Markers and Elms Markers formats, not just M0R.

## Renamed Files

### Components
- `MorMarkers.tsx` → `MapMarkers.tsx`
- `MorMarkersModal.tsx` → `MapMarkersModal.tsx`
- `MorMarkers.integration.test.tsx` → `MapMarkers.integration.test.tsx`

### Utilities
- `morMarkersMapUtils.ts` → `mapMarkersUtils.ts`

### Types
- `morMarkers.ts` → `mapMarkers.ts`

### Files NOT Renamed (Format-Specific)
- `morMarkersDecoder.ts` - **Kept** (M0R format specific decoder)
- `elmsMarkersDecoder.ts` - **Kept** (Elms format specific decoder)
- `morMarkersDecoder.test.ts` - **Kept** (M0R decoder tests)

## Component/Interface Renames

### Components
- `MorMarkers` → `MapMarkers`
- `MorMarkersModal` → `MapMarkersModal`

### Interfaces
- `MorMarkersProps` → `MapMarkersProps`
- `MorMarkersModalProps` → `MapMarkersModalProps`

### Types (No Change)
- `MorMarker` - **Kept** (used by both M0R and Elms formats)
- `DecodedMorMarkers` - **Kept** (structure used by both formats)

## Updated Imports

### Files Updated
1. `src/features/fight_replay/FightReplay.tsx`
   - Import: `MorMarkersModal` → `MapMarkersModal`
   - Button text: "Import M0R Markers" → "Import Map Markers"
   - Comment: "M0R Markers state" → "Map Markers state (M0R or Elms format)"

2. `src/features/fight_replay/components/Arena3DScene.tsx`
   - Import: `MorMarkers` → `MapMarkers`
   - Comment: "M0RMarkers - Render raid/dungeon markers" → "Map Markers - Render raid/dungeon markers (M0R or Elms format)"

3. `src/features/fight_replay/components/MapMarkers.tsx`
   - Component name: `MorMarkers` → `MapMarkers`
   - Console logs: `'MorMarkers:'` → `'MapMarkers:'`
   - Header comment: Updated to mention both formats

4. `src/features/fight_replay/components/MapMarkersModal.tsx`
   - Component name: `MorMarkersModal` → `MapMarkersModal`
   - Interface name: `MorMarkersModalProps` → `MapMarkersModalProps`
   - Header comment: Updated to mention both formats

5. `src/features/fight_replay/components/Marker3D.tsx`
   - Import path: `../types/morMarkers` → `../../../types/mapMarkers`
   - Header comment: Updated to mention both formats
   - Comment: "MorMarkers parent" → "MapMarkers parent"

6. `src/features/fight_replay/components/MapMarkers.integration.test.tsx`
   - Import: `MorMarkers` → `MapMarkers`
   - All component usages: `<MorMarkers />` → `<MapMarkers />`
   - Header comment: Updated to mention both formats

7. `src/utils/mapMarkersUtils.ts`
   - Header comment: "M0RMarkers" → "Map Markers (M0R and Elms formats)"

8. `src/types/mapMarkers.ts`
   - Header comment: Updated to mention both M0R and Elms formats

9. `src/utils/morMarkersDecoder.ts`
   - Import: Updated to use `mapMarkers.ts`

10. `src/utils/elmsMarkersDecoder.ts`
    - Import: Updated to use `mapMarkers.ts`

11. `src/hooks/useMarkerStats.ts`
    - Import: Updated to use `mapMarkers.ts` (via decoders)

## Documentation Changes

### Updated Comments
- All component headers now mention "Map Markers (M0R and Elms formats)"
- Console log prefixes changed from "MorMarkers:" to "MapMarkers:"
- Button labels changed from "M0R Markers" to "Map Markers"

### Historical Documentation
- Existing `.md` files in the repository root reference the old names but are left unchanged as they document historical implementation

## Technical Details

### Why These Names?
- **MapMarkers** - Generic term that encompasses both M0R and Elms marker formats
- **mapMarkers.ts** - Type definitions shared by both formats (both use `MorMarker` interface)
- **morMarkersDecoder.ts** - Kept format-specific name since it only handles M0R format
- **elmsMarkersDecoder.ts** - Kept format-specific name since it only handles Elms format

### Shared Types
Both M0R and Elms formats convert to the same `MorMarker` interface:
```typescript
interface MorMarker {
  x: number;
  y: number;
  z: number;
  size: number;
  bgTexture: string;
  colour: [number, number, number, number];
  text?: string;
  orientation?: [number, number];
}
```

This allows both formats to be rendered identically in the 3D scene.

## Validation

### TypeScript
- ✅ `npm run typecheck` - All type checks passing

### Linting
- ✅ `npm run lint:fix` - Auto-fixed formatting issues
- ✅ All import paths updated correctly
- ✅ No broken references

### Tests
- ✅ Integration tests updated to use new component names
- ✅ Unit tests for decoders remain unchanged (format-specific)

## Impact Analysis

### Breaking Changes
None - All changes are internal to the codebase. The API remains the same:
- Prop names unchanged (`encodedString`, `fight`, etc.)
- State variable names unchanged (`morMarkersString`)
- Function signatures unchanged

### User-Facing Changes
- Button text: "Import M0R Markers" → "Import Map Markers"
- Modal title: "M0R Markers" → "Map Markers"
- Instructions now mention both M0R and Elms formats

## Summary

Successfully renamed all files and components from "Mor/MorMarkers" to "Map/MapMarkers" to reflect support for both M0R Markers and Elms Markers formats. The rename maintains backward compatibility while providing a more accurate and generic naming convention for the dual-format marker system.

**Total Files Renamed**: 5  
**Total Components Renamed**: 2  
**Total Interfaces Renamed**: 2  
**Files with Updated Imports**: 11  
**Format-Specific Files Preserved**: 3 (morMarkersDecoder.ts, elmsMarkersDecoder.ts, morMarkersDecoder.test.ts)
