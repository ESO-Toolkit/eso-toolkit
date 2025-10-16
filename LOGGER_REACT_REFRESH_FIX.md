# Logger React Refresh Fix

## Problem

After the logger cleanup (commit a05fddc), the application started throwing this error:

```
Error: Uncaught ReferenceError: window is not defined 
  at handleGlobalError (http://localhost:3000/src/contexts/LoggerContext.tsx:48:44)
```

## Root Cause

The error was caused by **two issues**:

### Issue 1: Module-Level window Access in App.tsx

In `App.tsx`, there was code accessing `window` at module scope without checking if `window` exists:

```typescript
// BEFORE (lines 31-35)
if (process.env.NODE_ENV !== 'production') {
  (window as any).__REDUX_STORE__ = store;
}
```

During Vite's Hot Module Replacement (HMR) and React Refresh transformations, modules can be evaluated in contexts where `window` is not defined (e.g., during SSR preparation, build-time analysis, or worker contexts).

### Issue 2: Module-Level Config Evaluation in logger.ts

The logger had a module-level constant that evaluated `process.env.NODE_ENV`:

```typescript
const DEFAULT_CONFIG: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.ERROR,
  enableConsole: true,
  enableStorage: true,
  maxStorageEntries: 1000,
};
```

This was evaluated immediately when the module loaded, potentially in contexts where `process` wasn't properly defined.

## Solution

### Fix 1: Guard window Access in App.tsx

Added `typeof window !== 'undefined'` check before accessing window:

```typescript
// AFTER
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).__REDUX_STORE__ = store;
}
```

### Fix 2: Lazy Config Evaluation in logger.ts

Changed the module-level constant to a factory function:

```typescript
function getDefaultConfig(): LoggerConfig {
  return {
    level: typeof process !== 'undefined' && process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.ERROR,
    enableConsole: true,
    enableStorage: true,
    maxStorageEntries: 1000,
  };
}

export class Logger implements ILogger {
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...getDefaultConfig(), ...config };
    this.loadStoredLevel();
  }
}
```

## Files Changed

1. `src/App.tsx` - Added `typeof window !== 'undefined'` guard for Redux store exposure
2. `src/utils/logger.ts` - Changed `DEFAULT_CONFIG` from module-level constant to `getDefaultConfig()` function

## Why This Happens

When Vite processes modules with React Refresh (HMR):

1. **Module Evaluation**: Modules are evaluated during build/transform phases
2. **Context Isolation**: React Refresh may evaluate modules in isolated contexts
3. **SSR Preparation**: Build tools may simulate SSR environments where `window` doesn't exist
4. **Worker Contexts**: Some transformations may occur in worker threads

Module-level code that accesses browser globals (`window`, `document`, etc.) or Node.js globals (`process`) must always check for their existence first.

## Best Practices

### ✅ DO: Guard Browser Global Access

```typescript
if (typeof window !== 'undefined') {
  window.addEventListener('resize', handleResize);
}
```

### ✅ DO: Guard Node.js Global Access

```typescript
const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
```

### ✅ DO: Use Lazy Evaluation for Module-Level Config

```typescript
// Instead of:
const config = { value: process.env.SOMETHING };

// Use:
function getConfig() {
  return { value: process.env.SOMETHING };
}
```

### ❌ DON'T: Access Globals Directly at Module Scope

```typescript
// Bad - will fail during HMR
const store = window.__REDUX_STORE__;
```

### ❌ DON'T: Assume process.env is Always Available

```typescript
// Bad - process might not be defined
const mode = process.env.NODE_ENV;
```

## Testing

After this fix:
1. Restart the dev server: `npm run dev`
2. Check browser console - the `window is not defined` error should be gone
3. Make changes to React components and verify HMR works correctly
4. Check that logger functionality works as expected
5. Verify Redux DevTools can still access `__REDUX_STORE__` in development

## Related Issues

- Logger cleanup commit: a05fddc
- Original issue: React Refresh failing with "window is not defined" error

## Notes

- The logger already had proper guards for `window` and `localStorage` access in methods like `loadStoredLevel()` and `saveLevel()`
- The issue was specifically with module-level code evaluation, not with runtime browser API access
- This pattern is common when using Vite + React Refresh + module-scope side effects
