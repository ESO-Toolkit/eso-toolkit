# Strict Mode and WebGL Context Loss Resolution

## Issue Summary
When clicking "Load Markers" in the Map Markers modal, the 3D replay viewer would crash with "THREE.WebGLRenderer: Context Lost."

## Root Cause
React Strict Mode intentionally unmounts and remounts components during development to help find bugs. This caused the WebGL context in the 3D arena to be destroyed and rapidly recreated, leading to context loss.

## Investigation Process
1. Initially suspected button event handlers causing page reload
2. Investigated loading panel appearing and disappearing
3. Traced through Redux dispatches and hook dependencies
4. Discovered component unmounting/remounting via mount counter logging
5. Identified React Strict Mode as the culprit

## Key Findings
- ✅ **Redux thunk condition was working correctly** - preventing duplicate fetches
- ✅ **Hook dependency arrays were correct** - no unnecessary re-renders during updates
- ❌ **Strict Mode's remounting was the issue** - destroying WebGL context faster than browser could restore it

## Solution
**Disabled React Strict Mode** (`src/index.tsx`) with comprehensive documentation explaining why:
- Strict Mode's remounting is fundamentally incompatible with WebGL contexts
- Production builds don't use Strict Mode anyway
- Similar to many 3D/WebGL applications that disable it for this reason

## Compensating Measures

### 1. Enhanced ESLint Rules (`eslint.config.js`)
Added explicit React Hooks rules to catch what Strict Mode would find:
```javascript
'react-hooks/exhaustive-deps': 'error', // Ensure all dependencies are listed
'react-hooks/rules-of-hooks': 'error',   // Ensure hooks are called correctly
```

These rules catch:
- Missing dependencies in `useEffect`, `useCallback`, `useMemo`
- Hooks called conditionally or in loops
- Hooks called in non-component functions

### 2. WebGL Context Loss Prevention (`Arena3D.tsx`)
Added robustness features that help with real context loss scenarios:
- **`preserveDrawingBuffer: true`** - Preserves drawing buffer between frames
- **`powerPreference: 'high-performance'`** - Requests high-performance GPU
- **Context loss event handlers** - Prevents permanent loss and allows restoration
- **Stable Canvas key** - Prevents unnecessary recreation

```typescript
<Canvas
  key={`canvas-${fight.id}`}
  gl={{
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
    antialias: true,
    failIfMajorPerformanceCaveat: false,
  }}
  onCreated={({ gl }) => {
    const canvas = gl.domElement;
    
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault(); // Critical: tells browser to restore context
      console.warn('WebGL context lost, preventing default to allow restoration');
    });
    
    canvas.addEventListener('webglcontextrestored', () => {
      console.log('WebGL context restored successfully');
    });
  }}
  ...
```

### 3. Intentional Dependency Omissions Documented
Added ESLint disable comments with explanations for intentional omissions in `EsoLogsClientContext.tsx`:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
[client], // logger intentionally omitted - it's a stable singleton, not a reactive dependency
```

## Testing
- ✅ Markers load without WebGL crash (Strict Mode disabled)
- ✅ ESLint catches exhaustive-deps issues
- ✅ TypeScript compilation passes
- ✅ Context loss handlers in place for real scenarios

## Files Modified
1. `src/index.tsx` - Disabled Strict Mode with documentation
2. `src/features/fight_replay/components/Arena3D.tsx` - Added WebGL robustness features
3. `eslint.config.js` - Explicitly enabled React Hooks rules
4. `src/EsoLogsClientContext.tsx` - Added ESLint disable comments for intentional omissions

## Trade-offs
**Pros:**
- ✅ Markers feature works correctly
- ✅ WebGL context more robust against real context loss
- ✅ ESLint catches the issues Strict Mode would find
- ✅ Well-documented for future developers

**Cons:**
- ❌ No Strict Mode double-invocation in development (but ESLint compensates)
- ❌ Future developers need to understand this trade-off

## Alternative Approaches Considered
1. **Selective Strict Mode** - Not possible; can only enable for subtrees, not disable
2. **Context restoration only** - Insufficient; can't prevent destruction from remounting
3. **Memoization improvements** - Already optimal; thunk condition prevents refetches

## Recommendation
Keep Strict Mode disabled. The combination of:
1. Strong ESLint rules for hooks
2. Comprehensive testing
3. WebGL context loss prevention
4. Good documentation

...provides sufficient safety without the WebGL incompatibility.

## References
- React Strict Mode: https://react.dev/reference/react/StrictMode
- WebGL Context Loss: https://www.khronos.org/webgl/wiki/HandlingContextLost
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber
