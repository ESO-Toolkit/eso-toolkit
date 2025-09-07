import React from 'react';

import { GrimoireData } from '../../../components/ScribingSkillsDisplay';
import {
  useCastEvents,
  useCombatantInfoEvents,
  useCurrentFight,
  useDamageEvents,
  useDeathEvents,
  useFriendlyBuffEvents,
  useHealingEvents,
  usePlayerData,
  useReportMasterData,
  useResourceEvents,
} from '../../../hooks';
import { useDebuffEvents } from '../../../hooks/events/useDebuffEvents';
import { useBuffLookupTask } from '../../../hooks/workerTasks/useBuffLookupTask';
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
import { analyzeAllPlayersScribingSkills } from '../../../utils/Scribing';

import { PlayersPanelView } from './PlayersPanelView';

// Exclusion list extracted from the provided pins filter
const CPM_EXCLUSION_LIST = Object.freeze(
  new Set<number>([
    16499, 28541, 16165, 16145, 18350, 28549, 45223, 18396, 16277, 115548, 85572, 23196, 95040,
    39301, 63507, 22269, 95042, 191078, 32910, 41963, 16261, 45221, 48076, 32974, 21970, 41838,
    16565, 45227, 118604, 26832, 15383, 45382, 16420, 68401, 47193, 190583, 16212, 228524, 186981,
    16037, 15435, 15279, 72931, 45228, 16688, 61875, 61874,
  ]),
);

// This panel now uses report actors from masterData

export const PlayersPanel: React.FC = () => {
  // Get report/fight context for CPM and deeplink
  const { reportId, fightId } = useSelectedReportAndFight();

  // Use hooks to get data
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();
  const { castEvents, isCastEventsLoading } = useCastEvents();
  const { deathEvents, isDeathEventsLoading } = useDeathEvents();
  const { friendlyBuffEvents, isFriendlyBuffEventsLoading } = useFriendlyBuffEvents();
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents();
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { healingEvents, isHealingEventsLoading } = useHealingEvents();
  const { resourceEvents, isResourceEventsLoading } = useResourceEvents();
  const fight = useCurrentFight();

  // Get friendly buff lookup data for build issues detection
  const { buffLookupData: friendlyBuffLookup, isBuffLookupLoading } = useBuffLookupTask();

  const { abilitiesById } = reportMasterData;

  // Calculate loading state
  const isLoading =
    isMasterDataLoading ||
    isPlayerDataLoading ||
    isCombatantInfoEventsLoading ||
    isCastEventsLoading ||
    isDeathEventsLoading ||
    isFriendlyBuffEventsLoading ||
    isDebuffEventsLoading ||
    isDamageEventsLoading ||
    isHealingEventsLoading ||
    isResourceEventsLoading ||
    isBuffLookupLoading;
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

  // Compute CPM (casts per minute) per player for the current fight, excluding specific abilities per provided filter
  const cpmByPlayer = React.useMemo(() => {
    const result: Record<string, number> = {};
    if (!fight) return result;

    for (const ev of castEvents) {
      if (ev.type === 'cast' && !ev.fake) {
        const src = ev.sourceID;
        const abilityId: number | undefined = ev.abilityGameID;
        if (!CPM_EXCLUSION_LIST.has(abilityId)) {
          result[src] = (result[src] || 0) + 1;
        }
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

  // Calculate all auras per player from combatantinfo events
  const aurasByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number; stacks?: number }>> = {};

    // Initialize arrays for each player
    if (playerData) {
      Object.values(playerData.playersById).forEach((actor) => {
        if (actor?.id) {
          const playerId = String(actor.id);
          result[playerId] = [];

          // Find the latest combatantinfo event for this player
          const combatantInfoEventsForPlayer = combatantInfoEvents
            .filter((event): event is CombatantInfoEvent => {
              return (
                event.type === 'combatantinfo' &&
                'sourceID' in event &&
                String(event.sourceID) === playerId
              );
            })
            .sort((a, b) => {
              return (b.timestamp || 0) - (a.timestamp || 0);
            }); // Most recent first

          const latestCombatantInfo = combatantInfoEventsForPlayer[0];
          if (latestCombatantInfo && latestCombatantInfo.auras) {
            // Get all auras for this player
            latestCombatantInfo.auras.forEach((aura) => {
              const ability = abilitiesById[aura.ability];
              const auraName = ability?.name || aura.name || `Unknown Aura (${aura.ability})`;

              result[playerId].push({
                name: auraName,
                id: aura.ability,
                stacks: aura.stacks,
              });
            });

            // Sort auras by name for consistent display
            result[playerId].sort((a, b) => a.name.localeCompare(b.name));
          }
        }
      });
    }

    return result;
  }, [combatantInfoEvents, abilitiesById, playerData]);

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
      const emptyBuffLookup: BuffLookupData = { buffIntervals: {} };

      const buildIssues = detectBuildIssues(
        gear,
        friendlyBuffLookup || emptyBuffLookup,
        fight.startTime,
        fight.endTime,
        aurasByPlayer[playerId] || [],
        player.role,
      );

      result[playerId] = buildIssues;
    });

    return result;
  }, [
    playerData?.playersById,
    friendlyBuffLookup,
    fight?.startTime,
    fight?.endTime,
    aurasByPlayer,
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

    Object.entries(allPlayersScribingResults).forEach(([playerIdStr, scribingSkills]) => {
      const grimoireDataList: GrimoireData[] = [];

      scribingSkills.forEach((skillAnalysis) => {
        // Find existing grimoire or create new one
        let grimoireData = grimoireDataList.find((g) => g.grimoireName === skillAnalysis.grimoire);
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

          if (effect.events.length > 0) {
            const firstEvent = effect.events[0];
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

          return {
            abilityId: effect.abilityId,
            abilityName: effect.abilityName,
            type: effectType,
            count: effect.events.length,
          };
        });

        // Add this skill to the grimoire
        // Find the original talent info for proper skill ID and name
        const playerId = parseInt(playerIdStr);

        // For now, we'll use a generic name since we're grouping by grimoire
        // In the future, we could enhance this by tracking individual talent names
        grimoireData.skills.push({
          skillId: playerId, // Using player ID as a unique identifier
          skillName: `${skillAnalysis.grimoire} Scribing Skill`,
          effects: skillEffects,
        });
      });

      result[playerIdStr] = grimoireDataList;
    });

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

  // Calculate max health per player using all resource events throughout the fight
  const maxHealthByPlayer = React.useMemo(() => {
    const result: Record<string, number> = {};

    if (!playerData?.playersById || !fight) return result;

    // Initialize with 0 for each player
    Object.values(playerData.playersById).forEach((player) => {
      if (player?.id) {
        result[String(player.id)] = 0;
      }
    });

    // Look for max health across all resource events within the fight timeframe
    if (resourceEvents) {
      resourceEvents.forEach((event) => {
        if (event.type === 'resourcechange') {
          // Only consider events within the current fight timeframe
          const isInFightTimeframe =
            event.timestamp >= fight.startTime && event.timestamp <= fight.endTime;

          if (isInFightTimeframe) {
            // Check source resources
            if (event.sourceID && event.sourceResources?.maxHitPoints) {
              const playerId = String(event.sourceID);
              if (result[playerId] !== undefined) {
                result[playerId] = Math.max(result[playerId], event.sourceResources.maxHitPoints);
              }
            }

            // Check target resources
            if (event.targetID && event.targetResources?.maxHitPoints) {
              const playerId = String(event.targetID);
              if (result[playerId] !== undefined) {
                result[playerId] = Math.max(result[playerId], event.targetResources.maxHitPoints);
              }
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
            if (event.sourceID && event.sourceResources?.maxHitPoints) {
              const playerId = String(event.sourceID);
              if (result[playerId] !== undefined) {
                result[playerId] = Math.max(result[playerId], event.sourceResources.maxHitPoints);
              }
            }

            // Check target resources in damage events
            if (event.targetID && event.targetResources?.maxHitPoints) {
              const playerId = String(event.targetID);
              if (result[playerId] !== undefined) {
                result[playerId] = Math.max(result[playerId], event.targetResources.maxHitPoints);
              }
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
            if (event.sourceID && event.sourceResources?.maxHitPoints) {
              const playerId = String(event.sourceID);
              if (result[playerId] !== undefined) {
                result[playerId] = Math.max(result[playerId], event.sourceResources.maxHitPoints);
              }
            }

            // Check target resources in healing events
            if (event.targetID && event.targetResources?.maxHitPoints) {
              const playerId = String(event.targetID);
              if (result[playerId] !== undefined) {
                result[playerId] = Math.max(result[playerId], event.targetResources.maxHitPoints);
              }
            }
          }
        }
      });
    }

    return result;
  }, [playerData?.playersById, resourceEvents, damageEvents, healingEvents, fight]);

  // Show loading if any data is still loading
  if (isLoading) {
    return (
      <PlayersPanelView
        playerActors={{}}
        deathsByPlayer={{}}
        resurrectsByPlayer={{}}
        cpmByPlayer={{}}
        mundusBuffsByPlayer={{}}
        championPointsByPlayer={{}}
        aurasByPlayer={{}}
        scribingSkillsByPlayer={{}}
        buildIssuesByPlayer={{}}
        classAnalysisByPlayer={{}}
        maxHealthByPlayer={{}}
        isLoading={true}
        reportId={reportId}
        fightId={fightId}
        playerGear={playerGear}
        fightStartTime={fight?.startTime}
        fightEndTime={fight?.endTime}
      />
    );
  }

  return (
    <PlayersPanelView
      playerActors={playerData?.playersById}
      mundusBuffsByPlayer={mundusBuffsByPlayer}
      championPointsByPlayer={championPointsByPlayer}
      aurasByPlayer={aurasByPlayer}
      scribingSkillsByPlayer={scribingSkillsByPlayer}
      buildIssuesByPlayer={buildIssuesByPlayer}
      classAnalysisByPlayer={classAnalysisByPlayer}
      deathsByPlayer={deathsByPlayer}
      resurrectsByPlayer={resurrectsByPlayer}
      cpmByPlayer={cpmByPlayer}
      maxHealthByPlayer={maxHealthByPlayer}
      reportId={reportId}
      fightId={fightId}
      isLoading={false}
      playerGear={playerGear}
      fightStartTime={fight?.startTime}
      fightEndTime={fight?.endTime}
    />
  );
};
