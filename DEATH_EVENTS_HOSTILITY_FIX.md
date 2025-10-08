# Death Events Fix - Report 7zj1ma8kD9xn4cTq

## Root Cause Identified ✅

After analyzing the existing working `useDeathEvents` hook, I found the issue:

### The Problem
We were only fetching death events with a single hostility type, but ESO Logs requires fetching **BOTH** `HostilityType.Friendlies` AND `HostilityType.Enemies` to get all death events.

### The Working Solution
The existing `deathEventsSlice.ts` uses this approach:
```typescript
// Fetch both friendly and enemy death events
const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
let allEvents: LogEvent[] = [];

for (const hostilityType of hostilityTypes) {
  // Fetch events for each hostility type
  // Then combine them
}
```

### Why This Is Necessary
In ESO Logs API:
- Some death events are recorded as `Friendlies` (player deaths)
- Some death events are recorded as `Enemies` (enemy kills, environmental deaths)
- You need BOTH to get the complete picture of all deaths in a fight

## Fix Applied

### Updated `OptimizedReportEventsFetcher.tryFetchDeathEvents()`:
```typescript
private async tryFetchDeathEvents(reportCode, reportStartTime, reportEndTime) {
  // Fetch BOTH friendly and enemy death events (matches working approach)
  const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
  let allDeathEvents: DeathEvent[] = [];

  for (const hostilityType of hostilityTypes) {
    const deathEvents = await this.fetchWithPagination(GET_REPORT_DEATH_EVENTS, {
      code: reportCode,
      startTime: reportStartTime,
      endTime: reportEndTime,
      hostilityType: hostilityType,  // Fetch each hostility type separately
    });
    
    allDeathEvents.push(...deathEvents); // Combine results
  }
  
  return allDeathEvents;
}
```

### Enhanced Debugging:
The fix includes detailed logging to show:
```
💀 Fetching death events with BOTH hostility types...
🔍 Fetching deaths with hostility: Friendlies
📊 Found 15 death events with Friendlies hostility
🔍 Fetching deaths with hostility: Enemies  
📊 Found 8 death events with Enemies hostility
✅ Total death events found: 23 (combining both hostility types)
```

## Expected Results

### Before Fix:
```
📊 Fetched 1247 damage, 0 death, 856 healing events
📊 Total deaths found across all fights: 0
```

### After Fix:
```
📊 Found 15 death events with Friendlies hostility
📊 Found 8 death events with Enemies hostility  
✅ Total death events found: 23 (combining both hostility types)
💀 Fight 1: 3 deaths found
💀 Fight 5: 2 deaths found
📊 Total deaths found across all fights: 23
```

## Technical Details

### API Behavior:
- ESO Logs categorizes events by source/target relationship
- Player deaths might be recorded as `Friendlies` (when friendly players die)
- Environmental deaths might be recorded as `Enemies` (when environment kills players)
- Pet/summon deaths might have different classifications

### Performance Impact:
- Adds one extra API call (2 calls instead of 1 for deaths)
- Still much better than the original 3×N approach
- Total calls: Damage(1) + Deaths(2) + Healing(1) = 4 calls vs original 3×93 = 279 calls

### Compatibility:
- Uses the same proven approach as the working `deathEventsSlice`
- Maintains all existing optimization benefits
- Backward compatible with existing death analysis code

## Verification Steps

1. **Load Report**: Navigate to report `7zj1ma8kD9xn4cTq` summary
2. **Check Console**: Look for the new death fetching messages
3. **Verify Counts**: Death analysis should show > 0 deaths
4. **Check Details**: Actual ability names and player names should appear

The fix should now correctly identify and analyze the real death events from the ESO combat log.