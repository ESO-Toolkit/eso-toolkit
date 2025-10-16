# Back to Fight Button Fix - Implementation Summary

## Problem
The "Back to Fight" button on the replay viewer page was always disabled.

## Root Cause
The `useReportFightParams` hook was incorrectly parsing route parameters from the Redux router state. The hook was reading `location.pathname` which only contains `/` when using hash-based routing, while the actual route was in `location.hash` as `#/report/:reportId/fight/:fightId/replay`.

### Initial Investigation
Debug logs showed:
```
[useReportFightParams] router location: {
  pathname: '/',
  search: '',
  hash: '#/report/m2Y9FqdpMjcaZh4R/fight/43/replay',
  state: null,
  key: 'default'
}
[useReportFightParams] reportId: undefined
[useReportFightParams] fightId: undefined
```

The hook was trying to extract route parameters from `pathname` (`/`), but the actual route was in the `hash` property.

## Solution
Instead of manually parsing the pathname/hash, the hook now uses React Router's `useParams()` hook directly, which properly extracts route parameters regardless of whether the app uses hash-based or history-based routing.

### File Modified
**`src/hooks/useReportFightParams.ts`**

### Before
```typescript
import { useSelector } from 'react-redux';
import { RootState } from '../store/storeWithHistory';

export function useReportFightParams(): {
  reportId: string | undefined;
  fightId: string | undefined;
} {
  const location = useSelector((state: RootState) => state.router?.location);
  const pathname = location?.pathname || window.location.pathname;
  const pathParts = pathname?.split('/').filter(Boolean) || [];
  
  // Manual parsing logic...
  
  return { reportId, fightId };
}
```

### After
```typescript
import { useParams } from 'react-router-dom';

export function useReportFightParams(): {
  reportId: string | undefined;
  fightId: string | undefined;
} {
  const params = useParams<{ reportId: string; fightId: string }>();
  
  return {
    reportId: params.reportId,
    fightId: params.fightId,
  };
}
```

## Why This Works
1. **React Router Handles Routing Complexity**: `useParams()` works correctly with both hash-based (`#/`) and history-based routing
2. **Direct Parameter Access**: No manual string parsing needed
3. **Type Safety**: TypeScript generics provide proper typing for parameters
4. **Maintainability**: Simpler, more idiomatic code that follows React Router best practices
5. **Consistency**: Other components in the codebase already use `useParams()` successfully (e.g., `ReportFightContext`, `LiveLog`, `FightReplay3D`)

## Technical Details

### Router Setup
The application uses:
- **`redux-first-history`**: Syncs router state to Redux
- **`createBrowserHistory`**: Hash-based routing (`createBrowserHistory()`)
- **React Router v7**: Client-side routing

### Route Structure
- **Replay page**: `/report/:reportId/fight/:fightId/replay`
- **Fight details**: `/report/:reportId/fight/:fightId`
- **Report page**: `/report/:reportId`

### Hash-Based Routing
With hash-based routing, URLs look like:
```
http://localhost:3000/#/report/m2Y9FqdpMjcaZh4R/fight/43/replay
```

Where:
- `pathname` = `/` (base path)
- `hash` = `#/report/m2Y9FqdpMjcaZh4R/fight/43/replay` (actual route)

React Router's `useParams()` correctly handles this, while manual parsing of `location.pathname` does not.

## Validation

### TypeScript Compilation
```bash
npm run typecheck
```
✅ **Result**: No errors

### Button Behavior
- **Before**: Always disabled (reportId and fightId were `undefined`)
- **After**: Enabled when on replay page with valid route parameters

### User Flow
```
Fight Details ⟷ Replay Viewer
    ↑               │
    └───────────────┘
   "Back to Fight" button (now enabled)
```

## Related Files
- `src/hooks/useReportFightParams.ts` (fixed)
- `src/features/fight_replay/FightReplay.tsx` (uses the hook)
- `src/ReportFightContext.tsx` (uses `useParams()` correctly as reference)
- `src/features/fight_replay/components/FightReplay3D.tsx` (uses `useParams()` correctly as reference)

## Lessons Learned
1. When working with React Router, prefer using built-in hooks (`useParams`, `useLocation`, `useNavigate`) over manual parsing
2. Redux router state is useful for Redux-connected components, but route parameters should come from React Router
3. Hash-based routing requires special handling when manually parsing URLs
4. Always check if existing patterns in the codebase solve the same problem

## Future Considerations
- Consider migrating from hash-based routing to history-based routing for cleaner URLs
- Remove dependency on Redux router state if it's not actively used for navigation logic
- Standardize on React Router hooks throughout the codebase for consistency
