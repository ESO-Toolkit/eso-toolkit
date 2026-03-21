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
  RoleComposition,
} from '../../types/roster';
import { ROSTER_SIZE, defaultTankSetup, defaultHealerSetup } from '../../types/roster';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../../utils/roleColors';

import { DPSSlotCard } from './DPSSlotCard';
import { HealerCard } from './HealerSlotCard';
import { TankCard } from './TankSlotCard';

// Stable no-op callback for hidden card slots
const NOOP_TANK = (): void => {};
const NOOP_HEALER = (): void => {};

// Pre-built default slots for the pool (indices 0..11)
const POOL_TANKS = Array.from({ length: ROSTER_SIZE }, (_, i) => defaultTankSetup(i + 1));
const POOL_HEALERS = Array.from({ length: ROSTER_SIZE }, (_, i) => defaultHealerSetup(i + 1));
const POOL_DPS: DPSSlot[] = Array.from({ length: ROSTER_SIZE }, (_, i) => ({ slotNumber: i + 1 }));

interface RosterCardSectionsProps {
  composition: RoleComposition;
  tanks: TankSetup[];
  healers: HealerSetup[];
  dpsSlots: DPSSlot[];
  tankChangeCallbacks: ((updates: Partial<TankSetup>) => void)[];
  healerChangeCallbacks: ((updates: Partial<HealerSetup>) => void)[];
  handleDPSSlotChange: (index: number, updates: Partial<DPSSlot>) => void;
  handleConvertDPSToJail: (slotNumber: number, type: JailDDType) => void;
  handleConvertJailToDPS: (slotNumber: number) => void;
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
  composition,
  tanks,
  healers,
  dpsSlots,
  tankChangeCallbacks,
  healerChangeCallbacks,
  handleDPSSlotChange,
  handleConvertDPSToJail,
  handleConvertJailToDPS,
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

  // ── Fixed pool approach ─────────────────────────────────────────
  // Always render ROSTER_SIZE (12) card slots across all roles.
  // Active slots get real data; inactive slots get defaults + display:none.
  // This means composition changes toggle CSS instead of mount/unmount,
  // eliminating MUI Autocomplete forced reflow lag entirely.

  const maxTanks = Math.max(composition.tanks, tanks.length);
  const maxHealers = Math.max(composition.healers, healers.length);
  const maxDPS = Math.max(composition.dps, dpsSlots.length);

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
          composition.tanks,
          String(composition.tanks),
          roleColors.tank,
        )}
        <Stack spacing={2} mb={3}>
          {Array.from({ length: maxTanks }, (_, i) => {
            const visible = i < composition.tanks;
            const tank = tanks[i] ?? POOL_TANKS[i];
            return (
              <Box key={i} sx={{ display: visible ? 'block' : 'none' }}>
                <TankCard
                  tankNum={i + 1}
                  tank={tank}
                  onChange={tankChangeCallbacks[i] ?? NOOP_TANK}
                  availableGroups={availableGroups}
                  mode={mode}
                  savedRosterId={savedRosterId}
                />
              </Box>
            );
          })}
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
          composition.healers,
          String(composition.healers),
          roleColors.healer,
        )}
        <Stack spacing={2} mb={3}>
          {Array.from({ length: maxHealers }, (_, i) => {
            const visible = i < composition.healers;
            const healer = healers[i] ?? POOL_HEALERS[i];
            return (
              <Box key={i} sx={{ display: visible ? 'block' : 'none' }}>
                <HealerCard
                  healerNum={i + 1}
                  healer={healer}
                  onChange={healerChangeCallbacks[i] ?? NOOP_HEALER}
                  availableGroups={availableGroups}
                  usedBuffs={usedBuffs}
                  mode={mode}
                  savedRosterId={savedRosterId}
                />
              </Box>
            );
          })}
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
          composition.dps,
          `${composition.dps} Slots`,
          roleColors.dps,
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDPSDragEnd}
        >
          <SortableContext items={dpsSlotIds} strategy={verticalListSortingStrategy}>
            <Stack spacing={1.5} mb={3}>
              {Array.from({ length: maxDPS }, (_, i) => {
                const visible = i < composition.dps;
                const slot = dpsSlots[i] ?? POOL_DPS[i];
                return (
                  <Box key={i} sx={{ display: visible ? 'block' : 'none' }}>
                    <DPSSlotCard
                      slot={slot}
                      slotIndex={i}
                      availableGroups={availableGroups}
                      onSlotChange={handleDPSSlotChange}
                      onConvertToJail={handleConvertDPSToJail}
                      onConvertToDPS={handleConvertJailToDPS}
                      mode={mode}
                      savedRosterId={savedRosterId}
                    />
                  </Box>
                );
              })}
            </Stack>
          </SortableContext>
        </DndContext>
      </Box>
    </>
  );
});
