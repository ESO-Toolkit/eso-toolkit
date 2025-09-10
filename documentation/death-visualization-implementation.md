# Death Visualization Implementation

## Summary

Added visual death indicators to the fight replay system that shows when players have died and removes the indicator after their next event.

## Changes Made

### 1. Core Data Structure Updates

**`CalculateActorPositions.ts`**:

- Added `isDead: boolean` property to `ActorPosition` and `ActorTimeline` interfaces
- Added death tracking data structures:
  - `actorDeathTime: Map<number, number | undefined>` - tracks when each actor died
  - `actorLastEventTime: Map<number, number>` - tracks last event for each actor
- Enhanced event processing to:
  - Mark actors as dead when death events occur
  - Mark actors as alive again when they have subsequent non-death events
  - Stop position interpolation when actors are dead (uses last known position before death)

### 2. Visual Component Updates

**`ActorMarker.tsx`**:

- Added `isDead?: boolean` prop to interface
- Updated color logic to use `isDead` instead of `!isAlive`
- Enhanced death visualization:
  - Gray color for dead players (#666666)
  - White outline for better contrast on dead players
  - Skull representation with eye sockets and nose cavity
  - Removed direction indicator for dead players

**`CombatArena.tsx`**:

- Added `isDead: boolean` to local `Actor` interface
- Passed `isDead` prop to `ActorMarker` component

### 3. Data Flow Updates

**`useActorPositionsAtTime.ts`**:

- Added `isDead` property when creating `ActorPosition` objects from timeline data

## Functionality

### Death Detection

- Tracks death events and marks actors as dead at the exact timestamp
- Prevents position interpolation after death (actors stay at their death location)
- Automatically marks actors as alive when they have any subsequent event (damage, heal, etc.)

### Visual Indicators

- **Living Players**: Normal role-colored cylinder with direction cone
- **Dead Players**:
  - Gray skull-shaped marker
  - No direction indicator
  - Semi-transparent appearance
  - White text outline for better visibility

### Timeline Behavior

- Dead actors appear at their last known position before death
- No movement interpolation occurs while dead
- Resurrection is automatic when the actor has any new event
- Works seamlessly with existing camera lock and selection features

## Technical Details

The system works by:

1. Processing all events chronologically during position calculation
2. Tracking death timestamps and subsequent event timestamps
3. Applying death status during position sampling at each frame
4. Rendering different visual representations based on death status
5. Maintaining performance by reusing existing rendering pipeline

This implementation provides clear visual feedback about player deaths while maintaining smooth replay performance and integrating naturally with existing features like camera controls and actor selection.
