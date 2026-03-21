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

interface RosterCardSectionsProps {
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

  return (
    <>
      {/* Tanks Section */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${roleColors.tank}20 0%, ${roleColors.tank}08 100%)`,
              border: `1px solid ${roleColors.tank}25`,
            }}
          >
            <ShieldIcon sx={{ fontSize: '1rem', color: roleColors.tank }} />
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
                  background: `linear-gradient(135deg, ${roleColors.tank} 0%, ${roleColors.tank}99 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Tanks
              </Typography>
              <Box
                component="span"
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  px: 0.75,
                  py: 0.125,
                  borderRadius: '6px',
                  backgroundColor: `${roleColors.tank}12`,
                  color: roleColors.tank,
                  border: `1px solid ${roleColors.tank}25`,
                }}
              >
                {tanks.length}
              </Box>
            </Box>
          </Box>
        </Box>
        <Stack spacing={2} mb={3}>
          {tanks.map((tank, i) => (
            <TankCard
              key={tank.slotNumber}
              tankNum={i + 1}
              tank={tank}
              onChange={tankChangeCallbacks[i]}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${roleColors.healer}20 0%, ${roleColors.healer}08 100%)`,
              border: `1px solid ${roleColors.healer}25`,
            }}
          >
            <FavoriteIcon sx={{ fontSize: '1rem', color: roleColors.healer }} />
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
                  background: `linear-gradient(135deg, ${roleColors.healer} 0%, ${roleColors.healer}99 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Healers
              </Typography>
              <Box
                component="span"
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  px: 0.75,
                  py: 0.125,
                  borderRadius: '6px',
                  backgroundColor: `${roleColors.healer}12`,
                  color: roleColors.healer,
                  border: `1px solid ${roleColors.healer}25`,
                }}
              >
                {healers.length}
              </Box>
            </Box>
          </Box>
        </Box>
        <Stack spacing={2} mb={3}>
          {healers.map((healer, i) => (
            <HealerCard
              key={healer.slotNumber}
              healerNum={i + 1}
              healer={healer}
              onChange={healerChangeCallbacks[i]}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${roleColors.dps}20 0%, ${roleColors.dps}08 100%)`,
              border: `1px solid ${roleColors.dps}25`,
            }}
          >
            <DPSIcon sx={{ fontSize: '1rem', color: roleColors.dps }} />
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
              Damage Dealers
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                sx={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  background: `linear-gradient(135deg, ${roleColors.dps} 0%, ${roleColors.dps}99 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                DPS
              </Typography>
              <Box
                component="span"
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  px: 0.75,
                  py: 0.125,
                  borderRadius: '6px',
                  backgroundColor: `${roleColors.dps}12`,
                  color: roleColors.dps,
                  border: `1px solid ${roleColors.dps}25`,
                }}
              >
                {dpsSlots.length} Slots
              </Box>
            </Box>
          </Box>
        </Box>
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
