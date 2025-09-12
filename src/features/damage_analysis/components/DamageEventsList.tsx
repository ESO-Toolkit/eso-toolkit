import { Alert, Box, Typography } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { DamageEvent } from '../../../types/combatlogEvents';
import { useBuffDebuffLookup } from '../hooks/useBuffDebuffLookup';

import { DamageEventCard } from './DamageEventCard';

interface BuffDebuffInfo {
  abilityGameID: number;
  name: string;
  icon: string;
  timestamp: number;
}

interface DamageEventsListProps {
  damageEvents: DamageEvent[];
  selectedActorId: number;
  fight: FightFragment;
}

interface VirtualizedItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    events: DamageEvent[];
    selectedActorId: number;
    fight: FightFragment;
    getActiveBuffsForTimestamp: (timestamp: number) => BuffDebuffInfo[];
    getActiveDebuffsForTarget: (timestamp: number, targetId: number) => BuffDebuffInfo[];
    visibleRange: { start: number; end: number };
  };
}

// Custom virtualized container using intersection observer
const VirtualizedContainer: React.FC<{
  itemCount: number;
  itemHeight: number;
  height: number;
  itemData: VirtualizedItemProps['data'];
  children: React.ComponentType<VirtualizedItemProps>;
}> = ({ itemCount, itemHeight, height, itemData, children: ItemComponent }) => {
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 20 });
  const scrollElementRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = React.useCallback(() => {
    if (!scrollElementRef.current) return;

    const scrollTop = scrollElementRef.current.scrollTop;
    const containerHeight = height;

    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 5, itemCount); // Add 5 for buffer

    setVisibleRange({ start: Math.max(0, start - 5), end }); // Add 5 for buffer before
  }, [itemHeight, height, itemCount]);

  React.useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    element.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation

    return () => element.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const visibleItems = React.useMemo(() => {
    const items = [];
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      if (i >= itemCount) break;

      items.push(
        <ItemComponent
          key={i}
          index={i}
          style={{
            position: 'absolute',
            top: i * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          }}
          data={{ ...itemData, visibleRange }}
        />,
      );
    }
    return items;
  }, [visibleRange, itemCount, itemHeight, ItemComponent, itemData]);

  return (
    <div
      ref={scrollElementRef}
      style={{
        height,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <div style={{ height: itemCount * itemHeight, position: 'relative' }}>{visibleItems}</div>
    </div>
  );
};

const VirtualizedDamageEventItem: React.FC<VirtualizedItemProps> = ({ index, style, data }) => {
  const { events, selectedActorId, fight, getActiveBuffsForTimestamp, getActiveDebuffsForTarget } =
    data;
  const event = events[index];

  if (!event) return null;

  const activeBuffs = getActiveBuffsForTimestamp(event.timestamp);
  const activeDebuffs = getActiveDebuffsForTarget(event.timestamp, event.targetID);

  return (
    <div style={style}>
      <Box sx={{ px: 2, py: 1 }}>
        <DamageEventCard
          event={event}
          activeBuffs={activeBuffs}
          activeDebuffs={activeDebuffs}
          fight={fight}
        />
      </Box>
    </div>
  );
};

export const DamageEventsList: React.FC<DamageEventsListProps> = ({
  damageEvents,
  selectedActorId,
  fight,
}) => {
  // Sort damage events by timestamp
  const sortedDamageEvents = React.useMemo(() => {
    return [...damageEvents].sort((a, b) => a.timestamp - b.timestamp);
  }, [damageEvents]);

  // Extract unique timestamps for optimization
  const damageEventTimestamps = React.useMemo(() => {
    return sortedDamageEvents.map((event) => event.timestamp);
  }, [sortedDamageEvents]);

  // Use optimized lookup hook with new signature
  const {
    getActiveBuffsForTimestamp,
    getActiveDebuffsForTarget,
    isLoading: isBuffDebuffLoading,
    error: buffDebuffError,
  } = useBuffDebuffLookup(damageEventTimestamps, selectedActorId);

  // Prepare data for virtualized list
  const listData = React.useMemo(
    () => ({
      events: sortedDamageEvents,
      selectedActorId,
      fight,
      getActiveBuffsForTimestamp,
      getActiveDebuffsForTarget,
      visibleRange: { start: 0, end: 20 },
    }),
    [
      sortedDamageEvents,
      selectedActorId,
      fight,
      getActiveBuffsForTimestamp,
      getActiveDebuffsForTarget,
    ],
  );

  if (sortedDamageEvents.length === 0) {
    return (
      <Alert severity="info">
        No damage events found for this actor during the selected fight.
      </Alert>
    );
  }

  if (isBuffDebuffLoading) {
    return <Alert severity="info">Loading buff and debuff data for damage correlation...</Alert>;
  }

  if (buffDebuffError) {
    return <Alert severity="error">Error loading buff/debuff data: {buffDebuffError}</Alert>;
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {sortedDamageEvents.length} damage events (virtualized for performance)
      </Typography>

      {/* Custom virtualized list for performance with large datasets */}
      <Box
        sx={{
          height: '600px',
          width: '100%',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <VirtualizedContainer
          height={600}
          itemCount={sortedDamageEvents.length}
          itemHeight={200} // Approximate height of each damage event card
          itemData={listData}
        >
          {VirtualizedDamageEventItem}
        </VirtualizedContainer>
      </Box>
    </Box>
  );
};
