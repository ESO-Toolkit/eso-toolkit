# Logger Import Strategy - Fixed

## The Problem

After the logger cleanup (commit `a05fddc`), many files were incorrectly importing from `contexts/LoggerContext.tsx` when they should have been importing from `utils/logger.ts`.

### Why This Matters

When **non-React files** (workers, utilities, services) import from a **React context file**, Vite's build system:
1. Treats those files as React-related
2. Applies React Refresh (HMR) transformations
3. Injects code that assumes browser globals exist (`window`, `document`)
4. Causes "window is not defined" errors in Web Workers

## The Fix

### Files Changed (24 total)

**Worker Files (5):**
- `src/workers/calculations/CalculateActorPositions.ts` ✅
- `src/workers/WorkerPool.ts` ✅
- `src/workers/WorkerManager.ts` ✅
- `src/workers/types.ts` ✅
- `src/workers/WorkerPool.test.ts` ✅
- `src/workers/WorkerManager.test.ts` ✅

**Utility Files (8):**
- `src/utils/abilityIdMapper.ts` ✅
- `src/utils/cacheBusting.ts` ✅
- `src/utils/esoLogsNodeCache.ts` ✅
- `src/utils/elmsMarkersDecoder.ts` ✅
- `src/utils/mapTimelineUtils.ts` ✅
- `src/utils/NestedError.ts` ✅
- `src/utils/errorTracking.ts` ✅
- `src/utils/errorTracking.test.ts` ✅

**Service Files (3):**
- `src/features/scribing/application/services/ScribingDetectionService.ts` ✅
- `src/features/scribing/application/simulators/ScribingSimulatorService.ts` ✅
- `src/features/scribing/infrastructure/data/JsonScribingDataRepository.ts` ✅

**Client Files (1):**
- `src/esologsClient.ts` ✅

**Component Files (React, but non-hook usage) (7):**
- `src/components/ErrorBoundary.tsx` ✅
- `src/features/auth/AuthContext.tsx` ✅
- `src/features/fight_replay/components/Arena3D.tsx` ✅
- `src/features/fight_replay/components/MapMarkers.tsx` ✅
- `src/features/fight_replay/components/MorMarkers.tsx` ✅
- `src/features/fight_replay/components/ReplayErrorBoundary.tsx` ✅
- `src/features/fight_replay/components/PerformanceMonitor/SlowFrameLogger.tsx` ✅

## Import Rules

### ✅ Use `utils/logger` for:

```typescript
// Non-React files (utilities, services, workers)
import { Logger, LogLevel, ILogger } from '@/utils/logger';
// or
import { Logger, LogLevel } from '../../utils/logger';
```

**When:**
- Web Worker files
- Utility functions
- Service classes
- Non-React TypeScript files
- Test files for non-React code
- React components that create logger instances directly (not using hooks)

### ✅ Use `contexts/LoggerContext` for:

```typescript
// React components using hooks
import { useLogger, LoggerProvider } from '@/contexts/LoggerContext';
```

**When:**
- React components/hooks using `useLogger()`
- Components using `useLoggerUtils()`
- Test files needing `LoggerProvider`
- Any file that needs React-specific logger functionality

## Architecture

```
src/
├── utils/
│   └── logger.ts                    ← Core Logger implementation
│       ├── Logger class
│       ├── LogLevel enum
│       ├── ILogger interface
│       └── Types (LogEntry, LoggerConfig)
│
├── contexts/
│   └── LoggerContext.tsx            ← React wrapper
│       ├── Re-exports from utils/logger
│       ├── LoggerProvider component
│       ├── useLogger() hook
│       └── useLoggerUtils() hook
│
├── workers/
│   └── *.ts                         ← Import from utils/logger ✅
│
├── utils/
│   └── *.ts                         ← Import from utils/logger ✅
│
├── features/
│   ├── */services/*.ts              ← Import from utils/logger ✅
│   └── */components/*.tsx           ← Import from contexts/LoggerContext ✅
│
└── components/
    └── *.tsx                        ← Import from contexts/LoggerContext ✅
```

## Why This Architecture?

### Separation of Concerns
- **`utils/logger.ts`**: Pure TypeScript, no React dependencies
- **`contexts/LoggerContext.tsx`**: React-specific wrapper with hooks

### Build Optimization
- Non-React files don't trigger React Refresh
- Workers can use logging without browser dependencies
- Smaller bundle sizes (no React imports in utilities)

### Testing Benefits
- Utility/worker tests don't need React test utilities
- Can test logger in isolation
- Faster test execution

## Verification

Check if any files still incorrectly import from the context:

```powershell
# Should only show React component files
Get-ChildItem -Recurse -Include *.ts,*.tsx -Path src/ | 
  Select-String "from.*contexts/LoggerContext" | 
  Where-Object { $_.Path -notmatch "\.tsx$" }
```

If this returns any `.ts` files (non-React), they need to be updated.

## Related Documentation

- `REACT_REFRESH_WORKER_FIX.md` - Details on React Refresh + Workers issue
- `LOGGER_MIGRATION_SUMMARY.md` - Overall logger refactoring summary
- `LOGGER_REACT_REFRESH_FIX.md` - Initial window.undefined fixes

## Key Takeaway

**Rule of thumb:**  
- If it's a `.tsx` file using hooks → import from `contexts/LoggerContext`
- Everything else → import from `utils/logger`

This separation ensures:
✅ Workers run without browser dependencies  
✅ React Refresh only applies to actual React code  
✅ Build tools can optimize correctly  
✅ No "window is not defined" errors
