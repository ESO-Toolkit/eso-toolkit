import { gql } from '@apollo/client';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  Link as LinkIcon,
  PersonAdd as PersonAddIcon,
  Star as GearIcon,
  DragIndicator as DragIndicatorIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import {
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Autocomplete,
  Chip,
  Divider,
  Alert,
  Snackbar,
  FormControlLabel,
  Checkbox,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import React, { useState, useCallback } from 'react';

import { SetAssignmentManager } from '../components/SetAssignmentManager';
import { useEsoLogsClientContext } from '../EsoLogsClientContext';
import { useAuth } from '../features/auth/AuthContext';
import { GetPlayersForReportQuery } from '../graphql/gql/graphql';
import { KnownAbilities, KnownSetIDs } from '../types/abilities';
import {
  RaidRoster,
  TankSetup,
  HealerSetup,
  DPSSlot,
  SupportUltimate,
  HealerBuff,
  HealerChampionPoint,
  JailDDType,
  CLASS_SKILL_LINES,
  SkillLineConfig,
  createDefaultRoster,
  TANK_5PIECE_SETS,
  HEALER_5PIECE_SETS,
  FLEXIBLE_5PIECE_SETS,
  TANK_MONSTER_SETS,
  HEALER_MONSTER_SETS,
  FLEXIBLE_MONSTER_SETS,
  MONSTER_SETS,
  ALL_5PIECE_SETS,
  validateCompatibility,
} from '../types/roster';
import { getSetDisplayName, findSetIdByName } from '../utils/setNameUtils';

/**
 * Type definitions for log file import
 */
interface GearItem {
  setName?: string;
  setID?: number; // Set ID from API
  permanentEnchant?: number; // Mythic items have this set, counts as 2 pieces
  [key: string]: unknown;
}

interface TalentItem {
  name?: string;
  guid?: number;
  type?: number;
  abilityIcon?: string;
  flags?: number;
  [key: string]: unknown;
}

interface CombatantInfo {
  gear?: GearItem[];
  talents?: TalentItem[];
  [key: string]: unknown;
}

interface PlayerData {
  name?: string;
  id?: number;
  combatantInfo?: CombatantInfo;
  [key: string]: unknown;
}

interface PlayerDetails {
  tanks?: PlayerData[];
  healers?: PlayerData[];
  dps?: PlayerData[];
  [key: string]: unknown;
}

interface AuraInfo {
  source: number;
  ability: number;
  stacks?: number;
  icon?: string;
  name?: string;
}

interface CombatantInfoEvent {
  timestamp: number;
  type: string;
  sourceID: number;
  targetID?: number;
  sourceIsFriendly?: boolean;
  auras?: AuraInfo[];
}

/**
 * GraphQL query for fetching player details and combatant info events from a report
 */
const GET_PLAYERS_FOR_REPORT = gql`
  query getPlayersForReport($code: String!, $fightIDs: [Int]) {
    reportData {
      report(code: $code) {
        playerDetails(includeCombatantInfo: true, fightIDs: $fightIDs)
        events(fightIDs: $fightIDs, dataType: CombatantInfo, useActorIDs: true, limit: 1000000) {
          data
        }
      }
    }
  }
`;

/**
 * Encode roster to base64 for URL sharing
 */
const encodeRosterToURL = (roster: RaidRoster): string => {
  try {
    const json = JSON.stringify(roster);
    const base64 = btoa(encodeURIComponent(json));
    return base64;
  } catch {
    // Failed to encode roster
    return '';
  }
};

/**
 * Decode roster from base64 URL
 */
const decodeRosterFromURL = (encoded: string): RaidRoster | null => {
  try {
    const json = decodeURIComponent(atob(encoded));
    const roster = JSON.parse(json) as RaidRoster;
    return roster;
  } catch {
    // Failed to decode roster
    return null;
  }
};

// Icon mappings for ESO abilities
const ULTIMATE_ICONS: Record<string, string> = {
  [SupportUltimate.WARHORN]: 'ability_ava_003_a',
  [SupportUltimate.COLOSSUS]: 'ability_necromancer_006_b',
  [SupportUltimate.BARRIER]: 'ability_ava_006',
  [SupportUltimate.ATRONACH]: 'ability_sorcerer_greater_storm_atronach',
};

const HEALER_BUFF_ICONS: Record<string, string> = {
  [HealerBuff.ENLIVENING_OVERFLOW]: 'ability_mage_065',
  [HealerBuff.FROM_THE_BRINK]: 'ability_mage_065',
};

const SKILL_LINE_ICONS: Record<string, string> = {
  // Dragonknight
  'Ardent Flame': 'ability_dragonknight_001', // Lava Whip
  'Draconic Power': 'ability_dragonknight_008', // Protective Scale
  'Earthen Heart': 'ability_dragonknight_007', // Spiked Armor

  // Sorcerer
  'Dark Magic': 'ability_sorcerer_mage_wraith', // Mages' Wrath
  'Daedric Summoning': 'ability_sorcerer_greater_storm_atronach',
  'Storm Calling': 'ability_sorcerer_endless_fury',

  // Nightblade
  Assassination: 'ability_nightblade_012', // Strife
  Shadow: 'ability_nightblade_012',
  Siphoning: 'ability_nightblade_012',

  // Templar
  'Aedric Spear': 'ability_templar_sun_fire',
  "Dawn's Wrath": 'ability_templar_sun_fire',
  'Restoring Light': 'ability_templar_sun_fire',

  // Warden
  'Animal Companions': 'ability_mage_065',
  'Green Balance': 'ability_mage_065',
  "Winter's Embrace": 'ability_mage_065',

  // Necromancer
  'Grave Lord': 'ability_necromancer_006_b', // Blastbones
  'Bone Tyrant': 'ability_necromancer_006_b',
  'Living Death': 'ability_necromancer_006_b',

  // Arcanist
  'Herald of the Tome': 'ability_mage_065',
  'Apocryphal Soldier': 'ability_mage_065',
  'Curative Runeforms': 'ability_mage_065',
};

/**
 * Get icon for ultimates
 */
const getUltimateIcon = (ultimate: string | undefined): React.ReactElement | null => {
  if (!ultimate) return null;
  const iconFile = ULTIMATE_ICONS[ultimate];
  if (!iconFile) return null;
  return (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/abilities/${iconFile}.png`}
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
};

/**
 * Get icon for healer buffs
 */
const getHealerBuffIcon = (buff: string | undefined): React.ReactElement | null => {
  if (!buff) return null;
  const iconFile = HEALER_BUFF_ICONS[buff];
  if (!iconFile) return null;
  return (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/abilities/${iconFile}.png`}
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
};

/**
 * Get icon for skill lines based on class
 */
const getSkillLineIcon = (skillLine: string): React.ReactElement | null => {
  const iconFile = SKILL_LINE_ICONS[skillLine];
  if (!iconFile) return null;
  return (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/abilities/${iconFile}.png`}
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
};

/**
 * Get 5-piece set options for tank role (set1/set2 slots only)
 */
const getTank5PieceSetOptions = (): readonly string[] => {
  // Return sets in order: Tank-specific first, then Hybrid, maintaining alphabetical within each group
  // Use Sets to avoid duplicates if a set appears in both arrays
  const tankSets = Array.from(TANK_5PIECE_SETS)
    .map((id) => getSetDisplayName(id))
    .sort();
  const hybridSets = Array.from(FLEXIBLE_5PIECE_SETS)
    .filter((set) => !TANK_5PIECE_SETS.includes(set))
    .map((id) => getSetDisplayName(id))
    .sort();

  return [...tankSets, ...hybridSets];
};

/**
 * Get monster set options for tank role (monsterSet slot only)
 */
const getTankMonsterSetOptions = (): readonly string[] => {
  const sets = new Set<string>();

  // Add tank-specific monster sets
  TANK_MONSTER_SETS.forEach((id) => sets.add(getSetDisplayName(id)));

  // Add flexible monster sets
  FLEXIBLE_MONSTER_SETS.forEach((id) => sets.add(getSetDisplayName(id)));

  return Array.from(sets).sort();
};

/**
 * Get 5-piece set options for healer role (set1/set2 slots only)
 */
const getHealer5PieceSetOptions = (): readonly string[] => {
  // Return sets in order: Healer-specific first, then Hybrid, maintaining alphabetical within each group
  // Use Sets to avoid duplicates if a set appears in both arrays
  const healerSets = Array.from(HEALER_5PIECE_SETS)
    .map((id) => getSetDisplayName(id))
    .sort();
  const hybridSets = Array.from(FLEXIBLE_5PIECE_SETS)
    .filter((set) => !HEALER_5PIECE_SETS.includes(set))
    .map((id) => getSetDisplayName(id))
    .sort();

  return [...healerSets, ...hybridSets];
};

/**
 * Get monster set options for healer role (monsterSet slot only)
 */
const getHealerMonsterSetOptions = (): readonly string[] => {
  const sets = new Set<string>();

  // Add healer-specific monster sets
  HEALER_MONSTER_SETS.forEach((id) => sets.add(getSetDisplayName(id)));

  // Add flexible monster sets
  FLEXIBLE_MONSTER_SETS.forEach((id) => sets.add(getSetDisplayName(id)));

  return Array.from(sets).sort();
};

/**
 * Helper functions for type-safe set membership checks
 */
const isTank5PieceSet = (setId: KnownSetIDs): boolean => {
  return TANK_5PIECE_SETS.includes(setId);
};

const isHealer5PieceSet = (setId: KnownSetIDs): boolean => {
  return HEALER_5PIECE_SETS.includes(setId);
};

const isFlexible5PieceSet = (setId: KnownSetIDs): boolean => {
  return FLEXIBLE_5PIECE_SETS.includes(setId);
};

const isMonsterSet = (setId: KnownSetIDs): boolean => {
  return MONSTER_SETS.includes(setId);
};

/**
 * RosterBuilderPage - Allows raid leads to create and manage raid rosters
 * Includes tank/healer gear assignments, DD requirements, and ultimate assignments
 */
export const RosterBuilderPage: React.FC = () => {
  const [roster, setRoster] = useState<RaidRoster>(createDefaultRoster());
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [quickFillDialog, setQuickFillDialog] = useState(false);
  const [quickFillText, setQuickFillText] = useState('');
  const [previewDialog, setPreviewDialog] = useState(false);
  const [importUrlDialog, setImportUrlDialog] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  // Get auth state
  const { isLoggedIn } = useAuth();

  // Get ESO Logs client context (safe to call - doesn't throw if not logged in)
  const { client: esoLogsClient, isReady, isLoggedIn: clientLoggedIn } = useEsoLogsClientContext();

  // Client is only available when ready and logged in
  const client = isReady && clientLoggedIn ? esoLogsClient : null;

  // Helper functions for role mapping
  const getRoleNumber = useCallback((role: 'tank1' | 'tank2' | 'healer1' | 'healer2'): 1 | 2 => {
    return role === 'tank1' || role === 'healer1' ? 1 : 2;
  }, []);

  const isTankRole = useCallback(
    (role: 'tank1' | 'tank2' | 'healer1' | 'healer2'): role is 'tank1' | 'tank2' => {
      return role === 'tank1' || role === 'tank2';
    },
    [],
  );

  // Memoized callbacks for SetAssignmentManager
  const handleSetAssignment = useCallback(
    (setName: string, role: 'tank1' | 'tank2' | 'healer1' | 'healer2', slot: string) => {
      const roleNum = getRoleNumber(role);
      // Convert 'monster' to 'monsterSet' for internal state
      const slotKey = (slot === 'monster' ? 'monsterSet' : slot) as 'set1' | 'set2' | 'monsterSet';

      // Convert set name to set ID for proper type safety
      const setId = findSetIdByName(setName);
      if (!setId) {
        // Set not found, skip assignment silently
        return;
      }

      if (isTankRole(role)) {
        const currentTank = roster[role];
        handleTankChange(roleNum, {
          gearSets: {
            ...currentTank.gearSets,
            [slotKey]: setId,
          },
        });
      } else {
        handleHealerChange(roleNum, {
          [slotKey]: setId,
        });
      }
    },
    [roster, getRoleNumber, isTankRole],
  );

  const handleUltimateUpdate = useCallback(
    (role: 'tank1' | 'tank2' | 'healer1' | 'healer2', ultimate: string | null) => {
      const roleNum = getRoleNumber(role);
      if (isTankRole(role)) {
        handleTankChange(roleNum, { ultimate });
      } else {
        handleHealerChange(roleNum, { ultimate });
      }
    },
    [getRoleNumber, isTankRole],
  );

  const handleHealerCPUpdate = useCallback(
    (role: 'healer1' | 'healer2', championPoint: HealerChampionPoint | null) => {
      const healerNum = getRoleNumber(role);
      handleHealerChange(healerNum, {
        championPoint,
      });
    },
    [getRoleNumber],
  );

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle drag end for DPS slots reordering
  const handleDPSDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setRoster((prev) => {
        const oldIndex = prev.dpsSlots.findIndex((slot) => slot.slotNumber === active.id);
        const newIndex = prev.dpsSlots.findIndex((slot) => slot.slotNumber === over.id);

        return {
          ...prev,
          dpsSlots: arrayMove(prev.dpsSlots, oldIndex, newIndex),
          updatedAt: new Date().toISOString(),
        };
      });
    }
  };

  // Load roster from URL on mount
  React.useEffect(() => {
    const hash = window.location.hash.substring(1); // Remove #
    if (hash) {
      const decoded = decodeRosterFromURL(hash);
      if (decoded) {
        setRoster(decoded);
        setSnackbar({
          open: true,
          message: 'Roster loaded from shared link!',
          severity: 'success',
        });
      }
    }
  }, []);

  // Generate shareable link
  const handleCopyLink = useCallback(() => {
    const encoded = encodeRosterToURL(roster);
    if (encoded) {
      const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setSnackbar({
            open: true,
            message: 'Shareable link copied to clipboard!',
            severity: 'success',
          });
        })
        .catch(() => {
          setSnackbar({ open: true, message: 'Failed to copy link', severity: 'error' });
        });
    }
  }, [roster]);

  // Update roster name
  const handleRosterNameChange = (name: string): void => {
    setRoster((prev) => ({
      ...prev,
      rosterName: name,
      updatedAt: new Date().toISOString(),
    }));
  };

  // Update tank setup
  const handleTankChange = (tankNum: 1 | 2, updates: Partial<TankSetup>): void => {
    setRoster((prev) => ({
      ...prev,
      [`tank${tankNum}`]: {
        ...prev[`tank${tankNum}` as 'tank1' | 'tank2'],
        ...updates,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  // Update healer setup
  const handleHealerChange = (healerNum: 1 | 2, updates: Partial<HealerSetup>): void => {
    setRoster((prev) => ({
      ...prev,
      [`healer${healerNum}`]: {
        ...prev[`healer${healerNum}` as 'healer1' | 'healer2'],
        ...updates,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  // Convert existing DPS slot to jail DD requirement
  const handleConvertDPSToJail = (slotNumber: number, jailType: JailDDType): void => {
    setRoster((prev) => {
      // Find the DPS slot to convert
      const slotIndex = prev.dpsSlots.findIndex((s) => s.slotNumber === slotNumber);
      if (slotIndex === -1) return prev;

      // Update the slot to be a jail DD (keep it in place)
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
  };

  // Convert jail DD back to regular DPS
  const handleConvertJailToDPS = (slotNumber: number): void => {
    setRoster((prev) => {
      const slotIndex = prev.dpsSlots.findIndex((s) => s.slotNumber === slotNumber);
      if (slotIndex === -1) return prev;

      // Clear jail DD fields
      const updatedDpsSlots = [...prev.dpsSlots];
      const {
        jailDDType: _removed1,
        customDescription: _removed2,
        ...regularSlot
      } = updatedDpsSlots[slotIndex];
      updatedDpsSlots[slotIndex] = regularSlot;

      return {
        ...prev,
        dpsSlots: updatedDpsSlots,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  // Export roster as JSON
  const handleExportJSON = useCallback(() => {
    const dataStr = JSON.stringify(roster, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileDefaultName = `${roster.rosterName.replace(/\s+/g, '_')}_roster.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    setSnackbar({ open: true, message: 'Roster exported successfully!', severity: 'success' });
  }, [roster]);

  // Import roster from JSON
  const handleImportJSON = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e): void => {
      try {
        const importedRoster = JSON.parse(e.target?.result as string) as RaidRoster;
        setRoster(importedRoster);
        setSnackbar({ open: true, message: 'Roster imported successfully!', severity: 'success' });
      } catch {
        setSnackbar({
          open: true,
          message: 'Failed to import roster. Invalid JSON file.',
          severity: 'error',
        });
      }
    };
    reader.readAsText(file);
  }, []);

  // Import roster from ESO Logs URL
  const handleImportFromUrl = useCallback(async (): Promise<void> => {
    if (!importUrl) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid ESO Logs URL.',
        severity: 'error',
      });
      return;
    }

    if (!client) {
      setSnackbar({
        open: true,
        message: 'You must be logged in to import from ESO Logs.',
        severity: 'error',
      });
      return;
    }

    try {
      setImportLoading(true);

      // Parse URL to extract code and fight ID
      // Expected formats:
      // https://www.esologs.com/reports/<code>#fight=<fightId>
      // https://www.esologs.com/reports/<code>?fight=<fightId>
      // https://www.esologs.com/reports/<code>
      const urlMatch = importUrl.match(/esologs\.com\/reports\/([^#/?]+)(?:[#?]fight=(\d+))?/);
      if (!urlMatch) {
        setSnackbar({
          open: true,
          message:
            'Invalid ESO Logs URL format. Expected: https://www.esologs.com/reports/CODE or https://www.esologs.com/reports/CODE?fight=ID',
          severity: 'error',
        });
        setImportLoading(false);
        return;
      }

      const [, code, fightIdStr] = urlMatch;
      const fightId = fightIdStr ? parseInt(fightIdStr, 10) : undefined;

      // Fetch player details from the report
      const response = await client.query<GetPlayersForReportQuery>({
        query: GET_PLAYERS_FOR_REPORT,
        variables: {
          code,
          fightIDs: fightId ? [fightId] : undefined,
        },
        fetchPolicy: 'no-cache',
      });

      const playerDetails = response.reportData?.report?.playerDetails;
      if (!playerDetails) {
        setSnackbar({
          open: true,
          message: 'No player data found in the report.',
          severity: 'error',
        });
        setImportLoading(false);
        return;
      }

      // Extract player details from the response object
      // The playerDetails structure is: { data: { playerDetails: { tanks, healers, dps } } }
      let details: PlayerDetails | undefined;

      if (typeof playerDetails === 'string') {
        // If it's a string, parse it as JSON
        try {
          const parsed = JSON.parse(playerDetails) as { data?: { playerDetails?: PlayerDetails } };
          details = parsed?.data?.playerDetails;
        } catch (error) {
          setSnackbar({
            open: true,
            message: `Failed to parse player details: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
            severity: 'error',
          });
          setImportLoading(false);
          return;
        }
      } else if (typeof playerDetails === 'object') {
        // If it's already an object, extract the nested data
        const payload = (playerDetails as { data?: unknown }).data;
        if (payload && typeof payload === 'object') {
          details = (payload as { playerDetails?: PlayerDetails }).playerDetails;
        }
      }

      if (!details) {
        setSnackbar({
          open: true,
          message: 'Invalid player details format.',
          severity: 'error',
        });
        setImportLoading(false);
        return;
      }

      const { tanks = [], healers = [], dps = [] } = details;

      // Extract combatant info events from the response
      // Note: TypeScript doesn't know about the events field, so we cast it
      const report = response.reportData?.report as {
        playerDetails?: unknown;
        events?: { data?: string | unknown };
      };
      const eventsData = report?.events?.data;

      // Parse events data - it might be a string or already an object
      let combatantInfoEvents: CombatantInfoEvent[] = [];
      if (eventsData) {
        try {
          if (typeof eventsData === 'string') {
            combatantInfoEvents = JSON.parse(eventsData);
          } else if (Array.isArray(eventsData)) {
            combatantInfoEvents = eventsData as CombatantInfoEvent[];
          }
        } catch {
          // Failed to parse combatant info events - continue without champion point detection from auras
        }
      }

      // Build a map of player ID to champion points detected from auras
      const playerChampionPoints = new Map<string, Set<number>>();
      combatantInfoEvents.forEach((event) => {
        if (!event.auras || event.auras.length === 0) return;

        const sourceId = String(event.sourceID);
        if (!playerChampionPoints.has(sourceId)) {
          playerChampionPoints.set(sourceId, new Set());
        }

        event.auras.forEach((aura) => {
          // Track champion point ability IDs
          if (
            aura.ability === KnownAbilities.ENLIVENING_OVERFLOW ||
            aura.ability === KnownAbilities.FROM_THE_BRINK
          ) {
            playerChampionPoints.get(sourceId)?.add(aura.ability);
          }
        });
      });

      // Helper function to categorize gear sets properly
      const categorizeSets = (
        gear: GearItem[],
      ): {
        fivePieceSets: string[];
        monsterSets: string[];
        otherSets: string[];
      } => {
        // Helper to normalize set names (remove "Perfected" prefix)
        const normalizeSetName = (name: string): string => {
          return name.replace(/^Perfected\s+/i, '');
        };

        // Helper to check if a name has "Perfected" prefix
        const isPerfected = (name: string): boolean => {
          return /^Perfected\s+/i.test(name);
        };

        // Transform gear items: if setName is missing but setID exists, look up the name
        const transformedGear = gear.map((item) => {
          if (!item.setName && item.setID) {
            // Try to get the display name from the setID
            const displayName = getSetDisplayName(item.setID as KnownSetIDs);
            if (displayName) {
              return { ...item, setName: displayName };
            }
          }
          return item;
        });

        // First pass: Count pieces and track which version (perfected/non-perfected) we have
        const rawCountMap = new Map<string, number>();
        const perfectedVersions = new Map<string, string>(); // normalized name -> actual perfected name

        transformedGear.forEach((item: GearItem) => {
          if (item.setName) {
            const pieceCount = item.permanentEnchant ? 2 : 1;
            rawCountMap.set(item.setName, (rawCountMap.get(item.setName) || 0) + pieceCount);

            // Track perfected versions
            if (isPerfected(item.setName)) {
              const normalized = normalizeSetName(item.setName);
              perfectedVersions.set(normalized, item.setName);
            }
          }
        });

        // Second pass: Consolidate perfected and non-perfected sets
        const setCountMap = new Map<string, number>();
        const processedNormalized = new Set<string>();

        rawCountMap.forEach((count, setName) => {
          const normalized = normalizeSetName(setName);

          // Skip if we've already processed this set (either version)
          if (processedNormalized.has(normalized)) {
            return;
          }

          processedNormalized.add(normalized);

          // Check if there's a perfected version
          const perfectedName = perfectedVersions.get(normalized);

          // Calculate total count (perfected + non-perfected pieces)
          let totalCount = 0;
          if (perfectedName) {
            totalCount += rawCountMap.get(perfectedName) || 0;
          }
          // Add non-perfected count (if it exists)
          const nonPerfectedCount = rawCountMap.get(normalized) || 0;
          totalCount += nonPerfectedCount;

          // Always use the non-perfected (normalized) name for consistency
          setCountMap.set(normalized, totalCount);
        });

        const fivePieceSets: string[] = [];
        const monsterSets: string[] = [];
        const otherSets: string[] = [];

        // Sets to exclude from import (crafted sets, leveling sets, etc.)
        const excludedSetIds = new Set([
          KnownSetIDs.ARMOR_OF_THE_TRAINEE, // Crafted leveling set
          KnownSetIDs.DRUIDS_BRAID, // Crafted set from High Isle
        ]);

        setCountMap.forEach((count, setName) => {
          // Try to find the set ID for this set name
          const setId = findSetIdByName(setName);

          // Skip excluded sets
          if (setId && excludedSetIds.has(setId)) {
            return;
          }

          // Categorize the set based on type and piece count
          // Monster sets are typically 2-piece or 1-piece and are in our MONSTER_SETS list
          if (setId && MONSTER_SETS.includes(setId)) {
            monsterSets.push(setName);
          } else if (setId && count >= 5 && ALL_5PIECE_SETS.includes(setId)) {
            // 5-piece sets MUST have 5+ items AND be in our known 5-piece list
            fivePieceSets.push(setName);
          } else {
            // Everything else goes to additional sets
            otherSets.push(setName);
          }
        });

        return { fivePieceSets, monsterSets, otherSets };
      };

      // Helper function to extract ultimate from talents
      const extractUltimate = (
        combatantInfo: CombatantInfo | undefined,
      ): SupportUltimate | null => {
        if (!combatantInfo?.talents) return null;

        // Map ability IDs to support ultimates
        const ultimateIdMap: Record<number, SupportUltimate> = {
          [KnownAbilities.AGGRESSIVE_HORN]: SupportUltimate.WARHORN,
          [KnownAbilities.GLACIAL_COLOSSUS]: SupportUltimate.COLOSSUS,
          [KnownAbilities.REVIVING_BARRIER]: SupportUltimate.BARRIER,
          [KnownAbilities.REPLENISHING_BARRIER]: SupportUltimate.BARRIER,
          [KnownAbilities.SUMMON_CHARGED_ATRONACH]: SupportUltimate.ATRONACH,
        };

        for (const talent of combatantInfo.talents) {
          if (talent.guid && ultimateIdMap[talent.guid]) {
            return ultimateIdMap[talent.guid];
          }
        }

        return null;
      };

      // Helper function to deduplicate set IDs by their display names
      // This prevents having both "Pillager's Profit" (649) and "Perfected Pillager's Profit" (650)
      const deduplicateSetIds = (setIds: KnownSetIDs[]): KnownSetIDs[] => {
        const normalizeDisplayName = (name: string): string => {
          return name.replace(/^Perfected\s+/i, '');
        };

        const seen = new Set<string>();
        const result = setIds.filter((id) => {
          const displayName = getSetDisplayName(id);
          const normalizedName = normalizeDisplayName(displayName);

          if (seen.has(normalizedName)) {
            return false;
          }
          seen.add(normalizedName);
          return true;
        });
        return result;
      };

      // Helper function to extract healer champion point from talents or auras
      const extractHealerChampionPoint = (
        combatantInfo: CombatantInfo | undefined,
        playerId: number | undefined,
      ): HealerChampionPoint | null => {
        // First, check auras from combatant info events (more reliable)
        if (playerId !== undefined) {
          const championPoints = playerChampionPoints.get(String(playerId));
          if (championPoints) {
            if (championPoints.has(KnownAbilities.ENLIVENING_OVERFLOW)) {
              return HealerChampionPoint.ENLIVENING_OVERFLOW;
            }
            if (championPoints.has(KnownAbilities.FROM_THE_BRINK)) {
              return HealerChampionPoint.FROM_THE_BRINK;
            }
          }
        }

        // Fallback to checking talents (less reliable, but worth trying)
        if (!combatantInfo?.talents) return null;

        // Map ability IDs to champion points
        const championPointIdMap: Record<number, HealerChampionPoint> = {
          [KnownAbilities.ENLIVENING_OVERFLOW]: HealerChampionPoint.ENLIVENING_OVERFLOW,
          [KnownAbilities.FROM_THE_BRINK]: HealerChampionPoint.FROM_THE_BRINK,
        };

        for (const talent of combatantInfo.talents) {
          if (talent.guid && championPointIdMap[talent.guid]) {
            return championPointIdMap[talent.guid];
          }
        }

        return null;
      };

      // Helper function to extract healer buff from talents or auras
      const extractHealerBuff = (
        combatantInfo: CombatantInfo | undefined,
        playerId: number | undefined,
      ): HealerBuff | null => {
        // First, check auras from combatant info events (more reliable)
        if (playerId !== undefined) {
          const championPoints = playerChampionPoints.get(String(playerId));
          if (championPoints) {
            if (championPoints.has(KnownAbilities.ENLIVENING_OVERFLOW)) {
              return HealerBuff.ENLIVENING_OVERFLOW;
            }
            if (championPoints.has(KnownAbilities.FROM_THE_BRINK)) {
              return HealerBuff.FROM_THE_BRINK;
            }
          }
        }

        // Fallback to checking talents (less reliable, but worth trying)
        if (!combatantInfo?.talents) return null;

        // Map ability IDs to healer buffs
        const healerBuffIdMap: Record<number, HealerBuff> = {
          [KnownAbilities.ENLIVENING_OVERFLOW]: HealerBuff.ENLIVENING_OVERFLOW,
          [KnownAbilities.FROM_THE_BRINK]: HealerBuff.FROM_THE_BRINK,
        };

        for (const talent of combatantInfo.talents) {
          if (talent.guid && healerBuffIdMap[talent.guid]) {
            return healerBuffIdMap[talent.guid];
          }
        }

        return null;
      };

      // Parse tanks
      const parsedTanks: TankSetup[] = tanks.map((tank: PlayerData, index: number) => {
        const gear = tank.combatantInfo?.gear || [];
        const { fivePieceSets, monsterSets, otherSets } = categorizeSets(gear);
        const extractedUltimate = extractUltimate(tank.combatantInfo);

        // Get existing ultimate for this tank (if roster already has data)
        const existingUltimate = index === 0 ? roster.tank1.ultimate : roster.tank2.ultimate;

        // Only replace ultimate if:
        // 1. There's no existing ultimate, OR
        // 2. The existing ultimate is Barrier AND we found a non-Barrier ultimate
        const shouldReplaceUltimate =
          !existingUltimate ||
          (existingUltimate === SupportUltimate.BARRIER &&
            extractedUltimate &&
            extractedUltimate !== SupportUltimate.BARRIER);

        const finalUltimate = shouldReplaceUltimate ? extractedUltimate : existingUltimate;

        return {
          playerName: tank.name || `Tank ${index + 1}`,
          roleLabel: `T${index + 1}`,
          gearSets: {
            set1: fivePieceSets[0] ? findSetIdByName(fivePieceSets[0]) : undefined,
            set2: fivePieceSets[1] ? findSetIdByName(fivePieceSets[1]) : undefined,
            monsterSet: monsterSets[0] ? findSetIdByName(monsterSets[0]) : undefined,
            additionalSets: deduplicateSetIds(
              [...fivePieceSets.slice(2), ...monsterSets.slice(1), ...otherSets]
                .map((name) => findSetIdByName(name))
                .filter((id): id is KnownSetIDs => id !== undefined),
            ),
          },
          skillLines: {
            line1: '',
            line2: '',
            line3: '',
            isFlex: false,
          },
          ultimate: finalUltimate,
          specificSkills: [],
        };
      });

      // Parse healers
      const parsedHealers: HealerSetup[] = healers.map((healer: PlayerData, index: number) => {
        const gear = healer.combatantInfo?.gear || [];
        const { fivePieceSets, monsterSets, otherSets } = categorizeSets(gear);
        const extractedUltimate = extractUltimate(healer.combatantInfo);

        // Get existing ultimate for this healer (if roster already has data)
        const existingUltimate = index === 0 ? roster.healer1.ultimate : roster.healer2.ultimate;

        // Only replace ultimate if:
        // 1. There's no existing ultimate, OR
        // 2. The existing ultimate is Barrier AND we found a non-Barrier ultimate
        const shouldReplaceUltimate =
          !existingUltimate ||
          (existingUltimate === SupportUltimate.BARRIER &&
            extractedUltimate &&
            extractedUltimate !== SupportUltimate.BARRIER);

        const finalUltimate = shouldReplaceUltimate ? extractedUltimate : existingUltimate;

        return {
          playerName: healer.name || `Healer ${index + 1}`,
          roleLabel: `H${index + 1}`,
          set1: fivePieceSets[0] ? findSetIdByName(fivePieceSets[0]) : undefined,
          set2: fivePieceSets[1] ? findSetIdByName(fivePieceSets[1]) : undefined,
          monsterSet: monsterSets[0] ? findSetIdByName(monsterSets[0]) : undefined,
          additionalSets: deduplicateSetIds(
            [...fivePieceSets.slice(2), ...monsterSets.slice(1), ...otherSets]
              .map((name) => findSetIdByName(name))
              .filter((id): id is KnownSetIDs => id !== undefined),
          ),
          skillLines: {
            line1: '',
            line2: '',
            line3: '',
            isFlex: false,
          },
          healerBuff: extractHealerBuff(healer.combatantInfo, healer.id),
          championPoint: extractHealerChampionPoint(healer.combatantInfo, healer.id),
          ultimate: finalUltimate,
        };
      });

      // Parse DPS (up to 8 slots)
      const parsedDPS: DPSSlot[] = dps.slice(0, 8).map((dpsPlayer: PlayerData, index: number) => {
        const gear = dpsPlayer.combatantInfo?.gear || [];
        const { fivePieceSets, monsterSets, otherSets } = categorizeSets(gear);

        return {
          slotNumber: index + 1,
          playerName: dpsPlayer.name || '',
          gearSets: deduplicateSetIds(
            [...fivePieceSets, ...monsterSets, ...otherSets]
              .filter(Boolean)
              .map((name) => findSetIdByName(name))
              .filter((id): id is KnownSetIDs => id !== undefined),
          ),
          skillLines: {
            line1: '',
            line2: '',
            line3: '',
            isFlex: false,
          },
        };
      });

      // Update roster with parsed data (tank1, tank2, healer1, healer2, and DPS slots)
      setRoster((prev) => ({
        ...prev,
        tank1: parsedTanks[0] || prev.tank1,
        tank2: parsedTanks[1] || prev.tank2,
        healer1: parsedHealers[0] || prev.healer1,
        healer2: parsedHealers[1] || prev.healer2,
        dpsSlots: parsedDPS.length > 0 ? parsedDPS : prev.dpsSlots,
        updatedAt: new Date().toISOString(),
      }));

      const tankCount = Math.min(parsedTanks.length, 2);
      const healerCount = Math.min(parsedHealers.length, 2);
      const dpsCount = Math.min(parsedDPS.length, 8);

      setSnackbar({
        open: true,
        message: `Successfully imported ${tankCount} tank(s), ${healerCount} healer(s), and ${dpsCount} DPS from ESO Logs!`,
        severity: 'success',
      });

      // Close dialog and reset state
      setImportUrlDialog(false);
      setImportUrl('');
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to import from URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    } finally {
      setImportLoading(false);
    }
  }, [
    importUrl,
    client,
    roster.tank1.ultimate,
    roster.tank2.ultimate,
    roster.healer1.ultimate,
    roster.healer2.ultimate,
  ]);

  // Quick fill player names from text
  const handleQuickFill = useCallback((): void => {
    const lines = quickFillText
      .trim()
      .split('\n')
      .filter((line) => line.trim());
    if (lines.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please enter at least one player name',
        severity: 'error',
      });
      return;
    }

    setRoster((prev) => {
      const updated = { ...prev };

      // Fill tanks first (up to 2)
      if (lines.length > 0 && lines[0]) updated.tank1.playerName = lines[0].trim();
      if (lines.length > 1 && lines[1]) updated.tank2.playerName = lines[1].trim();

      // Fill healers next (up to 2)
      if (lines.length > 2 && lines[2]) updated.healer1.playerName = lines[2].trim();
      if (lines.length > 3 && lines[3]) updated.healer2.playerName = lines[3].trim();

      // Fill DPS slots (up to 8)
      for (let i = 4; i < Math.min(lines.length, 12); i++) {
        const dpsIndex = i - 4;
        if (updated.dpsSlots[dpsIndex] && lines[i]) {
          updated.dpsSlots[dpsIndex].playerName = lines[i].trim();
        }
      }

      updated.updatedAt = new Date().toISOString();
      return updated;
    });

    setQuickFillDialog(false);
    setQuickFillText('');
    setSnackbar({
      open: true,
      message: `Filled ${Math.min(lines.length, 12)} player slots!`,
      severity: 'success',
    });
  }, [quickFillText]);

  // Copy Discord formatted roster to clipboard
  const handleCopyDiscordFormat = useCallback((): void => {
    const discordFormat = generateDiscordFormat(roster);
    navigator.clipboard
      .writeText(discordFormat)
      .then((): void => {
        setSnackbar({
          open: true,
          message: 'Discord format copied to clipboard!',
          severity: 'success',
        });
      })
      .catch((): void => {
        setSnackbar({ open: true, message: 'Failed to copy to clipboard.', severity: 'error' });
      });
  }, [roster]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Development Banner */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>🚧 Under Active Development</strong> - This Roster Builder tool is currently being
        developed and tested. Features may change, and some functionality may be incomplete. Please
        report any issues or suggestions!
      </Alert>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Stack spacing={3} mb={3}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Typography variant="h4" component="h1">
              Roster Builder
            </Typography>

            {/* Simple/Advanced Mode Toggle */}
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_event, newMode) => {
                if (newMode !== null) {
                  setMode(newMode);
                }
              }}
              size="small"
              color="primary"
            >
              <ToggleButton value="simple">Simple Mode</ToggleButton>
              <ToggleButton value="advanced">Advanced Mode</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Action Buttons - organized into logical groups */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {/* Import/Export Group */}
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={() => setQuickFillDialog(true)}
            >
              Quick Fill
            </Button>
            <Button variant="outlined" startIcon={<UploadIcon />} component="label">
              Import Roster
              <input
                type="file"
                hidden
                accept=".json"
                onChange={handleImportJSON}
                aria-label="Upload roster JSON file"
              />
            </Button>
            {isLoggedIn && (
              <Button
                variant="outlined"
                startIcon={<LinkIcon />}
                onClick={() => setImportUrlDialog(true)}
              >
                Import from Log
              </Button>
            )}
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportJSON}>
              Export JSON
            </Button>

            {/* Discord Group */}
            <Button
              variant="outlined"
              startIcon={<VisibilityIcon />}
              onClick={() => setPreviewDialog(true)}
            >
              Preview Discord
            </Button>
            <Button variant="contained" startIcon={<CopyIcon />} onClick={handleCopyDiscordFormat}>
              Copy for Discord
            </Button>

            {/* Share Group */}
            <Button
              variant="contained"
              color="secondary"
              startIcon={<LinkIcon />}
              onClick={handleCopyLink}
            >
              Copy Share Link
            </Button>
          </Box>
        </Stack>

        <TextField
          fullWidth
          label="Roster Name"
          value={roster.rosterName}
          onChange={(e) => handleRosterNameChange(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Divider sx={{ my: 3 }} />

        {/* Simple Mode: Set Assignment Manager */}
        {mode === 'simple' && (
          <>
            <SetAssignmentManager
              tank1={roster.tank1}
              tank2={roster.tank2}
              healer1={roster.healer1}
              healer2={roster.healer2}
              onAssignSet={handleSetAssignment}
              onUpdateUltimate={handleUltimateUpdate}
              onUpdateHealerCP={handleHealerCPUpdate}
            />
          </>
        )}

        {/* Advanced Mode: Full Roster Details */}
        {mode === 'advanced' && (
          <>
            {/* Player Groups Management */}
            <Typography variant="h5" gutterBottom>
              Player Groups
            </Typography>
            <Stack spacing={2} mb={3}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={roster.availableGroups}
                onChange={(_, value) =>
                  setRoster((prev) => ({
                    ...prev,
                    availableGroups: value,
                    updatedAt: new Date().toISOString(),
                  }))
                }
                slotProps={{
                  popper: {
                    disablePortal: true,
                  },
                }}
                ChipProps={{
                  onMouseDown: (event) => {
                    event.stopPropagation();
                  },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Available Groups (e.g., Slayer Stack 1, Group A)"
                    placeholder="Add group..."
                    helperText="Create groups to organize players. Common examples: Slayer Stack 1, Slayer Stack 2, Group A, Group B"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...chipProps } = getTagProps({ index });
                    return <Chip label={option} {...chipProps} key={key} />;
                  })
                }
              />
            </Stack>

            <Divider sx={{ my: 3 }} />

            {/* Tanks Section */}
            <Typography variant="h5" gutterBottom>
              Tanks
            </Typography>
            <Stack spacing={2} mb={3}>
              {[1, 2].map((num) => (
                <TankCard
                  key={num}
                  tankNum={num as 1 | 2}
                  tank={roster[`tank${num}` as 'tank1' | 'tank2']}
                  onChange={(updates) => handleTankChange(num as 1 | 2, updates)}
                  availableGroups={roster.availableGroups}
                />
              ))}
            </Stack>

            <Divider sx={{ my: 3 }} />

            {/* Healers Section */}
            <Typography variant="h5" gutterBottom>
              Healers
            </Typography>
            <Stack spacing={2} mb={3}>
              {[1, 2].map((num) => (
                <HealerCard
                  key={num}
                  healerNum={num as 1 | 2}
                  healer={roster[`healer${num}` as 'healer1' | 'healer2']}
                  onChange={(updates) => handleHealerChange(num as 1 | 2, updates)}
                  availableGroups={roster.availableGroups}
                  usedBuffs={
                    [roster.healer1.healerBuff, roster.healer2.healerBuff].filter(
                      Boolean,
                    ) as HealerBuff[]
                  }
                />
              ))}
            </Stack>

            <Divider sx={{ my: 3 }} />

            {/* DPS Slots Section */}
            <Typography variant="h5" gutterBottom>
              DPS Roster (8 Slots)
            </Typography>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDPSDragEnd}
            >
              <SortableContext
                items={roster.dpsSlots.map((slot) => slot.slotNumber)}
                strategy={verticalListSortingStrategy}
              >
                <Stack spacing={1.5} mb={3}>
                  {roster.dpsSlots.map((slot, index) => (
                    <DPSSlotCard
                      key={slot.slotNumber}
                      slot={slot}
                      availableGroups={roster.availableGroups}
                      onChange={(updates) => {
                        const updatedSlots = [...roster.dpsSlots];
                        updatedSlots[index] = { ...updatedSlots[index], ...updates };
                        setRoster((prev) => ({
                          ...prev,
                          dpsSlots: updatedSlots,
                          updatedAt: new Date().toISOString(),
                        }));
                      }}
                      onConvertToJail={handleConvertDPSToJail}
                      onConvertToDPS={handleConvertJailToDPS}
                    />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>

            <Divider sx={{ my: 3 }} />

            {/* General Notes */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="General Notes"
              value={roster.notes || ''}
              onChange={(e) =>
                setRoster((prev) => ({
                  ...prev,
                  notes: e.target.value,
                  updatedAt: new Date().toISOString(),
                }))
              }
            />
          </>
        )}
      </Paper>

      {/* Quick Fill Dialog */}
      <Dialog
        open={quickFillDialog}
        onClose={() => setQuickFillDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Quick Fill Player Names</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter player names, one per line. The first 2 will fill tanks, next 2 will fill healers,
            and remaining will fill DPS slots (up to 8 total DPS).
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={12}
            fullWidth
            variant="outlined"
            placeholder={'Player1\nPlayer2\nPlayer3\n...'}
            value={quickFillText}
            onChange={(e) => setQuickFillText(e.target.value)}
            helperText={`${quickFillText.split('\n').filter((line) => line.trim()).length} players entered`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickFillDialog(false)}>Cancel</Button>
          <Button onClick={handleQuickFill} variant="contained">
            Fill Roster
          </Button>
        </DialogActions>
      </Dialog>

      {/* Discord Preview Dialog */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Discord Message Preview</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This is how your roster will appear when posted to Discord:
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: 'grey.900',
              color: 'grey.100',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowX: 'auto',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {generateDiscordFormat(roster)}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Close</Button>
          <Button
            onClick={() => {
              handleCopyDiscordFormat();
              setPreviewDialog(false);
            }}
            variant="contained"
            startIcon={<CopyIcon />}
          >
            Copy to Clipboard
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import from URL Dialog */}
      <Dialog
        open={importUrlDialog}
        onClose={() => {
          setImportUrlDialog(false);
          setImportUrl('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import Roster from ESO Logs</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the ESO Logs report URL for a specific fight. The roster will be automatically
            derived from the player data in the report.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Example URL formats:</strong>
            <br />
            • With fight ID (hash): https://www.esologs.com/reports/ABC123#fight=5
            <br />
            • With fight ID (query): https://www.esologs.com/reports/ABC123?fight=5
            <br />• Without fight ID: https://www.esologs.com/reports/ABC123
          </Typography>
          <TextField
            autoFocus
            fullWidth
            variant="outlined"
            label="ESO Logs URL"
            placeholder="https://www.esologs.com/reports/ABC123#fight=5"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            sx={{ mt: 2 }}
            disabled={importLoading}
            helperText="The report must be public or you must be logged in to access it"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setImportUrlDialog(false);
              setImportUrl('');
            }}
            disabled={importLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleImportFromUrl} variant="contained" disabled={importLoading}>
            {importLoading ? 'Importing...' : 'Import Roster'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// Tank Card Component
interface TankCardProps {
  tankNum: 1 | 2;
  tank: TankSetup;
  onChange: (updates: Partial<TankSetup>) => void;
  availableGroups: string[];
}

const TankCard: React.FC<TankCardProps> = ({ tankNum, tank, onChange, availableGroups }) => {
  const availableUltimates = Object.values(SupportUltimate);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Tank {tankNum}
        </Typography>
        <Stack spacing={2}>
          {/* Essential Fields - Always Visible */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <TextField
                fullWidth
                label="Player Name"
                value={tank.playerName || ''}
                onChange={(e) => onChange({ playerName: e.target.value })}
                placeholder="Enter player name"
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 150 }}>
              <Autocomplete
                freeSolo
                options={[...availableGroups].sort()}
                value={tank.group?.groupName || ''}
                onChange={(_, value) =>
                  onChange({
                    group: value ? { groupName: value } : undefined,
                  })
                }
                renderInput={(params) => (
                  <TextField {...params} label="Group" placeholder="e.g., Left Stack" />
                )}
              />
            </Box>
          </Box>

          {/* Gear Sets */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Configure gear sets (5-piece sets + 2-piece monster/mythic)
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={getTank5PieceSetOptions()}
                value={tank.gearSets.set1 ? getSetDisplayName(tank.gearSets.set1) : ''}
                onChange={(_, value) =>
                  onChange({
                    gearSets: {
                      ...tank.gearSets,
                      set1: value ? findSetIdByName(value) : undefined,
                    },
                  })
                }
                groupBy={(option) => {
                  const setId = findSetIdByName(option);
                  if (setId && isTank5PieceSet(setId)) return 'Tank Sets';
                  if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                  return 'Other';
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Primary 5-Piece Set (Body)"
                    placeholder="e.g., Alkosh, Yolnahkriin"
                    helperText="Worn on body armor pieces (type custom set name if not listed)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => <li {...props}>{option}</li>}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={getTank5PieceSetOptions()}
                value={tank.gearSets.set2 ? getSetDisplayName(tank.gearSets.set2) : ''}
                onChange={(_, value) =>
                  onChange({
                    gearSets: {
                      ...tank.gearSets,
                      set2: value ? findSetIdByName(value) : undefined,
                    },
                  })
                }
                groupBy={(option) => {
                  const setId = findSetIdByName(option);
                  if (setId && isTank5PieceSet(setId)) return 'Tank Sets';
                  if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                  return 'Other';
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Secondary 5-Piece Set (Jewelry)"
                    placeholder="e.g., Crimson Oath's Rive"
                    helperText="Worn on jewelry + weapons (type custom set name if not listed)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => <li {...props}>{option}</li>}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={getTankMonsterSetOptions()}
                value={tank.gearSets.monsterSet ? getSetDisplayName(tank.gearSets.monsterSet) : ''}
                onChange={(_, value) =>
                  onChange({
                    gearSets: {
                      ...tank.gearSets,
                      monsterSet: value ? findSetIdByName(value) : undefined,
                    },
                  })
                }
                groupBy={(_option) => {
                  return 'Monster Sets';
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="2-Piece Monster/Mythic Set"
                    placeholder="e.g., Symphony of Blades"
                    helperText="Head + shoulders, or 1-piece mythic (type custom set name if not listed)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => <li {...props}>{option}</li>}
              />
            </Box>
          </Box>

          <Autocomplete
            freeSolo
            options={availableUltimates}
            value={tank.ultimate || null}
            onChange={(_event, newValue) => onChange({ ultimate: newValue as string | null })}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Ultimate"
                placeholder="Select or type custom ultimate"
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getUltimateIcon(option)}
                  {option}
                </Box>
              </li>
            )}
          />

          {/* Compatibility Warnings */}
          {(() => {
            const warnings = validateCompatibility(
              [
                tank.gearSets.set1 ? getSetDisplayName(tank.gearSets.set1) : undefined,
                tank.gearSets.set2 ? getSetDisplayName(tank.gearSets.set2) : undefined,
                tank.gearSets.monsterSet ? getSetDisplayName(tank.gearSets.monsterSet) : undefined,
                ...(tank.gearSets.additionalSets || []).map((id) => getSetDisplayName(id)),
              ].filter((s): s is string => s !== undefined),
              tank.ultimate,
            );
            if (warnings.length === 0) return null;
            return (
              <Stack spacing={1}>
                {warnings.map((warning, index) => (
                  <Alert key={index} severity="warning" sx={{ py: 0.5 }}>
                    {warning}
                  </Alert>
                ))}
              </Stack>
            );
          })()}

          {/* Advanced Options - Collapsible */}
          <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" color="text.secondary">
                Advanced Options
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {/* Role Label and Notes */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 30%', minWidth: 120 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role Label"
                      placeholder={tankNum === 1 ? 'MT' : 'OT'}
                      value={tank.roleLabel || ''}
                      onChange={(e) => onChange({ roleLabel: e.target.value })}
                      helperText="e.g., MT, OT"
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 65%', minWidth: 200 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role Notes"
                      placeholder="e.g., TOMB 1A, Portal Group"
                      value={tank.roleNotes || ''}
                      onChange={(e) => onChange({ roleNotes: e.target.value })}
                    />
                  </Box>
                </Box>

                {/* Player Labels/Tags */}
                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[]}
                  value={tank.labels || []}
                  onChange={(_, value) => onChange({ labels: value })}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="Labels / Tags"
                      placeholder="Add custom labels"
                      helperText="Press Enter to add new label"
                    />
                  )}
                />

                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Player Number"
                  value={tank.playerNumber || ''}
                  onChange={(e) =>
                    onChange({
                      playerNumber: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  helperText="Optional identifier"
                />

                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[...ALL_5PIECE_SETS, ...MONSTER_SETS]
                    .map((id) => getSetDisplayName(id))
                    .sort()}
                  value={(tank.gearSets.additionalSets || []).map((id) => getSetDisplayName(id))}
                  onChange={(_, value) =>
                    onChange({
                      gearSets: {
                        ...tank.gearSets,
                        additionalSets: value
                          .map((name) => findSetIdByName(name))
                          .filter((id): id is KnownSetIDs => id !== undefined),
                      },
                    })
                  }
                  groupBy={(option) => {
                    const setId = findSetIdByName(option);
                    if (setId && isTank5PieceSet(setId)) return 'Tank Sets';
                    if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                    if (setId && isMonsterSet(setId)) return 'Monster Sets';
                    return 'Other';
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Additional Sets"
                      helperText="e.g., monster sets, arena weapons (type custom set name if not listed)"
                    />
                  )}
                  renderOption={(props, option) => <li {...props}>{option}</li>}
                />

                {/* Skill Lines Section */}
                <Divider textAlign="left">
                  <Chip label="Skill Lines" size="small" />
                </Divider>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tank.skillLines.isFlex}
                      onChange={(e) =>
                        onChange({
                          skillLines: { ...tank.skillLines, isFlex: e.target.checked },
                        })
                      }
                    />
                  }
                  label="Flexible (any skill lines)"
                />
                {!tank.skillLines.isFlex && (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES].sort()}
                        value={tank.skillLines.line1}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...tank.skillLines, line1: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 1" />}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES].sort()}
                        value={tank.skillLines.line2}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...tank.skillLines, line2: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 2" />}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES].sort()}
                        value={tank.skillLines.line3}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...tank.skillLines, line3: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 3" />}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                  </Box>
                )}

                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[]}
                  value={tank.specificSkills}
                  onChange={(_, value) => onChange({ specificSkills: value })}
                  slotProps={{
                    popper: {
                      disablePortal: true,
                    },
                  }}
                  ChipProps={{
                    onMouseDown: (event) => {
                      event.stopPropagation();
                    },
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Specific Skills Required"
                      placeholder="Add skill..."
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...chipProps } = getTagProps({ index });
                      return <Chip label={option} {...chipProps} key={key} size="small" />;
                    })
                  }
                />

                <TextField
                  fullWidth
                  multiline
                  size="small"
                  rows={2}
                  label="Notes"
                  value={tank.notes || ''}
                  onChange={(e) => onChange({ notes: e.target.value })}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </CardContent>
    </Card>
  );
};

// Healer Card Component
interface HealerCardProps {
  healerNum: 1 | 2;
  healer: HealerSetup;
  onChange: (updates: Partial<HealerSetup>) => void;
  availableGroups: string[];
  usedBuffs: HealerBuff[];
}

const HealerCard: React.FC<HealerCardProps> = ({
  healerNum,
  healer,
  onChange,
  availableGroups,
  usedBuffs,
}) => {
  const availableBuffs = Object.values(HealerBuff).filter(
    (buff) => !usedBuffs.includes(buff) || healer.healerBuff === buff,
  );
  const availableUltimates = Object.values(SupportUltimate);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Healer {healerNum}
        </Typography>
        <Stack spacing={2}>
          {/* Essential Fields - Always Visible */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <TextField
                fullWidth
                label="Player Name (Optional)"
                value={healer.playerName || ''}
                onChange={(e) => onChange({ playerName: e.target.value })}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={[...availableGroups].sort()}
                value={healer.group?.groupName || ''}
                onChange={(_, value) =>
                  onChange({
                    group: value ? { groupName: value } : undefined,
                  })
                }
                renderInput={(params) => <TextField {...params} label="Group" />}
              />
            </Box>
          </Box>

          {/* Gear Sets */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Configure gear sets (5-piece sets + 2-piece monster/mythic)
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={getHealer5PieceSetOptions()}
                value={healer.set1 ? getSetDisplayName(healer.set1) : ''}
                onChange={(_, value) =>
                  onChange({ set1: value ? findSetIdByName(value) : undefined })
                }
                groupBy={(option) => {
                  const setId = findSetIdByName(option);
                  if (setId && isHealer5PieceSet(setId)) return 'Healer Sets';
                  if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                  return 'Other';
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Primary 5-Piece Set (Body)"
                    placeholder="e.g., Stone-Talker's Oath"
                    helperText="Worn on body armor pieces (type custom set name if not listed)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => <li {...props}>{option}</li>}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={getHealer5PieceSetOptions()}
                value={healer.set2 ? getSetDisplayName(healer.set2) : ''}
                onChange={(_, value) =>
                  onChange({ set2: value ? findSetIdByName(value) : undefined })
                }
                groupBy={(option) => {
                  const setId = findSetIdByName(option);
                  if (setId && isHealer5PieceSet(setId)) return 'Healer Sets';
                  if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                  return 'Other';
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Secondary 5-Piece Set (Jewelry)"
                    placeholder="e.g., Worm's Raiment"
                    helperText="Worn on jewelry + weapons (type custom set name if not listed)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => <li {...props}>{option}</li>}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <Autocomplete
                freeSolo
                options={getHealerMonsterSetOptions()}
                value={healer.monsterSet ? getSetDisplayName(healer.monsterSet) : ''}
                onChange={(_, value) =>
                  onChange({ monsterSet: value ? findSetIdByName(value) : undefined })
                }
                groupBy={(_option) => {
                  return 'Monster Sets';
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="2-Piece Monster/Mythic Set"
                    placeholder="e.g., Symphony of Blades"
                    helperText="Head + shoulders, or 1-piece mythic (type custom set name if not listed)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <GearIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => <li {...props}>{option}</li>}
              />
            </Box>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Champion Points</InputLabel>
            <Select
              value={healer.healerBuff || ''}
              onChange={(e) => onChange({ healerBuff: (e.target.value as HealerBuff) || null })}
              label="Champion Points"
              renderValue={(value) => (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getHealerBuffIcon(value)}
                  {value || <em>None</em>}
                </Box>
              )}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {availableBuffs.map((buff) => (
                <MenuItem key={buff} value={buff}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getHealerBuffIcon(buff)}
                    {buff}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Autocomplete
            freeSolo
            options={availableUltimates}
            value={healer.ultimate || null}
            onChange={(_event, newValue) => onChange({ ultimate: newValue as string | null })}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Ultimate"
                placeholder="Select or type custom ultimate"
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getUltimateIcon(option)}
                  {option}
                </Box>
              </li>
            )}
          />

          {/* Compatibility Warnings */}
          {(() => {
            const warnings = validateCompatibility(
              [
                healer.set1 ? getSetDisplayName(healer.set1) : undefined,
                healer.set2 ? getSetDisplayName(healer.set2) : undefined,
                healer.monsterSet ? getSetDisplayName(healer.monsterSet) : undefined,
                ...(healer.additionalSets || []).map((id) => getSetDisplayName(id)),
              ].filter((s): s is string => s !== undefined),
              healer.ultimate,
            );
            if (warnings.length === 0) return null;
            return (
              <Stack spacing={1}>
                {warnings.map((warning, index) => (
                  <Alert key={index} severity="warning" sx={{ py: 0.5 }}>
                    {warning}
                  </Alert>
                ))}
              </Stack>
            );
          })()}

          {/* Advanced Options - Collapsible */}
          <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" color="text.secondary">
                Advanced Options
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {/* Role Label and Notes */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 30%', minWidth: 120 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role Label"
                      placeholder={`H${healerNum}`}
                      value={healer.roleLabel || ''}
                      onChange={(e) => onChange({ roleLabel: e.target.value })}
                      helperText="e.g., H1, H2"
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 65%', minWidth: 200 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role Notes"
                      placeholder="e.g., TOMB HEALER, TOMB 1B"
                      value={healer.roleNotes || ''}
                      onChange={(e) => onChange({ roleNotes: e.target.value })}
                    />
                  </Box>
                </Box>

                {/* Player Labels/Tags */}
                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[]}
                  value={healer.labels || []}
                  onChange={(_, value) => onChange({ labels: value })}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="Labels / Tags"
                      placeholder="Add custom labels"
                      helperText="Press Enter to add new label"
                    />
                  )}
                />

                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Player Number"
                  value={healer.playerNumber || ''}
                  onChange={(e) =>
                    onChange({
                      playerNumber: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  helperText="Optional identifier"
                />

                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[...ALL_5PIECE_SETS, ...MONSTER_SETS]
                    .map((id) => getSetDisplayName(id))
                    .sort()}
                  value={(healer.additionalSets || []).map((id) => getSetDisplayName(id))}
                  onChange={(_, value) =>
                    onChange({
                      additionalSets: value
                        .map((name) => findSetIdByName(name))
                        .filter((id): id is KnownSetIDs => id !== undefined),
                    })
                  }
                  groupBy={(option) => {
                    const setId = findSetIdByName(option);
                    if (setId && isHealer5PieceSet(setId)) return 'Healer Sets';
                    if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                    if (setId && isMonsterSet(setId)) return 'Monster Sets';
                    return 'Other';
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Additional Sets"
                      helperText="e.g., monster sets, mythics (type custom set name if not listed)"
                    />
                  )}
                  renderOption={(props, option) => <li {...props}>{option}</li>}
                />

                {/* Skill Lines Section */}
                <Divider textAlign="left">
                  <Chip label="Skill Lines" size="small" />
                </Divider>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={healer.skillLines.isFlex}
                      onChange={(e) =>
                        onChange({
                          skillLines: { ...healer.skillLines, isFlex: e.target.checked },
                        })
                      }
                    />
                  }
                  label="Flexible (any skill lines)"
                />
                {!healer.skillLines.isFlex && (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES].sort()}
                        value={healer.skillLines.line1}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...healer.skillLines, line1: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 1" />}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES].sort()}
                        value={healer.skillLines.line2}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...healer.skillLines, line2: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 2" />}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES].sort()}
                        value={healer.skillLines.line3}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: { ...healer.skillLines, line3: value || '' },
                          })
                        }
                        renderInput={(params) => <TextField {...params} label="Skill Line 3" />}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                  </Box>
                )}

                <TextField
                  fullWidth
                  multiline
                  size="small"
                  rows={2}
                  label="Notes"
                  value={healer.notes || ''}
                  onChange={(e) => onChange({ notes: e.target.value })}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </CardContent>
    </Card>
  );
};

// DPS Slot Card Component
interface DPSSlotCardProps {
  slot: DPSSlot;
  availableGroups: string[];
  onChange: (updates: Partial<DPSSlot>) => void;
  onConvertToJail: (slotNumber: number, jailType: JailDDType) => void;
  onConvertToDPS: (slotNumber: number) => void;
}

const DPSSlotCard: React.FC<DPSSlotCardProps> = ({
  slot,
  availableGroups,
  onChange,
  onConvertToJail,
  onConvertToDPS,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.slotNumber,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getJailDDTitle = (type: JailDDType): string => {
    switch (type) {
      case 'banner':
        return 'Banner Jail DD';
      case 'zenkosh':
        return 'Zenkosh Jail DD';
      case 'wm':
        return 'War Machine Jail DD';
      case 'wm-mk':
        return 'WM/MK Jail DD';
      case 'mk':
        return 'Martial Knowledge Jail DD';
      case 'custom':
        return slot.customDescription || 'Custom Jail DD';
      default:
        return 'Jail DD';
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{ bgcolor: 'action.hover', cursor: isDragging ? 'grabbing' : 'default' }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconButton
            size="small"
            {...attributes}
            {...listeners}
            sx={{ cursor: 'grab' }}
            aria-label={`Drag to reorder DPS ${slot.slotNumber}`}
          >
            <DragIndicatorIcon />
          </IconButton>
          <Typography variant="subtitle1" fontWeight="bold">
            DPS {slot.slotNumber}
            {slot.jailDDType && (
              <Chip
                label={getJailDDTitle(slot.jailDDType)}
                size="small"
                color="primary"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
        </Box>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 40%', minWidth: 180 }}>
              <TextField
                fullWidth
                size="small"
                label="Player Name"
                value={slot.playerName || ''}
                onChange={(e) => onChange({ playerName: e.target.value })}
              />
            </Box>
            <Box sx={{ flex: '1 1 25%', minWidth: 150 }}>
              <TextField
                fullWidth
                size="small"
                label="Role Notes"
                placeholder="e.g., Portal L, Z'en"
                value={slot.roleNotes || ''}
                onChange={(e) => onChange({ roleNotes: e.target.value })}
              />
            </Box>
            <Box sx={{ flex: '1 1 25%', minWidth: 120 }}>
              <Autocomplete
                freeSolo
                size="small"
                options={[...availableGroups].sort()}
                value={slot.group?.groupName || ''}
                onChange={(_, value) =>
                  onChange({
                    group: value ? { groupName: value } : undefined,
                  })
                }
                renderInput={(params) => <TextField {...params} label="Group" />}
              />
            </Box>
          </Box>

          {/* Player Labels/Tags */}
          <Autocomplete
            multiple
            freeSolo
            size="small"
            options={[]}
            value={slot.labels || []}
            onChange={(_, value) => onChange({ labels: value })}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Labels / Tags"
                placeholder="Add custom labels (Press Enter)"
              />
            )}
          />

          {/* Convert to Jail DD or back to regular DPS */}
          {!slot.jailDDType ? (
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5, display: 'block' }}
              >
                Convert to Jail DD:
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onConvertToJail(slot.slotNumber, 'banner')}
                >
                  Banner
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onConvertToJail(slot.slotNumber, 'zenkosh')}
                >
                  Zenkosh
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onConvertToJail(slot.slotNumber, 'wm')}
                >
                  WM
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onConvertToJail(slot.slotNumber, 'wm-mk')}
                >
                  WM/MK
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onConvertToJail(slot.slotNumber, 'mk')}
                >
                  MK
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onConvertToJail(slot.slotNumber, 'custom')}
                >
                  Custom
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={() => onConvertToDPS(slot.slotNumber)}
              >
                Convert Back to Regular DPS
              </Button>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

// DD Requirement Card Component
// Generate Discord formatted text
const generateDiscordFormat = (roster: RaidRoster): string => {
  const lines: string[] = [];

  lines.push(`**${roster.rosterName}**`);
  lines.push('');

  // Helper to format ultimate in brackets
  const formatUlt = (ult: string | null): string => {
    if (!ult) return '';
    // Return custom ultimates as-is, or use preset names
    return ` [${ult}]`;
  };

  // Helper to format healer buff
  const formatBuff = (buff: HealerBuff | null): string => {
    if (!buff) return '';
    // Enum values already contain the display names
    return buff;
  };

  // Helper to format skill lines compactly (returns empty string if nothing)
  const formatSkillLines = (skillLines: SkillLineConfig): string => {
    if (skillLines.isFlex) return 'Flexible';
    const lines = [skillLines.line1, skillLines.line2, skillLines.line3].filter(Boolean);
    return lines.join('/');
  };

  // Helper to format gear sets (returns empty string if no sets)
  const formatGearSets = (
    tank?: {
      set1?: KnownSetIDs;
      set2?: KnownSetIDs;
      monsterSet?: KnownSetIDs;
      additionalSets?: KnownSetIDs[];
    },
    healer?: {
      set1?: KnownSetIDs;
      set2?: KnownSetIDs;
      monsterSet?: KnownSetIDs;
      additionalSets?: KnownSetIDs[];
    },
  ): string => {
    const fivePieceSets: string[] = [];
    const monsterSets: string[] = [];

    const categorizeSet = (setId: KnownSetIDs): void => {
      const displayName = getSetDisplayName(setId);
      if (!displayName) return;

      // Check if it's a monster set
      if (MONSTER_SETS.includes(setId)) {
        monsterSets.push(displayName);
      } else {
        fivePieceSets.push(displayName);
      }
    };

    if (tank) {
      if (tank.set1) categorizeSet(tank.set1);
      if (tank.set2) categorizeSet(tank.set2);
      if (tank.monsterSet) categorizeSet(tank.monsterSet);
      if (tank.additionalSets) {
        tank.additionalSets.forEach(categorizeSet);
      }
    }
    if (healer) {
      if (healer.set1) categorizeSet(healer.set1);
      if (healer.set2) categorizeSet(healer.set2);
      if (healer.monsterSet) categorizeSet(healer.monsterSet);
      if (healer.additionalSets) {
        healer.additionalSets.forEach(categorizeSet);
      }
    }

    // Remove duplicates and sort
    const uniqueFivePiece = Array.from(new Set(fivePieceSets)).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' }),
    );
    const uniqueMonster = Array.from(new Set(monsterSets));

    // Combine: five-piece sets alphabetically, then monster sets
    return [...uniqueFivePiece, ...uniqueMonster].join('/');
  };

  // Tanks - always MT/OT
  [1, 2].forEach((num) => {
    const tank = roster[`tank${num}` as 'tank1' | 'tank2'];
    const label = num === 1 ? 'MT' : 'OT';
    const roleNote = tank.roleNotes ? ` [${tank.roleNotes}]` : '';
    const playerName = tank.playerName ? ` ${tank.playerName}` : '';
    const labels = tank.labels && tank.labels.length > 0 ? ` (${tank.labels.join(', ')})` : '';

    lines.push(`${label}${roleNote}:${playerName}${labels}`);
    const gearSets = formatGearSets(tank.gearSets);
    if (gearSets) lines.push(gearSets);
    const skillLines = formatSkillLines(tank.skillLines);
    const ult = formatUlt(tank.ultimate);
    if (skillLines || ult) lines.push(`${skillLines}${ult}`);
    if (tank.notes) lines.push(`Notes: ${tank.notes}`);
    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
  lines.push('');

  // Healers
  [roster.healer1, roster.healer2].forEach((h, index) => {
    const label = h.roleLabel || (index === 0 ? 'H1' : 'H2');
    const roleNote = h.roleNotes ? ` [${h.roleNotes}]` : '';
    const playerName = h.playerName ? ` ${h.playerName}` : '';
    const groupName = h.group?.groupName ? ` (${h.group.groupName})` : '';
    const labels = h.labels && h.labels.length > 0 ? ` [${h.labels.join(', ')}]` : '';

    lines.push(`${label}${roleNote}:${playerName}${groupName}${labels}`);
    const gearSets = formatGearSets(undefined, h);
    if (gearSets) lines.push(gearSets);
    const buff = formatBuff(h.healerBuff);
    if (buff) lines.push(buff);
    const skillLines = formatSkillLines(h.skillLines);
    const ult = formatUlt(h.ultimate);
    if (skillLines || ult) lines.push(`${skillLines}${ult}`);
    if (h.notes) lines.push(`Notes: ${h.notes}`);
    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
  lines.push('');

  // Format jail DD type for display
  const formatJailDDType = (type: JailDDType, customDescription?: string): string => {
    switch (type) {
      case 'banner':
        return 'Banner';
      case 'zenkosh':
        return 'ZenKosh';
      case 'wm':
        return 'WM';
      case 'wm-mk':
        return 'WM/MK';
      case 'mk':
        return 'MK';
      case 'custom':
        return customDescription || 'Custom';
      default:
        return '';
    }
  };

  // DPS - all slots are now in dpsSlots array, some may have jailDDType
  const sortedDPS = [...roster.dpsSlots].sort((a, b) => a.slotNumber - b.slotNumber);

  // Check if any DDs have groups assigned
  const hasGroups = sortedDPS.some((dd) => dd.group?.groupName);

  if (hasGroups) {
    // Group DDs by their group
    const groupedDDs = new Map<string, DPSSlot[]>();

    sortedDPS.forEach((dd) => {
      const group = dd.group?.groupName || 'Unassigned';
      if (!groupedDDs.has(group)) {
        groupedDDs.set(group, []);
      }
      groupedDDs.get(group)!.push(dd);
    });

    // Print each group
    groupedDDs.forEach((dds, groupName) => {
      lines.push(groupName);
      dds.forEach((dd) => {
        const roleNote = dd.roleNotes ? ` [${dd.roleNotes}]` : '';
        const playerName = dd.playerName ? ` ${dd.playerName}` : '';
        const typeLabel = dd.jailDDType
          ? ` [${formatJailDDType(dd.jailDDType, dd.customDescription)}]`
          : '';
        const labels = dd.labels && dd.labels.length > 0 ? ` (${dd.labels.join(', ')})` : '';
        lines.push(`${dd.slotNumber}${typeLabel}${roleNote}:${playerName}${labels}`);
        if (dd.skillLines) {
          const skillLines = formatSkillLines(dd.skillLines);
          if (skillLines) lines.push(skillLines);
        }
      });
      lines.push('');
    });
  } else {
    // No groups - print DDs sequentially
    sortedDPS.forEach((dd) => {
      const roleNote = dd.roleNotes ? ` [${dd.roleNotes}]` : '';
      const playerName = dd.playerName ? ` ${dd.playerName}` : '';
      const typeLabel = dd.jailDDType
        ? ` [${formatJailDDType(dd.jailDDType, dd.customDescription)}]`
        : '';
      const labels = dd.labels && dd.labels.length > 0 ? ` (${dd.labels.join(', ')})` : '';
      lines.push(`${dd.slotNumber}${typeLabel}${roleNote}:${playerName}${labels}`);
      if (dd.skillLines) {
        const skillLines = formatSkillLines(dd.skillLines);
        if (skillLines) lines.push(skillLines);
      }
    });
    lines.push('');
  }

  // General Notes
  if (roster.notes) {
    lines.push('**General Notes:**');
    lines.push(roster.notes);
    lines.push('');
  }

  return lines.join('\n');
};
