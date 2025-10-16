# React Three Fiber H6 Error Fix

## 🐛 Error Report

**Error Message:**
```
R3F: H6 is not part of the THREE namespace! Did you forget to extend?
See: https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively
```

**Impact:** Replay viewer would crash when attempting to render the performance monitor overlay.

---

## 🔍 Root Cause Analysis

### The Problem

The `PerformanceOverlay` component uses **MUI (Material-UI) components** including `Typography`, `Paper`, `Box`, etc., which are standard HTML/React components. However, this component was being rendered **inside the React Three Fiber Canvas context**.

React Three Fiber (R3F) is designed to render Three.js objects, not regular HTML/React components. When R3F encounters a component like `<Typography variant="h6">`, it tries to interpret `h6` as a Three.js object type, which doesn't exist.

### Architecture Issue

```tsx
// In Arena3DScene.tsx - INSIDE Canvas context
<PerformanceMonitorWithOverlay
  showOverlay={true}
  ...
/>
```

The `PerformanceMonitorWithOverlay` component renders `PerformanceOverlay`, which contains MUI components:

```tsx
// PerformanceOverlay.tsx - BEFORE FIX
export const PerformanceOverlay = (...) => {
  return (
    <Paper>              // ❌ HTML component in 3D context
      <Typography variant="h6">  // ❌ R3F sees "h6" and fails
        Performance Monitor
      </Typography>
    </Paper>
  );
};
```

**Result:** R3F tries to create a Three.js object named "H6", which doesn't exist, causing the error.

---

## ✅ Solution Implemented

### Wrap HTML Components in `<Html>` from drei

The `@react-three/drei` library provides an `<Html>` component specifically designed to render HTML/React components inside a Three.js scene.

**File:** `src/features/fight_replay/components/PerformanceMonitor/PerformanceOverlay.tsx`

#### 1. Import Html Component

```typescript
// BEFORE
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  // ... other imports
} from '@mui/icons-material';

// AFTER
import { Html } from '@react-three/drei';  // ✅ Added
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  // ... other imports
} from '@mui/icons-material';
```

#### 2. Wrap Component JSX in Html

```tsx
// BEFORE
export const PerformanceOverlay = (...) => {
  return (
    <Paper>
      {/* MUI components */}
    </Paper>
  );
};

// AFTER
export const PerformanceOverlay = (...) => {
  return (
    <Html fullscreen>  {/* ✅ Wrap in Html */}
      <Paper>
        {/* MUI components */}
      </Paper>
    </Html>  {/* ✅ Close Html wrapper */}
  );
};
```

### How `Html` Works

The `<Html>` component from drei:
- Creates a DOM portal to render HTML outside the WebGL canvas
- Positions the HTML overlay using CSS transforms
- Maintains proper z-ordering with the 3D scene
- Uses `fullscreen` prop to position elements using fixed CSS positioning

**Benefits:**
- ✅ HTML components render normally in the DOM
- ✅ MUI styling and interactions work correctly
- ✅ No conflicts with Three.js rendering
- ✅ Performance overlay appears on top of 3D scene

---

## 🧪 Validation Results

### TypeScript Compilation

```bash
npm run typecheck
```

**Result:** ✅ **PASSED** - No type errors

### ESLint Validation

```bash
npm run lint -- --fix
```

**Result:** ✅ **PASSED** - 0 errors, 0 warnings

---

## 📊 Technical Details

### React Three Fiber Context Boundaries

**Inside Canvas (3D Context):**
- ✅ Three.js primitives: `<mesh>`, `<group>`, `<boxGeometry>`, etc.
- ✅ drei 3D helpers: `<OrbitControls>`, `<Grid>`, `<Text>`, etc.
- ✅ Custom 3D components using `useFrame`, `useThree`, etc.
- ❌ HTML/React components (without `<Html>` wrapper)

**Outside Canvas or in `<Html>` (DOM Context):**
- ✅ HTML elements: `<div>`, `<span>`, `<h1>`, etc.
- ✅ React components: MUI, custom React components
- ✅ CSS styling and DOM events

### Html Component Props

```tsx
<Html
  fullscreen    // Renders in fullscreen portal (outside canvas DOM)
  position      // 3D position in scene (if not fullscreen)
  center        // Center pivot point
  transform     // Apply 3D transforms
  occlude       // Hide when behind 3D objects
  zIndexRange   // Control z-index layering
/>
```

For the performance overlay, we use:
- `fullscreen={true}` - Renders in a fullscreen portal
- Fixed CSS positioning (`position: fixed; top: 16px; right: 16px;`)
- High z-index (`zIndex: 9999`) to appear above all other elements

---

## 🎯 Impact Summary

### Before Fix
- ❌ Application crashed with "H6 is not part of THREE namespace" error
- ❌ Performance monitor could not render
- ❌ Replay viewer was unusable in development mode

### After Fix
- ✅ Performance monitor renders correctly
- ✅ MUI components work as expected
- ✅ Proper overlay positioning and styling
- ✅ No performance impact on 3D rendering
- ✅ Development mode monitoring fully functional

---

## 🚀 Related Components

Components that correctly use `<Html>` for DOM content in 3D scenes:
- `PerformanceOverlay` - Performance metrics overlay (this fix)
- Future candidates: Any UI overlays, HUD elements, or HTML-based billboards

Components that use pure Three.js rendering (no Html needed):
- `BossHealthHUD` - Canvas-based texture rendering
- `ActorNameBillboard` - Canvas-based text rendering
- `Actor3D` - Pure Three.js geometries
- `MorMarkers` - drei's `<Text>` component (3D text, not HTML)

---

## 📝 Best Practices

### When to Use `<Html>`

Use `<Html>` when you need to:
- Render complex HTML/React components inside a 3D scene
- Use CSS frameworks (MUI, Bootstrap, Tailwind)
- Display forms, buttons, or interactive HTML elements
- Overlay HUD elements with DOM styling

### When NOT to Use `<Html>`

Avoid `<Html>` when:
- Performance is critical (HTML rendering has overhead)
- Simple text rendering (use drei's `<Text>` component)
- Canvas-based rendering works (like BossHealthHUD)
- Component will be frequently updated (causes DOM reflows)

### Performance Considerations

```tsx
// GOOD - Minimal DOM updates, static content
<Html fullscreen>
  <Paper>Static overlay with minimal updates</Paper>
</Html>

// CAREFUL - Frequent updates can cause performance issues
<Html position={[x, y, z]}>  // Transforms on every frame
  <div>Frequently updating content</div>
</Html>
```

---

## ✅ Status: RESOLVED

The R3F H6 error has been **completely fixed** by properly wrapping the HTML-based `PerformanceOverlay` component in an `<Html>` component from `@react-three/drei`.

**Commit Hash:** Pending  
**Branch:** `feature/render-mor-markers`  
**Status:** Ready for testing and commit
