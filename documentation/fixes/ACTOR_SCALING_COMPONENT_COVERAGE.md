# Actor Scaling - Complete Component Coverage

**Date**: October 15, 2025  
**Question**: Does the actor puck scaling fix also apply to taunt markers, selection markers, actor billboards, etc?  
**Answer**: ✅ **YES** - All actor-related components scale together!

---

## Scale Propagation Flow

The `actorScale` calculated in `Arena3DScene.tsx` propagates through **all** actor visual elements:

```
Arena3DScene.tsx
    ↓ actorScale = 1.0 / (relativeFightSize + 0.4)
AnimationFrameSceneActors
    ↓ scale={actorScale}
AnimationFrameActor3D
    ↓ useSharedActor3DGeometries(scale)
    ├─→ Puck Geometry (cylinder) ✅
    ├─→ Vision Cone Geometry ✅
    ├─→ Taunt Ring Geometry ✅
    ├─→ Selection Ring Geometry ✅
    └─→ ActorNameBillboard (scale prop) ✅
```

---

## ✅ Components That Scale

### 1. **Actor Puck** (Main Body)
**File**: `SharedActor3DGeometries.ts` (lines 67-72)
```typescript
const puckGeometry = new THREE.CylinderGeometry(
  PUCK_RADIUS * scale,  // ← Scales with arena size
  PUCK_RADIUS * scale,  // ← Scales with arena size
  PUCK_HEIGHT * scale,  // ← Scales with arena size
  PUCK_RADIAL_SEGMENTS,
);
```
- Base size: 0.15 radius, 0.1 height
- Small arena (scale=2.1x): **0.315 radius, 0.21 height** ✅
- Large arena (scale=0.7x): **0.105 radius, 0.07 height** ✅

---

### 2. **Vision Cone** (Direction Indicator)
**File**: `SharedActor3DGeometries.ts` (lines 74-101)
```typescript
const coneRadius = VISION_CONE_LENGTH * scale * Math.tan(VISION_CONE_ANGLE);
const coneLength = VISION_CONE_LENGTH * scale;  // ← Scales with arena size

const vertices = new Float32Array([
  0, 0, -PUCK_RADIUS * scale,  // ← Tip scales
  -coneRadius, 0, coneLength - PUCK_RADIUS * scale,  // ← Width scales
  coneRadius, 0, coneLength - PUCK_RADIUS * scale,   // ← Width scales
  // ...
]);
```
- Base size: 0.75 length, 30° angle
- Small arena (scale=2.1x): **1.575 length** ✅
- Large arena (scale=0.7x): **0.525 length** ✅

---

### 3. **Taunt Ring** (Red Ring Around Actor)
**File**: `SharedActor3DGeometries.ts` (lines 103-107)
```typescript
const tauntRingGeometry = new THREE.RingGeometry(
  TAUNT_RING_INNER_RADIUS * scale,  // ← Scales with arena size
  TAUNT_RING_OUTER_RADIUS * scale,  // ← Scales with arena size
  16,
);
```
- Base size: 0.20 inner, 0.25 outer radius
- Small arena (scale=2.1x): **0.42 inner, 0.525 outer** ✅
- Large arena (scale=0.7x): **0.14 inner, 0.175 outer** ✅

**Visibility**: Only shown when `actor.isTaunted === true`

---

### 4. **Selection Ring** (Yellow Ring When Actor Selected)
**File**: `AnimationFrameActor3D.tsx` (lines 82-86)
```typescript
const selectionRingGeometry = useMemo(() => {
  const innerRadius = (PUCK_RADIUS + 0.2) * scale;  // ← Scales with arena size
  const outerRadius = (PUCK_RADIUS + 0.4) * scale;  // ← Scales with arena size
  return new THREE.RingGeometry(innerRadius, outerRadius, 32);
}, [scale]);
```
- Base size: 0.35 inner, 0.55 outer radius
- Small arena (scale=2.1x): **0.735 inner, 1.155 outer** ✅
- Large arena (scale=0.7x): **0.245 inner, 0.385 outer** ✅

**Visibility**: Only shown when actor is clicked/selected

---

### 5. **Actor Name Billboard** (Text Label Above Actor)
**File**: `ActorNameBillboard.tsx` (lines 213, 242, 251)

#### Height Offset Scales:
```typescript
groupRef.current.position.set(0, BILLBOARD_HEIGHT_OFFSET * scale, 0);
```
- Base offset: 0.35 units above puck
- Small arena (scale=2.1x): **0.735 units** ✅
- Large arena (scale=0.7x): **0.245 units** ✅

#### Billboard Size Scales:
```typescript
const scaleFactor = Math.max(0.5, Math.min(2.0, distanceToCamera / baseDistance)) * scale;
groupRef.current.scale.setScalar(scaleFactor);
```
- Applies actor scale to billboard size
- Also scales based on camera distance for readability
- Small arena (scale=2.1x): **2.1x larger billboards** ✅
- Large arena (scale=0.7x): **0.7x smaller billboards** ✅

---

## Scale Calculation Summary

### Current Formula (After Fix)
```typescript
const diagonal = Math.sqrt(rangeX * rangeX + rangeZ * rangeZ);
const relativeFightSize = diagonal / 141.42;
const inverseScale = 1.0 / (relativeFightSize + 0.4);
return Math.max(0.7, Math.min(3.0, inverseScale));
```

### Scale Examples for All Components

| Arena Size | Diagonal | Scale | Puck Size | Vision Cone | Taunt Ring | Selection Ring | Billboard Height |
|------------|----------|-------|-----------|-------------|------------|----------------|------------------|
| **Tiny**   | 10 units | 2.13x | 0.32 radius | 1.60 length | 0.53 outer | 1.17 outer | 0.75 units |
| **Small**  | 20 units | 1.85x | 0.28 radius | 1.39 length | 0.46 outer | 1.02 outer | 0.65 units |
| **Medium** | 50 units | 1.33x | 0.20 radius | 1.00 length | 0.33 outer | 0.73 outer | 0.47 units |
| **Normal** | 70 units | 1.11x | 0.17 radius | 0.83 length | 0.28 outer | 0.61 outer | 0.39 units |
| **Large**  | 100 units| 0.90x | 0.14 radius | 0.68 length | 0.23 outer | 0.50 outer | 0.32 units |
| **Huge**   | 141 units| 0.71x | 0.11 radius | 0.53 length | 0.18 outer | 0.39 outer | 0.25 units |

---

## Why This Works Perfectly

### 1. **Shared Geometry System**
All geometries are created by `SharedActor3DGeometries` with the **same scale parameter**:
- Puck, vision cone, and taunt ring all use the same scale multiplier
- Cached per scale value for performance
- Ensures visual consistency across all elements

### 2. **Selection Ring Uses Same Scale**
Created in `AnimationFrameActor3D` with the **same scale prop**:
- Uses same `PUCK_RADIUS` constant as base size
- Applies same scale multiplier
- Stays proportional to puck size

### 3. **Billboard Scales Intelligently**
- **Height offset** scales with actor size (stays relative to puck)
- **Billboard size** scales with actor size (stays proportional)
- **Distance scaling** also applied for readability at different zoom levels

### 4. **Single Source of Truth**
The scale calculation happens **once** in `Arena3DScene.tsx`:
- All components receive the **same scale value**
- No conflicting scaling logic
- Consistent visual appearance across all actor elements

---

## Visual Consistency Guarantee

Because **all** actor-related components use the **same scale parameter**, they maintain perfect proportions:

```
Small Arena (2.1x scale):
┌────────────────────┐
│   Billboard 2.1x   │
└─────────┬──────────┘
          │ (Height: 0.75 units)
    ┌─────▼─────┐
    │Selection  │ (1.17 outer)
    │  ┌───┐    │
    │  │ ● │    │ (Puck: 0.32 radius)
    │  └───┘    │
    │   Vision  │ (1.60 length)
    │    Cone   │
    └───────────┘

Large Arena (0.7x scale):
┌─────────┐
│Billboard│ (0.7x)
└────┬────┘
     │ (Height: 0.25 units)
  ┌──▼──┐
  │Ring │ (0.39 outer)
  │ ┌─┐ │
  │ │●│ │ (Puck: 0.11 radius)
  │ └─┘ │
  │Cone │ (0.53 length)
  └─────┘
```

---

## ❌ Components That DON'T Scale

### 1. **MoR Markers**
**File**: `MorMarkers.tsx`
- Uses **separate scale prop** (default: 1)
- Independent of actor scale
- Designed for raid/dungeon mechanics visualization
- Could be connected to actor scale if desired (future enhancement)

### 2. **Boss Health HUD**
**File**: `BossHealthHUD.tsx`
- Fixed position in corner of screen
- Uses its own scaling logic
- Independent of actor scale

### 3. **Arena Grid**
**File**: `Arena3DScene.tsx`
- Fixed 100x100 arena size
- Cell size based on arena dimensions, not actor scale
- Independent of actor scale

### 4. **Map Textures**
**File**: `DynamicMapTexture.tsx`
- Fixed to arena dimensions
- Independent of actor scale

---

## Testing Checklist

To verify all components scale together:

### Visual Tests
- [ ] Small arena: All actor elements are **2-3x larger**
  - [ ] Puck is clearly visible
  - [ ] Vision cone is proportionally larger
  - [ ] Taunt ring (when active) is proportionally larger
  - [ ] Selection ring (when selected) is proportionally larger
  - [ ] Billboard text is higher above actor and larger
  
- [ ] Large arena: All actor elements are **0.7-0.9x smaller**
  - [ ] Puck is appropriately sized
  - [ ] Vision cone is proportionally smaller
  - [ ] Taunt ring (when active) is proportionally smaller
  - [ ] Selection ring (when selected) is proportionally smaller
  - [ ] Billboard text is proportionally positioned

### Interaction Tests
- [ ] Click actor to select → Selection ring appears at correct scale
- [ ] Actor gets taunted → Taunt ring appears at correct scale
- [ ] Toggle actor names → Billboards appear at correct height/scale
- [ ] Zoom camera in/out → Distance-based billboard scaling works
- [ ] Rotate camera → All elements maintain correct orientation

---

## Conclusion

✅ **YES** - The actor puck scaling fix applies to **ALL** actor-related visual components:

1. **Puck** (main body) ✅
2. **Vision Cone** (direction indicator) ✅
3. **Taunt Ring** (red ring around actor) ✅
4. **Selection Ring** (yellow ring when selected) ✅
5. **Actor Name Billboard** (text label) ✅

All components scale **together** because they all receive the **same scale parameter** from `Arena3DScene.tsx`. This ensures perfect visual consistency and proportions across all arena sizes.

The fix transforms **all** actor visual elements, making actors fully visible in small arenas while keeping them appropriately sized in large arenas.
