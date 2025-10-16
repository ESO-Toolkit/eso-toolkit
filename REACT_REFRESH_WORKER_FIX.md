# React Refresh + Web Workers Fix

## Problem

After the logger cleanup (commit `a05fddc`), the application started throwing:

```
@react-refresh:603 Uncaught ReferenceError: window is not defined
```

## Root Cause Analysis

### Why This Happened

**Before Logger Cleanup** (pre-a05fddc):
- `Logger` class was only in `src/contexts/LoggerContext.tsx` (React context)
- Worker files didn't import the logger
- React Refresh only processed React component files

**After Logger Cleanup** (commit a05fddc):
1. `Logger` was extracted to `src/utils/logger.ts` for standalone use
2. Logger was imported into **Web Worker files** like `src/workers/calculations/CalculateActorPositions.ts`
3. However, the import path still referenced the React context:
   ```typescript
   import { Logger, LogLevel } from '../../contexts/LoggerContext';
   ```
4. Worker files also create logger instances at module scope:
   ```typescript
   const logger = new Logger({
     level: LogLevel.WARN,
     contextPrefix: 'ActorPositions',
   });
   ```

### The Problem

When Vite's `@vitejs/plugin-react-swc` processes files:

1. **Worker files import from React context files** → Vite sees this as a React-related file
2. **React Refresh is applied** → HMR code is injected that assumes browser globals exist
3. **Workers run in a separate thread** → No `window`, `document`, or DOM APIs
4. **React Refresh runtime accesses `window`** → 💥 `ReferenceError: window is not defined`

### Why It Manifests at Line 603

The error occurs in React Refresh's runtime at line 603, where it tries to access `window` to:
- Register components for hot reloading
- Track component boundaries
- Set up HMR listeners

But Worker threads have a completely different global context (`WorkerGlobalScope`) without browser APIs.

## Solution

### 1. Exclude Workers from React Refresh

Updated `vite.config.mjs` to exclude worker files from React Refresh processing:

```javascript
react({
  // Exclude Web Workers from React Refresh to avoid "window is not defined" errors
  // Workers run in a separate context without window/document globals
  exclude: [
    /node_modules/,
    /\/workers\//,      // Any file in a workers directory
    /\.worker\./,        // Any file with "worker" in the name
    /SharedWorker/,      // Specifically SharedWorker files
  ],
}),
```

### 2. Guard Browser Globals in App.tsx

Added safety check for `window` access at module scope:

```typescript
// Before
if (process.env.NODE_ENV !== 'production') {
  (window as any).__REDUX_STORE__ = store;
}

// After  
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).__REDUX_STORE__ = store;
}
```

### 3. Lazy Config Evaluation in logger.ts

Changed module-level constant to function:

```typescript
// Before
const DEFAULT_CONFIG: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.ERROR,
  // ...
};

// After
function getDefaultConfig(): LoggerConfig {
  return {
    level: typeof process !== 'undefined' && process.env.NODE_ENV === 'production' 
      ? LogLevel.ERROR 
      : LogLevel.ERROR,
    // ...
  };
}
```

## Files Changed

1. **vite.config.mjs** - Added `exclude` option to `react()` plugin
2. **src/App.tsx** - Added `typeof window !== 'undefined'` guard
3. **src/utils/logger.ts** - Changed config from constant to function

## Why the Exclude Option Works

By excluding worker files from React Refresh:

✅ Worker files are still processed by Vite (transpilation, bundling)  
✅ Worker files can still import shared utilities  
✅ Workers function correctly in their isolated context  
❌ Workers don't get HMR (but they can't reload independently anyway)  
❌ React Refresh doesn't inject browser-dependent code

## Testing

1. Restart the dev server: `npm run dev`
2. Check browser console - no "window is not defined" errors
3. Verify workers function correctly:
   - Load a fight with replay data
   - Check that actor positions calculate
   - Verify buff lookups work
4. Verify HMR still works for React components

## Future Considerations

### Better Import Paths

Worker files should import directly from `utils/logger.ts` instead of through the React context:

```typescript
// Current (works but conceptually wrong)
import { Logger, LogLevel } from '../../contexts/LoggerContext';

// Better
import { Logger, LogLevel } from '../../utils/logger';
```

The context file re-exports for convenience, but workers shouldn't conceptually depend on React contexts.

### Worker Module Pattern

Consider using a separate build for workers:

```javascript
// vite.config.mjs
export default defineConfig({
  worker: {
    plugins: [
      // Worker-specific plugins only
      // No React Refresh!
    ],
  },
});
```

## Related Issues

- Logger cleanup commit: `a05fddc`
- Web Workers: `src/workers/**/*.ts`
- Vite Worker support: https://vitejs.dev/guide/features.html#web-workers

## Key Takeaways

1. **Web Workers ≠ Browser Context** - Workers don't have `window`, `document`, or DOM APIs
2. **React Refresh = Browser Only** - HMR requires browser globals
3. **Build Tools Make Assumptions** - Vite assumes files importing React-related code are browser code
4. **Module-Level Code Matters** - Side effects at import time can cause issues
5. **Exclude Patterns Are Your Friend** - Tell build tools when assumptions are wrong
