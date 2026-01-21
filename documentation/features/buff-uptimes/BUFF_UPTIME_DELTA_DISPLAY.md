# Buff Uptime Delta Display Feature

## Overview

The buff uptime delta display feature shows how an individual player's buff uptime compares to the group average. This helps identify players who may be missing important buffs or who are excelling at maintaining buff uptimes.

## Visual Representation

When viewing individual player buff uptimes, each buff displays:
- **Main Percentage**: The player's actual buff uptime percentage
- **Delta Indicator**: An arrow (↑ or ↓) with the percentage difference from group average
  - **Green with ↑**: Player is above the group average
  - **Red with ↓**: Player is below the group average
  - **Hidden**: Delta is less than 0.5% (considered negligible)

### Example Display

```
Major Savagery    [==================           ] 75%  ↓ -8%
Minor Savagery    [========================== ] 99%  ↑ +1%
Major Courage     [=====================        ] 84%  (no delta shown, within 0.5% of average)
```

## Implementation Details

### Data Structure

#### BuffUptime Interface
```typescript
export interface BuffUptime {
  abilityGameID: string;
  abilityName: string;
  uptimePercentage: number;
  groupAverageUptimePercentage?: number; // Added for delta calculation
  // ... other fields
}
```

### Key Components

#### 1. BuffUptimeProgressBar Component
**Location**: `src/features/report_details/insights/BuffUptimeProgressBar.tsx`

**Enhancements**:
- Calculates delta from `groupAverageUptimePercentage` if provided
- Displays delta indicator with appropriate color and icon
- Only shows delta if absolute value is ≥ 0.5%

**Delta Display Logic**:
```typescript
const delta = React.useMemo(() => {
  if (buff.groupAverageUptimePercentage !== undefined) {
    return currentData.uptimePercentage - buff.groupAverageUptimePercentage;
  }
  return null;
}, [currentData.uptimePercentage, buff.groupAverageUptimePercentage]);
```

#### 2. Utility Functions
**Location**: `src/utils/buffUptimeCalculator.ts`

**New Function**: `computeBuffUptimesWithGroupAverage()`
- Calculates group average across all players
- Calculates individual player's buff uptimes
- Enriches each buff uptime result with `groupAverageUptimePercentage`

**Usage**:
```typescript
const playerUptimes = computeBuffUptimesWithGroupAverage(
  buffLookup,
  {
    abilityIds: buffAbilityIds,
    targetIds: allPlayerIds,
    fightStartTime,
    fightEndTime,
    fightDuration,
    abilitiesById: masterData.abilitiesById,
    isDebuff: false,
    hostilityType: 0,
  },
  selectedPlayerId // Individual player ID
);
```

#### 3. BuffUptimesPanel Component
**Location**: `src/features/report_details/insights/BuffUptimesPanel.tsx`

**Enhanced Props**:
```typescript
interface BuffUptimesPanelProps {
  fight: FightFragment;
  selectedPlayerId?: number | null; // Optional: enables per-player view with deltas
}
```

**Behavior**:
- **Without `selectedPlayerId`**: Shows group average uptimes (no deltas)
- **With `selectedPlayerId`**: Shows player's individual uptimes with delta from group average

## Usage Example

### Scenario 1: Group Average View (Default)
```tsx
<BuffUptimesPanel fight={fight} />
```
- Displays average buff uptimes across all players
- No delta indicators shown

### Scenario 2: Individual Player View
```tsx
<BuffUptimesPanel 
  fight={fight} 
  selectedPlayerId={12345} 
/>
```
- Displays buff uptimes for player with ID 12345
- Shows delta indicators comparing to group average
- Description updates to "Shows buff uptimes for the selected player with delta from group average"

## Testing Scenarios

1. **Group Average Display**
   - No `selectedPlayerId` provided
   - All buffs show percentages without deltas
   - Description: "Shows average buff uptimes across friendly players"

2. **Player Above Average**
   - Player has 95% Major Courage, group average is 87%
   - Display: `95%  ↑ +8%` (green)

3. **Player Below Average**
   - Player has 23% Major Savagery, group average is 31%
   - Display: `23%  ↓ -8%` (red)

4. **Player Near Average**
   - Player has 84% Major Courage, group average is 84.3%
   - Display: `84%` (no delta shown - within 0.5%)

5. **Missing Buff**
   - Player has 0% of a buff while group average is 50%
   - Display: `0%  ↓ -50%` (red)

## Integration Points

### Current Implementation
- **Used in**: `InsightsPanelView.tsx`
- **Data Source**: `useBuffLookupTask()` hook
- **Master Data**: `useReportMasterData()` hook

### Future Enhancements
To enable player selection in the UI, add a player dropdown/selector:

```tsx
const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

// Player selector UI
<FormControl>
  <Select value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)}>
    <MenuItem value={null}>Group Average</MenuItem>
    {players.map(player => (
      <MenuItem key={player.id} value={player.id}>{player.name}</MenuItem>
    ))}
  </Select>
</FormControl>

// Pass to panel
<BuffUptimesPanel fight={fight} selectedPlayerId={selectedPlayerId} />
```

## Performance Considerations

- **Group Average Calculation**: Performed once, cached
- **Per-Player Calculation**: Only performed when `selectedPlayerId` is provided
- **Delta Threshold**: 0.5% threshold reduces visual clutter for negligible differences
- **Memoization**: All calculations memoized to prevent unnecessary re-computation

## Color Scheme

- **Positive Delta (Above Average)**: `#10b981` (green)
- **Negative Delta (Below Average)**: `#ef4444` (red)
- **Icons**: Material-UI `TrendingUpIcon` and `TrendingDownIcon`
- **Text Shadow**: Applied for better readability in both light and dark modes

## Related Files

- `src/features/report_details/insights/BuffUptimeProgressBar.tsx`
- `src/features/report_details/insights/BuffUptimesPanel.tsx`
- `src/features/report_details/insights/BuffUptimesView.tsx`
- `src/utils/buffUptimeCalculator.ts`
- `src/utils/buffUptimeCalculator.test.ts`

## Future Considerations

1. **Player Selection UI**: Add dropdown to select individual player in InsightsPanelView
2. **Tooltip Enhancement**: Add tooltip showing exact group average value on hover
3. **Color Customization**: Allow users to customize delta color thresholds
4. **Historical Comparison**: Compare player's current uptimes to their own historical average
5. **Role-Based Averages**: Compare players to role-specific averages (DPS vs Support)
