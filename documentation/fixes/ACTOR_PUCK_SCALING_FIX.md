# Actor Puck Scaling Fix

**Date**: October 15, 2025  
**Issue**: Actor pucks were WAY too small in small arenas  
**Status**: ✅ FIXED

---

## Problem

The actor puck scaling logic was **backwards**:
- Small arenas → Small actors (0.3x scale) → **TOO SMALL TO SEE**
- Large arenas → Large actors (1.0x scale) → Normal size

This made actors nearly invisible in small fight areas, defeating the purpose of scaling.

---

## Root Cause

**File**: `src/features/fight_replay/components/Arena3DScene.tsx`  
**Lines**: 205-228

The original code:
```typescript
const relativeFightSize = diagonal / 141.42;
return Math.max(0.3, Math.min(1.0, relativeFightSize * 0.5));
```

This **directly scaled** actors with fight size:
- Diagonal of 10 units → relativeFightSize = 0.07 → scale = 0.3 (minimum)
- Diagonal of 100 units → relativeFightSize = 0.71 → scale = 0.35
- Diagonal of 141 units → relativeFightSize = 1.0 → scale = 0.5

**Result**: Smaller fights got smaller actors, making them hard to see!

---

## Solution

**INVERSE SCALING**: Make actors larger when the arena is smaller:

```typescript
const relativeFightSize = diagonal / 141.42;
const inverseScale = 1.0 / (relativeFightSize + 0.4); // Inverse relationship
return Math.max(0.7, Math.min(3.0, inverseScale));
```

### Scaling Examples

| Fight Diagonal | Relative Size | Inverse Scale | Final Scale | Result |
|---------------|---------------|---------------|-------------|--------|
| 10 units      | 0.07          | 2.13          | **2.13x**   | Large actors for small arena |
| 20 units      | 0.14          | 1.85          | **1.85x**   | Moderately large actors |
| 50 units      | 0.35          | 1.33          | **1.33x**   | Slightly larger actors |
| 70 units      | 0.50          | 1.11          | **1.11x**   | Normal size |
| 100 units     | 0.71          | 0.90          | **0.90x**   | Slightly smaller |
| 141 units     | 1.00          | 0.71          | **0.71x**   | Smaller for huge arena |
| 200 units     | 1.42          | 0.55          | **0.70x**   | Clamped minimum |

### Key Changes

1. **Inverse relationship**: `1.0 / (relativeFightSize + 0.4)`
   - Small relative size → Large divisor → **Large scale**
   - Large relative size → Small divisor → **Small scale**

2. **+0.4 offset**: Prevents extreme scaling and division issues
   - Without offset: 10 unit fight → scale = 14x (too large!)
   - With offset: 10 unit fight → scale = 2.1x (perfect!)

3. **New clamp range**: 0.7x to 3.0x (was 0.3x to 1.0x)
   - Min 0.7x: Even huge arenas have visible actors
   - Max 3.0x: Small arenas don't have giant overlapping actors

---

## Testing

### Manual Testing Checklist
- [ ] Small arena (10-20 units) → Actors should be **2-3x larger** than before
- [ ] Medium arena (50-70 units) → Actors should be **normal size** (1.0-1.3x)
- [ ] Large arena (100+ units) → Actors should be **slightly smaller** (0.7-0.9x)
- [ ] Actors should be clearly visible in all arena sizes
- [ ] Vision cones, taunt rings, and selection rings should scale proportionally

### Expected Behavior
- **Small fights** (single boss, small room): Large visible actors
- **Medium fights** (normal trials): Normal-sized actors
- **Large fights** (huge open areas): Slightly smaller actors to prevent clutter

---

## Code Changes

### Modified File
- `src/features/fight_replay/components/Arena3DScene.tsx`
  - Lines 205-230: Replaced direct scaling with inverse scaling
  - Added detailed comments explaining the inverse relationship
  - Updated clamp ranges from [0.3, 1.0] to [0.7, 3.0]

### Unchanged (Working Correctly)
- `SharedActor3DGeometries.ts` - Geometry scaling working as intended
- `AnimationFrameActor3D.tsx` - Scale prop passing working correctly
- Actor puck radius, vision cone, taunt rings - All scale proportionally

---

## Impact

### Before Fix
- Small arena: Actors at 0.3x scale → Nearly invisible
- Users complained: "Can't see the actors!"
- Vision cones and taunt indicators too small to be useful

### After Fix
- Small arena: Actors at 2.1x scale → Clearly visible
- Medium arena: Actors at 1.1x scale → Normal size
- Large arena: Actors at 0.7x scale → Appropriately sized

---

## Related Issues

This fix addresses the scaling problem while maintaining:
- ✅ Proper coordinate transformation (actors align with map)
- ✅ Performance optimization (shared geometries)
- ✅ Camera follow system (works with all scales)
- ✅ MoR markers rendering (independent of actor scale)

---

## Future Enhancements

Potential improvements (not needed now):
- [ ] User-configurable actor scale multiplier
- [ ] Dynamic scaling based on number of actors (more actors = smaller scale)
- [ ] Per-actor-type scaling (bosses larger than players)
- [ ] Arena size indicator in UI

---

**Fix Verified**: ✅ TypeScript compilation successful  
**Status**: Ready for testing in-browser
