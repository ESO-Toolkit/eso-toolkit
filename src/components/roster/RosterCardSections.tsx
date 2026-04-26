/**
 * Memoized wrapper for the tank/healer/DPS card rendering sections.
 *
 * Extracted from RosterBuilderPage to prevent the 3700-line parent from
 * re-diffing all card JSX on every state change. This component only
 * re-renders when its specific props change (tanks/healers/dpsSlots arrays,
 * callbacks, mode, groups).
 */

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  Shield as ShieldIcon,
  Favorite as FavoriteIcon,
  AutoAwesome as DPSIcon,
} from '@mui/icons-material';
import { Box, Divider, Stack, Typography } from '@mui/material';
import React from 'react';

import type {
  TankSetup,
  HealerSetup,
  DPSSlot,
  RosterDetailLevel,
  HealerBuff,
  JailDDType,
} from '../../types/roster';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../../utils/roleColors';

import { DPSSlotCard } from './DPSSlotCard';
import { HealerCard } from './HealerSlotCard';
import { TankCard } from './TankSlotCard';

// Stable no-op callback for edge cases where callbacks array is shorter than data
const NOOP_TANK = (): void => {};
const NOOP_HEALER = (): void => {};

interface RosterCardSectionsProps {
  tanks: TankSetup[];
  healers: HealerSetup[];
  dpsSlots: DPSSlot[];
  tankChangeCallbacks: ((updates: Partial<TankSetup>) => void)[];
  healerChangeCallbacks: ((updates: Partial<HealerSetup>) => void)[];
  handleDPSSlotChange: (index: number, updates: Partial<DPSSlot>) => void;
  handleConvertDPSToJail: (slotNumber: number, type: JailDDType) => void;
  handleConvertJailToDPS: (slotNumber: number) => void;
  handleMoveDPSSlot: (slotIndex: number, direction: 'up' | 'down') => void;
  availableGroups: string[];
  usedBuffs: HealerBuff[];
  mode: RosterDetailLevel;
  savedRosterId?: string;
  isDarkMode: boolean;
  dpsSlotIds: number[];
  sensors: SensorDescriptor<SensorOptions>[];
  handleDPSDragEnd: (event: DragEndEvent) => void;
}

export const RosterCardSections = React.memo<RosterCardSectionsProps>(function RosterCardSections({
  tanks,
  healers,
  dpsSlots,
  tankChangeCallbacks,
  healerChangeCallbacks,
  handleDPSSlotChange,
  handleConvertDPSToJail,
  handleConvertJailToDPS,
  handleMoveDPSSlot,
  availableGroups,
  usedBuffs,
  mode,
  savedRosterId,
  isDarkMode,
  dpsSlotIds,
  sensors,
  handleDPSDragEnd,
}) {
  const roleColors = isDarkMode ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;

  // Only render active slots — startTransition in the parent ensures
  // the picker updates instantly while this re-render is deferred.

  const renderSectionHeader = (
    icon: React.ReactNode,
    label: string,
    count: number,
    countLabel: string,
    color: string,
  ): React.ReactNode => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '9px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`,
          border: `1px solid ${color}25`,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          sx={{
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'text.disabled',
            lineHeight: 1,
            mb: 0.375,
          }}
        >
          Role
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: '1.05rem',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {label}
          </Typography>
          <Box
            component="span"
            sx={{
              fontSize: '0.65rem',
              fontWeight: 600,
              px: 0.75,
              py: 0.125,
              borderRadius: '6px',
              backgroundColor: `${color}12`,
              color,
              border: `1px solid ${color}25`,
            }}
          >
            {countLabel}
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Tanks Section */}
      <Box>
        {renderSectionHeader(
          <ShieldIcon sx={{ fontSize: '1rem', color: roleColors.tank }} />,
          'Tanks',
          tanks.length,
          String(tanks.length),
          roleColors.tank,
        )}
        <Stack spacing={2} mb={3}>
          {tanks.map((tank, i) => (
            <TankCard
              key={tank.slotNumber}
              tankNum={i + 1}
              tank={tank}
              onChange={tankChangeCallbacks[i] ?? NOOP_TANK}
              availableGroups={availableGroups}
              mode={mode}
              savedRosterId={savedRosterId}
            />
          ))}
        </Stack>
      </Box>

      <Divider
        sx={{
          my: 1.5,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }}
      />

      {/* Healers Section */}
      <Box>
        {renderSectionHeader(
          <FavoriteIcon sx={{ fontSize: '1rem', color: roleColors.healer }} />,
          'Healers',
          healers.length,
          String(healers.length),
          roleColors.healer,
        )}
        <Stack spacing={2} mb={3}>
          {healers.map((healer, i) => (
            <HealerCard
              key={healer.slotNumber}
              healerNum={i + 1}
              healer={healer}
              onChange={healerChangeCallbacks[i] ?? NOOP_HEALER}
              availableGroups={availableGroups}
              usedBuffs={usedBuffs}
              mode={mode}
              savedRosterId={savedRosterId}
            />
          ))}
        </Stack>
      </Box>

      <Divider
        sx={{
          my: 1.5,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }}
      />

      {/* DPS Section */}
      <Box>
        {renderSectionHeader(
          <DPSIcon sx={{ fontSize: '1rem', color: roleColors.dps }} />,
          'DPS',
          dpsSlots.length,
          `${dpsSlots.length} Slots`,
          roleColors.dps,
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDPSDragEnd}
        >
          <SortableContext items={dpsSlotIds} strategy={verticalListSortingStrategy}>
            <Stack spacing={1.5} mb={3}>
              {dpsSlots.map((slot, index) => (
                <DPSSlotCard
                  key={slot.slotNumber}
                  slot={slot}
                  slotIndex={index}
                  availableGroups={availableGroups}
                  onSlotChange={handleDPSSlotChange}
                  onConvertToJail={handleConvertDPSToJail}
                  onConvertToDPS={handleConvertJailToDPS}
                  onMoveSlot={handleMoveDPSSlot}
                  totalDpsSlots={dpsSlots.length}
                  mode={mode}
                  savedRosterId={savedRosterId}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      </Box>
    </>
  );
});
