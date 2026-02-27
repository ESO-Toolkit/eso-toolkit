/**
 * useRosterActions Hook
 * Provides CRUD operations and action handlers for roster management
 */

import { useCallback } from 'react';
import { RaidRoster, JailDDType } from '../../../types/roster';
import { KnownSetIDs } from '../../../types/abilities';
import { findSetIdByName } from '../../../utils/setNameUtils';
import type { UseRosterStateReturn } from './useRosterState';

interface UseRosterActionsParams {
  roster: RaidRoster;
  updateTank: UseRosterStateReturn['updateTank'];
  updateHealer: UseRosterStateReturn['updateHealer'];
  updateDPSSlot: UseRosterStateReturn['updateDPSSlot'];
  convertDPSToJail: UseRosterStateReturn['convertDPSToJail'];
  convertJailToDPS: UseRosterStateReturn['convertJailToDPS'];
  showSuccess: UseRosterStateReturn['showSuccess'];
  showError: UseRosterStateReturn['showError'];
}

/**
 * Handle set assignment from SetAssignmentManager
 */
interface HandleSetAssignmentParams {
  setName: string;
  role: 'tank1' | 'tank2' | 'healer1' | 'healer2';
  slot: 'set1' | 'set2' | 'monster';
}

/**
 * Hook for roster action handlers
 */
export const useRosterActions = ({
  roster,
  updateTank,
  updateHealer,
  updateDPSSlot,
  convertDPSToJail,
  convertJailToDPS,
  showSuccess,
  showError,
}: UseRosterActionsParams) => {
  /**
   * Helper functions for role mapping
   */
  const getRoleNumber = useCallback((role: 'tank1' | 'tank2' | 'healer1' | 'healer2'): 1 | 2 => {
    return role === 'tank1' || role === 'healer1' ? 1 : 2;
  }, []);

  const isTankRole = useCallback(
    (role: 'tank1' | 'tank2' | 'healer1' | 'healer2'): role is 'tank1' | 'tank2' => {
      return role === 'tank1' || role === 'tank2';
    },
    [],
  );

  /**
   * Handle set assignment from SetAssignmentManager
   */
  const handleSetAssignment = useCallback(({ setName, role, slot }: HandleSetAssignmentParams) => {
    const roleNum = getRoleNumber(role);
    const setId = findSetIdByName(setName);
    if (!setId) return;

    if (isTankRole(role)) {
      updateTank(roleNum, {
        gearSets: {
          ...roster[role].gearSets,
          [slot]: setId,
        },
      });
    } else {
      updateHealer(roleNum, { [slot]: setId });
    }
  }, [roster, getRoleNumber, isTankRole, updateTank, updateHealer]);

  /**
   * Handle ultimate update
   */
  const handleUltimateUpdate = useCallback(
    (role: 'tank1' | 'tank2' | 'healer1' | 'healer2', ultimate: string | null) => {
      const roleNum = getRoleNumber(role);
      if (isTankRole(role)) {
        updateTank(roleNum, { ultimate });
      } else {
        updateHealer(roleNum, { ultimate });
      }
    },
    [getRoleNumber, isTankRole, updateTank, updateHealer],
  );

  /**
   * Handle healer champion point update
   */
  const handleHealerCPUpdate = useCallback(
    (role: 'healer1' | 'healer2', championPoint: RaidRoster['healer1']['championPoint']) => {
      const healerNum = getRoleNumber(role);
      updateHealer(healerNum, { championPoint });
    },
    [getRoleNumber, updateHealer],
  );

  /**
   * Handle DPS drag end
   */
  const handleDPSDragEnd = useCallback(
    ({ active, over }: { active: { id: number }; over?: { id: number } }) => {
      if (over && active.id !== over.id) {
        const oldIndex = roster.dpsSlots.findIndex((slot) => slot.slotNumber === active.id);
        const newIndex = roster.dpsSlots.findIndex((slot) => slot.slotNumber === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          // Reorder the array
          const newDpsSlots = [...roster.dpsSlots];
          const [movedItem] = newDpsSlots.splice(oldIndex, 1);
          newDpsSlots.splice(newIndex, 0, movedItem);

          // Update slot numbers
          const updatedSlots = newDpsSlots.map((slot, index) => ({
            ...slot,
            slotNumber: index + 1,
          }));

          // Emit update by calling each slot update (this is handled in parent)
          updatedSlots.forEach((slot) => {
            updateDPSSlot(slot.slotNumber, slot);
          });
        }
      }
    },
    [roster.dpsSlots, updateDPSSlot],
  );

  /**
   * Quick fill player names from text
   */
  const handleQuickFill = useCallback((quickFillText: string) => {
    const lines = quickFillText.trim().split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      showError('Please enter at least one player name');
      return;
    }

    // Fill tanks first (up to 2)
    if (lines.length > 0 && lines[0]) updateTank(1, { playerName: lines[0].trim() });
    if (lines.length > 1 && lines[1]) updateTank(2, { playerName: lines[1].trim() });

    // Fill healers next (up to 2)
    if (lines.length > 2 && lines[2]) updateHealer(1, { playerName: lines[2].trim() });
    if (lines.length > 3 && lines[3]) updateHealer(2, { playerName: lines[3].trim() });

    // Fill DPS slots (up to 8)
    for (let i = 4; i < Math.min(lines.length, 12); i++) {
      const dpsIndex = i - 4;
      if (lines[i]) {
        updateDPSSlot(dpsIndex + 1, { playerName: lines[i].trim() });
      }
    }

    showSuccess(`Filled ${Math.min(lines.length, 12)} player slots!`);
  }, [updateTank, updateHealer, updateDPSSlot, showSuccess, showError]);

  /**
   * Update available groups from all player groups
   */
  const updateAvailableGroups = useCallback(() => {
    const groups = new Set<string>();

    // Collect groups from tanks
    if (roster.tank1.group?.groupName) groups.add(roster.tank1.group.groupName);
    if (roster.tank2.group?.groupName) groups.add(roster.tank2.group.groupName);

    // Collect groups from healers
    if (roster.healer1.group?.groupName) groups.add(roster.healer1.group.groupName);
    if (roster.healer2.group?.groupName) groups.add(roster.healer2.group.groupName);

    // Collect groups from DPS
    roster.dpsSlots.forEach((slot) => {
      if (slot.group?.groupName) groups.add(slot.group.groupName);
    });

    return Array.from(groups).sort();
  }, [roster]);

  return {
    // Role helpers
    getRoleNumber,
    isTankRole,

    // Set and ultimate handlers
    handleSetAssignment,
    handleUltimateUpdate,
    handleHealerCPUpdate,

    // Drag and drop
    handleDPSDragEnd,

    // Quick fill
    handleQuickFill,

    // Groups
    updateAvailableGroups,

    // Convert to jail DD
    convertDPSToJail,
    convertJailToDPS,
  };
};

export type UseRosterActionsReturn = ReturnType<typeof useRosterActions>;
