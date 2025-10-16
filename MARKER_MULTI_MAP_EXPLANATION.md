# M0R Markers Multi-Map Support

## The Problem

Many ESO trials have **multiple maps within the same zone**. For example, Kyne's Aegis (zone 1196) has 4 different maps:

1. **Map 1805**: "Kyne's Aegis" (Main arena) - 118,020 x 118,020 cm
2. **Map 1806**: "(Falgravn) Ruins" - 11,495 x 11,495 cm (underground, Y=21750)
3. **Map 1807**: "(Floor 2) Hidden Barrow" - 11,495 x 11,495 cm (underground, Y=14500)
4. **Map 1808**: "(Floor 3) Ritual Vault" - 11,495 x 11,495 cm (underground, Y=7070)

### Why This Matters

M0RMarkers encoding includes:
- ✅ **Zone ID** (e.g., 1196 for Kyne's Aegis)
- ❌ **No Map ID** (maps are determined by coordinate ranges)

The fight data includes:
- ✅ **Zone ID** (e.g., 1196)
- ✅ **Map ID** (e.g., 1805, 1806, 1807, or 1808)

### The Map Mismatch Problem

**Scenario**: You have markers for the underground Falgravn fight (Map 1806), but you're viewing a fight from the main arena (Map 1805).

**Previous behavior**:
```
❌ Map ID mismatch → Markers don't render → No feedback why
```

**New behavior**:
```
✅ Detects coordinate mismatch
✅ Searches for correct map by coordinates
✅ Renders markers with correct map data
✅ Logs helpful diagnostic information
```

## How Map Detection Works

### Step 1: Try Exact Map Match
First, we try to match the fight's map ID exactly:
```typescript
const mapData = zoneMaps.find((map) => map.mapId === mapId);
```

### Step 2: Coordinate-Based Detection
If no exact match, we check marker coordinates against all maps in the zone:
```typescript
const matchingMap = zoneMaps.find(map => 
  firstMarker.x >= map.minX && firstMarker.x <= map.maxX &&
  firstMarker.z >= map.minZ && firstMarker.z <= map.maxZ
);
```

### Step 3: Use Detected Map
If a coordinate match is found, we use that map's scale data for transformation:
```javascript
console.info('MorMarkers: Using detected map data instead of fight map');
return matchingMap; // Use this instead of returning null
```

## Your Specific Case

### Your Marker Coordinates
```
Minimum: 5e77:391b:25d2 (hex)
       = 24183:14619:9682 (decimal centimeters)
```

### Map Boundary Check

**Map 1805 (Main Arena)**:
- X range: 44399 - 162419 cm
- Z range: 35279 - 153299 cm
- Your marker X: **24183 cm** ❌ (below minimum of 44399)
- Your marker Z: **9682 cm** ❌ (below minimum of 35279)
- **Result**: Not in main arena

**Maps 1806/1807/1808 (Underground)**:
- X range: 19228 - 30723 cm
- Z range: 4337 - 15832 cm
- Your marker X: **24183 cm** ✅ (within range)
- Your marker Z: **9682 cm** ✅ (within range)
- **Result**: Markers are for underground maps!

### Which Underground Map?

The three underground maps have identical X/Z boundaries but different Y heights:
- **Map 1806**: Y = 21750 (top floor - Falgravn)
- **Map 1807**: Y = 14500 (middle floor)
- **Map 1808**: Y = 7070 (bottom floor)

Your markers likely correspond to **Map 1806 (Falgravn Ruins)** based on typical vKA progression.

## Console Output Examples

### Success with Auto-Detection

```javascript
MorMarkers: Successfully decoded 37 markers from zone 1196
MorMarkers: No map data found for mapId 1805 in zone 1196
MorMarkers: Available maps in this zone: [
  { mapId: 1805, name: "Kyne's Aegis", bounds: { x: [44399, 162419], z: [35279, 153299] } },
  { mapId: 1806, name: "(Falgravn) Ruins", bounds: { x: [19228, 30723], z: [4337, 15832] } },
  { mapId: 1807, name: "(Floor 2) Hidden Barrow", bounds: { x: [19228, 30723], z: [4337, 15832] } },
  { mapId: 1808, name: "(Floor 3) Ritual Vault", bounds: { x: [19228, 30723], z: [4337, 15832] } }
]
MorMarkers: First marker coordinates (raw): { x: 24183, y: 14619, z: 9682 }
MorMarkers: Markers appear to be for map 1806 "(Falgravn) Ruins" but fight is on map 1805
MorMarkers: Using detected map data instead of fight map for coordinate transformation
MorMarkers: Transformed marker sample (first 3): [...]
MorMarkers: Rendering 37 markers with scale 1
```

### Exact Match (No Auto-Detection Needed)

```javascript
MorMarkers: Successfully decoded 37 markers from zone 1196
MorMarkers: Found zone scale data { zoneName: "Kyne's Aegis", zoneId: 1196, mapId: 1805 }
MorMarkers: Transformed marker sample (first 3): [...]
MorMarkers: Rendering 37 markers with scale 1
```

## Benefits of Smart Detection

### Before
- ❌ Silent failure when map IDs don't match
- ❌ Markers don't render even if in correct zone
- ❌ No feedback about why markers aren't showing
- ❌ Users confused about coordinate systems

### After
- ✅ Automatic detection based on coordinates
- ✅ Markers render even with map ID mismatch
- ✅ Detailed logging explains what's happening
- ✅ Shows available maps and coordinate ranges
- ✅ Identifies which map markers belong to

## Testing Your Markers

### Test 1: Load in Main Arena Fight (Map 1805)
**Expected**: Auto-detection triggers
```
1. Navigate to any vKA main arena fight
2. Load your marker string
3. Console should show: "Markers appear to be for map 1806"
4. Markers should render with correct coordinates
```

### Test 2: Load in Falgravn Fight (Map 1806)
**Expected**: Exact match works
```
1. Navigate to Falgravn (underground) fight
2. Load your marker string
3. Console should show: "Found zone scale data { zoneName: '(Falgravn) Ruins' }"
4. Markers render immediately
```

### Test 3: Load in Wrong Zone (e.g., vAS)
**Expected**: Graceful failure with explanation
```
1. Navigate to vAS fight (zone 1000)
2. Load your marker string (zone 1196)
3. Markers don't render (zone mismatch is intentional safety feature)
4. Console shows zone mismatch
```

## Coordinate Transformation

The system uses different scale factors for each map:

```typescript
Map 1805 (Main): scaleFactor = 0.0000084731  (large area)
Map 1806 (Ruins): scaleFactor = 0.0000978474 (small area, ~11.5x tighter)
```

This ensures:
- Main arena markers are appropriately sized for the large space
- Underground markers are appropriately sized for the tight quarters
- Coordinate transformation maintains proper proportions

## Limitations

### Y-Coordinate Ambiguity
The three underground maps (1806, 1807, 1808) have identical X/Z boundaries. They're differentiated by Y-coordinate:
- Map 1806: Y = 21750
- Map 1807: Y = 14500  
- Map 1808: Y = 7070

If your markers don't have distinct Y-coordinates, the system picks the **first matching map** based on X/Z coordinates (which would be Map 1806).

### Cross-Map Markers
If you have markers that span multiple maps (e.g., some in main arena, some underground), they won't render correctly because:
- Each marker string has one zone
- The system selects one map's scale data
- Markers outside that map's boundaries may render at incorrect positions

**Solution**: Create separate marker strings for each map.

## Future Enhancements

Potential improvements:

1. **Multi-Map Support**: Allow a single marker string to specify different maps for different markers
2. **Y-Coordinate Detection**: Use marker Y-coordinates to distinguish between underground floors
3. **Visual Warnings**: Show UI notification when using auto-detected map
4. **Map Switching**: Allow users to manually select which map to use for transformation
5. **Coordinate Preview**: Show marker positions on a 2D map before loading into 3D view

## Summary

**Your markers are for one of the underground maps in Kyne's Aegis**, not the main arena. The new smart detection system will:

1. Detect that coordinates don't match the fight's map
2. Search all maps in zone 1196
3. Find that coordinates match maps 1806/1807/1808
4. Use the correct map's scale data for transformation
5. Render markers at the proper positions
6. Log detailed information about the detection process

This means your markers should now render correctly even if the fight is on a different map within the same zone! 🎯
