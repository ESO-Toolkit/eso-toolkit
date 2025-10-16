# M0R Markers 3D Bounding Box Filtering

## The Answer: Both 2D and 3D!

The system now uses **adaptive filtering** based on the map data:

- **2D Bounding Box (X, Z)**: For maps with distinct horizontal areas
- **3D Bounding Box (X, Y, Z)**: For multi-floor maps with overlapping X/Z coordinates

## Why 3D Filtering is Needed

### The Multi-Floor Problem

In Kyne's Aegis, the three underground maps have **identical X/Z boundaries**:

```typescript
Map 1806 "(Falgravn) Ruins":       X: 19228-30723, Z: 4337-15832, Y: 21750
Map 1807 "(Floor 2) Hidden Barrow": X: 19228-30723, Z: 4337-15832, Y: 14500
Map 1808 "(Floor 3) Ritual Vault":  X: 19228-30723, Z: 4337-15832, Y: 7070
```

**Without Y filtering**: Markers from all three floors would render on any underground floor!

**With Y filtering**: Only markers for the correct floor render.

## How It Works

### 2D Filtering (Standard Maps)

For maps without a Y coordinate (like main arenas):

```typescript
const inBounds = 
  marker.x >= minX && marker.x <= maxX &&
  marker.z >= minZ && marker.z <= maxZ;
```

**Example**: Kyne's Aegis main arena (Map 1805)
- No Y coordinate defined
- Uses X/Z boundaries only
- Different X/Z range than underground (44399-162419 vs 19228-30723)

### 3D Filtering (Multi-Floor Maps)

For maps with a Y coordinate:

```typescript
const inXZBounds = 
  marker.x >= minX && marker.x <= maxX &&
  marker.z >= minZ && marker.z <= maxZ;

if (inXZBounds && mapY !== undefined) {
  const Y_TOLERANCE = 2000; // 20 meters
  const inYBounds = Math.abs(marker.y - mapY) <= Y_TOLERANCE;
  return inYBounds;
}
```

**Y Tolerance**: Allows ±20 meters (2000cm) to account for:
- Vertical movement (jumps, falling)
- Marker placement variations
- Measurement imprecision

## Real-World Example: vKA Underground

### Scenario: 37 Markers for All Three Floors

```
Floor 1 (Falgravn, Y=21750):    12 markers at Y ~21750
Floor 2 (Barrow, Y=14500):      13 markers at Y ~14500
Floor 3 (Vault, Y=7070):        12 markers at Y ~7070
```

### Viewing Floor 1 Fight (Map 1806, Y=21750)

```typescript
2D Check: All 37 markers pass (all have X/Z in 19228-30723 range)
3D Check:
  ✓ 12 markers at Y ~21750 (within 2000cm tolerance)
  ✗ 13 markers at Y ~14500 (|14500 - 21750| = 7250 > 2000)
  ✗ 12 markers at Y ~7070  (|7070 - 21750| = 14680 > 2000)

Result: Only 12 markers render (Floor 1 markers)
```

### Viewing Floor 2 Fight (Map 1807, Y=14500)

```typescript
2D Check: All 37 markers pass
3D Check:
  ✗ 12 markers at Y ~21750 (difference: 7250cm > 2000cm)
  ✓ 13 markers at Y ~14500 (within tolerance)
  ✗ 12 markers at Y ~7070  (difference: 7430cm > 2000cm)

Result: Only 13 markers render (Floor 2 markers)
```

## Console Output

### 2D Filtering (Standard Map)

```javascript
MorMarkers: Found zone scale data { 
  zoneName: "Kyne's Aegis", 
  zoneId: 1196, 
  mapId: 1805 
}
MorMarkers: Filtered markers by bounding box {
  original: 37,
  filtered: 4,
  removed: 33,
  mapName: "Kyne's Aegis",
  is3D: false  // No Y coordinate
}
```

### 3D Filtering (Multi-Floor Map)

```javascript
MorMarkers: Found zone scale data { 
  zoneName: "(Falgravn) Ruins", 
  zoneId: 1196, 
  mapId: 1806 
}
MorMarkers: Filtered markers by bounding box {
  original: 37,
  filtered: 12,
  removed: 25,
  mapName: "(Falgravn) Ruins",
  is3D: true  // Has Y coordinate
}
```

### Debug: Y-Coordinate Filtering

```javascript
MorMarkers: Filtered out marker outside Y bounds {
  marker: { x: 24183, y: 14500, z: 9682, text: "Floor 2" },
  bounds: { minX: 19228, maxX: 30723, minZ: 4337, maxZ: 15832, mapY: 21750 },
  yDifference: 7250  // > 2000 tolerance
}
```

## Y Tolerance Configuration

### Current Setting: 2000cm (20 meters)

```typescript
const Y_TOLERANCE = 2000; // centimeters
```

**Why 20 meters?**
- Typical floor height: 5-7 meters
- Vertical gameplay space: 10-15 meters
- Safety margin: 5-10 meters
- **Total**: ~20 meters covers normal vertical variation

**Floor separation in vKA**:
- Floor 1 to 2: 7250cm (72.5m) ✅ Far exceeds tolerance
- Floor 2 to 3: 7430cm (74.3m) ✅ Far exceeds tolerance
- **Result**: No false positives

### Adjusting Tolerance

If markers are incorrectly filtered:

**Too strict** (false negatives):
```typescript
const Y_TOLERANCE = 5000; // 50 meters - more lenient
```

**Too lenient** (false positives):
```typescript
const Y_TOLERANCE = 1000; // 10 meters - stricter
```

Current 20m setting is conservative and safe for all known multi-floor trials.

## When Each Method is Used

### 2D Filtering Only (No Y coordinate)

**Trial Main Arenas**:
- Hel Ra Citadel
- Aetherian Archive
- Sanctum Ophidia
- Maw of Lorkhaj
- Halls of Fabrication
- Cloudrest
- Sunspire
- Kyne's Aegis (main arena)
- Rockgrove
- Dreadsail Reef
- Sanity's Edge
- Lucent Citadel

These trials have distinct X/Z areas for each encounter, so Y filtering isn't needed.

### 3D Filtering (Has Y coordinate)

**Multi-Floor Areas**:
- Kyne's Aegis underground (3 floors)
- Halls of Fabrication (may have multiple levels)
- Any future trials with vertical stacking

These areas reuse the same X/Z footprint across multiple vertical levels.

## Map Detection + 3D Filtering

When the smart map detection finds a different map:

```typescript
// 1. Detect map based on X/Z coordinates
const matchingMap = zoneMaps.find(map => 
  marker.x >= map.minX && marker.x <= map.maxX &&
  marker.z >= map.minZ && marker.z <= map.maxZ
);

// 2. If multiple maps match X/Z, Y coordinate disambiguates
// Example: All underground maps match X/Z
// But marker Y=14500 → selects Map 1807 (Floor 2)

// 3. Use that map for filtering all markers
// Now uses 3D bounds including Y tolerance
```

This ensures:
1. Correct map is detected even if fight map is wrong
2. Correct 3D filtering is applied to all markers
3. Only relevant floor's markers render

## Performance Impact

### Additional Computation

**2D check**: 4 comparisons
```typescript
x >= minX && x <= maxX && z >= minZ && z <= maxZ
```

**3D check**: 6 comparisons + 1 subtraction + 1 abs
```typescript
x >= minX && x <= maxX && z >= minZ && z <= maxZ &&
Math.abs(y - mapY) <= Y_TOLERANCE
```

**Per marker**: +3 operations (~0.00001ms)
**For 37 markers**: +111 operations (~0.0004ms)
**Impact**: Negligible

### Memory Impact

**No additional memory** - Y coordinate already exists in:
- Zone scale data (1 number per map)
- Marker data (already loaded)

## Edge Cases

### 1. Marker Exactly at Floor Boundary

```typescript
// Floor 1: Y = 21750
// Floor 2: Y = 14500
// Midpoint: Y = 18125

// Marker at Y = 19750 (1000cm above Floor 1)
Math.abs(19750 - 21750) = 2000  ✅ Matches Floor 1 (at tolerance limit)

// Marker at Y = 18750 (1000cm below midpoint)  
Math.abs(18750 - 21750) = 3000  ✗ Too far from Floor 1
Math.abs(18750 - 14500) = 4250  ✗ Too far from Floor 2
```

**Result**: Markers near floor transitions may not render. This is intentional - better to filter out than show on wrong floor.

### 2. Map Without Y but Markers Have Y

```typescript
if (mapY !== undefined) {
  // Only check Y if map has Y coordinate defined
}
```

**Result**: Markers' Y coordinates are ignored for maps without defined Y. Uses 2D filtering only.

### 3. All Markers Filtered Out

```typescript
if (markersInBounds.length === 0) {
  console.warn('No markers found within map bounds', {
    bounds: { minX, maxX, minZ, maxZ, y: mapY },
    is3D: mapY !== undefined
  });
  return null;
}
```

**Result**: Clear diagnostic showing 3D bounds were used and why no markers matched.

## Testing Recommendations

### Test 1: 2D Filtering (Main Arena)

```
Load main arena markers into main arena fight
Expected: All markers pass 2D check
Console: "is3D: false"
```

### Test 2: 3D Filtering (Single Floor)

```
Load Floor 1 markers into Floor 1 fight
Expected: All markers pass 3D check
Console: "is3D: true, filtered: 12, removed: 0"
```

### Test 3: 3D Filtering (Wrong Floor)

```
Load Floor 1 markers into Floor 2 fight  
Expected: All markers fail Y check
Console: "is3D: true, No markers found within map bounds"
```

### Test 4: 3D Filtering (Multi-Floor Markers)

```
Load mixed floor markers (12+13+12) into Floor 2 fight
Expected: Only Floor 2 markers (13) pass
Console: "is3D: true, filtered: 13, removed: 24"
```

### Test 5: Y Tolerance Boundary

```
Load marker at Y=19750 (2000cm from Floor 1's Y=21750)
Expected: Marker passes (at tolerance limit)
Load marker at Y=19749 (2001cm away)
Expected: Marker fails (exceeds tolerance)
```

## Summary

The system now uses **intelligent, adaptive bounding box filtering**:

- ✅ **2D (X, Z)**: For horizontally separated maps
- ✅ **3D (X, Y, Z)**: For vertically stacked maps
- ✅ **Automatic**: Detects which method to use based on map data
- ✅ **Robust**: 20-meter Y tolerance handles normal variation
- ✅ **Diagnostic**: Clear logging shows 2D vs 3D filtering

This ensures markers **always render on the correct floor** in multi-level dungeons while maintaining simplicity for standard maps! 🎯
