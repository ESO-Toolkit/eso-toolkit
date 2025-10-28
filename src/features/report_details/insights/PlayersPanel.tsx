import React from 'react';
import { useSelector } from 'react-redux';

import { useLogger } from '@/contexts/LoggerContext';
import {
  SCRIBING_DETECTION_SCHEMA_VERSION,
  type CombatEventData,
  type PlayerAbilityList,
} from '@/features/scribing/analysis/scribingDetectionAnalysis';
import { isScribingAbility } from '@/features/scribing/utils/Scribing';
import { useAppDispatch } from '@/store/useAppDispatch';
import {
  executeScribingDetectionsTask,
  selectScribingDetectionsResult,
  selectScribingDetectionsTask,
} from '@/store/worker_results';

import type { GrimoireData } from '../../../components/ScribingSkillsDisplay';
import {
  useCastEvents,
  useCombatantInfoEvents,
  useCurrentFight,
  useDamageEvents,
  useDeathEvents,
  useFriendlyBuffEvents,
  useHostileBuffEvents,
  useHealingEvents,
  usePlayerData,
  useReportMasterData,
  useResourceEvents,
} from '../../../hooks';
import { useDebuffEvents } from '../../../hooks/events/useDebuffEvents';
import { useBuffLookupTask } from '../../../hooks/workerTasks/useBuffLookupTask';
import { usePlayerTravelDistanceTask } from '../../../hooks/workerTasks/usePlayerTravelDistanceTask';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import {
  KnownAbilities,
  MundusStones,
  RED_CHAMPION_POINTS,
  BLUE_CHAMPION_POINTS,
  GREEN_CHAMPION_POINTS,
} from '../../../types/abilities';
import { CastEvent, CombatantAura, CombatantInfoEvent } from '../../../types/combatlogEvents';
import { PlayerGear, PlayerTalent } from '../../../types/playerDetails';
import { BuffLookupData } from '../../../utils/BuffLookupUtils';
import {
  createSkillLineAbilityMapping,
  analyzePlayerClassFromEvents,
  type ClassAnalysisResult,
} from '../../../utils/classDetectionUtils';
import { detectBuildIssues, BuildIssue } from '../../../utils/detectBuildIssues';
import {
  ARENA_SET_NAMES,
  isDoubleSetCount,
  isPerfectedGear,
  MONSTER_ONE_PIECE_HINTS,
  MYTHIC_SET_NAMES,
  normalizeGearName,
  PlayerGearItemData,
  PlayerGearSetRecord,
} from '../../../utils/gearUtilities';
// TODO: Implement proper scribing detection services
// Temporary stubs to prevent compilation errors
const analyzeAllPlayersScribingSkills = (..._args: unknown[]): Record<string, never> => ({});
const findScribingRecipe = async (_skillId: unknown, _skillName?: string): Promise<null> => null;
const formatScribingRecipeForDisplay = (
  _recipe: unknown,
): {
  grimoire: string;
  transformation: string;
  transformationType: string;
  confidence: number;
  matchMethod: string;
  recipeSummary: string;
  tooltipInfo: string;
} => ({
  grimoire: '',
  transformation: '',
  transformationType: '',
  confidence: 0,
  matchMethod: 'stub',
  recipeSummary: '',
  tooltipInfo: '',
});

import { PlayersPanelView } from './PlayersPanelView';

// This panel now uses report actors from masterData

export const PlayersPanel: React.FC = () => {
  const logger = useLogger('PlayersPanel');
  const dispatch = useAppDispatch();
  const scribingTaskState = useSelector(selectScribingDetectionsTask);
  const scribingResult = useSelector(selectScribingDetectionsResult);

  // State for storing scribing recipe information
  const [scribingRecipes, setScribingRecipes] = React.useState<
    Record<
      string,
      Record<
        string,
        {
          grimoire: string;
          transformation: string;
          transformationType: string;
          confidence: number;
          matchMethod: string;
          recipeSummary: string;
          tooltipInfo: string;
        }
      >
    >
  >({});

  // Get report/fight context for CPM and deeplink
  const { reportId, fightId } = useSelectedReportAndFight();

  // Use hooks to get data
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();
  const { castEvents, isCastEventsLoading } = useCastEvents();
  const { deathEvents, isDeathEventsLoading } = useDeathEvents();
  const { friendlyBuffEvents, isFriendlyBuffEventsLoading } = useFriendlyBuffEvents();
  const { hostileBuffEvents, isHostileBuffEventsLoading } = useHostileBuffEvents();
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents();
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { healingEvents, isHealingEventsLoading } = useHealingEvents();
  const { resourceEvents, isResourceEventsLoading } = useResourceEvents();
  const { fight, isFightLoading } = useCurrentFight();

  const fightIdNumber = React.useMemo(() => {
    if (!fightId) {
      return null;
    }
    const parsed = Number(fightId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [fightId]);

  const allBuffEvents = React.useMemo(
    () => [...friendlyBuffEvents, ...hostileBuffEvents],
    [friendlyBuffEvents, hostileBuffEvents],
  );

  const combatEvents: CombatEventData = React.useMemo(
    () => ({
      buffs: allBuffEvents,
      debuffs: debuffEvents,
      damage: damageEvents,
      casts: castEvents,
      heals: healingEvents,
      resources: resourceEvents,
    }),
    [allBuffEvents, debuffEvents, damageEvents, castEvents, healingEvents, resourceEvents],
  );

  const scribingPlayerAbilities = React.useMemo<PlayerAbilityList[]>(() => {
    if (!playerData?.playersById) {
      return [];
    }

    return Object.values(playerData.playersById)
      .map((player) => {
        const talents = player.combatantInfo?.talents ?? [];
        const abilityIds = Array.from(
          new Set(
            talents
              .map((talent) => talent.guid)
              .filter((guid) => typeof guid === 'number' && isScribingAbility(guid)),
          ),
        );

        return {
          playerId: player.id,
          abilityIds,
        };
      })
      .filter((entry) => entry.abilityIds.length > 0);
  }, [playerData]);

  const existingScribingAbilities = React.useMemo(() => {
    if (!scribingResult || fightIdNumber === null || scribingResult.fightId !== fightIdNumber) {
      return new Map<number, Set<number>>();
    }

    const map = new Map<number, Set<number>>();
    Object.entries(scribingResult.players).forEach(([playerKey, abilityMap]) => {
      const validAbilities = new Set<number>();
      Object.entries(abilityMap).forEach(([abilityKey, detection]) => {
        if (detection?.schemaVersion === SCRIBING_DETECTION_SCHEMA_VERSION) {
          validAbilities.add(Number(abilityKey));
        }
      });

      if (validAbilities.size > 0) {
        map.set(Number(playerKey), validAbilities);
      }
    });
    return map;
  }, [scribingResult, fightIdNumber]);

  const pendingScribingAbilities = React.useMemo<PlayerAbilityList[]>(() => {
    if (scribingPlayerAbilities.length === 0) {
      return [];
    }

    const pending: PlayerAbilityList[] = [];

    scribingPlayerAbilities.forEach(({ playerId, abilityIds }) => {
      const existing = existingScribingAbilities.get(playerId);
      const missing = abilityIds.filter((id) => !existing?.has(id));

      if (missing.length > 0) {
        pending.push({ playerId, abilityIds: missing });
      }
    });

    return pending;
  }, [scribingPlayerAbilities, existingScribingAbilities]);

  // Get friendly buff lookup data for build issues detection
  const { buffLookupData: friendlyBuffLookup, isBuffLookupLoading } = useBuffLookupTask();
  const { playerTravelDistances, isPlayerTravelDistancesLoading } = usePlayerTravelDistanceTask();
  const distanceByPlayer = React.useMemo(() => {
    if (!playerTravelDistances?.distancesByPlayerId) {
      return {} as Record<string, number>;
    }

    const byPlayer: Record<string, number> = {};
    Object.entries(playerTravelDistances.distancesByPlayerId).forEach(([playerId, summary]) => {
      byPlayer[String(playerId)] = summary?.totalDistance ?? 0;
    });

    return byPlayer;
  }, [playerTravelDistances]);

  const { abilitiesById } = reportMasterData;

  // Calculate loading state - include ALL data dependencies this panel needs
  const isLoading =
    isMasterDataLoading ||
    isPlayerDataLoading ||
    isCombatantInfoEventsLoading ||
    isCastEventsLoading ||
    isDeathEventsLoading ||
    isFriendlyBuffEventsLoading ||
    isHostileBuffEventsLoading ||
    isDebuffEventsLoading ||
    isDamageEventsLoading ||
    isHealingEventsLoading ||
    isResourceEventsLoading ||
    isBuffLookupLoading ||
    isPlayerTravelDistancesLoading ||
    isFightLoading;

  React.useEffect(() => {
    if (isLoading) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    if (fightIdNumber === null) {
      return;
    }
    if (pendingScribingAbilities.length === 0) {
      return;
    }
    if (scribingTaskState.isLoading) {
      return;
    }

    dispatch(
      executeScribingDetectionsTask({
        fightId: fightIdNumber,
        combatEvents,
        playerAbilities: pendingScribingAbilities,
      }),
    );
  }, [
    isLoading,
    fightIdNumber,
    pendingScribingAbilities,
    scribingTaskState.isLoading,
    combatEvents,
    dispatch,
  ]);
  // Calculate unique mundus buffs per player using MundusStones enum from combatantinfo auras
  const mundusBuffsByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number }>> = {};

    if (!combatantInfoEvents || !abilitiesById) return result;

    // Get numeric mundus stone ability IDs from the enum (filter out string keys)
    const mundusStoneIds = Object.values(MundusStones).filter(
      (v): v is number => typeof v === 'number',
    );
    // Secondary: detect by ability name in case logs use alternate IDs (e.g., "Bonus (2): The Atronach")
    const mundusNameRegex =
      /^(?:Boon:|Bonus\s*\(2\):)?\s*The\s+(Warrior|Mage|Serpent|Thief|Lady|Steed|Lord|Apprentice|Ritual|Lover|Atronach|Shadow|Tower)\b/i;

    // Initialize arrays for each player
    if (playerData) {
      Object.values(playerData?.playersById).forEach((actor) => {
        if (actor?.id) {
          const playerId = String(actor.id);
          result[playerId] = [];

          // Gather ALL combatantinfo events for this player and union mundus auras across them
          const combatantInfoEventsForPlayer = combatantInfoEvents.filter(
            (event: CombatantInfoEvent): event is CombatantInfoEvent =>
              event.type === 'combatantinfo' &&
              'sourceID' in event &&
              String(event.sourceID) === playerId,
          );

          if (combatantInfoEventsForPlayer.length > 0) {
            const seen = new Set<number>();
            for (const cie of combatantInfoEventsForPlayer) {
              const auras = cie.auras || [];
              for (const aura of auras as CombatantAura[]) {
                const ability = abilitiesById[aura.ability];
                const name = ability?.name || aura.name || '';
                const isMundusById = mundusStoneIds.includes(aura.ability);
                const isMundusByName = mundusNameRegex.test(name);
                if (!isMundusById && !isMundusByName) continue;
                if (seen.has(aura.ability)) continue;
                seen.add(aura.ability);
                const mundusName = name || `Unknown Mundus (${aura.ability})`;
                const cleaned = mundusName.replace(/^(?:Boon:|Bonus\s*\(2\):)\s*/i, '').trim();
                result[playerId].push({ name: cleaned, id: aura.ability });
              }
            }
          }

          // Fallback: If none found via combatantinfo, scan applybuff events for mundus on this player
          if (result[playerId].length === 0) {
            for (const ev of friendlyBuffEvents) {
              if (ev.type === 'applybuff') {
                const abilityId = ev.abilityGameID;
                // mundus applies to self; match either source or target to this player
                const appliesToPlayer =
                  (ev.targetID != null && String(ev.targetID) === playerId) ||
                  (ev.sourceID != null && String(ev.sourceID) === playerId);
                if (typeof abilityId === 'number' && appliesToPlayer) {
                  const ability = abilitiesById[abilityId];
                  const name = ability?.name || '';
                  const isMundus = mundusStoneIds.includes(abilityId) || mundusNameRegex.test(name);
                  if (isMundus) {
                    const mundusName = name || `Mundus (${abilityId})`;
                    const cleaned = mundusName.replace(/^(?:Boon:|Bonus\s*\(2\):)\s*/i, '').trim();
                    result[playerId].push({ name: cleaned, id: abilityId });
                    break; // one mundus is sufficient
                  }
                }
              }
            }
          }
        }
      });
    }

    return result;
  }, [combatantInfoEvents, abilitiesById, playerData, friendlyBuffEvents]);

  // Calculate champion points per player using champion point constants from combatantinfo auras
  const championPointsByPlayer = React.useMemo(() => {
    const result: Record<
      string,
      Array<{ name: string; id: number; color: 'red' | 'blue' | 'green' }>
    > = {};

    if (!combatantInfoEvents || !abilitiesById) return result;

    // Get all champion point ability IDs from the constants
    const allChampionPoints = new Set<number>([
      ...Array.from(RED_CHAMPION_POINTS),
      ...Array.from(BLUE_CHAMPION_POINTS),
      ...Array.from(GREEN_CHAMPION_POINTS),
    ]);

    // Initialize arrays for each player
    if (playerData) {
      Object.values(playerData?.playersById).forEach((actor) => {
        if (actor?.id) {
          const playerId = String(actor.id);
          result[playerId] = [];

          // Gather ALL combatantinfo events for this player and union champion points across them
          const combatantInfoEventsForPlayer = combatantInfoEvents.filter(
            (event: CombatantInfoEvent): event is CombatantInfoEvent =>
              event.type === 'combatantinfo' &&
              'sourceID' in event &&
              String(event.sourceID) === playerId,
          );

          if (combatantInfoEventsForPlayer.length > 0) {
            const seen = new Set<number>();
            for (const cie of combatantInfoEventsForPlayer) {
              const auras = cie.auras || [];
              for (const aura of auras as CombatantAura[]) {
                const abilityId = aura.ability;
                if (!allChampionPoints.has(abilityId) || seen.has(abilityId)) continue;

                seen.add(abilityId);
                const ability = abilitiesById[abilityId];
                const name = ability?.name || `Unknown CP (${abilityId})`;

                // Determine color based on which set it belongs to
                let color: 'red' | 'blue' | 'green';
                if (RED_CHAMPION_POINTS.has(abilityId)) {
                  color = 'red';
                } else if (BLUE_CHAMPION_POINTS.has(abilityId)) {
                  color = 'blue';
                } else {
                  color = 'green';
                }

                result[playerId].push({ name, id: abilityId, color });
              }
            }
          }

          // Sort by color (red, blue, green) then by name
          result[playerId].sort((a, b) => {
            const colorOrder = { red: 0, blue: 1, green: 2 };
            if (colorOrder[a.color] !== colorOrder[b.color]) {
              return colorOrder[a.color] - colorOrder[b.color];
            }
            return a.name.localeCompare(b.name);
          });
        }
      });
    }

    return result;
  }, [combatantInfoEvents, abilitiesById, playerData]);

  // Compute CPM (casts per minute) per player for the current fight, including all casts
  const cpmByPlayer = React.useMemo(() => {
    const result: Record<string, number> = {};
    if (!fight) return result;

    for (const ev of castEvents) {
      if (ev.type === 'cast' && !ev.fake) {
        const src = ev.sourceID;
        result[src] = (result[src] || 0) + 1;
      }
    }

    const durationMs = fight?.endTime - fight?.startTime;
    const minutes = durationMs > 0 ? durationMs / 60000 : 0;
    if (minutes > 0) {
      for (const k of Object.keys(result)) {
        result[k] = Number((result[k] / minutes).toFixed(1));
      }
    } else {
      // No duration; set CPM to 0
      for (const k of Object.keys(result)) {
        result[k] = 0;
      }
    }

    return result;
  }, [castEvents, fight]);

  // Compute death counts per player for the current fight
  const deathsByPlayer = React.useMemo(() => {
    const counts: Record<string, number> = {};

    const fightNum = fightId ? Number(fightId) : undefined;

    for (const ev of deathEvents) {
      if (
        ev.type === 'death' &&
        (fightNum == null || (typeof ev.fight === 'number' && ev.fight === fightNum))
      ) {
        const target = ev.targetID;
        if (target != null) {
          const key = String(target);
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }

    return counts;
  }, [deathEvents, fightId]);

  // Compute total successful resurrects per player using the "Recently Revived" buff applications.
  // This focuses on successful revives and avoids double-counting cast attempts.
  const resurrectsByPlayer = React.useMemo(() => {
    const counts: Record<string, number> = {};

    for (const ev of castEvents) {
      // Buff applications carry sourceID (the resurrector) when available
      if (ev.type === 'cast' && ev.abilityGameID === KnownAbilities.RESURRECT) {
        counts[ev.sourceID] = (counts[ev.sourceID] || 0) + 1;
      }
    }

    return counts;
  }, [castEvents]);

  // Calculate the latest aura snapshot per player from combatantinfo events
  const aurasByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number; stacks?: number }>> = {};

    if (!playerData?.playersById || !combatantInfoEvents || !abilitiesById) {
      return result;
    }

    Object.values(playerData.playersById).forEach((actor) => {
      if (!actor?.id) {
        return;
      }

      const playerId = String(actor.id);
      result[playerId] = [];

      const latestCombatantInfo = combatantInfoEvents
        .filter((event): event is CombatantInfoEvent => {
          return (
            event.type === 'combatantinfo' &&
            'sourceID' in event &&
            String(event.sourceID) === playerId
          );
        })
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

      if (!latestCombatantInfo?.auras) {
        return;
      }

      latestCombatantInfo.auras.forEach((aura) => {
        const ability = abilitiesById[aura.ability];
        const auraName = ability?.name || aura.name || `Unknown Aura (${aura.ability})`;

        result[playerId].push({
          name: auraName,
          id: aura.ability,
          stacks: aura.stacks,
        });
      });

      result[playerId].sort((a, b) => a.name.localeCompare(b.name));
    });

    return result;
  }, [abilitiesById, combatantInfoEvents, playerData?.playersById]);

  const playerGear = React.useMemo(() => {
    const result: Record<number, PlayerGearSetRecord[]> = {};

    if (!playerData?.playersById) {
      return result;
    }

    for (const player of Object.values(playerData.playersById)) {
      const gear = player?.combatantInfo?.gear ?? [];

      const setDataByBase: Record<string, PlayerGearItemData> = {};

      gear.forEach((g: PlayerGear, idx) => {
        if (!g.setName) return;
        const increment = isDoubleSetCount(g, idx, gear) ? 2 : 1;

        const isPerfected = isPerfectedGear(g);
        const baseDisplay = g.setName.replace(/^Perfected\s+/, '');
        const baseKey = normalizeGearName(baseDisplay);

        if (!setDataByBase[baseKey]) {
          setDataByBase[baseKey] = {
            total: 0,
            perfected: 0,
            setID: g.setID,
            hasPerfected: false,
            hasRegular: false,
            baseDisplay,
          };
        }
        const entry = setDataByBase[baseKey];
        entry.total += increment;
        if (isPerfected) {
          entry.perfected += increment;
          entry.hasPerfected = true;
        } else {
          entry.hasRegular = true;
        }
        if (!entry.setID && g.setID) entry.setID = g.setID;
      });

      // Build sortable records from aggregated set data
      const records = Object.entries(setDataByBase).map<PlayerGearSetRecord>(([baseKey, data]) => {
        const labelName =
          data.perfected === data.total ? `Perfected ${data.baseDisplay}` : data.baseDisplay;
        const count = data.total;
        const n = normalizeGearName(labelName);
        const isMonster = MONSTER_ONE_PIECE_HINTS.has(n);
        const isMythic = MYTHIC_SET_NAMES.has(n);
        const isArena = ARENA_SET_NAMES.has(n);
        const isHighland4 = count === 4 && n === normalizeGearName('Highland Sentinel');
        const isFivePiece = count >= 5;
        const isThreePiece = count === 3;
        // Determine desired order category
        let category = 99;
        if (isMonster)
          category = 0; // monster (1p or 2p) first
        else if (isFivePiece)
          category = 1; // 5-piece bonuses
        else if (isHighland4)
          category = 2; // 4-piece Highland Sentinel
        else if (isThreePiece)
          category = 3; // 3-piece (e.g., Potentates)
        else if (isMythic)
          category = 4; // mythic
        else if (isArena)
          category = 5; // arena weapons
        else category = 6; // everything else last

        // Secondary ordering within monsters: 2p before 1p
        const secondary = isMonster ? (count === 2 ? 0 : 1) : 0;

        return {
          key: baseKey,
          data,
          labelName,
          count,
          category,
          secondary,
          sortName: data.baseDisplay.toLowerCase(),
        };
      });

      records.sort((a, b) => {
        if (a.category !== b.category) return a.category - b.category;
        if (a.secondary !== b.secondary) return a.secondary - b.secondary;
        // Prefer higher piece counts within same category (except monsters handled above)
        if (a.count !== b.count) return b.count - a.count;
        return a.sortName.localeCompare(b.sortName);
      });

      result[player.id] = records;
    }

    return result;
  }, [playerData?.playersById]);

  // Calculate max resources (health, stamina, magicka) per player using all resource events throughout the fight
  const maxResourcesByPlayer = React.useMemo(() => {
    const result: Record<string, { health: number; stamina: number; magicka: number }> = {};

    if (!playerData?.playersById || !fight) return result;

    // Initialize with 0 for each player
    Object.values(playerData.playersById).forEach((player) => {
      if (player?.id) {
        result[String(player.id)] = { health: 0, stamina: 0, magicka: 0 };
      }
    });

    const updatePlayerResources = (
      playerId: string,
      resources: { maxHitPoints?: number; maxStamina?: number; maxMagicka?: number },
    ): void => {
      if (result[playerId] !== undefined && resources) {
        if (resources.maxHitPoints) {
          result[playerId].health = Math.max(result[playerId].health, resources.maxHitPoints);
        }
        if (resources.maxStamina) {
          result[playerId].stamina = Math.max(result[playerId].stamina, resources.maxStamina);
        }
        if (resources.maxMagicka) {
          result[playerId].magicka = Math.max(result[playerId].magicka, resources.maxMagicka);
        }
      }
    };

    // Look for max resources across all resource events within the fight timeframe
    if (resourceEvents) {
      resourceEvents.forEach((event) => {
        if (event.type === 'resourcechange') {
          // Only consider events within the current fight timeframe
          const isInFightTimeframe =
            event.timestamp >= fight.startTime && event.timestamp <= fight.endTime;

          if (isInFightTimeframe) {
            // Check source resources
            if (event.sourceID && event.sourceResources) {
              const playerId = String(event.sourceID);
              updatePlayerResources(playerId, event.sourceResources);
            }

            // Check target resources
            if (event.targetID && event.targetResources) {
              const playerId = String(event.targetID);
              updatePlayerResources(playerId, event.targetResources);
            }
          }
        }
      });
    }

    // Also check damage and healing events for additional resource data
    if (damageEvents) {
      damageEvents.forEach((event) => {
        if (event.type === 'damage') {
          const isInFightTimeframe =
            event.timestamp >= fight.startTime && event.timestamp <= fight.endTime;

          if (isInFightTimeframe) {
            // Check source resources in damage events
            if (event.sourceID && event.sourceResources) {
              const playerId = String(event.sourceID);
              updatePlayerResources(playerId, event.sourceResources);
            }

            // Check target resources in damage events
            if (event.targetID && event.targetResources) {
              const playerId = String(event.targetID);
              updatePlayerResources(playerId, event.targetResources);
            }
          }
        }
      });
    }

    // Also check healing events for additional resource data
    if (healingEvents) {
      healingEvents.forEach((event) => {
        if (event.type === 'heal') {
          const isInFightTimeframe =
            event.timestamp >= fight.startTime && event.timestamp <= fight.endTime;

          if (isInFightTimeframe) {
            // Check source resources in healing events
            if (event.sourceID && event.sourceResources) {
              const playerId = String(event.sourceID);
              updatePlayerResources(playerId, event.sourceResources);
            }

            // Check target resources in healing events
            if (event.targetID && event.targetResources) {
              const playerId = String(event.targetID);
              updatePlayerResources(playerId, event.targetResources);
            }
          }
        }
      });
    }

    return result;
  }, [playerData?.playersById, resourceEvents, damageEvents, healingEvents, fight]);

  // Extract individual max resources for backward compatibility
  const maxHealthByPlayer = React.useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(maxResourcesByPlayer).forEach(([playerId, resources]) => {
      result[playerId] = resources.health;
    });
    return result;
  }, [maxResourcesByPlayer]);

  const maxStaminaByPlayer = React.useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(maxResourcesByPlayer).forEach(([playerId, resources]) => {
      result[playerId] = resources.stamina;
    });
    return result;
  }, [maxResourcesByPlayer]);

  const maxMagickaByPlayer = React.useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(maxResourcesByPlayer).forEach(([playerId, resources]) => {
      result[playerId] = resources.magicka;
    });
    return result;
  }, [maxResourcesByPlayer]);

  // Calculate build issues per player
  const buildIssuesByPlayer = React.useMemo(() => {
    const result: Record<string, BuildIssue[]> = {};

    if (!playerData?.playersById || !friendlyBuffLookup || !fight?.startTime || !fight?.endTime) {
      return result;
    }

    Object.values(playerData.playersById).forEach((player) => {
      if (!player?.id) return;

      const playerId = String(player.id);
      const gear = player?.combatantInfo?.gear ?? [];
      const resourceSnapshot = maxResourcesByPlayer[playerId];
      const playerResourceProfile = resourceSnapshot
        ? { stamina: resourceSnapshot.stamina, magicka: resourceSnapshot.magicka }
        : undefined;

      // Extract auras for this player from combatant info events
      const playerAuras: CombatantAura[] = [];
      if (combatantInfoEvents) {
        const playerCombatantInfo = combatantInfoEvents.find(
          (event) => event.sourceID === player.id,
        );
        if (playerCombatantInfo?.auras) {
          playerAuras.push(...playerCombatantInfo.auras);
        }
      }

      const emptyBuffLookup: BuffLookupData = { buffIntervals: {} };

      const buildIssues = detectBuildIssues(
        gear,
        friendlyBuffLookup || emptyBuffLookup,
        fight.startTime,
        fight.endTime,
        playerAuras,
        player.role,
        damageEvents,
        player.id,
        playerResourceProfile,
      );

      result[playerId] = buildIssues;
    });

    return result;
  }, [
    playerData?.playersById,
    friendlyBuffLookup,
    fight?.startTime,
    fight?.endTime,
    damageEvents,
    combatantInfoEvents,
    maxResourcesByPlayer,
  ]);

  // Calculate scribing skills per player using the utility function
  const scribingSkillsByPlayer = React.useMemo(() => {
    if (
      !friendlyBuffEvents ||
      !debuffEvents ||
      !damageEvents ||
      !resourceEvents ||
      !castEvents ||
      !abilitiesById ||
      !playerData?.playersById
    ) {
      return {};
    }

    // Create the player details structure expected by the utility function
    const playerDetailsData = {
      data: {
        playerDetails: {
          tanks: Object.values(playerData.playersById)
            .filter((player) => player?.combatantInfo?.talents)
            .map((player) => ({
              id: player?.id ?? 0,
              name: player?.name ?? 'Unknown Player',
              combatantInfo: {
                talents: player?.combatantInfo?.talents ?? [],
              },
            })),
          dps: [] as Array<{
            id: number;
            name: string;
            combatantInfo: { talents: PlayerTalent[] };
          }>,
          healers: [] as Array<{
            id: number;
            name: string;
            combatantInfo: { talents: PlayerTalent[] };
          }>,
        },
      },
    };

    // Create the master data structure expected by the utility function
    const masterDataStructure = {
      reportData: {
        report: {
          masterData: {
            abilities: Object.values(abilitiesById),
          },
        },
      },
    };

    // Use the utility function to analyze all players' scribing skills
    const allPlayersScribingResults = analyzeAllPlayersScribingSkills(
      playerDetailsData,
      masterDataStructure,
      debuffEvents,
      friendlyBuffEvents,
      resourceEvents,
      damageEvents,
      healingEvents,
      castEvents.filter((e) => e.type === 'cast') as CastEvent[],
    );

    // Transform the results to match the expected GrimoireData structure
    const result: Record<string, GrimoireData[]> = {};

    Object.entries(allPlayersScribingResults as Record<string, unknown[]>).forEach(
      ([playerIdStr, scribingSkills]) => {
        const grimoireDataList: GrimoireData[] = [];

        (
          scribingSkills as Array<{
            grimoire: string;
            talentGuid: number;
            talentName: string;
            effects: Array<{
              id: number;
              name: string;
              icon?: string;
              abilityName?: string;
              events?: unknown[];
            }>;
          }>
        ).forEach((skillAnalysis) => {
          // Find existing grimoire or create new one
          let grimoireData = grimoireDataList.find(
            (g) => g.grimoireName === skillAnalysis.grimoire,
          );
          if (!grimoireData) {
            grimoireData = {
              grimoireName: skillAnalysis.grimoire,
              skills: [],
            };
            grimoireDataList.push(grimoireData);
          }

          // Convert effects to the expected format
          const skillEffects = skillAnalysis.effects.map((effect) => {
            // Determine the type based on the events in this effect
            let effectType: 'damage' | 'heal' | 'buff' | 'debuff' | 'aura' | 'resource' = 'buff';

            if (effect.events && effect.events.length > 0) {
              const firstEvent = effect.events[0] as { type?: string };
              if (firstEvent.type) {
                switch (firstEvent.type) {
                  case 'damage':
                    effectType = 'damage';
                    break;
                  case 'heal':
                    effectType = 'heal';
                    break;
                  case 'applybuff':
                  case 'applybuffstack':
                  case 'removebuff':
                  case 'removebuffstack':
                    effectType = 'buff';
                    break;
                  case 'applydebuff':
                  case 'applydebuffstack':
                  case 'removedebuff':
                  case 'removedebuffstack':
                    effectType = 'debuff';
                    break;
                  case 'resourcechange':
                    effectType = 'resource';
                    break;
                  default:
                    effectType = 'buff';
                }
              }
            }

            return {
              abilityId: effect.id,
              abilityName: effect.abilityName || effect.name,
              type: effectType,
              count: effect.events?.length || 0,
            };
          });

          // Add this skill to the grimoire
          // Use the original talent name for proper skill identification
          grimoireData.skills.push({
            skillId: skillAnalysis.talentGuid, // Use the talent GUID as unique identifier
            skillName: skillAnalysis.talentName, // Use the original talent name
            effects: skillEffects,
          });
        });

        result[playerIdStr] = grimoireDataList;
      },
    );

    return result;
  }, [
    friendlyBuffEvents,
    debuffEvents,
    damageEvents,
    healingEvents,
    resourceEvents,
    castEvents,
    abilitiesById,
    playerData?.playersById,
  ]);

  // Calculate class analysis for each player
  const classAnalysisByPlayer = React.useMemo(() => {
    const result: Record<string, ClassAnalysisResult> = {};

    if (!abilitiesById || !playerData?.playersById) {
      return result;
    }

    // Create class mapping once from the abilitiesById data
    const classMapping = createSkillLineAbilityMapping(abilitiesById);

    // Analyze each player's class usage
    Object.values(playerData.playersById).forEach((player) => {
      if (!player?.id) return;

      const playerId = String(player.id);

      // Get player talents
      const playerTalents = player?.combatantInfo?.talents;

      // Use the new utility function that handles event extraction and analysis
      const analysis = analyzePlayerClassFromEvents(
        playerId,
        abilitiesById,
        combatantInfoEvents,
        castEvents,
        damageEvents,
        friendlyBuffEvents,
        debuffEvents,
        playerTalents,
        classMapping,
      );

      result[playerId] = analysis;
    });

    return result;
  }, [
    abilitiesById,
    playerData?.playersById,
    combatantInfoEvents,
    castEvents,
    damageEvents,
    friendlyBuffEvents,
    debuffEvents,
  ]);

  // Effect to lookup scribing recipes for detected skills
  React.useEffect(() => {
    const lookupRecipes = async (): Promise<void> => {
      const newRecipes: Record<
        string,
        Record<
          string,
          {
            grimoire: string;
            transformation: string;
            transformationType: string;
            confidence: number;
            matchMethod: string;
            recipeSummary: string;
            tooltipInfo: string;
          }
        >
      > = {};

      for (const [playerId, grimoires] of Object.entries(scribingSkillsByPlayer)) {
        newRecipes[playerId] = {};

        for (const grimoire of grimoires) {
          for (const skill of grimoire.skills) {
            // Find the first effect with a valid ability ID for recipe lookup
            const effectWithId = skill.effects.find(
              (effect: { abilityId?: number; abilityName?: string }) =>
                effect.abilityId && effect.abilityId > 0,
            );

            // Try recipe lookup with the skill's main ID first
            try {
              logger.info('Looking up scribing recipe for skill', {
                skillName: skill.skillName,
                skillId: skill.skillId,
              });

              let recipeMatch = (await findScribingRecipe(
                skill.skillId,
                skill.skillName,
              )) as null | { grimoire: { name: string }; transformation?: { name: string } };

              // If that doesn't work, try with the first effect's ability ID
              if (!recipeMatch && effectWithId) {
                logger.info('Trying recipe lookup with effect ID', {
                  effectId: effectWithId.abilityId,
                  effectName: effectWithId.abilityName,
                });
                recipeMatch = (await findScribingRecipe(
                  effectWithId.abilityId,
                  effectWithId.abilityName,
                )) as null | { grimoire: { name: string }; transformation?: { name: string } };
              }

              if (recipeMatch) {
                logger.info('Found scribing recipe', {
                  grimoire: recipeMatch.grimoire.name,
                  transformation: recipeMatch.transformation?.name,
                });
                const recipeDisplay = formatScribingRecipeForDisplay(recipeMatch);
                newRecipes[playerId][skill.skillId] = recipeDisplay;
              } else {
                logger.info('No recipe found for skill', { skillName: skill.skillName });
              }
            } catch (error) {
              logger.warn('Failed to lookup scribing recipe', {
                skillName: skill.skillName,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }
      }

      setScribingRecipes(newRecipes);
    };

    if (Object.keys(scribingSkillsByPlayer).length > 0) {
      lookupRecipes();
    }
  }, [scribingSkillsByPlayer, logger]);

  // Merge scribing skills with their recipe information
  const enhancedScribingSkillsByPlayer = React.useMemo(() => {
    const result: Record<string, GrimoireData[]> = {};

    Object.entries(scribingSkillsByPlayer).forEach(([playerId, grimoires]) => {
      result[playerId] = grimoires.map((grimoire) => ({
        ...grimoire,
        skills: grimoire.skills.map(
          (skill: {
            skillId: number;
            skillName: string;
            effects: Array<{
              abilityId: number;
              abilityName: string;
              type: 'damage' | 'heal' | 'resource' | 'buff' | 'debuff' | 'aura';
              count: number;
            }>;
          }) => ({
            ...skill,
            recipe: scribingRecipes[playerId]?.[skill.skillId],
          }),
        ),
      }));
    });

    return result;
  }, [scribingSkillsByPlayer, scribingRecipes]);

  return (
    <div data-testid="players-panel-loaded">
      <PlayersPanelView
        playerActors={playerData?.playersById}
        mundusBuffsByPlayer={mundusBuffsByPlayer}
        championPointsByPlayer={championPointsByPlayer}
        scribingSkillsByPlayer={enhancedScribingSkillsByPlayer}
        buildIssuesByPlayer={buildIssuesByPlayer}
        classAnalysisByPlayer={classAnalysisByPlayer}
        deathsByPlayer={deathsByPlayer}
        resurrectsByPlayer={resurrectsByPlayer}
        cpmByPlayer={cpmByPlayer}
        aurasByPlayer={aurasByPlayer}
        maxHealthByPlayer={maxHealthByPlayer}
        maxStaminaByPlayer={maxStaminaByPlayer}
        maxMagickaByPlayer={maxMagickaByPlayer}
        distanceByPlayer={distanceByPlayer}
        reportId={reportId}
        fightId={fightId}
        isLoading={isLoading}
        playerGear={playerGear}
        fightStartTime={fight?.startTime}
        fightEndTime={fight?.endTime}
      />
    </div>
  );
};
