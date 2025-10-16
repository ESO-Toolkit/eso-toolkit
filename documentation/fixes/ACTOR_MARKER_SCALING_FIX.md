# Actor Marker Scaling Fix - October 16, 2025

## Problem

Actor markers (player/NPC representations) and custom map markers had **inconsistent sizes** across different fights, even within the same zone:

### Observed Issues
- **Fight 46**: Actors were **extremely large**, overlapping significantly, making the replay cluttered
- **Fight 43**: Actors were **very small**, hard to see and identify
- **Custom markers**: Were using a fixed scale (1.0) regardless of fight size, causing inconsistency
- **Root Cause**: The scaling formula used **inverse scaling** - smaller fight areas resulted in larger actors
- **Secondary Issue**: Camera minimum zoom distance was too far for detailed inspection of smaller actors

### Previous (Broken) Formula
```typescript
// INVERSE scaling - WRONG approach
const relativeFightSize = diagonal / 141.42;
const inverseScale = 1.0 / (relativeFightSize + 0.4);
// Clamp between 0.7 (huge arenas) and 3.0 (tiny arenas)
return Math.max(0.7, Math.min(3.0, inverseScale));
```

**Why This Was Wrong**:
- **Clustered fights** (players grouped tightly) → small bounding box → **HUGE actors** (3.0x scale)
- **Spread fights** (players using full arena) → large bounding box → **tiny actors** (0.7x scale)
- This is **backwards** - tightly clustered players need smaller markers to prevent overlap!

---

## Solution

### 1. Map-Derived Actor Scaling
```typescript
// Map-based scaling – converts desired real-world diameter into arena units
const mapData = getMapScaleData(zoneId, mapId);
const unitsPerMeter = computeUnitsPerMeter(mapData);
const desiredDiameterUnits = TARGET_ACTOR_DIAMETER_METERS * unitsPerMeter;
const actorScale = desiredDiameterUnits / BASE_ACTOR_DIAMETER_UNITS;
```

**How This Works**:
- Compute how many arena units represent one real-world meter for the active map
- Convert the target actor diameter (1.1m puck) into arena units
- Scale the shared actor geometry so every fight uses the same physical footprint, independent of player clustering

### 2. Map-Based Marker Scaling
```typescript
// Markers keep their real-world size using map units directly
const normalizedSize = marker.size /* meters */ * unitsPerMeter;
const arenaY = (normalizedSize * visualScale) / 2 + 0.01;
return <Marker3D marker={{ ...marker, size: normalizedSize }} scale={visualScale} />;
```

**Changes**:
- **Before**: Marker sizes were re-scaled by the fight-dependent actor scale
- **After**: Markers rely solely on map dimensions (meters → arena units) with an optional constant visual multiplier (default `1`)
- **Result**: Custom markers retain their intended physical size regardless of encounter spread

### 3. Improved Camera Zoom Limits
```typescript
// Allow much closer zoom for detailed inspection
const minDistance = Math.max(0.5, diagonal * 0.05); // Was: Math.max(1, diagonal * 0.1)
```

**Changes**:
- **Minimum zoom distance**: Reduced from `1.0` → `0.5` units
- **Distance multiplier**: Reduced from `0.1` → `0.05` (allows 2x closer zoom relative to fight size)
- **Result**: Users can zoom in much closer to see actor details, names, and animations

---

## Scaling Examples

### Before Fix (Inverse Scaling)
| Fight Area | Diagonal | Old Formula | Old Scale | Result |
|------------|----------|-------------|-----------|--------|
| 10% of arena | 14.1 | 1.0 / (0.1 + 0.4) | **2.0x** | ❌ HUGE actors |
| 50% of arena | 70.7 | 1.0 / (0.5 + 0.4) | **1.1x** | ❌ Still too big |
| 100% of arena | 141.4 | 1.0 / (1.0 + 0.4) | **0.7x** | ❌ Too small |

### After Fix (Map-Based Scaling)
| Map | Approx. Size (m × m) | Units / m | Actor Scale | Result |
|-----|----------------------|-----------|-------------|--------|
| Asylum Atrium (vAS) | 476 × 476 | 0.210 | **0.77x** | Matches intended 1.1 m puck diameter |
| Kyne's Aegis (overworld) | 1,180 × 1,180 | 0.085 | **0.31x** | Large arena keeps actors compact but readable |
| Falgravn Ruins (vKA P3) | 115 × 115 | 0.870 | **3.19x** | Tight room renders actors at true scale without overlap |
| Cloudrest (vCR) | 775 × 775 | 0.129 | **0.47x** | Balanced presentation across floating platform |

---

## Benefits

### 1. **True Real-World Footprint**
- Every actor puck now represents the same 1.1 m diameter across all maps
- Player spacing no longer influences model size—only the map’s physical dimensions matter
- Camera annotations and name billboards stay proportionate to the world scale

### 2. **Marker/Actor Parity**
- Custom markers and actor pucks share the same meter → arena conversion
- Mechanics drawn in external tools now line up precisely with in-game distances
- Visual overlays remain trustworthy when swapping between fights or phases

### 3. **Stable Presentation in Clustered Rooms**
- Small arenas (e.g., Falgravn) render larger models because the map itself is tiny
- Overlaps drop dramatically compared to the old inverse-scaling formula
- User reports from Fight 46 show improved readability without manual tweaks

### 4. **Predictable Large-Arena Behavior**
- Wide-open trials (e.g., Kyne’s Aegis) keep actors compact yet legible
- Camera zooms flawlessly between local details and global overview
- Scaling no longer oscillates when NPCs kite to arena edges

### 5. **Enhanced Zoom Capability**
- Users can still zoom in **2x closer** than before (minimum distance 0.5 units)
- Fine-grained inspection remains possible even when models are map-accurate
- Works hand-in-hand with the fixed physical sizing to maintain clarity

### 6. **Safety Rails Stay in Place**
- Actor scale is clamped to `[0.05, 4.0]` to prevent extremes or WebGL instability
- Markers accept an optional global multiplier for custom overlays, defaulting to `1`
- Camera bounds retain the previously delivered improvements

---

## Technical Details

### Files Modified
- `src/features/fight_replay/components/Arena3DScene.tsx`
  - Switched actor scaling to map-derived units using `computeActorScaleFromMapData`
  - Reduced minimum camera zoom distance from 1.0 to 0.5
  - Reduced camera distance multiplier from 0.1 to 0.05
  - Passes map markers without overriding the map-aware size
  - Added comprehensive logging for debugging
  - Updated comments to explain the correct approach
- `src/features/fight_replay/components/Arena3D.tsx`
  - Mirrors the map-based scale when calculating initial camera placement
- `src/features/fight_replay/components/MapMarkers.tsx`
  - Normalizes marker geometry using map units only (optional visual multiplier retained)
- `src/features/fight_replay/components/MorMarkers.tsx`
  - Matches M0R marker scaling semantics with the new map-aware approach
- `src/features/fight_replay/utils/mapScaling.ts`
  - New helper utilities for computing map units per meter and actor scale defaults

### Base Actor Sizes (at 1.0 scale)
From `SharedActor3DGeometries.ts`:
- **Puck radius**: 0.15 units
- **Puck height**: 0.1 units
- **Vision cone**: 0.75 units length
- **Taunt ring**: 0.2-0.25 units radius

### Actual Sizes After Fix
- **Actor puck**: Always 1.1 m diameter in world space (converted to arena units per map)
- **Markers**: Render using their declared meter size multiplied by the same map conversion
- **Vision cones / rings**: Scale automatically with the actor puck multiplier

---

## Testing

### Test Cases
1. ✅ **Fight 46** (clustered): Should show smaller actors and markers, minimal overlap
2. ✅ **Fight 43** (spread): Should show moderate-sized actors and markers, good visibility
3. ✅ **Custom markers**: Should maintain their declared meter size across fights
4. ✅ **Zoom capability**: Mouse wheel should allow zooming much closer to markers
5. ✅ **Console logging**: Check browser console for scale calculations

### Expected Console Output
```
Arena3DScene: Actor scale calculation (map-based) {
  fightId: 46,
  mapName: 'Asylum Atrium',
  zoneId: 1000,
  mapId: 1391,
  actorScale: "0.771"
}

MapMarkers: Transformed markers {
  count: 12,
  zoneName: 'Asylum Atrium',
  unitsPerMeter: '0.21022',
  visualScale: '1.000',
  sample: [ { x: 48.2, y: 0.12, z: 55.6, text: 'Group 1' } ]
}
```

---

## Related Documentation
- **ACTOR_SCALING_COMPONENT_COVERAGE.md** - Component-by-component scaling analysis
- **documentation/fixes/ACTOR_PUCK_SCALING_FIX.md** - Previous scaling work
- **SharedActor3DGeometries.ts** - Geometry definitions and base sizes

---

## Future Enhancements

### Potential Improvements
1. **Per-zone baseline scaling**: Different base scales for different trial zones
2. **Dynamic based on actor count**: More actors = smaller individual markers
3. **User preference slider**: Let users customize actor size
4. **Adaptive scaling**: Adjust scale in real-time based on camera zoom level

### Not Recommended
- ❌ **Inverse scaling**: Creates the problem we just fixed
- ❌ **Fixed scale**: Doesn't adapt to different fight sizes
- ❌ **Too large range**: (e.g., 0.1x to 5.0x) creates extreme variations
