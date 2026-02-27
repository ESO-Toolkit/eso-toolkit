/**
 * useRosterState Hook
 * Centralized roster state management
 */

import { useState, useCallback, useEffect } from 'react';
import { RaidRoster, createDefaultRoster } from '../../../types/roster';

interface EncodeRosterToURLParams {
  roster: RaidRoster;
}

interface DecodeRosterFromURLParams {
  encoded: string;
}

/**
 * Encode roster to base64 for URL sharing
 */
const encodeRosterToURL = ({ roster }: EncodeRosterToURLParams): string => {
  try {
    const json = JSON.stringify(roster);
    const base64 = btoa(encodeURIComponent(json));
    return base64;
  } catch {
    return '';
  }
};

/**
 * Decode roster from base64 URL
 */
const decodeRosterFromURL = ({ encoded }: DecodeRosterFromURLParams): RaidRoster | null => {
  try {
    const json = decodeURIComponent(atob(encoded));
    const roster = JSON.parse(json) as RaidRoster;
    return roster;
  } catch {
    return null;
  }
};

/**
 * Validates and normalizes imported roster data to ensure type safety
 */
const validateImportedRoster = (data: unknown): RaidRoster => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid roster data: expected an object');
  }

  const parsedData = data as Partial<RaidRoster>;
  const defaultRoster = createDefaultRoster();

  return {
    ...defaultRoster,
    ...parsedData,
    tank1: parsedData.tank1 && typeof parsedData.tank1 === 'object'
      ? { ...defaultRoster.tank1, ...parsedData.tank1 }
      : defaultRoster.tank1,
    tank2: parsedData.tank2 && typeof parsedData.tank2 === 'object'
      ? { ...defaultRoster.tank2, ...parsedData.tank2 }
      : defaultRoster.tank2,
    healer1: parsedData.healer1 && typeof parsedData.healer1 === 'object'
      ? { ...defaultRoster.healer1, ...parsedData.healer1 }
      : defaultRoster.healer1,
    healer2: parsedData.healer2 && typeof parsedData.healer2 === 'object'
      ? { ...defaultRoster.healer2, ...parsedData.healer2 }
      : defaultRoster.healer2,
    dpsSlots: Array.isArray(parsedData.dpsSlots) && parsedData.dpsSlots.length > 0
      ? parsedData.dpsSlots
      : defaultRoster.dpsSlots,
    availableGroups: Array.isArray(parsedData.availableGroups)
      ? parsedData.availableGroups
      : defaultRoster.availableGroups,
  };
};

/**
 * Main hook for roster state management
 */
export const useRosterState = () => {
  const [roster, setRoster] = useState<RaidRoster>(createDefaultRoster());
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Update roster name
  const updateRosterName = useCallback((name: string) => {
    setRoster((prev) => ({
      ...prev,
      rosterName: name,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Update roster notes
  const updateRosterNotes = useCallback((notes: string) => {
    setRoster((prev) => ({
      ...prev,
      notes,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Add a group to available groups
  const addGroup = useCallback((groupName: string) => {
    setRoster((prev) => ({
      ...prev,
      availableGroups: [...prev.availableGroups, groupName].filter(Boolean),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Update a specific DPS slot
  const updateDPSSlot = useCallback((slotNumber: number, updates: Parameters<typeof setRoster>[0]['dpsSlots'][number]) => {
    setRoster((prev) => {
      const updatedDpsSlots = [...prev.dpsSlots];
      const slotIndex = updatedDpsSlots.findIndex((s) => s.slotNumber === slotNumber);
      if (slotIndex === -1) return prev;

      updatedDpsSlots[slotIndex] = {
        ...updatedDpsSlots[slotIndex],
        ...updates,
      };

      return {
        ...prev,
        dpsSlots: updatedDpsSlots,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Reorder DPS slots
  const reorderDPSSlots = useCallback((oldIndex: number, newIndex: number) => {
    setRoster((prev) => {
      const newDpsSlots = [...prev.dpsSlots];
      const [movedItem] = newDpsSlots.splice(oldIndex, 1);
      newDpsSlots.splice(newIndex, 0, movedItem);

      return {
        ...prev,
        dpsSlots: newDpsSlots,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Update a tank setup
  const updateTank = useCallback((tankNum: 1 | 2, updates: Partial<RaidRoster['tank1']>) => {
    setRoster((prev) => ({
      ...prev,
      [`tank${tankNum}`]: {
        ...prev[`tank${tankNum}` as 'tank1' | 'tank2'],
        ...updates,
      },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Update a healer setup
  const updateHealer = useCallback((healerNum: 1 | 2, updates: Partial<RaidRoster['healer1']>) => {
    setRoster((prev) => ({
      ...prev,
      [`healer${healerNum}`]: {
        ...prev[`healer${healerNum}` as 'healer1' | 'healer2'],
        ...updates,
      },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Convert DPS slot to jail DD
  const convertDPSToJail = useCallback((slotNumber: number, jailType: RaidRoster['dpsSlots'][number]['jailDDType']) => {
    setRoster((prev) => {
      const slotIndex = prev.dpsSlots.findIndex((s) => s.slotNumber === slotNumber);
      if (slotIndex === -1) return prev;

      const updatedDpsSlots = [...prev.dpsSlots];
      updatedDpsSlots[slotIndex] = {
        ...updatedDpsSlots[slotIndex],
        jailDDType: jailType,
        customDescription: jailType === 'custom' ? '' : undefined,
      };

      return {
        ...prev,
        dpsSlots: updatedDpsSlots,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Convert jail DD back to regular DPS
  const convertJailToDPS = useCallback((slotNumber: number) => {
    setRoster((prev) => {
      const slotIndex = prev.dpsSlots.findIndex((s) => s.slotNumber === slotNumber);
      if (slotIndex === -1) return prev;

      const updatedDpsSlots = [...prev.dpsSlots];
      const { jailDDType, customDescription, ...regularSlot } = updatedDpsSlots[slotIndex];
      updatedDpsSlots[slotIndex] = regularSlot;

      return {
        ...prev,
        dpsSlots: updatedDpsSlots,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Show success snackbar
  const showSuccess = useCallback((message: string) => {
    setSnackbar({ open: true, message, severity: 'success' });
  }, []);

  // Show error snackbar
  const showError = useCallback((message: string) => {
    setSnackbar({ open: true, message, severity: 'error' });
  }, []);

  // Close snackbar
  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  // Load roster from URL on mount
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const decoded = decodeRosterFromURL({ encoded: hash });
      if (decoded) {
        setRoster(decoded);
        showSuccess('Roster loaded from shared link!');
      }
    }
  }, [showSuccess]);

  // Update URL hash when roster changes
  useEffect(() => {
    const encoded = encodeRosterToURL({ roster });
    if (encoded) {
      window.location.hash = encoded;
    }
  }, [roster]);

  return {
    // State
    roster,
    setRoster,
    snackbar,
    setSnackbar,

    // Roster operations
    updateRosterName,
    updateRosterNotes,
    addGroup,
    updateDPSSlot,
    reorderDPSSlots,
    updateTank,
    updateHealer,
    convertDPSToJail,
    convertJailToDPS,

    // Snackbar operations
    showSuccess,
    showError,
    closeSnackbar,

    // Utilities
    encodeRosterToURL,
    decodeRosterFromURL,
    validateImportedRoster,
  };
};

export type UseRosterStateReturn = ReturnType<typeof useRosterState>;
