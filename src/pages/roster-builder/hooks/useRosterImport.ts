/**
 * useRosterImport Hook
 * Handles import/export functionality for rosters
 */

import { useCallback } from 'react';
import { RaidRoster, TankSetup, HealerSetup, DPSSlot, SupportUltimate, HealerBuff, HealerChampionPoint } from '../../../types/roster';
import { KnownSetIDs, KnownAbilities, ALL_5PIECE_SETS, MONSTER_SETS } from '../../../types/abilities';
import { getSetDisplayName, findSetIdByName } from '../../../utils/setNameUtils';
import { generateDiscordFormat } from '../utils/discordFormatter';

// GraphQL types for ESO Logs import
interface PlayerData {
  name?: string;
  id?: number;
  combatantInfo?: CombatantInfo;
}

interface CombatantInfo {
  gear?: GearItem[];
  talents?: TalentItem[];
}

interface GearItem {
  setName?: string;
  setID?: number;
  permanentEnchant?: number;
}

interface TalentItem {
  name?: string;
  guid?: number;
}

interface PlayerDetails {
  tanks?: PlayerData[];
  healers?: PlayerData[];
  dps?: PlayerData[];
}

interface AuraInfo {
  source: number;
  ability: number;
}

interface CombatantInfoEvent {
  timestamp: number;
  type: string;
  sourceID: number;
  auras?: AuraInfo[];
}

interface GraphQLResponse {
  reportData?: {
    report?: {
      playerDetails?: unknown;
      events?: { data?: string | CombatantInfoEvent[] };
    };
  };
}

interface UseRosterImportParams {
  roster: RaidRoster;
  setRoster: (roster: RaidRoster) => void;
  validateImportedRoster: (data: unknown) => RaidRoster;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

/**
 * Categorize gear items for import
 */
const categorizeSets = (
  gear: GearItem[],
): {
  fivePieceSets: string[];
  monsterSets: string[];
  otherSets: string[];
} => {
  const normalizeSetName = (name: string): string => {
    return name.replace(/^Perfected\s+/i, '');
  };

  const isPerfected = (name: string): boolean => {
    return /^Perfected\s+/i.test(name);
  };

  // Transform gear items: if setName is missing but setID exists, look up the name
  const transformedGear = gear.map((item) => {
    if (!item.setName && item.setID) {
      const displayName = getSetDisplayName(item.setID as KnownSetIDs);
      if (displayName) {
        return { ...item, setName: displayName };
      }
    }
    return item;
  });

  // Count pieces
  const rawCountMap = new Map<string, number>();
  const perfectedVersions = new Map<string, string>();

  transformedGear.forEach((item: GearItem) => {
    if (item.setName) {
      const pieceCount = item.permanentEnchant ? 2 : 1;
      rawCountMap.set(item.setName, (rawCountMap.get(item.setName) || 0) + pieceCount);

      if (isPerfected(item.setName)) {
        const normalized = normalizeSetName(item.setName);
        perfectedVersions.set(normalized, item.setName);
      }
    }
  });

  // Consolidate perfected and non-perfected sets
  const setCountMap = new Map<string, number>();
  const processedNormalized = new Set<string>();

  rawCountMap.forEach((count, setName) => {
    const normalized = normalizeSetName(setName);
    if (processedNormalized.has(normalized)) return;

    processedNormalized.add(normalized);
    const perfectedName = perfectedVersions.get(normalized);
    let totalCount = 0;

    if (perfectedName) {
      totalCount += rawCountMap.get(perfectedName) || 0;
    }
    totalCount += rawCountMap.get(normalized) || 0;

    setCountMap.set(normalized, totalCount);
  });

  const fivePieceSets: string[] = [];
  const monsterSets: string[] = [];
  const otherSets: string[] = [];

  // Sets to exclude from import
  const excludedSetIds = new Set([
    KnownSetIDs.ARMOR_OF_THE_TRAINEE,
    KnownSetIDs.DRUIDS_BRAID,
  ]);

  setCountMap.forEach((count, setName) => {
    const setId = findSetIdByName(setName);

    if (setId && excludedSetIds.has(setId)) return;

    if (setId && MONSTER_SETS.includes(setId)) {
      monsterSets.push(setName);
    } else if (setId && count >= 5 && ALL_5PIECE_SETS.includes(setId)) {
      fivePieceSets.push(setName);
    } else {
      otherSets.push(setName);
    }
  });

  return { fivePieceSets, monsterSets, otherSets };
};

/**
 * Extract ultimate from talents
 */
const extractUltimate = (
  combatantInfo: CombatantInfo | undefined,
): SupportUltimate | null => {
  if (!combatantInfo?.talents) return null;

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

/**
 * Extract healer champion point from auras
 */
const extractHealerChampionPoint = (
  auras: AuraInfo[] | undefined,
): HealerChampionPoint | null => {
  if (!auras) return null;

  for (const aura of auras) {
    if (aura.ability === KnownAbilities.ENLIVENING_OVERFLOW) {
      return HealerChampionPoint.ENLIVENING_OVERFLOW;
    }
    if (aura.ability === KnownAbilities.FROM_THE_BRINK) {
      return HealerChampionPoint.FROM_THE_BRINK;
    }
  }

  return null;
};

/**
 * Parse tanks from ESO Logs data
 */
const parseTanks = (
  tanks: PlayerData[],
  currentRoster: RaidRoster,
): TankSetup[] => {
  return tanks.map((tank, index) => {
    const gear = tank.combatantInfo?.gear || [];
    const { fivePieceSets, monsterSets } = categorizeSets(gear);
    const extractedUltimate = extractUltimate(tank.combatantInfo);

    const existingUltimate = index === 0 ? currentRoster.tank1.ultimate : currentRoster.tank2.ultimate;
    const shouldReplaceUltimate =
      !existingUltimate ||
      (existingUltimate === SupportUltimate.BARRIER && extractedUltimate && extractedUltimate !== SupportUltimate.BARRIER);
    const finalUltimate = shouldReplaceUltimate ? extractedUltimate : existingUltimate;

    return {
      playerName: tank.name || `Tank ${index + 1}`,
      roleLabel: `T${index + 1}`,
      gearSets: {
        set1: fivePieceSets[0] ? findSetIdByName(fivePieceSets[0]) : undefined,
        set2: fivePieceSets[1] ? findSetIdByName(fivePieceSets[1]) : undefined,
        monsterSet: monsterSets[0] ? findSetIdByName(monsterSets[0]) : undefined,
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
};

/**
 * Parse healers from ESO Logs data
 */
const parseHealers = (
  healers: PlayerData[],
  playerChampionPoints: Map<string, HealerChampionPoint>,
  currentRoster: RaidRoster,
): HealerSetup[] => {
  return healers.map((healer, index) => {
    const gear = healer.combatantInfo?.gear || [];
    const { fivePieceSets, monsterSets } = categorizeSets(gear);
    const extractedUltimate = extractUltimate(healer.combatantInfo);

    const existingUltimate = index === 0 ? currentRoster.healer1.ultimate : currentRoster.healer2.ultimate;
    const shouldReplaceUltimate =
      !existingUltimate ||
      (existingUltimate === SupportUltimate.BARRIER && extractedUltimate && extractedUltimate !== SupportUltimate.BARRIER);
    const finalUltimate = shouldReplaceUltimate ? extractedUltimate : existingUltimate;

    const extractedChampionPoint = healer.id !== undefined
      ? playerChampionPoints.get(String(healer.id))
      : null;

    return {
      playerName: healer.name || `Healer ${index + 1}`,
      roleLabel: `H${index + 1}`,
      set1: fivePieceSets[0] ? findSetIdByName(fivePieceSets[0]) : undefined,
      set2: fivePieceSets[1] ? findSetIdByName(fivePieceSets[1]) : undefined,
      monsterSet: monsterSets[0] ? findSetIdByName(monsterSets[0]) : undefined,
      skillLines: {
        line1: '',
        line2: '',
        line3: '',
        isFlex: false,
      },
      healerBuff: extractedChampionPoint as HealerBuff | null,
      championPoint: extractedChampionPoint,
      ultimate: finalUltimate,
    };
  });
};

/**
 * Parse DPS from ESO Logs data
 */
const parseDPS = (dps: PlayerData[]): DPSSlot[] => {
  return dps.slice(0, 8).map((dpsPlayer, index) => {
    const gear = dpsPlayer.combatantInfo?.gear || [];
    const { fivePieceSets } = categorizeSets(gear);

    return {
      slotNumber: index + 1,
      playerName: dpsPlayer.name || '',
      gearSets: fivePieceSets.map((name) => findSetIdByName(name)).filter((id): id is KnownSetIDs => id !== undefined),
      skillLines: {
        line1: '',
        line2: '',
        line3: '',
        isFlex: false,
      },
    };
  });
};

/**
 * Import roster from ESO Logs GraphQL response
 */
const importFromESOLogs = (
  response: GraphQLResponse,
  currentRoster: RaidRoster,
): {
  updatedRoster: RaidRoster;
  tankCount: number;
  healerCount: number;
  dpsCount: number;
} => {
  const playerDetails = response.reportData?.report?.playerDetails;

  let details: PlayerDetails | undefined;
  if (typeof playerDetails === 'string') {
    try {
      const parsed = JSON.parse(playerDetails) as { data?: { playerDetails?: PlayerDetails } };
      details = parsed?.data?.playerDetails;
    } catch {}
  } else if (typeof playerDetails === 'object') {
    const payload = (playerDetails as { data?: unknown }).data;
    if (payload && typeof payload === 'object') {
      details = (payload as { playerDetails?: PlayerDetails }).playerDetails;
    }
  }

  if (!details) {
    throw new Error('Invalid player details format');
  }

  // Parse events for champion points
  const eventsData = response.reportData?.report?.events?.data;
  let combatantInfoEvents: CombatantInfoEvent[] = [];

  if (eventsData) {
    if (typeof eventsData === 'string') {
      try {
        combatantInfoEvents = JSON.parse(eventsData);
      } catch {}
    } else if (Array.isArray(eventsData)) {
      combatantInfoEvents = eventsData;
    }
  }

  // Build champion point map
  const playerChampionPoints = new Map<string, HealerChampionPoint>();
  combatantInfoEvents.forEach((event) => {
    if (!event.auras || event.auras.length === 0) return;

    const sourceId = String(event.sourceID);
    if (!playerChampionPoints.has(sourceId)) {
      playerChampionPoints.set(sourceId, null);
    }

    const cp = extractHealerChampionPoint(event.auras);
    if (cp) {
      playerChampionPoints.set(sourceId, cp);
    }
  });

  const { tanks = [], healers = [], dps = [] } = details;

  // Parse all role data
  const parsedTanks = parseTanks(tanks, currentRoster);
  const parsedHealers = parseHealers(healers, playerChampionPoints, currentRoster);
  const parsedDPS = parseDPS(dps);

  const updatedRoster: RaidRoster = {
    ...currentRoster,
    tank1: parsedTanks[0] || currentRoster.tank1,
    tank2: parsedTanks[1] || currentRoster.tank2,
    healer1: parsedHealers[0] || currentRoster.healer1,
    healer2: parsedHealers[1] || currentRoster.healer2,
    dpsSlots: parsedDPS.length > 0 ? parsedDPS : currentRoster.dpsSlots,
    updatedAt: new Date().toISOString(),
  };

  return {
    updatedRoster,
    tankCount: Math.min(parsedTanks.length, 2),
    healerCount: Math.min(parsedHealers.length, 2),
    dpsCount: Math.min(parsedDPS.length, 8),
  };
};

/**
 * Hook for import/export functionality
 */
export const useRosterImport = ({
  roster,
  setRoster,
  validateImportedRoster,
  showSuccess,
  showError,
}: UseRosterImportParams) => {
  /**
   * Export roster as JSON file
   */
  const handleExportJSON = useCallback(() => {
    const dataStr = JSON.stringify(roster, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileName = `${roster.rosterName.replace(/\s+/g, '_')}_roster.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();

    showSuccess('Roster exported successfully!');
  }, [roster, showSuccess]);

  /**
   * Import roster from JSON file
   */
  const handleImportJSON = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsedData: unknown = JSON.parse(e.target?.result as string);
        const validatedRoster = validateImportedRoster(parsedData);

        setRoster(validatedRoster);
        showSuccess('Roster imported successfully!');
      } catch (error) {
        showError(`Failed to import roster: ${error instanceof Error ? error.message : 'Invalid JSON file'}`);
      }
    };
    reader.readAsText(file);
  }, [setRoster, validateImportedRoster, showSuccess, showError]);

  /**
   * Import from ESO Logs URL (async)
   */
  const handleImportFromUrl = useCallback(
    async (url: string, graphqlQuery: (query: string, variables: any) => Promise<any>) => {
      try {
        // Parse URL to extract code and fight ID
        const urlMatch = url.match(/esologs\.com\/reports\/([^#/?]+)(?:[#?]fight=(\d+))?/);
        if (!urlMatch) {
          showError(
            'Invalid ESO Logs URL format. Expected: https://www.esologs.com/reports/CODE or https://www.esologs.com/reports/CODE?fight=ID',
          );
          return;
        }

        const [, code, fightIdStr] = urlMatch;
        const fightId = fightIdStr ? parseInt(fightIdStr, 10) : undefined;

        // Fetch player details from report
        const response: GraphQLResponse = await graphqlQuery(
          `
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
          }
          `,
          { code, fightIDs: fightId ? [fightId] : undefined },
        );

        const { updatedRoster, tankCount, healerCount, dpsCount } = importFromESOLogs(response, roster);
        setRoster(updatedRoster);
        showSuccess(`Successfully imported ${tankCount} tank(s), ${healerCount} healer(s), and ${dpsCount} DPS from ESO Logs!`);
      } catch (error) {
        showError(`Failed to import from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [roster, setRoster, showSuccess, showError],
  );

  /**
   * Copy shareable link to clipboard
   */
  const handleCopyLink = useCallback(() => {
    // This is handled by useRosterState's useEffect
    // We just need to trigger a notification
    const url = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        showSuccess('Shareable link copied to clipboard!');
      })
      .catch(() => {
        showError('Failed to copy link');
      });
  }, [showSuccess, showError]);

  /**
   * Copy Discord format to clipboard
   */
  const handleCopyDiscordFormat = useCallback(() => {
    const discordFormat = generateDiscordFormat(roster);
    navigator.clipboard
      .writeText(discordFormat)
      .then(() => {
        showSuccess('Discord format copied to clipboard!');
      })
      .catch(() => {
        showError('Failed to copy to clipboard.');
      });
  }, [roster, showSuccess, showError]);

  return {
    handleExportJSON,
    handleImportJSON,
    handleImportFromUrl,
    handleCopyLink,
    handleCopyDiscordFormat,
  };
};

export type UseRosterImportReturn = ReturnType<typeof useRosterImport>;
