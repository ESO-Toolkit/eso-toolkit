# M0R Markers Positioning Fix

## Issue
Markers were being filtered correctly (showing "6 / 37 markers") but not visible in the 3D arena.

## Root Cause
The marker coordinate transformation was **not accounting for the map's bounding box offsets**.

### Incorrect Implementation
```typescript
// ❌ WRONG: Assumes coordinates are in 0-10000 range
const arenaX = 100 - marker.x / 100;
const arenaZ = marker.z / 100;
```

This ignored the fact that ESO world space coordinates are **absolute positions** (e.g., x=131970, z=56920) that need to be **normalized relative to the map bounds** before converting to arena space.

## Solution
Transform markers using the **same normalization** as the map texture and grid system:

### Correct Implementation
```typescript
// ✅ CORRECT: Normalize to map bounds first
const normalizedX = (marker.x - minX) / (maxX - minX);  // → 0-1 range
const normalizedZ = (marker.z - minZ) / (maxZ - minZ);  // → 0-1 range

const arenaX = 100 - (normalizedX * 100);  // Scale to 0-100 and flip X
const arenaZ = normalizedZ * 100;          // Scale to 0-100
```

## Technical Details

### Coordinate System Overview
1. **ESO World Space**: Absolute centimeter coordinates
   - Example: Kyne's Aegis map 1805 spans X: [126070, 148090], Z: [31770, 53880]
   - Coordinates are large integers representing physical distances

2. **Normalized Space**: 0-1 range relative to map bounds
   - `(coord - min) / (max - min)` → maps any range to 0-1
   - Removes absolute positioning, focuses on relative position within map

3. **Arena Space**: 0-100 range matching Three.js scene
   - Arena is always 100x100 units regardless of real-world map size
   - Map texture, grid, and actors all use this space
   - X-axis is flipped (100 - x) to match horizontally-flipped map texture

### Transformation Pipeline
```
ESO World Space → Normalized Space → Arena Space
  (centimeters)      (0-1 range)      (0-100 units)

Example marker at x=137070 in Kyne's Aegis (map 1805):
  x = 137070                          // ESO world space
  normalized = (137070 - 126070)      // Relative to map min
             / (148090 - 126070)      // As fraction of map range
             = 11000 / 22020          // = 0.4996
  arena = 100 - (0.4996 * 100)        // Scale and flip
        = 100 - 49.96
        = 50.04                       // Arena coordinate
```

### Why This Matters
Different maps have vastly different coordinate ranges:

| Map | Zone | minX | maxX | Range |
|-----|------|------|------|-------|
| Kyne's Aegis | 1196 | 126070 | 148090 | 22,020 cm |
| Hel Ra Citadel | 636 | 32030 | 133200 | 101,170 cm |
| Final Island (AA) | 638 | 124800 | 131340 | 6,540 cm |

Without normalization, a marker at x=130000 would:
- In Kyne's Aegis: Be near the center (relative position ~0.18)
- In Hel Ra: Be near the right edge (relative position ~0.97)
- In AA: Be off the map entirely (x > maxX)

## Implementation Changes

### File: `MorMarkers.tsx`
**Location**: `src/features/fight_replay/components/MorMarkers.tsx`

**Before** (lines 211-223):
```typescript
const arenaX = 100 - marker.x / 100;
const arenaZ = marker.z / 100;
const arenaY = marker.y / 100;
```

**After** (lines 211-230):
```typescript
// Normalize marker coordinates relative to map bounds
// This converts world space coordinates to normalized 0-1 range
const normalizedX = (marker.x - minX) / (maxX - minX);
const normalizedZ = (marker.z - minZ) / (maxZ - minZ);

// Scale to arena size (0-100) and apply X-flip to match map texture
// Map texture has scale={[-1, 1, 1]} which flips it, so we flip X coordinate
const arenaX = 100 - (normalizedX * 100);
const arenaZ = normalizedZ * 100;
const arenaY = marker.size / 2; // Position at half height to center marker vertically
```

## Consistency with Arena System

### Map Texture Positioning
The map texture mesh uses the same bounds:
```typescript
// Arena3D.tsx
const mapScale = getMapScale(mapMetadata);
// Uses minX, maxX, minZ, maxZ to scale texture
```

### Grid Overlay
The dynamic grid also normalizes to bounds:
```typescript
// Arena3D.tsx - GridOverlay
// Grid dimensions based on (maxX - minX) and (maxZ - minZ)
```

### Actor Positions
Actors use a different approach - they're positioned in raw world space then divided by 100:
```typescript
// coordinateUtils.ts - convertCoordinatesWithBottomLeft
const x3D = 100 - x / 100;
const z3D = y / 100;
```

**Key Difference**: Actors spawn/move within the map bounds naturally, so their coordinates are already relative to the map. Markers can be placed anywhere in the zone, so they **must** be normalized to map bounds.

## Verification

### Console Logging
Added detailed logging to verify transformations:
```typescript
console.log('MorMarkers: Transformed', markersInBounds.length, 'markers for', zoneScaleData.name,
  '- Sample (first 3):', 
  transformed.markers.slice(0, 3).map(m => ({ x: m.x, y: m.y, z: m.z, text: m.text }))
);
```

Expected output after fix:
```
MorMarkers: Transformed 6 markers for Kyne's Aegis - Sample (first 3): 
[
  { x: 45.2, y: 0, z: 67.8, text: "Boss Position" },
  { x: 52.1, y: 0, z: 71.3, text: "Add Spawn" },
  { x: 48.9, y: 0, z: 69.5, text: "Safe Spot" }
]
```

All coordinates should now be in 0-100 range and match map positions.

## Testing Scenarios

### Test 1: Kyne's Aegis Main Floor (Map 1805)
- Load markers from main floor
- Verify markers appear at correct positions relative to boss
- Check coordinates are in 0-100 range

### Test 2: Kyne's Aegis Underground (Map 1808)
- Load markers from underground floor
- Verify 3D filtering removes main floor markers
- Check remaining markers are correctly positioned

### Test 3: Different Zone Entirely
- Load markers from Sunspire while viewing Kyne's Aegis
- Should show error or warning
- No markers should render

## Related Documentation
- `MARKER_BOUNDING_BOX_FILTERING.md` - Bounding box filtering logic
- `MARKER_3D_BOUNDING_BOX.md` - 3D filtering for multi-floor maps
- `M0R_MARKERS_INFO_PANELS.md` - UI statistics display
- `ARENA_GRID_DYNAMIC_SCALING_IMPLEMENTATION.md` - Arena scaling system

## Future Improvements
1. Add coordinate validation before transformation
2. Show warning if markers are outside expected 0-100 range after transform
3. Add visual debug mode to show marker positions with labels
4. Consider caching transformation calculations for performance

## Floor Clipping Fix

### Issue
Markers at `y = 0` were being clipped/cut off by the arena floor mesh.

### Root Cause
The arena floor plane is positioned at `y = -0.02`. Markers at exactly `y = 0` can suffer from:
- **Z-fighting**: When two surfaces occupy the same space, causing flickering
- **Clipping**: Graphics card may cull geometry that appears "inside" another mesh

### Solution
Position each marker at **half its height** above the floor:
```typescript
const arenaY = marker.size / 2; // Center marker vertically (size is diameter)
```

This approach:
- **Prevents clipping**: Marker bottom is at ground level (y=0), top extends upward
- **Visually grounded**: Markers appear to sit on the floor naturally
- **Size-adaptive**: Small markers hover just above floor, large markers extend higher
- **Accurate positioning**: The marker's center point is at half its radius, matching how circular geometry is typically centered

Since `marker.size` represents the diameter (in meters), dividing by 2 gives us the radius, which is the perfect height to center a circular marker vertically while keeping its bottom edge at ground level.

## Changelog
- **2025-10-15**: Fixed marker positioning to use normalized coordinates relative to map bounds
- **2025-10-15**: Added detailed transformation logging
- **2025-10-15**: Updated documentation with coordinate system explanation
- **2025-10-15**: Fixed floor clipping by raising markers to y=0.1 (was y=0)
- **2025-10-15**: Increased marker height to y=1.0 to prevent clipping at low camera angles
- **2025-10-15**: Changed to size-adaptive positioning: y=marker.size/2 for natural grounding
- **2025-10-15**: Implemented M0RMarkers shape support (hexagon, square, diamond, etc.) - See M0R_MARKERS_SHAPES_IMPLEMENTATION.md
