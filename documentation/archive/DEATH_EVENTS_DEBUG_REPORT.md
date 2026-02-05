# Death Events Debugging - Report 7zj1ma8kD9xn4cTq

## Issue
Report summary shows 0 deaths across 93 fights, but this appears to be incorrect.

## Potential Root Causes Investigated

### 1. HostilityType Filtering Issue (LIKELY CAUSE)
**Problem**: ESO Logs API might handle death events differently with hostility filtering
- Deaths might not be categorized as `Friendlies` vs `Enemies` in the expected way
- Player deaths might be recorded without hostility classification
- API might require no hostility filter to return all deaths

**Fix Applied**: 
- Removed `hostilityType: HostilityType.Friendlies` from death event queries
- Updated GraphQL queries to make hostilityType optional
- This should fetch ALL deaths regardless of source/target classification

### 2. Event Type Filtering Issue
**Problem**: Death events might be labeled differently in the API response
- Events might not have `type: 'death'` or `__typename: 'DeathEvent'`
- Client-side filtering might be too restrictive

**Debug Added**: Extensive logging to show:
- How many death events are fetched from API
- What event types are actually returned
- Sample death event structure

### 3. Fight Time Range Issues
**Problem**: Death events might fall outside expected fight boundaries
- Events could occur between fights
- Time range filtering might exclude relevant deaths

**Debug Added**: Logging of fight time ranges and event timestamps

## Debugging Information Added

### API Fetch Level:
```typescript
// Shows exactly what's returned from ESO Logs API
console.log(`📊 Fetched ${deathData.length} death events`);
console.log(`💀 Death Events Sample:`, deathData.slice(0, 3));
```

### Event Processing Level:
```typescript
// Shows how events are filtered by fight
console.log(`💀 Fight ${fight.id}: ${deathCount} deaths found`);
console.log(`📊 Total deaths found across all fights: ${totalDeathsFound}`);
```

### Analysis Level:
```typescript
// Shows what's passed to DeathAnalysisService
fightDeathData.forEach(fight => {
  console.log(`💀 Fight ${fight.fightId}: ${fight.deathEvents.length} death events`);
});
```

## Expected Console Output (After Fix)

### If Deaths Found:
```
🚀 Starting optimized parallel report event fetching...
✅ Parallel fetching completed in 1250ms
📊 Fetched 1247 damage, 23 death, 856 healing events
💀 Death Events Sample: [DeathEvent, DeathEvent, DeathEvent]
💀 Fight 1: 3 deaths found
💀 Fight 2: 0 deaths found  
💀 Fight 3: 5 deaths found
📊 Total deaths found across all fights: 23
```

### If Still No Deaths:
```
⚠️ NO DEATH EVENTS FOUND! This might indicate:
- Report has no player deaths (successful run)
- Wrong hostility type (trying Friendlies)
- API filtering issue
- Time range issue (startTime to endTime)
```

## Next Steps

1. **Test with Real Report**: Load report `7zj1ma8kD9xn4cTq` and check console
2. **Check Event Types**: If still 0 deaths, check what event types are actually returned
3. **Manual Verification**: Cross-reference with actual ESO Logs website to confirm deaths exist
4. **Hostility Testing**: If needed, try fetching with `HostilityType.Enemies` instead

## Alternative Approaches If Issue Persists

### Use Existing Death Events Query:
The codebase has `GetDeathEventsDocument` that uses `fightIDs` instead of time ranges:
```typescript
// This might be more reliable than time-based filtering
events(fightIDs: $fightIds, dataType: Deaths)
```

### Fetch Both Hostility Types:
```typescript
// Fetch deaths for both friendlies and enemies, combine results
const [friendlyDeaths, enemyDeaths] = await Promise.all([
  fetchDeathEvents({hostilityType: Friendlies}),
  fetchDeathEvents({hostilityType: Enemies})
]);
```

The primary fix (removing hostility filtering) should resolve the issue if deaths are being filtered out by the `Friendlies` constraint.