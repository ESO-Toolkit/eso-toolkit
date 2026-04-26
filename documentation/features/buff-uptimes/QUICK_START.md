# Buff Uptime Delta Display - Quick Start Guide

## Visual Example

When viewing an individual player's buff uptimes, you'll see delta indicators showing how they compare to the group:

```
┌─────────────────────────────────────────────────────────────────┐
│ DAMAGE BUFFS                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Icon] Major Savagery        [████░░░░░░░░░░░░] 23% ↓ -8%    │
│         23 applications • 46.2s total                avg: 31%   │
│                                                                 │
│  [Icon] Minor Savagery        [█████████████████████] 99% ↑ +1%│
│         142 applications • 198.6s total              avg: 98%   │
│                                                                 │
│  [Icon] Major Courage         [█████████████████░░░] 84%       │
│         98 applications • 168.4s total               avg: 87%   │
│                                                                 │
│  [Icon] Minor Courage         [███████████████████░] 97% ↑ +1% │
│         127 applications • 194.6s total              avg: 96%   │
│                                                                 │
│  [Icon] Major Berserk         [████░░░░░░░░░░░░░░░]  8% ↓ -4%  │
│         12 applications • 16.0s total                avg: 12%   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Legend**:
- ↑ Green: Player is **above** group average
- ↓ Red: Player is **below** group average
- No indicator: Within 0.5% of group average

## How to Use

### In Your Component

```typescript
import { BuffUptimesPanel } from '@/features/report_details/insights/BuffUptimesPanel';

// Option 1: Show group averages (default)
<BuffUptimesPanel fight={fight} />

// Option 2: Show individual player with delta indicators
<BuffUptimesPanel 
  fight={fight} 
  selectedPlayerId={12345} 
/>
```

### With Player Selection

```typescript
import React from 'react';
import { MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { BuffUptimesPanel } from '@/features/report_details/insights/BuffUptimesPanel';

export const MyComponent = ({ fight, players }) => {
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<number | null>(null);

  return (
    <>
      {/* Player Selector */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>View Player Uptimes</InputLabel>
        <Select
          value={selectedPlayerId ?? 'group'}
          onChange={(e) => setSelectedPlayerId(
            e.target.value === 'group' ? null : Number(e.target.value)
          )}
        >
          <MenuItem value="group">Group Average</MenuItem>
          {players.map(player => (
            <MenuItem key={player.id} value={player.id}>
              {player.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Buff Uptimes Panel */}
      <BuffUptimesPanel 
        fight={fight} 
        selectedPlayerId={selectedPlayerId}
      />
    </>
  );
};
```

## Real-World Example

Looking at the screenshot you provided:

```
Major Savagery:  23% (avg 23%)  → No delta shown (within 0.5%)
Minor Savagery:  99% (avg 98%)  → ↑ +1%
Major Courage:   84% (avg 87%)  → ↓ -3%
Minor Courage:   97% (avg 96%)  → ↑ +1%
Major Berserk:    8% (avg 12%)  → ↓ -4%
Minor Berserk:   75% (avg 84%)  → ↓ -9%
Major Sorcery:    0% (avg 13%)  → ↓ -13%
```

## Understanding the Data

### Positive Deltas (↑ Green)
- Player is maintaining this buff **better than average**
- Example: `99% ↑ +1%` - Player has 99% uptime vs 98% group average
- Good sign of buff management

### Negative Deltas (↓ Red)
- Player is maintaining this buff **worse than average**
- Example: `23% ↓ -8%` - Player has 23% uptime vs 31% group average
- May indicate missing buff source or positioning issues

### No Delta Shown
- Player's uptime is within ±0.5% of group average
- Considered equivalent to group performance
- Reduces visual clutter

## Performance Tips

### What the Deltas Tell You

1. **Large Negative Deltas on Self-Buffs**
   - Player may be dying frequently
   - Player may be missing key skills/gear
   - Example: `-20%` on Major Savagery suggests missing Savagery potion or skill

2. **Large Negative Deltas on Group Buffs**
   - Player may be out of range of supports
   - Positioning issue
   - Example: `-15%` on Major Courage suggests staying too far from group

3. **Consistently Positive Deltas**
   - Player has good buff management
   - Good positioning near supports
   - May be using additional buff sources

4. **All Negative Deltas**
   - Player dying frequently (reduces all uptime)
   - Poor positioning
   - Missing core buffs from build

## Next Steps

1. **Identify Gaps**: Look for large negative deltas
2. **Check Build**: Verify player has buff sources (skills, gear, potions)
3. **Review Positioning**: Large negative deltas on group buffs = positioning issue
4. **Compare Deaths**: High death count often correlates with low buff uptimes
5. **Optimize Rotation**: Some buffs require active maintenance

## API Reference

### BuffUptimesPanelProps

```typescript
interface BuffUptimesPanelProps {
  fight: FightFragment;              // Required: Fight data
  selectedPlayerId?: number | null;  // Optional: Player ID for per-player view
}
```

### BuffUptime Data Structure

```typescript
interface BuffUptime {
  abilityGameID: string;
  abilityName: string;
  uptimePercentage: number;              // Player's uptime %
  groupAverageUptimePercentage?: number; // Group average % (for delta)
  applications: number;
  totalDuration: number;
  uptime: number;
  // ... other fields
}
```

## Troubleshooting

### Delta Not Showing

**Problem**: Selected a player but no deltas appear

**Solutions**:
1. Ensure `selectedPlayerId` is a valid player ID
2. Check that player participated in the fight
3. Verify `groupAverageUptimePercentage` is being calculated

### All Deltas Are Zero

**Problem**: All deltas show as 0%

**Solution**: Only one player in the fight - group average equals player average

### Wrong Deltas

**Problem**: Deltas seem incorrect

**Solution**:
1. Check that `targetIds` includes all players
2. Verify fight start/end times are correct
3. Ensure buff lookup data is complete

## More Information

See [BUFF_UPTIME_DELTA_DISPLAY.md](./BUFF_UPTIME_DELTA_DISPLAY.md) for complete technical documentation.
