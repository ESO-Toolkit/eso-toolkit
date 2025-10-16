# M0R Markers - Zone Scale Data Integration

## Overview
Updated M0R Markers feature to use existing zone scale data from `zoneScaleData.ts` instead of generic coordinate normalization. This provides accurate coordinate transformation based on actual ESO zone boundaries.

## Implementation Date
October 14, 2025

## Problem Statement
The previous implementation used a generic bounding box normalization approach that:
- Calculated min/max coordinates from the markers themselves
- Centered markers around the origin
- Scaled to fit an arbitrary 80-meter arena

While this prevented WebGL crashes, it didn't use the existing zone scale data that defines actual ESO world space boundaries for each trial map.

## Solution
Integrate with the existing `ZONE_SCALE_DATA` mapping that contains:
- Zone boundaries (minX, maxX, minZ, maxZ) in ESO world space (centimeters)
- Zone ID and Map ID mappings
- Data sourced from [elmseditor](https://github.com/sheumais/elmseditor/blob/master/src/zone.rs)

### Key Components

#### 1. Zone Scale Data Structure
```typescript
interface ZoneScaleData {
  name: string;          // Map name (e.g., "Aetherian Archive")
  mapId: number;         // Unique map identifier
  zoneId: number;        // Zone identifier (multiple maps can share)
  scaleFactor: number;   // Currently unused
  minX: number;          // Min X boundary (cm)
  maxX: number;          // Max X boundary (cm)
  minZ: number;          // Min Z boundary (cm)
  maxZ: number;          // Max Z boundary (cm)
  y?: number;            // Optional Y coordinate for height-based separation
}
```

#### 2. Coordinate Transformation Algorithm

**Input**: ESO world coordinates (centimeters)
**Output**: Arena coordinates (0-100 meters)

**Steps**:
1. **Lookup Zone Data**: Find zone scale data using `fight.gameZone.id` and `fight.maps[0].id`
2. **Normalize Coordinates**: Map from ESO world space to 0-1 range
   ```typescript
   normalizedX = (marker.x - minX) / (maxX - minX)
   normalizedZ = (marker.z - minZ) / (maxZ - minZ)
   ```
3. **Scale to Arena**: Map normalized coordinates to 100-meter arena
   ```typescript
   arenaX = normalizedX * 100
   arenaZ = normalizedZ * 100
   ```
4. **Handle Y Coordinate**: Scale Y relative to average range (no Y boundaries in zone data)
   ```typescript
   avgRange = (rangeX + rangeZ) / 2
   normalizedY = marker.y / avgRange
   arenaY = normalizedY * 100
   ```

### Example Transformation

**Aetherian Archive - First Island** (Zone 638, Map 642):
- Zone boundaries: minX=74309, maxX=112199, minZ=68450, maxZ=106340 (cm)
- Range: 37,890cm x 37,890cm

**Marker at ESO coords** (93,254cm, 50,000cm, 87,395cm):
```
normalizedX = (93254 - 74309) / (112199 - 74309) = 0.50
normalizedZ = (87395 - 68450) / (106340 - 68450) = 0.50
avgRange = 37890cm
normalizedY = 50000 / 37890 = 1.32

arenaX = 0.50 * 100 = 50m
arenaZ = 0.50 * 100 = 50m
arenaY = 1.32 * 100 = 132m (scaled relative to zone size)
```

## Files Modified

### 1. `src/features/fight_replay/components/MorMarkers.tsx`
**Changes**:
- Added `FightFragment` import for type definitions
- Added `ZONE_SCALE_DATA` and `ZoneScaleData` imports
- Added `fight: FightFragment` to component props
- Replaced generic normalization with zone scale data lookup
- Implemented coordinate transformation using zone boundaries

**Before**: Generic bounding box normalization
```typescript
// Find bounding box of all markers
const minX = Math.min(...markers.map(m => m.x));
const centerX = (minX + maxX) / 2;
const scaleFactor = targetSize / maxRange;
x: ((marker.x - centerX) * scaleFactor) / 100
```

**After**: Zone-based coordinate mapping
```typescript
// Lookup zone scale data
const zoneScaleData = ZONE_SCALE_DATA[zoneId].find(m => m.mapId === mapId);
const { minX, maxX, minZ, maxZ } = zoneScaleData;

// Map to 0-100 arena space
const normalizedX = (marker.x - minX) / (maxX - minX);
const arenaX = normalizedX * 100;
```

### 2. `src/features/fight_replay/components/Arena3D.tsx`
**Changes**:
- Added `FightFragment` import
- Added `fight: FightFragment` to `Arena3DProps` interface
- Added `fight` parameter to main component
- Added `fight` to Scene component props
- Passed `fight` to `MorMarkers` component

### 3. `src/features/fight_replay/components/FightReplay3D.tsx`
**Changes**:
- Passed `fight={selectedFight}` to Arena3D component

## Benefits

### 1. **Accuracy**
- Uses actual ESO zone boundaries instead of estimated bounding boxes
- Markers positioned based on real world space, not relative to each other
- Consistent positioning across different marker sets for the same zone

### 2. **Reliability**
- No dependency on marker distribution for coordinate transformation
- Single marker or many markers produce same coordinate mapping
- Handles edge cases where markers are clustered in one corner

### 3. **Maintainability**
- Leverages existing zone scale data infrastructure
- Single source of truth for zone boundaries
- Aligns with existing map texture rendering system

### 4. **Extensibility**
- Foundation for future features:
  - Multiple map support per fight
  - Height-based map separation using Y coordinates
  - Zone-specific coordinate adjustments

## Testing Validation

### Test Cases
1. **Hel Ra Citadel** (Zone 636, Map 614): Single large map
2. **Aetherian Archive** (Zone 638, Maps 640-645): Multiple island maps
3. **Sanctum Ophidia** (Zone 639, Maps 705-707): Complex layout
4. **Halls of Fabrication** (Zone 975): Map with negative coordinates

### Validation Points
- ✅ Zone data lookup succeeds for all test cases
- ✅ Coordinates map to 0-100 meter arena range
- ✅ No WebGL context crashes
- ✅ Markers render in expected positions
- ✅ TypeScript compilation passes with no errors

## Edge Cases Handled

### 1. Missing Zone Data
```typescript
if (!zoneMaps) {
  console.warn(`No zone scale data found for zone ID ${zoneId}`);
  return null;
}
```
**Fallback**: Markers not rendered, warning logged

### 2. Missing Map Data
```typescript
const mapData = zoneMaps.find((map) => map.mapId === mapId);
if (!mapData) {
  console.warn(`No map scale data found for zone ${zoneId}, map ${mapId}`);
  return null;
}
```
**Fallback**: Markers not rendered, warning logged

### 3. Missing Fight Data
```typescript
if (!fight.gameZone || !fight.maps || fight.maps.length === 0) {
  return null;
}
```
**Fallback**: Markers not rendered silently

### 4. Y Coordinate Scaling
Since zone data doesn't include Y boundaries, Y is scaled relative to the average of X/Z ranges:
```typescript
const avgRange = (rangeX + rangeZ) / 2;
const normalizedY = marker.y / avgRange;
const arenaY = normalizedY * 100;
```

## Future Enhancements

### 1. Multi-Map Support
Currently uses primary map (`fight.maps[0]`). Could be enhanced to:
- Detect which map markers belong to based on coordinates
- Support markers across multiple maps in a single fight
- Handle map transitions during encounters

### 2. Y-Coordinate Improvements
Zone data includes optional `y` parameter for some maps:
```typescript
{
  name: "Middle Level",
  mapId: 641,
  zoneId: 638,
  y: 50000.0  // Height-based separation
}
```
Could use this for more accurate vertical positioning.

### 3. Scale Factor Usage
Zone data includes `scaleFactor` that's currently unused:
```typescript
scaleFactor: 0.0000098844  // From elmseditor
```
Could investigate using this for additional coordinate refinement.

### 4. Coordinate Validation
Add validation to ensure transformed coordinates are within expected ranges:
```typescript
if (arenaX < 0 || arenaX > 100 || arenaZ < 0 || arenaZ > 100) {
  console.warn(`Marker outside arena bounds: ${arenaX}, ${arenaZ}`);
}
```

## Related Documentation
- `AI_SCRIBING_DETECTION_INSTRUCTIONS.md` - M0R Markers format and detection
- `M0R_MARKERS_IMPORT_FEATURE.md` - Original feature implementation
- `MOR_MARKERS_WEBGL_CRASH_FIX.md` - Previous coordinate normalization approach
- `zoneScaleData.ts` - Zone boundary definitions from elmseditor

## Technical Notes

### Arena Coordinate System
- Origin: (0, 0, 0) at bottom-left-back corner
- Range: 0-100 meters in X, Y, Z axes
- Camera positioned at (50, 50, 150) looking at (50, 0, 50)
- Grid: 10-meter cells, 50-meter sections

### ESO World Space
- Units: Centimeters
- Large absolute coordinates (typically 30,000-200,000 cm)
- Negative coordinates possible (e.g., Halls of Fabrication)
- Each zone/map has unique boundaries

### Zone Scale Data Source
From [sheumais/elmseditor](https://github.com/sheumais/elmseditor/blob/master/src/zone.rs):
```rust
// Example from elmseditor
Zone {
    name: "Aetherian Archive".to_string(),
    map_id: 642,
    zone_id: 638,
    scale_factor: 0.0000263922,
    min_x: 74309.0,
    max_x: 112199.0,
    min_z: 68450.0,
    max_z: 106340.0,
}
```

## Conclusion
This integration provides a robust, accurate coordinate transformation system for M0R Markers by leveraging existing zone scale data. The approach is more maintainable, extensible, and aligned with the application's existing architecture for map handling.
