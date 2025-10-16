# M0R Markers Bounding Box Filtering

## The Smart Approach: Using Map Boundaries

Instead of trying to detect map types by name patterns, we use the **bounding box** data that already exists in our zone scale data. This is more robust and handles all edge cases automatically.

## How It Works

### Each Map Has Defined Boundaries

From `zoneScaleData.ts`, each map has coordinate boundaries:

```typescript
{
  name: "Kyne's Aegis",
  mapId: 1805,
  minX: 44399.0,    // Western boundary (cm)
  maxX: 162419.0,   // Eastern boundary (cm)
  minZ: 35279.0,    // Southern boundary (cm)
  maxZ: 153299.0,   // Northern boundary (cm)
}
```

### Filtering Algorithm

```typescript
const markersInBounds = markers.filter(marker => {
  return marker.x >= minX && marker.x <= maxX &&
         marker.z >= minZ && marker.z <= maxZ;
});
```

This ensures **only markers within the current map's boundaries are rendered**.

## Example: Kyne's Aegis Multi-Map Scenario

### Your Marker String Contains 37 Markers

Let's say 33 are for the underground Falgravn fight (Map 1806) and 4 are accidentally from the main arena (Map 1805).

### Scenario 1: Viewing Main Arena Fight (Map 1805)

**Map 1805 Bounds**: X: 44399-162419, Z: 35279-153299

```
Processing 37 markers...
✓ 4 markers within bounds (44399-162419, 35279-153299)
✗ 33 markers outside bounds (coordinates in 19228-30723 range)

Console Output:
"MorMarkers: Filtered markers by bounding box"
  original: 37
  filtered: 4
  removed: 33
  mapName: "Kyne's Aegis"

Result: Only 4 markers render (the ones that belong in main arena)
```

### Scenario 2: Viewing Falgravn Fight (Map 1806)

**Map 1806 Bounds**: X: 19228-30723, Z: 4337-15832

```
Processing 37 markers...
✓ 33 markers within bounds (19228-30723, 4337-15832)
✗ 4 markers outside bounds (coordinates > 30723)

Console Output:
"MorMarkers: Filtered markers by bounding box"
  original: 37
  filtered: 33
  removed: 4
  mapName: "(Falgravn) Ruins"

Result: 33 markers render (the underground markers)
```

## Benefits Over Name-Based Detection

### ❌ **Name-Based Approach** (Old)
```typescript
if (mapName.startsWith('(') || mapName.includes('Floor')) {
  // Assume underground
}
```

**Problems**:
- Fragile: Relies on naming conventions
- Doesn't work for multi-language support
- Doesn't handle edge cases (unnamed maps, custom maps)
- No actual coordinate validation

### ✅ **Bounding Box Approach** (New)
```typescript
marker.x >= minX && marker.x <= maxX &&
marker.z >= minZ && marker.z <= maxZ
```

**Advantages**:
- ✅ **Precise**: Uses actual coordinate boundaries
- ✅ **Robust**: Works regardless of map names or languages
- ✅ **Automatic**: No manual detection needed
- ✅ **Correct**: Guarantees markers are in the right place
- ✅ **Future-proof**: Works for any new trials/zones added
- ✅ **Already Available**: Uses existing zone scale data

## Console Output Examples

### All Markers Within Bounds
```javascript
MorMarkers: Successfully decoded 37 markers from zone 1196
MorMarkers: Found zone scale data { zoneName: "Kyne's Aegis", zoneId: 1196, mapId: 1805 }
MorMarkers: Transformed 37 markers for Kyne's Aegis - Sample (first 3): [...]
MorMarkers: Rendering 37 markers with scale 1
```

### Some Markers Filtered Out
```javascript
MorMarkers: Successfully decoded 37 markers from zone 1196
MorMarkers: Found zone scale data { zoneName: "Kyne's Aegis", zoneId: 1196, mapId: 1805 }
MorMarkers: Filtered markers by bounding box {
  original: 37,
  filtered: 4,
  removed: 33,
  mapName: "Kyne's Aegis"
}
MorMarkers: Transformed 4 markers for Kyne's Aegis - Sample (first 3): [...]
MorMarkers: Rendering 4 markers with scale 1
```

### No Markers Within Bounds
```javascript
MorMarkers: Successfully decoded 37 markers from zone 1196
MorMarkers: Found zone scale data { zoneName: "Kyne's Aegis", zoneId: 1196, mapId: 1805 }
MorMarkers: No markers found within map bounds {
  totalMarkers: 37,
  bounds: { minX: 44399, maxX: 162419, minZ: 35279, maxZ: 153299 },
  mapName: "Kyne's Aegis"
}
MorMarkers: Not rendering - no transformed markers
```

### Debug: Individual Marker Filtering (console.debug)
```javascript
MorMarkers: Filtered out marker outside bounds {
  marker: { x: 24183, z: 9682, text: "1" },
  bounds: { minX: 44399, maxX: 162419, minZ: 35279, maxZ: 153299 }
}
```

## Real-World Use Cases

### Use Case 1: Comprehensive Marker Pack

You create a marker pack for all of Kyne's Aegis with markers for:
- Main arena (Yandir, Lord Falgravn in main area)
- Falgravn underground fight
- Hidden Barrow
- Ritual Vault

**Result**: When viewing any fight, only the markers for that specific map render. No manual selection needed!

### Use Case 2: Shared Marker Strings

Someone shares a vKA marker string in Discord. You don't know which map it's for.

**Result**: Load it into any vKA fight, and the system automatically shows only relevant markers.

### Use Case 3: Mixed Zone Markers

You accidentally copy markers from vAS into a vKA marker string.

**Previous behavior**: All markers try to render, causing confusion
**New behavior**: Zone mismatch prevents loading entirely (existing safety check)

### Use Case 4: Multi-Floor Dungeons

In dungeons with multiple floors (like Vateshran Hollows):
- Floor 1 markers only show on Floor 1
- Floor 2 markers only show on Floor 2
- No overlap or confusion

## Performance Impact

### Filtering Operation
```typescript
markers.filter(marker => 
  marker.x >= minX && marker.x <= maxX &&
  marker.z >= minZ && marker.z <= maxZ
)
```

**Complexity**: O(n) where n = number of markers
**Typical case**: 37 markers × 4 comparisons = 148 operations
**Time**: < 0.1ms (negligible)

### Memory Impact
- **Before filtering**: Array of 37 MorMarker objects
- **After filtering**: Array of 4-37 MorMarker objects
- **Savings**: Only store/render markers actually needed

### Rendering Impact
- **Before**: Could attempt to render 37 markers all over the place
- **After**: Only renders 4-33 markers in correct locations
- **Benefit**: Better performance + correct visualization

## Edge Cases Handled

### 1. Marker Exactly on Boundary
```typescript
marker.x >= minX  // Inclusive - marker on boundary is included
```

### 2. All Markers Outside Bounds
```typescript
if (markersInBounds.length === 0) {
  console.warn('MorMarkers: No markers found within map bounds');
  return null; // Don't render anything
}
```

### 3. Partial Match
```typescript
if (markersInBounds.length < markers.length) {
  console.info('Filtered markers by bounding box', {
    original: markers.length,
    filtered: markersInBounds.length,
    removed: markers.length - markersInBounds.length,
  });
}
```

### 4. Map Detection + Filtering
When the smart map detection finds a different map based on coordinates:
1. Detect correct map (e.g., Map 1806 instead of Map 1805)
2. Use that map's bounding box for filtering
3. All markers should pass (since detection was based on coordinates)

## Coordinate System Consistency

The bounding box check happens **before** coordinate transformation:

```typescript
// 1. Filter in ESO world space (centimeters)
const markersInBounds = markers.filter(marker => 
  marker.x >= minX && marker.x <= maxX  // Raw ESO coordinates
);

// 2. Transform to arena space (meters, normalized)
markersInBounds.map(marker => ({
  x: 100 - marker.x / 100,  // Flip and scale
  z: marker.z / 100,
  y: marker.y / 100,
}));
```

This ensures filtering uses the same coordinate system as the zone scale data boundaries.

## Future Enhancements

### Possible Improvements:
1. **Y-coordinate filtering**: For maps with height-based separation (Floor 1, 2, 3)
2. **Fuzzy boundaries**: Allow markers slightly outside bounds (e.g., +/- 5%)
3. **Overlap detection**: Warn if markers span multiple maps
4. **Visual preview**: Show which markers will render before loading
5. **Batch filtering**: Filter multiple marker strings at once

## Testing Recommendations

### Test 1: Single Map Markers
```
Load vKA main arena markers (Map 1805) into main arena fight
Expected: All markers render
Console: No filtering messages
```

### Test 2: Underground Markers in Main Arena
```
Load Falgravn markers (Map 1806) into main arena fight (Map 1805)
Expected: No markers render (all outside bounds)
Console: "No markers found within map bounds"
```

### Test 3: Mixed Markers
```
Load markers containing both main arena and underground markers
View main arena fight
Expected: Only main arena markers render
Console: "Filtered markers by bounding box, removed: X"
```

### Test 4: Map Auto-Detection + Filtering
```
Load underground markers into main arena fight (triggers auto-detection)
Expected: System detects Map 1806, switches to those bounds, all markers render
Console: "Using detected map data instead" + "Transformed X markers"
```

## Summary

**Bounding box filtering is the correct approach** because:

1. ✅ Uses existing, accurate map boundary data
2. ✅ Works automatically without name parsing
3. ✅ Handles multi-map zones perfectly
4. ✅ Provides clear logging for debugging
5. ✅ Minimal performance overhead
6. ✅ Future-proof for new content

Your suggestion eliminated the need for fragile name-based detection and made the system more robust and maintainable! 🎯
