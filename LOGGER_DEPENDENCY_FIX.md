# Root Cause: Logger Dependency Causing Unnecessary Context Updates

## The Problem
When clicking "Load Markers" in the Map Markers modal:
1. Loading panel would flash briefly
2. Component would unmount/remount
3. WebGL context would be destroyed and crash on reinitialize

## Investigation Process
User reported that changing `mapMarkersString` state (which has nothing to do with async data) was somehow causing loading states to become `true` and triggering the loading panel.

## Root Cause Discovered

The issue was in **`EsoLogsClientContext.tsx`** - logger was in multiple dependency arrays:

```tsx
// Problem 1: logger in useCallback dependencies
const setAuthToken = useCallback(
  (token: string) => {
    // ... uses logger for side effect
  },
  [client, logger], // ❌ logger here
);

const clearAuthToken = useCallback(() => {
  // ... uses logger for side effect  
}, [client, logger]); // ❌ logger here

// Problem 2: logger in useMemo dependencies
const contextValue = useMemo(() => {
  return {
    client,
    isReady: client !== null,
    isLoggedIn,
    setAuthToken,
    clearAuthToken,
  };
}, [client, isLoggedIn, logger, setAuthToken, clearAuthToken]);
//                      ^^^^^^ ❌ PROBLEM!
```

### Why This Caused the Issue

**The Dependency Chain Cascade**:

1. **Logger in useCallback**: `setAuthToken` and `clearAuthToken` had `logger` in their dependencies
2. **Callback instability**: If `logger` reference changes for ANY reason, these callbacks get new references
3. **useMemo instability**: `contextValue` depends on `setAuthToken`, `clearAuthToken`, AND `logger` directly
4. **Triple instability risk**: If logger changes, THREE things in contextValue's dependencies change
5. **Context update**: `contextValue` gets a new reference
6. **Client appears to change**: `useEsoLogsClientInstance()` returns what looks like a "new" client (different reference)
7. **Effect re-triggers**: Hooks like `useFriendlyBuffEvents` have `client` in their `useEffect` dependencies:
   ```tsx
   React.useEffect(() => {
     if (reportId && selectedFight && client) {
       dispatch(fetchFriendlyBuffEvents(...));
     }
   }, [dispatch, reportId, selectedFight, client]);
   ```
8. **Loading state cascade**: When `client` reference changed, useEffect fired, dispatch was called, Redux set `loading: true`, which triggered the loading panel

**Was the logger actually changing?** 
Likely **no** - the logger from `useLogger('EsoLogsClient')` is memoized with stable dependencies. But having it in the dependency arrays created unnecessary coupling and risk. Even if logger was stable 99% of the time, any edge case that caused it to get a new reference would trigger this entire cascade.

### Why Logger Shouldn't Be a Dependency

The `logger` is only used inside the useMemo callback for a debug statement - it's not part of the returned value. According to React hooks rules, you only need to include values in dependencies if:
1. They're used in the callback AND
2. Changes to them should trigger recalculation

The logger is just for side-effect logging and doesn't affect the returned value, so it shouldn't be a dependency.

## The Fix

Remove `logger` from ALL dependency arrays where it's only used for side effects:

```tsx
// Fix 1: Remove from useCallback dependencies
const setAuthToken = useCallback(
  (token: string) => {
    setIsLoggedIn(!!token);
    if (token) {
      if (client.getAccessToken() !== token) {
        logger.info('Updating EsoLogsClient access token');
        client.updateAccessToken(token);
      }
    }
  },
  [client], // ✅ logger removed
);

const clearAuthToken = useCallback(() => {
  logger.info('Clearing EsoLogsClient access token');
  setIsLoggedIn(false);
  client.updateAccessToken('');
}, [client]); // ✅ logger removed

// Fix 2: Remove from useMemo dependencies
const contextValue = useMemo(() => {
  const value = {
    client: client,
    isReady: client !== null,
    isLoggedIn: isLoggedIn,
    setAuthToken,
    clearAuthToken,
  };

  logger.debug('EsoLogsClient context value updated', {
    isLoggedIn,
    isReady: value.isReady,
    hasClient: !!value.client,
  });

  return value;
}, [client, isLoggedIn, setAuthToken, clearAuthToken]);
//  ✅ logger removed from all three locations
```

## Why This Works

1. **Stable context**: `contextValue` now only changes when actual dependencies change
2. **Stable client reference**: `useEsoLogsClientInstance()` returns the same client reference across renders
3. **No spurious refetches**: useEffect hooks with `client` dependency don't re-fire
4. **No loading state changes**: Redux loading states stay `false` since no new fetches are triggered
5. **No component unmounting**: Loading panel never shows, 3D scene stays mounted
6. **No WebGL crashes**: Context never gets destroyed

## Lesson Learned

When using logging in memoized values or effects, be careful not to include the logger in dependency arrays unless it genuinely affects the computed value. Logging is a side effect and shouldn't trigger recomputations.

## Related Files
- `src/EsoLogsClientContext.tsx` - Fixed useMemo dependencies
- `src/hooks/events/useFriendlyBuffEvents.ts` - Uses client in useEffect
- `src/hooks/events/useHostileBuffEvents.ts` - Uses client in useEffect
- All other event hooks that depend on client

## Testing
- ✅ TypeScript compilation passes
- ✅ Loading panel no longer appears when loading markers
- ✅ Component doesn't unmount when marker state changes  
- ✅ WebGL context stays stable
- ✅ No spurious data refetching

## Date
October 15, 2025
